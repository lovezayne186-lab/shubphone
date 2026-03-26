(function initMemoryArchiveEntriesOverride() {
    const STORAGE_KEY = 'wechat_memory_archive_v1';
    const CATEGORIES = ['likes', 'habits', 'events'];
    const VALID_SOURCES = {
        auto: true,
        manual: true,
        refined: true,
        migrated: true,
        local_fallback: true
    };

    window.memoryArchiveStore = window.memoryArchiveStore || {};

    function loadStore() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                window.memoryArchiveStore = JSON.parse(raw) || {};
            }
        } catch (e) {
            console.error('[MemoryArchiveV2] load failed', e);
            window.memoryArchiveStore = {};
        }
    }

    function saveStore() {
        try {
            const json = JSON.stringify(window.memoryArchiveStore || {});
            localStorage.setItem(STORAGE_KEY, json);
            try {
                localStorage.setItem('ai_memory_archives', json);
            } catch (e2) { }
        } catch (e) {
            console.error('[MemoryArchiveV2] save failed', e);
        }
    }

    function normalizeCategory(category) {
        const key = String(category || '').trim().toLowerCase();
        return CATEGORIES.indexOf(key) >= 0 ? key : '';
    }

    function normalizeLine(text) {
        let out = String(text == null ? '' : text)
            .replace(/\r/g, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^[-•\s]+/, '')
            .trim();
        if (!out) return '';
        if (out.indexOf('（示例）') !== -1 || out.indexOf('开启“自动总结”后') !== -1) return '';
        return out;
    }

    function normalizeDedupKey(category, content) {
        const cat = normalizeCategory(category);
        const text = normalizeLine(content)
            .replace(/[，,。.!！？?；;：:、"“”'‘’（）()【】\[\]<>《》]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        return cat && text ? (cat + '::' + text) : '';
    }

    function makeEntryId() {
        return 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    }

    function normalizeEntry(rawEntry, fallbackCategory, fallbackSource) {
        if (!rawEntry) return null;
        const category = normalizeCategory(rawEntry.category || fallbackCategory);
        if (!category) return null;
        const content = normalizeLine(rawEntry.content !== undefined ? rawEntry.content : rawEntry);
        if (!content) return null;
        const now = Date.now();
        const createdAt = Number(rawEntry.createdAt);
        const updatedAt = Number(rawEntry.updatedAt);
        const sourceKey = String(rawEntry.source || fallbackSource || 'manual').trim();
        return {
            id: String(rawEntry.id || makeEntryId()),
            category: category,
            content: content,
            source: VALID_SOURCES[sourceKey] ? sourceKey : (fallbackSource || 'manual'),
            createdAt: Number.isFinite(createdAt) ? createdAt : now,
            updatedAt: Number.isFinite(updatedAt) ? updatedAt : (Number.isFinite(createdAt) ? createdAt : now)
        };
    }

    function normalizeEntries(entries) {
        const list = Array.isArray(entries) ? entries : [];
        const out = [];
        const keyMap = new Map();
        list.forEach(function (rawEntry) {
            const entry = normalizeEntry(rawEntry, rawEntry && rawEntry.category, rawEntry && rawEntry.source);
            if (!entry) return;
            const dedupKey = normalizeDedupKey(entry.category, entry.content);
            if (!dedupKey) return;
            if (keyMap.has(dedupKey)) {
                const existing = out[keyMap.get(dedupKey)];
                existing.updatedAt = Math.max(Number(existing.updatedAt) || 0, Number(entry.updatedAt) || 0, Date.now());
                existing.createdAt = Math.min(Number(existing.createdAt) || existing.updatedAt, Number(entry.createdAt) || entry.updatedAt);
                if (existing.source === 'migrated' && entry.source !== 'migrated') existing.source = entry.source;
                if (existing.source === 'local_fallback' && (entry.source === 'auto' || entry.source === 'manual' || entry.source === 'refined')) {
                    existing.source = entry.source;
                }
                if (String(entry.content || '').length > String(existing.content || '').length) {
                    existing.content = entry.content;
                }
                return;
            }
            keyMap.set(dedupKey, out.length);
            out.push(entry);
        });
        out.sort(function (a, b) {
            const aTime = Number(a.updatedAt) || Number(a.createdAt) || 0;
            const bTime = Number(b.updatedAt) || Number(b.createdAt) || 0;
            if (aTime !== bTime) return aTime - bTime;
            return String(a.id || '').localeCompare(String(b.id || ''));
        });
        return out;
    }

    function parseTextLines(text) {
        return String(text || '')
            .split('\n')
            .map(normalizeLine)
            .filter(Boolean);
    }

    function ensureArchiveMeta(archive) {
        if (!archive.meta || typeof archive.meta !== 'object') archive.meta = {};
        if (typeof archive.meta.lastProcessedIndex !== 'number' || !isFinite(archive.meta.lastProcessedIndex)) archive.meta.lastProcessedIndex = 0;
        if (typeof archive.meta.updatedAt !== 'number' || !isFinite(archive.meta.updatedAt)) archive.meta.updatedAt = Date.now();
        if (typeof archive.meta.summaryInProgress !== 'boolean') archive.meta.summaryInProgress = false;
        if (typeof archive.meta.refineInProgress !== 'boolean') archive.meta.refineInProgress = false;
    }

    function syncArchiveFields(archive) {
        archive.entries = normalizeEntries(archive.entries);
        const grouped = { likes: [], habits: [], events: [] };
        archive.entries.forEach(function (entry) {
            if (!entry || !grouped[entry.category]) return;
            grouped[entry.category].push('- ' + normalizeLine(entry.content));
        });
        archive.likesText = grouped.likes.join('\n');
        archive.habitsText = grouped.habits.join('\n');
        archive.eventsText = grouped.events.join('\n');
        ensureArchiveMeta(archive);
        return archive;
    }

    function ensureArchive(roleId) {
        const rid = String(roleId || window.currentChatRole || '').trim();
        if (!rid) return null;
        if (!window.memoryArchiveStore[rid] || typeof window.memoryArchiveStore[rid] !== 'object') {
            window.memoryArchiveStore[rid] = {
                entries: [],
                likesText: '',
                habitsText: '',
                eventsText: '',
                meta: { lastProcessedIndex: 0, updatedAt: Date.now(), summaryInProgress: false, refineInProgress: false }
            };
        }
        const archive = window.memoryArchiveStore[rid];
        ensureArchiveMeta(archive);
        if (!Array.isArray(archive.entries)) archive.entries = [];
        if (!archive.entries.length) {
            const migrated = [];
            parseTextLines(archive.likesText).forEach(function (content) { migrated.push({ category: 'likes', content: content, source: 'migrated' }); });
            parseTextLines(archive.habitsText).forEach(function (content) { migrated.push({ category: 'habits', content: content, source: 'migrated' }); });
            parseTextLines(archive.eventsText).forEach(function (content) { migrated.push({ category: 'events', content: content, source: 'migrated' }); });
            if (migrated.length) archive.entries = migrated;
        }
        syncArchiveFields(archive);
        window.memoryArchiveStore[rid] = archive;
        return archive;
    }

    function persistArchive(roleId, archive) {
        const rid = String(roleId || window.currentChatRole || '').trim();
        if (!rid || !archive) return;
        window.memoryArchiveStore[rid] = syncArchiveFields(archive);
        saveStore();
    }

    function capLines(text, maxLines) {
        const lines = String(text || '')
            .split('\n')
            .map(function (line) { return line.trim(); })
            .filter(Boolean);
        const limit = Math.max(0, Number(maxLines) || 0);
        if (!limit || lines.length <= limit) return lines.join('\n');
        return lines.slice(lines.length - limit).join('\n');
    }

    function getEntriesByCategory(archive, category) {
        const cat = normalizeCategory(category);
        return normalizeEntries(archive && archive.entries).filter(function (entry) {
            return entry.category === cat;
        });
    }

    function buildArchiveSections(roleId, options) {
        loadStore();
        const archive = ensureArchive(roleId);
        const sections = {
            archive: archive,
            entries: archive ? normalizeEntries(archive.entries) : [],
            likesEntries: archive ? getEntriesByCategory(archive, 'likes') : [],
            habitsEntries: archive ? getEntriesByCategory(archive, 'habits') : [],
            eventsEntries: archive ? getEntriesByCategory(archive, 'events') : [],
            likesText: archive ? archive.likesText || '' : '',
            habitsText: archive ? archive.habitsText || '' : '',
            eventsText: archive ? archive.eventsText || '' : ''
        };
        const opts = options && typeof options === 'object' ? options : {};
        const limits = opts.lineLimits && typeof opts.lineLimits === 'object' ? opts.lineLimits : {};
        if (limits.likes) sections.likesText = capLines(sections.likesText, limits.likes);
        if (limits.habits) sections.habitsText = capLines(sections.habitsText, limits.habits);
        if (limits.events) sections.eventsText = capLines(sections.eventsText, limits.events);
        return sections;
    }

    function renderArchive(tabKey) {
        const roleId = window.currentChatRole;
        const textEl = document.getElementById('memory-archive-text');
        if (!textEl) return;
        const sections = buildArchiveSections(roleId);
        const entries = tabKey === 'likes'
            ? sections.likesEntries
            : (tabKey === 'habits' ? sections.habitsEntries : sections.eventsEntries);

        textEl.innerHTML = '';
        if (!entries.length) {
            textEl.innerHTML = '<div style="text-align:center; color:#999; margin-top:20px;">暂无记忆</div>';
            return;
        }

        const ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';
        entries.forEach(function (entry) {
            const li = document.createElement('li');
            li.innerText = normalizeLine(entry.content);
            li.setAttribute('data-entry-id', String(entry.id || ''));
            li.style.cursor = 'pointer';
            li.onclick = function () {
                editArchiveEntry(tabKey, String(entry.id || ''));
            };
            ul.appendChild(li);
        });
        textEl.appendChild(ul);
    }

    function refreshArchiveModal(tabKey) {
        const modal = document.getElementById('memory-archive-modal');
        if (!modal || modal.style.display === 'none') return;
        const safeTab = normalizeCategory(tabKey) || window.currentMemoryArchiveTab || 'likes';
        window.currentMemoryArchiveTab = safeTab;
        const allTabs = modal.querySelectorAll('.memory-tab-item');
        allTabs.forEach(function (btn) {
            const key = btn.getAttribute('data-key');
            if (key === safeTab) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        renderArchive(safeTab);
    }

    function editArchiveEntry(tabKey, entryId) {
        const roleId = window.currentChatRole;
        if (!roleId) return;
        loadStore();
        const archive = ensureArchive(roleId);
        const entries = getEntriesByCategory(archive, tabKey);
        const target = entries.find(function (entry) {
            return String(entry.id || '') === String(entryId || '');
        });
        if (!target) return;
        const edited = window.prompt('编辑记忆（留空则删除）', normalizeLine(target.content));
        if (edited === null) return;
        const nextContent = normalizeLine(edited);
        archive.entries = normalizeEntries((archive.entries || []).map(function (entry) {
            if (!entry || String(entry.id || '') !== String(target.id || '')) return entry;
            if (!nextContent) return null;
            return Object.assign({}, entry, {
                content: nextContent,
                updatedAt: Date.now()
            });
        }).filter(Boolean));
        archive.meta.updatedAt = Date.now();
        persistArchive(roleId, archive);
        refreshArchiveModal(tabKey);
    }

    function normalizeText(text) {
        return String(text || '')
            .replace(/^「回复：[\s\S]*?」\s*\n-+\s*\n/i, '')
            .replace(/\r/g, '')
            .trim();
    }

    function formatMemoryDateLabel(timestamp) {
        const ts = Number(timestamp);
        if (!isFinite(ts) || ts <= 0) return '';
        const d = new Date(ts);
        return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    function buildMemoryDatePrefix(startTimestamp, endTimestamp) {
        const startLabel = formatMemoryDateLabel(startTimestamp);
        const endLabel = formatMemoryDateLabel(endTimestamp);
        if (!startLabel && !endLabel) return '';
        if (!startLabel) return endLabel;
        if (!endLabel || startLabel === endLabel) return startLabel;
        return startLabel + '-' + endLabel;
    }

    function ensureEventDatePrefix(text, fallbackPrefix) {
        const clean = normalizeLine(text);
        if (!clean) return '';
        if (/^\d{1,2}月\d{1,2}日(?:\s*[-~至到]\s*\d{1,2}月\d{1,2}日)?[：:]/.test(clean)) {
            return clean;
        }
        const stripped = clean.replace(/^(我们|今天|最近)[：:]?\s*/, '').trim();
        const prefix = String(fallbackPrefix || '').trim();
        return prefix ? (prefix + '：' + stripped) : stripped;
    }

    function containsAny(text, keywords) {
        const s = String(text || '');
        for (let i = 0; i < keywords.length; i++) {
            if (s.includes(keywords[i])) return true;
        }
        return false;
    }

    function isEmojiOnlyText(text) {
        const raw = String(text || '').trim();
        if (!raw) return false;
        const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
        const removed = raw.replace(emojiRegex, '').replace(/\s/g, '');
        return removed.length === 0 && !!raw.match(emojiRegex);
    }

    function isEmojiHeavyMessage(msg) {
        if (!msg) return false;
        if (msg.type === 'image' || msg.type === 'sticker') return true;
        if (msg.type !== 'text') return false;
        const text = normalizeText(msg.content);
        if (!text) return false;
        return isEmojiOnlyText(text) || text.length <= 2;
    }

    function summarizeSegment(segmentMsgs) {
        const likes = [];
        const habits = [];
        const events = [];
        const userMsgs = (Array.isArray(segmentMsgs) ? segmentMsgs : []).filter(function (m) { return m && m.role === 'me'; });
        const stopVals = new Set(['这个', '那个', '这样', '那样', '这种', '那种', '它', '啥', '什么']);
        const likePosRegex = /(喜欢|最喜欢|偏爱|爱吃|爱喝|爱看|爱玩|迷上|沉迷)\s*([^，。！？\n]{1,18})/g;
        const likeNegRegex = /(讨厌|不喜欢|不爱|不太喜欢|不想|不吃|怕|过敏|忌口)\s*([^，。！？\n]{1,18})/g;

        userMsgs.forEach(function (msg) {
            if (!msg || msg.type !== 'text') return;
            const text = normalizeText(msg.content);
            if (!text) return;
            likePosRegex.lastIndex = 0;
            let match;
            while ((match = likePosRegex.exec(text)) !== null) {
                const val = String(match[2] || '').trim();
                if (!val || stopVals.has(val)) continue;
                if (val.length === 1 && ['你', '他', '她', '我'].indexOf(val) >= 0) continue;
                likes.push('用户喜欢：' + val);
            }
            likeNegRegex.lastIndex = 0;
            while ((match = likeNegRegex.exec(text)) !== null) {
                const val = String(match[2] || '').trim();
                if (!val || stopVals.has(val)) continue;
                if (val.length === 1 && ['你', '他', '她', '我'].indexOf(val) >= 0) continue;
                likes.push('用户讨厌/避开：' + val);
            }
        });

        const habitRegexList = [
            /(习惯|经常|总是|每天|通常|一般|老是|一直)\s*([^，。！？\n]{1,24})/g,
            /(熬夜|晚起|早起|失眠|夜宵|运动|健身|跑步|喝咖啡|加班|通勤|追剧|刷手机|吃辣|清淡)/g
        ];

        userMsgs.forEach(function (msg) {
            if (!msg || msg.type !== 'text') return;
            const text = normalizeText(msg.content);
            if (!text) return;
            habitRegexList.forEach(function (rgx) {
                rgx.lastIndex = 0;
                let match;
                while ((match = rgx.exec(text)) !== null) {
                    const tail = String(match[2] || match[1] || '').trim();
                    if (!tail) continue;
                    if (containsAny(tail, ['说话', '聊天', '打字', '语气', '口癖', '句尾']) && !containsAny(tail, ['表情', '表情包'])) {
                        continue;
                    }
                    habits.push('用户习惯：' + tail);
                }
            });
        });

        const emojiHeavyCount = userMsgs.filter(isEmojiHeavyMessage).length;
        if (userMsgs.length >= 3 && emojiHeavyCount / userMsgs.length >= 0.6) {
            habits.push('用户经常用表情包表达情绪');
        }

        function isTrivialChatLine(text) {
            const s = String(text || '').trim();
            if (!s) return true;
            if (s.length <= 3) return true;
            return /^(嗯+|哦+|好+|好的+|行+|在吗+|哈哈+|hhh+|ok+|收到+|是的+|对+|？+|。+)$/i.test(s);
        }

        const recentUserTexts = userMsgs
            .filter(function (msg) { return msg && msg.type === 'text'; })
            .map(function (msg) {
                return {
                    text: normalizeText(msg.content),
                    timestamp: msg.timestamp || 0
                };
            })
            .filter(function (item) { return item.text && !isTrivialChatLine(item.text); })
            .slice(-2);
        recentUserTexts.forEach(function (item) {
            const shortText = item.text.length > 60 ? item.text.slice(0, 60) + '...' : item.text;
            const prefix = buildMemoryDatePrefix(item.timestamp, item.timestamp);
            events.push((prefix ? (prefix + '：') : '') + shortText);
        });

        const recentAiCommit = (Array.isArray(segmentMsgs) ? segmentMsgs : [])
            .filter(function (msg) { return msg && msg.role === 'ai' && msg.type === 'text'; })
            .map(function (msg) {
                return {
                    text: normalizeText(msg.content),
                    timestamp: msg.timestamp || 0
                };
            })
            .filter(function (item) { return item.text && !isTrivialChatLine(item.text); })
            .slice(-6)
            .reverse()
            .find(function (item) { return /我(会|可以|帮|尽量|记得|下次|以后)/.test(item.text); });
        if (recentAiCommit) {
            const aiText = recentAiCommit.text.length > 60 ? recentAiCommit.text.slice(0, 60) + '...' : recentAiCommit.text;
            const prefix = buildMemoryDatePrefix(recentAiCommit.timestamp, recentAiCommit.timestamp);
            events.push((prefix ? (prefix + '：') : '') + '我说过' + aiText);
        }

        function uniq(arr) {
            return Array.from(new Set(arr.map(normalizeLine).filter(Boolean)));
        }

        return {
            likes: uniq(likes),
            habits: uniq(habits),
            events: uniq(events)
        };
    }

    function buildEntriesFromBuckets(buckets, source) {
        const out = [];
        CATEGORIES.forEach(function (category) {
            const list = buckets && Array.isArray(buckets[category]) ? buckets[category] : [];
            list.forEach(function (item) {
                const content = normalizeLine(item);
                if (!content) return;
                out.push({
                    category: category,
                    content: content,
                    source: source
                });
            });
        });
        return out;
    }

    function buildSegmentText(segment) {
        return (Array.isArray(segment) ? segment : [])
            .filter(function (msg) { return msg && (msg.role === 'me' || msg.role === 'ai') && msg.content; })
            .slice(-200)
            .map(function (msg) {
                const who = msg.role === 'me' ? '用户' : 'AI';
                if (msg.type === 'image') return who + ': [图片]';
                if (msg.type === 'sticker') return who + ': [表情包]';
                if (msg.type === 'voice') return who + ': [语音]';
                if (msg.type === 'location' || msg.type === 'location_share') return who + ': [位置]';
                return who + ': ' + normalizeText(msg.content);
            })
            .filter(Boolean)
            .join('\n');
    }

    function filterApiLikes(items, userTextForDetect, segmentText) {
        const markers = ['喜欢', '最喜欢', '偏爱', '爱吃', '爱喝', '爱看', '爱玩', '迷上', '沉迷', '讨厌', '不喜欢', '不爱', '不太喜欢', '不想', '不吃', '怕', '过敏', '忌口'];
        return (items || [])
            .map(normalizeLine)
            .filter(Boolean)
            .filter(function (s) { return s.length <= 50; })
            .filter(function (s) { return containsAny(s, markers); })
            .filter(function (s) { return containsAny(userTextForDetect, markers) || containsAny(segmentText, markers); });
    }

    function filterApiHabits(items, emojiHeavyRatio) {
        const markers = ['习惯', '经常', '总是', '每天', '通常', '一般', '老是', '一直', '熬夜', '晚起', '早起', '失眠', '夜宵', '运动', '健身', '跑步', '喝咖啡', '加班', '通勤', '追剧', '刷手机', '表情', '表情包'];
        return (items || [])
            .map(normalizeLine)
            .filter(Boolean)
            .filter(function (s) { return s.length <= 50; })
            .filter(function (s) {
                if (containsAny(s, ['说话', '聊天', '打字', '语气', '口癖', '句尾'])) {
                    return containsAny(s, ['表情', '表情包']);
                }
                return true;
            })
            .filter(function (s) { return containsAny(s, markers) || (emojiHeavyRatio >= 0.6 && containsAny(s, ['表情', '表情包'])); });
    }

    function filterApiEvents(items, fallbackPrefix) {
        const filler = ['我们聊了很多', '对话很愉快', '聊得很愉快', '聊得很开心', '聊了不少', '日常闲聊'];
        return (items || [])
            .map(function (item) { return ensureEventDatePrefix(item, fallbackPrefix); })
            .filter(Boolean)
            .filter(function (s) { return s.length <= 80; })
            .filter(function (s) { return /^\d{1,2}月\d{1,2}日(?:\s*[-~至到]\s*\d{1,2}月\d{1,2}日)?[：:]/.test(s); })
            .filter(function (s) { return !containsAny(s, filler); })
            .filter(function (s) { return !/^\d{1,2}月\d{1,2}日(?:\s*[-~至到]\s*\d{1,2}月\d{1,2}日)?[：:]?\s*(聊了很多|聊得很愉快|聊得很开心)/.test(s); });
    }

    window.getMemoryArchiveSections = buildArchiveSections;
    window.getMemoryArchiveForRole = function (roleId) {
        loadStore();
        return ensureArchive(roleId);
    };

    window.openMemoryArchiveModal = function () {
        loadStore();
        const menu = document.getElementById('settings-menu-modal');
        if (menu) menu.style.display = 'none';
        if (typeof disableChatStatusBarInteraction === 'function') disableChatStatusBarInteraction();
        const modal = document.getElementById('memory-archive-modal');
        if (modal) modal.style.display = 'flex';

        const roleId = window.currentChatRole;
        if (roleId) {
            let profile = (window.charProfiles && window.charProfiles[roleId]) ? window.charProfiles[roleId] : null;
            if (!profile) {
                try {
                    const raw = localStorage.getItem('wechat_charProfiles');
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && parsed[roleId]) profile = parsed[roleId];
                    }
                } catch (e) { }
            }

            const nameEl = document.getElementById('memory-archive-name');
            const avatarEl = document.getElementById('memory-archive-avatar');
            const displayName = profile ? (profile.nickName || profile.name || profile.title) : '';
            if (nameEl) nameEl.innerText = displayName || '未知角色';
            if (avatarEl) avatarEl.src = (profile && profile.avatar) ? profile.avatar : 'assets/chushitouxiang.jpg';

            const msgs = (window.chatData && window.chatData[roleId]) ? window.chatData[roleId] : [];
            let msgCount = msgs.length;
            let tokenCount = 0;
            let daysCount = 0;
            if (msgs.length > 0) {
                const firstMsg = msgs[0];
                if (firstMsg && firstMsg.timestamp) {
                    const diff = Date.now() - firstMsg.timestamp;
                    daysCount = Math.ceil(diff / (1000 * 60 * 60 * 24));
                } else {
                    daysCount = 1;
                }
                if (typeof window.refreshActiveTokensUI === 'function') {
                    const stats = window.refreshActiveTokensUI(roleId, false);
                    tokenCount = stats.tokenCount;
                } else {
                    msgs.forEach(function (msg) {
                        if (msg && typeof msg.content === 'string') tokenCount += msg.content.length;
                    });
                }
            }

            const daysEl = document.getElementById('stat-days');
            const msgsEl = document.getElementById('stat-messages');
            const tokensEl = document.getElementById('stat-tokens');
            if (daysEl) daysEl.innerText = String(daysCount);
            if (msgsEl) msgsEl.innerText = String(msgCount);
            if (tokensEl) tokensEl.innerText = tokenCount > 10000 ? (tokenCount / 1000).toFixed(1) + 'k' : String(tokenCount);
        }

        window.currentMemoryArchiveTab = 'likes';
        refreshArchiveModal('likes');
    };

    window.closeMemoryArchiveModal = function () {
        const modal = document.getElementById('memory-archive-modal');
        if (modal) modal.style.display = 'none';
        if (typeof enableChatStatusBarInteraction === 'function') enableChatStatusBarInteraction();
        const menu = document.getElementById('settings-menu-modal');
        if (menu) menu.style.display = 'flex';
    };

    window.switchMemoryArchiveTab = function (tabKey) {
        window.currentMemoryArchiveTab = normalizeCategory(tabKey) || 'likes';
        refreshArchiveModal(window.currentMemoryArchiveTab);
    };

    window.addMemoryArchiveItem = function () {
        const roleId = window.currentChatRole;
        if (!roleId) return;
        loadStore();
        const inputEl = document.getElementById('memory-archive-input');
        if (!inputEl) return;
        const value = String(inputEl.value || '').trim();
        if (!value) return;
        const category = normalizeCategory(window.currentMemoryArchiveTab || 'likes');
        if (!category) return;
        const archive = ensureArchive(roleId);
        const additions = value
            .split('\n')
            .map(normalizeLine)
            .filter(Boolean)
            .map(function (content) {
                return { category: category, content: content, source: 'manual' };
            });
        archive.entries = normalizeEntries((archive.entries || []).concat(additions));
        archive.meta.updatedAt = Date.now();
        persistArchive(roleId, archive);
        inputEl.value = '';
        refreshArchiveModal(category);
    };

    window.maybeAutoUpdateMemoryArchive = function (roleId) {
        try {
            const rid = String(roleId || window.currentChatRole || '').trim();
            if (!rid) return;
            const history = window.chatData && Array.isArray(window.chatData[rid]) ? window.chatData[rid] : [];
            if (!Array.isArray(history)) return;

            let autoOn = false;
            let freq = 20;
            try {
                if (typeof window.getCurrentChatSettings === 'function') {
                    const settings = window.getCurrentChatSettings(rid) || {};
                    if (typeof settings.autoSummary === 'boolean') autoOn = settings.autoSummary;
                    if (typeof settings.summaryFreq === 'number' && settings.summaryFreq > 0) freq = settings.summaryFreq;
                }
            } catch (e) { }
            if (!autoOn) autoOn = localStorage.getItem('chat_auto_summary') === 'true';
            if (!freq) {
                const legacyFreq = parseInt(localStorage.getItem('chat_summary_freq'), 10);
                if (!isNaN(legacyFreq) && legacyFreq > 0) freq = legacyFreq;
            }
            if (!autoOn) return;

            loadStore();
            const archive = ensureArchive(rid);
            const lastIdx = archive.meta.lastProcessedIndex || 0;
            if (history.length - lastIdx < freq) return;
            if (archive.meta.summaryInProgress) return;

            const segment = history.slice(lastIdx);
            archive.meta.summaryInProgress = true;
            persistArchive(rid, archive);

            const profile = window.charProfiles[rid] || {};
            const userPersonaObj = (window.userPersonas && window.userPersonas[rid]) || {};
            const segmentText = buildSegmentText(segment);
            const segmentDatePrefix = buildMemoryDatePrefix(
                segment.length ? segment[0].timestamp : 0,
                segment.length ? segment[segment.length - 1].timestamp : 0
            );
            const userMsgsForDetect = segment.filter(function (msg) { return msg && msg.role === 'me'; });
            const userTextForDetect = userMsgsForDetect
                .map(function (msg) { return msg && msg.type === 'text' ? normalizeText(msg.content) : ''; })
                .filter(Boolean)
                .join('\n');
            const emojiHeavyRatio = userMsgsForDetect.length
                ? (userMsgsForDetect.filter(isEmojiHeavyMessage).length / userMsgsForDetect.length)
                : 0;

            if (typeof window.callAISummary === 'function') {
                window.callAISummary(
                    {
                        roleName: profile.nickName || profile.name || 'AI',
                        rolePrompt: profile.desc || '',
                        userPersona: userPersonaObj.setting || '',
                        userName: userPersonaObj.name || '',
                        userGender: userPersonaObj.gender || '',
                        segmentText: segmentText
                    },
                    function (res) {
                        try {
                            const nextEntries = buildEntriesFromBuckets({
                                likes: filterApiLikes(res.likes, userTextForDetect, segmentText),
                                habits: filterApiHabits(res.habits, emojiHeavyRatio),
                                events: filterApiEvents(res.events, segmentDatePrefix)
                            }, 'auto');
                            archive.entries = normalizeEntries((archive.entries || []).concat(nextEntries));
                            archive.meta.lastProcessedIndex = history.length;
                            archive.meta.updatedAt = Date.now();
                        } finally {
                            archive.meta.summaryInProgress = false;
                            persistArchive(rid, archive);
                            refreshArchiveModal(window.currentMemoryArchiveTab || 'likes');
                        }
                    },
                    function () {
                        archive.meta.summaryInProgress = false;
                        archive.meta.lastProcessedIndex = history.length;
                        archive.meta.updatedAt = Date.now();
                        persistArchive(rid, archive);
                    }
                );
                return;
            }

            archive.entries = normalizeEntries((archive.entries || []).concat(buildEntriesFromBuckets(summarizeSegment(segment), 'local_fallback')));
            archive.meta.lastProcessedIndex = history.length;
            archive.meta.updatedAt = Date.now();
            archive.meta.summaryInProgress = false;
            persistArchive(rid, archive);
            refreshArchiveModal(window.currentMemoryArchiveTab || 'likes');
        } catch (e) {
            console.error('[MemoryArchiveV2] auto update failed', e);
        }
    };

    window.rebuildMemoryArchive = function (roleId) {
        try {
            const rid = String(roleId || window.currentChatRole || '').trim();
            if (!rid) return;
            const history = window.chatData && Array.isArray(window.chatData[rid]) ? window.chatData[rid] : [];
            if (!Array.isArray(history)) return;

            loadStore();
            const archive = ensureArchive(rid);
            archive.entries = [];
            archive.likesText = '';
            archive.habitsText = '';
            archive.eventsText = '';
            archive.meta.lastProcessedIndex = 0;
            archive.meta.updatedAt = Date.now();
            archive.meta.summaryInProgress = false;
            persistArchive(rid, archive);

            const profile = window.charProfiles[rid] || {};
            const userPersonaObj = (window.userPersonas && window.userPersonas[rid]) || {};
            const segment = history.slice(-200);
            const segmentText = buildSegmentText(segment);
            const segmentDatePrefix = buildMemoryDatePrefix(
                segment.length ? segment[0].timestamp : 0,
                segment.length ? segment[segment.length - 1].timestamp : 0
            );
            const finalize = function () {
                refreshArchiveModal(window.currentMemoryArchiveTab || 'likes');
            };

            if (typeof window.callAISummary === 'function' && segmentText) {
                archive.meta.summaryInProgress = true;
                persistArchive(rid, archive);
                window.callAISummary(
                    {
                        roleName: profile.nickName || profile.name || 'AI',
                        rolePrompt: profile.desc || '',
                        userPersona: userPersonaObj.setting || '',
                        userName: userPersonaObj.name || '',
                        userGender: userPersonaObj.gender || '',
                        segmentText: segmentText
                    },
                    function (res) {
                        try {
                            archive.entries = normalizeEntries(buildEntriesFromBuckets({
                                likes: (res && res.likes ? res.likes : []).slice(0, 80),
                                habits: (res && res.habits ? res.habits : []).slice(0, 80),
                                events: filterApiEvents((res && res.events ? res.events : []).slice(0, 80), segmentDatePrefix)
                            }, 'auto'));
                            archive.meta.lastProcessedIndex = history.length;
                            archive.meta.updatedAt = Date.now();
                        } finally {
                            archive.meta.summaryInProgress = false;
                            persistArchive(rid, archive);
                            finalize();
                        }
                    },
                    function () {
                        archive.meta.summaryInProgress = false;
                        archive.meta.lastProcessedIndex = history.length;
                        archive.meta.updatedAt = Date.now();
                        persistArchive(rid, archive);
                        finalize();
                    }
                );
                return;
            }

            archive.entries = normalizeEntries(buildEntriesFromBuckets(summarizeSegment(segment), 'local_fallback'));
            archive.meta.lastProcessedIndex = history.length;
            archive.meta.updatedAt = Date.now();
            archive.meta.summaryInProgress = false;
            persistArchive(rid, archive);
            finalize();
        } catch (e) {
            console.error('[MemoryArchiveV2] rebuild failed', e);
        }
    };

    window.refineMemoryArchiveEvents = function () {
        try {
            const rid = String(window.currentChatRole || '').trim();
            if (!rid) return;
            loadStore();
            const archive = ensureArchive(rid);
            const targets = getEntriesByCategory(archive, 'events').slice(-8);
            if (targets.length < 2) {
                alert('近期“我们”记忆太少，暂时不用整理。');
                return;
            }
            if (archive.meta.refineInProgress) return;
            archive.meta.refineInProgress = true;
            persistArchive(rid, archive);

            const targetIds = new Set(targets.map(function (entry) { return String(entry.id || ''); }));
            const targetsDatePrefix = buildMemoryDatePrefix(
                targets.length ? targets[0].updatedAt || targets[0].createdAt : 0,
                targets.length ? targets[targets.length - 1].updatedAt || targets[targets.length - 1].createdAt : 0
            );
            const fallbackText = (function () {
                const merged = targets.map(function (entry) { return normalizeLine(entry.content); }).filter(Boolean).join('；');
                if (!merged) return '';
                const shortText = merged.length > 90 ? (merged.slice(0, 90) + '...') : merged;
                return targetsDatePrefix ? (targetsDatePrefix + '：' + shortText) : shortText;
            })();

            function finalize(refinedText) {
                archive.meta.refineInProgress = false;
                const cleanText = ensureEventDatePrefix(refinedText, targetsDatePrefix);
                if (cleanText) {
                    const survivors = (archive.entries || []).filter(function (entry) {
                        return !targetIds.has(String(entry && entry.id || ''));
                    });
                    survivors.push({ category: 'events', content: cleanText, source: 'refined' });
                    archive.entries = normalizeEntries(survivors);
                    archive.meta.updatedAt = Date.now();
                }
                persistArchive(rid, archive);
                refreshArchiveModal('events');
                alert(cleanText ? '近期关系记忆已整理。' : '这次没有整理出新的关系记忆。');
            }

            if (typeof window.callAISummary === 'function') {
                const profile = window.charProfiles[rid] || {};
                const userPersonaObj = (window.userPersonas && window.userPersonas[rid]) || {};
                const segmentText = targets.map(function (entry, index) {
                    return '最近关系记忆' + String(index + 1) + '：' + normalizeLine(entry.content);
                }).join('\n');
                window.callAISummary(
                    {
                        roleName: profile.nickName || profile.name || 'AI',
                        rolePrompt: profile.desc || '',
                        userPersona: userPersonaObj.setting || '',
                        userName: userPersonaObj.name || '',
                        userGender: userPersonaObj.gender || '',
                        segmentText: segmentText
                    },
                    function (res) {
                        const candidates = (res && Array.isArray(res.events) ? res.events : [])
                            .map(normalizeLine)
                            .filter(Boolean);
                        finalize(candidates[0] || fallbackText);
                    },
                    function () {
                        finalize(fallbackText);
                    }
                );
                return;
            }

            finalize(fallbackText);
        } catch (e) {
            console.error('[MemoryArchiveV2] refine failed', e);
        }
    };

    loadStore();
    Object.keys(window.memoryArchiveStore || {}).forEach(function (roleId) {
        ensureArchive(roleId);
    });
    saveStore();
})();
