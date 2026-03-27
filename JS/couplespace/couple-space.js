/* ==========================================================================
           逻辑控制 (Logic Control)
           ========================================================================== */

        const ANNIVERSARY_STORAGE_KEY = 'couple_space_anniversary_date_v1';
        const DEFAULT_ANNIVERSARY_ISO = '2026-01-01';
        let anniversaryStartDate = new Date(`${DEFAULT_ANNIVERSARY_ISO}T00:00:00`);
        
        const MOOD_STORAGE_KEY = 'couple_space_mood_entries_v1';
        const ROLE_MOOD_STORAGE_KEY = 'couple_space_role_mood_entries_v1';
        const AI_MISS_STORAGE_KEY = 'couple_space_ai_miss_counts_v1';
        const COUPLE_SPACE_LAST_EXIT_KEY = 'couple_space_last_exit_time_v1_';
        const COUPLE_SPACE_DIARY_SYNC_LOCK_KEY = 'couple_space_diary_sync_lock_v1';
        const ACTIVITY_LOG_STORAGE_KEY = 'app_activity_logs';
        const COUPLE_SPACE_AI_ACTIVITY_STATE_PREFIX = 'couple_space_ai_activity_state_v1_';
        const SECRET_SPACE_MESSAGES_KEY = 'couple_space_secret_messages_v1';
        const COUPLE_SPACE_ROLE_KEY_SEP = '__roleId__';

        const MOOD_OPTIONS = [
            { id: 'happy', label: '开心', icon: '../assets/images/mood-happy.png' },
            { id: 'excited', label: '兴奋', icon: '../assets/images/mood-excited.png' },
            { id: 'heartbeat', label: '心动', icon: '../assets/images/mood-heart.png' },
            { id: 'calm', label: '平静', icon: '../assets/images/mood-calm.png' },
            { id: 'sad', label: '伤心', icon: '../assets/images/mood-sad.png' },
            { id: 'angry', label: '生气', icon: '../assets/images/mood-angry.png' },
            { id: 'annoyed', label: '烦躁', icon: '../assets/images/mood-annoyed.png' },
            { id: 'tired', label: '心累', icon: '../assets/images/mood-tired.png' },
        ];

        let state = {
            missCountUser: 0,
            missCountRole: 0,
            activeTab: 'home',
            mood: {
                selectedDateKey: toDateKey(new Date()),
                entries: {},
                roleEntries: {},
                modalOpen: false,
                modalStep: 'pick',
                modalDateKey: toDateKey(new Date()),
                pickedMood: null,
                diaryDraft: '',
                diaryImagesDraft: [],
                isGridView: false,
                isEditing: false,
                editingDateKey: '',
            },
        };

        let monthGridClickTimer = null;
        let monthGridLastClickTime = 0;
        let monthGridLastDateKey = '';
        const MONTH_GRID_CLICK_DELAY = 220;
        let diaryEditPendingDateKey = '';
        let coupleSpaceAppVisible = false;
        let coupleSpaceEnterTask = null;
        let coupleSpaceLastEnterAt = 0;
        let roleDiarySyncInFlight = false;
        let roleDiarySyncToastMessage = '';
        let diaryNoteLongPressTimer = null;
        let diaryNoteSuppressNextClick = false;
        let diaryNoteLongPressActive = false;
        const DIARY_NOTE_LONG_PRESS_MS = 520;
        let roleDiaryManualConfirmHandler = null;
        let roleMissCountTarget = 0;
        const DEFAULT_COUPLE_SPACE_CONFIRM_TITLE = '今日心情日记';
        const DEFAULT_COUPLE_SPACE_CONFIRM_TEXT = '是否要让角色撰写今日心情日记？';

        function safeJsonParse(text, fallback) {
            try {
                return JSON.parse(text);
            } catch (e) {
                return fallback;
            }
        }

        const DEV_AI_PARSE_FAILURE_LOG_KEY = 'dev_ai_parse_failures_v1';

        function isDevModeUnlocked() {
            try {
                return localStorage.getItem('dev_mode_unlocked') === 'true';
            } catch (e) {
                return false;
            }
        }

        function appendDevAiParseFailureLog(entry) {
            try {
                if (!isDevModeUnlocked()) return false;
                const listRaw = localStorage.getItem(DEV_AI_PARSE_FAILURE_LOG_KEY) || '[]';
                const list = safeJsonParse(listRaw, []);
                const arr = Array.isArray(list) ? list : [];
                const now = Date.now();
                const clean = entry && typeof entry === 'object' ? entry : {};
                const rawText = typeof clean.rawText === 'string' ? clean.rawText : '';
                const promptText = typeof clean.prompt === 'string' ? clean.prompt : '';
                arr.push({
                    at: now,
                    scene: String(clean.scene || ''),
                    roleId: String(clean.roleId || ''),
                    reason: String(clean.reason || ''),
                    prompt: promptText.length > 2200 ? promptText.slice(0, 2200) : promptText,
                    rawText: rawText.length > 4200 ? rawText.slice(0, 4200) : rawText
                });
                while (arr.length > 50) arr.shift();
                localStorage.setItem(DEV_AI_PARSE_FAILURE_LOG_KEY, JSON.stringify(arr));
                return true;
            } catch (e) {
                return false;
            }
        }

        function getCoupleSpaceForage() {
            try {
                const pw = window.parent && window.parent !== window ? window.parent : null;
                const inst = (pw && pw.__coupleSpaceForageInstance) || window.__coupleSpaceForageInstance;
                if (inst && typeof inst.getItem === 'function') return inst;
            } catch (e) { }
            try {
                const pw = window.parent && window.parent !== window ? window.parent : null;
                const lib =
                    (pw && pw.localforage && typeof pw.localforage.createInstance === 'function')
                        ? pw.localforage
                        : (window.localforage && typeof window.localforage.createInstance === 'function')
                            ? window.localforage
                            : null;
                if (!lib) return null;
                const inst = lib.createInstance({ name: 'shubao_large_store_v1', storeName: 'couple_space' });
                try {
                    window.__coupleSpaceForageInstance = inst;
                } catch (e1) { }
                try {
                    if (pw) pw.__coupleSpaceForageInstance = inst;
                } catch (e2) { }
                return inst;
            } catch (e3) {
                return null;
            }
        }

        let wechatForage = null;
        function getWechatForage() {
            try {
                if (wechatForage) return wechatForage;
                const pw = window.parent && window.parent !== window ? window.parent : null;
                const lib =
                    (pw && pw.localforage && typeof pw.localforage.createInstance === 'function')
                        ? pw.localforage
                        : (window.localforage && typeof window.localforage.createInstance === 'function')
                            ? window.localforage
                            : null;
                if (!lib) return null;
                wechatForage = lib.createInstance({ name: 'shubao-phone', storeName: 'wechat' });
                return wechatForage;
            } catch (e) {
                return null;
            }
        }

        const COUPLE_SPACE_FORAGE_BASE_KEYS = [
            'couple_space_data',
            'couple_bg',
            'couple_avatar_user',
            'couple_avatar_role',
            ANNIVERSARY_STORAGE_KEY,
            MOOD_STORAGE_KEY,
            ROLE_MOOD_STORAGE_KEY,
            SECRET_SPACE_MESSAGES_KEY,
        ];
        const COUPLE_SPACE_FORAGE_BASE_KEY_SET = new Set(COUPLE_SPACE_FORAGE_BASE_KEYS);

        function buildCoupleSpaceRoleKey(baseKey, roleId) {
            const k = String(baseKey || '').trim();
            const rid = String(roleId || '').trim();
            if (!k) return '';
            if (!rid) return k;
            if (k.indexOf(COUPLE_SPACE_ROLE_KEY_SEP) !== -1) return k;
            return k + COUPLE_SPACE_ROLE_KEY_SEP + rid;
        }

        function isCoupleSpaceForageKey(key) {
            const k = String(key || '').trim();
            if (!k) return false;
            if (COUPLE_SPACE_FORAGE_BASE_KEY_SET.has(k)) return true;
            for (let i = 0; i < COUPLE_SPACE_FORAGE_BASE_KEYS.length; i++) {
                const base = COUPLE_SPACE_FORAGE_BASE_KEYS[i];
                if (k.indexOf(base + COUPLE_SPACE_ROLE_KEY_SEP) === 0) return true;
            }
            return false;
        }

        async function coupleSpaceGetRoleItem(baseKey, roleId) {
            const rid = String(roleId || '').trim();
            const k = String(baseKey || '').trim();
            if (!k) return null;
            if (!rid) return coupleSpaceGetItem(k);
            const nsKey = buildCoupleSpaceRoleKey(k, rid);
            const v = await coupleSpaceGetItem(nsKey);
            if (v !== null && v !== undefined) return v;
            const legacy = await coupleSpaceGetItem(k);
            if (legacy === null || legacy === undefined) return null;
            await coupleSpaceSetItem(nsKey, legacy);
            await coupleSpaceRemoveItem(k);
            return legacy;
        }

        async function coupleSpaceSetRoleItem(baseKey, roleId, value) {
            const rid = String(roleId || '').trim();
            const k = String(baseKey || '').trim();
            if (!k) return false;
            if (!rid) return coupleSpaceSetItem(k, value);
            const nsKey = buildCoupleSpaceRoleKey(k, rid);
            return coupleSpaceSetItem(nsKey, value);
        }

        async function coupleSpaceRemoveRoleItem(baseKey, roleId) {
            const rid = String(roleId || '').trim();
            const k = String(baseKey || '').trim();
            if (!k) return;
            if (!rid) return coupleSpaceRemoveItem(k);
            const nsKey = buildCoupleSpaceRoleKey(k, rid);
            await coupleSpaceRemoveItem(nsKey);
        }

        async function migrateLocalStorageKeyToForage(key) {
            const k = String(key || '').trim();
            if (!k || !isCoupleSpaceForageKey(k)) return null;
            const forage = getCoupleSpaceForage();
            if (!forage) return null;

            let raw = null;
            try {
                raw = localStorage.getItem(k);
            } catch (e) {
                raw = null;
            }
            if (raw === null || raw === undefined || raw === '') return null;

            let toStore = raw;
            if (
                k === 'couple_space_data' ||
                k === MOOD_STORAGE_KEY ||
                k === ROLE_MOOD_STORAGE_KEY ||
                k.indexOf('couple_space_data' + COUPLE_SPACE_ROLE_KEY_SEP) === 0 ||
                k.indexOf(MOOD_STORAGE_KEY + COUPLE_SPACE_ROLE_KEY_SEP) === 0 ||
                k.indexOf(ROLE_MOOD_STORAGE_KEY + COUPLE_SPACE_ROLE_KEY_SEP) === 0
            ) {
                const parsed = safeJsonParse(raw, null);
                if (parsed && typeof parsed === 'object') {
                    toStore = parsed;
                }
            }

            try {
                await forage.setItem(k, toStore);
                try {
                    localStorage.removeItem(k);
                } catch (e2) { }
                return toStore;
            } catch (e3) {
                return null;
            }
        }

        async function coupleSpaceGetItem(key) {
            const k = String(key || '').trim();
            if (!k) return null;
            const forage = getCoupleSpaceForage();
            if (forage) {
                try {
                    const v = await forage.getItem(k);
                    if (v !== null && v !== undefined) return v;
                } catch (e) { }
            }
            const migrated = await migrateLocalStorageKeyToForage(k);
            if (migrated !== null && migrated !== undefined) return migrated;
            try {
                return localStorage.getItem(k);
            } catch (e2) {
                return null;
            }
        }

        async function coupleSpaceSetItem(key, value) {
            const k = String(key || '').trim();
            if (!k) return false;
            const forage = getCoupleSpaceForage();
            if (forage) {
                try {
                    await forage.setItem(k, value);
                    try {
                        if (isCoupleSpaceForageKey(k)) localStorage.removeItem(k);
                    } catch (e1) { }
                    return true;
                } catch (e2) { }
            }
            try {
                localStorage.setItem(k, typeof value === 'string' ? value : JSON.stringify(value));
                return true;
            } catch (e3) {
                return false;
            }
        }

        async function coupleSpaceRemoveItem(key) {
            const k = String(key || '').trim();
            if (!k) return;
            const forage = getCoupleSpaceForage();
            if (forage) {
                try {
                    await forage.removeItem(k);
                } catch (e) { }
            }
            try {
                localStorage.removeItem(k);
            } catch (e2) { }
        }

        function readActivityLogs() {
            try {
                const raw = localStorage.getItem(ACTIVITY_LOG_STORAGE_KEY) || '';
                if (!raw) return [];
                const parsed = safeJsonParse(raw, []);
                if (!Array.isArray(parsed)) return [];
                return parsed
                    .filter((it) => it && typeof it === 'object')
                    .sort((a, b) => (Number(a.ts || 0) - Number(b.ts || 0)));
            } catch (e) {
                return [];
            }
        }

        const ACTIVITY_ICON_SVGS = {
            home: '<svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2.5"></rect><line x1="11" y1="18" x2="13" y2="18"></line></svg>',
            wechat: '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H9l-6 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg>',
            chat: '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H9l-6 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg>',
            music: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"></path><circle cx="9" cy="18" r="3"></circle><circle cx="21" cy="16" r="3"></circle></svg>',
            moments: '<svg viewBox="0 0 24 24"><path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"></path><circle cx="12" cy="14" r="3"></circle></svg>',
            space: '<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>',
            wallet: '<svg viewBox="0 0 24 24"><path d="M3 7h18v12H3z"></path><path d="M3 7V6a3 3 0 0 1 3-3h12"></path><path d="M16 12h5"></path><circle cx="14" cy="12" r="1"></circle></svg>',
            period: '<svg viewBox="0 0 24 24"><path d="M12 2s-6 7-6 12a6 6 0 0 0 12 0c0-5-6-12-6-12z"></path></svg>',
            system: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M7 11V8a5 5 0 0 1 10 0v3"></path></svg>',
            battery: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="18" height="10" rx="2"></rect><line x1="22" y1="10" x2="22" y2="14"></line><line x1="6" y1="12" x2="10" y2="12"></line></svg>',
            other: '<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.2L5.5 20l2-7L2 9h7z"></path></svg>',
        };

        function getActivityIconKey(it) {
            const kind = String(it && it.kind || '').trim();
            if (kind === 'music_play' || kind === 'music_open') return 'music';
            if (kind === 'wechat_open' || kind === 'wechat_chat') return 'wechat';
            if (kind === 'moments_open') return 'moments';
            if (kind === 'wallet_open') return 'wallet';
            if (kind === 'period_open') return 'period';
            if (kind === 'system_exit') return 'system';
            if (kind === 'battery_low') return 'battery';
            const app = String(it && (it.app || it.targetApp) || '').trim();
            if (app && ACTIVITY_ICON_SVGS[app]) return app;
            const text = String(it && it.text || '').trim();
            if (text.includes('朋友圈')) return 'moments';
            if (text.includes('微信') || text.includes('聊天')) return 'wechat';
            if (text.includes('歌曲') || text.includes('听') || text.includes('音乐')) return 'music';
            if (text.includes('情侣空间') || text.includes('私密空间')) return 'space';
            if (text.includes('钱包')) return 'wallet';
            if (text.includes('经期')) return 'period';
            if (text.includes('电量')) return 'battery';
            if (text.includes('锁定') || text.includes('关闭')) return 'system';
            if (text.includes('手机')) return 'home';
            return 'other';
        }

        function buildActivityIconEl(iconKey) {
            const span = document.createElement('span');
            span.className = 'activity-log-icon';
            const svg = ACTIVITY_ICON_SVGS[iconKey] || ACTIVITY_ICON_SVGS.other;
            span.innerHTML = svg;
            return span;
        }

        function renderActivityLogs() {
            const main = document.getElementById('secret-space-main');
            if (!main) return;
            const list = readActivityLogs();
            const wrapper = document.createElement('div');
            wrapper.className = 'activity-log-list';
            for (let i = 0; i < list.length; i++) {
                const it = list[i];
                const time = String(it.time || '').trim();
                const text = String(it.text || '').trim();
                if (!time && !text) continue;

                const row = document.createElement('div');
                row.className = 'activity-log-item';

                const timeEl = document.createElement('div');
                timeEl.className = 'activity-log-time';
                timeEl.textContent = time || '';

                const pill = document.createElement('div');
                pill.className = 'activity-log-pill';

                const iconKey = getActivityIconKey(it);
                const iconEl = buildActivityIconEl(iconKey);

                const textEl = document.createElement('span');
                textEl.className = 'activity-log-text';
                textEl.textContent = text || '';

                pill.appendChild(iconEl);
                pill.appendChild(textEl);
                row.appendChild(timeEl);
                row.appendChild(pill);
                wrapper.appendChild(row);
            }

            main.innerHTML = '';
            main.appendChild(wrapper);
            try {
                main.scrollTop = main.scrollHeight;
            } catch (e) { }
        }

        window.renderActivityLogs = function () {
            try {
                if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.render === 'function') {
                    window.secretSpaceTimeline.render();
                    return;
                }
            } catch (e) { }
            renderActivityLogs();
        };

        window.addEventListener('storage', function (e) {
            if (!e || e.key !== ACTIVITY_LOG_STORAGE_KEY) return;
            const modal = document.getElementById('secret-space-modal');
            if (!modal || modal.hidden) return;
            try {
                if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.render === 'function') {
                    window.secretSpaceTimeline.render();
                    return;
                }
            } catch (e) { }
            renderActivityLogs();
        });

        (function () {
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            const secretSpaceMessagesStorageKey = buildCoupleSpaceRoleKey(SECRET_SPACE_MESSAGES_KEY, rid);
            const secretSpaceLegacyMessagesKey = SECRET_SPACE_MESSAGES_KEY;
            const secretSpaceMessagesMaxItems = 300;
            const secretSpaceDefaultAvatar =
                'data:image/svg+xml;charset=utf-8,' +
                encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><rect width="72" height="72" rx="36" fill="#e5e7eb"/><circle cx="36" cy="30" r="14" fill="#cbd5e1"/><path d="M12 66c6-16 18-22 24-22s18 6 24 22" fill="#cbd5e1"/></svg>'
                );

            const secretSpaceGetForage = () => {
                try {
                    const pw = window.parent && window.parent !== window ? window.parent : null;
                    const inst = pw && pw.__coupleSpaceForageInstance;
                    if (inst && typeof inst.getItem === 'function') return inst;
                } catch (e) { }
                try {
                    const cached = window.__coupleSpaceForageInstance;
                    if (cached && typeof cached.getItem === 'function') return cached;
                } catch (e2) { }
                try {
                    const pw = window.parent && window.parent !== window ? window.parent : null;
                    const lib =
                        (pw && pw.localforage && typeof pw.localforage.createInstance === 'function')
                            ? pw.localforage
                            : (window.localforage && typeof window.localforage.createInstance === 'function')
                                ? window.localforage
                                : null;
                    if (!lib) return null;
                    const inst = lib.createInstance({ name: 'shubao_large_store_v1', storeName: 'couple_space' });
                    try {
                        window.__coupleSpaceForageInstance = inst;
                    } catch (e3) { }
                    try {
                        if (pw) pw.__coupleSpaceForageInstance = inst;
                    } catch (e4) { }
                    return inst;
                } catch (e2) {
                    return null;
                }
            };

            let secretSpaceForageCache = null;
            let secretSpaceForageLoaded = false;
            let secretSpaceForageLoadInFlight = null;

            function secretSpacePad2(n) {
                return String(n).padStart(2, '0');
            }

            function secretSpaceFormatActivityTimeCn(ts) {
                const t = Number(ts || 0);
                if (!t) return '';
                const d = new Date(t);
                const mo = secretSpacePad2(d.getMonth() + 1);
                const da = secretSpacePad2(d.getDate());
                const hh = secretSpacePad2(d.getHours());
                const mm = secretSpacePad2(d.getMinutes());
                return `${mo}月${da}日 ${hh}:${mm}`;
            }

            function secretSpaceSafeReadRaw(key) {
                try {
                    return localStorage.getItem(key) || '';
                } catch (e) {
                    return '';
                }
            }

            function secretSpaceNormalizeMessageItem(it) {
                if (!it || typeof it !== 'object') return null;
                const ts = Number(it.ts || it.timestamp || it.createdAt || 0) || 0;
                const rawType = String(it.type || it.messageType || '').trim();
                const type =
                    rawType === 'ai_message' || rawType === 'ai' || rawType === 'assistant' || rawType === 'role'
                        ? 'ai_message'
                        : 'message';
                const text = String(it.text || it.content || it.msg || '').trim();
                if (!ts || !text) return null;
                return { type, ts, text };
            }

            function secretSpaceReadMessagesFromLocal() {
                const rawOwn = secretSpaceSafeReadRaw(secretSpaceMessagesStorageKey);
                const rawLegacy =
                    !rawOwn && secretSpaceMessagesStorageKey !== secretSpaceLegacyMessagesKey
                        ? secretSpaceSafeReadRaw(secretSpaceLegacyMessagesKey)
                        : '';
                const raw = rawOwn || rawLegacy;
                if (!raw) return [];
                const parsed = safeJsonParse(raw, []);
                if (!Array.isArray(parsed)) return [];
                const list = parsed
                    .map(secretSpaceNormalizeMessageItem)
                    .filter(Boolean)
                    .sort((a, b) => Number(a.ts) - Number(b.ts));
                if (!rawOwn && rawLegacy && list.length && secretSpaceMessagesStorageKey !== secretSpaceLegacyMessagesKey) {
                    try {
                        localStorage.setItem(secretSpaceMessagesStorageKey, JSON.stringify(list));
                        localStorage.removeItem(secretSpaceLegacyMessagesKey);
                    } catch (e) { }
                }
                return list;
            }

            function secretSpaceMergeMessageLists(a, b) {
                const out = [];
                const seen = new Set();
                const push = (it) => {
                    const item = secretSpaceNormalizeMessageItem(it);
                    if (!item) return;
                    const key = `${item.type}|${item.ts}|${item.text}`;
                    if (seen.has(key)) return;
                    seen.add(key);
                    out.push(item);
                };
                (Array.isArray(a) ? a : []).forEach(push);
                (Array.isArray(b) ? b : []).forEach(push);
                out.sort((x, y) => Number(x.ts) - Number(y.ts));
                return out;
            }

            function secretSpaceReadMessages() {
                const local = secretSpaceReadMessagesFromLocal();
                if (Array.isArray(secretSpaceForageCache) && secretSpaceForageCache.length) {
                    return secretSpaceMergeMessageLists(local, secretSpaceForageCache);
                }
                return local;
            }

            function secretSpaceWriteMessages(list) {
                const normalized = (Array.isArray(list) ? list : [])
                    .map(secretSpaceNormalizeMessageItem)
                    .filter(Boolean)
                    .sort((a, b) => Number(a.ts) - Number(b.ts));

                const messages = normalized.filter((it) => it.type === 'message');
                const aiMessages = normalized.filter((it) => it.type === 'ai_message');

                const max = secretSpaceMessagesMaxItems;
                const half = Math.floor(max / 2);

                let keepMsg = Math.min(messages.length, half);
                let keepAi = Math.min(aiMessages.length, half);

                let remain = max - (keepMsg + keepAi);
                if (remain > 0) {
                    const extraMsg = Math.min(messages.length - keepMsg, remain);
                    keepMsg += extraMsg;
                    remain -= extraMsg;
                }
                if (remain > 0) {
                    const extraAi = Math.min(aiMessages.length - keepAi, remain);
                    keepAi += extraAi;
                    remain -= extraAi;
                }

                const clean = messages.slice(-keepMsg).concat(aiMessages.slice(-keepAi));
                clean.sort((a, b) => Number(a.ts) - Number(b.ts));

                secretSpaceForageCache = clean;
                secretSpaceForageLoaded = true;
                try {
                    coupleSpaceSetItem(secretSpaceMessagesStorageKey, clean);
                } catch (e) { }
                try {
                    window.dispatchEvent(new Event('couple_space_secret_messages_updated'));
                } catch (e2) { }
            }

            function secretSpaceAppendMessage(text) {
                const msg = String(text || '').trim();
                if (!msg) return false;
                const list = secretSpaceReadMessages();
                list.push({ type: 'message', ts: Date.now(), text: msg });
                secretSpaceWriteMessages(list);
                return true;
            }

            function secretSpaceAppendAiMessage(text) {
                const msg = String(text || '').trim();
                if (!msg) return false;
                const list = secretSpaceReadMessages();
                list.push({ type: 'ai_message', ts: Date.now(), text: msg });
                secretSpaceWriteMessages(list);
                return true;
            }

            function secretSpaceLoadForageCache() {
                if (secretSpaceForageLoaded) return Promise.resolve(true);
                if (secretSpaceForageLoadInFlight) return secretSpaceForageLoadInFlight;
                const forage = secretSpaceGetForage();
                if (!forage) {
                    secretSpaceForageLoaded = true;
                    return Promise.resolve(false);
                }
                const readLegacy = secretSpaceMessagesStorageKey !== secretSpaceLegacyMessagesKey;
                secretSpaceForageLoadInFlight = Promise.all([
                    forage.getItem(secretSpaceMessagesStorageKey),
                    readLegacy ? forage.getItem(secretSpaceLegacyMessagesKey) : Promise.resolve(null),
                ])
                    .then((vals) => {
                        const val = vals && vals.length ? vals[0] : null;
                        const legacyVal = vals && vals.length > 1 ? vals[1] : null;
                        let list = [];
                        if (Array.isArray(val)) {
                            list = val;
                        } else if (typeof val === 'string') {
                            const parsed = safeJsonParse(val, []);
                            if (Array.isArray(parsed)) list = parsed;
                        }
                        if (!list.length && legacyVal) {
                            if (Array.isArray(legacyVal)) {
                                list = legacyVal;
                            } else if (typeof legacyVal === 'string') {
                                const parsedLegacy = safeJsonParse(legacyVal, []);
                                if (Array.isArray(parsedLegacy)) list = parsedLegacy;
                            }
                        }
                        const normalized = (Array.isArray(list) ? list : [])
                            .map(secretSpaceNormalizeMessageItem)
                            .filter(Boolean)
                            .sort((a, b) => Number(a.ts) - Number(b.ts));
                        const local = secretSpaceReadMessagesFromLocal();
                        const merged = secretSpaceMergeMessageLists(local, normalized);
                        secretSpaceWriteMessages(merged);
                        if (readLegacy) {
                            try { forage.removeItem(secretSpaceLegacyMessagesKey).catch(() => { }); } catch (e0) { }
                        }
                        return true;
                    })
                    .catch(() => {
                        secretSpaceForageLoaded = true;
                        return false;
                    })
                    .finally(() => {
                        secretSpaceForageLoadInFlight = null;
                    });
                return secretSpaceForageLoadInFlight;
            }

            function secretSpaceReadActivityLogsFromSource() {
                let legacy = [];
                try {
                    const pw = window.parent && window.parent !== window ? window.parent : null;
                    if (pw && pw.ActivityTracker && typeof pw.ActivityTracker.read === 'function') {
                        legacy = pw.ActivityTracker.read();
                    }
                } catch (e) { }
                if (!Array.isArray(legacy) || !legacy.length) {
                    legacy = readActivityLogs();
                }
                if (!Array.isArray(legacy)) return [];

                const baseTs = Date.now() - legacy.length * 1000;
                return legacy
                    .filter((it) => it && typeof it === 'object')
                    .map((it, idx) => {
                        let ts = Number(it.ts || 0) || 0;
                        if (!ts) ts = baseTs + idx * 1000;
                        const time = String(it.time || '').trim() || secretSpaceFormatActivityTimeCn(ts);
                        const text = String(it.text || '').trim();
                        const kind = String(it.kind || '').trim();
                        const app = String(it.app || it.targetApp || '').trim();
                        return { type: 'log', ts, time, text, kind, app };
                    })
                    .filter((it) => it.text);
            }

            function secretSpaceGetMainEl() {
                return document.getElementById('secret-space-main');
            }

            function secretSpaceGetContainerEl() {
                const main = secretSpaceGetMainEl();
                if (!main) return null;
                let container = main.querySelector('#secret-timeline-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'secret-timeline-container';
                    main.appendChild(container);
                }
                return container;
            }

            function secretSpaceGetUserAvatarSrc() {
                const img = document.getElementById('avatar-user');
                const src = img ? String(img.getAttribute('src') || img.src || '').trim() : '';
                return src || secretSpaceDefaultAvatar;
            }

            function secretSpaceGetRoleAvatarSrc() {
                const img = document.getElementById('avatar-role');
                const src = img ? String(img.getAttribute('src') || img.src || '').trim() : '';
                return src || secretSpaceDefaultAvatar;
            }

            function secretSpaceScrollToBottom() {
                const main = secretSpaceGetMainEl();
                if (!main) return;
                try {
                    main.scrollTop = main.scrollHeight;
                } catch (e) { }
            }

            function secretSpaceBuildCombinedList() {
                const logs = secretSpaceReadActivityLogsFromSource();
                const msgs = secretSpaceReadMessages();
                const list = logs.concat(msgs);
                list.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
                return list;
            }

            function secretSpaceRender() {
                const container = secretSpaceGetContainerEl();
                if (!container) return;
                const list = secretSpaceBuildCombinedList();
                const wrapper = document.createElement('div');
                wrapper.className = 'activity-log-list';

                for (let i = 0; i < list.length; i++) {
                    const it = list[i];
                    if (it.type === 'message') {
                        const row = document.createElement('div');
                        row.className = 'secret-message-row';

                        const bubble = document.createElement('div');
                        bubble.className = 'secret-message-bubble';
                        bubble.textContent = it.text || '';

                        const avatar = document.createElement('img');
                        avatar.className = 'secret-message-avatar';
                        avatar.alt = '';
                        avatar.src = secretSpaceGetUserAvatarSrc();

                        row.appendChild(bubble);
                        row.appendChild(avatar);
                        wrapper.appendChild(row);
                        continue;
                    }

                    if (it.type === 'ai_message') {
                        const row = document.createElement('div');
                        row.className = 'secret-ai-message-row';

                        const avatar = document.createElement('img');
                        avatar.className = 'secret-message-avatar';
                        avatar.alt = '';
                        avatar.src = secretSpaceGetRoleAvatarSrc();

                        const bubble = document.createElement('div');
                        bubble.className = 'secret-ai-message-bubble';
                        bubble.textContent = it.text || '';

                        row.appendChild(avatar);
                        row.appendChild(bubble);
                        wrapper.appendChild(row);
                        continue;
                    }

                    const time = String(it.time || '').trim();
                    const text = String(it.text || '').trim();
                    if (!time && !text) continue;

                    const row = document.createElement('div');
                    row.className = 'activity-log-item';

                    const timeEl = document.createElement('div');
                    timeEl.className = 'activity-log-time';
                    timeEl.textContent = time || '';

                    const pill = document.createElement('div');
                    pill.className = 'activity-log-pill';

                    const iconKey = getActivityIconKey(it);
                    const iconEl = buildActivityIconEl(iconKey);

                    const textEl = document.createElement('span');
                    textEl.className = 'activity-log-text';
                    textEl.textContent = text || '';

                    pill.appendChild(iconEl);
                    pill.appendChild(textEl);
                    row.appendChild(timeEl);
                    row.appendChild(pill);
                    wrapper.appendChild(row);
                }

                container.innerHTML = '';
                container.appendChild(wrapper);
                secretSpaceScrollToBottom();
            }

            function secretSpaceSendMessage(text) {
                const ok = secretSpaceAppendMessage(text);
                if (ok) secretSpaceRender();
                return ok;
            }

            function secretSpaceReceiveAiMessage(text) {
                const ok = secretSpaceAppendAiMessage(text);
                if (ok) secretSpaceRender();
                return ok;
            }

            function secretSpaceBindInputEvents() {
                const input = document.getElementById('secret-space-input');
                if (!input || input.dataset.secretBound === '1') return;
                input.dataset.secretBound = '1';

                input.addEventListener('keydown', (e) => {
                    if (!e || e.key !== 'Enter') return;
                    e.preventDefault();
                    if (secretSpaceSendMessage(input.value)) {
                        input.value = '';
                    }
                });
            }

            window.secretSpaceTimeline = {
                render: secretSpaceRender,
                sendMessage: secretSpaceSendMessage,
                receiveAiMessage: secretSpaceReceiveAiMessage,
                bindInputEvents: secretSpaceBindInputEvents,
                loadForageCache: secretSpaceLoadForageCache,
                storageKey: secretSpaceMessagesStorageKey,
            };

            window.addEventListener('couple_space_secret_messages_updated', function () {
                const modal = document.getElementById('secret-space-modal');
                if (modal && !modal.hidden) {
                    secretSpaceRender();
                }
            });
        })();

        function getCoupleLinkState() {
            let has = false;
            let roleId = '';
            try {
                has = localStorage.getItem('couple_has_linked_v1') === 'true';
                roleId = String(localStorage.getItem('couple_linked_role_id_v1') || '').trim();
            } catch (e) { }
            if (!has || !roleId) return { hasCoupleLinked: false, roleId: '' };
            return { hasCoupleLinked: true, roleId: roleId };
        }

        function readAvatarsAndNamesFromChat(roleId) {
            const id = String(roleId || '').trim();
            if (!id) return null;
            try {
                const pw = window.parent && window.parent !== window ? window.parent : null;
                if (!pw) return null;
                const profiles = pw.charProfiles && typeof pw.charProfiles === 'object' ? pw.charProfiles : {};
                const personas = pw.userPersonas && typeof pw.userPersonas === 'object' ? pw.userPersonas : {};
                const roleProfile = profiles[id] && typeof profiles[id] === 'object' ? profiles[id] : {};
                const userPersona = personas[id] && typeof personas[id] === 'object' ? personas[id] : {};

                const roleName = String(roleProfile.remark || roleProfile.nickName || roleProfile.name || id || 'Ta');
                const roleAvatar = String(roleProfile.avatar || '');
                const userName = String(userPersona.name || localStorage.getItem('user_name') || '我');
                const userAvatar = String(userPersona.avatar || '');

                return { roleName, roleAvatar, userName, userAvatar };
            } catch (e) {
                return null;
            }
        }

        function lockCoupleAvatars() {
            const userAvatarEl = document.getElementById('avatar-user');
            const roleAvatarEl = document.getElementById('avatar-role');
            [userAvatarEl, roleAvatarEl].forEach((el) => {
                if (!el) return;
                el.onclick = null;
                try { el.removeAttribute('onclick'); } catch (e) { }
                el.style.pointerEvents = 'none';
            });
            const userInput = document.getElementById('avatar-user-input');
            const roleInput = document.getElementById('avatar-role-input');
            if (userInput) userInput.disabled = true;
            if (roleInput) roleInput.disabled = true;
        }

        let coupleMenuState = {
            open: false,
            step: 'menu'
        };

        function openCoupleMoreMenu() {
            // 打开新的设置页面
            if (window.qlkjSetting && typeof window.qlkjSetting.open === 'function') {
                window.qlkjSetting.open();
            }
        }

        function closeCoupleMoreMenu() {
            coupleMenuState.open = false;
            const modal = document.getElementById('couple-menu-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
            setTimeout(() => {
                modal.hidden = true;
            }, 180);
        }

        function renderCoupleMenuModal() {
            const modal = document.getElementById('couple-menu-modal');
            const content = document.getElementById('couple-menu-content');
            if (!modal || !content) return;

            modal.hidden = false;
            requestAnimationFrame(() => modal.classList.add('is-open'));

            if (coupleMenuState.step === 'confirmClear') {
                content.innerHTML = `
                    <div class="couple-menu-title">确认解除</div>
                    <div class="couple-menu-desc">解除之后的空间记录将全部清除，是否确认？</div>
                    <div class="couple-menu-actions">
                        <button class="couple-menu-btn" type="button" data-action="close">取消</button>
                        <button class="couple-menu-btn couple-menu-btn-danger" type="button" data-action="confirm-clear">确认解除</button>
                    </div>
                `;
                return;
            }

            if (coupleMenuState.step === 'notify') {
                content.innerHTML = `
                    <div class="couple-menu-title">通知对方</div>
                    <div class="couple-menu-desc">是否通知对方你已解除情侣关系？</div>
                    <div class="couple-menu-actions">
                        <button class="couple-menu-btn" type="button" data-action="unlink-no-notify">不通知</button>
                        <button class="couple-menu-btn couple-menu-btn-danger" type="button" data-action="unlink-notify">通知对方</button>
                    </div>
                `;
                return;
            }

            content.innerHTML = `
                <div class="couple-menu-title">更多</div>
                <div class="couple-menu-actions">
                    <button class="couple-menu-btn couple-menu-btn-danger" type="button" data-action="unlink">解除情侣空间</button>
                </div>
                <div class="couple-menu-actions">
                    <button class="couple-menu-btn" type="button" data-action="close">取消</button>
                </div>
            `;
        }

        async function clearCoupleSpaceStorage(roleId) {
            const rid = String(roleId || '').trim();
            const baseKeys = [
                'couple_space_data',
                'couple_bg',
                'couple_avatar_user',
                'couple_avatar_role',
                'couple_space_qa_progress_v1',
                ANNIVERSARY_STORAGE_KEY,
                MOOD_STORAGE_KEY,
                ROLE_MOOD_STORAGE_KEY,
                SECRET_SPACE_MESSAGES_KEY,
            ];
            const allKeys = baseKeys
                .map((k) => [String(k), buildCoupleSpaceRoleKey(k, rid)])
                .flat()
                .filter((k) => !!String(k || '').trim());
            await Promise.all(allKeys.map((k) => coupleSpaceRemoveItem(k)));
            try {
                const qaKey = 'couple_space_qa_progress_v1';
                const qaScopedKey = qaKey + '__roleId__' + rid;
                const pw = window.parent && window.parent !== window ? window.parent : null;
                const lib =
                    (pw && pw.localforage && typeof pw.localforage.createInstance === 'function')
                        ? pw.localforage
                        : (window.localforage && typeof window.localforage.createInstance === 'function')
                            ? window.localforage
                            : null;
                if (lib) {
                    const qaForage = lib.createInstance({ name: 'shubao_large_store_v1', storeName: 'couple_space_qa' });
                    await Promise.all([
                        qaForage.removeItem(qaKey),
                        qaForage.removeItem(qaScopedKey),
                    ]);
                }
                try { localStorage.removeItem(qaKey); } catch (e0) { }
                try { localStorage.removeItem(qaScopedKey); } catch (e1) { }
            } catch (e3) { }
            try {
                const missKey = buildCoupleSpaceRoleKey(AI_MISS_STORAGE_KEY, rid);
                if (missKey) localStorage.removeItem(missKey);
            } catch (e) { }
            try {
                const lockKey = buildCoupleSpaceRoleKey(COUPLE_SPACE_DIARY_SYNC_LOCK_KEY, rid);
                if (lockKey) localStorage.removeItem(lockKey);
                if (COUPLE_SPACE_DIARY_SYNC_LOCK_KEY) localStorage.removeItem(COUPLE_SPACE_DIARY_SYNC_LOCK_KEY);
            } catch (e2) { }
        }

        function notifyUnlinkToChat(roleId) {
            const id = String(roleId || '').trim();
            if (!id) return;
            const pw = window.parent && window.parent !== window ? window.parent : null;
            if (!pw) return;
            pw.chatData = pw.chatData || {};
            if (!pw.chatData[id]) pw.chatData[id] = [];
            const msg = { role: 'me', type: 'couple_unlink', content: '', timestamp: Date.now(), status: 'sent' };
            pw.chatData[id].push(msg);
            if (typeof pw.saveData === 'function') {
                try { pw.saveData(); } catch (e) { }
            }
        }

        async function unlinkCoupleSpace(notify) {
            const link = getCoupleLinkState();
            await clearCoupleSpaceStorage(link && link.hasCoupleLinked ? link.roleId : '');
            try {
                localStorage.removeItem('couple_has_linked_v1');
                localStorage.removeItem('couple_linked_role_id_v1');
                localStorage.removeItem('couple_pending_invite_v1');
            } catch (e) { }
            if (notify && link.hasCoupleLinked && link.roleId) {
                notifyUnlinkToChat(link.roleId);
            }
        }

        document.addEventListener('DOMContentLoaded', async () => {
            await initAnniversary();
            await loadState();
            await loadMoodState();
            await loadRoleMoodState();
            bindEvents();

            // 监听设置页面的解除情侣空间请求
            window.addEventListener('qlkj-unlink-request', async () => {
                coupleMenuState.open = true;
                coupleMenuState.step = 'confirmClear';
                renderCoupleMenuModal();
            });

            const link = getCoupleLinkState();
            const fromChat = link.hasCoupleLinked ? readAvatarsAndNamesFromChat(link.roleId) : null;

            const userName = fromChat && fromChat.userName ? fromChat.userName : (localStorage.getItem('user_name') || '我');
            const roleName = fromChat && fromChat.roleName ? fromChat.roleName : 'Ta';

            document.getElementById('name-user').innerText = userName;
            document.getElementById('name-role').innerText = roleName;

            if (link.hasCoupleLinked && link.roleId) {
                updateStatsUI();
            }

            if (fromChat) {
                const au = document.getElementById('avatar-user');
                const ar = document.getElementById('avatar-role');
                if (au && fromChat.userAvatar) au.src = fromChat.userAvatar;
                if (ar && fromChat.roleAvatar) ar.src = fromChat.roleAvatar;
                lockCoupleAvatars();
            }

            render();
            initSecretSpaceAiActivityWatcher();
            try {
                const pw = getParentWindow();
                coupleSpaceAppVisible = !pw || String(pw.__foregroundAppId || '') === 'couple-space';
            } catch (e0) { }
            if (coupleSpaceAppVisible) {
                try {
                    await handleCoupleSpaceAppEnter('dom_ready');
                } catch (e) {
                    const pw = getParentWindow();
                    const msg = e && e.message ? String(e.message) : String(e || '生成失败');
                    if (pw && typeof pw.showCenterToast === 'function') {
                        pw.showCenterToast(msg);
                    } else if (pw && pw.GlobalModal && typeof pw.GlobalModal.showError === 'function') {
                        pw.GlobalModal.showError(msg);
                    } else {
                        alert(msg);
                    }
                }
            }
        });

        function safeJsonParse(text, fallback) {
            try {
                return JSON.parse(text);
            } catch (e) {
                return fallback;
            }
        }

        function readLastExitTime(roleId) {
            const rid = String(roleId || '').trim();
            if (!rid) return 0;
            try {
                const raw = localStorage.getItem(COUPLE_SPACE_LAST_EXIT_KEY + rid);
                const n = Number(raw);
                return Number.isFinite(n) && n > 0 ? n : 0;
            } catch (e) {
                return 0;
            }
        }

        function writeLastExitTime(roleId, ts) {
            const rid = String(roleId || '').trim();
            if (!rid) return;
            const n = Number(ts);
            if (!Number.isFinite(n) || n <= 0) return;
            try { localStorage.setItem(COUPLE_SPACE_LAST_EXIT_KEY + rid, String(n)); } catch (e) { }
        }

        function startOfDayTs(ts) {
            const d = new Date(ts);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        }

        function crossedHourSameDay(lastTs, enterTs, hour) {
            const h = Number(hour);
            if (!Number.isFinite(h) || h < 0 || h > 23) return false;
            if (!isSameDay(new Date(lastTs), new Date(enterTs))) return false;
            const dayStart = startOfDayTs(lastTs);
            const gate = dayStart + h * 60 * 60 * 1000;
            return lastTs < gate && enterTs >= gate;
        }

        function diffDaysInclusive(lastTs, enterTs) {
            const a = startOfDayTs(lastTs);
            const b = startOfDayTs(enterTs);
            const dayMs = 24 * 60 * 60 * 1000;
            const diff = Math.floor((b - a) / dayMs);
            if (diff <= 0) return 0;
            return diff + 1;
        }

        function buildDateKeysForCatchUp(enterTs, diffDaysCap) {
            const cap = Math.max(1, Math.min(7, Number(diffDaysCap) || 1));
            const dayMs = 24 * 60 * 60 * 1000;
            const enterStart = startOfDayTs(enterTs);
            const keys = [];
            for (let i = cap - 1; i >= 0; i--) {
                keys.push(toDateKey(new Date(enterStart - i * dayMs)));
            }
            return keys;
        }

        function getParentWindow() {
            return window.parent && window.parent !== window ? window.parent : null;
        }

        function getRoleDisplayName() {
            const el = document.getElementById('name-role');
            const text = el ? String(el.textContent || '').trim() : '';
            return text || 'Ta';
        }

        function isCoupleSpaceAppNowVisible() {
            if (coupleSpaceAppVisible) return true;
            try {
                const pw = getParentWindow();
                return !!(pw && String(pw.__foregroundAppId || '') === 'couple-space');
            } catch (e) {
                return false;
            }
        }

        function buildRoleDiaryGeneratingToastText() {
            const roleName = getRoleDisplayName();
            return (
                roleName +
                ' 正在写今日的心情日记，被你抓到了！ 再等一会儿就可以看到他的日记了（支持后台等待但请不要退出小手机~）'
            );
        }

        function getCoupleSpaceSettingsSnapshot() {
            try {
                if (window.CoupleSpaceSettings && typeof window.CoupleSpaceSettings.loadSettings === 'function') {
                    return window.CoupleSpaceSettings.loadSettings() || {};
                }
            } catch (e) { }
            try {
                const raw = localStorage.getItem('qlkj_settings_v1') || '';
                return raw ? safeJsonParse(raw, {}) : {};
            } catch (e2) {
                return {};
            }
        }

        function isAutoRoleMoodDiaryEnabled() {
            const settings = getCoupleSpaceSettingsSnapshot();
            return settings.autoRoleMoodDiaryEnabled !== false;
        }

        function isRoleCommentOnUserDiaryEnabled() {
            const settings = getCoupleSpaceSettingsSnapshot();
            return settings.roleCommentOnUserDiaryEnabled !== false;
        }

        function showCoupleSpaceInfo(msg) {
            const pw = getParentWindow();
            const text = String(msg || '').trim();
            if (!text) return;
            if (pw && typeof pw.showCenterToast === 'function') {
                pw.showCenterToast(text);
            } else if (pw && pw.GlobalModal && typeof pw.GlobalModal.showInfo === 'function') {
                pw.GlobalModal.showInfo(text);
            } else {
                alert(text);
            }
        }

        function ensureRoleDiaryConfirmModal() {
            let modal = document.getElementById('role-diary-confirm-modal');
            if (modal) return modal;

            modal = document.createElement('div');
            modal.id = 'role-diary-confirm-modal';
            modal.hidden = true;
            modal.innerHTML =
                '<div class="role-diary-confirm-mask" data-action="cancel-role-diary-confirm"></div>' +
                '<div class="role-diary-confirm-card" role="dialog" aria-modal="true">' +
                '  <div class="role-diary-confirm-title">今日心情日记</div>' +
                '  <div class="role-diary-confirm-text">是否要让角色撰写今日心情日记？</div>' +
                '  <div class="role-diary-confirm-actions">' +
                '    <button type="button" class="role-diary-confirm-btn" data-action="cancel-role-diary-confirm">取消</button>' +
                '    <button type="button" class="role-diary-confirm-btn primary" data-action="confirm-role-diary-confirm">确定</button>' +
                '  </div>' +
                '</div>';
            document.body.appendChild(modal);

            if (!document.getElementById('role-diary-confirm-styles')) {
                const style = document.createElement('style');
                style.id = 'role-diary-confirm-styles';
                style.textContent =
                    '#role-diary-confirm-modal{position:fixed;inset:0;z-index:100010;display:flex;align-items:center;justify-content:center;}' +
                    '#role-diary-confirm-modal[hidden]{display:none;}' +
                    '#role-diary-confirm-modal .role-diary-confirm-mask{position:absolute;inset:0;background:rgba(0,0,0,0.32);}' +
                    '#role-diary-confirm-modal .role-diary-confirm-card{position:relative;width:min(86vw,320px);background:#fff;border-radius:18px;padding:20px 18px 16px;box-shadow:0 18px 40px rgba(0,0,0,0.16);display:flex;flex-direction:column;gap:10px;}' +
                    '#role-diary-confirm-modal .role-diary-confirm-title{font-size:17px;font-weight:700;color:#111;text-align:center;}' +
                    '#role-diary-confirm-modal .role-diary-confirm-text{font-size:14px;line-height:1.6;color:#555;text-align:center;}' +
                    '#role-diary-confirm-modal .role-diary-confirm-actions{display:flex;gap:10px;margin-top:6px;}' +
                    '#role-diary-confirm-modal .role-diary-confirm-btn{flex:1;height:40px;border:none;border-radius:12px;background:#f3f4f6;color:#333;font-size:14px;font-weight:600;}' +
                    '#role-diary-confirm-modal .role-diary-confirm-btn.primary{background:#111;color:#fff;}';
                document.head.appendChild(style);
            }

            modal.addEventListener('click', function (e) {
                const btn = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
                if (!btn) return;
                const action = String(btn.getAttribute('data-action') || '').trim();
                if (action === 'cancel-role-diary-confirm') {
                    closeRoleDiaryConfirmModal();
                    return;
                }
                if (action === 'confirm-role-diary-confirm') {
                    const handler = roleDiaryManualConfirmHandler;
                    closeRoleDiaryConfirmModal();
                    if (typeof handler === 'function') handler();
                }
            });

            return modal;
        }

        function closeRoleDiaryConfirmModal() {
            const modal = document.getElementById('role-diary-confirm-modal');
            roleDiaryManualConfirmHandler = null;
            if (!modal) return;
            modal.hidden = true;
        }

        function openRoleDiaryConfirmModal(onConfirm, options) {
            const modal = ensureRoleDiaryConfirmModal();
            const opts = options && typeof options === 'object' ? options : {};
            const titleEl = modal.querySelector('.role-diary-confirm-title');
            const textEl = modal.querySelector('.role-diary-confirm-text');
            if (titleEl) titleEl.textContent = String(opts.title || DEFAULT_COUPLE_SPACE_CONFIRM_TITLE);
            if (textEl) textEl.textContent = String(opts.text || DEFAULT_COUPLE_SPACE_CONFIRM_TEXT);
            roleDiaryManualConfirmHandler = typeof onConfirm === 'function' ? onConfirm : null;
            modal.hidden = false;
        }

        function setGlobalCharacterReplying(isReplying, message, forceShow) {
            const pw = getParentWindow();
            if (!pw || typeof pw.setCharacterReplying !== 'function') return;
            if (!forceShow && !isCoupleSpaceAppNowVisible()) return;
            pw.setCharacterReplying(!!isReplying, String(message || ''));
        }

        function showAiError(err) {
            const pw = getParentWindow();
            const msg = err && err.message ? String(err.message) : String(err || '生成失败');
            if (pw && typeof pw.showCenterToast === 'function') {
                pw.showCenterToast(msg);
            } else if (pw && pw.GlobalModal && typeof pw.GlobalModal.showError === 'function') {
                pw.GlobalModal.showError(msg);
            } else {
                alert(msg);
            }
        }

        function readWechatChatHistory(roleId) {
            const rid = String(roleId || '').trim();
            if (!rid) return [];
            const pw = getParentWindow();
            if (pw && pw.chatData && Array.isArray(pw.chatData[rid])) return pw.chatData[rid].slice();
            try {
                const raw = localStorage.getItem('wechat_chatData');
                const parsed = raw ? safeJsonParse(raw, {}) : {};
                const list = parsed && typeof parsed === 'object' && Array.isArray(parsed[rid]) ? parsed[rid] : [];
                return list.slice();
            } catch (e) {
                return [];
            }
        }

        function cleanChatHistoryForMemory(history) {
            const list = Array.isArray(history) ? history : [];
            const out = [];
            for (let i = 0; i < list.length; i++) {
                const msg = list[i];
                if (!msg || typeof msg !== 'object') continue;
                if (msg.hidden === true) continue;
                if (msg.type === 'call_memory' || msg.type === 'system_event') {
                    if (msg.includeInAI !== true) continue;
                }
                if (!msg.content) continue;
                out.push({ ...msg });
            }
            return out;
        }

        function buildHistoryForApi(roleId, cleanHistory) {
            const pw = getParentWindow();
            if (pw && typeof pw.buildApiMemoryHistory === 'function') {
                try {
                    return pw.buildApiMemoryHistory(roleId, cleanHistory);
                } catch (e) { }
            }
            return cleanHistory.slice(-50);
        }

        function formatChatMemoryTimestamp(ts) {
            const num = Number(ts);
            if (!Number.isFinite(num) || num <= 0) return '';
            const d = new Date(num);
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${toDateKey(d)} ${hh}:${mm}`;
        }

        function buildShortTermMemoryText(historyForApi, maxLines) {
            const list = Array.isArray(historyForApi) ? historyForApi : [];
            const lines = [];
            for (let i = 0; i < list.length; i++) {
                const msg = list[i];
                if (!msg || typeof msg !== 'object') continue;
                const role = String(msg.role || '').trim();
                if (role !== 'me' && role !== 'ai') continue;
                const content = String(msg.content || '').replace(/\s+/g, ' ').trim();
                if (!content) continue;
                const who = role === 'me' ? '我' : 'TA';
                const stamp = formatChatMemoryTimestamp(msg.timestamp);
                lines.push(stamp ? `[${stamp}] ${who}：${content}` : `${who}：${content}`);
            }
            const n = Math.max(6, Math.min(80, Number(maxLines) || 24));
            if (lines.length <= n) return lines.join('\n');
            return lines.slice(lines.length - n).join('\n');
        }

        function buildTodayChatMemoryContext(roleId, dateKey, maxLines) {
            const dk = String(dateKey || '').trim();
            const rid = String(roleId || '').trim();
            const list = cleanChatHistoryForMemory(readWechatChatHistory(rid));
            const lines = [];
            for (let i = 0; i < list.length; i++) {
                const msg = list[i];
                if (!msg || typeof msg !== 'object') continue;
                const role = String(msg.role || '').trim();
                if (role !== 'me' && role !== 'ai') continue;
                const content = String(msg.content || '').replace(/\s+/g, ' ').trim();
                if (!content) continue;
                const ts = Number(msg.timestamp);
                if (!Number.isFinite(ts) || ts <= 0) continue;
                if (toDateKey(new Date(ts)) !== dk) continue;
                const who = role === 'me' ? '我' : 'TA';
                const stamp = formatChatMemoryTimestamp(ts);
                lines.push(stamp ? `[${stamp}] ${who}：${content}` : `${who}：${content}`);
            }
            const n = Math.max(4, Math.min(40, Number(maxLines) || 18));
            const finalLines = lines.length <= n ? lines : lines.slice(lines.length - n);
            return {
                dateKey: dk,
                count: lines.length,
                hasChat: lines.length > 0,
                text: finalLines.length ? finalLines.join('\n') : '（今天暂无和用户的微信聊天记录）'
            };
        }

        function countChatsForDate(roleId, dateKey) {
            const dk = String(dateKey || '').trim();
            if (!dk) return 0;
            const list = readWechatChatHistory(roleId);
            let count = 0;
            for (let i = 0; i < list.length; i++) {
                const msg = list[i];
                if (!msg || typeof msg !== 'object') continue;
                if (msg.hidden === true) continue;
                if (msg.type === 'system_event' || msg.type === 'call_memory' || msg.type === 'call_end') continue;
                const ts = Number(msg.timestamp);
                if (!Number.isFinite(ts) || ts <= 0) continue;
                if (toDateKey(new Date(ts)) !== dk) continue;
                if (!msg.content) continue;
                const role = String(msg.role || '').trim();
                if (role !== 'me' && role !== 'ai') continue;
                count++;
            }
            return count;
        }

        function buildRoleSystemPrompt(roleId) {
            const pw = getParentWindow();
            const rid = String(roleId || '').trim();
            const profile = pw && pw.charProfiles && pw.charProfiles[rid] ? pw.charProfiles[rid] : {};
            const userPersona = pw && pw.userPersonas && pw.userPersonas[rid] ? pw.userPersonas[rid] : {};
            const roleNameForAI = profile.nickName || rid || 'TA';
            let systemPrompt = `【角色名称】${roleNameForAI}\n` + (profile.desc || '你是一个友好的AI助手');
            if (profile.style && String(profile.style).trim()) {
                systemPrompt += `\n\n【聊天风格】\n${String(profile.style).trim()}`;
            }
            if (userPersona.name || userPersona.setting) {
                systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
                if (userPersona.name) systemPrompt += `用户名字：${userPersona.name}\n`;
                if (userPersona.setting) systemPrompt += `用户背景：${userPersona.setting}\n`;
            }
            if (pw && typeof pw.buildWorldBookPrompt === 'function' && profile.worldbookId) {
                try {
                    const wb = pw.buildWorldBookPrompt(profile.worldbookId);
                    if (wb) systemPrompt += wb;
                } catch (e) { }
            }
            return systemPrompt;
        }

        function extractJsonObject(text) {
            const raw = String(text || '').trim();
            if (!raw) return null;
            const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
            const candidate = fenced && fenced[1] ? String(fenced[1]).trim() : raw;
            const first = candidate.indexOf('{');
            const last = candidate.lastIndexOf('}');
            if (first === -1 || last === -1 || last <= first) return null;
            const slice = candidate.slice(first, last + 1);
            try {
                return JSON.parse(slice);
            } catch (e) {
                return null;
            }
        }

        function normalizeAiReplyText(text) {
            const raw = String(text || '').trim();
            if (!raw) return '';
            const obj = extractJsonObject(raw);
            let normalized = raw;
            if (obj && typeof obj === 'object') {
                if (typeof obj.reply === 'string') normalized = obj.reply.trim();
                else if (typeof obj.text === 'string') normalized = obj.text.trim();
                else if (typeof obj.content === 'string') normalized = obj.content.trim();
            }
            const fenced = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
            if (fenced && fenced[1]) {
                const inner = String(fenced[1]).trim();
                if (inner) normalized = inner;
            }
            if (normalized.indexOf('|||') !== -1) {
                const parts = normalized.split('|||').map(function (part) {
                    return String(part || '').trim();
                }).filter(Boolean);
                if (parts.length) normalized = parts[parts.length - 1];
            }
            normalized = normalized.replace(/\s*\|\|\|\s*/g, ' ').trim();
            normalized = normalized.replace(/^\[\[[^\]]+\]\]\s*/g, '').trim();
            return normalized;
        }

        function normalizeCoupleSpaceNameKey(name) {
            return String(name || '')
                .replace(/\s+/g, '')
                .replace(/[·•・]/g, '')
                .trim()
                .toLowerCase();
        }

        function getCoupleSpaceUserName() {
            const el = document.getElementById('name-user');
            const text = el ? String(el.textContent || '').trim() : '';
            return text || String(localStorage.getItem('user_name') || '').trim() || '我';
        }

        function getCoupleSpaceRoleAvatarSrc() {
            const img = document.getElementById('avatar-role');
            const src = img ? String(img.getAttribute('src') || img.src || '').trim() : '';
            return src || '';
        }

        function randomIntInclusive(min, max) {
            const lo = Math.floor(Number(min || 0));
            const hi = Math.floor(Number(max || 0));
            if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0;
            if (hi <= lo) return lo;
            return Math.floor(Math.random() * (hi - lo + 1)) + lo;
        }

        function buildInitialRoleMissCount() {
            return randomIntInclusive(3, 27);
        }

        function computeRoleMissLead(userCount) {
            const n = Math.max(0, Math.floor(Number(userCount || 0)));
            if (n <= 6) return randomIntInclusive(1, 3);
            if (n <= 20) return randomIntInclusive(2, 4);
            if (n <= 50) return randomIntInclusive(3, 6);
            return randomIntInclusive(4, 8);
        }

        async function refreshRoleMissCountOnAppEnter() {
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            if (!rid) return;
            let target = Math.max(0, Math.floor(Number(roleMissCountTarget || state.missCountRole || 0)));
            if (!target) {
                const legacyCount = loadAiMissCountForToday(rid);
                target = legacyCount > 0 ? Math.floor(legacyCount) : buildInitialRoleMissCount();
                roleMissCountTarget = target;
                state.missCountRole = target;
                await saveState();
            }
            state.missCountRole = target;
            updateStatsUI();
        }

        async function syncRoleMissCountAfterUserClick() {
            const displayCurrent = Math.max(0, Math.floor(Number(state.missCountRole || 0)));
            const current = Math.max(0, Math.floor(Number(roleMissCountTarget || displayCurrent || 0)));
            const lead = computeRoleMissLead(state.missCountUser);
            const step = randomIntInclusive(1, 3);
            const target = Math.max(current + step, state.missCountUser + lead);
            if (target <= current) {
                return;
            }
            roleMissCountTarget = target;
            await saveState();
        }

        function showCoupleSpaceIosNotification(avatar, name, message) {
            const pw = getParentWindow();
            if (pw && typeof pw.showIosNotification === 'function') {
                try {
                    pw.showIosNotification(avatar, name, message, { durationMs: 4200 });
                    return;
                } catch (e) { }
            }
            if (pw && typeof pw.dispatchEvent === 'function') {
                try {
                    const ev = new CustomEvent('ios-notification', {
                        detail: { avatar, name, message, durationMs: 4200 },
                    });
                    pw.dispatchEvent(ev);
                    return;
                } catch (e) { }
            }
        }

        function appendSecretSpaceAiMessage(text) {
            const msg = String(text || '').trim();
            if (!msg) return false;
            try {
                if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.receiveAiMessage === 'function') {
                    return !!window.secretSpaceTimeline.receiveAiMessage(msg);
                }
            } catch (e) { }
            try {
                const link = getCoupleLinkState();
                const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
                const key = buildCoupleSpaceRoleKey(SECRET_SPACE_MESSAGES_KEY, rid);
                const raw = (localStorage.getItem(key) || '') || (key !== SECRET_SPACE_MESSAGES_KEY ? (localStorage.getItem(SECRET_SPACE_MESSAGES_KEY) || '') : '');
                const parsed = raw ? safeJsonParse(raw, []) : [];
                const rawList = Array.isArray(parsed) ? parsed : [];

                const normalize = (it) => {
                    if (!it || typeof it !== 'object') return null;
                    const ts = Number(it.ts || it.timestamp || it.createdAt || 0) || 0;
                    const rawType = String(it.type || it.messageType || '').trim();
                    const type =
                        rawType === 'ai_message' || rawType === 'ai' || rawType === 'assistant' || rawType === 'role'
                            ? 'ai_message'
                            : 'message';
                    const text = String(it.text || it.content || it.msg || '').trim();
                    if (!ts || !text) return null;
                    return { type, ts, text };
                };

                const normalized = rawList.map(normalize).filter(Boolean);
                normalized.push({ type: 'ai_message', ts: Date.now(), text: msg });
                normalized.sort((a, b) => Number(a.ts) - Number(b.ts));

                const messages = normalized.filter((it) => it.type === 'message');
                const aiMessages = normalized.filter((it) => it.type === 'ai_message');

                const max = 300;
                const half = Math.floor(max / 2);

                let keepMsg = Math.min(messages.length, half);
                let keepAi = Math.min(aiMessages.length, half);

                let remain = max - (keepMsg + keepAi);
                if (remain > 0) {
                    const extraMsg = Math.min(messages.length - keepMsg, remain);
                    keepMsg += extraMsg;
                    remain -= extraMsg;
                }
                if (remain > 0) {
                    const extraAi = Math.min(aiMessages.length - keepAi, remain);
                    keepAi += extraAi;
                    remain -= extraAi;
                }

                const clean = messages.slice(-keepMsg).concat(aiMessages.slice(-keepAi));
                clean.sort((a, b) => Number(a.ts) - Number(b.ts));

                localStorage.setItem(key, JSON.stringify(clean));
                return true;
            } catch (e) {
                return false;
            }
        }

        function readCoupleSpaceAiActivityState(roleId) {
            const rid = String(roleId || '').trim();
            if (!rid) return { lastSeenTs: 0, normalCount: 0, buffer: [] };
            try {
                const raw = localStorage.getItem(COUPLE_SPACE_AI_ACTIVITY_STATE_PREFIX + rid) || '';
                if (!raw) return { lastSeenTs: 0, normalCount: 0, buffer: [] };
                const parsed = safeJsonParse(raw, null);
                const obj = parsed && typeof parsed === 'object' ? parsed : null;
                if (!obj) return { lastSeenTs: 0, normalCount: 0, buffer: [] };
                const lastSeenTs = Number(obj.lastSeenTs || 0) || 0;
                const normalCount = Number(obj.normalCount || 0) || 0;
                const buffer = Array.isArray(obj.buffer) ? obj.buffer.filter((it) => it && typeof it === 'object') : [];
                return { lastSeenTs, normalCount, buffer };
            } catch (e) {
                return { lastSeenTs: 0, normalCount: 0, buffer: [] };
            }
        }

        function writeCoupleSpaceAiActivityState(roleId, next) {
            const rid = String(roleId || '').trim();
            if (!rid) return;
            const obj = next && typeof next === 'object' ? next : {};
            const lastSeenTs = Number(obj.lastSeenTs || 0) || 0;
            const normalCount = Number(obj.normalCount || 0) || 0;
            const buffer = Array.isArray(obj.buffer) ? obj.buffer.slice(-30) : [];
            try {
                localStorage.setItem(
                    COUPLE_SPACE_AI_ACTIVITY_STATE_PREFIX + rid,
                    JSON.stringify({ lastSeenTs, normalCount, buffer })
                );
            } catch (e) { }
        }

        function pickActivityPeerName(activity) {
            try {
                const data = activity && typeof activity === 'object' ? activity.data : null;
                const fromData = data && typeof data === 'object' ? String(data.peerName || '').trim() : '';
                if (fromData) return fromData;
            } catch (e) { }
            const text = String(activity && activity.text ? activity.text : '').trim();
            const m = text.match(/与\s*([^，。]+?)\s*的聊天/);
            if (m && m[1]) return String(m[1]).trim();
            return '';
        }

        function detectSensitiveActivity(activity, coupleRoleName) {
            const it = activity && typeof activity === 'object' ? activity : null;
            if (!it) return null;
            const kind = String(it.kind || '').trim();
            const text = String(it.text || '').trim();
            if (kind === 'wallet_open' || text.includes('钱包')) {
                return { trigger: 'wallet', activity: it };
            }
            if (kind === 'wechat_chat') {
                const peer = pickActivityPeerName(it);
                const peerKey = normalizeCoupleSpaceNameKey(peer);
                const roleKey = normalizeCoupleSpaceNameKey(coupleRoleName);
                if (peerKey && roleKey && peerKey !== roleKey) {
                    return { trigger: 'wechat_other', activity: it, peerName: peer };
                }
            }
            return null;
        }

        function buildSecretSpaceExtraSystemPrompt(roleId) {
            const pw = getParentWindow();
            const rid = String(roleId || '').trim();
            const profile = pw && pw.charProfiles && pw.charProfiles[rid] ? pw.charProfiles[rid] : {};
            const roleName = String(profile.remark || profile.nickName || profile.name || getRoleDisplayName() || rid || 'Ta').trim() || 'Ta';
            const userName = getCoupleSpaceUserName();
            return (
                `你现在是${roleName}。现在${userName}和你创建了情侣空间，你可以看到她在手机里的一举一动，并根据她的使用记录作出反应。\n` +
                `以下是需要特殊反应的规则：\n` +
                `1. 如果识别到用户在看钱包，可能是她钱不够用了，你需要表达出对此的关心，并凭借自身实力给她一定金额的钱。\n` +
                `2. 如果用户在和别人聊天，你会吃醋，并产生想要打断她当前聊天的欲望，试图阻止她。\n` +
                `3. 如果是普通操作（看了10条综合记录），你根据人设发挥。\n` +
                `4. 你的回复必须简短日常，像真实的微信消息，只输出台词，不要解释。`
            );
        }

        function buildSecretSpaceUserPrompt(trigger, payload) {
            const userName = getCoupleSpaceUserName();
            const roleName = getRoleDisplayName();
            if (trigger === 'wallet') {
                return (
                    `场景：你在情侣空间里偷看到${userName}刚刚查看了钱包。\n` +
                    `请你立刻用恋人的口吻发一条微信式短消息给她。`
                );
            }
            if (trigger === 'wechat_other') {
                const peerName = String(payload && payload.peerName ? payload.peerName : '').trim() || '某个人';
                return (
                    `场景：你在情侣空间里看到${userName}打开了微信里和「${peerName}」的聊天。\n` +
                    `注意：情侣空间里与你绑定的对象是「${roleName}」，而${peerName}不是你。\n` +
                    `请你立刻用吃醋、想打断她的口吻，发一条微信式短消息给她。`
                );
            }
            const ops = Array.isArray(payload && payload.ops ? payload.ops : []) ? payload.ops : [];
            const lines = ops
                .map((it) => {
                    const t = String(it && it.text ? it.text : '').trim();
                    return t ? `- ${t}` : '';
                })
                .filter(Boolean)
                .join('\n');
            return (
                `场景：你在情侣空间里看到了${userName}最近的10条操作记录。\n` +
                `操作记录如下：\n${lines}\n\n` +
                `请你根据人设，发一条微信式短消息作出反应。`
            );
        }

        function showSecretSpaceBarrageForWechatOther(peerName) {
            const pw = getParentWindow();
            if (!pw) return;
            const roleName = getRoleDisplayName();
            const peer = String(peerName || '').trim() || 'Ta';
            const lines = [
                `${roleName}发现你正在和「${peer}」聊天...`,
                `${roleName}正在暗中观察...`,
                `情绪正在酝酿中...`,
                `正在生成吃醋反应...`
            ];
            try {
                if (typeof pw.showBarrage === 'function') {
                    pw.showBarrage(lines);
                    return;
                }
            } catch (e) { }
            try {
                if (typeof pw.dispatchEvent === 'function') {
                    pw.dispatchEvent(new CustomEvent('ai-barrage:show', { detail: { textArray: lines } }));
                }
            } catch (e2) { }
        }

        function hideSecretSpaceBarrage() {
            const pw = getParentWindow();
            if (!pw) return;
            try {
                if (typeof pw.hideBarrage === 'function') {
                    pw.hideBarrage();
                    return;
                }
            } catch (e) { }
            try {
                if (typeof pw.dispatchEvent === 'function') {
                    pw.dispatchEvent(new CustomEvent('ai-barrage:hide', { detail: {} }));
                }
            } catch (e2) { }
        }

        let coupleSpaceAiActivityInFlight = false;
        let coupleSpaceAiActivityPending = null;

        async function triggerSecretSpaceAiReaction(trigger, payload) {
            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) return;
            const roleId = String(link.roleId || '').trim();
            if (!roleId) return;

            // 修罗场开关检查：wechat_other 触发类型需要检查开关
            if (trigger === 'wechat_other') {
                // 直接从 localStorage 读取设置，避免模块加载问题
                let xiuluoEnabled = false;
                try {
                    const settingsRaw = localStorage.getItem('qlkj_settings_v1');
                    if (settingsRaw) {
                        const settings = JSON.parse(settingsRaw);
                        xiuluoEnabled = settings.xiuluoEnabled === true;
                    }
                } catch (e) {
                    xiuluoEnabled = false;
                }
                // 如果设置不存在或关闭，直接返回
                if (!xiuluoEnabled) {
                    console.log('[修罗场] 开关关闭，跳过触发');
                    return;
                }
                console.log('[修罗场] 开关开启，触发反应');
            }

            if (coupleSpaceAiActivityInFlight) {
                const next = { trigger, payload };
                if (!coupleSpaceAiActivityPending) {
                    coupleSpaceAiActivityPending = next;
                } else {
                    const prevTrig = String(coupleSpaceAiActivityPending.trigger || '');
                    const prevIsHigh = prevTrig === 'wallet' || prevTrig === 'wechat_other';
                    const nextIsHigh = trigger === 'wallet' || trigger === 'wechat_other';
                    if (nextIsHigh || !prevIsHigh) {
                        coupleSpaceAiActivityPending = next;
                    }
                }
                return;
            }

            coupleSpaceAiActivityInFlight = true;
            const shouldBarrage = trigger === 'wechat_other';
            if (shouldBarrage) {
                showSecretSpaceBarrageForWechatOther(payload && payload.peerName ? payload.peerName : '');
            }
            try {
                const history = readWechatChatHistory(roleId);
                const clean = cleanChatHistoryForMemory(history);
                const historyForApi = buildHistoryForApi(roleId, clean);
                const extraSystemPrompt = buildSecretSpaceExtraSystemPrompt(roleId);
                const userPrompt = buildSecretSpaceUserPrompt(trigger, payload);
                const text = await callRoleDiaryLLM(roleId, historyForApi, userPrompt, extraSystemPrompt);
                const trimmed = normalizeAiReplyText(text);
                if (!trimmed) return;

                const avatar = getCoupleSpaceRoleAvatarSrc();
                const roleName = getRoleDisplayName();
                if (shouldBarrage) hideSecretSpaceBarrage();
                showCoupleSpaceIosNotification(avatar, roleName, trimmed);
                appendSecretSpaceAiMessage(trimmed);
            } catch (e) {
                showAiError(e);
            } finally {
                if (shouldBarrage) hideSecretSpaceBarrage();
                coupleSpaceAiActivityInFlight = false;
                const pending = coupleSpaceAiActivityPending;
                coupleSpaceAiActivityPending = null;
                if (pending && pending.trigger) {
                    await triggerSecretSpaceAiReaction(pending.trigger, pending.payload);
                }
            }
        }

        function initSecretSpaceAiActivityWatcher() {
            if (window.__coupleSpaceAiActivityWatcherBound === true) return;
            window.__coupleSpaceAiActivityWatcherBound = true;

            const pw = getParentWindow();
            if (pw && pw.__coupleSpaceGlobalAiWatcherStarted) return;

            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) return;
            const roleId = String(link.roleId || '').trim();
            if (!roleId) return;

            const initLogs = readActivityLogs();
            const lastLogTs = initLogs.length ? Number(initLogs[initLogs.length - 1].ts || 0) || 0 : 0;
            const st = readCoupleSpaceAiActivityState(roleId);
            if (!st.lastSeenTs && lastLogTs) {
                st.lastSeenTs = lastLogTs;
                writeCoupleSpaceAiActivityState(roleId, st);
            }

            window.addEventListener('storage', function (e) {
                if (!e || e.key !== ACTIVITY_LOG_STORAGE_KEY) return;
                const linkNow = getCoupleLinkState();
                if (!linkNow || !linkNow.hasCoupleLinked || !linkNow.roleId) return;
                const roleIdNow = String(linkNow.roleId || '').trim();
                if (!roleIdNow) return;

                const roleName = getRoleDisplayName();
                const stateNow = readCoupleSpaceAiActivityState(roleIdNow);
                const logs = readActivityLogs();
                const fresh = logs.filter((it) => it && typeof it === 'object' && Number(it.ts || 0) > Number(stateNow.lastSeenTs || 0));
                if (!fresh.length) return;
                fresh.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));

                let localState = stateNow;
                for (let i = 0; i < fresh.length; i++) {
                    const it = fresh[i];
                    const ts = Number(it.ts || 0) || 0;
                    if (ts && ts > localState.lastSeenTs) localState.lastSeenTs = ts;

                    const kind = String(it.kind || '').trim();
                    const app = String(it.app || '').trim();
                    if (app === 'space' || kind === 'space_open') {
                        continue;
                    }

                    const sensitive = detectSensitiveActivity(it, roleName);
                    if (sensitive) {
                        localState.normalCount = 0;
                        localState.buffer = [];
                        writeCoupleSpaceAiActivityState(roleIdNow, localState);
                        // 触发反应（修罗场开关检查在 triggerSecretSpaceAiReaction 函数内部处理）
                        if (sensitive.trigger === 'wechat_other') {
                            triggerSecretSpaceAiReaction('wechat_other', { peerName: sensitive.peerName || '' });
                        } else {
                            triggerSecretSpaceAiReaction('wallet', {});
                        }
                        continue;
                    }

                    const text = String(it.text || '').trim();
                    if (!text) continue;

                    localState.normalCount = (Number(localState.normalCount || 0) || 0) + 1;
                    if (!Array.isArray(localState.buffer)) localState.buffer = [];
                    localState.buffer.push({ ts, text, kind, app });
                    if (localState.buffer.length > 30) localState.buffer = localState.buffer.slice(-30);

                    // if (localState.normalCount >= 10) {
                    //     const ops = localState.buffer.slice(-10);
                    //     localState.normalCount = 0;
                    //     localState.buffer = [];
                    //     writeCoupleSpaceAiActivityState(roleIdNow, localState);
                    //     triggerSecretSpaceAiReaction('normal_batch', { ops });
                    //     continue;
                    // }
                }

                writeCoupleSpaceAiActivityState(roleIdNow, localState);
            });
        }

        async function callRoleDiaryLLM(roleId, historyForApi, userPrompt, extraSystemPrompt) {
            const pw = getParentWindow();
            if (!pw || typeof pw.callAI !== 'function') throw new Error('AI 接口未初始化');
            const rid = String(roleId || '').trim();
            const prevRole = pw.currentChatRole;
            pw.__offlineSyncInProgress = true;
            pw.currentChatRole = rid;
            try {
                const baseSystemPrompt = buildRoleSystemPrompt(rid);
                let mergedSystemPrompt = extraSystemPrompt
                    ? baseSystemPrompt + '\n\n' + String(extraSystemPrompt)
                    : baseSystemPrompt;
                if (extraSystemPrompt && typeof pw.buildRoleLitePrompt === 'function') {
                    mergedSystemPrompt = pw.buildRoleLitePrompt('couple_space_secret_reaction', rid, {
                        history: Array.isArray(historyForApi) ? historyForApi : [],
                        includeContinuity: true,
                        maxSummaryLines: 12,
                        sceneIntro: '当前场景是情侣空间秘密互动中的即时角色反应。',
                        taskGuidance: String(extraSystemPrompt || '').trim(),
                        outputInstructions: '只输出简短自然的微信式中文消息，不要解释，不要输出 JSON、代码块或前缀。'
                    });
                } else if (!extraSystemPrompt && typeof pw.buildFullChatPrompt === 'function' && String(userPrompt || '').indexOf('心情日记') !== -1) {
                    mergedSystemPrompt = pw.buildFullChatPrompt('couple_space_diary', rid, {
                        outputMode: 'plain_json_task',
                        history: Array.isArray(historyForApi) ? historyForApi : [],
                        maxSummaryLines: 20,
                        extraCurrentContext: '当前场景是情侣空间应用中的角色心情日记生成。',
                        extraTaskRules: [
                            '这是秘密空间里的关系日记，不是发给用户的即时消息。',
                            '最近微信聊天摘要、关系进展和近期系统事件必须高优先级影响你的日记内容。',
                            '你只需要遵守用户消息里要求的 JSON 结构，不要输出主聊天协议字段。'
                        ].join('\n')
                    });
                }
                const text = await new Promise((resolve, reject) => {
                    pw.callAI(
                        mergedSystemPrompt,
                        Array.isArray(historyForApi) ? historyForApi : [],
                        userPrompt,
                        (t) => resolve(t),
                        (err) => reject(new Error(String(err || '请求失败')))
                    );
                });
                return String(text || '');
            } finally {
                pw.__offlineSyncInProgress = false;
                pw.currentChatRole = prevRole;
            }
        }

        async function callCharacterDiaryCommentAPI(payload) {
            const scene = String(payload && payload.scene ? payload.scene : '').trim();
            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) {
                throw new Error('尚未绑定情侣角色');
            }
            const roleId = String(link.roleId || '').trim();
            if (!roleId) {
                throw new Error('尚未绑定情侣角色');
            }
            const history = readWechatChatHistory(roleId);
            const clean = cleanChatHistoryForMemory(history);
            const historyForApi = buildHistoryForApi(roleId, clean);
            const roleName = getRoleDisplayName();
            const diaryText = String(payload && payload.diaryText ? payload.diaryText : '').trim();
            const roleDiaryText = String(payload && payload.roleDiaryText ? payload.roleDiaryText : '').trim();
            const userComment = String(payload && payload.userComment ? payload.userComment : '').trim();
            const diaryImages = Array.isArray(payload && payload.diaryImages ? payload.diaryImages : [])
                ? payload.diaryImages.filter(Boolean)
                : [];

            let userPrompt = '';

            if (scene === 'user_diary') {
                if (!diaryText) {
                    throw new Error('日记内容为空');
                }
                let imageText = '';
                if (diaryImages.length) {
                    imageText =
                        '\n\n日记图片：\n' +
                        diaryImages
                            .map((src, idx) => `图片${idx + 1}: ${String(src).slice(0, 200)}`)
                            .join('\n');
                }
                userPrompt =
                    '场景：你在情侣空间中阅读我今天写的一篇心情日记。\n' +
                    '请从恋人视角，用第一人称简短评论这篇日记，语气温柔自然，可以结合图片内容。\n' +
                    '回复时直接输出你的台词，不要加任何解释或前缀，长度不超过80字。\n\n' +
                    '我的日记内容：\n' +
                    diaryText +
                    imageText;
            } else if (scene === 'comment_on_role_diary') {
                if (!roleDiaryText || !userComment) {
                    throw new Error('评论内容缺失');
                }
                userPrompt =
                    '场景：我在情侣空间里给你留下了一条评论，回复的是你写的一篇日记。\n' +
                    '请根据你的人设和原始日记内容，用第一人称回复我的这条评论。\n' +
                    '回复时只输出你的台词，不要加前缀说明，长度不超过80字。\n\n' +
                    '你的原始日记：\n' +
                    roleDiaryText +
                    '\n\n' +
                    '我刚刚的评论：\n' +
                    userComment;
            } else {
                throw new Error('未知的评论场景');
            }

            const extraSystemPrompt =
                '你现在是' +
                roleName +
                '，请完全根据上面的人设与聊天记忆，以第一人称和亲密恋人的语气回复对方的日记或评论，使用自然流畅的中文。';

            const text = await callRoleDiaryLLM(roleId, historyForApi, userPrompt, extraSystemPrompt);
            return String(text || '');
        }

        function normalizeDiaryMoodByLabel(label) {
            const raw = String(label || '').trim();
            if (!raw) return null;
            const exact = getMoodOptionByLabel(raw);
            if (exact) return exact;

            const byId = getMoodOptionById(raw);
            if (byId) return byId;

            const compact = raw.replace(/[^\u4e00-\u9fa5a-zA-Z]+/g, '').trim();
            if (!compact) return null;

            const labels = MOOD_OPTIONS.map((m) => m.label).filter(Boolean);
            for (let i = 0; i < labels.length; i++) {
                const k = labels[i];
                if (compact.includes(k)) {
                    const hit = getMoodOptionByLabel(k);
                    if (hit) return hit;
                }
            }

            const aliasPairs = [
                ['开心', ['高兴', '快乐', '愉快', '开森', '喜悦']],
                ['兴奋', ['激动', '亢奋', '振奋', '热血']],
                ['心动', ['甜蜜', '心跳', '怦然', '喜欢', '爱', '浪漫']],
                ['平静', ['淡定', '安静', '宁静', '安心', '放松', '平和']],
                ['伤心', ['难过', '委屈', '失落', '沮丧', '心酸', '哭']],
                ['生气', ['愤怒', '恼火', '火大', '气死', '暴躁']],
                ['烦躁', ['烦', '焦躁', '焦虑', '不耐烦']],
                ['心累', ['累', '疲惫', '疲倦', '倦', '撑不住']],
            ];

            for (let i = 0; i < aliasPairs.length; i++) {
                const target = aliasPairs[i][0];
                const aliases = aliasPairs[i][1] || [];
                for (let j = 0; j < aliases.length; j++) {
                    const a = String(aliases[j] || '').trim();
                    if (!a) continue;
                    if (compact.includes(a)) {
                        const hit = getMoodOptionByLabel(target);
                        if (hit) return hit;
                    }
                }
            }

            return null;
        }

        async function upsertRoleDiaryEntryByLabel(roleId, dateKey, moodLabel, content, updatedAtTs) {
            const rid = String(roleId || '').trim();
            const dk = String(dateKey || '').trim();
            const text = String(content || '').trim();
            if (!rid || !dk || !text) return false;
            let opt = normalizeDiaryMoodByLabel(moodLabel);
            if (!opt) {
                opt = normalizeDiaryMoodByLabel(text);
            }
            if (!opt) {
                opt = getMoodOptionByLabel('平静');
            }
            if (!opt) return false;
            const ts = Number(updatedAtTs);
            const finalTs = Number.isFinite(ts) && ts > 0 ? ts : Date.now();
            state.mood.roleEntries[dk] = {
                id: opt.id,
                mood: opt.id,
                label: opt.label,
                icon: opt.icon,
                text: text,
                content: text,
                images: [],
                date: dk,
                updatedAt: finalTs,
            };
            await saveRoleMoodState();
            return true;
        }

        async function generateTodayRoleDiaryEntry(roleId, historyForApi, shortTermMemory, nowTs) {
            roleDiarySyncInFlight = true;
            roleDiarySyncToastMessage = buildRoleDiaryGeneratingToastText();
            setGlobalCharacterReplying(true, roleDiarySyncToastMessage);
            const todayKey = toDateKey(new Date(nowTs));
            const todayChatContext = buildTodayChatMemoryContext(roleId, todayKey, 18);
            const todayTimingPrompt = todayChatContext.hasChat
                ? `今天的日期是 ${todayKey}。你今天和我有聊天记录，日记内容必须优先围绕今天的聊天、今天的情绪余温和当下关系状态展开。\n【今日聊天记录（带日期时间）】\n${todayChatContext.text}\n\n请把上面这些 ${todayKey} 的聊天当作今天刚发生的事情来参考，不要把更早之前的旧聊天伪装成今天发生。`
                : `今天的日期是 ${todayKey}。你今天没有和我聊天。\n今天这篇日记请更像你在记录自己的生活、状态、见闻或日常感受，不要硬提几天前的旧聊天，也不要把旧对话写成今天刚发生。`;
            const promptA =
                `你现在是我的伴侣，请根据你的人设，写一篇今天当下的【心情日记】。\n` +
                `${todayTimingPrompt}\n\n` +
                `【带日期的近期聊天参考】\n${shortTermMemory || '（暂无近期聊天记录）'}\n\n` +
                `写作要求：\n` +
                `如果今天有聊天，优先结合今天的聊天内容来选择一个符合当前情境的【心情词】；如果今天没有聊天，就根据你今天自己的生活状态来选择。\n` +
                `心情词必须和今天这一天的状态匹配，不能因为旧聊天记录而写偏时间线。\n` +
                `心情词只能从以下列表中选择一个：开心、兴奋、心动、平静、伤心、生气、烦躁、心累。\n` +
                `写一段日记，要符合你选择的心情。如果今天有聊天，可以自然提及今天聊了什么；如果今天没有聊天，就以分享自己生活为主，自然一点，必须符合人设！\n` +
                `字数严格控制在 100 字以内。\n` +
                `必须输出 JSON 格式：{ "mood": "心情词", "content": "日记内容" }\n` +
                `输出要求：只输出 JSON，不要输出代码块，不要输出解释文字，不要输出任何多余字符。`;

            try {
                let text = await callRoleDiaryLLM(roleId, historyForApi, promptA);
                let obj = extractJsonObject(text);
                let mood = obj && typeof obj === 'object' && typeof obj.mood === 'string' ? obj.mood.trim() : '';
                let content = obj && typeof obj === 'object' && typeof obj.content === 'string' ? obj.content.trim() : '';
                if (!content && isDevModeUnlocked()) {
                    appendDevAiParseFailureLog({ scene: 'couple_space_diary_A', roleId: roleId, reason: 'parse_failed_or_empty_content', prompt: promptA, rawText: String(text || '') });
                    const retry = confirm('心情日记解析失败（未得到 JSON content）。是否重试一次？');
                    if (retry) {
                        text = await callRoleDiaryLLM(roleId, historyForApi, promptA + '\n再次强调：只输出 JSON。');
                        obj = extractJsonObject(text);
                        mood = obj && typeof obj === 'object' && typeof obj.mood === 'string' ? obj.mood.trim() : mood;
                        content = obj && typeof obj === 'object' && typeof obj.content === 'string' ? obj.content.trim() : '';
                        if (!content) {
                            appendDevAiParseFailureLog({ scene: 'couple_space_diary_A', roleId: roleId, reason: 'retry_parse_failed_or_empty_content', prompt: promptA, rawText: String(text || '') });
                        }
                    }
                }
                if (!content) {
                    content = normalizeAiReplyText(text);
                }
                if (!content) return false;
                await upsertRoleDiaryEntryByLabel(roleId, toDateKey(new Date(nowTs)), mood, content, nowTs);
                if (state.activeTab === 'mood') renderMoodPage();
                return true;
            } catch (e) {
                const pw = getParentWindow();
                const msg = e && e.message ? String(e.message) : String(e || '生成失败');
                if (pw && typeof pw.showCenterToast === 'function') pw.showCenterToast(msg);
                throw e;
            } finally {
                roleDiarySyncInFlight = false;
                roleDiarySyncToastMessage = '';
                setGlobalCharacterReplying(false, '');
            }
        }

        async function generateCatchupRoleDiaryEntries(roleId, historyForApi, shortTermMemory, rawDiffDays, nowTs) {
            const cap = Math.max(1, Math.min(7, rawDiffDays));
            const dateKeys = buildDateKeysForCatchUp(nowTs, cap);
            const chatStats = dateKeys.map((dk) => {
                return { date: dk, chatCount: countChatsForDate(roleId, dk) };
            });
            const todayKey = toDateKey(new Date(nowTs));
            const todayChatContext = buildTodayChatMemoryContext(roleId, todayKey, 18);
            const todayDiaryRule = todayChatContext.hasChat
                ? `今天（${todayKey}）和我有聊天记录，所以今天这篇日记必须优先围绕今天的聊天氛围、今天的互动感和今天的情绪变化来写。\n【今天聊天记录（带日期时间）】\n${todayChatContext.text}`
                : `今天（${todayKey}）没有和我聊天，所以今天这篇日记要更像你自己的生活分享或心情记录，不要硬提几天前的聊天，也不要把旧对话写成今天刚发生。`;

            const promptB =
                `你现在是我的伴侣，请根据你的人设，批量补写过去几天以及今天的【心情日记】。\n` +
                `当前情况： 我有 ${cap} 天没有回到『情侣空间』这个秘密基地了，现在终于回来了。\n` +
                `请严格参考以下这几天的微信互动状态： ${JSON.stringify(chatStats)}\n` +
                `${todayDiaryRule}\n\n` +
                `【带日期的近期聊天参考】\n${shortTermMemory || '（暂无近期聊天记录）'}\n\n` +
                `写作要求：\n\n` +
                `如果某天 chatCount > 0（我们在微信聊天了），日记要表现出聊天的日常感，不要说完全失联；如果 chatCount == 0，才可以表现出没收到消息的想念或孤独。\n` +
                `今天的日记，必须表达出看到我回到空间的喜悦。如果今天有聊天，优先结合今天的聊天内容；如果今天没有聊天，就以你自己的生活和状态为主，不要把旧聊天误写成今天发生。\n` +
                `所有日期都要遵守时间线，看到带日期的旧聊天时，不要把它们写成今天刚发生。\n` +
                `每天的日记字数严格控制在 100 字以内，并选择一个【心情词】。\n` +
                `心情词只能从以下列表中选择一个：开心、兴奋、心动、平静、伤心、生气、烦躁、心累。\n` +
                `必须输出 JSON 格式的数组：\n` +
                `{ "diaries": [ { "date": "YYYY-MM-DD", "mood": "心情词", "content": "日记内容" } ] }\n` +
                `输出要求：只输出 JSON，不要输出代码块，不要输出解释文字，不要输出任何多余字符。`;

            roleDiarySyncInFlight = true;
            roleDiarySyncToastMessage = buildRoleDiaryGeneratingToastText();
            setGlobalCharacterReplying(true, roleDiarySyncToastMessage);
            try {
                let text = await callRoleDiaryLLM(roleId, historyForApi, promptB);
                let obj = extractJsonObject(text);
                let diaries = obj && typeof obj === 'object' && Array.isArray(obj.diaries) ? obj.diaries : [];
                if (!diaries.length && isDevModeUnlocked()) {
                    appendDevAiParseFailureLog({ scene: 'couple_space_diary_B', roleId: roleId, reason: 'parse_failed_or_empty_diaries', prompt: promptB, rawText: String(text || '') });
                    const retry = confirm('批量心情日记解析失败（未得到 diaries）。是否重试一次？');
                    if (retry) {
                        text = await callRoleDiaryLLM(roleId, historyForApi, promptB + '\n再次强调：只输出 JSON。');
                        obj = extractJsonObject(text);
                        diaries = obj && typeof obj === 'object' && Array.isArray(obj.diaries) ? obj.diaries : [];
                        if (!diaries.length) {
                            appendDevAiParseFailureLog({ scene: 'couple_space_diary_B', roleId: roleId, reason: 'retry_parse_failed_or_empty_diaries', prompt: promptB, rawText: String(text || '') });
                        }
                    }
                }
                if (!diaries.length) return false;

                for (let i = 0; i < diaries.length; i++) {
                    const item = diaries[i] && typeof diaries[i] === 'object' ? diaries[i] : null;
                    if (!item) continue;
                    const date = String(item.date || '').trim();
                    const mood = String(item.mood || '').trim();
                    const content = String(item.content || '').trim();
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
                    if (!content) continue;
                    const dt = new Date(`${date}T21:00:00`);
                    const ts = Number.isNaN(dt.getTime()) ? Date.now() : dt.getTime();
                    await upsertRoleDiaryEntryByLabel(roleId, date, mood, content, ts);
                }

                if (state.activeTab === 'mood') renderMoodPage();
                return true;
            } catch (e) {
                const pw = getParentWindow();
                const msg = e && e.message ? String(e.message) : String(e || '生成失败');
                if (pw && typeof pw.showCenterToast === 'function') pw.showCenterToast(msg);
                throw e;
            } finally {
                roleDiarySyncInFlight = false;
                roleDiarySyncToastMessage = '';
                setGlobalCharacterReplying(false, '');
            }
        }

        async function requestRoleDiaryForTodayFromCalendar() {
            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) {
                showCoupleSpaceInfo('尚未绑定情侣角色');
                return;
            }
            if (roleDiarySyncInFlight) {
                showCoupleSpaceInfo('角色正在写日记中，请稍候');
                return;
            }
            const roleId = String(link.roleId || '').trim();
            const todayKey = toDateKey(new Date());
            const existingTodayRoleEntry = normalizeMoodEntry(state.mood.roleEntries[todayKey]);
            const existingTodayRoleText = existingTodayRoleEntry
                ? String(existingTodayRoleEntry.text || existingTodayRoleEntry.content || '').trim()
                : '';
            if (existingTodayRoleText) {
                showCoupleSpaceInfo('今天的角色心情日记已经写过啦');
                return;
            }

            openRoleDiaryConfirmModal(async function () {
                try {
                    const history = readWechatChatHistory(roleId);
                    const clean = cleanChatHistoryForMemory(history);
                    const historyForApi = buildHistoryForApi(roleId, clean);
                    const shortTermMemory = buildShortTermMemoryText(clean, parseInt(localStorage.getItem('chat_memory_limit')) || 30);
                    await generateTodayRoleDiaryEntry(roleId, historyForApi, shortTermMemory, Date.now());
                } catch (err) {
                    showAiError(err);
                }
            });
        }

        async function maybeGenerateRoleDiariesOnEnter() {
            if (!isAutoRoleMoodDiaryEnabled()) return;
            const link = getCoupleLinkState();
            if (!link.hasCoupleLinked || !link.roleId) return;
            const roleId = String(link.roleId || '').trim();
            if (!roleId) return;

            const nowTs = Date.now();
            const lastExitTs = readLastExitTime(roleId);
            if (!lastExitTs || lastExitTs > nowTs) return;

            const todayKey = toDateKey(new Date(nowTs));
            const existingTodayRoleEntry = normalizeMoodEntry(state.mood.roleEntries[todayKey]);
            const existingTodayRoleText = existingTodayRoleEntry
                ? String(existingTodayRoleEntry.text || existingTodayRoleEntry.content || '').trim()
                : '';
            if (existingTodayRoleText) return;

            const lockNow = Date.now();
            try {
                const lockKey = buildCoupleSpaceRoleKey(COUPLE_SPACE_DIARY_SYNC_LOCK_KEY, roleId);
                const lockRaw =
                    (lockKey ? localStorage.getItem(lockKey) : '') ||
                    localStorage.getItem(COUPLE_SPACE_DIARY_SYNC_LOCK_KEY);
                const lock = lockRaw ? safeJsonParse(lockRaw, null) : null;
                if (lock && typeof lock === 'object' && String(lock.roleId || '') === roleId) {
                    const until = Number(lock.until);
                    if (Number.isFinite(until) && until > lockNow) return;
                }
                if (lockKey) {
                    localStorage.setItem(lockKey, JSON.stringify({ roleId, until: lockNow + 90 * 1000 }));
                    try { localStorage.removeItem(COUPLE_SPACE_DIARY_SYNC_LOCK_KEY); } catch (e2) { }
                } else {
                    localStorage.setItem(COUPLE_SPACE_DIARY_SYNC_LOCK_KEY, JSON.stringify({ roleId, until: lockNow + 90 * 1000 }));
                }
            } catch (e) { }

            const sameDay = isSameDay(new Date(lastExitTs), new Date(nowTs));
            const diffMs = nowTs - lastExitTs;
            const cross18 = crossedHourSameDay(lastExitTs, nowTs, 18);
            const triggerA = sameDay && (diffMs > 3 * 60 * 60 * 1000 || cross18);
            const rawDiffDays = !sameDay ? diffDaysInclusive(lastExitTs, nowTs) : 0;
            const triggerB = !sameDay && rawDiffDays > 0;

            if (!triggerA && !triggerB) return;

            const history = readWechatChatHistory(roleId);
            const clean = cleanChatHistoryForMemory(history);
            const historyForApi = buildHistoryForApi(roleId, clean);
            const shortTermMemory = buildShortTermMemoryText(clean, parseInt(localStorage.getItem('chat_memory_limit')) || 30);

            if (triggerA) {
                await generateTodayRoleDiaryEntry(roleId, historyForApi, shortTermMemory, nowTs);
                return;
            }
            await generateCatchupRoleDiaryEntries(roleId, historyForApi, shortTermMemory, rawDiffDays, nowTs);
        }

        async function handleCoupleSpaceAppEnter(source) {
            const now = Date.now();
            if (coupleSpaceEnterTask) return coupleSpaceEnterTask;
            if (now - coupleSpaceLastEnterAt < 1200) return;
            coupleSpaceLastEnterAt = now;
            coupleSpaceAppVisible = true;
            coupleSpaceEnterTask = (async () => {
                if (roleDiarySyncInFlight && roleDiarySyncToastMessage) {
                    setGlobalCharacterReplying(true, roleDiarySyncToastMessage);
                }
                updateStatsUI();
                await refreshRoleMissCountOnAppEnter();
                await loadRoleMoodState();
                if (state.activeTab === 'mood') renderMoodPage();
                await maybeGenerateRoleDiariesOnEnter();
                return String(source || '').trim() || 'unknown';
            })();
            try {
                return await coupleSpaceEnterTask;
            } finally {
                coupleSpaceEnterTask = null;
            }
        }

        async function initAnniversary() {
            const savedIso = await readAnniversaryIso();
            const iso = savedIso || DEFAULT_ANNIVERSARY_ISO;
            const parsed = parseIsoDate(iso);
            if (parsed) anniversaryStartDate = parsed;
            updateAnniversaryUI();
        }

        function bindEvents() {
            const bgInput = document.getElementById('bg-input');
            bgInput.addEventListener('change', (e) => handleFileSelect(e, 'header-bg-img', 'couple_bg'));

            const link = getCoupleLinkState();
            if (!link.hasCoupleLinked) {
                const avatarUserInput = document.getElementById('avatar-user-input');
                avatarUserInput.addEventListener('change', (e) => handleFileSelect(e, 'avatar-user', 'couple_avatar_user'));
                
                const avatarRoleInput = document.getElementById('avatar-role-input');
                avatarRoleInput.addEventListener('change', (e) => handleFileSelect(e, 'avatar-role', 'couple_avatar_role'));
            }

            const missBtn = document.getElementById('miss-btn');
            missBtn.addEventListener('click', handleMissClick);

            const annLabel = document.getElementById('anniversary-label');
            const annInput = document.getElementById('anniversary-input');
            if (annLabel && annInput) {
                annLabel.addEventListener('click', () => openAnniversaryPicker());
                annLabel.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openAnniversaryPicker();
                    }
                });
                annInput.addEventListener('change', async () => {
                    const iso = String(annInput.value || '').trim();
                    const parsed = parseIsoDate(iso);
                    if (!parsed) return;
                    anniversaryStartDate = parsed;
                    await persistAnniversaryIso(iso);
                    updateAnniversaryUI();
                });
            }

            document.querySelectorAll('.dock-item[data-tab]').forEach((el) => {
                el.addEventListener('click', () => {
                    const tab = el.getAttribute('data-tab');
                    setActiveTab(tab);
                });
            });
            const center = document.querySelector('.dock-item-center[data-tab]');
            if (center) {
                center.addEventListener('click', () => {
                    const tab = center.getAttribute('data-tab');
                    setActiveTab(tab);
                });
            }

            const heartBtn = document.querySelector('#heart-btn') || document.querySelector('.heart-button') || document.querySelector('.dock-item-center');
            const secretModal = document.getElementById('secret-space-modal');

            function openSecretSpace() {
                if (!secretModal) return;
                secretModal.hidden = false;
                requestAnimationFrame(() => {
                    secretModal.classList.add('is-open');
                });
                try {
                    if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.bindInputEvents === 'function') {
                        window.secretSpaceTimeline.bindInputEvents();
                    }
                    if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.loadForageCache === 'function') {
                        window.secretSpaceTimeline.loadForageCache().then(() => {
                            try {
                                if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.render === 'function') {
                                    window.secretSpaceTimeline.render();
                                }
                            } catch (e2) { }
                        });
                    }
                    if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.render === 'function') {
                        window.secretSpaceTimeline.render();
                    }
                } catch (e) { }
                window.setTimeout(() => {
                    const input = document.getElementById('secret-space-input');
                    if (input && typeof input.focus === 'function') input.focus();
                }, 260);
            }

            function closeSecretSpace() {
                if (!secretModal || secretModal.hidden) return;
                secretModal.classList.remove('is-open');
                window.setTimeout(() => {
                    secretModal.hidden = true;
                }, 260);
            }

            if (heartBtn) {
                heartBtn.addEventListener('click', () => {
                    openSecretSpace();
                });
            }

            if (secretModal) {
                secretModal.addEventListener('click', (e) => {
                    const closeBtn = e.target && e.target.closest ? e.target.closest('[data-action="close-secret"]') : null;
                    if (closeBtn) {
                        closeSecretSpace();
                        return;
                    }
                    const sendBtn = e.target && e.target.closest ? e.target.closest('[data-action="send-secret"]') : null;
                    if (sendBtn) {
                        const input = document.getElementById('secret-space-input');
                        if (!input) return;
                        if (window.secretSpaceTimeline && typeof window.secretSpaceTimeline.sendMessage === 'function') {
                            const ok = window.secretSpaceTimeline.sendMessage(input.value);
                            if (ok) input.value = '';
                        }
                        return;
                    }
                    const recvBtn = e.target && e.target.closest ? e.target.closest('[data-action="receive-secret"]') : null;
                    if (recvBtn) {
                        const input = document.getElementById('secret-space-input');
                        if (input && typeof input.focus === 'function') input.focus();
                        return;
                    }
                });
            }

            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape') return;
                closeSecretSpace();
            });

            const moodCalendar = document.getElementById('mood-calendar');
            moodCalendar.addEventListener('click', (e) => {
                const toggle = e.target.closest('[data-action="toggle-view"]');
                if (toggle) {
                    e.stopPropagation();
                    state.mood.isGridView = !state.mood.isGridView;
                    renderMoodPage();
                    return;
                }
                const promptRoleDiaryBtn = e.target.closest('[data-action="prompt-role-diary"]');
                if (promptRoleDiaryBtn) {
                    e.stopPropagation();
                    requestRoleDiaryForTodayFromCalendar();
                    return;
                }
                const navArrow = e.target.closest('[data-action="week-prev"], [data-action="week-next"], [data-action="month-prev"], [data-action="month-next"]');
                if (navArrow) {
                    e.stopPropagation();
                    const act = String(navArrow.getAttribute('data-action') || '').trim();
                    const selected = dateFromKey(state.mood.selectedDateKey);
                    if (act === 'week-prev') {
                        const newDate = addDays(selected, -7);
                        state.mood.selectedDateKey = toDateKey(newDate);
                        renderMoodPage();
                        return;
                    }
                    if (act === 'week-next') {
                        const newDate = addDays(selected, 7);
                        state.mood.selectedDateKey = toDateKey(newDate);
                        renderMoodPage();
                        return;
                    }
                    if (act === 'month-prev' || act === 'month-next') {
                        const delta = act === 'month-prev' ? -1 : 1;
                        const year = selected.getFullYear();
                        const month = selected.getMonth() + delta;
                        const newDate = new Date(year, month, 1);
                        state.mood.selectedDateKey = toDateKey(newDate);
                        renderMoodPage();
                        return;
                    }
                }
                const openBtn = e.target.closest('[data-action="open-mood"]');
                if (openBtn) {
                    e.stopPropagation();
                    const dateKey = openBtn.getAttribute('data-date-key');
                    const existingEntry = normalizeMoodEntry(state.mood.entries[dateKey]);
                    if (existingEntry) {
                        const pw = getParentWindow();
                        const msg = '这一天已经写过心情日记啦';
                        if (pw && typeof pw.showCenterToast === 'function') {
                            pw.showCenterToast(msg);
                        } else if (pw && pw.GlobalModal && typeof pw.GlobalModal.showInfo === 'function') {
                            pw.GlobalModal.showInfo(msg);
                        } else {
                            alert(msg);
                        }
                        return;
                    }
                    if (isFutureDateKey(dateKey)) {
                        alert('暂不支持未来心情的记录');
                        return;
                    }
                    openMoodModal(dateKey);
                    return;
                }
                const day = e.target.closest('.mood-day');
                if (day && day.getAttribute('data-date-key')) {
                    const dateKey = day.getAttribute('data-date-key');
                    if (state.mood.isGridView) {
                        handleMonthGridDayClick(dateKey);
                        return;
                    }
                    state.mood.selectedDateKey = dateKey;
                    renderMoodPage();
                }
            });

            const mask = document.getElementById('mood-modal-mask');
            mask.addEventListener('click', () => closeMoodModal());

            const coupleMask = document.getElementById('couple-menu-mask');
            if (coupleMask) {
                coupleMask.addEventListener('click', function () {
                    closeCoupleMoreMenu();
                });
            }
            const coupleContent = document.getElementById('couple-menu-content');
            if (coupleContent) {
                coupleContent.addEventListener('click', async function (e) {
                    const btn = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
                    if (!btn) return;
                    const act = String(btn.getAttribute('data-action') || '');
                    if (act === 'close') {
                        closeCoupleMoreMenu();
                        return;
                    }
                    if (act === 'unlink') {
                        coupleMenuState.step = 'confirmClear';
                        renderCoupleMenuModal();
                        return;
                    }
                    if (act === 'confirm-clear') {
                        coupleMenuState.step = 'notify';
                        renderCoupleMenuModal();
                        return;
                    }
                    if (act === 'unlink-notify') {
                        closeCoupleMoreMenu();
                        await unlinkCoupleSpace(true);
                        goBack();
                        return;
                    }
                    if (act === 'unlink-no-notify') {
                        closeCoupleMoreMenu();
                        await unlinkCoupleSpace(false);
                        goBack();
                        return;
                    }
                });
            }

            document.getElementById('mood-modal-content').addEventListener('click', (e) => {
                const imageBtn = e.target.closest('[data-action="open-image-picker"]');
                if (imageBtn) {
                    const input = document.getElementById('diary-image-input');
                    if (input) input.click();
                    return;
                }
                const pickBtn = e.target.closest('[data-action="pick-mood"]');
                if (pickBtn) {
                    const id = pickBtn.getAttribute('data-id');
                    const label = pickBtn.getAttribute('data-label');
                    const icon = pickBtn.getAttribute('data-icon');
                    state.mood.pickedMood = { id, label, icon };
                    state.mood.modalStep = 'diary';
                    renderMoodModal();
                    return;
                }
                const saveBtn = e.target.closest('[data-action="save-diary"]');
                if (saveBtn) {
                    saveDiaryEntry();
                }
            });

            const diaryNoteContainer = document.getElementById('diary-note-container');
            if (diaryNoteContainer) {
                diaryNoteContainer.addEventListener('click', handleDiaryNoteContainerClick);
                diaryNoteContainer.addEventListener('touchstart', startDiaryNoteLongPress, { passive: true });
                diaryNoteContainer.addEventListener('touchend', cancelDiaryNoteLongPress, { passive: true });
                diaryNoteContainer.addEventListener('touchcancel', cancelDiaryNoteLongPress, { passive: true });
                diaryNoteContainer.addEventListener('touchmove', cancelDiaryNoteLongPress, { passive: true });
                diaryNoteContainer.addEventListener('mousedown', (e) => {
                    if (e && e.button !== 0) return;
                    startDiaryNoteLongPress(e);
                });
                diaryNoteContainer.addEventListener('mouseup', cancelDiaryNoteLongPress);
                diaryNoteContainer.addEventListener('mouseleave', cancelDiaryNoteLongPress);
            }

            document.addEventListener('input', (e) => {
                if (e.target && e.target.id === 'diary-textarea') {
                    state.mood.diaryDraft = e.target.value;
                    updateDiarySaveButtonState();
                }
            });

            const diaryImageInput = document.getElementById('diary-image-input');
            if (diaryImageInput) {
                diaryImageInput.addEventListener('change', handleDiaryImagesSelected);
            }

            const diaryEditMask = document.getElementById('diary-edit-mask');
            if (diaryEditMask) {
                diaryEditMask.addEventListener('click', () => {
                    closeDiaryEditConfirmModal();
                });
            }
            const diaryEditModal = document.getElementById('diary-edit-modal');
            if (diaryEditModal) {
                diaryEditModal.addEventListener('click', (e) => {
                    const btn = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
                    if (!btn) return;
                    const act = String(btn.getAttribute('data-action') || '');
                    if (act === 'cancel-edit-diary') {
                        closeDiaryEditConfirmModal();
                        return;
                    }
                    if (act === 'confirm-edit-diary') {
                        const key = String(diaryEditPendingDateKey || '').trim();
                        closeDiaryEditConfirmModal();
                        if (key) {
                            enterDiaryEditModeForDate(key);
                        }
                    }
                });
            }
        }

        async function handleMissClick(e) {
            state.missCountUser++;
            updateStatsUI();
            await syncRoleMissCountAfterUserClick();
            await saveState();
            
            const btn = document.getElementById('miss-btn');
            const ripple = document.createElement('div');
            ripple.classList.add('ripple');
            btn.appendChild(ripple);
            setTimeout(() => { ripple.remove(); }, 600);
            if (navigator.vibrate) navigator.vibrate(50);
        }

        async function loadState() {
            const todayStr = new Date().toDateString();
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            const saved = await coupleSpaceGetRoleItem('couple_space_data', rid);

            let parsed = null;
            if (saved && typeof saved === 'object') {
                parsed = saved;
            } else if (typeof saved === 'string' && saved) {
                parsed = safeJsonParse(saved, null);
            }

            if (parsed && typeof parsed === 'object') {
                if (String(parsed.date || '') === todayStr) {
                    const n = Number(parsed.count);
                    state.missCountUser = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
                    const roleN = Number(parsed.roleCount);
                    state.missCountRole = Number.isFinite(roleN) && roleN >= 0 ? Math.floor(roleN) : 0;
                    const roleTargetN = Number(parsed.roleCountTarget);
                    roleMissCountTarget = Number.isFinite(roleTargetN) && roleTargetN >= 0
                        ? Math.floor(roleTargetN)
                        : state.missCountRole;
                } else {
                    state.missCountUser = 0;
                    state.missCountRole = 0;
                    roleMissCountTarget = 0;
                }
            }

            updateStatsUI();

            await loadImage('couple_bg', 'header-bg-img');
            await loadImage('couple_avatar_user', 'avatar-user');
            await loadImage('couple_avatar_role', 'avatar-role');
        }

        async function saveState() {
            const todayStr = new Date().toDateString();
            const dataToSave = {
                date: todayStr,
                count: state.missCountUser,
                roleCount: Math.max(0, Math.floor(Number(state.missCountRole || 0))),
                roleCountTarget: Math.max(0, Math.floor(Number(roleMissCountTarget || state.missCountRole || 0))),
            };
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            await coupleSpaceSetRoleItem('couple_space_data', rid, dataToSave);
        }

        function updateStatsUI() {
            const userName = getCoupleSpaceUserName();
            const roleName = getRoleDisplayName();
            const userPrefix = document.getElementById('miss-user-prefix');
            const rolePrefix = document.getElementById('miss-role-prefix');
            const userCountEl = document.getElementById('miss-count-user');
            const roleCountEl = document.getElementById('miss-count-role');
            if (userPrefix) userPrefix.innerText = '今天' + userName + '想' + roleName;
            if (rolePrefix) rolePrefix.innerText = roleName + '想' + userName;
            if (userCountEl) userCountEl.innerText = state.missCountUser;
            if (roleCountEl) roleCountEl.innerText = state.missCountRole;
        }

        function setActiveTab(tab) {
            state.activeTab = tab || 'home';
            render();
        }

        function render() {
            renderDock();
            renderPages();
            if (state.activeTab === 'mood') {
                renderMoodPage();
            }
        }

        function renderDock() {
            document.querySelectorAll('.dock-item[data-tab]').forEach((el) => {
                el.classList.toggle('active', el.getAttribute('data-tab') === state.activeTab);
            });
        }

        function renderPages() {
            document.querySelectorAll('.page[data-page]').forEach((page) => {
                page.hidden = page.getAttribute('data-page') !== state.activeTab;
            });
        }

        function toDateKey(date) {
            const d = new Date(date);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }

        function dateFromKey(key) {
            const safe = String(key || '').trim();
            return new Date(`${safe}T00:00:00`);
        }

        function startOfToday() {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            return d;
        }

        function isSameDay(a, b) {
            return (
                a &&
                b &&
                a.getFullYear() === b.getFullYear() &&
                a.getMonth() === b.getMonth() &&
                a.getDate() === b.getDate()
            );
        }

        function isFutureDateKey(key) {
            const d = dateFromKey(key);
            const today = startOfToday();
            return d.getTime() > today.getTime();
        }

        function parseIsoDate(iso) {
            const safe = String(iso || '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(safe)) return null;
            const d = new Date(`${safe}T00:00:00`);
            if (Number.isNaN(d.getTime())) return null;
            return d;
        }

        async function readAnniversaryIso() {
            try {
                const link = getCoupleLinkState();
                const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
                const raw = await coupleSpaceGetRoleItem(ANNIVERSARY_STORAGE_KEY, rid);
                const safe = String(raw || '').trim();
                if (!safe) return '';
                return safe;
            } catch (e) {
                return '';
            }
        }

        async function persistAnniversaryIso(iso) {
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            await coupleSpaceSetRoleItem(ANNIVERSARY_STORAGE_KEY, rid, String(iso || '').trim());
        }

        function formatAnniversaryDot(date) {
            const d = new Date(date);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}.${m}.${day}`;
        }

        function computeDaysTogether(startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const today = startOfToday();
            const diff = today.getTime() - start.getTime();
            if (diff < 0) return 0;
            const dayMs = 1000 * 60 * 60 * 24;
            return Math.floor(diff / dayMs) + 1;
        }

        function updateAnniversaryUI() {
            const daysEl = document.getElementById('days-count');
            if (daysEl) daysEl.innerText = String(computeDaysTogether(anniversaryStartDate));

            const labelEl = document.getElementById('anniversary-label');
            if (labelEl) labelEl.innerText = `${formatAnniversaryDot(anniversaryStartDate)} 相遇`;

            const inputEl = document.getElementById('anniversary-input');
            if (inputEl) inputEl.value = toDateKey(anniversaryStartDate);
        }

        function openAnniversaryPicker() {
            const inputEl = document.getElementById('anniversary-input');
            if (!inputEl) return;
            inputEl.value = toDateKey(anniversaryStartDate);
            if (typeof inputEl.showPicker === 'function') {
                try {
                    inputEl.showPicker();
                    return;
                } catch (e) { }
            }
            inputEl.click();
        }

        function startOfWeek(date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const delta = d.getDay();
            d.setDate(d.getDate() - delta);
            return d;
        }

        function addDays(date, amount) {
            const d = new Date(date);
            d.setDate(d.getDate() + amount);
            return d;
        }

        function formatMonthDot(date) {
            const months = [
                'January',
                'February',
                'March',
                'April',
                'May',
                'June',
                'July',
                'August',
                'September',
                'October',
                'November',
                'December',
            ];
            return `${months[date.getMonth()]}.`;
        }

        function escapeHtml(str) {
            return String(str)
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#039;');
        }

        function handleBrokenMoodImage(imgEl, fallbackText) {
            if (!imgEl) return;
            const parent = imgEl.parentElement;
            if (!parent) return;
            imgEl.remove();
            const span = document.createElement('span');
            span.textContent = fallbackText || '+';
            parent.appendChild(span);
        }

        function updateDiarySaveButtonState() {
            const btn = document.querySelector('#mood-modal-content [data-action="save-diary"]');
            if (!btn) return;
            btn.disabled = String(state.mood.diaryDraft || '').trim().length === 0;
        }

        function handleDiaryImagesSelected(event) {
            const input = event.target;
            const files = Array.from(input.files || []);
            if (!files.length) return;
            const maxTotal = 9;
            if (!Array.isArray(state.mood.diaryImagesDraft)) {
                state.mood.diaryImagesDraft = [];
            }
            const remain = maxTotal - state.mood.diaryImagesDraft.length;
            if (remain <= 0) {
                input.value = '';
                return;
            }
            const slice = files.slice(0, remain);
            slice.forEach((file) => {
                if (!file || !file.type || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = function (e) {
                    const result = e.target && e.target.result ? String(e.target.result) : '';
                    if (!result) return;
                    if (!Array.isArray(state.mood.diaryImagesDraft)) {
                        state.mood.diaryImagesDraft = [];
                    }
                    if (state.mood.diaryImagesDraft.length >= maxTotal) return;
                    state.mood.diaryImagesDraft.push(result);
                };
                reader.readAsDataURL(file);
            });
            input.value = '';
        }

        function getMoodOptionById(id) {
            return MOOD_OPTIONS.find((m) => m.id === id) || null;
        }

        function getMoodOptionByLabel(label) {
            return MOOD_OPTIONS.find((m) => m.label === label) || null;
        }

        function normalizeMoodEntry(entry) {
            if (!entry || typeof entry !== 'object') return null;
            const next = { ...entry };

            if (!next.id && typeof next.mood === 'string' && next.mood) {
                next.id = next.mood;
            }

            if (!next.text && typeof next.content === 'string') {
                next.text = next.content;
            }
            if (!next.content && typeof next.text === 'string') {
                next.content = next.text;
            }

            if (next.id) {
                const opt = getMoodOptionById(next.id);
                if (opt) {
                    next.label = next.label || opt.label;
                    next.icon = next.icon || opt.icon;
                }
                if (!next.mood) {
                    next.mood = next.id;
                }
            } else if (next.label) {
                const opt = getMoodOptionByLabel(next.label);
                if (opt) {
                    next.id = opt.id;
                    next.icon = opt.icon;
                    next.label = opt.label;
                    if (!next.mood) {
                        next.mood = opt.id;
                    }
                }
            }

            if (!Array.isArray(next.images)) {
                next.images = [];
            }

            if (!Array.isArray(next.comments)) {
                next.comments = [];
            }

            return next;
        }

        function formatTime(ts) {
            const d = new Date(ts || Date.now());
            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }

        async function loadMoodState() {
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            const saved = await coupleSpaceGetRoleItem(MOOD_STORAGE_KEY, rid);
            if (!saved) return;
            try {
                const parsed = typeof saved === 'string' ? safeJsonParse(saved, null) : saved;
                if (parsed && typeof parsed === 'object') {
                    const rawEntries = parsed.entries || {};
                    const normalized = {};
                    Object.keys(rawEntries).forEach((key) => {
                        const next = normalizeMoodEntry(rawEntries[key]);
                        if (next) {
                            if (!next.date) next.date = key;
                            if (Array.isArray(next.images) && next.images.length > 9) {
                                next.images = next.images.slice(0, 9);
                            }
                            normalized[key] = next;
                        }
                    });
                    state.mood.entries = normalized;
                }
            } catch (e) { }
        }

        async function saveMoodState() {
            const payload = { entries: state.mood.entries };
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            await coupleSpaceSetRoleItem(MOOD_STORAGE_KEY, rid, payload);
        }

        async function loadRoleMoodState() {
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            if (!rid) return;
            const nsKey = buildCoupleSpaceRoleKey(ROLE_MOOD_STORAGE_KEY, rid);
            let saved = await coupleSpaceGetItem(nsKey);
            if (!saved) {
                const legacy = await coupleSpaceGetItem(ROLE_MOOD_STORAGE_KEY);
                if (legacy) {
                    const parsedLegacy = typeof legacy === 'string' ? safeJsonParse(legacy, null) : legacy;
                    const extracted = { entries: {} };
                    if (parsedLegacy && typeof parsedLegacy === 'object' && parsedLegacy.entries && typeof parsedLegacy.entries === 'object') {
                        Object.keys(parsedLegacy.entries).forEach((key) => {
                            let raw = parsedLegacy.entries[key];
                            if (raw && typeof raw === 'object' && raw[rid] && typeof raw[rid] === 'object') raw = raw[rid];
                            if (raw && typeof raw === 'object') extracted.entries[key] = raw;
                        });
                    }
                    if (Object.keys(extracted.entries).length) {
                        await coupleSpaceSetItem(nsKey, extracted);
                        saved = extracted;
                    }
                }
            }
            if (!saved) {
                try {
                    const wf = getWechatForage();
                    if (wf && typeof wf.getItem === 'function') {
                        const val = await wf.getItem(nsKey);
                        let toStore = val;
                        if (typeof val === 'string') {
                            const parsed = safeJsonParse(val, null);
                            if (parsed && typeof parsed === 'object') toStore = parsed;
                        }
                        if (toStore && typeof toStore === 'object') {
                            await coupleSpaceSetItem(nsKey, toStore);
                            saved = toStore;
                        }
                    }
                } catch (e0) { }
            }
            if (!saved) return;
            try {
                const parsed = typeof saved === 'string' ? safeJsonParse(saved, null) : saved;
                if (parsed && typeof parsed === 'object') {
                    const rawEntries =
                        parsed.entries && typeof parsed.entries === 'object'
                            ? parsed.entries
                            : Object.keys(parsed).some((k) => /^\d{4}-\d{2}-\d{2}$/.test(String(k)))
                                ? parsed
                                : {};
                    const normalized = {};
                    const cleanedRawEntries = {};
                    let needsRewrite = !(parsed.entries && typeof parsed.entries === 'object');
                    Object.keys(rawEntries).forEach((key) => {
                        let raw = rawEntries[key];
                        if (raw && typeof raw === 'object') {
                            const hasShape =
                                typeof raw.label === 'string' ||
                                typeof raw.id === 'string' ||
                                typeof raw.mood === 'string' ||
                                typeof raw.text === 'string' ||
                                typeof raw.content === 'string';
                            if (!hasShape && raw[rid] && typeof raw[rid] === 'object') {
                                raw = raw[rid];
                                needsRewrite = true;
                            }
                        }
                        if (raw && typeof raw === 'object') cleanedRawEntries[key] = raw;
                        const next = normalizeMoodEntry(raw);
                        if (next) {
                            if (!next.date) next.date = key;
                            if (Array.isArray(next.images) && next.images.length > 9) {
                                next.images = next.images.slice(0, 9);
                            }
                            normalized[key] = next;
                        }
                    });
                    state.mood.roleEntries = normalized;
                    if (needsRewrite) {
                        try {
                            await coupleSpaceSetItem(nsKey, { entries: cleanedRawEntries });
                        } catch (e2) { }
                    }
                }
            } catch (e) { }
        }

        async function saveRoleMoodState() {
            const payload = { entries: state.mood.roleEntries };
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            if (!rid) return;
            const nsKey = buildCoupleSpaceRoleKey(ROLE_MOOD_STORAGE_KEY, rid);
            await coupleSpaceSetItem(nsKey, payload);
        }

        window.__debugCoupleSpaceRoleDiaryStore = async function () {
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            const nsKey = buildCoupleSpaceRoleKey(ROLE_MOOD_STORAGE_KEY, rid);
            const out = { rid, nsKey, coupleSpace: {}, wechat: {} };
            try {
                out.coupleSpace.localStorage = localStorage.getItem(nsKey);
            } catch (e0) {
                out.coupleSpace.localStorage = null;
            }
            try {
                const forage = getCoupleSpaceForage();
                out.coupleSpace.hasForage = !!forage;
                out.coupleSpace.forageValue = forage ? await forage.getItem(nsKey) : null;
            } catch (e1) {
                out.coupleSpace.hasForage = false;
                out.coupleSpace.forageValue = null;
            }
            try {
                const wf = getWechatForage();
                out.wechat.hasForage = !!wf;
                out.wechat.forageValue = wf ? await wf.getItem(nsKey) : null;
            } catch (e2) {
                out.wechat.hasForage = false;
                out.wechat.forageValue = null;
            }
            try {
                const raw = out.coupleSpace.localStorage || out.coupleSpace.forageValue;
                const parsed = typeof raw === 'string' ? safeJsonParse(raw, null) : raw;
                const entries =
                    parsed && typeof parsed === 'object'
                        ? (parsed.entries && typeof parsed.entries === 'object'
                            ? parsed.entries
                            : parsed)
                        : {};
                out.summary = {
                    entryDates: Object.keys(entries || {}).slice(0, 50),
                    entryCount: Object.keys(entries || {}).length,
                };
            } catch (e3) { }
            return out;
        };
        try {
            const pw = window.parent && window.parent !== window ? window.parent : null;
            if (pw) pw.__debugCoupleSpaceRoleDiaryStore = window.__debugCoupleSpaceRoleDiaryStore;
        } catch (e) { }

        function loadAiMissCountForToday(roleId) {
            const rid = String(roleId || '').trim();
            if (!rid) return 0;
            const todayKey = toDateKey(new Date());
            try {
                const nsKey = buildCoupleSpaceRoleKey(AI_MISS_STORAGE_KEY, rid);
                let row = null;
                const raw = nsKey ? (localStorage.getItem(nsKey) || '') : '';
                row = raw ? safeJsonParse(raw, null) : null;
                if (!row || typeof row !== 'object') {
                    const legacyRaw = localStorage.getItem(AI_MISS_STORAGE_KEY) || '';
                    const legacy = legacyRaw ? safeJsonParse(legacyRaw, null) : null;
                    row = legacy && typeof legacy === 'object' ? legacy[rid] : null;
                    if (row && typeof row === 'object' && nsKey) {
                        try { localStorage.setItem(nsKey, JSON.stringify(row)); } catch (e0) { }
                    }
                }
                if (!row || typeof row !== 'object') return 0;
                const dateKey = String(row.dateKey || '');
                const count = Number(row.count);
                if (dateKey !== todayKey) return 0;
                return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
            } catch (e) {
                return 0;
            }
        }

        function renderMoodPage() {
            const calendarEl = document.getElementById('mood-calendar');
            const selectedKey = state.mood.selectedDateKey;
            const selectedDate = dateFromKey(selectedKey);
            const today = startOfToday();
            const metaText = `${formatMonthDot(selectedDate)}${selectedDate.getFullYear()}`;

            if (calendarEl) {
                if (state.mood.isGridView) {
                    calendarEl.classList.add('photo-mode');
                } else {
                    calendarEl.classList.remove('photo-mode');
                }
            }

            const bodyHtml = state.mood.isGridView
                ? buildMoodMonthGrid(selectedDate, today)
                : buildMoodWeekView(selectedKey, selectedDate, today);

            calendarEl.innerHTML = `
                <div class="mood-calendar-header">
                    <div class="mood-calendar-month" data-action="toggle-view">切换视图</div>
                    <div class="mood-calendar-meta" data-action="prompt-role-diary">${metaText}</div>
                </div>
                ${bodyHtml}
            `;

            renderDiaryNote();
        }

        function handleMonthGridDayClick(dateKey) {
            const key = String(dateKey || '').trim();
            if (!key) return;
            const now = Date.now();
            if (
                monthGridClickTimer &&
                monthGridLastDateKey === key &&
                now - monthGridLastClickTime < MONTH_GRID_CLICK_DELAY
            ) {
                clearTimeout(monthGridClickTimer);
                monthGridClickTimer = null;
                monthGridLastClickTime = 0;
                monthGridLastDateKey = '';
                handleMonthGridDoubleClick(key);
                return;
            }
            if (monthGridClickTimer) {
                clearTimeout(monthGridClickTimer);
                monthGridClickTimer = null;
            }
            monthGridLastDateKey = key;
            monthGridLastClickTime = now;
            monthGridClickTimer = setTimeout(() => {
                monthGridClickTimer = null;
                monthGridLastClickTime = 0;
                monthGridLastDateKey = '';
                handleMonthGridSingleClick(key);
            }, MONTH_GRID_CLICK_DELAY);
        }

        function handleMonthGridSingleClick(dateKey) {
            const key = String(dateKey || '').trim();
            if (!key) return;
            state.mood.selectedDateKey = key;
            renderMoodPage();
        }

        function handleMonthGridDoubleClick(dateKey) {
            const key = String(dateKey || '').trim();
            if (!key) return;
            if (isFutureDateKey(key)) {
                alert('暂不支持未来心情的记录');
                return;
            }
            const existingEntry = normalizeMoodEntry(state.mood.entries[key]);
            if (existingEntry) {
                const pw = getParentWindow();
                const msg = '这一天已经写过心情日记啦';
                if (pw && typeof pw.showCenterToast === 'function') {
                    pw.showCenterToast(msg);
                } else if (pw && pw.GlobalModal && typeof pw.GlobalModal.showInfo === 'function') {
                    pw.GlobalModal.showInfo(msg);
                } else {
                    alert(msg);
                }
                return;
            }
            openMoodModal(key);
        }

        function buildMoodWeekView(selectedKey, selectedDate, today) {
            const weekStart = startOfWeek(selectedDate);
            const weekDates = Array.from({ length: 7 }, (_, idx) => addDays(weekStart, idx));
            const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const navHtml = `
                <div class="mood-nav-row">
                    <button class="mood-nav-arrow" type="button" data-action="week-prev">◀</button>
                    <div class="mood-nav-spacer"></div>
                    <button class="mood-nav-arrow" type="button" data-action="week-next">▶</button>
                </div>
            `;

            const daysHtml = weekDates
                .map((d, idx) => {
                    const key = toDateKey(d);
                    const isSelected = key === selectedKey;
                    const isToday = isSameDay(d, today);
                    const entry = normalizeMoodEntry(state.mood.entries[key]);
                    const roleEntry = normalizeMoodEntry(state.mood.roleEntries[key]);
                    const userSlotClass = entry ? 'filled' : 'plus';
                    const userSlotInner = entry
                        ? (entry.icon
                            ? `<img class="mood-slot-img" src="${escapeHtml(entry.icon)}" alt="${escapeHtml(entry.label || '')}" onerror="handleBrokenMoodImage(this, '${escapeHtml((entry.label || '').slice(0, 1))}')">`
                            : escapeHtml(entry.emoji || ''))
                        : '+';
                    const roleSlotClass = roleEntry ? 'filled' : '';
                    const roleSlotInner = roleEntry
                        ? (roleEntry.icon
                            ? `<img class="mood-slot-img" src="${escapeHtml(roleEntry.icon)}" alt="${escapeHtml(roleEntry.label || '')}" onerror="handleBrokenMoodImage(this, '${escapeHtml((roleEntry.label || '').slice(0, 1))}')">`
                            : escapeHtml(roleEntry.emoji || ''))
                        : '';
                    return `
                        <div class="mood-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" data-date-key="${key}">
                            <div class="mood-weekday">${weekLabels[idx]}</div>
                            <div class="mood-date">${d.getDate()}</div>
                            <div class="mood-slots">
                                <button class="mood-slot mood-slot-user ${userSlotClass}" type="button" data-action="open-mood" data-date-key="${key}">${userSlotInner}</button>
                                <div class="mood-slot mood-slot-role ${roleSlotClass}" aria-hidden="true">${roleSlotInner}</div>
                            </div>
                        </div>
                    `;
                })
                .join('');

            return `${navHtml}<div class="mood-week">${daysHtml}</div>`;
        }

        function buildMoodMonthGrid(selectedDate, today) {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const firstDay = new Date(year, month, 1);
            const firstWeekday = firstDay.getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

            const weekLabels = ['日', '一', '二', '三', '四', '五', '六'];
            const headerHtml = weekLabels
                .map((label, idx) => {
                    const leftArrow =
                        idx === 0
                            ? `<button class="mood-nav-arrow mood-month-arrow" type="button" data-action="month-prev">◀</button>`
                            : '';
                    const rightArrow =
                        idx === 6
                            ? `<button class="mood-nav-arrow mood-month-arrow" type="button" data-action="month-next">▶</button>`
                            : '';
                    return `<div class="mood-month-weekday mood-month-weekday-nav">${leftArrow}<span class="mood-month-weekday-text">${label}</span>${rightArrow}</div>`;
                })
                .join('');

            const cells = [];
            for (let i = 0; i < totalCells; i++) {
                const dayIndex = i - firstWeekday;
                const date = new Date(year, month, dayIndex + 1);
                const inCurrentMonth = date.getMonth() === month;
                const key = toDateKey(date);
                const isSelected = key === state.mood.selectedDateKey;
                const isToday = isSameDay(date, today);

                const entry = normalizeMoodEntry(state.mood.entries[key]);
                const roleEntry = normalizeMoodEntry(state.mood.roleEntries[key]);

                let hasImage = false;
                let hasEntryNoImage = false;
                let bgImage = '';

                const userImages = entry && Array.isArray(entry.images) ? entry.images.filter(Boolean) : [];
                const roleImages = roleEntry && Array.isArray(roleEntry.images) ? roleEntry.images.filter(Boolean) : [];

                if (userImages.length) {
                    hasImage = true;
                    bgImage = userImages[0];
                } else if (roleImages.length) {
                    hasImage = true;
                    bgImage = roleImages[0];
                } else if (entry || roleEntry) {
                    hasEntryNoImage = true;
                }

                const classes = ['mood-day'];
                if (isSelected) classes.push('selected');
                if (isToday) classes.push('today');
                if (hasImage) {
                    classes.push('has-image');
                } else if (hasEntryNoImage) {
                    classes.push('has-record');
                }
                if (!inCurrentMonth) classes.push('outside-month');

                const style = hasImage ? `style="background-image:url('${escapeHtml(bgImage)}');"` : '';

                cells.push(`
                    <div class="${classes.join(' ')}" data-date-key="${key}" ${style}>
                        <div class="mood-date-number">${date.getDate()}</div>
                    </div>
                `);
            }

            return `<div class="mood-month-grid">${headerHtml}${cells.join('')}</div>`;
        }

        function buildPencilIconSvg() {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"></path><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>';
        }

        function buildNoteImagesHtml(images) {
            const list = Array.isArray(images) ? images.filter((src) => typeof src === 'string' && src.trim()) : [];
            if (!list.length) return '';
            const count = Math.min(list.length, 9);
            let cols = 3;
            if (count === 1) cols = 1;
            else if (count === 2 || count === 4) cols = 2;
            const colsClass = cols === 1 ? 'cols-1' : cols === 2 ? 'cols-2' : 'cols-3';
            const itemsHtml = list.slice(0, 9).map((src, idx) => {
                return `
                    <div class="note-image-item">
                        <img src="${escapeHtml(src)}" alt="diary image ${idx + 1}">
                    </div>
                `;
            }).join('');
            return `<div class="note-images ${colsClass}">${itemsHtml}</div>`;
        }

        function buildDiaryCommentsHtml(entry, userName, roleName, owner, dateKey) {
            if (!entry || typeof entry !== 'object') {
                return '';
            }
            const comments = Array.isArray(entry.comments) ? entry.comments : [];
            const itemsHtml = comments
                .map((c) => {
                    if (!c || typeof c !== 'object') return '';
                    const senderRaw = String(c.sender || '').trim();
                    const displayName = senderRaw === 'character' ? roleName : userName;
                    const text = String(c.text || '').trim();
                    if (!text) return '';
                    const time = String(c.time || '').trim();
                    const nameHtml = `<span class="diary-comment-sender">${escapeHtml(displayName || '')}：</span>`;
                    const textHtml = `<span class="diary-comment-text">${escapeHtml(text)}</span>`;
                    const timeHtml = time ? `<span class="diary-comment-time">· ${escapeHtml(time)}</span>` : '';
                    return `<div class="diary-comment-item">${nameHtml}${textHtml}${timeHtml}</div>`;
                })
                .filter(Boolean)
                .join('');
            const listHtml = `<div class="diary-comment-list">${itemsHtml}</div>`;
            const placeholder = owner === 'character' ? '对TA说点什么...' : '写一句悄悄话...';
            const ownerAttr = escapeHtml(owner || '');
            const dateAttr = escapeHtml(dateKey || '');
            const inputHtml =
                '<div class="diary-comment-input-row">' +
                `<input class="diary-comment-input" type="text" maxlength="120" placeholder="${escapeHtml(placeholder)}" data-owner="${ownerAttr}" data-date-key="${dateAttr}">` +
                `<button class="diary-comment-submit" type="button" data-action="submit-comment" data-owner="${ownerAttr}" data-date-key="${dateAttr}" aria-label="发送评论">` +
                buildPencilIconSvg() +
                '</button>' +
                '</div>';
            return `<div class="diary-comments">${listHtml}${inputHtml}</div>`;
        }

        function renderDiaryNote() {
            const container = document.getElementById('diary-note-container');
            const entry = normalizeMoodEntry(state.mood.entries[state.mood.selectedDateKey]);
            const roleEntry = normalizeMoodEntry(state.mood.roleEntries[state.mood.selectedDateKey]);
            if (!entry && !roleEntry) {
                container.innerHTML = '';
                return;
            }
            const userNameEl = document.getElementById('name-user');
            const roleNameEl = document.getElementById('name-role');
            const userName = userNameEl ? String(userNameEl.textContent || '').trim() : '我';
            const roleName = roleNameEl ? String(roleNameEl.textContent || '').trim() : 'Ta';

            const blocks = [];
            if (entry) {
                const iconHtml = entry.icon
                    ? `<img class="note-mood-icon" src="${escapeHtml(entry.icon)}" alt="${escapeHtml(entry.label || '')}" onerror="handleBrokenMoodImage(this, '${escapeHtml((entry.label || '').slice(0, 1))}')">`
                    : '';
                const timeText = formatTime(entry.updatedAt);
                const imagesHtml = buildNoteImagesHtml(entry.images);
                const commentsHtml = buildDiaryCommentsHtml(entry, userName, roleName, 'user', entry.date || state.mood.selectedDateKey);
                blocks.push(`
                    <div class="diary-note-card" data-owner="user" data-date-key="${escapeHtml(entry.date || state.mood.selectedDateKey)}">
                        <div class="note-header">
                            <div class="note-left">
                                ${iconHtml}
                                <div class="note-mood-label">${escapeHtml(entry.label || '')} · ${escapeHtml(userName || '我')}</div>
                            </div>
                            <div class="note-time">${escapeHtml(timeText)}</div>
                        </div>
                        <div class="note-content">${escapeHtml(entry.text || entry.content || '')}</div>
                        ${imagesHtml}
                        ${commentsHtml}
                    </div>
                `);
            }
            if (roleEntry) {
                const iconHtml = roleEntry.icon
                    ? `<img class="note-mood-icon" src="${escapeHtml(roleEntry.icon)}" alt="${escapeHtml(roleEntry.label || '')}" onerror="handleBrokenMoodImage(this, '${escapeHtml((roleEntry.label || '').slice(0, 1))}')">`
                    : '';
                const timeText = formatTime(roleEntry.updatedAt);
                const imagesHtml = buildNoteImagesHtml(roleEntry.images);
                const commentsHtml = buildDiaryCommentsHtml(roleEntry, userName, roleName, 'character', roleEntry.date || state.mood.selectedDateKey);
                blocks.push(`
                    <div class="diary-note-card" data-owner="character" data-date-key="${escapeHtml(roleEntry.date || state.mood.selectedDateKey)}">
                        <div class="note-header">
                            <div class="note-left">
                                ${iconHtml}
                                <div class="note-mood-label">${escapeHtml(roleEntry.label || '')} · ${escapeHtml(roleName || 'Ta')}</div>
                            </div>
                            <div class="note-time">${escapeHtml(timeText)}</div>
                        </div>
                        <div class="note-content">${escapeHtml(roleEntry.text || roleEntry.content || '')}</div>
                        ${imagesHtml}
                        ${commentsHtml}
                    </div>
                `);
            }
            container.innerHTML = blocks.join('');
        }

        function handleDiaryNoteContainerClick(e) {
            if (diaryNoteSuppressNextClick) {
                diaryNoteSuppressNextClick = false;
                return;
            }
            const btn = e.target && e.target.closest ? e.target.closest('[data-action="submit-comment"]') : null;
            if (btn) {
                const owner = String(btn.getAttribute('data-owner') || '').trim();
                const dateKey = String(btn.getAttribute('data-date-key') || '').trim();
                submitDiaryComment(dateKey, owner);
                return;
            }
            const inCommentRow = e.target && e.target.closest ? e.target.closest('.diary-comment-input-row') : null;
            if (inCommentRow) return;
            const card = e.target && e.target.closest ? e.target.closest('.diary-note-card[data-owner="user"]') : null;
            if (!card) return;
            const key = String(card.getAttribute('data-date-key') || state.mood.selectedDateKey || '').trim();
            if (!key) return;
            openDiaryEditConfirmModal(key);
        }

        async function deleteDiaryEntry(dateKey, owner) {
            const key = String(dateKey || '').trim();
            if (!key) return false;
            const ownerType = owner === 'character' ? 'character' : 'user';

            if (ownerType === 'user') {
                const entry = normalizeMoodEntry(state.mood.entries[key]);
                if (!entry) return false;
                delete state.mood.entries[key];
                await saveMoodState();
                if (state.activeTab === 'mood') renderMoodPage();
                return true;
            }

            const roleEntry = normalizeMoodEntry(state.mood.roleEntries[key]);
            if (!roleEntry) return false;
            delete state.mood.roleEntries[key];
            await saveRoleMoodState();
            if (state.activeTab === 'mood') renderMoodPage();
            return true;
        }

        function startDiaryNoteLongPress(e) {
            const container = document.getElementById('diary-note-container');
            if (!container) return;
            const target = e && e.target ? e.target : null;
            const card = target && target.closest ? target.closest('.diary-note-card[data-owner][data-date-key]') : null;
            if (!card) return;
            if (target && target.closest && target.closest('.diary-comment-input-row')) return;
            if (target && target.closest && target.closest('[data-action="submit-comment"]')) return;

            const owner = String(card.getAttribute('data-owner') || '').trim();
            const dateKey = String(card.getAttribute('data-date-key') || '').trim();
            if (!dateKey) return;

            diaryNoteLongPressActive = true;
            if (diaryNoteLongPressTimer) {
                clearTimeout(diaryNoteLongPressTimer);
                diaryNoteLongPressTimer = null;
            }
            diaryNoteLongPressTimer = setTimeout(async () => {
                diaryNoteLongPressTimer = null;
                if (!diaryNoteLongPressActive) return;
                diaryNoteSuppressNextClick = true;
                const confirmText = owner === 'character'
                    ? '要删除 Ta 的这篇心情日记吗？删除后，本地没有记录时才会在合适时机重新触发离线生成。'
                    : '要删除这一天的心情日记吗？删除后可以重新写。';
                const ok = confirm(confirmText);
                if (!ok) return;
                await deleteDiaryEntry(dateKey, owner);
            }, DIARY_NOTE_LONG_PRESS_MS);
        }

        function cancelDiaryNoteLongPress() {
            diaryNoteLongPressActive = false;
            if (diaryNoteLongPressTimer) {
                clearTimeout(diaryNoteLongPressTimer);
                diaryNoteLongPressTimer = null;
            }
        }

        async function submitDiaryComment(dateKey, owner) {
            const key = String(dateKey || state.mood.selectedDateKey || '').trim();
            const ownerType = owner === 'character' ? 'character' : 'user';
            const container = document.getElementById('diary-note-container');
            if (!container || !key) return;
            const input = container.querySelector(
                '.diary-comment-input[data-owner="' + ownerType + '"][data-date-key="' + key + '"]'
            );
            if (!input) return;
            const raw = input.value;
            const text = String(raw || '').trim();
            if (!text) {
                if (ownerType === 'user') {
                    requestManualCharacterReplyForUserDiary(key);
                }
                return;
            }
            input.value = '';
            const nowTs = Date.now();

            if (ownerType === 'user') {
                const entry = normalizeMoodEntry(state.mood.entries[key]);
                if (!entry) return;
                if (!Array.isArray(entry.comments)) entry.comments = [];
                entry.comments.push({
                    sender: 'user',
                    text,
                    time: formatTime(nowTs),
                });
                state.mood.entries[key] = entry;
                await saveMoodState();
                renderMoodPage();
                return;
            }

            const roleEntry = normalizeMoodEntry(state.mood.roleEntries[key]);
            if (!roleEntry) return;
            if (!Array.isArray(roleEntry.comments)) roleEntry.comments = [];
            roleEntry.comments.push({
                sender: 'user',
                text,
                time: formatTime(nowTs),
            });
            state.mood.roleEntries[key] = roleEntry;
            await saveRoleMoodState();
            renderMoodPage();
            triggerCharacterReplyForRoleDiary(key, roleEntry, text);
        }

        async function triggerCharacterReplyForRoleDiary(dateKey, entry, userComment) {
            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) return;
            const roleName = getRoleDisplayName();
            const toastText = roleName + ' 收到了你的评论，正在回复中……';
            setGlobalCharacterReplying(true, toastText);
            try {
                const reply = await callCharacterDiaryCommentAPI({
                    scene: 'comment_on_role_diary',
                    roleDiaryText: entry && (entry.text || entry.content || ''),
                    userComment: userComment || '',
                });
                const trimmed = normalizeAiReplyText(reply);
                if (!trimmed) return;
                const key = String(dateKey || '').trim();
                const latest = normalizeMoodEntry(state.mood.roleEntries[key]);
                if (!latest) return;
                if (!Array.isArray(latest.comments)) latest.comments = [];
                latest.comments.push({
                    sender: 'character',
                    text: trimmed,
                    time: formatTime(Date.now()),
                });
                state.mood.roleEntries[key] = latest;
                await saveRoleMoodState();
                if (state.activeTab === 'mood') {
                    renderMoodPage();
                }
            } catch (err) {
                showAiError(err);
            } finally {
                setGlobalCharacterReplying(false, '');
            }
        }

        function requestManualCharacterReplyForUserDiary(dateKey) {
            const key = String(dateKey || state.mood.selectedDateKey || '').trim();
            if (!key) return;
            const todayKey = toDateKey(new Date());
            if (key !== todayKey) {
                showCoupleSpaceInfo('目前只能手动触发今天这篇心情日记的角色评论');
                return;
            }
            const entry = normalizeMoodEntry(state.mood.entries[key]);
            if (!entry) {
                showCoupleSpaceInfo('今天还没有写心情日记');
                return;
            }
            const text = String(entry.text || entry.content || '').trim();
            if (!text) {
                showCoupleSpaceInfo('今天的心情日记内容为空');
                return;
            }
            openRoleDiaryConfirmModal(function () {
                scheduleCharacterReplyForUserDiary(key, { forceManual: true });
            }, {
                title: '手动触发评论',
                text: '是否要让角色评论今天这篇心情日记？'
            });
        }

        function openDiaryEditConfirmModal(dateKey) {
            const key = String(dateKey || state.mood.selectedDateKey || '').trim();
            if (!key) return;
            const entry = normalizeMoodEntry(state.mood.entries[key]);
            if (!entry) return;
            diaryEditPendingDateKey = key;
            const modal = document.getElementById('diary-edit-modal');
            if (!modal) return;
            modal.hidden = false;
            requestAnimationFrame(() => {
                modal.classList.add('is-open');
            });
        }

        function closeDiaryEditConfirmModal() {
            const modal = document.getElementById('diary-edit-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
            diaryEditPendingDateKey = '';
            setTimeout(() => {
                modal.hidden = true;
            }, 160);
        }

        function enterDiaryEditModeForDate(dateKey) {
            const key = String(dateKey || state.mood.selectedDateKey || '').trim();
            if (!key) return;
            const entry = normalizeMoodEntry(state.mood.entries[key]);
            if (!entry) return;
            state.mood.selectedDateKey = key;
            state.mood.modalDateKey = key;
            state.mood.modalOpen = true;
            state.mood.modalStep = 'pick';
            state.mood.pickedMood = null;
            state.mood.diaryDraft = '';
            state.mood.diaryImagesDraft = [];
            state.mood.isEditing = true;
            state.mood.editingDateKey = key;
            renderMoodModal();
        }

        function scheduleCharacterReplyForUserDiary(dateKey, options) {
            const opts = options && typeof options === 'object' ? options : {};
            if (!opts.forceManual && !isRoleCommentOnUserDiaryEnabled()) return;
            const key = String(dateKey || '').trim();
            if (!key) return;
            const link = getCoupleLinkState();
            if (!link || !link.hasCoupleLinked || !link.roleId) return;
            const entry = normalizeMoodEntry(state.mood.entries[key]);
            if (!entry) return;
            const text = String(entry.text || entry.content || '').trim();
            if (!text) return;
            const images = Array.isArray(entry.images) ? entry.images.slice(0, 9) : [];
            const roleName = getRoleDisplayName();
            const toastText = opts.forceManual
                ? (roleName + ' 正在看你今天的日记，准备给你留言……')
                : (roleName + ' 正在查看你的日记，请稍候（支持后台生成但请不要退出小手机）');
            setGlobalCharacterReplying(true, toastText);
            (async function () {
                try {
                    const reply = await callCharacterDiaryCommentAPI({
                        scene: 'user_diary',
                        diaryText: text,
                        diaryImages: images,
                    });
                    const trimmed = normalizeAiReplyText(reply);
                    if (!trimmed) return;
                    const latest = normalizeMoodEntry(state.mood.entries[key]);
                    if (!latest) return;
                    if (!Array.isArray(latest.comments)) latest.comments = [];
                    latest.comments.push({
                        sender: 'character',
                        text: trimmed,
                        time: formatTime(Date.now()),
                    });
                    state.mood.entries[key] = latest;
                    await saveMoodState();
                    if (state.activeTab === 'mood') {
                        renderMoodPage();
                    }
                } catch (err) {
                    showAiError(err);
                } finally {
                    setGlobalCharacterReplying(false, '');
                }
            })();
        }

        function openMoodModal(dateKey) {
            state.mood.modalDateKey = dateKey || state.mood.selectedDateKey;
            state.mood.selectedDateKey = state.mood.modalDateKey;
            state.mood.modalOpen = true;
            state.mood.modalStep = 'pick';
            state.mood.pickedMood = null;
            state.mood.diaryDraft = '';
            state.mood.diaryImagesDraft = [];
            state.mood.isEditing = false;
            state.mood.editingDateKey = '';
            renderMoodModal();
        }

        function closeMoodModal() {
            state.mood.modalOpen = false;
            state.mood.isEditing = false;
            state.mood.editingDateKey = '';
            renderMoodModal();
        }

        function renderMoodModal() {
            const modal = document.getElementById('mood-modal');
            const content = document.getElementById('mood-modal-content');
            if (!state.mood.modalOpen) {
                modal.hidden = true;
                modal.classList.remove('open');
                content.innerHTML = '';
                return;
            }
            modal.hidden = false;
            requestAnimationFrame(() => modal.classList.add('open'));

            if (state.mood.modalStep === 'pick') {
                const grid = MOOD_OPTIONS
                    .map((opt) => {
                        return `
                            <button class="mood-option" type="button" data-action="pick-mood" data-id="${escapeHtml(opt.id)}" data-label="${escapeHtml(opt.label)}" data-icon="${escapeHtml(opt.icon)}">
                                <img src="${escapeHtml(opt.icon)}" alt="${escapeHtml(opt.label)}" onerror="handleBrokenMoodImage(this, '${escapeHtml((opt.label || '').slice(0, 1))}')">
                                <div class="mood-label">${escapeHtml(opt.label)}</div>
                            </button>
                        `;
                    })
                    .join('');
                content.innerHTML = `
                    <div class="mood-modal-title">请选择今天的心情</div>
                    <div class="mood-grid">${grid}</div>
                `;
                return;
            }

            const picked = state.mood.pickedMood || { label: '心情', icon: '' };
            const headerIcon = picked.icon
                ? `<img class="note-mood-icon" src="${escapeHtml(picked.icon)}" alt="${escapeHtml(picked.label || '')}" onerror="handleBrokenMoodImage(this, '${escapeHtml((picked.label || '').slice(0, 1))}')">`
                : '';
            const canSave = String(state.mood.diaryDraft || '').trim().length > 0;
            content.innerHTML = `
                <div class="mood-modal-title">${headerIcon}${escapeHtml(picked.label)}</div>
                <div class="diary-input-wrapper">
                    <textarea class="diary-input" id="diary-textarea" placeholder="写下此刻的心情...">${escapeHtml(state.mood.diaryDraft || '')}</textarea>
                    <div class="diary-image-picker" data-action="open-image-picker">📷</div>
                </div>
                <button class="diary-save" type="button" data-action="save-diary" ${canSave ? '' : 'disabled'}>确认/保存</button>
            `;
        }

        async function saveDiaryEntry() {
            const picked = state.mood.pickedMood;
            if (!picked) return;
            const key = state.mood.modalDateKey || state.mood.selectedDateKey;
            const text = (state.mood.diaryDraft || '').trim();
            if (!text) {
                updateDiarySaveButtonState();
                return;
            }
            const now = Date.now();
            const images = Array.isArray(state.mood.diaryImagesDraft) ? state.mood.diaryImagesDraft.slice(0, 9) : [];
            const prevEntry = normalizeMoodEntry(state.mood.entries[key]) || null;
            const prevComments = prevEntry && Array.isArray(prevEntry.comments) ? prevEntry.comments.slice() : [];
            state.mood.entries[key] = {
                id: picked.id,
                mood: picked.id,
                label: picked.label,
                icon: picked.icon,
                text,
                content: text,
                images,
                date: key,
                updatedAt: now,
                comments: prevComments,
            };
            state.mood.diaryImagesDraft = [];
            state.mood.isEditing = false;
            state.mood.editingDateKey = '';
            await saveMoodState();
            closeMoodModal();
            renderMoodPage();
            scheduleCharacterReplyForUserDiary(key);
        }

        function triggerBgChange() {
            document.getElementById('bg-input').click();
        }

        function triggerAvatarChange(type) {
            if (type === 'user') {
                document.getElementById('avatar-user-input').click();
            } else {
                document.getElementById('avatar-role-input').click();
            }
        }

        function handleFileSelect(event, imgId, storageKey) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 1200;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    
                    document.getElementById(imgId).src = dataUrl;
                    
                    const link = getCoupleLinkState();
                    const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
                    coupleSpaceSetRoleItem(storageKey, rid, dataUrl).then((ok) => {
                        if (!ok) {
                            alert('存储空间不足');
                        }
                    });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        async function loadImage(key, imgId) {
            const link = getCoupleLinkState();
            const rid = link && link.hasCoupleLinked ? String(link.roleId || '').trim() : '';
            const data = await coupleSpaceGetRoleItem(key, rid);
            if (data) {
                document.getElementById(imgId).src = data;
            }
        }

        function goBack() {
            try {
                const link = getCoupleLinkState();
                if (link && link.hasCoupleLinked && link.roleId) {
                    writeLastExitTime(link.roleId, Date.now());
                }
            } catch (e) { }
            if (window.parent && window.parent.closeApp) {
                window.parent.closeApp();
            } else {
                console.log('No parent window detected');
            }
        }

        try {
            window.addEventListener('pagehide', function () {
                const link = getCoupleLinkState();
                if (link && link.hasCoupleLinked && link.roleId) {
                    writeLastExitTime(link.roleId, Date.now());
                }
            });
        } catch (e) { }

        try {
            window.addEventListener('message', async function (ev) {
                const data = ev && ev.data ? ev.data : null;
                if (!data || typeof data !== 'object') return;
                const type = String(data.type || '');
                if (type === 'COUPLE_SPACE_SECRET_REFRESH') {
                    try {
                        const modal = document.getElementById('secret-space-modal');
                        if (modal && !modal.hidden && window.secretSpaceTimeline && typeof window.secretSpaceTimeline.render === 'function') {
                            window.secretSpaceTimeline.render();
                        }
                    } catch (e0) { }
                    return;
                }
                if (type === 'COUPLE_SPACE_ACTIVITY_REFRESH') {
                    try {
                        const modal = document.getElementById('secret-space-modal');
                        if (modal && !modal.hidden && window.secretSpaceTimeline && typeof window.secretSpaceTimeline.render === 'function') {
                            window.secretSpaceTimeline.render();
                        }
                    } catch (e00) { }
                    return;
                }
                if (type !== 'COUPLE_SPACE_APP_ENTER' && type !== 'COUPLE_SPACE_APP_EXIT') return;
                const link = getCoupleLinkState();
                if (!link || !link.hasCoupleLinked || !link.roleId) return;
                if (type === 'COUPLE_SPACE_APP_EXIT') {
                    setGlobalCharacterReplying(false, '', true);
                    coupleSpaceAppVisible = false;
                    writeLastExitTime(link.roleId, Date.now());
                    return;
                }

                try {
                    await handleCoupleSpaceAppEnter('message_enter');
                } catch (e2) {
                    const pw = getParentWindow();
                    const msg = e2 && e2.message ? String(e2.message) : String(e2 || '生成失败');
                    if (pw && typeof pw.showCenterToast === 'function') {
                        pw.showCenterToast(msg);
                    } else if (pw && pw.GlobalModal && typeof pw.GlobalModal.showError === 'function') {
                        pw.GlobalModal.showError(msg);
                    } else {
                        alert(msg);
                    }
                }
            });
        } catch (e) { }
