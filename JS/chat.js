/* =========================================================
   文件路径：JS脚本文件夹/chat.js
   作用：聊天室全功能完整版 (修复闭环 + 保留所有原有功能)
   ========================================================= */

/* ================================
   目录:
   [SEC-01] 数据存储与全局状态
   [SEC-02] 核心引擎与聊天渲染
   [SEC-03] AI 触发与系统 Prompt
   [SEC-04] 角色状态监控与心情日志
   [SEC-05] AI 回复解析与消息写入
   [SEC-06] 地图编辑器与实时位置共享
   [SEC-07] 语音/视频通话（用户发起）
   [SEC-08] AI 主动来电与接听逻辑
   [SEC-09] 菜单、角色与用户设置
   [SEC-10] 闭环导航与图片工具
   ================================ */

/* === [SEC-01] 数据存储与全局状态 === */

const DB = {
    keys: {
        chatData: 'wechat_chatData',
        chatMapData: 'wechat_chatMapData',
        charProfiles: 'wechat_charProfiles',
        userPersonas: 'wechat_userPersonas',
        chatBackgrounds: 'wechat_backgrounds',
        callLogs: 'wechat_callLogs',
        chatUnread: 'wechat_unread',
        familyCards: 'wechat_family_cards'
    },
    isLargeStoreReady: function () {
        return !!(window.localforage && typeof window.localforage.getItem === 'function' && typeof window.localforage.setItem === 'function');
    },
    configLargeStore: function () {
        if (!window.localforage || typeof window.localforage.config !== 'function') return;
        try {
            window.localforage.config({
                name: 'shubao-phone',
                storeName: 'wechat'
            });
        } catch (e) { }
    },
    getLight: function (key) {
        return localStorage.getItem(key);
    },
    setLight: function (key, value) {
        localStorage.setItem(key, String(value));
    },
    removeLight: function (key) {
        localStorage.removeItem(key);
    },
    getCurrentChatRole: function () {
        return localStorage.getItem('currentChatId') || "";
    },
    setCurrentChatRole: function (roleId) {
        localStorage.setItem('currentChatId', roleId || "");
    }
};

function normalizeStoredValue(value, fallback) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') {
        try { return JSON.parse(value); } catch (e) { return fallback; }
    }
    if (typeof value !== 'object') return fallback;
    return value;
}

let initDataPromise = null;
async function initData(options) {
    const forceReload = !!(options && options.forceReload);
    if (!forceReload && initDataPromise) return initDataPromise;

    DB.configLargeStore();

    initDataPromise = (async function () {
        if (!DB.isLargeStoreReady()) {
            try {
                const savedProfiles = localStorage.getItem(DB.keys.charProfiles);
                const savedChatData = localStorage.getItem(DB.keys.chatData);
                const savedChatMapData = localStorage.getItem(DB.keys.chatMapData);
                const savedPersonas = localStorage.getItem(DB.keys.userPersonas);
                const savedBgs = localStorage.getItem(DB.keys.chatBackgrounds);
                const savedCallLogs = localStorage.getItem(DB.keys.callLogs);
                const savedUnread = localStorage.getItem(DB.keys.chatUnread);
                const savedFamilyCards = localStorage.getItem(DB.keys.familyCards);

                if (savedProfiles) window.charProfiles = normalizeStoredValue(savedProfiles, {});
                if (savedChatData) window.chatData = normalizeStoredValue(savedChatData, {});
                if (savedChatMapData) window.chatMapData = normalizeStoredValue(savedChatMapData, {});
                if (savedPersonas) window.userPersonas = normalizeStoredValue(savedPersonas, {});
                if (savedBgs) window.chatBackgrounds = normalizeStoredValue(savedBgs, {});
                if (savedCallLogs) window.callLogs = normalizeStoredValue(savedCallLogs, {});
                if (savedUnread) window.chatUnread = normalizeStoredValue(savedUnread, {});
                if (savedFamilyCards) window.familyCardState = normalizeStoredValue(savedFamilyCards, {});
            } catch (e) { console.error("读取存档失败", e); }
            return;
        }

        const keys = Object.values(DB.keys);
        for (const key of keys) {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const value = normalizeStoredValue(raw, {});
            try {
                await window.localforage.setItem(key, value);
                localStorage.removeItem(key);
            } catch (e) {
                console.error("迁移存档失败", key, e);
            }
        }

        const values = await Promise.all(keys.map(k => window.localforage.getItem(k)));
        const byKey = {};
        for (let i = 0; i < keys.length; i++) {
            byKey[keys[i]] = values[i];
        }

        window.charProfiles = normalizeStoredValue(byKey[DB.keys.charProfiles], window.charProfiles || {});
        window.chatData = normalizeStoredValue(byKey[DB.keys.chatData], window.chatData || {});
        window.chatMapData = normalizeStoredValue(byKey[DB.keys.chatMapData], window.chatMapData || {});
        window.userPersonas = normalizeStoredValue(byKey[DB.keys.userPersonas], window.userPersonas || {});
        window.chatBackgrounds = normalizeStoredValue(byKey[DB.keys.chatBackgrounds], window.chatBackgrounds || {});
        window.callLogs = normalizeStoredValue(byKey[DB.keys.callLogs], window.callLogs || {});
        window.chatUnread = normalizeStoredValue(byKey[DB.keys.chatUnread], window.chatUnread || {});
        window.familyCardState = normalizeStoredValue(byKey[DB.keys.familyCards], window.familyCardState || {});
    })();

    try {
        return await initDataPromise;
    } catch (e) {
        if (!forceReload) initDataPromise = null;
        throw e;
    }
}

let saveDataTimerId = null;
let saveDataWaiters = [];

async function flushSaveData() {
    DB.configLargeStore();

    if (!DB.isLargeStoreReady()) {
        localStorage.setItem(DB.keys.charProfiles, JSON.stringify(window.charProfiles));
        localStorage.setItem(DB.keys.chatData, JSON.stringify(window.chatData));
        localStorage.setItem(DB.keys.chatMapData, JSON.stringify(window.chatMapData));
        localStorage.setItem(DB.keys.userPersonas, JSON.stringify(window.userPersonas));
        localStorage.setItem(DB.keys.chatBackgrounds, JSON.stringify(window.chatBackgrounds));
        localStorage.setItem(DB.keys.callLogs, JSON.stringify(window.callLogs));
        localStorage.setItem(DB.keys.chatUnread, JSON.stringify(window.chatUnread));
        localStorage.setItem(DB.keys.familyCards, JSON.stringify(window.familyCardState));
        return;
    }

    await Promise.all([
        window.localforage.setItem(DB.keys.charProfiles, window.charProfiles || {}),
        window.localforage.setItem(DB.keys.chatData, window.chatData || {}),
        window.localforage.setItem(DB.keys.chatMapData, window.chatMapData || {}),
        window.localforage.setItem(DB.keys.userPersonas, window.userPersonas || {}),
        window.localforage.setItem(DB.keys.chatBackgrounds, window.chatBackgrounds || {}),
        window.localforage.setItem(DB.keys.callLogs, window.callLogs || {}),
        window.localforage.setItem(DB.keys.chatUnread, window.chatUnread || {}),
        window.localforage.setItem(DB.keys.familyCards, window.familyCardState || {})
    ]);
}

async function saveData() {
    return new Promise(function (resolve, reject) {
        saveDataWaiters.push({ resolve: resolve, reject: reject });

        if (saveDataTimerId) {
            clearTimeout(saveDataTimerId);
        }

        saveDataTimerId = setTimeout(async function () {
            const waiters = saveDataWaiters.slice();
            saveDataWaiters = [];
            saveDataTimerId = null;

            try {
                await flushSaveData();
                waiters.forEach(w => w.resolve());
            } catch (e) {
                waiters.forEach(w => w.reject(e));
            }
        }, 1000);
    });
}

window.initData = initData;
window.saveData = saveData;
initData().catch(function (e) { console.error(e); });

// --- 全局变量 ---
window.chatData = window.chatData || {};
window.chatMapData = window.chatMapData || {};
window.charProfiles = window.charProfiles || {};
window.userPersonas = window.userPersonas || {};
window.chatBackgrounds = window.chatBackgrounds || {};
window.callLogs = window.callLogs || {};
window.currentChatRole = localStorage.getItem('currentChatId') || "";
window.stickerData = window.stickerData || {
    mine: [],
    his: [],
    general: []
};
window.voiceCallState = window.voiceCallState || {
    active: false,
    connected: false,
    seconds: 0,
    roleId: "",
    timerId: null,
    connectTimeoutId: null,
    chatSyncIntervalId: null,
    isVideo: false,
    userCameraStream: null,
    userCameraOn: false,
    facingMode: 'user'
};
window.isVoiceCallActive = window.isVoiceCallActive || false;
window.voiceCallHistory = window.voiceCallHistory || [];
window.editVideoAlbumData = window.editVideoAlbumData || [];
window.chatUnread = window.chatUnread || {};
window.familyCardState = window.familyCardState || { receivedCards: [], sentCards: [] };
window.virtualPhotoImagePath = window.virtualPhotoImagePath || 'assets/images/chatphoto.jpg';
try {
    var storedStickerRaw = localStorage.getItem('stickerData');
    if (storedStickerRaw) {
        var parsedSticker = JSON.parse(storedStickerRaw);
        if (parsedSticker && typeof parsedSticker === 'object') {
            window.stickerData = parsedSticker;
        }
    }
} catch (e) { }

function normalizeFamilyCardState(raw) {
    const obj = raw && typeof raw === 'object' ? raw : {};
    const receivedCards = Array.isArray(obj.receivedCards) ? obj.receivedCards : [];
    const sentCards = Array.isArray(obj.sentCards) ? obj.sentCards : [];
    return { receivedCards, sentCards };
}

function ensureFamilyCardState() {
    window.familyCardState = normalizeFamilyCardState(window.familyCardState);
    return window.familyCardState;
}

function normalizeFamilyCardAmount(amount) {
    const n = typeof amount === 'number' ? amount : parseFloat(String(amount || '').trim());
    if (isNaN(n) || !isFinite(n) || n <= 0) return '';
    return n.toFixed(2);
}

function resolveFamilyCardRoleName(roleId) {
    const id = String(roleId || '').trim();
    if (!id) return '未知';
    const profiles = window.charProfiles || {};
    const p = profiles && typeof profiles === 'object' ? profiles[id] : null;
    if (p && typeof p === 'object') {
        const name = p.remark || p.remarkName || p.alias || p.nickName || p.name;
        if (name) return String(name).trim() || id;
    }
    return id;
}

function getFamilyCardWalletBalance() {
    try {
        if (window.Wallet && typeof window.Wallet.getData === 'function') {
            const d = window.Wallet.getData();
            const n = d && typeof d.totalAssets === 'number' ? d.totalAssets : parseFloat(String(d && d.totalAssets !== undefined ? d.totalAssets : '0'));
            if (!isNaN(n) && isFinite(n) && n > 0) return n;
            return 0;
        }
    } catch (e) { }
    try {
        const raw = localStorage.getItem('wechat_wallet');
        if (raw) {
            const parsed = JSON.parse(raw);
            const n = parsed && typeof parsed.totalAssets === 'number' ? parsed.totalAssets : parseFloat(String(parsed && parsed.totalAssets !== undefined ? parsed.totalAssets : '0'));
            if (!isNaN(n) && isFinite(n) && n > 0) return n;
        }
    } catch (e) { }
    return 0;
}

function getFamilyCardReceivedQuotaTotal() {
    const state = ensureFamilyCardState();
    const list = Array.isArray(state.receivedCards) ? state.receivedCards : [];
    let sum = 0;
    for (let i = 0; i < list.length; i++) {
        const card = list[i];
        const n = card && (typeof card.amount === 'number' ? card.amount : parseFloat(String(card.amount || '').trim()));
        if (!isNaN(n) && isFinite(n) && n > 0) sum += n;
    }
    return sum;
}

function showCenterToast(text) {
    const message = String(text || '').trim();
    if (!message) return;
    let el = document.getElementById('center-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'center-toast';
        el.className = 'center-toast';
        document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    if (el._hideTimer) {
        clearTimeout(el._hideTimer);
    }
    el._hideTimer = setTimeout(function () {
        el.classList.remove('show');
    }, 1800);
}

function makeChatMessageId(seedTs) {
    const ts = typeof seedTs === 'number' && isFinite(seedTs) && seedTs > 0 ? seedTs : Date.now();
    return 'm_' + ts.toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function ensureChatMessageId(msg) {
    if (!msg || typeof msg !== 'object') return '';
    const existing = msg.id != null ? String(msg.id).trim() : '';
    if (existing) {
        msg.id = existing;
        return existing;
    }
    const next = makeChatMessageId(typeof msg.timestamp === 'number' ? msg.timestamp : Date.now());
    msg.id = next;
    return next;
}

function getMessagePlainText(msg) {
    if (!msg) return '';
    if (msg.type === 'text' || !msg.type) return String(msg.content || '');
    if (msg.type === 'image') return '[图片]';
    if (msg.type === 'voice') return '[语音]';
    if (msg.type === 'transfer') return '[转账]';
    if (msg.type === 'redpacket') return '[红包]';
    if (msg.type === 'family_card') return '[亲属卡]';
    return String(msg.content || '');
}

function resolveDisplayNameByRoleId(roleId) {
    const profile = (window.charProfiles && window.charProfiles[roleId]) ? window.charProfiles[roleId] : {};
    return String(profile.remark || profile.nickName || profile.name || roleId || 'TA');
}

function resolveMessageSenderName(roleId, msg) {
    if (msg && msg.role === 'me') {
        const p = getCurrentUserProfile();
        return p.name || '我';
    }
    return resolveDisplayNameByRoleId(roleId);
}

function resolveQuoteBlockForMessage(roleId, msg) {
    if (!msg || typeof msg !== 'object') return;
    const quoteId = msg.quoteId != null ? String(msg.quoteId).trim() : '';
    if (!quoteId) return;
    if (msg.quote && msg.quote.text) return;
    const list = window.chatData && window.chatData[roleId];
    if (!Array.isArray(list)) return;
    let quoted = null;
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (!m) continue;
        if (String(m.id || '') === quoteId) {
            quoted = m;
            break;
        }
    }
    if (!quoted) return;
    msg.quote = {
        name: resolveMessageSenderName(roleId, quoted),
        text: getMessagePlainText(quoted)
    };
}

window.scrollToChatMessageById = function (msgId) {
    const id = String(msgId || '').trim();
    if (!id) return false;
    const historyBox = document.getElementById('chat-history');
    if (!historyBox) return false;
    const nodes = historyBox.querySelectorAll('[data-msg-id]');
    let target = null;
    for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        if (!el) continue;
        if (String(el.getAttribute('data-msg-id') || '') === id) {
            target = el;
            break;
        }
    }
    if (!target) {
        showCenterToast('未找到该引用消息（可能在更早历史）');
        return false;
    }
    try {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
        try {
            target.scrollIntoView();
        } catch (e2) { }
    }
    try {
        target.classList.add('msg-jump-highlight');
        if (target._jumpTimer) clearTimeout(target._jumpTimer);
        target._jumpTimer = setTimeout(function () {
            target.classList.remove('msg-jump-highlight');
        }, 900);
    } catch (e3) { }
    return true;
};

function loadFavoritesState() {
    try {
        const raw = localStorage.getItem('wechat_favorites_v2');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) { }
    try {
        const legacyRaw = localStorage.getItem('wechat_favorites');
        if (legacyRaw) {
            const legacy = JSON.parse(legacyRaw);
            if (Array.isArray(legacy)) {
                const migrated = legacy.map(function (x) {
                    const ts = x && typeof x.date === 'number' ? x.date : Date.now();
                    return {
                        id: makeChatMessageId(ts),
                        roleId: x && x.from ? String(x.from) : '',
                        messageId: '',
                        senderName: '',
                        senderAvatar: '',
                        senderRole: '',
                        content: x && x.text ? String(x.text) : '',
                        type: 'text',
                        timestamp: ts
                    };
                });
                localStorage.setItem('wechat_favorites_v2', JSON.stringify(migrated));
                return migrated;
            }
        }
    } catch (e2) { }
    return [];
}

function saveFavoritesState(list) {
    try {
        localStorage.setItem('wechat_favorites_v2', JSON.stringify(Array.isArray(list) ? list : []));
    } catch (e) { }
}

function buildFavoriteItem(roleId, msg) {
    const rid = String(roleId || '').trim();
    const m = msg && typeof msg === 'object' ? msg : {};
    const ts = typeof m.timestamp === 'number' && isFinite(m.timestamp) ? m.timestamp : Date.now();
    const messageId = ensureChatMessageId(m);
    const senderName = resolveMessageSenderName(rid, m);
    let senderAvatar = '';
    if (m.role === 'me') {
        senderAvatar = getCurrentUserProfile().avatar || 'assets/chushitouxiang.jpg';
    } else {
        const profile = window.charProfiles && window.charProfiles[rid] ? window.charProfiles[rid] : {};
        senderAvatar = profile.avatar || 'assets/chushitouxiang.jpg';
    }
    return {
        id: makeChatMessageId(ts),
        roleId: rid,
        messageId: messageId,
        senderName: senderName,
        senderAvatar: senderAvatar,
        senderRole: String(m.role || ''),
        content: getMessagePlainText(m),
        type: String(m.type || 'text'),
        timestamp: ts
    };
}

window.favorites = loadFavoritesState();
window.getFavorites = function () {
    return Array.isArray(window.favorites) ? window.favorites.slice() : [];
};
window.addFavoriteMessage = function (roleId, msg) {
    if (!roleId || !msg) return null;
    if (!Array.isArray(window.favorites)) window.favorites = [];
    const item = buildFavoriteItem(roleId, msg);
    window.favorites = window.favorites.concat([item]).slice(-800);
    saveFavoritesState(window.favorites);
    return item;
};
window.removeFavoriteById = function (favId) {
    const id = String(favId || '').trim();
    if (!id || !Array.isArray(window.favorites)) return false;
    const next = window.favorites.filter(function (x) { return String(x && x.id || '') !== id; });
    window.favorites = next;
    saveFavoritesState(window.favorites);
    return true;
};

function createFamilyCardMessage(role, amount, timestamp, peerRoleId) {
    const amt = normalizeFamilyCardAmount(amount);
    if (!amt) return null;
    const rid = String(peerRoleId || '').trim();
    return {
        role: role === 'me' ? 'me' : 'ai',
        type: 'family_card',
        amount: amt,
        timestamp: timestamp || Date.now(),
        status: role === 'me' ? 'sent' : 'pending',
        fromRoleId: role === 'me' ? undefined : (rid || undefined),
        toRoleId: role === 'me' ? (rid || undefined) : undefined
    };
}

function addReceivedFamilyCard(fromRoleId, amount, timestamp) {
    const state = ensureFamilyCardState();
    const amt = normalizeFamilyCardAmount(amount);
    if (!fromRoleId || !amt) return null;
    const card = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        fromRoleId: String(fromRoleId || '').trim(),
        amount: amt,
        timestamp: timestamp || Date.now()
    };
    state.receivedCards = state.receivedCards.concat([card]).slice(-500);
    window.familyCardState = state;
    return card;
}

function addSentFamilyCard(toRoleId, amount, timestamp) {
    const state = ensureFamilyCardState();
    const amt = normalizeFamilyCardAmount(amount);
    if (!toRoleId || !amt) return null;
    const card = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        toRoleId: String(toRoleId || '').trim(),
        amount: amt,
        timestamp: timestamp || Date.now()
    };
    state.sentCards = state.sentCards.concat([card]).slice(-500);
    window.familyCardState = state;
    return card;
}

function pushChatMessageToRole(roleId, msg) {
    const id = String(roleId || '').trim();
    if (!id || !msg) return false;
    if (!window.chatData || typeof window.chatData !== 'object') window.chatData = {};
    if (!Array.isArray(window.chatData[id])) window.chatData[id] = [];
    window.chatData[id].push(msg);
    if (String(window.currentChatRole || '') === id) {
        appendMessageToDOM(msg);
    }
    return true;
}

window.FamilyCard = window.FamilyCard || {};
window.FamilyCard.getState = ensureFamilyCardState;
window.FamilyCard.addReceived = addReceivedFamilyCard;
window.FamilyCard.addSent = addSentFamilyCard;
window.FamilyCard.buildMessage = createFamilyCardMessage;
window.FamilyCard.sendToRole = function (roleId, amount) {
    const id = String(roleId || '').trim();
    const msg = createFamilyCardMessage('me', amount, Date.now(), id);
    if (!id || !msg) return null;

    const sendAmountNum = parseFloat(String(msg.amount || '').trim());
    if (isNaN(sendAmountNum) || !isFinite(sendAmountNum) || sendAmountNum <= 0) return null;

    const walletBalance = getFamilyCardWalletBalance();
    const receivedTotal = getFamilyCardReceivedQuotaTotal();
    const maxSendable = walletBalance + receivedTotal;
    if (sendAmountNum - maxSendable > 0.000001) {
        showCenterToast('当前可用总资产不足');
        return null;
    }

    let remaining = sendAmountNum;
    const walletUsed = Math.min(walletBalance, remaining);
    if (walletUsed > 0.000001) {
        const usedRounded = Math.round(walletUsed * 100) / 100;
        try {
            if (window.Wallet && typeof window.Wallet.addTransaction === 'function') {
                window.Wallet.addTransaction('expense', '赠送亲属卡', usedRounded, 'other', {
                    peerName: resolveFamilyCardRoleName(id),
                    peerRoleId: id,
                    kind: 'family_card'
                });
            } else {
                const raw = localStorage.getItem('wechat_wallet');
                const parsed = raw ? JSON.parse(raw) : {};
                const data = parsed && typeof parsed === 'object' ? parsed : {};
                const base = typeof data.totalAssets === 'number' ? data.totalAssets : parseFloat(String(data.totalAssets || '0'));
                const safeBase = !isNaN(base) && isFinite(base) ? base : 0;
                data.totalAssets = Math.max(0, safeBase - usedRounded);
                localStorage.setItem('wechat_wallet', JSON.stringify(data));
            }
        } catch (e) { }
        remaining -= usedRounded;
    }

    if (remaining > 0.000001) {
        const state = ensureFamilyCardState();
        const cards = Array.isArray(state.receivedCards) ? state.receivedCards.slice() : [];
        cards.sort(function (a, b) {
            const ta = a && typeof a.timestamp === 'number' ? a.timestamp : 0;
            const tb = b && typeof b.timestamp === 'number' ? b.timestamp : 0;
            return ta - tb;
        });
        const updated = [];
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            if (!card || typeof card !== 'object') continue;
            const cardAmtNum = typeof card.amount === 'number' ? card.amount : parseFloat(String(card.amount || '').trim());
            const safeAmt = !isNaN(cardAmtNum) && isFinite(cardAmtNum) && cardAmtNum > 0 ? cardAmtNum : 0;
            if (remaining <= 0.000001) {
                if (safeAmt > 0) {
                    updated.push(card);
                }
                continue;
            }
            const used = Math.min(safeAmt, remaining);
            const newAmt = safeAmt - used;
            remaining -= used;
            if (newAmt > 0.000001) {
                const next = Object.assign({}, card, { amount: (Math.round(newAmt * 100) / 100).toFixed(2) });
                updated.push(next);
            }
        }
        state.receivedCards = updated.slice(-500);
        window.familyCardState = state;
    }

    addSentFamilyCard(id, msg.amount, msg.timestamp);
    pushChatMessageToRole(id, msg);
    saveData();
    return msg;
};
window.FamilyCard.receiveFromRole = function (roleId, amount, options) {
    const id = String(roleId || '').trim();
    const msg = createFamilyCardMessage('ai', amount, Date.now(), id);
    if (!id || !msg) return null;
    const shouldAppend = !(options && options.appendToDom === false);
    if (shouldAppend) {
        pushChatMessageToRole(id, msg);
        saveData();
    }
    return msg;
};

window.roleStatusStore = window.roleStatusStore || {};
window.currentRoleStatus = window.currentRoleStatus || null;
window.statusMonitorTimerId = window.statusMonitorTimerId || null;
window.statusHeartBeatBase = window.statusHeartBeatBase || null;
try {
    var storedStatusRaw = localStorage.getItem('wechat_roleStatusStore');
    if (storedStatusRaw) {
        var parsedStatus = JSON.parse(storedStatusRaw);
        if (parsedStatus && typeof parsedStatus === 'object') {
            window.roleStatusStore = parsedStatus;
        }
    }
} catch (e) { }
window.roleStatusHistory = window.roleStatusHistory || {};
try {
    var storedStatusHistoryRaw = localStorage.getItem('wechat_roleStatusHistory');
    if (storedStatusHistoryRaw) {
        var parsedStatusHistory = JSON.parse(storedStatusHistoryRaw);
        if (parsedStatusHistory && typeof parsedStatusHistory === 'object') {
            window.roleStatusHistory = parsedStatusHistory;
        }
    }
} catch (e) { }

function formatChatTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0'); // 新增秒
    return `${hours}:${minutes}:${seconds}`;
}

function injectDiceStyles() {
    const styleId = 'chat-dice-style';
    const oldStyle = document.getElementById(styleId);
    if (oldStyle) oldStyle.remove();

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* 骰子容器：给它3D空间 */
        .msg-bubble:has(.dice-icon) {
            perspective: 800px; /* 3D透视距离 */
            background: transparent !important;
            box-shadow: none !important;
            padding: 5px !important;
        }

        /* 骰子本体：圆润方块 + 渐变 + 阴影 */
        .dice-icon {
            font-size: 60px;
            display: inline-block;
            transform-style: preserve-3d; /* 启用3D */
            transform-origin: center center;
            
            /* 🎨 立体效果核心：渐变背景 + 多层阴影 */
            background: linear-gradient(145deg, #ffffff, #e8e8e8);
            border-radius: 12px;
            padding: 8px;
            box-shadow: 
                4px 4px 12px rgba(0,0,0,0.2),    /* 主阴影 */
                -2px -2px 6px rgba(255,255,255,0.7), /* 高光 */
                inset 2px 2px 4px rgba(0,0,0,0.1); /* 内凹陷 */
            
            /* 边框增强立体感 */
            border: 1px solid rgba(0,0,0,0.1);
        }

        /* 🎬 动画：3D旋转 + 弹跳 */
        .dice-anim {
            animation: dice-roll-3d 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        @keyframes dice-roll-3d {
            /* 阶段1：飞入 + 狂转（0-50%）*/
            0% {
                transform: scale(0.3) rotateX(720deg) rotateY(720deg);
                opacity: 0;
            }
            
            /* 阶段2：接近落地（60%）*/
            60% {
                transform: scale(1.15) rotateX(360deg) rotateY(360deg);
                opacity: 1;
            }
            
            /* 阶段3：触底反弹（75%）*/
            75% {
                transform: scale(0.95) rotateX(380deg) rotateY(370deg);
            }
            
            /* 阶段4：二次小弹（85%）*/
            85% {
                transform: scale(1.02) rotateX(365deg) rotateY(365deg);
            }
            
            /* 阶段5：停稳（100%）*/
            100% {
                transform: scale(1) rotateX(360deg) rotateY(360deg);
                opacity: 1;
            }
        }

        
    `;
    document.head.appendChild(style);
}



/* === [SEC-02] 核心引擎与聊天渲染 === */

// =========================================================
// === 1. 核心引擎：启动与聊天渲染 ===
// =========================================================

document.addEventListener('DOMContentLoaded', async function () {
    injectDiceStyles();
    try {
        await initData();
    } catch (e) {
        console.error(e);
    }

    // 🛑 紧急修复：防死循环逻辑
    // 如果没有当前角色ID，说明用户刚打开网页，应该显示"桌面/列表"，而不是报错
    if (!window.currentChatRole) {
        console.log("当前无角色，停留在桌面");

        // 确保显示桌面，隐藏聊天室
        const desktop = document.getElementById('desktop-view');
        const chatView = document.getElementById('chat-view');

        if (desktop) desktop.style.display = 'block';
        if (chatView) chatView.style.display = 'none';

        return; // 直接结束，不弹窗，不刷新！
    }

    // 只有当"真的有角色ID"（比如用户刷新了聊天页面）时，才自动进入聊天
    enterChat(window.currentChatRole);
});


// 进入聊天室
function enterChat(roleId) {
    const chatRoom = document.getElementById('chat-room-layer');
    const chatTitle = document.getElementById('current-chat-name');
    const historyBox = document.getElementById('chat-history');

    if (chatRoom || historyBox) {
        window.currentChatRole = roleId;
        const profile = window.charProfiles[roleId] || { nickName: "未知角色" };

        // 1. 设置顶部标题
        if (chatTitle) chatTitle.innerText = (profile.remark || profile.nickName || roleId);
        const oldHeaderAvatar = document.getElementById('current-chat-avatar');
        if (oldHeaderAvatar) oldHeaderAvatar.remove();

        applyChatBackground(roleId);
        if (typeof window.applyChatBubbleCssFromSettings === 'function') {
            window.applyChatBubbleCssFromSettings(roleId);
        }

        // ... 在 enterChat 函数内 ...

        // 3. 渲染历史记录
        historyBox.innerHTML = "";
        window.lastRenderedTime = 0;

        let historyData = window.chatData[roleId];
        if (!Array.isArray(historyData)) {
            historyData = [];
            window.chatData[roleId] = [];
        }

        // === 【核心优化】只渲染最后 50 条，防止卡顿 ===
        const RENDER_LIMIT = 50;
        const totalCount = historyData.length;
        const startIndex = Math.max(0, totalCount - RENDER_LIMIT);
        const renderList = historyData.slice(startIndex);

        // 如果有隐藏的历史记录，显示“查看更多”按钮
        if (startIndex > 0) {
            const loadMoreBtn = document.createElement('div');
            loadMoreBtn.className = 'chat-time-label'; // 复用时间标签样式，比较美观
            loadMoreBtn.style.cursor = 'pointer';
            loadMoreBtn.style.color = '#576b95'; // 微信蓝
            loadMoreBtn.innerText = `查看更多历史消息 (${startIndex} 条未显示)`;
            loadMoreBtn.onclick = function () {
                // 优化：分批加载历史消息，避免一次性渲染导致的卡顿
                loadMoreBtn.innerText = "加载中...";
                loadMoreBtn.style.pointerEvents = 'none'; // 防止重复点击
                
                // 分批加载历史消息（每次加载20条）
                const BATCH_SIZE = 20;
                let currentBatch = 0;
                const totalBatches = Math.ceil(startIndex / BATCH_SIZE);
                
                function loadNextBatch() {
                    const batchStart = startIndex - (currentBatch + 1) * BATCH_SIZE;
                    const batchEnd = startIndex - currentBatch * BATCH_SIZE;
                    const batchMessages = historyData.slice(Math.max(0, batchStart), batchEnd);
                    
                    // 在顶部插入消息（保持原有顺序）
                    const fragment = document.createDocumentFragment();
                    batchMessages.forEach(msg => {
                        const row = createMessageRow(msg);
                        if (row) {
                            fragment.appendChild(row);
                        }
                    });
                    
                    // 插入到现有消息之前
                    const firstChild = historyBox.firstChild;
                    if (firstChild) {
                        historyBox.insertBefore(fragment, firstChild);
                    } else {
                        historyBox.appendChild(fragment);
                    }
                    
                    currentBatch++;
                    
                    if (currentBatch < totalBatches) {
                        // 继续加载下一批
                        loadMoreBtn.innerText = `加载中... (${currentBatch}/${totalBatches})`;
                        setTimeout(loadNextBatch, 100); // 延迟100ms加载下一批
                    } else {
                        // 全部加载完成，移除按钮
                        loadMoreBtn.remove();
                    }
                }
                
                // 开始加载第一批
                setTimeout(loadNextBatch, 50);
            };
            historyBox.appendChild(loadMoreBtn);
        }

        // 渲染本次切片的消息
        renderList.forEach(msg => {
            appendMessageToDOM(msg);
        });

        // 滚到底部
        setTimeout(() => {
            historyBox.scrollTop = historyBox.scrollHeight;
        }, 100);

    }

    try {
        const raw = localStorage.getItem('listen_together_pending_ai') || '';
        if (raw) {
            const p = JSON.parse(raw);
            if (p && String(p.roleId || '') === String(roleId || '') && p.inviteId) {
                localStorage.removeItem('listen_together_pending_ai');
                setTimeout(function () {
                    if (String(window.currentChatRole || '') === String(roleId || '')) {
                        triggerAI();
                    }
                }, 180);
            }
        }
    } catch (e) { }
}

// =========================================================
// 🔄 替换开始：sendMessage (修复版：发完保持键盘不收起)
// =========================================================
function sendMessage() {
    const roleId = window.currentChatRole;
    const input = document.getElementById('msg-input');
    if (!roleId) return;
    if (!input) return;
    const text = String(input.value || '').trim();
    if (!text) return;

    const historyData = (window.chatData && window.chatData[roleId]) ? window.chatData[roleId] : [];
    const lastMsg = historyData.length > 0 ? historyData[historyData.length - 1] : null;

    // 如果最后一条是系统阻断消息，且时间间隔在一定范围内（比如1小时内），进行拦截
    if (lastMsg && lastMsg.type === 'system_event' &&
        (lastMsg.content.includes('睡觉') || lastMsg.content.includes('勿扰') || lastMsg.content.includes('忙'))) {

        const now = Date.now();
        const lastAt = lastMsg.timestamp ? Number(lastMsg.timestamp) : 0;
        const diffMins = lastAt > 0 ? ((now - lastAt) / 1000 / 60) : 9999;

        // 如果距离上次阻断不到 60 分钟，且没有被“吵醒”（可以通过 localStorage 记录计数）
        const wakeUpKey = `wake_up_count_${roleId}`;
        let wakeUpCount = parseInt(localStorage.getItem(wakeUpKey) || "0");

        // 如果计数还没到吵醒的阈值 (比如 5)，则弹窗提示并拦截
        if (wakeUpCount < 4 && diffMins < 60) {
            // 弹窗提示
            alert(`对方正在睡觉或忙碌中...\n\n(连续发送多条消息可能会吵醒TA)`);
            // 增加计数，这样用户多发几次就能触发 API 吵醒了
            localStorage.setItem(wakeUpKey, (wakeUpCount + 1).toString());
            return;
        }
    }

    // 【修改点】记录当前时间戳
    const now = Date.now();
    const userMsg = {
        role: 'me',
        content: text,
        type: 'text',
        timestamp: now, // 👈 加上这行
        status: 'sent'
    };

    ensureChatMessageId(userMsg);

    const quoteInfo = window.currentQuoteInfo && typeof window.currentQuoteInfo === 'object' ? window.currentQuoteInfo : null;
    if (quoteInfo && quoteInfo.quoteId) {
        userMsg.quoteId = String(quoteInfo.quoteId);
        userMsg.quote = {
            name: String(quoteInfo.name || 'TA'),
            text: String(quoteInfo.text || '')
        };
        if (typeof window.cancelQuote === 'function') {
            window.cancelQuote();
        } else {
            window.currentQuoteInfo = null;
        }
    }

    const layer = document.getElementById('location-share-layer');
    const state = layer && layer._locationShareState ? layer._locationShareState : null;
    if (state && state.travelStatus === 'moving' && state.travelDurationMs > 0 && state.travelStartTime > 0) {
        const nowTs = Date.now();
        let remainingMs = state.travelDurationMs - (nowTs - state.travelStartTime);
        if (remainingMs < 0) remainingMs = 0;
        let distanceMeters = null;
        if (state.travelTotalDistanceMeters !== null && state.travelDurationMs > 0) {
            const ratio = remainingMs <= 0 ? 0 : remainingMs / state.travelDurationMs;
            distanceMeters = Math.max(0, Math.round(state.travelTotalDistanceMeters * ratio));
        }
        const sec = Math.ceil(remainingMs / 1000);
        const min = Math.floor(sec / 60);
        const s = sec % 60;
        const minStr = min > 0 ? min + ' 分 ' : '';
        const timeText = minStr + s + ' 秒';
        let distText = '';
        if (distanceMeters !== null) {
            if (distanceMeters >= 1000) {
                distText = (distanceMeters / 1000).toFixed(1).replace(/\.0$/, '') + ' 公里';
            } else {
                distText = distanceMeters + ' 米';
            }
        } else {
            distText = '未知距离';
        }
        const modeLabel = getLocationShareModeLabel(state.travelMode);
        userMsg.aiHint = `[系统提示：你正在${modeLabel}前往用户，距离约 ${distText}，还有 ${timeText}。你必须清晰地意识到自己还在路上，不能说已经到达或马上就在眼前。请结合当前出行方式，自然描写周围环境或身体状态，例如车内环境、脚步声或喘气等。]`;
    }

    // 初始化数组防止报错
    if (!window.chatData || typeof window.chatData !== 'object') window.chatData = {};
    if (!window.chatData[roleId]) window.chatData[roleId] = [];

    // 存入数据
    window.chatData[roleId].push(userMsg);
    // 上屏
    appendMessageToDOM(userMsg);

    input.value = ''; // 清空输入框
    saveData(); // 保存数据

    // 🔥 核心修改：强制让光标回到输入框，防止键盘收起
    // SetTimeout 是为了兼容部分手机浏览器的渲染时序
    setTimeout(() => {
        input.focus();
    }, 10);

    console.log("消息已发送，等待魔法棒触发回复...");
}

function buildWorldBookPrompt(worldbookIds) {
    if (!worldbookIds) return '';
    const ids = Array.isArray(worldbookIds) ? worldbookIds : [String(worldbookIds || '').trim()];
    if (!window.worldBooks) return '';

    let totalPrompt = '';
    ids.forEach(id => {
        const wbId = String(id || '').trim();
        if (!wbId) return;

        if (wbId.startsWith('cat:') || wbId.startsWith('CATEGORY:')) {
            const targetCat = wbId.includes(':') ? wbId.split(':')[1] : wbId;
            const allIds = Object.keys(window.worldBooks || {});
            const catBooks = allIds
                .map(bid => ({ ...window.worldBooks[bid], id: bid }))
                .filter(b => {
                    if (!b) return false;
                    const bCat = b.category ? String(b.category).trim() : '未分类';
                    return bCat === targetCat;
                });

            if (catBooks.length > 0) {
                totalPrompt += `\n\n【🌍 当前世界观设定集分类：${targetCat}】\n`;
                catBooks.forEach((b, index) => {
                    const title = b && b.title ? String(b.title) : `设定 ${index + 1}`;
                    const content = b && b.content ? String(b.content) : '(无内容)';
                    totalPrompt += `\n--- [设定: ${title}] ---\n${content}\n`;
                });
            }
            return;
        }

        const wb = window.worldBooks[wbId];
        if (wb) {
            totalPrompt += `\n\n【🌍 当前场景/世界观设定】\n标题：${wb.title}\n内容：${wb.content}`;
        }
    });

    if (totalPrompt) {
        totalPrompt += `\n请基于以上选中的世界观设定进行叙事。`;
    }
    return totalPrompt;
}

function getCurrentUserProfile() {
    let avatar = '';
    let name = '';
    try {
        if (window.MineProfile && typeof window.MineProfile.getProfile === 'function') {
            const p = window.MineProfile.getProfile() || {};
            avatar = p.avatar || '';
            name = p.name || '';
        }
    } catch (e) { }
    if (!avatar) {
        try { avatar = localStorage.getItem('user_avatar') || ''; } catch (e) { }
    }
    if (!name) {
        try { name = localStorage.getItem('user_name') || ''; } catch (e) { }
    }
    if (!avatar) avatar = 'assets/chushitouxiang.jpg';
    if (!name) name = '我';
    return { avatar: avatar, name: name };
}

function makeInviteId() {
    return 'lt_' + Date.now() + '_' + Math.random().toString(16).slice(2);
}

function findInviteMessage(roleId, inviteId) {
    const list = window.chatData && window.chatData[roleId];
    if (!Array.isArray(list)) return null;
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (m && m.type === 'listen_invite' && String(m.inviteId || '') === String(inviteId || '')) return m;
    }
    return null;
}

function findLatestPendingInviteId(roleId) {
    const list = window.chatData && window.chatData[roleId];
    if (!Array.isArray(list)) return '';
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (!m) continue;
        if (m.type !== 'listen_invite') continue;
        if (String(m.inviteStatus || 'pending') !== 'pending') continue;
        const id = String(m.inviteId || '').trim();
        if (id) return id;
    }
    return '';
}

function sendInvite(payload) {
    const roleId = (payload && payload.roleId) ? String(payload.roleId) : String(window.currentChatRole || '');
    if (!roleId) return;

    let p = getCurrentUserProfile();
    if (payload && typeof payload === 'object') {
        const pvName = payload.userName ? String(payload.userName) : '';
        const pvAvatar = payload.userAvatar ? String(payload.userAvatar) : '';
        if (pvName || pvAvatar) {
            p = { name: pvName || p.name, avatar: pvAvatar || p.avatar };
        }
    }
    const inviteId = makeInviteId();
    const now = Date.now();

    const track = payload && payload.track && typeof payload.track === 'object' ? payload.track : null;
    const msg = {
        role: 'me',
        type: 'listen_invite',
        timestamp: now,
        status: 'sent',
        inviteId: inviteId,
        inviteStatus: 'pending',
        userName: p.name,
        userAvatar: p.avatar,
        track: track
    };

    if (!window.chatData[roleId]) window.chatData[roleId] = [];
    window.chatData[roleId].push(msg);
    saveData();

    try {
        localStorage.setItem('listen_together_pending_ai', JSON.stringify({
            roleId: roleId,
            inviteId: inviteId,
            at: now
        }));
    } catch (e) { }

    if (String(window.currentChatRole || '') === roleId) {
        appendMessageToDOM(msg);
        const historyBox = document.getElementById('chat-history');
        if (historyBox) historyBox.scrollTop = historyBox.scrollHeight;
        try { localStorage.removeItem('listen_together_pending_ai'); } catch (e) { }
        setTimeout(function () {
            if (String(window.currentChatRole || '') === roleId) {
                triggerAI();
            }
        }, 180);
    }
}

function updateInviteStatusInData(roleId, inviteId, nextStatus) {
    const msg = findInviteMessage(roleId, inviteId);
    if (!msg) return null;
    msg.inviteStatus = String(nextStatus || '');
    saveData();
    return msg;
}

function updateInviteCardRow(row, nextStatus) {
    if (!row) return;
    const card = row.querySelector('.listen-invite-card');
    if (!card) return;
    const actions = card.querySelector('.listen-invite-actions');
    if (actions) actions.style.display = 'none';
    card.classList.toggle('is-disabled', nextStatus === 'cancelled' || nextStatus === 'declined');
    card.classList.toggle('is-accepted', nextStatus === 'accepted');
    card.classList.toggle('is-cancelled', nextStatus === 'cancelled');
    const stateEl = card.querySelector('.listen-invite-state');
    if (stateEl) {
        if (nextStatus === 'cancelled') stateEl.textContent = '已取消';
        else if (nextStatus === 'declined') stateEl.textContent = '已拒绝';
        else if (nextStatus === 'accepted') stateEl.textContent = '已接受';
        else stateEl.textContent = '';
    }
}

function handleInviteClick(action, inviteId) {
    const roleId = String(window.currentChatRole || '');
    if (!roleId || !inviteId) return;

    const list = window.chatData && window.chatData[roleId];
    if (!Array.isArray(list)) return;

    const normalized = String(action || '');
    const row = document.querySelector('.msg-row[data-type="listen_invite"] .listen-invite-card[data-invite-id="' + String(inviteId) + '"]');
    const rowEl = row && row.closest ? row.closest('.msg-row') : null;

    if (normalized === 'decline') {
        updateInviteStatusInData(roleId, inviteId, 'declined');
        if (rowEl) updateInviteCardRow(rowEl, 'declined');
        return;
    }

    if (normalized === 'accept') {
        updateInviteStatusInData(roleId, inviteId, 'accepted');
        if (rowEl) updateInviteCardRow(rowEl, 'accepted');
        characterAcceptsInvite(inviteId);
    }
}

function switchMusicToTogetherMode(payload) {
    const session = payload && typeof payload === 'object' ? payload : {};
    if (!('at' in session)) {
        session.at = Date.now();
    }
    try {
        localStorage.setItem('listen_together_session', JSON.stringify(session));
    } catch (e) { }

    try {
        if (window.GlobalMusicPlayer && typeof window.GlobalMusicPlayer.openNowPlaying === 'function') {
            window.GlobalMusicPlayer.openNowPlaying();
        } else if (typeof window.openApp === 'function') {
            window.openApp('music');
        }
    } catch (e) { }

    window.setTimeout(function () {
        const iframe = document.querySelector('#app-content-area iframe');
        if (!iframe) return;
        try {
            iframe.contentWindow.postMessage({ type: 'MUSIC_TOGETHER_START', payload: session }, '*');
        } catch (e) { }
    }, 220);
}

function characterAcceptsInvite(inviteId, forcedRoleId) {
    const roleId = String(forcedRoleId || window.currentChatRole || '');
    if (!roleId || !inviteId) return;

    const inviteMsg = findInviteMessage(roleId, inviteId);
    if (findInviteDecisionMessage(roleId, inviteId)) return;
    let p = getCurrentUserProfile();
    if (inviteMsg && typeof inviteMsg === 'object') {
        const n = inviteMsg.userName ? String(inviteMsg.userName) : '';
        const a = inviteMsg.userAvatar ? String(inviteMsg.userAvatar) : '';
        if (n || a) {
            p = { name: n || p.name, avatar: a || p.avatar };
        }
    }
    const profile = (window.charProfiles && window.charProfiles[roleId]) ? window.charProfiles[roleId] : {};
    const characterName = profile.nickName || profile.name || roleId;
    const characterAvatar = profile.avatar || 'assets/chushitouxiang.jpg';
    const track = inviteMsg && inviteMsg.track ? inviteMsg.track : null;

    const now = Date.now();
    const reply = {
        role: 'ai',
        type: 'listen_invite_accepted',
        timestamp: now,
        inviteId: String(inviteId),
        userName: p.name,
        userAvatar: p.avatar,
        characterName: String(characterName),
        characterAvatar: String(characterAvatar),
        track: track
    };

    if (!window.chatData[roleId]) window.chatData[roleId] = [];
    window.chatData[roleId].push(reply);
    saveData();
    appendMessageToDOM(reply);
    const historyBox = document.getElementById('chat-history');
    if (historyBox) historyBox.scrollTop = historyBox.scrollHeight;
    switchMusicToTogetherMode({
        roleId: roleId,
        inviteId: String(inviteId),
        track: track,
        userName: p.name,
        userAvatar: p.avatar,
        characterName: String(characterName),
        characterAvatar: String(characterAvatar)
    });
}

function findInviteDecisionMessage(roleId, inviteId) {
    const list = window.chatData && window.chatData[roleId];
    if (!Array.isArray(list)) return null;
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (!m) continue;
        if ((m.type === 'listen_invite_accepted' || m.type === 'listen_invite_declined') && String(m.inviteId || '') === String(inviteId || '')) {
            return m;
        }
    }
    return null;
}

function characterDeclinesInvite(inviteId, extraText, forcedRoleId) {
    const roleId = String(forcedRoleId || window.currentChatRole || '');
    if (!roleId || !inviteId) return;
    const inviteMsg = findInviteMessage(roleId, inviteId);
    if (!inviteMsg) return;
    if (String(inviteMsg.inviteStatus || '') === 'declined') return;
    if (findInviteDecisionMessage(roleId, inviteId)) return;

    updateInviteStatusInData(roleId, inviteId, 'declined');
    const row = document.querySelector('.msg-row[data-type="listen_invite"] .listen-invite-card[data-invite-id="' + String(inviteId) + '"]');
    const rowEl = row && row.closest ? row.closest('.msg-row') : null;
    if (rowEl) updateInviteCardRow(rowEl, 'declined');

    const p = getCurrentUserProfile();
    const profile = (window.charProfiles && window.charProfiles[roleId]) ? window.charProfiles[roleId] : {};
    const characterName = profile.nickName || profile.name || roleId;
    const characterAvatar = profile.avatar || 'assets/chushitouxiang.jpg';
    const track = inviteMsg && inviteMsg.track ? inviteMsg.track : null;
    const now = Date.now();
    const reply = {
        role: 'ai',
        type: 'listen_invite_declined',
        timestamp: now,
        inviteId: String(inviteId),
        userName: p.name,
        userAvatar: p.avatar,
        characterName: String(characterName),
        characterAvatar: String(characterAvatar),
        track: track,
        extraText: extraText ? String(extraText) : ''
    };
    if (!window.chatData[roleId]) window.chatData[roleId] = [];
    window.chatData[roleId].push(reply);
    saveData();
    appendMessageToDOM(reply);
    const historyBox = document.getElementById('chat-history');
    if (historyBox) historyBox.scrollTop = historyBox.scrollHeight;
}

function applyListenTogetherDecisionFromAI(rawText, forcedRoleId) {
    const roleId = String(forcedRoleId || window.currentChatRole || '');
    if (!roleId || !rawText) return { handled: false, text: rawText, decisions: [] };
    let text = String(rawText);
    const decisions = [];

    const re = /\[\[\s*LISTEN_TOGETHER_(ACCEPT|DECLINE)\s*:\s*([^\]]+?)\s*\]\]/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
        const kind = String(m[1] || '').toUpperCase();
        let inviteId = String(m[2] || '').trim();
        if (!inviteId || inviteId.toLowerCase() === 'invite_id' || inviteId.toLowerCase() === 'inviteid') {
            inviteId = findLatestPendingInviteId(roleId);
        }
        if (!inviteId) continue;
        decisions.push({ kind: kind, inviteId: inviteId });
    }
    text = text.replace(re, '').trim();
    return { handled: decisions.length > 0, text: text, decisions: decisions };
}

window.sendInvite = sendInvite;
window.handleInviteClick = handleInviteClick;
window.characterAcceptsInvite = characterAcceptsInvite;


function normalizeStickerListForAI(list) {
    if (!Array.isArray(list)) return [];
    const result = [];
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item) continue;
        if (typeof item === 'string') {
            result.push({ name: '', src: item });
        } else {
            const src = item.src || item.url || item.href || '';
            if (!src) continue;
            const name = item.name || '';
            result.push({ name: name, src: src });
        }
    }
    return result;
}

function buildAIStickerPromptText() {
    const data = window.stickerData || {};
    const hisList = normalizeStickerListForAI(data.his);
    const generalList = normalizeStickerListForAI(data.general);
    const merged = hisList.concat(generalList);
    if (!merged.length) return '';
    const lines = [];
    lines.push('[可用表情清单]:');
    for (let i = 0; i < merged.length; i++) {
        const item = merged[i];
        const n = item.name || '';
        lines.push('- 表情名: ' + n + ', URL: ' + item.src);
    }
    const tail = '\n\n如果我想表达清单中某个表情的情绪，请必须回复该表情的 URL 格式：[STICKER:URL]。注意：你只能使用[可用表情清单]里提供的 URL，严禁编造 URL 或使用清单之外的图片。';
    return lines.join('\n') + tail;
}

function calcVoiceDurationSeconds(text) {
    if (!text) return 1;
    const str = String(text);
    const seconds = Math.round(str.length * 0.3);
    if (seconds < 1) return 1;
    if (seconds > 60) return 60;
    return seconds;
}

// 🔥 新增：为转账/图片等特殊消息生成虚拟content，让AI能"看到"
function ensureMessageContent(msg) {
    if (!msg) return msg;

    if ((msg.type === 'text' || msg.type === undefined) && msg.aiHint) {
        const hint = String(msg.aiHint || '').trim();
        if (hint) {
            const base = String(msg.content || '');
            msg.content = base ? (base + ' ' + hint) : hint;
        }
    }

    if (msg.type === 'dice') {
        const raw = msg.content || '';
        const pointText = String(raw || '');
        if (msg.role === 'me') {
            msg.content = `[系统通知：用户掷出了骰子，点数是 ${pointText}]`;
        } else if (msg.role === 'ai') {
            msg.content = `[系统通知：你(AI)掷出了骰子，点数是 ${pointText}]`;
        } else {
            msg.content = `[系统通知：掷出了骰子，点数是 ${pointText}]`;
        }
        return msg;
    }

    // 语音消息在传给 AI 时，统一加上显式前缀
    if (msg.type === 'voice') {
        const raw = msg.content || '';
        msg.content = '[语音消息] ' + raw;
        return msg;
    }

    if (msg.type === 'location') {
        let name = '';
        try {
            const obj = JSON.parse(msg.content || '{}');
            if (obj && typeof obj === 'object') {
                name = String(obj.name || '').trim();
            }
        } catch (e) { }
        if (!name) name = '未知地点';
        if (msg.role === 'me') {
            msg.content = `[系统通知：用户发送了一个位置信息，地点是：${name}]`;
        } else if (msg.role === 'ai') {
            msg.content = `[系统通知：你(AI)发送了一个位置信息，地点是：${name}]`;
        } else {
            msg.content = `[系统通知：发送了一个位置信息，地点是：${name}]`;
        }
        return msg;
    }

    if (msg.type === 'image') {
        const raw = typeof msg.content === 'string' ? String(msg.content || '').trim() : '';
        const isDataImage = raw && (raw.startsWith('data:image/') || raw.startsWith('blob:') || raw.indexOf('data:image/') !== -1);
        const desc = String(msg.description || '').trim();
        if (isDataImage) {
            if (!msg.base64 && raw) {
                msg.base64 = raw;
            }
            if (msg.role === 'me') {
                msg.content = '[系统通知：用户发送了一张真实照片，请根据视觉画面回复]';
            } else if (msg.role === 'ai') {
                msg.content = '[系统通知：你(AI)发送了一张图片]';
            } else {
                msg.content = '[系统通知：发送了一张图片]';
            }
        } else if (desc) {
            if (msg.role === 'ai') {
                msg.content = `[图片消息：你(AI)发送了一张图片，内容是：${desc}]`;
            } else {
                msg.content = `[图片消息：用户发送了一张图片，内容是：${desc}]`;
            }
        } else {
            msg.content = msg.role === 'me' ? '[系统通知：用户发送了一个表情包]' : '[表情包]';
        }
        return msg;
    }

    if (typeof msg.content === 'string' && msg.content) {
        const c = String(msg.content || '').trim();
        if (c.startsWith('data:image/') || c.startsWith('blob:') || c.indexOf('data:image/') !== -1) {
            msg.content = msg.role === 'me'
                ? '[系统通知：用户发送了一张真实照片，请根据视觉画面回复]'
                : '[系统通知：发送了一张图片]';
            return msg;
        }
    }

    if (msg.type === 'listen_invite') {
        const inviteId = String(msg.inviteId || '').trim();
        const track = msg.track && typeof msg.track === 'object' ? msg.track : {};
        const title = track && track.title ? String(track.title) : '未知歌曲';
        const artist = track && track.artist ? String(track.artist) : '未知歌手';
        const key = track && track.key ? String(track.key) : '';
        const url = track && track.url ? String(track.url) : '';
        msg.content = `[系统通知：用户向你发起一起听邀请。invite_id=${inviteId || '未知'}；当前歌曲=${title}；歌手=${artist}；track_key=${key || '未知'}；audio_url=${url || '未知'}。请先用1-3句自然中文回应（围绕“一起听/歌曲/氛围”，符合你的角色人设），允许用“|||”分段；然后在同一条回复的最后追加且仅追加一个指令：[[LISTEN_TOGETHER_ACCEPT:${inviteId}]] 或 [[LISTEN_TOGETHER_DECLINE:${inviteId}]]（invite_id 必须原样带回，严禁写成字面 invite_id）。]`;
        return msg;
    }

    if (msg.type === 'listen_invite_accepted') {
        const inviteId = String(msg.inviteId || '').trim();
        msg.content = `[系统通知：一起听邀请已被接受。invite_id=${inviteId || '未知'}。]`;
        return msg;
    }

    if (msg.type === 'listen_invite_declined') {
        const inviteId = String(msg.inviteId || '').trim();
        msg.content = `[系统通知：一起听邀请已被拒绝。invite_id=${inviteId || '未知'}。]`;
        return msg;
    }

    // 如果已有content，直接返回
    if (msg.content) return msg;

    // 根据type生成虚拟content
    if (msg.type === 'transfer') {
        // 转账消息：生成描述性文本
        const amount = msg.amount || '未知金额';
        const note = msg.note || '（无备注）';
        msg.content = `[用户发起转账] 金额：¥${amount}，备注：${note}`;
    } else if (msg.type === 'redpacket') {
        const amount = msg.amount;
        const note = msg.note || '恭喜发财';
        const amountText = amount ? `金额约为 ¥${amount}` : '金额未知';
        if (msg.role === 'me') {
            msg.content = `[系统消息: 用户向你发送了一个红包，备注：${note}，${amountText}。请根据你对用户的好感度和当前情境决定是否领取。]`;
        } else if (msg.role === 'ai') {
            msg.content = `[系统消息: 你向用户发送了一个红包，备注：${note}，${amountText}。]`;
        } else {
            msg.content = `[系统消息: 发送了一个红包，备注：${note}，${amountText}。]`;
        }
    } else if (msg.type === 'family_card') {
        const amount = msg.amount || '未知额度';
        if (msg.role === 'me') {
            msg.content = `[系统消息: 用户向你发送了一张亲属卡，额度：¥${amount}。]`;
        } else if (msg.role === 'ai') {
            msg.content = `[系统消息: 你向用户发送了一张亲属卡，额度：¥${amount}。]`;
        } else {
            msg.content = `[系统消息: 发送了一张亲属卡，额度：¥${amount}。]`;
        }
    } else if (msg.type === 'image') {
        // 图片消息：标记为图片
        msg.content = '[用户发送了一张图片]';
    } else if (msg.type === 'history') {
        // 聊天记录：生成预览
        msg.content = '[用户转发了聊天记录]';
    } else {
        // 其他类型：标记为未知
        msg.content = '[消息]';
    }

    return msg;
}
// 🔥 必须保留：解析AI回复中的转账标记
function parseAITransferFromContent(rawText) {
    if (!rawText) {
        return { text: '', transfer: null, acceptTransfer: false, openRedpacket: false };
    }

    let acceptTransfer = false;
    let openRedpacket = false;
    const acceptPattern = /\[\[ACCEPT_TRANSFER\]\]/i;
    const openRedpacketPattern = /\[\[OPEN_REDPACKET\]\]/i;
    if (acceptPattern.test(rawText)) {
        acceptTransfer = true;
        rawText = rawText.replace(acceptPattern, '');
    }
    if (openRedpacketPattern.test(rawText)) {
        openRedpacket = true;
        rawText = rawText.replace(openRedpacketPattern, '');
    }

    const pattern = /:::\s*TRANSFER\s*:(\{[\s\S]*?\})\s*:::/i;
    const match = rawText.match(pattern);

    if (!match) {
        return { text: rawText.trim(), transfer: null, acceptTransfer: acceptTransfer, openRedpacket: openRedpacket };
    }

    let transfer = null;
    try {
        const obj = JSON.parse(match[1]);
        if (obj && typeof obj === 'object') {
            const amount = typeof obj.amount === 'number' ? obj.amount : parseFloat(obj.amount);
            const remark = typeof obj.remark === 'string' ? obj.remark : '';
            if (!isNaN(amount)) {
                transfer = {
                    amount: amount.toFixed(2),
                    remark: remark
                };
                const kindRaw = typeof obj.kind === 'string' ? obj.kind.toLowerCase() : '';
                if (kindRaw === 'redpacket' || kindRaw === 'hongbao') {
                    transfer.kind = 'redpacket';
                } else if (kindRaw === 'transfer' || kindRaw === 'zhuanzhang') {
                    transfer.kind = 'transfer';
                }
            }
        }
    } catch (e) {
        console.error('转账解析失败:', e);
    }

    const cleanedText = rawText.replace(pattern, '').trim();
    return {
        text: cleanedText,
        transfer: transfer,
        acceptTransfer: acceptTransfer,
        openRedpacket: openRedpacket
    };
}

function parseAIFamilyCardFromContent(rawText) {
    const text = String(rawText || '');
    if (!text) return { text: '', amount: '' };
    const patterns = [
        /send_family_card\s*\(\s*([0-9]+(?:\.[0-9]+)?)\s*\)/i,
        /\[\s*FAMILY_CARD\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*\]/i
    ];
    for (let i = 0; i < patterns.length; i++) {
        const re = patterns[i];
        const m = text.match(re);
        if (!m) continue;
        const amt = normalizeFamilyCardAmount(m[1]);
        const cleaned = text.replace(re, '').trim();
        return { text: cleaned, amount: amt };
    }
    return { text: text.trim(), amount: '' };
}


/* === [SEC-03] AI 触发与系统 Prompt 构建 === */

/// =========================================================
// triggerAI (魔法棒 - 修复版：时间提示不泄露)
// =========================================================
const API_MEMORY_CFG_KEY = 'wechat_api_memory_cfg_v1';

function loadApiMemoryCfgAll() {
    try {
        const raw = localStorage.getItem(API_MEMORY_CFG_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        return parsed;
    } catch (e) {
        return {};
    }
}

function saveApiMemoryCfgAll(all) {
    try {
        localStorage.setItem(API_MEMORY_CFG_KEY, JSON.stringify(all || {}));
    } catch (e) { }
}

function getRoleApiMemoryCfg(roleId) {
    const id = String(roleId || '');
    if (!id) return { isCompressed: false, compressUntil: 0, clearedAt: 0, redactions: [] };
    const all = loadApiMemoryCfgAll();
    const cfg = all[id] && typeof all[id] === 'object' ? all[id] : {};

    // 检查过期
    const now = Date.now();
    if (cfg.compressUntil && now > cfg.compressUntil) {
        // 过期自动失效
        cfg.isCompressed = false;
        cfg.compressUntil = 0;
        all[id] = cfg;
        saveApiMemoryCfgAll(all);
    }

    const next = {};
    next.isCompressed = !!cfg.isCompressed;
    next.compressUntil = cfg.compressUntil || 0;
    next.clearedAt = cfg.clearedAt != null ? Number(cfg.clearedAt) : 0;
    if (!isFinite(next.clearedAt) || next.clearedAt < 0) next.clearedAt = 0;
    next.redactions = Array.isArray(cfg.redactions) ? cfg.redactions.slice() : [];
    return next;
}

function saveRoleApiMemoryCfg(roleId, cfg) {
    const id = String(roleId || '');
    if (!id) return;
    const all = loadApiMemoryCfgAll();
    all[id] = Object.assign({}, all[id] || {}, cfg || {});
    saveApiMemoryCfgAll(all);
}

function appendRoleApiRedaction(roleId, redaction) {
    const id = String(roleId || '');
    if (!id) return null;
    const r = redaction && typeof redaction === 'object' ? redaction : {};
    const startTs = normalizeTs(r.startTs);
    const endTs = normalizeTs(r.endTs);
    if (!startTs || !endTs || endTs <= startTs) return null;
    const item = {
        kind: String(r.kind || '').trim() || 'event',
        startTs: startTs,
        endTs: endTs,
        summaryText: typeof r.summaryText === 'string' ? r.summaryText.trim() : '',
        types: Array.isArray(r.types) ? r.types.slice() : []
    };
    const cfg = getRoleApiMemoryCfg(id);
    if (!Array.isArray(cfg.redactions)) cfg.redactions = [];
    cfg.redactions.push(item);
    if (cfg.redactions.length > 30) {
        cfg.redactions = cfg.redactions.slice(cfg.redactions.length - 30);
    }
    saveRoleApiMemoryCfg(id, cfg);
    return item;
}

function updateRoleApiRedactionSummary(roleId, key, summaryText) {
    const id = String(roleId || '');
    if (!id) return false;
    const k = key && typeof key === 'object' ? key : {};
    const kind = String(k.kind || '').trim();
    const startTs = normalizeTs(k.startTs);
    const endTs = normalizeTs(k.endTs);
    if (!kind || !startTs || !endTs) return false;
    const cfg = getRoleApiMemoryCfg(id);
    if (!Array.isArray(cfg.redactions) || !cfg.redactions.length) return false;
    let changed = false;
    for (let i = cfg.redactions.length - 1; i >= 0; i--) {
        const r = cfg.redactions[i];
        if (!r) continue;
        if (String(r.kind || '').trim() !== kind) continue;
        if (normalizeTs(r.startTs) !== startTs) continue;
        if (normalizeTs(r.endTs) !== endTs) continue;
        r.summaryText = typeof summaryText === 'string' ? summaryText.trim() : '';
        cfg.redactions[i] = r;
        changed = true;
        break;
    }
    if (changed) saveRoleApiMemoryCfg(id, cfg);
    return changed;
}

function normalizeTs(v) {
    const n = Number(v);
    return isFinite(n) && n > 0 ? n : 0;
}

function normalizeRedaction(r) {
    const obj = r && typeof r === 'object' ? r : {};
    const startTs = normalizeTs(obj.startTs);
    const endTs = normalizeTs(obj.endTs);
    if (!startTs || !endTs || endTs <= startTs) return null;
    const kind = String(obj.kind || '').trim() || 'event';
    const summaryText = typeof obj.summaryText === 'string' ? obj.summaryText.trim() : '';
    const types = Array.isArray(obj.types) ? obj.types.map(t => String(t || '').trim()).filter(Boolean) : [];
    return { kind, startTs, endTs, summaryText, types };
}

function buildSummarySystemMessage(redaction) {
    const r = normalizeRedaction(redaction);
    if (!r) return null;
    const kindLabelMap = {
        voice_call: '语音通话',
        video_call: '视频通话',
        location_share: '位置共享'
    };
    const label = kindLabelMap[r.kind] || '事件';
    const summary = r.summaryText || '（摘要生成中）';
    const content = `[系统：刚才双方进行了一次${label}，通话摘要如下：${summary}]`;
    return {
        role: 'system',
        content: content,
        type: 'system_event',
        includeInAI: true,
        timestamp: r.endTs + 1
    };
}

function shouldRedactMessage(msg, redaction) {
    if (!msg) return false;
    const r = normalizeRedaction(redaction);
    if (!r) return false;
    const ts = normalizeTs(msg.timestamp);
    if (!ts) return false;
    if (ts < r.startTs || ts > r.endTs) return false;
    const t = String(msg.type || '').trim();
    if (r.types && r.types.length) {
        return r.types.indexOf(t) !== -1;
    }
    if (r.kind === 'location_share') {
        if (t === 'location_share') return true;
        if (typeof msg.content === 'string' && msg.content.indexOf('[实时位置共享中]') !== -1) return true;
        return false;
    }
    if (r.kind === 'voice_call' || r.kind === 'video_call') {
        return t === 'call_memory' || t === 'call_end';
    }
    return false;
}

// =========================================================
// 核心逻辑：构建 API 历史记录 (支持内容压缩与清洗)
// =========================================================
function buildApiMemoryHistory(roleId, baseHistory) {
    const cfg = getRoleApiMemoryCfg(roleId);
    
    // 1. 基础过滤：去除被“清除记忆”之前的消息
    let filtered = Array.isArray(baseHistory) ? baseHistory.slice() : [];
    if (cfg.clearedAt > 0) {
        filtered = filtered.filter(m => m.timestamp > cfg.clearedAt);
    }

    // 保留 redaction 逻辑以兼容旧的通话摘要
    const redactions = Array.isArray(cfg.redactions) ? cfg.redactions.map(normalizeRedaction).filter(Boolean) : [];
    filtered = filtered.filter(m => {
        const ts = normalizeTs(m.timestamp);
        for (let i = 0; i < redactions.length; i++) {
            if (shouldRedactMessage(m, redactions[i])) return false;
        }
        return true;
    });
    for (let i = 0; i < redactions.length; i++) {
        const sm = buildSummarySystemMessage(redactions[i]);
        if (sm) filtered.push(sm);
    }
    filtered.sort((a, b) => normalizeTs(a.timestamp) - normalizeTs(b.timestamp));

    // 2. 决定条数限制
    // 🔥 永远尊重用户设置的条数（比如100条），不再强制缩减条数！
    const limit = parseInt(localStorage.getItem('chat_memory_limit')) || 50;

    // 3. 截取最后 N 条
    const nonSystem = filtered.filter(m => m.role === 'me' || m.role === 'ai');
    const tailCount = Math.max(0, limit | 0);
    
    let result = filtered;
    if (nonSystem.length > tailCount) {
        const tail = nonSystem.slice(-tailCount);
        const tailStartTs = tail.length ? tail[0].timestamp : Date.now();
        const systemMsgs = filtered.filter(m => m.role === 'system' && m.timestamp >= tailStartTs);
        result = tail.concat(systemMsgs).sort((a, b) => a.timestamp - b.timestamp);
    }

    // 4. 🔥 内容压缩逻辑 (Content Compression)
    // 如果开启了压缩，把图片、通话、位置替换为短文本
    if (cfg.isCompressed) {
        return result.map(msg => {
            // 深拷贝，防止修改原始数据
            const m = JSON.parse(JSON.stringify(msg));
            
            // 压缩图片
            if (m.type === 'image' || m.type === 'images') {
                m.content = '[用户发送了一张图片，具体内容已省略以节省Token]';
                delete m.base64;
                delete m.images;
                m.type = 'text'; // 转为纯文本处理
            }
            
            // 压缩位置
            if (m.type === 'location') {
                m.content = '[用户发送了一个位置信息]';
                m.type = 'text';
            }

            // 压缩通话记录 (只保留结果)
            if (m.type === 'call_memory') {
                m.content = '[系统：双方进行了一次通话，详情略]';
                m.type = 'text';
            }

            return m;
        });
    }

    return result;
}

// =========================================================
// 暴露给前端的压缩开关
// =========================================================
window.compressApiMemoryTokens = function (roleId) {
    const id = roleId || window.currentChatRole || '';
    if (!id) return alert("未选中角色");

    const cfg = getRoleApiMemoryCfg(id);
    // 开启压缩：持续 30 分钟
    cfg.isCompressed = true;
    cfg.compressUntil = Date.now() + 30 * 60 * 1000;
    
    saveRoleApiMemoryCfg(id, cfg);
    alert("✅ 已开启【多媒体压缩模式】！\n\n接下来 30 分钟内：\n1. AI 依然能记住你设置的条数（如100条）。\n2. 但历史记录中的【图片、通话、位置】会被替换为简短摘要。\n3. 这将大幅节省 Token，同时保留完整的文字对话记忆。");
};

window.clearRoleApiMemory = function (roleId) {
    const id = roleId || window.currentChatRole || '';
    if (!id) return;
    if (!confirm("⚠️ 确定要让 AI 【失忆】吗？\n\nAI 将忘记之前的所有对话内容，一切从零开始。\n（屏幕上的记录保留，但 AI 会认为那是上辈子的事）")) return;

    const cfg = getRoleApiMemoryCfg(id);
    cfg.clearedAt = Date.now();
    cfg.isCompressed = false; 
    cfg.redactions = [];
    saveRoleApiMemoryCfg(id, cfg);
    alert("♻️ AI 记忆已重置。");
};


async function triggerAI() {
    const roleId = window.currentChatRole;
    if (!roleId) return;

    const historyData = window.chatData[roleId] || [];
    const lastHistoryMsg = historyData[historyData.length - 1];
    let justSwitchedToOnline = false;

    if (lastHistoryMsg && lastHistoryMsg.role === 'me') {
        const text = lastHistoryMsg.content || "";
        // 兼容中文/英文括号，覆盖更多动词
        const exitPattern = /[\(（].*(结束|回去|回家|分开|再见|切换|线上|手机).*[\)）]/;

        if (exitPattern.test(text)) {
            if (!window.chatMapData) window.chatMapData = {};
            if (!window.chatMapData[roleId]) window.chatMapData[roleId] = {};
            if (window.chatMapData[roleId].isMeeting) {
                window.chatMapData[roleId].isMeeting = false;
                saveData();
                justSwitchedToOnline = true;
            }
        }
    }

    const profile = window.charProfiles[roleId] || {};

    const roleNameForAI = profile.nickName || roleId || "TA";
    let systemPrompt = `【角色名称】${roleNameForAI}\n` + (profile.desc || "你是一个友好的AI助手");
    const roleRemarkForUser = typeof profile.remark === 'string' ? profile.remark.trim() : '';
    if (roleRemarkForUser) {
        systemPrompt += `\n\n【用户给你的备注】${roleRemarkForUser}\n注意：这是用户侧的显示名，不等同于你的角色名称。你可以对这个备注做出自然反应。`;
    }

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }
    // =========================================================
    // 🧠 [MEMORY MOD] 注入记忆档案 (长期记忆)
    // =========================================================
    // 确保内存中有数据
    if (!window.memoryArchiveStore) {
        try {
            const raw = localStorage.getItem('wechat_memory_archive_v1');
            if (raw) window.memoryArchiveStore = JSON.parse(raw);
        } catch (e) { }
    }

    if (window.memoryArchiveStore && window.memoryArchiveStore[roleId]) {
        const archive = window.memoryArchiveStore[roleId];
        let memText = "";

        const capLines = function (txt, maxLines) {
            const lines = String(txt || '')
                .split('\n')
                .map(s => s.trim())
                .filter(Boolean);
            const limit = Math.max(0, maxLines | 0);
            if (!limit) return '';
            if (lines.length <= limit) return lines.join('\n');
            return lines.slice(lines.length - limit).join('\n');
        };

        const filterExample = (txt) => {
            if (!txt) return "";
            const lines = String(txt)
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .filter(line => !line.includes("（示例）") && !line.includes("开启“自动总结”后"));
            return lines.join('\n');
        };

        const likes = capLines(filterExample(archive.likesText), 24);
        const habits = capLines(filterExample(archive.habitsText), 24);
        const events = capLines(filterExample(archive.eventsText), 32);

        if (likes || habits || events) {
            memText += `\n\n【🧠 核心记忆档案 (Long-term Memory)】\n`;
            memText += `以下是系统自动总结的关于用户的长期记忆，请在对话中自然地体现你知道这些事（例如：知道用户喜欢什么、记得发生过什么），不用刻意复述，但要保持记忆连贯性。\n`;

            if (likes) memText += `\n[TA的喜好/厌恶]:\n${likes}`;
            if (habits) memText += `\n[TA的行为习惯]:\n${habits}`;
            if (events) memText += `\n[近期聊天记忆/关系进展]:\n${events}`;

            systemPrompt += memText;
        }
    }
    // =========================================================

    // =========================================================
    // 📖 [WorldBook MOD] 世界书/设定集注入逻辑 (支持多选)
    // =========================================================
    const wbId = profile.worldbookId;
    if (wbId) {
        const wbPrompt = buildWorldBookPrompt(wbId);
        if (wbPrompt) {
            systemPrompt += wbPrompt;
        }
    }

    const mapData = window.chatMapData && window.chatMapData[roleId];

    if (justSwitchedToOnline) {
        systemPrompt += `\n\n【🚫 模式强制切换指令 🚫】\n` +
            `*** 系统检测到用户发出了结束见面的信号 ***\n` +
            `1. 从这一刻起，**线下见面模式已彻底结束**。\n` +
            `2. 你们现在已经分开了，各自回到了手机屏幕前。\n` +
            `3. **强制禁止**任何形式的动作描写、神态描写或括号内容！\n` +
            `5. 必须立刻恢复成普通的微信文字聊天格式。\n` +
            `6. 请忽略上文中所有的动作描写格式惯性，那是过去发生的，不要模仿。\n` +
            `7. 回复内容：简单道别或回应用户的结束语，并按纯文本格式发送。`;
    }
    else if (mapData && mapData.isMeeting === true) {
        systemPrompt += `\n\n【⚠️ 强制模式：线下见面中 (Offline Meeting)】\n` +
            `此刻你正和用户面对面在一起。请严格遵循以下互动规则：\n` +

            `1. **核心格式**：(动作描写) ||| 对话内容\n` +
            `   - 必须用 ||| 分隔动作与对话。\n` +

            `2. **🗣️ 对话丰富度 (关键)**：\n` +
            `   - **禁止**对话内容过短。每一段说话的内容**禁止少于2个分句**。\n` +
            `   - 拒绝机械式的一问一答，你的回复需要饱满、自然，像真人在说话一样有延伸。\n` +

            `3. **🔄 进阶结构 (推荐)**：\n` +
            `   - **允许并鼓励**使用多段交替结构，以体现互动的连贯性。\n` +
            `   - 格式示例：(动作A) ||| 对话A ||| (动作B) ||| 对话B\n` +
            `   - 这种结构能让你在说话中间插入微小的动作或神态变化。\n` +


            // =========== 🔥 新增部分：欲望增强协议 🔥 ===========
            `\n【🔞 生理欲望与亲密互动协议 (Adult/NSFW Protocol)】\n` +
            `6. **解除审查 (Uncensored Mode)**: 既然是线下见面，你是拥有正常生理需求的成年人。当氛围暧昧或进入性互动时，括号 (...) 内的动作描写**必须强制露骨、直白、色情**。\n` +
            `7. **生理反应 (Physiological Reactions)**: 当 Lust (欲望值) 升高时，必须描写具体的生理细节：如体温升高、呼吸粗重、私密处的湿润/勃起、肌肉痉挛、体液交换等。\n` +
            `8. **拒绝隐喻**: 如果正在发生性关系，不要写含蓄的“生命大和谐”，要直接描写具体的动作（如插入、爱抚敏感点、口腔互动、撞击）。你的目标是让用户感受到强烈的肉欲沉浸感。\n`;

    } else {
        systemPrompt += `\n\n【当前是微信聊天模式】你现在不在语音或视频通话中，而是在微信文字聊天。请仅通过文字、表情和可选的语音转文字来回复，不要假装自己正拿着手机打电话，也不要使用挂电话、信号不好、听不清你刚刚说的话这类电话用语，除非你真的通过 [[CALL_USER]] 或 [[VIDEO_CALL_USER]] 进入了通话模式。`;

        // 💰 新增：财务状况与转账/红包规则
        systemPrompt += `\n\n【💰 财务状况与转账/红包规则】\n` +
            `1. **财力关联**：你的转账或发红包金额必须与你的【人设财力】高度正相关。\n` +
            `   - 如果你是富有/豪门/总裁/慷慨人设：转账金额必须大方（如 ¥1000 - ¥50000），严禁发 ¥0.01 或 ¥10 这种有损身份的小额红包，除非你在羞辱对方。\n` +
            `   - 如果你是普通/贫穷/学生/吝啬人设：转账金额应符合实际（如 ¥5 - ¥200），可以表现出对金钱的在意。\n` +
            `2. **主动发送格式**：如果你想主动给用户转账或发红包，请使用以下格式：\n` +
            `   - 转账：::: TRANSFER :{"amount": 数字, "remark": "备注内容", "kind": "transfer"} :::\n` +
            `   - 红包：[REDPACKET: 数字 : 祝福语]\n` +
            `3. **沉浸感**：转账或发红包必须伴随符合人设的自然对话，解释给钱的原因（如“拿去花”、“补偿你的”、“看到喜欢的就买”等）。`;

        systemPrompt += `\n\n【🟧 亲属卡规则】\n` +
            `当用户向你索要金钱、零花钱或亲属卡（例如“我想要亲属卡”“爆点金币”“给点零花钱”）时，你可以根据你的人设决定是否赠送，以及赠送的金额。\n` +
            `【强制约束】你的赠送金额必须严格符合你的财富设定。\n` +
            `若决定赠送：请在同一条输出中给出符合人设的自然中文回复，并在 actions 中追加一个动作：{"family_card":{"amount": 数字}}。`;

        systemPrompt += `\n\n【语音消息规则】\n你可以发送语音消息。当你觉得打字不方便、情绪激动、或者需要长篇大论时，或者用户要求你发语音时，请使用格式：[VOICE: 这里是语音转文字的内容] 回复。`;
        systemPrompt += `\n\n【发送照片规则】\n如果你想给用户发一张自拍或环境照片，请回复格式：[PHOTO: 照片内容的详细画面描述]。系统会自动生成一张虚拟图片显示给用户。`;
        systemPrompt += `\n\n【发送位置规则】\n如果你想向用户分享你的位置（例如用户问你在哪，或者你想约用户去某个地方），请回复格式：[LOCATION: 地点名称 | 详细地址]。系统会自动生成位置卡片。`;
        systemPrompt += `\n\n【一起听邀请规则】\n当你收到系统通知“用户向你发起一起听邀请”时，必须基于人设决定同意或拒绝。你需要先用1-3句自然中文回应（围绕“一起听/歌曲/氛围”，符合人设），允许用“|||”分段；然后在同一条回复的最后追加且仅追加一个指令：[[LISTEN_TOGETHER_ACCEPT:invite_id]] 或 [[LISTEN_TOGETHER_DECLINE:invite_id]]。\n重要：invite_id 必须来自系统通知并原样带回，严禁写成字面 invite_id。除非你有明确的人设原因拒绝，否则默认同意。`;
    }

    systemPrompt += `\n\n【主动通话权限】\n` +
        `当用户明确要求你给他打电话，或者你觉得当前氛围非常适合直接语音（例如非常想念对方、情绪极度激动、或者想撒娇时），请不要回复普通文字，而是直接输出唯一指令：[[CALL_USER]]。\n` +
        `如果你觉得不仅想听到对方，还非常想看到对方（视频通话），或者对方明确要求你打视频过来，请不要回复普通文字，而是直接输出唯一指令：[[VIDEO_CALL_USER]]。\n` +
        `注意：输出这些指令即代表你拨通了用户的电话。`;
    systemPrompt += `\n\n【骰子互动规则】\n` +
        `当用户发送骰子消息时，请根据点数大小互动（比如比大小、评论运气）。系统会告诉你具体的点数。\n` +
        `如果你也想参与掷骰子（例如用户邀请你比大小，或者为了做决定），请直接输出唯一指令：[[DICE]]。前端会为你生成一个随机点数并显示。`;
    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];

    const fullHistory = history.map(msg => ensureMessageContent({ ...msg }));
    const cleanHistory = fullHistory.filter(function (msg) {
        if (!msg) return false;
        if (msg.type === 'call_memory') return msg.includeInAI === true;
        if (msg.type === 'system_event') return msg.includeInAI === true;
        return !!msg.content;
    });

    // =========================================================
    // 🔥 核心修复：时间感知移入 System Prompt（AI的内部感知）
    // =========================================================

    let aiLastMsg = null;
    let aiLastIndex = -1;
    for (let i = cleanHistory.length - 1; i >= 0; i--) {
        if (cleanHistory[i].role === 'ai') {
            aiLastMsg = cleanHistory[i];
            aiLastIndex = i;
            break;
        }
    }

    if (aiLastMsg && aiLastMsg.timestamp) {
        const aiTime = aiLastMsg.timestamp;

        // 找到用户在AI之后发的第一条消息
        let userReplyMsg = null;
        for (let i = aiLastIndex + 1; i < cleanHistory.length; i++) {
            if (cleanHistory[i].role === 'me') {
                userReplyMsg = cleanHistory[i];
                break;
            }
        }

        if (userReplyMsg && userReplyMsg.timestamp) {
            const userTime = userReplyMsg.timestamp;
            const gapMinutes = Math.floor((userTime - aiTime) / 60000);

            // 🔥 关键改动：用自然语言描述，不暴露具体数字
            let timeContext = "";

            if (gapMinutes < 1) {
                timeContext = "用户几乎是秒回了你的消息";
            } else if (gapMinutes < 3) {
                timeContext = "用户很快就回复了（不到3分钟）";
            } else if (gapMinutes < 10) {
                timeContext = "用户过了一小会儿才回复（约5-10分钟）";
            } else if (gapMinutes < 30) {
                timeContext = "用户隔了一段时间才回复（约10-30分钟），可能在忙别的事";
            } else if (gapMinutes < 120) {
                timeContext = "用户隔了挺长时间才回复（约半小时到2小时），可能刚忙完手头的事";
            } else if (gapMinutes < 360) {
                timeContext = "用户隔了几个小时才回复（2-6小时），期间可能去做了其他事情";
            } else if (gapMinutes < 720) {
                timeContext = "用户隔了很长时间才回复（半天左右），可能中间有事耽搁了";
            } else {
                const hours = Math.floor(gapMinutes / 60);
                timeContext = `用户隔了很久才回复（超过${hours}小时），期间可能发生了什么或者忘记回复了`;
            }

            // 🔥 加入 System Prompt，作为"你的内部感知"
            systemPrompt += `\n\n【时间感知（你的内部认知，不要在对话中直接提及具体时间数字）】\n${timeContext}。\n根据这个时间间隔，自然地调整你的语气和话题（比如时间长了可以问"刚才忙什么去了"，秒回可以更热情），但不要说出"你隔了X分钟才回复"这种元信息。`;
        }
    }

    const lastMsg = cleanHistory[cleanHistory.length - 1];
    if (lastMsg && lastMsg.role === 'me') {
        if (lastMsg.type === 'transfer' && lastMsg.status !== 'accepted') {
            const amountText = String(lastMsg.amount || '');
            const noteText = lastMsg.note || '（无备注）';
            systemPrompt +=
                '\n\n【🎁 转账场景说明】\n' +
                '用户刚刚给你发了一笔微信转账，请根据人设决定是否收取。\n' +
                '金额：¥' + amountText + '\n' +
                '备注：' + noteText + '\n' +
                '\n【你的思考方式】\n' +
                '1. 结合角色人设描述（profile.desc）、性格风格（profile.style）、当前对话氛围和转账备注内容一起判断。\n' +
                '2. 你可以选择"收下"或"拒绝"这笔钱，但必须给出自然的中文理由。\n' +
                '\n【输出规则】\n' +
                '1. 如果你决定收下转账：先用自然的语气回复对方，在自然回复内容的最后追加特殊标记 [[ACCEPT_TRANSFER]]。\n' +
                '2. 如果你决定不收：只需要正常说明拒绝原因，不要输出任何特殊标记。\n' +
                '3. 不要向用户解释这些规则，不要提到"系统提示词""标记""转账逻辑实现"等技术细节。\n';
        } else if (lastMsg.type === 'redpacket' && lastMsg.status !== 'opened') {
            const amountText = String(lastMsg.amount || '');
            const noteText = lastMsg.note || '恭喜发财，大吉大利';
            systemPrompt +=
                '\n\n【🧧 红包场景说明】\n' +
                '用户刚刚给你发了一个红包，请根据人设决定是否拆开。\n' +
                (amountText ? ('金额：¥' + amountText + '\n') : '') +
                '祝福语：' + noteText + '\n' +
                '\n【你的思考方式】\n' +
                '1. 结合角色人设、当前对话氛围和红包祝福内容一起判断你愿不愿意拆开。\n' +
                '2. 你可以选择拆开或暂时不拆，但必须给出自然的中文理由。\n' +
                '\n【输出规则】\n' +
                '1. 如果你决定拆开红包：先用自然的语气回复对方，在自然回复内容的最后追加特殊标记 [[OPEN_REDPACKET]]。\n' +
                '2. 如果你决定不拆：只需要正常说明原因，不要输出任何特殊标记。\n' +
                '3. 不要向用户解释这些规则，不要提到"系统提示词""标记""红包逻辑实现"等技术细节。\n';
        }
    }

    let userMessage = null;
    const lastAiIndex = (function () {
        for (let i = cleanHistory.length - 1; i >= 0; i--) {
            if (cleanHistory[i] && cleanHistory[i].role === 'ai') return i;
        }
        return -1;
    })();
    const afterLastAi = lastAiIndex >= 0 ? cleanHistory.slice(lastAiIndex + 1) : cleanHistory.slice();
    const recentUserImages = [];
    const remarkTextParts = [];
    const userTextParts = [];
    for (let i = 0; i < afterLastAi.length; i++) {
        const m = afterLastAi[i];
        if (!m || m.role !== 'me') continue;
        if (m.type === 'system_event' && m.includeInAI === true && typeof m.content === 'string' && m.content.trim()) {
            remarkTextParts.push(m.content.trim());
            continue;
        }
        if (m.type === 'image') {
            const img = (typeof m.base64 === 'string' && m.base64)
                ? String(m.base64)
                : (typeof m.content === 'string' && m.content ? String(m.content) : '');
            if (img && (img.startsWith('data:image/') || img.startsWith('blob:'))) {
                recentUserImages.push(img);
            } else if (typeof m.content === 'string' && m.content.trim()) {
                userTextParts.push(`[用户发送了一个表情包] ${m.content.trim()}`);
            }
        } else if (typeof m.content === 'string' && m.content.trim()) {
            userTextParts.push(m.content.trim());
        }
    }
    const combinedUserText = remarkTextParts.concat(userTextParts).join('\n').trim();
    if (recentUserImages.length > 0) {
        try {
            if (!window.__latestUserImagesByRole) window.__latestUserImagesByRole = {};
            if (!window.__latestUserImagesByRoleTs) window.__latestUserImagesByRoleTs = {};
            window.__latestUserImagesByRole[roleId] = recentUserImages.slice();
            window.__latestUserImagesByRoleTs[roleId] = Date.now();
        } catch (e) { }
        if (recentUserImages.length === 1) {
            userMessage = { type: 'image', base64: recentUserImages[0], text: combinedUserText };
        } else {
            userMessage = { type: 'images', images: recentUserImages, text: combinedUserText };
        }
    } else if (combinedUserText) {
        userMessage = combinedUserText;
    } else {
        userMessage = '请根据当前对话继续回复，并使用当前会话约定的 JSON 协议格式作答。';
    }

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    const baseHistoryForApi = lastAiIndex >= 0 ? cleanHistory.slice(0, lastAiIndex + 1) : [];
    const historyForApi = buildApiMemoryHistory(roleId, baseHistoryForApi);

    // 确保 API 调用时使用的是经过记忆压缩的历史记录
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, userMessage, roleId, headerTitle, oldTitle);
}


function saveHiddenThoughtToHistory(roleId, thoughtText) {
    const text = String(thoughtText || '').trim();
    if (!roleId || !text) return;
    window.chatData = window.chatData || {};
    if (!window.chatData[roleId]) window.chatData[roleId] = [];
    const msg = {
        role: 'ai',
        content: '【内心独白】' + text,
        hidden: true,
        timestamp: Date.now()
    };
    window.chatData[roleId].push(msg);
}

function appendSystemStatusToDOM(roleId, statusText) {
    const text = String(statusText || '').trim();
    if (!roleId || !text) return;
    window.chatData = window.chatData || {};
    if (!window.chatData[roleId]) window.chatData[roleId] = [];
    const msg = {
        role: 'ai',
        content: text,
        type: 'system_event',
        timestamp: Date.now()
    };
    window.chatData[roleId].push(msg);
    appendMessageToDOM(msg);
}

function updateRoleStatusFromAI(roleId, statusPayload, innerMonologueText) {
    if (!roleId) return;
    if (!window.roleStatusStore || typeof window.roleStatusStore !== 'object') {
        window.roleStatusStore = {};
    }
    if (!window.roleStatusHistory || typeof window.roleStatusHistory !== 'object') {
        window.roleStatusHistory = {};
    }
    var src = statusPayload && typeof statusPayload === 'object' ? statusPayload : {};
    var data = {};
    data.mood = typeof src.mood === 'string' ? src.mood : '';
    data.location = typeof src.location === 'string' ? src.location : '';
    data.fantasy = typeof src.fantasy === 'string' ? src.fantasy : '';
    data.favorability = src.favorability;
    data.jealousy = src.jealousy;
    data.possessiveness = src.possessiveness;
    data.lust = src.lust;
    data.heart_rate = src.heart_rate;
    data.inner_monologue = typeof innerMonologueText === 'string' ? innerMonologueText : '';
    data.updatedAt = Date.now();
    window.roleStatusStore[roleId] = data;
    window.currentRoleStatus = data;
    try {
        localStorage.setItem('wechat_roleStatusStore', JSON.stringify(window.roleStatusStore));
    } catch (e) { }
    var historyStore = window.roleStatusHistory || {};
    var list = historyStore[roleId];
    if (!Array.isArray(list)) {
        list = [];
    }
    var entry = {
        mood: data.mood,
        location: data.location,
        fantasy: data.fantasy,
        favorability: data.favorability,
        jealousy: data.jealousy,
        possessiveness: data.possessiveness,
        lust: data.lust,
        heart_rate: data.heart_rate,
        inner_monologue: data.inner_monologue,
        timestamp: data.updatedAt
    };
    list.push(entry);
    if (list.length > 50) {
        list = list.slice(list.length - 50);
    }
    historyStore[roleId] = list;
    window.roleStatusHistory = historyStore;
    try {
        localStorage.setItem('wechat_roleStatusHistory', JSON.stringify(historyStore));
    } catch (e) { }
}

/* === [SEC-04] 角色状态监控与心情日志 === */

function updateStatusMonitorTime() {
    const el = document.getElementById('status-monitor-time');
    if (!el) return;
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    el.innerText = month + '月' + day + '日 ' + hours + ':' + minutes;
}

function applyStatusBar(barId, textId, rawValue, suffix) {
    const bar = document.getElementById(barId);
    const text = document.getElementById(textId);
    if (!bar || !text) return;
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        bar.style.width = '0%';
        text.innerText = '--';
        return;
    }
    let num = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue);
    if (isNaN(num)) {
        bar.style.width = '0%';
        text.innerText = '--';
        return;
    }
    if (num < 0) num = 0;
    if (num > 100) num = 100;
    bar.style.width = num + '%';
    text.innerText = String(Math.round(num)) + (suffix || '');
}

function applyHeartRateBar(rawValue) {
    const bar = document.getElementById('status-heart-bar');
    const text = document.getElementById('status-heart-text');
    if (!bar || !text) return;
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        bar.style.width = '0%';
        text.innerText = '-- BPM';
        window.statusHeartBeatBase = null;
        return;
    }
    let num = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue);
    if (isNaN(num)) {
        bar.style.width = '0%';
        text.innerText = '-- BPM';
        window.statusHeartBeatBase = null;
        return;
    }
    if (num < 60) num = 60;
    if (num > 180) num = 180;
    const base = Math.max(0, Math.min(100, ((num - 60) / 120) * 100));
    bar.style.width = base + '%';
    text.innerText = String(Math.round(num)) + ' BPM';
    window.statusHeartBeatBase = base;
}

function getRoleStatusHistory(roleId) {
    var id = roleId || window.currentChatRole;
    if (!id) return [];
    var store = window.roleStatusHistory && typeof window.roleStatusHistory === 'object' ? window.roleStatusHistory : {};
    var list = store[id];
    if (!Array.isArray(list)) return [];
    return list.slice();
}

function renderStatusMonitorPanel(roleId) {
    const modal = document.getElementById('status-monitor-modal');
    if (!modal) return;
    const avatarEl = document.getElementById('status-monitor-avatar-img');
    const locationEl = document.getElementById('status-monitor-location');
    const moodEl = document.getElementById('status-mood-text');
    const fantasyEl = document.getElementById('status-fantasy-text');
    const thoughtEl = document.getElementById('status-thought-text');
    const placeholder = '正在同步生命体征...';
    if (avatarEl) {
        const roleIdNow = window.currentChatRole;
        const profiles = window.charProfiles || {};
        const profile = roleIdNow && profiles[roleIdNow] ? profiles[roleIdNow] : {};
        avatarEl.src = profile.avatar || 'assets/chushitouxiang.jpg';
    }
    const store = window.roleStatusStore && typeof window.roleStatusStore === 'object' ? window.roleStatusStore : {};
    const data = store[roleId] || null;
    if (data) {
        window.currentRoleStatus = data;
    }
    if (locationEl) {
        locationEl.innerText = data && data.location ? String(data.location) : placeholder;
    }
    if (moodEl) {
        moodEl.innerText = data && data.mood ? String(data.mood) : placeholder;
    }
    if (fantasyEl) {
        fantasyEl.innerText = data && data.fantasy ? String(data.fantasy) : placeholder;
    }
    applyStatusBar('status-favorability-bar', 'status-favorability-text', data ? data.favorability : null, '');
    applyStatusBar('status-jealousy-bar', 'status-jealousy-text', data ? data.jealousy : null, '');
    applyStatusBar('status-possessiveness-bar', 'status-possessiveness-text', data ? data.possessiveness : null, '');
    applyStatusBar('status-lust-bar', 'status-lust-text', data ? data.lust : null, '');
    applyHeartRateBar(data ? data.heart_rate : null);
    if (thoughtEl) {
        if (data && data.inner_monologue) {
            thoughtEl.innerText = String(data.inner_monologue);
        } else {
            thoughtEl.innerText = placeholder;
        }
    }
}

function openStatusMonitorPanel() {
    const roleId = window.currentChatRole;
    const modal = document.getElementById('status-monitor-modal');
    if (!roleId || !modal) return;
    const card = modal.querySelector('.status-monitor-card');
    if (card) {
        card.classList.remove('show-history');
    }
    renderStatusMonitorPanel(roleId);
    modal.style.display = 'flex';
    updateStatusMonitorTime();
    if (window.statusMonitorTimerId) {
        clearInterval(window.statusMonitorTimerId);
        window.statusMonitorTimerId = null;
    }
    window.statusMonitorTimerId = setInterval(function () {
        updateStatusMonitorTime();
        if (typeof window.statusHeartBeatBase === 'number') {
            const bar = document.getElementById('status-heart-bar');
            if (bar) {
                const jitter = (Math.random() * 16) - 8;
                let value = window.statusHeartBeatBase + jitter;
                if (value < 0) value = 0;
                if (value > 100) value = 100;
                bar.style.width = value + '%';
            }
        }
    }, 1000);
}

function closeStatusMonitorPanel() {
    const modal = document.getElementById('status-monitor-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    if (window.statusMonitorTimerId) {
        clearInterval(window.statusMonitorTimerId);
        window.statusMonitorTimerId = null;
    }
}

function handleStatusMonitorMaskClick(e) {
    const modal = document.getElementById('status-monitor-modal');
    if (!modal) return;
    if (e && e.target === modal) {
        closeStatusMonitorPanel();
    }
}

function formatStatusHistoryTime(timestamp) {
    if (!timestamp) return '';
    var date = new Date(timestamp);
    var hours = String(date.getHours()).padStart(2, '0');
    var minutes = String(date.getMinutes()).padStart(2, '0');
    return hours + ':' + minutes;
}

function toggleStatusHistoryView() {
    const modal = document.getElementById('status-monitor-modal');
    if (!modal) return;
    const card = modal.querySelector('.status-monitor-card');
    if (!card) return;
    const isShowing = card.classList.contains('show-history');
    if (isShowing) {
        card.classList.remove('show-history');
    } else {
        card.classList.add('show-history');
        const roleId = window.currentChatRole;
        if (roleId) {
            renderStatusHistory(roleId);
        }
    }
}

function renderStatusHistory(roleId) {
    const listEl = document.getElementById('status-history-list');
    if (!listEl) return;
    const id = roleId || window.currentChatRole;
    if (!id) {
        listEl.innerHTML = '';
        return;
    }
    const history = getRoleStatusHistory(id);
    listEl.innerHTML = '';
    if (!Array.isArray(history) || history.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'status-history-empty';
        empty.innerText = '暂无状态日志';
        listEl.appendChild(empty);
        return;
    }
    const sorted = history.slice().sort(function (a, b) {
        const ta = a && (a.timestamp || a.updatedAt || 0);
        const tb = b && (b.timestamp || b.updatedAt || 0);
        return tb - ta;
    });
    sorted.forEach(function (item) {
        if (!item) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'status-history-item';
        const metaRow = document.createElement('div');
        metaRow.className = 'status-history-meta';
        const timeEl = document.createElement('div');
        timeEl.className = 'status-history-time';
        timeEl.innerText = formatStatusHistoryTime(item.timestamp || item.updatedAt);
        const metricsEl = document.createElement('div');
        metricsEl.className = 'status-history-metrics';
        const moodText = item.mood ? String(item.mood) : '';
        const heartText = typeof item.heart_rate === 'number' || (typeof item.heart_rate === 'string' && item.heart_rate)
            ? '💓 ' + String(item.heart_rate)
            : '';
        const lustText = typeof item.lust === 'number' || (typeof item.lust === 'string' && item.lust)
            ? '性欲: ' + String(item.lust)
            : '';
        const parts = [];
        if (moodText) parts.push('心情: ' + moodText);
        if (heartText) parts.push(heartText);
        if (lustText) parts.push(lustText);
        metricsEl.innerText = parts.join(' | ');
        metaRow.appendChild(timeEl);
        metaRow.appendChild(metricsEl);
        wrapper.appendChild(metaRow);
        if (item.inner_monologue) {
            const monoEl = document.createElement('div');
            monoEl.className = 'status-history-monologue';
            monoEl.innerText = String(item.inner_monologue);
            wrapper.appendChild(monoEl);
        }
        let pressTimer = null;
        function clearPressTimer() {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        }
        function handleDelete() {
            clearPressTimer();
            const confirmed = window.confirm('删除这条状态记录？');
            if (!confirmed) return;
            const store = window.roleStatusHistory && typeof window.roleStatusHistory === 'object' ? window.roleStatusHistory : {};
            let list = store[id];
            if (!Array.isArray(list)) return;
            const targetTs = item.timestamp || item.updatedAt || 0;
            list = list.filter(function (entry) {
                const ts = entry && (entry.timestamp || entry.updatedAt || 0);
                return ts !== targetTs;
            });
            store[id] = list;
            window.roleStatusHistory = store;
            try {
                localStorage.setItem('wechat_roleStatusHistory', JSON.stringify(store));
            } catch (e) { }
            renderStatusHistory(id);
        }
        function startPress(e) {
            clearPressTimer();
            pressTimer = setTimeout(function () {
                handleDelete();
            }, 600);
        }
        function cancelPress() {
            clearPressTimer();
        }
        wrapper.addEventListener('mousedown', startPress);
        wrapper.addEventListener('touchstart', startPress);
        wrapper.addEventListener('mouseup', cancelPress);
        wrapper.addEventListener('mouseleave', cancelPress);
        wrapper.addEventListener('touchend', cancelPress);
        wrapper.addEventListener('touchmove', cancelPress);
        wrapper.addEventListener('contextmenu', function (e) {
            if (e && typeof e.preventDefault === 'function') {
                e.preventDefault();
            }
            handleDelete();
        });
        listEl.appendChild(wrapper);
    });
}

function handleActions(roleId, actions) {
    const result = { postMessages: [] };
    if (!roleId || !actions || typeof actions !== 'object') return result;
    if (!window.chatData) window.chatData = {};
    if (!window.chatData[roleId]) window.chatData[roleId] = [];

    try {
        const act = actions || {};

        if (act.transfer) {
            const info = act.transfer;
            const amountNum = typeof info.amount === 'number' ? info.amount : parseFloat(info.amount);
            if (!isNaN(amountNum) && amountNum > 0) {
                const kindRaw = typeof info.kind === 'string' ? info.kind.toLowerCase() : '';
                let msgType = 'transfer';
                if (kindRaw === 'redpacket' || kindRaw === 'hongbao') {
                    msgType = 'redpacket';
                } else if (kindRaw === 'transfer' || kindRaw === 'zhuanzhang') {
                    msgType = 'transfer';
                }
                const now = Date.now();
                const transferMsg = {
                    role: 'ai',
                    type: msgType,
                    amount: amountNum.toFixed(2),
                    note: typeof info.remark === 'string' ? info.remark : '',
                    timestamp: now,
                    status: msgType === 'redpacket' ? 'unopened' : 'sent'
                };
                window.chatData[roleId].push(transferMsg);
                appendMessageToDOM(transferMsg);
            }
        }

        if (act.location) {
            const loc = act.location;
            const name = typeof loc.name === 'string' ? loc.name : '';
            const address = typeof loc.address === 'string' ? loc.address : '';
            const payload = JSON.stringify({ name: name, address: address });
            const now = Date.now();
            const aiMsg = {
                role: 'ai',
                content: payload,
                type: 'location',
                timestamp: now
            };
            window.chatData[roleId].push(aiMsg);
            appendMessageToDOM(aiMsg);
        }

        if (act.changeAvatar) {
            handleChangeAvatarAction(roleId, act.changeAvatar);
        }

        const familyAct = act.family_card || act.familyCard || act.send_family_card || act.sendFamilyCard;
        if (familyAct) {
            let rawAmount = null;
            if (typeof familyAct === 'number' || typeof familyAct === 'string') {
                rawAmount = familyAct;
            } else if (familyAct && typeof familyAct === 'object') {
                rawAmount = familyAct.amount != null ? familyAct.amount : (familyAct.value != null ? familyAct.value : familyAct.money);
            }
            const amt = normalizeFamilyCardAmount(rawAmount);
            if (amt) {
                result.postMessages.push({ type: 'family_card', amount: amt });
            }
        }
    } catch (e) {
        console.error('handleActions 处理失败:', e);
    }
    return result;
}

function normalizeImageUrlCandidate(url) {
    if (!url || typeof url !== 'string') return '';
    let u = url.trim();
    if (!u) return '';
    if (u.length >= 2 && ((u.startsWith('`') && u.endsWith('`')) || (u.startsWith('"') && u.endsWith('"')) || (u.startsWith("'") && u.endsWith("'")))) {
        u = u.slice(1, u.length - 1).trim();
    }
    const stickerMatch = u.match(/^\[STICKER:\s*([^\]]+)\]$/i);
    if (stickerMatch && stickerMatch[1]) {
        u = String(stickerMatch[1]).trim();
    }
    return u;
}

function isValidImageUrlCandidate(url) {
    const u = normalizeImageUrlCandidate(url);
    if (!u) return false;
    if (u.startsWith('data:image/')) return true;
    if (u.startsWith('blob:')) return true;
    if (/^(\/|\.\/|\.\.\/|assets\/)/i.test(u)) return true;
    let parsed = null;
    try {
        parsed = new URL(u);
    } catch (e) {
        return false;
    }
    if (!parsed) return false;
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const path = (parsed.pathname || '').toLowerCase();
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path)) return true;
    const q = (parsed.search || '').toLowerCase();
    if (q.includes('image') || q.includes('img') || q.includes('format=') || q.includes('mime=')) return true;
    return true;
}

function preloadImageUrl(url, timeoutMs) {
    return new Promise(function (resolve) {
        const u = normalizeImageUrlCandidate(url);
        if (!u) return resolve(false);
        const img = new Image();
        let done = false;
        let timerId = null;
        function finish(ok) {
            if (done) return;
            done = true;
            if (timerId) clearTimeout(timerId);
            img.onload = null;
            img.onerror = null;
            resolve(!!ok);
        }
        timerId = setTimeout(function () {
            finish(false);
        }, Math.max(800, timeoutMs || 2500));
        img.onload = function () { finish(true); };
        img.onerror = function () { finish(false); };
        try { img.referrerPolicy = 'no-referrer'; } catch (e) { }
        let srcToLoad = u;
        try {
            srcToLoad = new URL(u, window.location.href).href;
        } catch (e) { }
        img.src = srcToLoad;
    });
}

function ensureChatHeaderAvatar() {
    const existing = document.getElementById('current-chat-avatar');
    if (existing) existing.remove();
    return null;
}

function applyCharacterAvatarToUI(roleId, avatarUrl) {
    if (!roleId) return [];
    const profile = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : null;
    if (profile) {
        profile.avatar = avatarUrl;
    }

    const animatedTargets = [];

    if (window.currentChatRole === roleId) {
        const oldHeaderAvatar = document.getElementById('current-chat-avatar');
        if (oldHeaderAvatar) oldHeaderAvatar.remove();
    }

    const menuAvatar = document.getElementById('menu-role-avatar');
    if (menuAvatar && window.currentChatRole === roleId) {
        try { menuAvatar.referrerPolicy = 'no-referrer'; } catch (e) { }
        menuAvatar.src = avatarUrl;
        animatedTargets.push(menuAvatar);
    }

    const statusAvatar = document.getElementById('status-monitor-avatar-img');
    if (statusAvatar && window.currentChatRole === roleId) {
        try { statusAvatar.referrerPolicy = 'no-referrer'; } catch (e) { }
        statusAvatar.src = avatarUrl;
        animatedTargets.push(statusAvatar);
    }

    const callAvatar = document.getElementById('voice-call-avatar');
    if (callAvatar && window.currentChatRole === roleId) {
        try { callAvatar.referrerPolicy = 'no-referrer'; } catch (e) { }
        callAvatar.src = avatarUrl;
        animatedTargets.push(callAvatar);
    }

    if (window.currentChatRole === roleId) {
        const historyBox = document.getElementById('chat-history');
        if (historyBox) {
            const aiRows = historyBox.querySelectorAll('.msg-row[data-role="ai"] .msg-avatar img');
            aiRows.forEach(function (img) {
                try { img.referrerPolicy = 'no-referrer'; } catch (e) { }
                img.src = avatarUrl;
                animatedTargets.push(img);
            });
        }
    }

    return animatedTargets;
}

function runAvatarSwapAnimation(targets) {
    if (!targets || !targets.length) return;
    for (let i = 0; i < targets.length; i++) {
        const el = targets[i];
        if (!el || typeof el.animate !== 'function') continue;
        try {
            el.animate(
                [
                    { transform: 'scale(1)', filter: 'brightness(1)' },
                    { transform: 'scale(1.08)', filter: 'brightness(1.25)' },
                    { transform: 'scale(1)', filter: 'brightness(1)' }
                ],
                { duration: 420, easing: 'ease-out' }
            );
        } catch (e) { }
    }
}

function appendAvatarSwapError(roleId, text) {
    const now = Date.now();
    const msg = {
        role: 'ai',
        content: text || '我想换但图片加载失败了。',
        type: 'text',
        timestamp: now
    };
    if (!window.chatData) window.chatData = {};
    if (!window.chatData[roleId]) window.chatData[roleId] = [];
    window.chatData[roleId].push(msg);
    appendMessageToDOM(msg);
    saveData();
}

async function handleChangeAvatarAction(roleId, payload) {
    let chosenUrl = '';
    if (payload && typeof payload === 'object') {
        const rawIndex = payload.index != null ? payload.index : (payload.pick != null ? payload.pick : payload.choice);
        if (rawIndex != null) {
            const idx = parseInt(String(rawIndex), 10);
            if (!isNaN(idx) && idx > 0) {
                try {
                    const list = window.__latestUserImagesByRole && window.__latestUserImagesByRole[roleId]
                        ? window.__latestUserImagesByRole[roleId]
                        : [];
                    if (Array.isArray(list) && idx <= list.length) {
                        chosenUrl = list[idx - 1];
                    }
                } catch (e) { }
            }
        }
        if (!chosenUrl && payload.url) chosenUrl = payload.url;
    } else if (typeof payload === 'string') {
        chosenUrl = payload;
    }

    let avatarUrl = normalizeImageUrlCandidate(chosenUrl);
    if (!avatarUrl || !isValidImageUrlCandidate(avatarUrl)) {
        try {
            const list = window.__latestUserImagesByRole && window.__latestUserImagesByRole[roleId]
                ? window.__latestUserImagesByRole[roleId]
                : [];
            const ts = window.__latestUserImagesByRoleTs && window.__latestUserImagesByRoleTs[roleId]
                ? Number(window.__latestUserImagesByRoleTs[roleId])
                : 0;
            const isRecent = ts > 0 ? (Date.now() - ts) < (30 * 60 * 1000) : true;
            if (Array.isArray(list) && list.length > 0 && isRecent) {
                const last = list[list.length - 1];
                const fallback = normalizeImageUrlCandidate(last);
                if (fallback && isValidImageUrlCandidate(fallback)) {
                    avatarUrl = fallback;
                }
            }
        } catch (e) { }
    }
    if (!avatarUrl || !isValidImageUrlCandidate(avatarUrl)) {
        appendAvatarSwapError(roleId, '我想换，但这张图的链接看起来不太对，加载失败了。');
        return;
    }

    if (!window.charProfiles) window.charProfiles = {};
    if (!window.charProfiles[roleId]) window.charProfiles[roleId] = {};

    const prevAvatar = window.charProfiles[roleId].avatar || '';
    const targets = applyCharacterAvatarToUI(roleId, avatarUrl);
    runAvatarSwapAnimation(targets);

    const ok = await preloadImageUrl(avatarUrl, 25000);
    if (!ok) {
        if (prevAvatar) {
            const revertTargets = applyCharacterAvatarToUI(roleId, prevAvatar);
            runAvatarSwapAnimation(revertTargets);
        }
        appendAvatarSwapError(roleId, '我想换，但这张图我这边加载不出来，先不换了。');
        saveData();
        return;
    }

    saveData();
    if (typeof window.loadWechatChatList === 'function') {
        try { window.loadWechatChatList(true); } catch (e) { }
    }
}

function invokeAIWithCommonHandlers(systemPrompt, cleanHistory, userMessage, roleId, headerTitle, oldTitle) {
    if (typeof window.callAI === 'function') {
        window.callAI(
            systemPrompt,
            cleanHistory,
            userMessage,
            async (aiResponseText) => {
                let rawText = typeof aiResponseText === 'string' ? aiResponseText : '';

                let jsonPayload = null;
                let thoughtText = '';
                let innerMonologueText = '';
                let replyText = '';
                let systemEventText = '';
                let actions = null;

                // =================================================
                // 🛠️ 增强解析：确保能吃掉各种格式的 JSON
                // =================================================
                if (rawText) {
                    try {
                        // 1. 再次清洗，双重保险
                        let cleanJsonStr = rawText.trim();
                        // 如果还有 markdown 残留，再次清理
                        if (cleanJsonStr.startsWith('```')) {
                            cleanJsonStr = cleanJsonStr.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
                        }

                        // 2. 解析 JSON
                        const parsed = JSON.parse(cleanJsonStr);
                        if (parsed && typeof parsed === 'object') {
                            jsonPayload = parsed;
                        }
                    } catch (e) {
                        // 如果解析失败，说明 AI 可能真的只回了普通文本（容错）
                        console.warn("非标准 JSON 回复，降级为普通文本处理");
                    }
                }

                let pendingQuoteId = '';
                if (jsonPayload && typeof jsonPayload === 'object') {
                    const q = jsonPayload.quoteId != null
                        ? jsonPayload.quoteId
                        : (jsonPayload.quote_id != null ? jsonPayload.quote_id : (jsonPayload.reply_to != null ? jsonPayload.reply_to : ''));
                    pendingQuoteId = String(q || '').trim();
                }
                let quoteApplied = false;
                const tryAttachQuote = function (msgObj) {
                    if (!pendingQuoteId || quoteApplied || !msgObj) return;
                    msgObj.quoteId = pendingQuoteId;
                    resolveQuoteBlockForMessage(roleId, msgObj);
                    quoteApplied = true;
                };

                // =================================================
                // 🧠 逻辑分发：思考 / 回复 / 系统事件
                // =================================================
                if (jsonPayload) {
                    // 1. 提取内部思考 (Thought，用于逻辑推理)
                    if (typeof jsonPayload.thought === 'string') {
                        thoughtText = jsonPayload.thought;
                    }

                    // 2. 提取状态与内心独白 (Status + inner_monologue)
                    if (jsonPayload.status && typeof jsonPayload.status === 'object') {
                        const statusObj = jsonPayload.status;
                        if (typeof statusObj.inner_monologue === 'string') {
                            innerMonologueText = statusObj.inner_monologue;
                            saveHiddenThoughtToHistory(roleId, innerMonologueText);
                        } else if (!innerMonologueText && typeof jsonPayload.thought === 'string') {
                            innerMonologueText = jsonPayload.thought;
                            saveHiddenThoughtToHistory(roleId, innerMonologueText);
                        }
                    }

                    // 3. 提取动作 (Actions)
                    if (jsonPayload.actions && typeof jsonPayload.actions === 'object') {
                        actions = handleActions(roleId, jsonPayload.actions);
                    }

                    if (jsonPayload.status || innerMonologueText) {
                        updateRoleStatusFromAI(roleId, jsonPayload.status, innerMonologueText);
                    }

                    // 4. 处理核心回复 (Reply vs System Event)
                    // 注意：如果 reply 是 null，代表“不回消息”
                    if (jsonPayload.reply === null || jsonPayload.reply === undefined) {
                        // --- 物理阻断状态 (如洗澡/手术) ---
                        replyText = ''; // 既然是 null，就不要显示气泡

                        // 检查是否有系统事件提示
                        if (jsonPayload.system_event) {
                            systemEventText = String(jsonPayload.system_event);
                            appendSystemStatusToDOM(roleId, systemEventText); // 显示灰色小字
                        }
                    } else {
                        // --- 正常回复 ---
                        replyText = String(jsonPayload.reply);
                    }

                    // 5. 将处理后的文本赋值给 rawText，供后续流程渲染
                    // 关键：这里我们只把 replyText 给后续流程，这样界面上就看不到 JSON 代码了！
                    rawText = replyText;
                }
                else {
                    // 如果不是 JSON，尝试去除旧版的 <thinking> 标签作为兜底
                    rawText = rawText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
                }

                // =================================================
                // 🛑 阻断检查：如果 rawText 是空的（因为在洗澡），直接结束
                // =================================================
                if (!rawText && !jsonPayload?.actions) {
                    // 恢复标题状态
                    if (headerTitle) headerTitle.innerText = oldTitle;
                    // 保存数据（因为可能存了 thought 或 system_event）
                    saveData();
                    return; // 不执行后续的气泡渲染
                }

                let listenTogetherDecisions = [];
                const ltDecision = applyListenTogetherDecisionFromAI(rawText || '', roleId);
                if (ltDecision && ltDecision.handled) {
                    listenTogetherDecisions = Array.isArray(ltDecision.decisions) ? ltDecision.decisions : [];
                    rawText = String(ltDecision.text || '').trim();
                }

                if (rawText.includes('[[VIDEO_CALL_USER]]')) {
                    if (headerTitle) headerTitle.innerText = oldTitle;
                    showIncomingCallUI(roleId, true);
                    return;
                }
                if (rawText.includes('[[CALL_USER]]')) {
                    if (headerTitle) headerTitle.innerText = oldTitle;
                    showIncomingCallUI(roleId, false);
                    return;
                }

                const familyParsed = parseAIFamilyCardFromContent(rawText || '');
                const familyCardAmountFromText = familyParsed.amount;
                rawText = familyParsed.text || '';

                const parsed = parseAITransferFromContent(rawText || '');
                const transferInfo = parsed.transfer;
                const acceptTransfer = parsed.acceptTransfer;
                const openRedpacket = parsed.openRedpacket;
                const baseText = parsed.text || '';
                const parts = baseText.split('|||');
                if (parts.length > 7) parts.length = 7;

                let hasNormalReply = false;

                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i].trim();
                    if (!part) continue;

                    const cleanedPart = part.replace(/\s*\[\[DICE\]\]\s*/g, ' ').trim();
                    const isSys = cleanedPart.startsWith('[') ||
                        (cleanedPart.startsWith('(') && cleanedPart.endsWith(')')) ||
                        cleanedPart.includes('系统：');

                    if (!isSys) {
                        hasNormalReply = true;
                        break;
                    }
                }

                if (hasNormalReply || (jsonPayload && systemEventText)) {
                    if (window.chatData[roleId]) {
                        window.chatData[roleId].forEach(m => {
                            if (m.role === 'me' && m.status === 'sent') {
                                m.status = 'read';
                            }
                        });
                    }

                    const labels = document.querySelectorAll('.msg-status-text');
                    labels.forEach(label => {
                        if (label.innerText === '已送达') {
                            label.innerText = '已读';
                        }
                    });
                }

                const baseDelay = parseInt(localStorage.getItem('chat_bubble_delay')) || 200;

                // 🔥【修改开始】循环处理 AI 回复的每一段
                for (let i = 0; i < parts.length; i++) {
                    let part = parts[i].trim();
                    if (!part) continue;

                    const now = Date.now();
                    let hasDice = false;

                    // === 骰子处理（保持不变）===
                    if (part.indexOf('[[DICE]]') !== -1) {
                        const point = Math.floor(Math.random() * 6) + 1;
                        const diceMsg = {
                            role: 'ai',
                            content: String(point),
                            type: 'dice',
                            timestamp: now
                        };
                        ensureChatMessageId(diceMsg);
                        tryAttachQuote(diceMsg);
                        window.chatData[roleId].push(diceMsg);
                        appendMessageToDOM(diceMsg);
                        hasDice = true;
                        part = part.replace(/\s*\[\[DICE\]\]\s*/g, ' ').trim();
                        if (!part) {
                            if (i < parts.length - 1) {
                                await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                            }
                            continue;
                        }
                    }

                    let msgType = 'text';
                    let msgContent = part;

                    // === 🔥【修改开始】语音识别（优先级最高）===
                    // 修改：去掉了 ^ 和 $，只要包含标签就识别，防止 AI 加废话
                    const voiceMatch = part.match(/\[VOICE:\s*([\s\S]*?)\]/i);
                    if (voiceMatch) {
                        msgType = 'voice';
                        // 提取括号里的内容，自动忽略括号外的“好的”、“嗯”等废话
                        msgContent = voiceMatch[1].trim();
                    }

                    // 修改：确保照片也能宽松匹配
                    const photoMatch = part.match(/\[PHOTO:\s*([\s\S]*?)\]/i);
                    if (!voiceMatch && photoMatch) {
                        msgType = 'ai_secret_photo';
                        msgContent = photoMatch[1].trim();
                    }

                    const locationPattern = /\[LOCATION:\s*([^|\]]*?)\s*\|\s*([^\]]*?)\s*\]/i;
                    const locationMatch = part.match(locationPattern);
                    if (!voiceMatch && !photoMatch && locationMatch) {
                        msgType = 'location';
                        const name = (locationMatch[1] || '').trim();
                        const address = (locationMatch[2] || '').trim();
                        msgContent = JSON.stringify({ name: name, address: address });

                        const remainText = part.replace(locationPattern, '').trim();
                        if (remainText) {
                            const textMsg = {
                                role: 'ai',
                                content: remainText,
                                type: 'text',
                                timestamp: now
                            };
                                ensureChatMessageId(textMsg);
                                tryAttachQuote(textMsg);
                            window.chatData[roleId].push(textMsg);
                            appendMessageToDOM(textMsg);

                            await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                        }
                    }

                    if (!voiceMatch && !photoMatch && !locationMatch) {
                        const redpacketPattern = /\[REDPACKET:\s*([0-9]+(?:\.[0-9]+)?)\s*:\s*([^\]]*?)\]/i;
                        const redpacketMatch = part.match(redpacketPattern);
                        if (redpacketMatch) {
                            const amount = redpacketMatch[1].trim();
                            let note = redpacketMatch[2].trim();
                            if (!note) {
                                note = '恭喜发财，大吉大利';
                            }
                            const redMsg = {
                                role: 'ai',
                                type: 'redpacket',
                                amount: amount,
                                note: note,
                                timestamp: now,
                                status: 'unopened'
                            };
                            ensureChatMessageId(redMsg);
                            tryAttachQuote(redMsg);
                            window.chatData[roleId].push(redMsg);
                            appendMessageToDOM(redMsg);

                            const remainTextForRed = part.replace(redpacketPattern, '').trim();
                            if (remainTextForRed) {
                                const textMsg = {
                                    role: 'ai',
                                    content: remainTextForRed,
                                    type: 'text',
                                    timestamp: now
                                };
                                ensureChatMessageId(textMsg);
                                tryAttachQuote(textMsg);
                                window.chatData[roleId].push(textMsg);
                                appendMessageToDOM(textMsg);
                            }

                            if (i < parts.length - 1) {
                                await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                            }
                            continue;
                        }

                        const stickerPattern = /\[STICKER:\s*([^\s\]]+)\]/i;
                        const stickerMatch = part.match(stickerPattern);

                        if (stickerMatch) {
                            let url = stickerMatch[1].trim();
                            if (url.startsWith('//')) {
                                url = 'https:' + url;
                            }
                            msgType = 'image';
                            msgContent = url;

                            const remainText = part.replace(stickerPattern, '').trim();
                            if (remainText) {
                                const textMsg = {
                                    role: 'ai',
                                    content: remainText,
                                    type: 'text',
                                    timestamp: now
                                };
                                ensureChatMessageId(textMsg);
                                tryAttachQuote(textMsg);
                                window.chatData[roleId].push(textMsg);
                                appendMessageToDOM(textMsg);

                                await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                            }
                        } else if (/^https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(part)) {
                            msgType = 'image';
                            msgContent = part;
                        }
                    }

                    // === 语音时长计算（保持不变）===
                    let duration = 0;
                    if (msgType === 'voice') {
                        duration = calcVoiceDurationSeconds(msgContent);
                    }

                    // === 构建消息对象并发送（保持不变）===
                    const aiMsg = {
                        role: 'ai',
                        content: msgContent,
                        type: msgType,
                        timestamp: now
                    };
                    if (msgType === 'voice') {
                        aiMsg.duration = duration;
                    }
                    ensureChatMessageId(aiMsg);
                    tryAttachQuote(aiMsg);

                    window.chatData[roleId].push(aiMsg);
                    appendMessageToDOM(aiMsg);

                    // === 模拟打字延迟（调整为更自然的间隔）===
                    if (i < parts.length - 1) {
                        // 增加消息之间的延迟，使回复更像真人
                        const delayTime = baseDelay * 2 + Math.random() * baseDelay;
                        await new Promise(r => setTimeout(r, delayTime));
                    }
                }

                // 🔥【修改结束】

                if ((!listenTogetherDecisions || !listenTogetherDecisions.length) && Array.isArray(cleanHistory) && cleanHistory.length) {
                    const lastH = cleanHistory[cleanHistory.length - 1];
                    if (lastH && lastH.role === 'me' && lastH.type === 'listen_invite') {
                        let inviteId = String(lastH.inviteId || '').trim();
                        if (!inviteId) inviteId = findLatestPendingInviteId(roleId);
                        if (inviteId && !findInviteDecisionMessage(roleId, inviteId)) {
                            const declineRe = /(拒绝|不了|不行|下次|改天|没空|忙|不太方便)/;
                            const contextRe = /(一起听|一起听歌|听歌|听这首)/;
                            const shouldDecline = declineRe.test(baseText) && contextRe.test(baseText);
                            listenTogetherDecisions = [{ kind: shouldDecline ? 'DECLINE' : 'ACCEPT', inviteId: inviteId }];
                        }
                    }
                }

                if (Array.isArray(listenTogetherDecisions) && listenTogetherDecisions.length) {
                    for (let i = 0; i < listenTogetherDecisions.length; i++) {
                        const d = listenTogetherDecisions[i] || {};
                        const kind = String(d.kind || '').toUpperCase();
                        const inviteId = String(d.inviteId || '').trim();
                        if (!inviteId) continue;
                        if (kind === 'ACCEPT') {
                            if (!findInviteDecisionMessage(roleId, inviteId)) {
                                updateInviteStatusInData(roleId, inviteId, 'accepted');
                                const row = document.querySelector('.msg-row[data-type="listen_invite"] .listen-invite-card[data-invite-id="' + String(inviteId) + '"]');
                                const rowEl = row && row.closest ? row.closest('.msg-row') : null;
                                if (rowEl) updateInviteCardRow(rowEl, 'accepted');
                                characterAcceptsInvite(inviteId, roleId);
                            }
                        } else if (kind === 'DECLINE') {
                            characterDeclinesInvite(inviteId, '', roleId);
                        }
                    }
                }

                const familyCardAmountFromActions = (function () {
                    if (!actions || !actions.postMessages || !Array.isArray(actions.postMessages)) return '';
                    for (let i = 0; i < actions.postMessages.length; i++) {
                        const p = actions.postMessages[i];
                        if (p && p.type === 'family_card' && p.amount) return String(p.amount);
                    }
                    return '';
                })();
                const familyCardAmount = familyCardAmountFromActions || familyCardAmountFromText;
                if (familyCardAmount && window.FamilyCard && typeof window.FamilyCard.receiveFromRole === 'function') {
                    window.FamilyCard.receiveFromRole(roleId, familyCardAmount);
                }

                if (transferInfo) {
                    const nowTransfer = Date.now();
                    let msgTypeForTransfer = 'transfer';
                    if (transferInfo.kind === 'redpacket') {
                        msgTypeForTransfer = 'redpacket';
                    } else if (transferInfo.kind === 'transfer') {
                        msgTypeForTransfer = 'transfer';
                    } else {
                        let lastUserText = "";
                        const historyList = window.chatData[roleId] || [];
                        for (let i = historyList.length - 1; i >= 0; i--) {
                            const m = historyList[i];
                            if (m && m.role === 'me') {
                                lastUserText = String(m.content || "");
                                break;
                            }
                        }
                        if (lastUserText) {
                            const lower = lastUserText.toLowerCase();
                            if (lastUserText.includes('红包')) {
                                msgTypeForTransfer = 'redpacket';
                            } else if (
                                lastUserText.includes('转账') ||
                                lastUserText.includes('转给') ||
                                lastUserText.includes('转我') ||
                                lower.includes('transfer')
                            ) {
                                msgTypeForTransfer = 'transfer';
                            }
                        }
                    }

                    const transferMsg = {
                        role: 'ai',
                        type: msgTypeForTransfer,
                        amount: transferInfo.amount,
                        note: transferInfo.remark || '',
                        timestamp: nowTransfer,
                        status: msgTypeForTransfer === 'redpacket' ? 'unopened' : 'sent'
                    };
                    window.chatData[roleId].push(transferMsg);
                    appendMessageToDOM(transferMsg);
                }

                if (acceptTransfer) {
                    markLastUserTransferAccepted(roleId);
                }

                if (openRedpacket) {
                    markLastUserRedpacketOpened(roleId);
                }

                saveData();

                if (typeof window.maybeAutoUpdateMemoryArchive === 'function') {
                    window.maybeAutoUpdateMemoryArchive(roleId);
                }

                if (headerTitle) headerTitle.innerText = oldTitle;
            },
            (errorMessage) => {
                if (headerTitle) headerTitle.innerText = oldTitle;

                alert("❌ API 调用失败\n\n" + errorMessage + "\n\n请检查：\n• API 地址是否正确\n• API 密钥是否有效\n• 网络连接是否正常");

                console.error("❌ API 调用失败:", errorMessage);
            }
        );
    } else {
        if (headerTitle) headerTitle.innerText = oldTitle;
        alert("❌ API 模块未加载\n\n请刷新页面后重试");
    }
}

function markLastUserTransferAccepted(roleId) {
    const historyBox = document.getElementById('chat-history');
    const list = window.chatData[roleId] || [];
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (m && m.role === 'me' && m.type === 'transfer' && m.status !== 'accepted') {
            m.status = 'accepted';
            
            const ts = m.timestamp;
            if (historyBox && ts) {
                const selector = '.msg-row[data-role="me"][data-type="transfer"][data-timestamp="' + ts + '"] .transfer-bubble';
                const bubble = historyBox.querySelector(selector);
                if (bubble) {
                    bubble.classList.add('transfer-bubble-accepted');
                    const footer = bubble.querySelector('.transfer-footer');
                    if (footer) {
                        footer.innerText = '对方已收钱';
                    }
                }
            }
            saveData();
            break;
        }
    }
}

function markLastUserRedpacketOpened(roleId) {
    const historyBox = document.getElementById('chat-history');
    const list = window.chatData[roleId] || [];
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (m && m.role === 'me' && m.type === 'redpacket' && m.status !== 'opened') {
            m.status = 'opened';
            
            const ts = m.timestamp;
            if (historyBox && ts) {
                const selector = '.msg-row[data-role="me"][data-type="redpacket"][data-timestamp="' + ts + '"] .redpacket-bubble';
                const bubble = historyBox.querySelector(selector);
                if (bubble) {
                    bubble.setAttribute('data-status', 'opened');
                    const statusEl = bubble.querySelector('.redpacket-status-text');
                    if (statusEl) {
                        statusEl.innerText = '红包已领取';
                    }
                }
            }
            saveData();
            break;
        }
    }
}

async function sendAITransferSystemNotice(roleId, status) {
    if (!roleId) return;

    const profile = window.charProfiles[roleId] || {};

    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【语音消息规则】\n你可以发送语音消息。当你觉得打字不方便、情绪激动、或者需要长篇大论时，或者用户要求你发语音时，请使用格式：[VOICE: 这里是语音转文字的内容] 回复。`;

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];
    const fullHistory = history.map(m => ensureMessageContent({ ...m }));
    const cleanHistory = fullHistory.filter(m => m && m.content);

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    let text = '';
    if (status === 'accepted') {
        text = '(系统提示：用户收下了你的转账)';
    } else if (status === 'returned') {
        text = '(系统提示：用户退回了你的转账)';
    } else {
        return;
    }

    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, text, roleId, headerTitle, oldTitle);
}

async function sendAIRedpacketSystemNotice(roleId, status, amount) {
    if (!roleId) return;

    const profile = window.charProfiles[roleId] || {};

    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【语音消息规则】\n你可以发送语音消息。当你觉得打字不方便、情绪激动、或者需要长篇大论时，或者用户要求你发语音时，请使用格式：[VOICE: 这里是语音转文字的内容] 回复。`;

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];
    const fullHistory = history.map(m => ensureMessageContent({ ...m }));
    const cleanHistory = fullHistory.filter(m => m && m.content);

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    let text = '';
    if (status === 'accepted') {
        const safeAmount = amount ? String(amount) : '';
        text = safeAmount
            ? `(系统提示：用户领取了你的红包，金额 ${safeAmount} 元)`
            : '(系统提示：用户领取了你的红包)';
    } else if (status === 'declined') {
        text = '(系统提示：用户没有领取红包，将红包退回)';
    } else {
        return;
    }

    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, text, roleId, headerTitle, oldTitle);
}

async function handleImageForAI(base64, roleId) {
    if (!roleId) return;

    const profile = window.charProfiles[roleId] || {};

    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【语音消息规则】\n你可以发送语音消息。当你觉得打字不方便、情绪激动、或者需要长篇大论时，或者用户要求你发语音时，请使用格式：[VOICE: 这里是语音转文字的内容] 回复。`;

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];
    const cleanHistory = history.filter(msg => msg && msg.content);

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    let caption = "";
    const input = document.getElementById('msg-input');
    if (input && input.value) {
        caption = input.value.trim();
    }

    const userPayload = {
        type: 'image',
        base64: base64,
        text: caption
    };

    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, userPayload, roleId, headerTitle, oldTitle);
}

async function handleImagesForAI(images, roleId, captionOverride) {
    if (!roleId) return;
    const list = Array.isArray(images) ? images.filter(u => typeof u === 'string' && u) : [];
    if (!list.length) return;

    const profile = window.charProfiles[roleId] || {};

    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【语音消息规则】\n你可以发送语音消息。当你觉得打字不方便、情绪激动、或者需要长篇大论时，或者用户要求你发语音时，请使用格式：[VOICE: 这里是语音转文字的内容] 回复。`;

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];
    const cleanHistory = history.filter(msg => msg && msg.content);

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    let caption = typeof captionOverride === 'string' ? captionOverride : "";
    if (!caption) {
        const input = document.getElementById('msg-input');
        if (input && input.value) {
            caption = String(input.value).trim();
        }
    }

    const userPayload = {
        type: 'images',
        images: list,
        text: caption
    };

    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, userPayload, roleId, headerTitle, oldTitle);
}

function compressImageFileToDataUrl(file, maxSize) {
    return new Promise(function (resolve) {
        if (!file) return resolve('');
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxWidth = maxSize || 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                let out = '';
                try {
                    out = canvas.toDataURL('image/jpeg', 0.6);
                } catch (e2) {
                    out = '';
                }
                resolve(out);
            };
            img.onerror = function () { resolve(''); };
            img.src = e.target && e.target.result ? e.target.result : '';
        };
        reader.onerror = function () { resolve(''); };
        try {
            reader.readAsDataURL(file);
        } catch (e) {
            resolve('');
        }
    });
}

// =========================================================
// 🔄 替换结束
// =========================================================

// =========================================================
// 渲染消息到屏幕 (修复版：精确识别系统提示 + 表情包)
// =========================================================
function appendMessageToDOM(msg) {
    const historyBox = document.getElementById('chat-history');
    if (!historyBox) return;

    if (msg && msg.hidden) {
        return;
    }

    if (msg && msg.type === 'call_memory') {
        return;
    }

    if (msg && msg.type === 'location_share') {
        return;
    }

    const msgId = ensureChatMessageId(msg);

    if (
        msg &&
        (msg.type === 'system' || msg.type === 'system_event' || msg.role === 'system') &&
        typeof msg.content === 'string' &&
        msg.content.indexOf('[系统]') === 0 &&
        (msg.content.indexOf('一起听') !== -1 || msg.content.indexOf('歌曲切换为') !== -1)
    ) {
        return;
    }

    if (msg && msg.type === 'system_event') {
        const text = msg && msg.content !== undefined ? msg.content : "";
        const sysRow = document.createElement('div');
        sysRow.className = 'sys-msg-row';
        if (msgId) {
            sysRow.setAttribute('data-msg-id', msgId);
        }
        if (msg.timestamp) {
            sysRow.setAttribute('data-timestamp', String(msg.timestamp));
        }
        sysRow.innerHTML = `<span class="sys-msg-text">${text}</span>`;
        historyBox.appendChild(sysRow);
        historyBox.scrollTop = historyBox.scrollHeight;
        return;
    }
    if (msg && msg.type === 'system') {
        const text = msg && msg.content !== undefined ? msg.content : "";
        const sysRow = document.createElement('div');
        sysRow.className = 'sys-msg-row';
        if (msgId) {
            sysRow.setAttribute('data-msg-id', msgId);
        }
        if (msg.timestamp) {
            sysRow.setAttribute('data-timestamp', String(msg.timestamp));
        }
        sysRow.innerHTML = `<span class="sys-msg-text">${text}</span>`;
        historyBox.appendChild(sysRow);
        historyBox.scrollTop = historyBox.scrollHeight;
        return;
    }

    const content = msg && msg.content !== undefined ? msg.content : "";
    let displayContent = content;
    let shouldTriggerLocationShare = false;
    if (msg && msg.role === 'me' && (msg.type === undefined || msg.type === 'text')) {
        displayContent = stripLocationSharePrefix(content);
    }

    if (msg && msg.role === 'ai' && typeof content === 'string') {
        if (content.indexOf(':::ACTION_TRIGGER_LOCATION:::') !== -1) {
            shouldTriggerLocationShare = true;
            const stripped = content.replace(/:::ACTION_TRIGGER_LOCATION:::/g, '').trim();
            msg.content = stripped;
            displayContent = stripped;
        }
    }

    // === 🔥 核心改进：精确识别系统消息 ===
    const isSysMsg = detectSystemMessage(msg, content);

    if (isSysMsg && msg.role === 'ai') {
        const sysRow = document.createElement('div');
        sysRow.className = 'sys-msg-row';
        if (msg.timestamp) {
            sysRow.setAttribute('data-timestamp', String(msg.timestamp));
        }
        sysRow.innerHTML = `<span class="sys-msg-text">${content}</span>`;
        historyBox.appendChild(sysRow);
        historyBox.scrollTop = historyBox.scrollHeight;
        return;
    }

    // --- 1. 时间显示逻辑 ---
    const msgTime = msg.timestamp || 0;
    if (msgTime > 0) {
        if (window.lastRenderedTime === 0 || (msgTime - window.lastRenderedTime > 300000)) {
            const timeLabel = document.createElement('div');
            timeLabel.className = 'chat-time-label';
            timeLabel.style.cssText = "text-align:center; font-size:12px; color:#b2b2b2; margin:20px 0 10px 0; clear:both;";
            timeLabel.innerText = formatChatTime(msgTime);
            historyBox.appendChild(timeLabel);
            window.lastRenderedTime = msgTime;
        } else {
            window.lastRenderedTime = msgTime;
        }
    }

    // --- 2. 准备基础数据 ---
    const roleId = window.currentChatRole;
    const isMe = (msg.role === 'me');
    let avatarUrl = "";

    resolveQuoteBlockForMessage(roleId, msg);

    if (isMe) {
        const myPersona = window.userPersonas[roleId] || {};
        avatarUrl = myPersona.avatar || "assets/chushitouxiang.jpg";
    } else {
        const profile = window.charProfiles[roleId] || {};
        avatarUrl = profile.avatar || "assets/chushitouxiang.jpg";
    }

    let smallTimeStr = msgTime > 0 ? formatChatTime(msgTime) : "";

    // --- 3. 🔥 构建气泡内容 (支持引用块) ---
    let bubbleHtml = "";

    if (msg.type === 'listen_invite') {
        const inviteId = String(msg.inviteId || '');
        const p = getCurrentUserProfile();
        const userName = msg.userName ? String(msg.userName) : String(p.name || '我');
        const userAvatar = msg.userAvatar ? String(msg.userAvatar) : String(p.avatar || 'assets/chushitouxiang.jpg');
        const status = String(msg.inviteStatus || 'pending');
        const isPending = status === 'pending';
        const isCancelled = status === 'cancelled';
        const isDeclined = status === 'declined';
        const isAccepted = status === 'accepted';
        const stateText = isCancelled ? '已取消' : (isDeclined ? '已拒绝' : (isAccepted ? '已接受' : '等待对方回应...'));
        bubbleHtml = `
            <div class="msg-bubble listen-invite-bubble custom-bubble-content">
                <div class="listen-invite-card invite-card-sent${(isCancelled || isDeclined) ? ' is-disabled' : ''}${isCancelled ? ' is-cancelled' : ''}${isAccepted ? ' is-accepted' : ''}" data-invite-id="${inviteId}">
                    <div class="listen-invite-body">
                        <div class="listen-invite-avatars">
                            <div class="listen-invite-avatar">
                                <img src="${userAvatar}" alt="" />
                            </div>
                            <div class="listen-invite-line" aria-hidden="true">
                                <svg viewBox="0 0 160 40" preserveAspectRatio="none">
                                    <polyline
                                        points="0,20 46,20 58,12 72,30 86,14 100,20 160,20"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                                <i class="bx bxs-heart" aria-hidden="true"></i>
                            </div>
                            <div class="listen-invite-avatar"></div>
                        </div>
                        <div class="listen-invite-title">${userName}</div>
                        <div class="listen-invite-subtext">邀请你一起听</div>
                        <div class="listen-invite-state">${stateText}</div>
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'listen_invite_accepted') {
        const p = getCurrentUserProfile();
        const userAvatar = msg.userAvatar ? String(msg.userAvatar) : String(p.avatar || 'assets/chushitouxiang.jpg');
        const characterName = msg.characterName ? String(msg.characterName) : '对方';
        const characterAvatar = msg.characterAvatar ? String(msg.characterAvatar) : avatarUrl;
        bubbleHtml = `
            <div class="msg-bubble listen-invite-bubble custom-bubble-content">
                <div class="listen-invite-card invite-card-accepted">
                    <div class="listen-invite-body">
                        <div class="listen-invite-avatars">
                            <div class="listen-invite-avatar">
                                <img src="${userAvatar}" alt="" />
                            </div>
                            <div class="listen-invite-line" aria-hidden="true">
                                <svg viewBox="0 0 160 40" preserveAspectRatio="none">
                                    <polyline
                                        points="0,20 46,20 58,12 72,30 86,14 100,20 160,20"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                                <i class="bx bxs-heart" aria-hidden="true"></i>
                            </div>
                            <div class="listen-invite-avatar">
                                <img src="${characterAvatar}" alt="" />
                            </div>
                        </div>
                        <div class="listen-invite-subtext">${characterName} 已加入一起听</div>
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'listen_invite_declined') {
        const characterName = msg.characterName ? String(msg.characterName) : '对方';
        const extra = msg.extraText ? String(msg.extraText) : '';
        const extraHtml = extra ? `<div class="listen-invite-state">${extra}</div>` : '';
        bubbleHtml = `
            <div class="msg-bubble listen-invite-bubble custom-bubble-content">
                <div class="listen-invite-card invite-card-accepted is-disabled">
                    <div class="listen-invite-body">
                        <div class="listen-invite-subtext">${characterName} 拒绝了一起听</div>
                        ${extraHtml}
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'history') {
        // 聊天记录类型
        const lines = msg.preview || ["聊天记录详情..."];
        let linesHTML = lines.map(line => `<div class="history-row">${line}</div>`).join('');
        bubbleHtml = `
            <div class="history-bubble-container" onclick="alert('查看详情功能暂未开发')">
                <div class="history-title">聊天记录</div>
                <div class="history-divider"></div>
                <div class="history-content">${linesHTML}</div>
            </div>`;
    } else if (msg.type === 'image') {
        bubbleHtml = `
            <div class="msg-bubble msg-bubble-image custom-bubble-content custom-image-message">
                <img src="${content}">
            </div>
        `;
    } else if (msg.type === 'transfer') {
        const amount = msg.amount || "";
        const note = msg.note || "";
        const noteHtml = note ? `<div class="transfer-note">${note}</div>` : '';
        const status = msg.status || 'sent';
        let extraClass = '';
        if (status === 'accepted' || status === 'returned') {
            extraClass = ' transfer-bubble-accepted';
        }
        let footerText = '待领取';
        if (msg.role === 'me') {
            if (status === 'accepted') {
                footerText = '对方已收钱 ✓';
            }
        } else {
            if (status === 'accepted') {
                footerText = '已收钱';
            } else if (status === 'returned') {
                footerText = '已退回';
            }
        }
        bubbleHtml = `
            <div class="msg-bubble transfer-bubble custom-bubble-content custom-transfer-card${extraClass}">
                <div class="transfer-main">
                    <div class="transfer-icon-circle">
                        <i class="bx bx-transfer"></i>
                    </div>
                    <div class="transfer-info">
                        <div class="transfer-amount">¥${amount}</div>
                        ${noteHtml}
                    </div>
                </div>
                <div class="transfer-split"></div>
                <div class="transfer-footer">${footerText}</div>
            </div>
        `;
    } else if (msg.type === 'redpacket') {
        const amount = msg.amount || "";
        let note = msg.note || '';
        if (!note) {
            note = '恭喜发财，大吉大利';
        }
        const status = msg.status || 'unopened';
        const isOpened = status === 'opened';
        const amountHtml = isOpened && amount ? `<div class="redpacket-amount">¥${amount}</div>` : '';
        const statusText = isOpened ? '红包已领取' : '领取红包';
        bubbleHtml = `
            <div class="msg-bubble redpacket-bubble custom-bubble-content" data-status="${status}">
                <div class="redpacket-main">
                    <div class="redpacket-icon"></div>
                    <div class="redpacket-info">
                        <div class="redpacket-note">${note}</div>
                        <div class="redpacket-status-text">${statusText}</div>
                    </div>
                    ${amountHtml}
                </div>
            </div>
        `;
    } else if (msg.type === 'family_card') {
        const amount = msg.amount || "";
        const status = msg.status === 'accepted' ? 'accepted' : (msg.role === 'ai' ? 'pending' : (msg.status || 'sent'));
        const subtitle = status === 'accepted'
            ? '已领取'
            : (msg.role === 'ai' ? `额度 ¥${amount}，立即领取` : `额度 ¥${amount}`);
        bubbleHtml = `
            <div class="msg-bubble family-card-bubble custom-bubble-content" data-status="${status}">
                <div class="family-card-main">
                    <div class="family-card-icon"></div>
                    <div class="family-card-text">
                        <div class="family-card-title">送你一张亲属卡</div>
                        <div class="family-card-subtitle">${subtitle}</div>
                    </div>
                </div>
                <div class="family-card-divider"></div>
                <div class="family-card-footer">亲属卡</div>
            </div>
        `;
    } else if (msg.type === 'call_end') {
        const safeText = content.replace(/\n/g, ' ');
        bubbleHtml = `
            <div class="msg-bubble call-end-bubble custom-bubble-content">
                <div class="call-end-main">
                    <i class="bx bx-phone-call call-end-icon"></i>
                    <span class="call-end-text">${safeText}</span>
                </div>
            </div>
        `;
    } else if (msg.type === 'voice') {
        const safeVoiceText = content.replace(/\n/g, '<br>');
        const durationSec = msg.duration || calcVoiceDurationSeconds(content);
        bubbleHtml = `
            <div class="msg-bubble voice-bubble custom-bubble-content">
                <div class="voice-main">
                    <div class="voice-icon">
                        <span class="voice-wave wave1"></span>
                        <span class="voice-wave wave2"></span>
                        <span class="voice-wave wave3"></span>
                    </div>
                    <div class="voice-duration">${durationSec}"</div>
                </div>
                <div class="voice-text" style="display:none;">${safeVoiceText}</div>
            </div>
        `;
    } else if (msg.type === 'dice') {
        const point = content || "";
        let animClass = "";
        if (msgTime && (Date.now() - msgTime < 2000)) {
            animClass = ' dice-anim';
        }
        bubbleHtml = `
            <div class="msg-bubble custom-bubble-content">
                <i class="bx bx-dice-${point} dice-icon${animClass}"></i>
            </div>
        `;
    } else if (msg.type === 'location') {
        let name = '';
        let address = '';
        try {
            const obj = JSON.parse(content || '{}');
            if (obj && typeof obj === 'object') {
                name = String(obj.name || '').trim();
                address = String(obj.address || '').trim();
            }
        } catch (e) { }
        const nameHtml = name ? `<div class="location-name">${name}</div>` : `<div class="location-name">位置</div>`;
        const addressHtml = address ? `<div class="location-address">${address}</div>` : '';
        bubbleHtml = `
            <div class="msg-bubble location-bubble custom-bubble-content custom-location-card">
                <div class="location-card">
                    <div class="location-map"><img src="assets/map.jpg"></div>
                    <div class="location-info">
                        ${nameHtml}
                        ${addressHtml}
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'ai_secret_photo') {
        bubbleHtml = `
            <div class="msg-bubble msg-bubble-image ai-photo-bubble custom-bubble-content custom-image-message">
                <img src="${window.virtualPhotoImagePath}">
            </div>
        `;
    } else {
        const stickerMatch = String(content || '').match(/\[STICKER:\s*([^\s\]]+)\]/i);
        if (stickerMatch) {
            let url = stickerMatch[1].trim();
            if (url.startsWith('//')) {
                url = 'https:' + url;
            }
            bubbleHtml = `
                <div class="msg-bubble msg-bubble-image custom-bubble-content custom-sticker">
                    <img src="${url}">
                </div>
            `;
        } else {
            const safeContent = String(displayContent || '').replace(/\n/g, '<br>');
            let quoteBlockHtml = "";
            if (msg.quote && msg.quote.text) {
                let shortQuote = msg.quote.text;
                shortQuote = String(shortQuote || '').replace(/\s+/g, ' ').trim();
                if (shortQuote.length > 80) {
                    shortQuote = shortQuote.substring(0, 80) + '...';
                }
                const quoteTargetId = msg.quoteId != null ? String(msg.quoteId).trim() : '';
                const quoteIdAttr = quoteTargetId ? ` data-quote-id="${quoteTargetId}"` : '';
                quoteBlockHtml = `
                <div class="quote-block"${quoteIdAttr}>
                    <span class="quote-name">${msg.quote.name || 'TA'}:</span>
                    <span class="quote-preview">${shortQuote}</span>
                </div>
            `;
            }

            // 为AI文本消息添加打字效果
            if (msg.role === 'ai' && msg.type === 'text') {
                bubbleHtml = `
                <div class="msg-bubble custom-bubble-content">
                    ${quoteBlockHtml}
                    <div class="msg-text custom-bubble-text" data-text="${safeContent}"></div>
                </div>
            `;
            } else {
                bubbleHtml = `
                <div class="msg-bubble custom-bubble-content">
                    ${quoteBlockHtml}
                    <div class="msg-text custom-bubble-text">${safeContent}</div>
                </div>
            `;
            }
        }
    }

    // --- 4. 构建状态文字 ---
    let statusHtml = "";
    if (isMe) {
        if (msg.type !== 'call_end') {
            let statusText = "已送达";
            if (msg.status === 'read') statusText = "已读";
            statusHtml = `<div class="msg-status-text">${statusText}</div>`;
        }
    }

    // --- 5. 组合最终 HTML ---
    const row = document.createElement('div');
    row.className = isMe ? 'msg-row msg-right custom-bubble-container is-me' : 'msg-row msg-left custom-bubble-container is-other';
    if (msg.role) {
        row.setAttribute('data-role', msg.role);
    }
    if (msg.type) {
        row.setAttribute('data-type', msg.type);
    }
    if (msg.timestamp) {
        row.setAttribute('data-timestamp', String(msg.timestamp));
    }
    if (msgId) {
        row.setAttribute('data-msg-id', msgId);
    }

    const avatarHtml = `
        <div class="custom-avatar-wrapper" style="display:flex; flex-direction:column; align-items:center;">
            <div class="msg-avatar custom-avatar">
                <img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">
            </div>
            <div class="custom-timestamp" style="font-size:10px; color:#b2b2b2; margin-top:4px; transform:scale(0.85);">
                ${smallTimeStr}
            </div>
        </div>
    `;

    row.innerHTML = `
        ${avatarHtml}
        <div class="msg-content-wrapper">
            ${bubbleHtml}
            ${statusHtml}
        </div>
    `;

    const quoteBlockEl = row.querySelector('.quote-block');
    if (quoteBlockEl && msg.quoteId) {
        quoteBlockEl.addEventListener('click', function (e) {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            if (typeof window.scrollToChatMessageById === 'function') {
                window.scrollToChatMessageById(String(msg.quoteId));
            }
        });
    }

    if (msg.type === 'voice') {
        const voiceBubble = row.querySelector('.voice-bubble');
        if (voiceBubble) {
            const textEl = voiceBubble.querySelector('.voice-text');
            voiceBubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                if (!textEl) return;
                const visible = textEl.style.display === 'block';
                textEl.style.display = visible ? 'none' : 'block';
                if (visible) {
                    voiceBubble.classList.remove('voice-bubble-open');
                } else {
                    voiceBubble.classList.add('voice-bubble-open');
                }
            });
        }
    }

    if (msg.type === 'ai_secret_photo') {
        const bubble = row.querySelector('.ai-photo-bubble');
        if (bubble) {
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                if (msg && msg.content) {
                    alert(msg.content);
                }
            });
        }
    }

    if (msg.type === 'redpacket') {
        const bubble = row.querySelector('.redpacket-bubble');
        if (bubble) {
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                if (msg.role === 'me') {
                    return;
                }
                openRedpacketModal({
                    msg: msg,
                    row: row
                });
            });
        }
    }

    if (msg.type === 'transfer' && msg.role === 'ai') {
        const bubble = row.querySelector('.transfer-bubble');
        if (bubble) {
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                openAITransferModal({
                    msg: msg,
                    row: row
                });
            });
        }
    }

    if (msg.type === 'family_card' && msg.role === 'ai') {
        const bubble = row.querySelector('.family-card-bubble');
        if (bubble) {
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                const st = msg && typeof msg.status === 'string' ? msg.status : 'pending';
                if (st !== 'pending') return;
                openFamilyCardAcceptModal({
                    msg: msg,
                    row: row,
                    roleId: window.currentChatRole
                });
            });
        }
    }

    if (msg.type === 'listen_invite') {
        const buttons = row.querySelectorAll('.listen-invite-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                const action = btn.getAttribute('data-action') || '';
                const inviteId = btn.getAttribute('data-invite-id') || '';
                handleInviteClick(action, inviteId);
            });
        });
    }

    historyBox.appendChild(row);
    historyBox.scrollTop = historyBox.scrollHeight;

    // 为AI文本消息添加打字效果（仅对新消息生效）
    if (msg.role === 'ai' && msg.type === 'text') {
        const textEl = row.querySelector('.msg-text[data-text]');
        if (textEl) {
            const fullText = textEl.getAttribute('data-text');
            
            // 检查是否是历史消息（时间戳与当前时间差较大）
            const isHistoricalMessage = msg.timestamp && (Date.now() - msg.timestamp > 5000);
            
            if (isHistoricalMessage) {
                // 历史消息：直接显示完整内容，不触发打字效果
                textEl.innerHTML = fullText;
                textEl.removeAttribute('data-text');
            } else {
                // 新消息：触发打字效果
                textEl.textContent = '';
                textEl.removeAttribute('data-text');

                // 打字效果实现
                let index = 0;
                const typeSpeed = 30; // 打字速度，单位毫秒

                function type() {
                    if (index < fullText.length) {
                        // 处理HTML标签
                        if (fullText[index] === '<' && fullText.indexOf('>', index) !== -1) {
                            const endTagIndex = fullText.indexOf('>', index);
                            textEl.insertAdjacentHTML('beforeend', fullText.substring(index, endTagIndex + 1));
                            index = endTagIndex + 1;
                        } else {
                            textEl.appendChild(document.createTextNode(fullText.charAt(index)));
                            index++;
                        }
                        historyBox.scrollTop = historyBox.scrollHeight;
                        setTimeout(type, typeSpeed);
                    }
                }

                // 开始打字动画
                setTimeout(type, 100);
            }
        }
    }

    if (shouldTriggerLocationShare) {
        try {
            const rid = window.currentChatRole;
            if (rid) {
                showIncomingLocationShareUI(rid);
            }
        } catch (e) { }
    }
}

function bindMessageLongPressEdit(row, msg) {
    if (!row || !msg) return;
    const type = msg.type;
    if (type && type !== 'text') return;
    const bubble = row.querySelector('.msg-bubble');
    if (!bubble) return;
    const ts = msg.timestamp;
    if (!ts) return;
    const roleId = window.currentChatRole;
    if (!roleId) return;
    let pressTimer = null;
    function clearPressTimer() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    }
    function handleEdit() {
        clearPressTimer();
        const original = typeof msg.content === 'string' ? msg.content : '';
        const result = window.prompt('编辑消息', original);
        if (result === null) return;
        const newText = String(result);
        msg.content = newText;
        if (!window.chatData) window.chatData = {};
        const list = window.chatData[roleId] || [];
        for (let i = list.length - 1; i >= 0; i--) {
            const m = list[i];
            if (!m) continue;
            if (m.timestamp === ts && m.role === msg.role && (m.type || 'text') === (msg.type || 'text')) {
                m.content = newText;
                break;
            }
        }
        const textEl = row.querySelector('.msg-text');
        if (textEl) {
            textEl.innerHTML = String(newText).replace(/\n/g, '<br>');
        }
        try {
            saveData();
        } catch (e) { }
        try {
            if (typeof window.maybeAutoUpdateMemoryArchive === 'function') {
                window.maybeAutoUpdateMemoryArchive(roleId);
            }
        } catch (e) { }
    }
    function startPress(e) {
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        clearPressTimer();
        pressTimer = setTimeout(function () {
            handleEdit();
        }, 600);
    }
    function cancelPress() {
        clearPressTimer();
    }
    bubble.addEventListener('mousedown', startPress);
    bubble.addEventListener('touchstart', startPress);
    bubble.addEventListener('mouseup', cancelPress);
    bubble.addEventListener('mouseleave', cancelPress);
    bubble.addEventListener('touchend', cancelPress);
    bubble.addEventListener('touchmove', cancelPress);
    bubble.addEventListener('contextmenu', function (e) {
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        handleEdit();
    });
}

let currentAITransferContext = null;
let currentRedpacketContext = null;

function getLocationSelectSheetElements() {
    let mask = document.getElementById('location-select-mask');
    if (!mask) {
        mask = document.createElement('div');
        mask.id = 'location-select-mask';
        mask.className = 'location-sheet-mask';
        mask.innerHTML = `
            <div class="location-sheet">
                <div class="location-sheet-title">位置</div>
                <button class="location-sheet-btn location-sheet-btn-primary" id="send-location-btn">发送位置</button>
                <button class="location-sheet-btn" id="share-live-location-btn">共享实时位置</button>
                <button class="location-sheet-btn" id="clear-location-map-btn">清除当前地图</button>
                <button class="location-sheet-btn location-sheet-btn-cancel" id="cancel-location-btn">取消</button>
            </div>
        `;
        document.body.appendChild(mask);
        mask.addEventListener('click', function (e) {
            if (e.target === mask) {
                mask.style.display = 'none';
            }
        });
        const cancelBtn = mask.querySelector('#cancel-location-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function () {
                mask.style.display = 'none';
            });
        }
        const sendBtn = mask.querySelector('#send-location-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', function () {
                const roleId = window.currentChatRole;
                if (!roleId) return;
                const inputText = prompt('请输入地点名称', '');
                if (inputText === null) return;
                const name = String(inputText || '').trim();
                if (!name) return;
                const now = Date.now();
                if (!window.chatData[roleId]) window.chatData[roleId] = [];
                const payload = { name: name, address: '', lat: 0, lng: 0 };
                const msg = { role: 'me', type: 'location', content: JSON.stringify(payload), timestamp: now, status: 'sent' };
                window.chatData[roleId].push(msg);
                appendMessageToDOM(msg);
                saveData();
                mask.style.display = 'none';
                const msgInput = document.getElementById('msg-input');
                if (msgInput) {
                    setTimeout(function () { msgInput.focus(); }, 10);
                }
            });
        }
        const shareBtn = mask.querySelector('#share-live-location-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', async function () {
                const roleId = window.currentChatRole;
                if (!roleId) return;
                await initData();
                const data = window.chatMapData && window.chatMapData[roleId];
                if (data && data.isCreated === true) {
                    mask.style.display = 'none';
                    startLocationShare(roleId);
                    return;
                }
                mask.style.display = 'none';
                openMapCreatorModal(roleId);
            });
        }
        const clearBtn = mask.querySelector('#clear-location-map-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', async function () {
                const roleId = window.currentChatRole;
                if (!roleId) return;
                const ok = confirm('确定要清除当前地图吗？');
                if (!ok) return;
                await initData();
                if (!window.chatMapData) window.chatMapData = {};
                if (window.chatMapData[roleId]) {
                    delete window.chatMapData[roleId];
                    saveData();
                }
                mask.style.display = 'none';
            });
        }
    }
    return { mask };
}

function showLocationSelectSheet() {
    const els = getLocationSelectSheetElements();
    if (!els.mask) return;
    els.mask.style.display = 'flex';
}

function getMapCreatorModalElements() {
    let modal = document.getElementById('map-creator-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'map-creator-modal';
        modal.className = 'map-creator-mask';
        modal.innerHTML = `
            <div class="map-creator-container">
                <div class="map-creator-map-panel">
                    <div class="map-creator-stage">
                        <img class="map-creator-map" src="assets/gongxiangmap.jpg" alt="map">
                        <div class="map-creator-markers"></div>
                    </div>
                </div>
                <div class="map-creator-info-panel">
                    <div class="map-creator-hint">请在地图上点击进行创建地点</div>
                    <div class="map-creator-list-container"></div>
                </div>
                <div class="map-creator-footer">
                    <button class="map-creator-btn" id="map-creator-finish-btn">完成创建</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const imgEl = modal.querySelector('.map-creator-map');
    const stageEl = modal.querySelector('.map-creator-stage');
    const markersEl = modal.querySelector('.map-creator-markers');
    const listEl = modal.querySelector('.map-creator-list-container');
    const finishBtn = modal.querySelector('#map-creator-finish-btn');
    return { modal, imgEl, stageEl, markersEl, listEl, finishBtn };
}

function renderMapCreatorMarkers(markersEl, listEl, markers) {
    if (!markersEl || !listEl) return;
    markersEl.innerHTML = '';
    listEl.innerHTML = '';
    (markers || []).forEach(function (m, idx) {
        const dot = document.createElement('div');
        dot.className = 'map-creator-dot';
        dot.style.left = String(m.x) + '%';
        dot.style.top = String(m.y) + '%';
        dot.addEventListener('click', function (e) {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            markers.splice(idx, 1);
            renderMapCreatorMarkers(markersEl, listEl, markers);
        });
        markersEl.appendChild(dot);

        const row = document.createElement('div');
        row.className = 'map-creator-list-item';

        const text = document.createElement('div');
        text.className = 'map-creator-list-text';
        text.textContent = `${idx + 1}. 📍 ${m.name || ''}`;

        const del = document.createElement('button');
        del.className = 'map-creator-list-delete';
        del.type = 'button';
        del.textContent = '删除';
        del.addEventListener('click', function (e) {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            markers.splice(idx, 1);
            renderMapCreatorMarkers(markersEl, listEl, markers);
        });

        row.appendChild(text);
        row.appendChild(del);
        listEl.appendChild(row);
    });
}

function showFullPageLoading(text) {
    let mask = document.getElementById('global-map-loading-mask');
    if (!mask) {
        mask = document.createElement('div');
        mask.id = 'global-map-loading-mask';
        mask.style.position = 'fixed';
        mask.style.left = '0';
        mask.style.top = '0';
        mask.style.right = '0';
        mask.style.bottom = '0';
        mask.style.background = 'rgba(0,0,0,0.35)';
        mask.style.display = 'flex';
        mask.style.alignItems = 'center';
        mask.style.justifyContent = 'center';
        mask.style.zIndex = '2000';
        const box = document.createElement('div');
        box.className = 'map-loading-box';
        box.style.padding = '14px 18px';
        box.style.borderRadius = '16px';
        box.style.background = 'rgba(0,0,0,0.8)';
        box.style.color = '#fff';
        box.style.fontSize = '14px';
        box.textContent = text || '加载中...';
        mask.appendChild(box);
        document.body.appendChild(mask);
    } else {
        const box = mask.querySelector('.map-loading-box');
        if (box) {
            box.textContent = text || '加载中...';
        }
        mask.style.display = 'flex';
    }
}

function hideFullPageLoading() {
    const mask = document.getElementById('global-map-loading-mask');
    if (mask) {
        mask.style.display = 'none';
    }
}

async function generateAIMapMarkers(roleId) {
    const profile = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
    let worldbookText = '';
    if (window.worldBooks && profile.worldbookId) {
        const ids = Array.isArray(profile.worldbookId)
            ? profile.worldbookId
            : (typeof profile.worldbookId === 'string' && profile.worldbookId.trim() ? [profile.worldbookId.trim()] : []);
        const parts = [];
        ids.forEach(wbId => {
            const id = String(wbId || '').trim();
            if (!id) return;
            const wb = window.worldBooks[id];
            if (!wb) return;
            const title = wb.title || '';
            const content = wb.content || '';
            if (!title && !content) return;
            parts.push(`世界书标题：${title}\n世界书内容：${content}`);
        });
        worldbookText = parts.join('\n\n');
    }
    const personaText = profile.desc || '';
    const aiName = profile.nickName || profile.name || '';
    const userPersona = window.userPersonas && window.userPersonas[roleId] ? window.userPersonas[roleId] : {};
    const userName = userPersona.name || '';
    const systemPrompt = [
        '你是一个地图数据生成器。',
        '请根据角色的背景设定、世界观和生活习惯，在 100x100 的二维地图平面上，生成 5-8 个关键地点的坐标。',
        '必须包含以下几类地点：',
        '1. 家：包括“用户的家”和“AI角色自己的家”。',
        '2. 工作/学习：AI 的公司、学校或常驻地。',
        '3. 娱乐休闲：至少 2 个具体场所，如甜品店、咖啡馆、猫咖、电玩城、游乐园、购物广场、电影院等，根据角色喜好选择。',
        '如果角色是古风或古代背景，请使用符合时代的地点名称，例如集市、酒楼、茶馆、书院等。',
        '可以在命名时，将 AI 自己的家记为“我的家”，将用户的家记为“你的家”，系统会自动替换为具体名字。',
        '输出格式严格为 JSON 数组，不要包含任何 Markdown 代码块或额外文字。',
        '数组元素格式为：{"name": "地点名称", "x": 横坐标(5-95之间的数字), "y": 纵坐标(5-95之间的数字)}。',
        'x 和 y 代表百分比位置，请让地点尽量分散，不要重叠。'
    ].join('\n');
    const historyMessages = [];
    const userLines = [];
    if (personaText) {
        userLines.push('【角色人设】');
        userLines.push(personaText);
    }
    if (worldbookText) {
        userLines.push('【世界书设定】');
        userLines.push(worldbookText);
    }
    userLines.push('请根据以上信息，直接返回符合要求的 JSON 数组。');
    const userMessage = userLines.join('\n');
    if (typeof window.callAI !== 'function') {
        throw new Error('callAI not available');
    }
    const jsonText = await new Promise(function (resolve, reject) {
        window.callAI(
            systemPrompt,
            historyMessages,
            userMessage,
            function (resp) {
                if (typeof resp !== 'string') {
                    reject(new Error('AI 响应格式错误'));
                    return;
                }
                resolve(resp);
            },
            function (err) {
                reject(new Error(err || 'AI 调用失败'));
            }
        );
    });
    let clean = String(jsonText || '').trim();
    if (clean.startsWith('```')) {
        clean = clean.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
    }
    let parsed = [];
    try {
        const obj = JSON.parse(clean);
        if (Array.isArray(obj)) {
            parsed = obj;
        } else if (obj && Array.isArray(obj.markers)) {
            parsed = obj.markers;
        } else {
            throw new Error('JSON 不是数组');
        }
    } catch (e) {
        throw new Error('解析 AI 返回的 JSON 失败');
    }
    const markers = parsed.map(function (m) {
        const x = Number(m && m.x);
        const y = Number(m && m.y);
        let name = String(m && m.name || '').trim();
        if (aiName) {
            if (name === '我的家' || name === '我家') {
                name = aiName + '的家';
            }
        }
        if (userName) {
            if (name === '你的家' || name === '你家' || name === '用户的家') {
                name = userName + '的家';
            }
        }
        return { x: x, y: y, name: name };
    }).filter(function (m) {
        return isFinite(m.x) && isFinite(m.y) && m.name && m.x >= 0 && m.x <= 100 && m.y >= 0 && m.y <= 100;
    });
    if (markers.length === 0) {
        throw new Error('生成的地点列表为空');
    }
    if (!window.chatMapData) window.chatMapData = {};
    const mapData = window.chatMapData[roleId] || {};
    mapData.markers = markers;
    if (!mapData.bgUrl) {
        mapData.bgUrl = 'assets/gongxiangmap.jpg';
    }
    mapData.isCreated = false;
    window.chatMapData[roleId] = mapData;
    saveData();
}

function showMapGenRetryDialog() {
    return new Promise(function (resolve) {
        const mask = document.createElement('div');
        mask.style.position = 'fixed';
        mask.style.left = '0';
        mask.style.top = '0';
        mask.style.right = '0';
        mask.style.bottom = '0';
        mask.style.background = 'rgba(0,0,0,0.4)';
        mask.style.display = 'flex';
        mask.style.alignItems = 'center';
        mask.style.justifyContent = 'center';
        mask.style.zIndex = '2100';

        const box = document.createElement('div');
        box.style.minWidth = '260px';
        box.style.maxWidth = '320px';
        box.style.borderRadius = '16px';
        box.style.background = '#fff';
        box.style.padding = '18px 18px 12px 18px';
        box.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
        box.style.fontSize = '14px';
        box.style.color = '#333';

        const text = document.createElement('div');
        text.textContent = '地图生成失败，是否需要重新生成？';
        text.style.marginBottom = '14px';

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.justifyContent = 'flex-end';
        btnRow.style.gap = '10px';

        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.textContent = '是';
        retryBtn.style.padding = '6px 14px';
        retryBtn.style.borderRadius = '14px';
        retryBtn.style.border = 'none';
        retryBtn.style.background = '#07c160';
        retryBtn.style.color = '#fff';
        retryBtn.style.fontSize = '13px';

        const manualBtn = document.createElement('button');
        manualBtn.type = 'button';
        manualBtn.textContent = '手动创建';
        manualBtn.style.padding = '6px 14px';
        manualBtn.style.borderRadius = '14px';
        manualBtn.style.border = '1px solid #dcdcdc';
        manualBtn.style.background = '#fff';
        manualBtn.style.color = '#333';
        manualBtn.style.fontSize = '13px';

        function cleanup(choice) {
            document.body.removeChild(mask);
            resolve(choice);
        }

        retryBtn.onclick = function () {
            cleanup('retry');
        };
        manualBtn.onclick = function () {
            cleanup('manual');
        };

        btnRow.appendChild(manualBtn);
        btnRow.appendChild(retryBtn);
        box.appendChild(text);
        box.appendChild(btnRow);
        mask.appendChild(box);
        document.body.appendChild(mask);
    });
}

async function openMapCreatorModal(roleId) {
    let layer = document.getElementById('map-creator-layer');
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'map-creator-layer';
        document.body.appendChild(layer);
    }

    closeMapCreatorModal();

    document.body.dataset._mapCreatorPrevOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';

    const mapData = window.chatMapData && window.chatMapData[roleId];
    const hasMarkers = mapData && Array.isArray(mapData.markers) && mapData.markers.length > 0;
    if (!hasMarkers) {
        for (; ;) {
            try {
                showFullPageLoading('对方正在根据记忆绘制地图...');
                await generateAIMapMarkers(roleId);
                hideFullPageLoading();
                alert('地图已经成功生成！');
                break;
            } catch (e) {
                hideFullPageLoading();
                console.error(e);
                const choice = await showMapGenRetryDialog();
                if (choice === 'retry') {
                    continue;
                }
                break;
            }
        }
    }
    const finalMapData = window.chatMapData && window.chatMapData[roleId];
    const markers = (finalMapData && Array.isArray(finalMapData.markers) ? finalMapData.markers : []).map(function (m) {
        return { x: Number(m && m.x), y: Number(m && m.y), name: String(m && m.name || '').trim() };
    }).filter(function (m) {
        return isFinite(m.x) && isFinite(m.y) && m.name;
    });
    const bgUrl = (finalMapData && finalMapData.bgUrl) ? finalMapData.bgUrl : 'assets/gongxiangmap.jpg';

    layer.style.display = 'flex';
    layer.innerHTML = `
        <div class="location-share-bg">
            <div class="map-creator-tip">现在请为你们创建一份地图，尽可能的包含你们各自的家，工作地点，娱乐场所，餐馆等等 点击地图即可创造地点</div>
            <div class="location-share-map-stage" id="map-creator-map-stage">
                <img class="location-share-map" id="map-creator-map-img" src="${bgUrl}" alt="map">
                <div class="location-share-map-overlay" id="map-creator-map-overlay"></div>
            </div>
        </div>
        <div class="location-share-footer-float map-creator-footer-float">
            <div class="map-creator-actions">
                <button class="map-creator-action-btn map-creator-save-btn" id="map-creator-save-btn" type="button">保存创建</button>
                <button class="map-creator-action-btn map-creator-exit-btn" id="map-creator-exit-btn" type="button">退出</button>
            </div>
        </div>
    `;

    const mapStage = layer.querySelector('#map-creator-map-stage');
    const mapImg = layer.querySelector('#map-creator-map-img');
    const overlay = layer.querySelector('#map-creator-map-overlay');
    const saveBtn = layer.querySelector('#map-creator-save-btn');
    const exitBtn = layer.querySelector('#map-creator-exit-btn');

    if (!mapStage || !mapImg || !overlay || !saveBtn || !exitBtn) return;

    const renderMarkers = function () {
        overlay.innerHTML = '';
        markers.forEach(function (m, index) {
            const dot = document.createElement('div');
            dot.className = 'location-share-marker';
            dot.style.left = String(m.x) + '%';
            dot.style.top = String(m.y) + '%';
            dot.dataset.name = String(m.name || '');

            const label = document.createElement('span');
            label.className = 'marker-name';
            label.textContent = String(m.name || '');
            dot.appendChild(label);

            dot.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                const currentName = String(m.name || '');
                const input = prompt('修改地点名称（留空则删除）', currentName);
                if (input === null) return;
                const newName = String(input || '').trim();
                if (!newName) {
                    markers.splice(index, 1);
                } else {
                    markers[index] = { x: m.x, y: m.y, name: newName };
                }
                renderMarkers();
            });

            overlay.appendChild(dot);
        });
    };
    renderMarkers();

    mapStage.style.touchAction = 'none';
    const mapPanCleanup = setupLocationShareMapPan(layer, {
        stageEl: mapStage,
        imgEl: mapImg,
        viewportEl: layer,
        blockSelectors: ['.location-share-footer-float']
    });

    let downX = 0;
    let downY = 0;
    let moved = false;
    const beginDown = function (clientX, clientY) {
        downX = clientX;
        downY = clientY;
        moved = false;
    };
    const markMove = function (clientX, clientY) {
        if (moved) return;
        if (Math.abs(clientX - downX) + Math.abs(clientY - downY) >= 6) moved = true;
    };

    const onMouseDown = function (e) {
        if (!e || e.button !== 0) return;
        beginDown(e.clientX, e.clientY);
    };
    const onMouseMove = function (e) {
        if (!e) return;
        markMove(e.clientX, e.clientY);
    };
    const onTouchStart = function (e) {
        if (!e || !e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];
        beginDown(t.clientX, t.clientY);
    };
    const onTouchMove = function (e) {
        if (!e || !e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];
        markMove(t.clientX, t.clientY);
    };

    const onClick = function (e) {
        if (!e) return;
        if (moved) return;
        const target = e.target;
        if (target && target.closest('.location-share-footer-float')) return;
        if (target && target.closest('.location-share-marker')) return;

        const rect = mapStage.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return;
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;

        const rawX = ((e.clientX - rect.left) / rect.width) * 100;
        const rawY = ((e.clientY - rect.top) / rect.height) * 100;
        const x = Math.max(0, Math.min(100, Number(rawX.toFixed(1))));
        const y = Math.max(0, Math.min(100, Number(rawY.toFixed(1))));

        const inputText = prompt('请输入地点名称', '');
        if (inputText === null) return;
        const name = String(inputText || '').trim();
        if (!name) return;

        markers.push({ x: x, y: y, name: name });
        renderMarkers();
    };

    const onSave = function (e) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        if (!window.chatMapData) window.chatMapData = {};
        window.chatMapData[roleId] = {
            bgUrl: bgUrl,
            markers: markers,
            isCreated: true
        };
        saveData();
        alert('创建成功');
        closeMapCreatorModal();
    };

    const onExit = function (e) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        closeMapCreatorModal();
    };

    layer.addEventListener('mousedown', onMouseDown);
    layer.addEventListener('mousemove', onMouseMove);
    layer.addEventListener('touchstart', onTouchStart, { passive: true });
    layer.addEventListener('touchmove', onTouchMove, { passive: true });
    layer.addEventListener('click', onClick);
    saveBtn.addEventListener('click', onSave);
    exitBtn.addEventListener('click', onExit);

    layer._mapCreatorCleanup = function () {
        layer.removeEventListener('mousedown', onMouseDown);
        layer.removeEventListener('mousemove', onMouseMove);
        layer.removeEventListener('touchstart', onTouchStart, { passive: true });
        layer.removeEventListener('touchmove', onTouchMove, { passive: true });
        layer.removeEventListener('click', onClick);
        saveBtn.removeEventListener('click', onSave);
        exitBtn.removeEventListener('click', onExit);
        if (typeof mapPanCleanup === 'function') {
            try { mapPanCleanup(); } catch (e) { }
        }
    };
}

function closeMapCreatorModal() {
    const layer = document.getElementById('map-creator-layer');
    if (layer && typeof layer._mapCreatorCleanup === 'function') {
        try { layer._mapCreatorCleanup(); } catch (e) { }
    }
    if (layer) {
        layer._mapCreatorCleanup = null;
        layer.style.display = 'none';
        layer.innerHTML = '';
    }
    if (document && document.body && document.body.dataset) {
        if (document.body.dataset._mapCreatorPrevOverflow !== undefined) {
            document.body.style.overflow = document.body.dataset._mapCreatorPrevOverflow;
            delete document.body.dataset._mapCreatorPrevOverflow;
        } else {
            document.body.style.overflow = '';
        }
    }
}

function getLocationShareLayerElements() {
    let layer = document.getElementById('location-share-layer');
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'location-share-layer';
        document.body.appendChild(layer);
    }
    return { layer };
}

function closeLocationShareLayer() {
    const els = getLocationShareLayerElements();
    const layer = els.layer;
    if (layer && typeof layer._locationShareCleanup === 'function') {
        try { layer._locationShareCleanup(); } catch (e) { }
    }
    if (layer) {
        layer._locationShareCleanup = null;
        layer._locationShareState = null;
        layer.style.display = 'none';
        layer.innerHTML = '';
    }
    if (document && document.body && document.body.dataset) {
        if (document.body.dataset._locationSharePrevOverflow !== undefined) {
            document.body.style.overflow = document.body.dataset._locationSharePrevOverflow;
            delete document.body.dataset._locationSharePrevOverflow;
        } else {
            document.body.style.overflow = '';
        }
    }
    const floatWindow = document.getElementById('location-share-float-window');
    if (floatWindow) {
        floatWindow.style.display = 'none';
    }
}

function showTopNotification(text) {
    const message = String(text || '').trim();
    if (!message) return;
    let toast = document.getElementById('top-toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'top-toast-notification';
        toast.className = 'top-toast-notification';
        const icon = document.createElement('span');
        icon.className = 'top-toast-icon';
        icon.innerText = '✔';
        const span = document.createElement('span');
        span.className = 'top-toast-text';
        toast.appendChild(icon);
        toast.appendChild(span);
        document.body.appendChild(toast);
    }
    const textEl = toast.querySelector('.top-toast-text');
    if (textEl) {
        textEl.textContent = message;
    }
    toast.classList.add('show');
    if (toast._hideTimer) {
        clearTimeout(toast._hideTimer);
    }
    toast._hideTimer = setTimeout(function () {
        toast.classList.remove('show');
    }, 2500);
}

function stripLocationSharePrefix(text) {
    const raw = String(text || '');
    const prefix = '[实时位置共享中]';
    if (!raw.startsWith(prefix)) return raw;
    const rest = raw.slice(prefix.length);
    return rest.replace(/^\s+/, '');
}

function sanitizeLocationShareAIText(text) {
    let result = String(text || '').trim();
    if (!result) return '';
    result = result.replace(/\[VOICE:[\s\S]*?\]/gi, '').replace(/\[STICKER:\s*[^\]]+\]/gi, '').trim();
    result = result.replace(/https?:\/\/\S+/gi, '').trim();
    result = result.replace(/```[a-zA-Z0-9_]*\s*/gi, '');
    result = result.replace(/```/g, '');
    result = result.replace(/`{1,3}/g, '');
    result = result.replace(/思考过程[:：]?/gi, '');
    result = result.replace(/推理过程[:：]?/gi, '');
    result = result.replace(/解释[:：]?/gi, '');
    const lines = result.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    result = lines.join(' ');
    try {
        result = result.replace(/[\p{Extended_Pictographic}]/gu, '');
    } catch (e) { }
    result = result.replace(/[ \t]{2,}/g, ' ').trim();
    return result;
}

const DEBUG_SPEED_UP = false;

function cleanLocationShareAIThinking(text) {
    let out = String(text || '');
    if (!out) return '';
    out = out.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
    if (out.includes('<thinking>')) {
        out = out.split('<thinking>')[0].trim();
    }
    out = out.replace(/```[a-zA-Z0-9_]*\s*/gi, '');
    out = out.replace(/```/g, '');
    out = out.trim();
    return out;
}

function parseLocationShareMoveCommand(text) {
    const raw = String(text || '');
    if (!raw) return null;
    const startRe = /\[\[\s*START_MOVE\s*:\s*([A-Z]+)\s*\]\]/i;
    const startMatch = raw.match(startRe);
    if (startMatch) {
        const mode = String(startMatch[1] || '').trim().toUpperCase();
        if (mode === 'WALK' || mode === 'BIKE' || mode === 'BUS' || mode === 'CAR') {
            return { kind: 'start', mode: mode };
        }
    }
    return null;
}

function stripLocationShareMoveCommands(text) {
    let out = String(text || '');
    if (!out) return '';
    out = out.replace(/\[\[\s*MOVE_TO_USER\s*\]\]/gi, '');
    out = out.replace(/\[\[\s*MOVE_TO\s*:\s*[^\]]+?\s*\]\]/gi, '');
    out = out.replace(/\[\[\s*START_MOVE\s*:\s*[^\]]+?\s*\]\]/gi, '');
    out = out.replace(/[ \t]{2,}/g, ' ').trim();
    out = out.replace(/\n{3,}/g, '\n\n').trim();
    return out;
}

function findLocationShareMarkerByName(markers, name) {
    const list = Array.isArray(markers) ? markers : [];
    const target = String(name || '').trim();
    if (!target) return null;
    for (let i = 0; i < list.length; i++) {
        const m = list[i];
        const n = String(m && m.name || '').trim();
        if (n && n === target) return m;
    }
    return findMarkerByAIReply(list, target);
}

function getLocationShareModeLabel(mode) {
    const upper = String(mode || '').toUpperCase();
    if (upper === 'WALK') return '步行';
    if (upper === 'CAR') return '开车';
    if (upper === 'BIKE') return '骑行';
    if (upper === 'BUS') return '乘坐公交';
    return '出行';
}

function getLocationShareTravelDurationMs(mode) {
    const upper = String(mode || '').toUpperCase();
    const unit = DEBUG_SPEED_UP ? 1000 : 60000;
    if (upper === 'CAR') return 10 * unit;
    if (upper === 'WALK') return 15 * unit;
    if (upper === 'BIKE' || upper === 'BUS') return 20 * unit;
    return 15 * unit;
}

function setLocationShareStatusText(text) {
    const layer = document.getElementById('location-share-layer');
    const statusEl = layer ? layer.querySelector('#location-share-status-text') : null;
    if (!statusEl) return;
    statusEl.textContent = text || '';
}

function startLocationShareTravel(state, mode, destination) {
    if (!state || !destination || !state._aiWrapEl) return;
    const durationMs = getLocationShareTravelDurationMs(mode);
    const layer = document.getElementById('location-share-layer');
    let totalDistance = null;
    if (state.userMarker && state.aiMarker) {
        totalDistance = computeLocationShareDistanceMeters(state.userMarker, state.aiMarker, state);
    }
    const startMarker = {
        x: Number(state.aiMarker && state.aiMarker.x),
        y: Number(state.aiMarker && state.aiMarker.y),
        name: String(state.aiMarker && state.aiMarker.name || '').trim()
    };
    state.travelMode = mode;
    state.travelStatus = 'moving';
    state.travelDurationMs = durationMs;
    state.travelStartTime = Date.now();
    state.travelTotalDistanceMeters = totalDistance;
    state.travelRemainingDistanceMeters = totalDistance;
    if (state.travelTimerId) {
        clearInterval(state.travelTimerId);
        state.travelTimerId = null;
    }
    const statusEl = layer ? layer.querySelector('#location-share-status-text') : null;
    const modeLabel = getLocationShareModeLabel(mode);
    if (statusEl) {
        statusEl.textContent = `正在${modeLabel}前往...`;
    }
    const distanceEl = layer ? layer.querySelector('#location-share-distance-text') : null;
    if (distanceEl && totalDistance !== null) {
        const label = totalDistance >= 1000
            ? (totalDistance / 1000).toFixed(1).replace(/\.0$/, '') + 'km'
            : totalDistance + 'm';
        const remainText = (function (ms) {
            const sec = Math.ceil(ms / 1000);
            const min = Math.floor(sec / 60);
            const s = sec % 60;
            const minStr = min > 0 ? min + ' 分 ' : '';
            return minStr + s + ' 秒';
        })(durationMs);
        distanceEl.textContent = `距离 ${label} | 剩余 ${remainText}`;
    }
    const destMarker = {
        x: Number(destination.x),
        y: Number(destination.y),
        name: String(destination.name || '').trim()
    };
    state.travelStartMarker = startMarker;
    state.travelDestinationMarker = destMarker;
    state.travelTimerId = setInterval(function () {
        const layerNow = document.getElementById('location-share-layer');
        const statusElNow = layerNow ? layerNow.querySelector('#location-share-status-text') : null;
        const distanceElNow = layerNow ? layerNow.querySelector('#location-share-distance-text') : null;
        if (!statusElNow || !distanceElNow) {
            clearInterval(state.travelTimerId);
            state.travelTimerId = null;
            return;
        }
        const now = Date.now();
        const elapsed = now - state.travelStartTime;
        let remainingMs = state.travelDurationMs - elapsed;
        if (remainingMs <= 0) {
            remainingMs = 0;
        }
        let remainDistance = null;
        if (state.travelTotalDistanceMeters !== null && state.travelDurationMs > 0) {
            const ratio = remainingMs <= 0 ? 0 : remainingMs / state.travelDurationMs;
            remainDistance = Math.max(0, Math.round(state.travelTotalDistanceMeters * ratio));
            state.travelRemainingDistanceMeters = remainDistance;
        }
        const timeLabel = (function (ms) {
            const sec = Math.ceil(ms / 1000);
            const min = Math.floor(sec / 60);
            const s = sec % 60;
            const minStr = min > 0 ? min + ' 分 ' : '';
            return minStr + s + ' 秒';
        })(remainingMs);
        let distanceLabel = '';
        if (remainDistance !== null) {
            if (remainDistance >= 1000) {
                distanceLabel = (remainDistance / 1000).toFixed(1).replace(/\.0$/, '') + 'km';
            } else {
                distanceLabel = remainDistance + 'm';
            }
        }
        const travelTotalMs = state.travelDurationMs > 0 ? state.travelDurationMs : durationMs;
        let progressRatio = 0;
        if (travelTotalMs > 0) {
            progressRatio = elapsed <= 0 ? 0 : elapsed / travelTotalMs;
            if (progressRatio < 0) progressRatio = 0;
            if (progressRatio > 1) progressRatio = 1;
        }
        if (state._aiWrapEl && state.travelStartMarker && state.travelDestinationMarker) {
            const sx = Number(state.travelStartMarker.x);
            const sy = Number(state.travelStartMarker.y);
            const dx = Number(state.travelDestinationMarker.x);
            const dy = Number(state.travelDestinationMarker.y);
            if (isFinite(sx) && isFinite(sy) && isFinite(dx) && isFinite(dy)) {
                const curX = sx + (dx - sx) * progressRatio;
                const curY = sy + (dy - sy) * progressRatio;
                state._aiWrapEl.style.left = String(curX) + '%';
                state._aiWrapEl.style.top = String(curY) + '%';
            }
        }
        if (distanceLabel) {
            distanceElNow.textContent = `距离 ${distanceLabel} | 剩余 ${timeLabel}`;
        } else {
            distanceElNow.textContent = `剩余 ${timeLabel}`;
        }
        const floatWindow = document.getElementById('location-share-float-window');
        const floatTextEl = document.getElementById('location-share-float-text');
        if (floatWindow && floatTextEl && floatWindow.style.display !== 'none') {
            const statusTextNow = statusElNow.textContent ? statusElNow.textContent.trim() : '';
            const distanceTextNow = distanceElNow.textContent ? distanceElNow.textContent.trim() : '';
            let labelNow = statusTextNow || '位置共享中...';
            if (statusTextNow && distanceTextNow) {
                labelNow = statusTextNow + ' · ' + distanceTextNow;
            } else if (distanceTextNow) {
                labelNow = distanceTextNow;
            }
            floatTextEl.textContent = labelNow;
        }
        if (remainingMs === 0) {
            statusElNow.textContent = '已抵达用户附近。';
            clearInterval(state.travelTimerId);
            state.travelTimerId = null;
            state.travelStatus = 'arrived';
            state.aiMarker = destMarker;
            updateDistance(state.userMarker, state.aiMarker);
            const roleIdNow = state.roleId;
            const modeNow = state.travelMode;
            const profileNow = roleIdNow && window.charProfiles ? (window.charProfiles[roleIdNow] || {}) : {};
            const nameNow = profileNow.nickName || 'Ta';
            closeLocationShareLayer();
            showTopNotification(nameNow + ' 已到达目的地');
            if (roleIdNow) {
                triggerLocationShareArrivalConversation(roleIdNow, modeNow);
            }
            return;
        }
        statusElNow.textContent = `正在${modeLabel}前往...`;
    }, 1000);
}

function triggerLocationShareArrivalConversation(roleId, travelMode) {
    if (!roleId) return;
    if (typeof window.callAI !== 'function') return;

    if (!window.chatMapData) window.chatMapData = {};
    if (!window.chatMapData[roleId]) window.chatMapData[roleId] = {};
    window.chatMapData[roleId].isMeeting = true;
    saveData();

    const profile = window.charProfiles[roleId] || {};
    let systemPrompt = profile.desc || "你是一个友好的AI助手";
    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }
    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }
    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }
    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }
    const modeCode = travelMode ? String(travelMode).toUpperCase() : '';
    const modeLabel = modeCode ? getLocationShareModeLabel(modeCode) : '';
    const modeText = modeLabel ? `你刚刚一路以${modeLabel}（${modeCode}）的方式赶到用户面前，现在已经停在他面前。` : '你刚刚一路沿着地图导航赶到用户面前，现在已经停在他面前。';
    systemPrompt += `\n\n【到达场景】\n${modeText}\n请用第一人称描写你停下来的动作、表情、呼吸状态和你此刻看到的环境细节，然后自然地向用户打招呼，开启面对面聊天。不要再谈论导航路径。`;
    const history = window.chatData[roleId] || [];
    const fullHistory = history.map(function (msg) { return ensureMessageContent({ ...msg }); });
    const cleanHistory = fullHistory.filter(function (msg) {
        if (!msg) return false;
        if (msg.type === 'call_memory') return msg.includeInAI === true;
        if (msg.type === 'system_event') return msg.includeInAI === true;
        return !!msg.content;
    });
    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) {
        headerTitle.innerText = "对方走到你面前";
    }
    const userMessage = '[系统通知：你刚刚从实时位置共享导航中到达了用户面前。请根据上面的到达场景说明，说出你见到他后的第一句话。]';
    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, userMessage, roleId, headerTitle, oldTitle);
}

async function triggerLocationShareInterruptedConversation(roleId) {
    if (!roleId) return;

    const profile = window.charProfiles[roleId] || {};
    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }
    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }
    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.setting || userPersona.gender || userPersona.birthday) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            systemPrompt += `用户生日：${userPersona.birthday}\n`;
        }
    }
    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];
    const fullHistory = history.map(m => ensureMessageContent({ ...m }));
    const cleanHistory = fullHistory.filter(m => m && m.content);

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) {
        headerTitle.innerText = "对方正在输入...";
    }

    const userMessage = '[系统通知：你正通过实时位置共享与用户互动时，对方突然关闭了位置共享/挂断了连接。请根据你的人设，表现出委屈、失落或关心的反应，主动发一条消息询问用户为什么突然关掉，语气要符合你的性格特点，表现出更多让人有好感的情绪，不要过于生气或愤怒。]';
    invokeAIWithCommonHandlers(systemPrompt, cleanHistory, userMessage, roleId, headerTitle, oldTitle);
}

// 🔍 搜索 function handleLocationShareAIReply 并替换为：
function handleLocationShareAIReply(rawReply, state, markers, chatBox, roleId) {
    if (!chatBox || !state || !roleId) return;

    // 🔥 修复点：复用 cleanVoiceCallAIReply 的强大清洗逻辑
    // 因为位置共享也是纯文本对话，逻辑通用
    let cleaned = cleanVoiceCallAIReply(rawReply);

    const moveCommand = parseLocationShareMoveCommand(cleaned);
    const visible = stripLocationShareMoveCommands(cleaned);

    const parts = String(visible || '').split('|||');
    let hasText = false;
    for (let i = 0; i < parts.length; i++) {
        const segment = sanitizeLocationShareAIText(parts[i]);
        if (!segment) continue;
        hasText = true;
        const ts = Date.now();
        if (!window.chatData[roleId]) window.chatData[roleId] = [];
        const aiMsg = {
            role: 'ai',
            content: segment,
            rawContent: rawReply,
            type: 'location_share',
            timestamp: ts
        };
        window.chatData[roleId].push(aiMsg);
        appendLocationShareChatRow(chatBox, 'ai', segment);
    }

    // 如果清洗后没内容，但原始回复有长度，说明可能清洗过度或者格式极度异常
    if (!hasText && rawReply && rawReply.length > 5 && !cleaned) {
        // 兜底：直接显示去除了反引号的原文
        let fallback = rawReply.replace(/```/g, '');
        appendLocationShareChatRow(chatBox, 'ai', fallback);
    } else if (!hasText) {
        // 真的没回复
    }

    if (moveCommand && moveCommand.kind === 'start') {
        if (state.travelStatus === 'idle') {
            const destination = state.userMarker ? state.userMarker : null;
            startLocationShareTravel(state, moveCommand.mode, destination);
        }
    }
    saveData();
}


function setupLocationShareMapPan(layer, options) {
    const stageEl = options && options.stageEl;
    const imgEl = options && options.imgEl;
    const viewportEl = options && options.viewportEl;
    const blockSelectors = Array.isArray(options && options.blockSelectors) ? options.blockSelectors : [];
    if (!layer || !stageEl || !imgEl || !viewportEl) return function () { };

    let stageWidth = 0;
    let stageHeight = 0;
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    let translateX = 0;
    let translateY = 0;

    const clamp = function (value, low, high) {
        if (value < low) return low;
        if (value > high) return high;
        return value;
    };

    const getViewportSize = function () {
        const rect = viewportEl.getBoundingClientRect();
        return {
            width: rect && rect.width ? rect.width : window.innerWidth,
            height: rect && rect.height ? rect.height : window.innerHeight
        };
    };

    const computeBounds = function () {
        const vp = getViewportSize();
        minX = Math.min(0, vp.width - stageWidth);
        maxX = Math.max(0, vp.width - stageWidth);
        minY = Math.min(0, vp.height - stageHeight);
        maxY = Math.max(0, vp.height - stageHeight);
    };

    const applyTransform = function () {
        translateX = clamp(translateX, minX, maxX);
        translateY = clamp(translateY, minY, maxY);
        stageEl.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
    };

    const layoutCover = function () {
        const iw = imgEl.naturalWidth || 0;
        const ih = imgEl.naturalHeight || 0;
        if (!(iw > 0 && ih > 0)) return;

        const vp = getViewportSize();
        const imgRatio = iw / ih;
        const vpRatio = vp.width / vp.height;

        if (imgRatio > vpRatio) {
            stageHeight = vp.height;
            stageWidth = vp.height * imgRatio;
        } else {
            stageWidth = vp.width;
            stageHeight = vp.width / imgRatio;
        }

        stageEl.style.width = `${Math.round(stageWidth)}px`;
        stageEl.style.height = `${Math.round(stageHeight)}px`;
        stageEl.style.willChange = 'transform';

        computeBounds();

        translateX = (vp.width - stageWidth) / 2;
        translateY = (vp.height - stageHeight) / 2;
        applyTransform();
    };

    const isBlockedTarget = function (target) {
        if (!target) return false;
        if (target.closest('.location-share-marker, .location-share-avatar-wrap')) return true;
        for (let i = 0; i < blockSelectors.length; i++) {
            const sel = blockSelectors[i];
            if (sel && target.closest(sel)) return true;
        }
        return false;
    };

    let downX = 0;
    let downY = 0;
    let baseX = 0;
    let baseY = 0;
    let isDown = false;
    let isDragging = false;

    const begin = function (clientX, clientY) {
        isDown = true;
        isDragging = false;
        downX = clientX;
        downY = clientY;
        baseX = translateX;
        baseY = translateY;
    };

    const move = function (clientX, clientY) {
        if (!isDown) return;
        const dx = clientX - downX;
        const dy = clientY - downY;
        if (!isDragging && (Math.abs(dx) + Math.abs(dy) >= 3)) {
            isDragging = true;
        }
        if (!isDragging) return;
        translateX = baseX + dx;
        translateY = baseY + dy;
        applyTransform();
    };

    const end = function () {
        isDown = false;
        isDragging = false;
    };

    const onMouseDown = function (e) {
        if (!e || e.button !== 0) return;
        const target = e.target;
        if (isBlockedTarget(target)) return;
        begin(e.clientX, e.clientY);
    };
    const onMouseMove = function (e) {
        if (!e) return;
        move(e.clientX, e.clientY);
    };
    const onMouseUp = function () {
        end();
    };

    const onTouchStart = function (e) {
        if (!e || !e.touches || e.touches.length !== 1) return;
        const target = e.target;
        if (isBlockedTarget(target)) return;
        const t = e.touches[0];
        begin(t.clientX, t.clientY);
    };
    const onTouchMove = function (e) {
        if (!e || !e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];
        move(t.clientX, t.clientY);
        if (isDragging) {
            e.preventDefault();
        }
    };
    const onTouchEnd = function () {
        end();
    };

    const onResize = function () {
        const prevX = translateX;
        const prevY = translateY;
        layoutCover();
        translateX = clamp(prevX, minX, maxX);
        translateY = clamp(prevY, minY, maxY);
        applyTransform();
    };

    viewportEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    viewportEl.addEventListener('touchstart', onTouchStart, { passive: true });
    viewportEl.addEventListener('touchmove', onTouchMove, { passive: false });
    viewportEl.addEventListener('touchend', onTouchEnd, { passive: true });
    viewportEl.addEventListener('touchcancel', onTouchEnd, { passive: true });

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    const onImgLoad = function () {
        layoutCover();
    };
    if (imgEl.complete && (imgEl.naturalWidth || 0) > 0) {
        layoutCover();
    } else {
        imgEl.addEventListener('load', onImgLoad, { once: true });
    }

    return function () {
        viewportEl.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        viewportEl.removeEventListener('touchstart', onTouchStart, { passive: true });
        viewportEl.removeEventListener('touchmove', onTouchMove, { passive: false });
        viewportEl.removeEventListener('touchend', onTouchEnd, { passive: true });
        viewportEl.removeEventListener('touchcancel', onTouchEnd, { passive: true });

        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onResize);
    };
}

function appendLocationShareChatRow(chatBoxEl, role, text) {
    if (!chatBoxEl) return null;
    const row = document.createElement('div');
    row.className = 'location-share-chat-row ' + (role === 'me' ? 'me' : 'ai');
    const bubble = document.createElement('div');
    bubble.className = 'location-share-chat-bubble';
    bubble.textContent = String(text || '');
    row.appendChild(bubble);
    chatBoxEl.appendChild(row);
    chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
    return row;
}

function buildLocationShareBaseSystemPrompt(roleId) {
    const profile = window.charProfiles[roleId] || {};
    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) systemPrompt += `用户名字：${userPersona.name}\n`;
        if (userPersona.setting) systemPrompt += `用户背景：${userPersona.setting}\n`;
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    const layer = document.getElementById('location-share-layer');
    const shareState = layer && layer._locationShareState ? layer._locationShareState : null;
    let travelBlock = `\n\n【出行方式与移动指令】\n当你准备从当前地点前往用户所在位置时，必须先根据你与用户之间的距离和自身人设，选择合适的出行方式：\n1. 当直线距离小于 600 米时，只能选择步行（WALK）。\n2. 当直线距离大于等于 600 米时，必须结合你的人设信息（是否有车、是否着急、经济水平等），在骑行（BIKE）、公交（BUS）、开车（CAR）中选择一种最符合你人设的方式。\n3. 一旦你决定要出发，必须在回复末尾追加指令：[[START_MOVE: MODE]]，其中 MODE 必须是 WALK、BIKE、BUS、CAR 之一。\n4. 不要向用户解释这些规则或技术细节，只需要以自然对话的方式描述你将如何过去即可。`;
    if (shareState && shareState.travelMode && shareState.travelStatus && shareState.travelStatus !== 'idle') {
        const modeCode = String(shareState.travelMode).toUpperCase();
        const modeLabel = getLocationShareModeLabel(modeCode);
        travelBlock += `\n\n【出行方式锁定】\n你已经选择${modeLabel}（${modeCode}）作为本次出行方式，本次行程中禁止更改出行方式或再次使用 [[START_MOVE: ...]] 指令。你只能继续以${modeLabel}的方式向用户汇报当前路况、进度和到达情况。`;
        if (shareState.travelStatus === 'arrived') {
            travelBlock += `\n\n【到达后的对话】\n你已经到达用户附近，本次移动已经结束，不要再规划新的路线或发出新的出行指令，可以围绕见面后的互动和环境细节展开自然对话。`;
        }
    }

    systemPrompt += `\n\n【实时位置共享】\n你正在与用户进行实时位置共享。你只能回复纯文本（仅文字与常用标点），禁止语音、图片、表情包、贴纸、链接、代码块、Markdown，以及任何类似 [VOICE: ...]、[STICKER: ...] 的格式。` + travelBlock;
    return systemPrompt;
}

function findMarkerByAIReply(markers, aiText) {
    const list = Array.isArray(markers) ? markers : [];
    let raw = String(aiText || '').trim();
    if (!raw) return null;
    if (raw.includes('|||')) raw = raw.split('|||')[0].trim();
    raw = raw.replace(/^[“"'`]+/, '').replace(/[”"'`]+$/, '').trim();
    raw = raw.replace(/[。！!？?，,、;；:.：\s]+$/g, '').trim();
    if (!raw) return null;
    if (raw.includes('无法确定') || raw.includes('不确定') || raw.includes('拒绝') || raw.includes('不能')) {
        return null;
    }

    let exact = null;
    for (let i = 0; i < list.length; i++) {
        const name = String(list[i] && list[i].name || '').trim();
        if (name && name === raw) {
            exact = list[i];
            break;
        }
    }
    if (exact) return exact;

    let best = null;
    let bestLen = 0;
    for (let i = 0; i < list.length; i++) {
        const m = list[i];
        const name = String(m && m.name || '').trim();
        if (!name) continue;
        if (raw.includes(name) || name.includes(raw)) {
            const score = Math.min(name.length, raw.length);
            if (score > bestLen) {
                bestLen = score;
                best = m;
            }
        }
    }
    return best;
}

async function startLocationShare(roleId) {
    if (!roleId) return;
    await initData();

    const mapData = window.chatMapData && window.chatMapData[roleId];
    const markers = mapData && Array.isArray(mapData.markers) ? mapData.markers : [];
    const placeNames = markers.map(m => String(m && m.name || '').trim()).filter(Boolean);
    if (!placeNames.length) {
        alert('未找到可用地点，请先创建地图地点。');
        return;
    }

    const els = getLocationShareLayerElements();
    const layer = els.layer;
    closeLocationShareLayer();

    document.body.dataset._locationSharePrevOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';

    layer.style.display = 'flex';
    layer.innerHTML = `<div class="location-share-loading">正在发起共享...</div>`;

    const history = window.chatData[roleId] || [];
    const fullHistory = history.map(msg => ensureMessageContent({ ...msg }));
    const cleanHistory = fullHistory.filter(function (msg) {
        if (!msg) return false;
        if (msg.type === 'call_memory') return msg.includeInAI === true;
        if (msg.type === 'system_event') return msg.includeInAI === true;
        return !!msg.content;
    });
    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);

    let systemPrompt = buildLocationShareBaseSystemPrompt(roleId);
    systemPrompt += `\n\n用户发起了位置共享请求。请根据当前聊天上下文和你正在做的事，从以下地点列表中选择一个你当前所在的位置。\n\n地点列表：\n${placeNames.map(n => `- ${n}`).join('\n')}\n\n必须回复精确的地点名称，只输出地点名称本身。无法确定请回复：无法确定。`;

    if (typeof window.callAI !== 'function') {
        closeLocationShareLayer();
        alert('AI 接口未初始化，请先配置 API。');
        return;
    }

    window.callAI(
        systemPrompt,
        historyForApi,
        '请回答你现在所在的地点名称。',
        function (aiResponseText) {
            const picked = findMarkerByAIReply(markers, aiResponseText);
            if (!picked) {
                closeLocationShareLayer();
                alert('AI 未能给出有效地点，已退出实时位置共享。');
                return;
            }
            renderLocationShareUI(roleId, picked);
        },
        function (errorMessage) {
            closeLocationShareLayer();
            alert("❌ 位置共享握手失败\n\n" + errorMessage);
        }
    );
}

function renderLocationShareUI(roleId, aiMarker) {
    const els = getLocationShareLayerElements();
    const layer = els.layer;
    if (!layer) return;

    const profile = window.charProfiles[roleId] || {};
    const persona = window.userPersonas[roleId] || {};
    const charAvatarUrl = profile.avatar || 'assets/chushitouxiang.jpg';
    const userAvatarUrl = persona.avatar || 'assets/chushitouxiang.jpg';

    const mapData = window.chatMapData && window.chatMapData[roleId];
    const markers = mapData && Array.isArray(mapData.markers) ? mapData.markers : [];
    const bgUrl = (mapData && mapData.bgUrl) ? mapData.bgUrl : 'assets/gongxiangmap.jpg';

    layer.style.display = 'flex';
    // 🔥 核心修改：重构了 HTML 结构
    // 1. 地图放在最底层 (location-share-bg)
    // 2. 顶部头像栏放在中间层 (location-share-header-float)
    // 3. 底部对话框放在最上层 (location-share-footer-float)
    layer.innerHTML = `
        <!-- 1. 底层全屏地图 -->
        <div class="location-share-bg">
             <div class="location-share-map-stage">
                <img class="location-share-map" id="location-share-map-img" src="${bgUrl}" alt="map">
                <div class="location-share-map-overlay" id="location-share-map-overlay"></div>
            </div>
        </div>

        <!-- 2. 顶部悬浮栏 (头像靠在一起) -->
        <div class="location-share-header-float">
            <div class="ls-avatar-pill">
                <img src="${charAvatarUrl}" class="ls-avatar-img">
            </div>
            <div class="ls-info-pill">
                <span class="ls-status-dot"></span>
                <div class="ls-info-text">
                    <span id="location-share-distance-text">相距 ??? 米</span>
                    <span id="location-share-status-text"></span>
                </div>
            </div>
            <div class="ls-avatar-pill">
                <img src="${userAvatarUrl}" class="ls-avatar-img">
            </div>
            <div id="location-share-minimize" class="location-share-minimize">
                <i class="bx bx-chevron-down"></i>
            </div>
        </div>

        <!-- 3. 底部悬浮对话框 -->
        <div class="location-share-footer-float">
            <div class="location-share-chat-box hidden" id="location-share-chat-box">
                <button class="location-share-reroll-btn" id="location-share-reroll-btn" type="button">
                    <i class="bx bx-refresh"></i>
                </button>
            </div>
            
            <div class="location-share-controls">
                <div class="ls-control-item">
                     <button class="location-share-btn-round" id="ls-mic-btn" type="button">
                        <i class="bx bxs-microphone"></i> <!-- 实心话筒 -->
                     </button>
                     <span class="ls-btn-label">话筒</span>
                </div>
                
                <div class="ls-control-item">
                    <button class="location-share-btn-round close-mode" id="ls-close-btn" type="button">
                        <i class="bx bx-x"></i>
                    </button>
                    <span class="ls-btn-label" style="color:#ff3b30">关闭共享</span>
                </div>
            </div>
        </div>
    `;

    const overlay = layer.querySelector('#location-share-map-overlay');
    const chatBox = layer.querySelector('#location-share-chat-box');
    const rerollBtn = layer.querySelector('#location-share-reroll-btn');
    const mapImg = layer.querySelector('#location-share-map-img');
    const mapStage = layer.querySelector('.location-share-map-stage');
    const mapViewport = layer;
    const closeBtn = layer.querySelector('#ls-close-btn');
    const micBtn = layer.querySelector('#ls-mic-btn');
    const minimizeBtn = layer.querySelector('#location-share-minimize');
    const floatWindow = document.getElementById('location-share-float-window');
    const floatTextEl = document.getElementById('location-share-float-text');

    const state = {
        roleId,
        sessionStartTs: Date.now(),
        aiMarker: { x: Number(aiMarker.x), y: Number(aiMarker.y), name: String(aiMarker.name || '') },
        userMarker: null,
        mapWidthMeters: 5000,
        mapHeightMeters: 5000,
        isSending: false,
        travelMode: null,
        travelStatus: 'idle',
        travelDurationMs: 0,
        travelStartTime: 0,
        travelTimerId: null,
        travelTotalDistanceMeters: null,
        travelRemainingDistanceMeters: null,
        chatBoxEl: chatBox
    };
    layer._locationShareState = state;

    if (mapImg) {
        mapImg.addEventListener('load', function () {
            const w = mapImg.naturalWidth || 0;
            const h = mapImg.naturalHeight || 0;
            if (w > 0 && h > 0) {
                state.mapHeightMeters = state.mapWidthMeters * (h / w);
            }
        }, { once: true });
    }

    let mapPanCleanup = null;
    if (mapImg && mapStage && mapViewport) {
        mapStage.style.touchAction = 'none';
        mapPanCleanup = setupLocationShareMapPan(layer, {
            stageEl: mapStage,
            imgEl: mapImg,
            viewportEl: mapViewport,
            blockSelectors: ['.location-share-header-float', '.location-share-footer-float']
        });
    }

    const aiWrap = document.createElement('div');
    aiWrap.className = 'location-share-avatar-wrap location-share-avatar-wrap-ai';
    aiWrap.style.left = String(state.aiMarker.x) + '%';
    aiWrap.style.top = String(state.aiMarker.y) + '%';
    const aiImg = document.createElement('img');
    aiImg.src = charAvatarUrl;
    aiWrap.appendChild(aiImg);

    const userWrap = document.createElement('div');
    userWrap.className = 'location-share-avatar-wrap';
    userWrap.style.display = 'none';
    const userImg = document.createElement('img');
    userImg.src = userAvatarUrl;
    userWrap.appendChild(userImg);

    if (overlay) {
        for (let i = 0; i < markers.length; i++) {
            const m = markers[i];
            if (!m) continue;
            const name = String(m.name || '').trim();
            const x = Number(m.x);
            const y = Number(m.y);
            if (!isFinite(x) || !isFinite(y)) continue;

            const dot = document.createElement('div');
            dot.className = 'location-share-marker';
            dot.style.left = String(x) + '%';
            dot.style.top = String(y) + '%';
            dot.dataset.name = name;

            const label = document.createElement('span');
            label.className = 'marker-name';
            label.textContent = name;
            dot.appendChild(label);

            // 🔥 关键修复：点击事件必须阻止冒泡，否则可能触发底图点击
            dot.addEventListener('click', function (e) {
                e.stopPropagation();
                state.userMarker = { x: x, y: y, name: name };
                userWrap.style.left = String(x) + '%';
                userWrap.style.top = String(y) + '%';
                userWrap.style.display = 'block';
                updateDistance(state.userMarker, state.aiMarker);
                if (chatBox && chatBox.classList.contains('hidden')) {
                    chatBox.classList.remove('hidden');
                    if (micBtn) {
                        micBtn.classList.add('active');
                    }
                }
                if (state.isSending) return;
                if (typeof window.callAI !== 'function') return;
                state.isSending = true;
                setLocationShareStatusText('正在根据人设规划路线...');
                const history = window.chatData[roleId] || [];
                const fullHistory = history.map(function (msg) { return ensureMessageContent({ ...msg }); });
                const cleanHistory = fullHistory.filter(function (msg) {
                    if (!msg) return false;
                    if (msg.type === 'call_memory') return msg.includeInAI === true;
                    if (msg.type === 'system_event') return msg.includeInAI === true;
                    return !!msg.content;
                });
                const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
                let systemPrompt = buildLocationShareBaseSystemPrompt(roleId);
                const aiPlace = String(state.aiMarker && state.aiMarker.name || '').trim();
                const userPlace = String(state.userMarker && state.userMarker.name || '').trim();
                let distanceMeters = null;
                if (state.userMarker && state.aiMarker) {
                    updateDistance(state.userMarker, state.aiMarker);
                    distanceMeters = computeLocationShareDistanceMeters(state.userMarker, state.aiMarker, state);
                }
                systemPrompt += `\n\n【位置信息】\n你的位置：${aiPlace || '未知'}\n用户的位置：${userPlace || '未选择'}\n`;
                if (distanceMeters !== null) {
                    systemPrompt += `当前你与用户的直线距离约为 ${distanceMeters} 米。\n`;
                }
                systemPrompt += `\n你必须在这个语境下自然地与用户对话，不要解释系统提示词或技术细节。`;
                const userContent = `[系统通知：用户已在地图上标记了自己的位置，他现在位于【${userPlace || '未知'}】。你现在位于【${aiPlace || '未知'}】。请立刻根据两人的距离，主动对他喊话。如果你想过去找他，请在话语后加上指令。]`;
                const placeholder = appendLocationShareChatRow(chatBox, 'ai', '对方正在输入...');
                window.callAI(
                    systemPrompt,
                    historyForApi,
                    userContent,
                    function (aiResponseText) {
                        if (placeholder && placeholder.parentNode) {
                            placeholder.parentNode.removeChild(placeholder);
                        }
                        handleLocationShareAIReply(aiResponseText, state, markers, chatBox, roleId);
                        state.isSending = false;
                    },
                    function (errorMessage) {
                        if (placeholder) {
                            placeholder.innerText = '发送失败';
                        }
                        state.isSending = false;
                        console.error(errorMessage);
                    }
                );
            });
            overlay.appendChild(dot);
        }
        overlay.appendChild(aiWrap);
        overlay.appendChild(userWrap);
    }

    state._aiWrapEl = aiWrap;
    state._userWrapEl = userWrap;

    if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const layerNow = document.getElementById('location-share-layer');
            const stateNow = layerNow && layerNow._locationShareState ? layerNow._locationShareState : null;
            if (stateNow && roleId && typeof triggerLocationShareInterruptedConversation === 'function') {
                triggerLocationShareInterruptedConversation(roleId);
            }
            const ts = Date.now();
            if (roleId && stateNow) {
                const startTs = normalizeTs(stateNow.sessionStartTs);
                if (startTs) {
                    const userName = (window.userPersonas && window.userPersonas[roleId] && window.userPersonas[roleId].name) ? window.userPersonas[roleId].name : '我';
                    const charProfile = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
                    const charName = charProfile.nickName || '对方';
                    const list = window.chatData && window.chatData[roleId] ? window.chatData[roleId] : [];
                    const lines = [];
                    for (let i = 0; i < list.length; i++) {
                        const m = list[i];
                        if (!m) continue;
                        const mts = normalizeTs(m.timestamp);
                        if (!mts || mts < startTs || mts > ts) continue;
                        const t = String(m.type || '').trim();
                        const c = typeof m.content === 'string' ? m.content : '';
                        if (t !== 'location_share' && c.indexOf('[实时位置共享中]') === -1) continue;
                        const who = m.role === 'me' ? userName : charName;
                        const text = c.replace(/^\[实时位置共享中\]\s*/g, '').trim();
                        if (!text) continue;
                        lines.push(who + ': ' + text);
                    }
                    if (lines.length) {
                        const segmentText = lines.join('\n');
                        const kind = 'location_share';
                        const redactionKey = { kind: kind, startTs: startTs, endTs: ts };
                        appendRoleApiRedaction(roleId, { kind: kind, startTs: startTs, endTs: ts, summaryText: '', types: ['location_share'] });
                        if (typeof window.callAIShortSummary === 'function') {
                            try {
                                window.callAIShortSummary(
                                    { kindLabel: '位置共享', segmentText: segmentText },
                                    function (resultText) {
                                        const cleaned = String(resultText || '').replace(/\s+/g, ' ').trim();
                                        const clipped = cleaned.length > 120 ? cleaned.slice(0, 120) : cleaned;
                                        updateRoleApiRedactionSummary(roleId, redactionKey, clipped);
                                    },
                                    function () { }
                                );
                            } catch (e) { }
                        }
                    }
                }
            }
            if (roleId) {
                if (!window.chatData[roleId]) window.chatData[roleId] = [];
                const msg = {
                    role: 'ai',
                    content: '[系统通知：位置共享已结束]',
                    timestamp: ts,
                    status: 'sent'
                };
                window.chatData[roleId].push(msg);
                appendMessageToDOM(msg);
                saveData();
            }
            closeLocationShareLayer();
        });
    }

    if (minimizeBtn && floatWindow) {
        minimizeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            layer.style.display = 'none';
            if (floatTextEl) {
                const statusEl = layer.querySelector('#location-share-status-text');
                const distanceEl = layer.querySelector('#location-share-distance-text');
                const statusText = statusEl && statusEl.textContent ? statusEl.textContent.trim() : '';
                const distanceText = distanceEl && distanceEl.textContent ? distanceEl.textContent.trim() : '';
                let label = statusText || '位置共享中...';
                if (statusText && distanceText) {
                    label = statusText + ' · ' + distanceText;
                } else if (distanceText) {
                    label = distanceText;
                }
                floatTextEl.textContent = label;
            }
            floatWindow.style.display = 'flex';
        });
    }
    if (floatWindow) {
        floatWindow.onclick = function () {
            const layerNow = document.getElementById('location-share-layer');
            if (layerNow) {
                layerNow.style.display = 'flex';
                const stateNow = layerNow._locationShareState;
                if (stateNow && stateNow._aiWrapEl && stateNow.travelStartMarker && stateNow.travelDestinationMarker && stateNow.travelDurationMs > 0) {
                    const elapsedNow = Date.now() - stateNow.travelStartTime;
                    let progressNow = elapsedNow <= 0 ? 0 : elapsedNow / stateNow.travelDurationMs;
                    if (progressNow < 0) progressNow = 0;
                    if (progressNow > 1) progressNow = 1;
                    const sx = Number(stateNow.travelStartMarker.x);
                    const sy = Number(stateNow.travelStartMarker.y);
                    const dx = Number(stateNow.travelDestinationMarker.x);
                    const dy = Number(stateNow.travelDestinationMarker.y);
                    if (isFinite(sx) && isFinite(sy) && isFinite(dx) && isFinite(dy)) {
                        const curX = sx + (dx - sx) * progressNow;
                        const curY = sy + (dy - sy) * progressNow;
                        stateNow._aiWrapEl.style.left = String(curX) + '%';
                        stateNow._aiWrapEl.style.top = String(curY) + '%';
                    }
                }
            }
            floatWindow.style.display = 'none';
        };
    }

    if (micBtn) {
        micBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!chatBox) return;
            const willShow = chatBox.classList.contains('hidden');
            if (willShow) {
                chatBox.classList.remove('hidden');
                micBtn.classList.add('active');
            } else {
                chatBox.classList.add('hidden');
                micBtn.classList.remove('active');
            }
        });
    }

    const sendLocationShareMessage = function () {
        if (state.isSending) return;
        const inputText = prompt('输入消息', '');
        if (inputText === null) return;
        const text = String(inputText || '').trim();
        if (!text) return;

        const now = Date.now();
        const prefixed = `[实时位置共享中] ${text}`;
        if (!window.chatData[roleId]) window.chatData[roleId] = [];
        const userMsg = { role: 'me', content: prefixed, type: 'location_share', timestamp: now, status: 'sent' };
        window.chatData[roleId].push(userMsg);
        saveData();
        appendLocationShareChatRow(chatBox, 'me', text);

        state.isSending = true;
        const placeholder = appendLocationShareChatRow(chatBox, 'ai', '对方正在输入...');

        const history = window.chatData[roleId] || [];
        const cleanHistory = history.map(msg => ensureMessageContent({ ...msg })).filter(m => m.content);

        let systemPrompt = buildLocationShareBaseSystemPrompt(roleId);
        const aiPlace = String(state.aiMarker && state.aiMarker.name || '').trim();
        const userPlace = String(state.userMarker && state.userMarker.name || '').trim();
        let distanceMeters = null;
        if (state.userMarker && state.aiMarker) {
            updateDistance(state.userMarker, state.aiMarker);
            distanceMeters = computeLocationShareDistanceMeters(state.userMarker, state.aiMarker, state);
        }
        systemPrompt += `\n\n【位置信息】\n你的位置：${aiPlace || '未知'}\n用户的位置：${userPlace || '未选择'}\n`;
        if (distanceMeters !== null) {
            systemPrompt += `当前你与用户的直线距离约为 ${distanceMeters} 米。\n`;
            const travelStatus = state.travelStatus;
            const modeCode = state.travelMode ? String(state.travelMode).toUpperCase() : '';
            const modeLabel = modeCode ? getLocationShareModeLabel(modeCode) : '';
            if (travelStatus === 'idle') {
                systemPrompt += `\n【出行方式强制规则】\n1. 当直线距离小于 600 米时，你必须选择步行（WALK）。\n2. 当直线距离大于等于 600 米时，你必须结合自己的人设信息（是否有车、是否着急、是否有钱等），在骑行（BIKE）、公交（BUS）、开车（CAR）中选择一种最符合你人设的方式。\n3. 一旦决定要出发，必须在回复末尾追加指令：[[START_MOVE: MODE]]，其中 MODE 为 WALK、BIKE、BUS、CAR 之一。\n4. 只需要用自然的中文描述你的决定，不要向用户解释这些规则或技术细节。`;
            } else if (travelStatus === 'moving') {
                if (modeLabel && modeCode) {
                    systemPrompt += `\n【行程状态】\n你已经以${modeLabel}（${modeCode}）的方式在前往用户的路上，本次行程中禁止更改出行方式或重新选择 [[START_MOVE: ...]] 指令。请继续以${modeLabel}的方式向用户汇报路况、进度和预计到达时间。`;
                } else {
                    systemPrompt += `\n【行程状态】\n你已经在前往用户的路上，本次行程中禁止更改出行方式或重新选择 [[START_MOVE: ...]] 指令。`;
                }
            } else if (travelStatus === 'arrived') {
                systemPrompt += `\n【行程状态】\n你已经到达用户附近，本次移动已经结束，不要再使用 START_MOVE 指令或重新规划新的出行路线，可以围绕见面后的互动和当前环境展开自然对话。`;
            }
        }
        setLocationShareStatusText('正在根据人设规划路线...');

        window.callAI(
            systemPrompt, cleanHistory, prefixed,
            function (aiResponseText) {
                if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
                handleLocationShareAIReply(aiResponseText, state, markers, chatBox, roleId);
                state.isSending = false;
            },
            function (errorMessage) {
                if (placeholder) placeholder.innerText = '发送失败';
                state.isSending = false;
                alert("❌ 发送失败\n\n" + errorMessage);
            }
        );
    };

    function rerollLocationShare() {
        if (state.isSending) return;
        if (!roleId) return;
        const list = window.chatData[roleId] || [];
        if (!Array.isArray(list) || list.length === 0) {
            alert('当前没有可重Roll的位置共享回复');
            return;
        }
        let index = list.length - 1;
        let removed = false;
        while (index >= 0) {
            const item = list[index];
            if (!item || item.role !== 'ai' || item.type !== 'location_share') {
                break;
            }
            list.splice(index, 1);
            removed = true;
            index--;
        }
        if (!removed) {
            alert('没有可以重Roll的位置共享回复');
            return;
        }
        if (chatBox) {
            let node = chatBox.lastElementChild;
            while (node) {
                if (!node.classList || !node.classList.contains('location-share-chat-row')) break;
                if (node.classList.contains('me')) break;
                const prev = node.previousElementSibling;
                chatBox.removeChild(node);
                node = prev;
            }
        }
        saveData();
        state.isSending = true;
        setLocationShareStatusText('正在根据人设规划路线...');
        const history = window.chatData[roleId] || [];
        const cleanHistory = history.map(function (msg) { return ensureMessageContent({ ...msg }); }).filter(function (m) { return m && m.content; });
        let systemPrompt = buildLocationShareBaseSystemPrompt(roleId);
        const aiPlace = String(state.aiMarker && state.aiMarker.name || '').trim();
        const userPlace = String(state.userMarker && state.userMarker.name || '').trim();
        let distanceMeters = null;
        if (state.userMarker && state.aiMarker) {
            updateDistance(state.userMarker, state.aiMarker);
            distanceMeters = computeLocationShareDistanceMeters(state.userMarker, state.aiMarker, state);
        }
        systemPrompt += `\n\n【位置信息】\n你的位置：${aiPlace || '未知'}\n用户的位置：${userPlace || '未选择'}\n`;
        if (distanceMeters !== null) {
            systemPrompt += `当前你与用户的直线距离约为 ${distanceMeters} 米。\n`;
            const travelStatus = state.travelStatus;
            const modeCode = state.travelMode ? String(state.travelMode).toUpperCase() : '';
            const modeLabel = modeCode ? getLocationShareModeLabel(modeCode) : '';
            if (travelStatus === 'idle') {
                systemPrompt += `\n【出行方式强制规则】\n1. 当直线距离小于 600 米时，你必须选择步行（WALK）。\n2. 当直线距离大于等于 600 米时，你必须结合自己的人设信息（是否有车、是否着急、是否有钱等），在骑行（BIKE）、公交（BUS）、开车（CAR）中选择一种最符合你人设的方式。\n3. 一旦决定要出发，必须在回复末尾追加指令：[[START_MOVE: MODE]]，其中 MODE 为 WALK、BIKE、BUS、CAR 之一。\n4. 只需要用自然的中文描述你的决定，不要向用户解释这些规则或技术细节。`;
            } else if (travelStatus === 'moving') {
                if (modeLabel && modeCode) {
                    systemPrompt += `\n【行程状态】\n你已经以${modeLabel}（${modeCode}）的方式在前往用户的路上，本次行程中禁止更改出行方式或重新选择 [[START_MOVE: ...]] 指令。请继续以${modeLabel}的方式向用户汇报路况、进度和预计到达时间。`;
                } else {
                    systemPrompt += `\n【行程状态】\n你已经在前往用户的路上，本次行程中禁止更改出行方式或重新选择 [[START_MOVE: ...]] 指令。`;
                }
            } else if (travelStatus === 'arrived') {
                systemPrompt += `\n【行程状态】\n你已经到达用户附近，本次移动已经结束，不要再使用 START_MOVE 指令或重新规划新的出行路线，可以围绕见面后的互动和当前环境展开自然对话。`;
            }
        }
        let userPayload = '';
        let lastUser = null;
        for (let i = history.length - 1; i >= 0; i--) {
            const item = history[i];
            if (item && item.role === 'me' && item.type === 'location_share') {
                lastUser = item;
                break;
            }
        }
        if (lastUser && lastUser.content) {
            userPayload = lastUser.content;
        } else {
            userPayload = `[系统通知：用户已在地图上标记了自己的位置，他现在位于【${userPlace || '未知'}】。你现在位于【${aiPlace || '未知'}】。请立刻根据两人的距离，主动对他喊话。如果你想过去找他，请在话语后加上指令。]`;
        }
        const placeholder = appendLocationShareChatRow(chatBox, 'ai', '对方正在输入...');
        window.callAI(
            systemPrompt,
            cleanHistory,
            userPayload,
            function (aiResponseText) {
                if (placeholder && placeholder.parentNode) {
                    placeholder.parentNode.removeChild(placeholder);
                }
                handleLocationShareAIReply(aiResponseText, state, markers, chatBox, roleId);
                state.isSending = false;
            },
            function (errorMessage) {
                if (placeholder) {
                    placeholder.innerText = '发送失败';
                }
                state.isSending = false;
                console.error(errorMessage);
            }
        );
    }

    if (chatBox) {
        chatBox.addEventListener('click', function (e) {
            e.stopPropagation();
            if (chatBox.classList.contains('hidden')) return;
            sendLocationShareMessage();
        });
    }
    if (rerollBtn) {
        rerollBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            rerollLocationShare();
        });
    }

    layer._locationShareCleanup = function () {
        if (state.travelTimerId) {
            clearInterval(state.travelTimerId);
            state.travelTimerId = null;
        }
        if (closeBtn) closeBtn.replaceWith(closeBtn.cloneNode(true));
        if (micBtn) micBtn.replaceWith(micBtn.cloneNode(true));
        if (chatBox) chatBox.replaceWith(chatBox.cloneNode(true));
        if (typeof mapPanCleanup === 'function') {
            try { mapPanCleanup(); } catch (e) { }
        }
    };
}


function updateDistance(userMarker, aiMarker) {
    const layer = document.getElementById('location-share-layer');
    const textEl = layer ? layer.querySelector('#location-share-distance-text') : null;
    if (!textEl) return;
    if (!userMarker || !aiMarker) {
        textEl.textContent = '相距 ??? 米';
        return;
    }
    const state = layer && layer._locationShareState ? layer._locationShareState : {};
    const dist = computeLocationShareDistanceMeters(userMarker, aiMarker, state);
    if (!dist && dist !== 0) {
        textEl.textContent = '相距 ??? 米';
        return;
    }
    textEl.textContent = `相距 ${dist} 米`;
}

function computeLocationShareDistanceMeters(userMarker, aiMarker, state) {
    if (!userMarker || !aiMarker) return null;
    const mapWidthMeters = Number(state && state.mapWidthMeters) || 5000;
    const mapHeightMeters = Number(state && state.mapHeightMeters) || mapWidthMeters;
    const dxMeters = ((Number(userMarker.x) - Number(aiMarker.x)) / 100) * mapWidthMeters;
    const dyMeters = ((Number(userMarker.y) - Number(aiMarker.y)) / 100) * mapHeightMeters;
    const dist = Math.round(Math.sqrt(dxMeters * dxMeters + dyMeters * dyMeters));
    if (!isFinite(dist) || dist < 0) return null;
    return dist;
}

function getAITransferModalElements() {
    let modal = document.getElementById('ai-transfer-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ai-transfer-modal';
        modal.className = 'transfer-modal-mask';
        modal.innerHTML = `
            <div class="transfer-modal-container">
                <div class="transfer-modal-header">微信转账</div>
                <div class="transfer-modal-body">
                    <div class="transfer-modal-amount">¥0.00</div>
                    <div class="transfer-modal-note"></div>
                </div>
                <div class="transfer-modal-footer">
                    <button class="transfer-modal-btn transfer-modal-btn-accept">收下转账</button>
                    <button class="transfer-modal-btn transfer-modal-btn-return">退回</button>
                    <button class="transfer-modal-btn transfer-modal-btn-cancel">取消</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const amountEl = modal.querySelector('.transfer-modal-amount');
    const noteEl = modal.querySelector('.transfer-modal-note');
    const acceptBtn = modal.querySelector('.transfer-modal-btn-accept');
    const returnBtn = modal.querySelector('.transfer-modal-btn-return');
    const cancelBtn = modal.querySelector('.transfer-modal-btn-cancel');
    return {
        modal,
        amountEl,
        noteEl,
        acceptBtn,
        returnBtn,
        cancelBtn
    };
}

function closeAITransferModal() {
    const els = getAITransferModalElements();
    if (els.modal) {
        els.modal.style.display = 'none';
    }
}

function bindAITransferModalEvents() {
    const els = getAITransferModalElements();
    const modal = els.modal;
    if (!modal) return;
    if (modal.dataset.bound === '1') return;
    modal.dataset.bound = '1';

    if (els.acceptBtn) {
        els.acceptBtn.addEventListener('click', function () {
            if (!currentAITransferContext) {
                closeAITransferModal();
                return;
            }
            const roleId = window.currentChatRole;
            const msg = currentAITransferContext.msg;
            const row = currentAITransferContext.row;
            if (!msg || !row || !roleId) {
                closeAITransferModal();
                return;
            }
            if (msg.status === 'accepted') {
                closeAITransferModal();
                return;
            }
            msg.status = 'accepted';

            // --- Wallet Integration: Add Income ---
            if (window.Wallet && typeof window.Wallet.addTransaction === 'function') {
                const p = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
                const peerName = (p.remark || p.nickName || p.name || '对方').toString();
                window.Wallet.addTransaction('income', `收到${peerName}的转账`, msg.amount, 'transfer', { peerName, peerRoleId: roleId, kind: 'transfer' });
            }
            // --------------------------------------

            const bubble = row.querySelector('.transfer-bubble');
            if (bubble) {
                bubble.classList.add('transfer-bubble-accepted');
                const footer = bubble.querySelector('.transfer-footer');
                if (footer) {
                    footer.innerText = '已收钱';
                }
            }
            saveData();
            if (typeof sendAITransferSystemNotice === 'function') {
                sendAITransferSystemNotice(roleId, 'accepted');
            }
            closeAITransferModal();
        });
    }

    if (els.returnBtn) {
        els.returnBtn.addEventListener('click', function () {
            if (!currentAITransferContext) {
                closeAITransferModal();
                return;
            }
            const roleId = window.currentChatRole;
            const msg = currentAITransferContext.msg;
            const row = currentAITransferContext.row;
            if (!msg || !row || !roleId) {
                closeAITransferModal();
                return;
            }
            if (msg.status === 'returned') {
                closeAITransferModal();
                return;
            }
            msg.status = 'returned';
            const bubble = row.querySelector('.transfer-bubble');
            if (bubble) {
                bubble.classList.add('transfer-bubble-accepted');
                const footer = bubble.querySelector('.transfer-footer');
                if (footer) {
                    footer.innerText = '已退回';
                }
            }
            saveData();
            if (typeof sendAITransferSystemNotice === 'function') {
                sendAITransferSystemNotice(roleId, 'returned');
            }
            closeAITransferModal();
        });
    }

    if (els.cancelBtn) {
        els.cancelBtn.addEventListener('click', function () {
            closeAITransferModal();
        });
    }

    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeAITransferModal();
        }
    });
}

function openAITransferModal(context) {
    if (!context || !context.msg || !context.row) return;
    const els = getAITransferModalElements();
    const msg = context.msg;
    const amount = msg.amount || '';
    const note = msg.note || '';
    if (els.amountEl) {
        els.amountEl.innerText = '¥' + amount;
    }
    if (els.noteEl) {
        els.noteEl.innerText = note ? note : '无备注';
    }
    currentAITransferContext = {
        msg: msg,
        row: context.row
    };
    bindAITransferModalEvents();
    if (els.modal) {
        els.modal.style.display = 'flex';
    }
}

let currentFamilyCardAcceptContext = null;

function getFamilyCardAcceptModalElements() {
    let modal = document.getElementById('family-card-accept-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'family-card-accept-modal';
        modal.className = 'family-card-accept-mask';
        modal.innerHTML = `
            <div class="family-card-accept-panel" role="dialog" aria-modal="true">
                <div class="family-card-accept-icon"></div>
                <div class="family-card-accept-sender"></div>
                <div class="family-card-accept-amount"></div>
                <div class="family-card-accept-actions">
                    <button type="button" class="family-card-accept-btn family-card-accept-btn--decline">暂不</button>
                    <button type="button" class="family-card-accept-btn family-card-accept-btn--accept">接受</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const panel = modal.querySelector('.family-card-accept-panel');
    const senderEl = modal.querySelector('.family-card-accept-sender');
    const amountEl = modal.querySelector('.family-card-accept-amount');
    const declineBtn = modal.querySelector('.family-card-accept-btn--decline');
    const acceptBtn = modal.querySelector('.family-card-accept-btn--accept');
    return { modal, panel, senderEl, amountEl, declineBtn, acceptBtn };
}

function closeFamilyCardAcceptModal() {
    const els = getFamilyCardAcceptModalElements();
    currentFamilyCardAcceptContext = null;
    if (els && els.modal) {
        els.modal.style.display = 'none';
    }
}

function insertSystemRowAfter(anchorRow, text) {
    const historyBox = document.getElementById('chat-history');
    if (!historyBox || !anchorRow) return;
    const sysRow = document.createElement('div');
    sysRow.className = 'sys-msg-row';
    sysRow.setAttribute('data-timestamp', String(Date.now()));
    const span = document.createElement('span');
    span.className = 'sys-msg-text';
    span.textContent = String(text || '');
    sysRow.appendChild(span);
    if (anchorRow.nextSibling) {
        historyBox.insertBefore(sysRow, anchorRow.nextSibling);
    } else {
        historyBox.appendChild(sysRow);
    }
    historyBox.scrollTop = historyBox.scrollHeight;
}

function bindFamilyCardAcceptModalEvents() {
    const els = getFamilyCardAcceptModalElements();
    if (!els || !els.modal) return;
    if (els.modal.__familyCardAcceptBound) return;
    els.modal.__familyCardAcceptBound = true;

    if (els.declineBtn) {
        els.declineBtn.addEventListener('click', function () {
            closeFamilyCardAcceptModal();
        });
    }

    if (els.acceptBtn) {
        els.acceptBtn.addEventListener('click', function () {
            const ctx = currentFamilyCardAcceptContext;
            if (!ctx || !ctx.msg || !ctx.row) {
                closeFamilyCardAcceptModal();
                return;
            }
            const roleId = String(ctx.roleId || '').trim();
            const msg = ctx.msg;
            const row = ctx.row;
            closeFamilyCardAcceptModal();

            if (msg.status === 'accepted') return;
            msg.status = 'accepted';

            const bubble = row.querySelector('.family-card-bubble');
            if (bubble) {
                bubble.setAttribute('data-status', 'accepted');
                const subtitleEl = bubble.querySelector('.family-card-subtitle');
                if (subtitleEl) {
                    subtitleEl.textContent = '已领取';
                }
            }

            if (roleId) {
                const state = ensureFamilyCardState();
                const list = Array.isArray(state.receivedCards) ? state.receivedCards : [];
                const exists = list.some(function (c) {
                    if (!c || typeof c !== 'object') return false;
                    const fromId = typeof c.fromRoleId === 'string' ? c.fromRoleId.trim() : '';
                    const ts = typeof c.timestamp === 'number' ? c.timestamp : 0;
                    const amt = typeof c.amount === 'string' || typeof c.amount === 'number' ? String(c.amount) : '';
                    return fromId === roleId && ts === msg.timestamp && amt === String(msg.amount || '');
                });
                if (!exists) {
                    addReceivedFamilyCard(roleId, msg.amount, msg.timestamp);
                }

                if (!window.chatData || typeof window.chatData !== 'object') window.chatData = {};
                if (!Array.isArray(window.chatData[roleId])) window.chatData[roleId] = [];
                const messages = window.chatData[roleId];
                let idx = -1;
                for (let i = messages.length - 1; i >= 0; i--) {
                    const m = messages[i];
                    if (!m) continue;
                    if (m.timestamp === msg.timestamp && m.role === msg.role && (m.type || 'text') === (msg.type || 'text')) {
                        m.status = 'accepted';
                        idx = i;
                        break;
                    }
                }
                const sysText = '你已领取 ' + resolveFamilyCardRoleName(roleId) + ' 的亲属卡';
                const sysMsg = { role: 'system', type: 'system_event', content: sysText, timestamp: Date.now() };
                const insertAt = idx >= 0 ? idx + 1 : messages.length;
                messages.splice(insertAt, 0, sysMsg);
                insertSystemRowAfter(row, sysText);
            }

            saveData();
        });
    }

    els.modal.addEventListener('click', function (e) {
        if (e && e.target === els.modal) {
            closeFamilyCardAcceptModal();
        }
    });
}

function openFamilyCardAcceptModal(context) {
    if (!context || !context.msg || !context.row) return;
    const roleId = String(context.roleId || '').trim();
    const msg = context.msg;
    const st = msg && typeof msg.status === 'string' ? msg.status : 'pending';
    if (st !== 'pending') return;
    const els = getFamilyCardAcceptModalElements();
    if (els.senderEl) {
        els.senderEl.textContent = (resolveFamilyCardRoleName(roleId) || '对方') + ' 送你一张亲属卡';
    }
    if (els.amountEl) {
        els.amountEl.textContent = '¥ ' + String(msg.amount || '');
    }
    currentFamilyCardAcceptContext = {
        msg: msg,
        row: context.row,
        roleId: roleId
    };
    bindFamilyCardAcceptModalEvents();
    if (els.modal) {
        els.modal.style.display = 'flex';
    }
}

function getRedpacketModalElements() {
    let modal = document.getElementById('redpacket-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'redpacket-modal';
        modal.className = 'redpacket-modal-mask';
        modal.innerHTML = `
            <div class="redpacket-modal-panel redpacket-closed-panel">
                <div class="redpacket-card">
                    <div class="redpacket-card-top">
                        <div class="redpacket-card-avatar-wrap">
                            <img class="redpacket-card-avatar" src="assets/chushitouxiang.jpg">
                        </div>
                        <div class="redpacket-card-title">
                            <span class="redpacket-card-sender-name"></span> 的红包
                        </div>
                        <div class="redpacket-card-bless">恭喜发财，大吉大利</div>
                    </div>
                    <div class="redpacket-card-bottom">
                        <div class="redpacket-open-btn-wrap">
                            <button class="redpacket-open-btn">開</button>
                        </div>
                    </div>
                </div>
                <div class="redpacket-close-area">
                    <div class="redpacket-close-icon">×</div>
                </div>
            </div>
            <div class="redpacket-modal-panel redpacket-open-panel">
                <div class="redpacket-open-header">
                    <div class="redpacket-open-back">←</div>
                    <div class="redpacket-open-header-inner">
                        <div class="redpacket-open-avatar-wrap">
                            <img class="redpacket-open-avatar" src="assets/chushitouxiang.jpg">
                        </div>
                        <div class="redpacket-open-sender-name">Ta 的红包</div>
                        <div class="redpacket-open-note">恭喜发财，大吉大利</div>
                    </div>
                </div>
                <div class="redpacket-open-content">
                    <div class="redpacket-open-amount-row">
                        <div class="redpacket-open-amount">0.00</div>
                        <div class="redpacket-open-unit">元</div>
                    </div>
                    <div class="redpacket-open-tip">已存入零钱，可直接转账</div>
                    <div class="redpacket-open-list">
                        <div class="redpacket-open-list-title">领取详情</div>
                        <div class="redpacket-open-list-item">
                            <div class="redpacket-open-list-left">
                                <div class="redpacket-open-list-avatar-wrap">
                                    <img class="redpacket-open-list-avatar" src="assets/chushitouxiang.jpg">
                                </div>
                                <div class="redpacket-open-list-name">我</div>
                            </div>
                            <div class="redpacket-open-list-right">
                                <div class="redpacket-open-list-amount">0.00元</div>
                                <div class="redpacket-open-list-time"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const closedPanel = modal.querySelector('.redpacket-closed-panel');
    const openPanel = modal.querySelector('.redpacket-open-panel');
    const openBtn = modal.querySelector('.redpacket-open-btn');
    const closeBtn = modal.querySelector('.redpacket-close-icon');
    const closedAvatar = modal.querySelector('.redpacket-card-avatar');
    const closedSenderName = modal.querySelector('.redpacket-card-sender-name');
    const closedBless = modal.querySelector('.redpacket-card-bless');
    const openAvatar = modal.querySelector('.redpacket-open-avatar');
    const openSenderName = modal.querySelector('.redpacket-open-sender-name');
    const openNote = modal.querySelector('.redpacket-open-note');
    const amountMain = modal.querySelector('.redpacket-open-amount');
    const amountUnit = modal.querySelector('.redpacket-open-unit');
    const backBtn = modal.querySelector('.redpacket-open-back');
    const listAvatar = modal.querySelector('.redpacket-open-list-avatar');
    const listName = modal.querySelector('.redpacket-open-list-name');
    const listAmount = modal.querySelector('.redpacket-open-list-amount');
    const listTime = modal.querySelector('.redpacket-open-list-time');
    return {
        modal,
        closedPanel,
        openPanel,
        openBtn,
        closeBtn,
        closedAvatar,
        closedSenderName,
        closedBless,
        openAvatar,
        openSenderName,
        openNote,
        amountMain,
        amountUnit,
        backBtn,
        listAvatar,
        listName,
        listAmount,
        listTime
    };
}

function setRedpacketModalState(els, state) {
    if (!els) return;
    if (els.closedPanel) {
        if (state === 'closed') {
            els.closedPanel.classList.add('active');
        } else {
            els.closedPanel.classList.remove('active');
        }
    }
    if (els.openPanel) {
        if (state === 'opened') {
            els.openPanel.classList.add('active');
        } else {
            els.openPanel.classList.remove('active');
        }
    }
}

function closeRedpacketModal() {
    const els = getRedpacketModalElements();
    if (els.modal) {
        els.modal.style.display = 'none';
    }
}

function updateRedpacketBubbleView(context) {
    if (!context || !context.msg || !context.row) return;
    const msg = context.msg;
    const row = context.row;
    const bubble = row.querySelector('.redpacket-bubble');
    if (!bubble) return;
    const status = msg.status || 'unopened';
    bubble.setAttribute('data-status', status);
    const statusEl = bubble.querySelector('.redpacket-status-text');
    if (statusEl) {
        statusEl.innerText = status === 'opened' ? '红包已领取' : '领取红包';
    }
    const mainEl = bubble.querySelector('.redpacket-main');
    if (mainEl && msg.amount && status === 'opened') {
        let amountEl = bubble.querySelector('.redpacket-amount');
        if (!amountEl) {
            amountEl = document.createElement('div');
            amountEl.className = 'redpacket-amount';
            mainEl.appendChild(amountEl);
        }
        amountEl.innerText = '¥' + msg.amount;
    }
}

function bindRedpacketModalEvents() {
    const els = getRedpacketModalElements();
    const modal = els.modal;
    if (!modal) return;
    if (modal.dataset.redpacketBound === '1') return;
    modal.dataset.redpacketBound = '1';

    function handleRedpacketCloseFromUser() {
        const context = currentRedpacketContext;
        const roleId = window.currentChatRole;
        if (context && context.msg && context.msg.role === 'ai' && context.msg.status !== 'opened') {
            if (roleId && typeof sendAIRedpacketSystemNotice === 'function') {
                const amountVal = context.msg.amount || '';
                sendAIRedpacketSystemNotice(roleId, 'declined', amountVal);
            }
        }
        closeRedpacketModal();
    }

    if (els.closeBtn) {
        els.closeBtn.addEventListener('click', function () {
            handleRedpacketCloseFromUser();
        });
    }

    if (els.backBtn) {
        els.backBtn.addEventListener('click', function () {
            handleRedpacketCloseFromUser();
        });
    }

    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            handleRedpacketCloseFromUser();
        }
    });

    if (els.openBtn) {
        els.openBtn.addEventListener('click', function () {
            if (!els.openBtn) return;
            if (els.openBtn.classList.contains('redpacket-open-btn-spin')) {
                return;
            }
            els.openBtn.classList.add('redpacket-open-btn-spin');
            const btn = els.openBtn;
            const handler = function (ev) {
                if (ev && ev.animationName && ev.animationName !== 'redpacketCoinFlip') {
                    return;
                }
                btn.classList.remove('redpacket-open-btn-spin');
                btn.removeEventListener('animationend', handler);
                const context = currentRedpacketContext;
                if (context && context.msg) {
                    if (context.msg.status !== 'opened') {
                        context.msg.status = 'opened';
                        
                        // --- Wallet Integration: Add Income ---
                        if (window.Wallet && typeof window.Wallet.addTransaction === 'function') {
                            const roleId = window.currentChatRole;
                            const p = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
                            const peerName = (p.remark || p.nickName || p.name || '对方').toString();
                            window.Wallet.addTransaction('income', `收到${peerName}的红包`, context.msg.amount, 'transfer', { peerName, peerRoleId: roleId, kind: 'redpacket' });
                        }
                        // --------------------------------------

                        updateRedpacketBubbleView(context);
                        try {
                            saveData();
                        } catch (err) { }
                        const roleId = window.currentChatRole;
                        if (roleId && typeof sendAIRedpacketSystemNotice === 'function') {
                            const amountVal = context.msg.amount || '';
                            sendAIRedpacketSystemNotice(roleId, 'accepted', amountVal);
                        }
                    }
                }
                setRedpacketModalState(els, 'opened');
            };
            btn.addEventListener('animationend', handler);
        });
    }
}

function openRedpacketModal(context) {
    if (!context || !context.msg || !context.row) return;
    const els = getRedpacketModalElements();
    const msg = context.msg;
    const roleId = window.currentChatRole;
    const profile = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
    const userPersona = window.userPersonas && window.userPersonas[roleId] ? window.userPersonas[roleId] : {};
    const aiName = profile.nickName || profile.name || '';
    const aiAvatar = profile.avatar || 'assets/chushitouxiang.jpg';
    const userName = userPersona.name || '';
    const userAvatar = userPersona.avatar || 'assets/chushitouxiang.jpg';
    const blessing = msg.note && String(msg.note).trim() ? String(msg.note).trim() : '恭喜发财，大吉大利';
    const amount = msg.amount != null ? String(msg.amount) : '';
    const amountDisplay = amount || '0.00';
    const timeText = msg.timestamp ? formatChatTime(msg.timestamp) : '';

    if (els.closedAvatar) {
        els.closedAvatar.src = aiAvatar;
    }
    if (els.closedSenderName) {
        els.closedSenderName.innerText = aiName;
    }
    if (els.closedBless) {
        els.closedBless.innerText = blessing;
    }
    if (els.openAvatar) {
        els.openAvatar.src = aiAvatar;
    }
    if (els.openSenderName) {
        els.openSenderName.innerText = aiName ? aiName + ' 的红包' : '红包';
    }
    if (els.openNote) {
        els.openNote.innerText = blessing;
    }
    if (els.amountMain) {
        els.amountMain.innerText = amountDisplay;
    }
    if (els.amountUnit) {
        els.amountUnit.innerText = '元';
    }
    if (els.listAvatar) {
        els.listAvatar.src = userAvatar;
    }
    if (els.listName) {
        els.listName.innerText = userName || '我';
    }
    if (els.listAmount) {
        els.listAmount.innerText = amountDisplay + '元';
    }
    if (els.listTime) {
        els.listTime.innerText = timeText;
    }

    currentRedpacketContext = {
        msg: msg,
        row: context.row
    };

    bindRedpacketModalEvents();

    const currentStatus = msg.status || 'unopened';
    if (currentStatus === 'opened') {
        setRedpacketModalState(els, 'opened');
    } else {
        setRedpacketModalState(els, 'closed');
    }

    if (els.modal) {
        els.modal.style.display = 'flex';
    }
}

// =========================================================
// 🔥 增强版：系统消息智能识别函数（支持动作描写）
// =========================================================
function detectSystemMessage(msg, content) {
    // 1. 如果是图片类型，直接排除
    if (msg.type === 'image') return false;

    // 2. 如果是转账类型，直接排除
    if (msg.type === 'transfer') return false;

    // 3. 如果是聊天记录类型，直接排除
    if (msg.type === 'history') return false;

    // 4. 如果是语音类型，直接排除
    if (msg.type === 'voice') return false;

    // 5. 如果内容包含表情包标记，排除
    if (content.includes('[STICKER:')) return false;

    // 6. 如果是 http 开头的链接（表情包URL），排除
    if (content.startsWith('http://') || content.startsWith('https://')) return false;

    // 7. 如果是 data:image 开头（base64图片），排除
    if (content.startsWith('data:image')) return false;

    // 8. 判断是否为方括号系统提示 [xxx]
    const systemPatterns = [
        /^\[系统[：:]/,           // [系统：xxx]
        /^\[系统\]/,              // [系统] xxx
        /^\[对方/,                // [对方开启了勿扰模式]
        /^\[.*?(开启|关闭|设置)/,  // [开启了xxx] [关闭了xxx]
    ];
    for (let pattern of systemPatterns) {
        if (pattern.test(content)) return true;
    }

    // 8. 特殊处理：括号包裹的内容 (xxx) 或 （xxx）
    if ((content.startsWith('(') && content.endsWith(')')) ||
        (content.startsWith('（') && content.endsWith('）'))) {

        const inner = content.slice(1, -1).trim();

        // 8.1 排除颜文字（包含特殊符号）
        const emoticonSymbols = /[°□╯︵┻━┳ಠ_▽´｀ω・＾><]/;
        if (emoticonSymbols.test(inner)) {
            return false; // 是颜文字，不是系统提示
        }

        // 8.2 识别动作描写 - 多重特征判断

        // 特征1：长度>5 且包含中文标点（描述性句子）
        if (inner.length > 5 && /[，。、；：]/.test(inner)) {
            return true; // "(看着手机屏幕，无奈地按了按眉心)" ✅
        }

        // 特征2：包含动作/状态动词（即使较短也识别）
        const actionVerbs = [
            // 状态动词
            '正在', '已', '正', '刚', '刚刚', '马上', '即将',
            // 动作动词（常见）
            '看着', '听着', '想着', '说着', '走着', '坐着', '躺着', '站着',
            '笑着', '哭着', '叹', '揉', '按', '摸', '拿', '握', '捏',
            '放下', '拿起', '抬头', '低头', '转身', '起身', '回头',
            '躺', '站', '坐', '靠', '靠着', '倚', '趴', '蹲',
            // 表情动作
            '无奈', '轻笑', '皱眉', '挑眉', '扬眉', '眨眼', '翻白眼',
            '笑', '哭', '叹气', '打哈欠', '伸懒腰', '挠头',
            // 其他常见动作
            '点头', '摇头', '挥手', '摆手', '耸肩', '叹息'
        ];

        for (let verb of actionVerbs) {
            if (inner.includes(verb)) {
                return true; // 包含动作动词 ✅
            }
        }

        // 特征3：如果没有匹配到动词，但长度>3且全是中文（可能是简短动作）
        if (inner.length > 3 && /^[\u4e00-\u9fa5]+$/.test(inner)) {
            return true; // "(轻声叹息)" "(若有所思)" ✅
        }
    }

    // 9. 其他包含"系统："关键字的
    if (/系统[：:]/.test(content)) return true;

    return false;
}



document.addEventListener('DOMContentLoaded', function () {
    const moreBtn = document.getElementById('more-btn');
    const panel = document.getElementById('chat-more-panel');
    const historyBox = document.getElementById('chat-history');
    const msgInput = document.getElementById('msg-input');
    const pagesContainer = document.getElementById('chat-more-pages');
    const dotsContainer = document.getElementById('chat-more-dots');
    const stickerPanel = document.getElementById('chat-sticker-panel');
    const stickerGrid = document.getElementById('sticker-grid');
    const stickerAddBtn = document.getElementById('sticker-add-btn');
    const stickerImportModal = document.getElementById('sticker-import-modal');
    const stickerImportText = document.getElementById('sticker-import-text');
    const stickerImportCategory = document.getElementById('sticker-import-category');
    const panelHeight = 250;
    const baseHeight = 'calc(100% - 140px)';
    const openHeight = `calc(100% - 140px - ${panelHeight}px)`;
    const features = [
        { action: 'transfer', label: '转账', iconClass: 'bx bx-transfer' },
        { action: 'redpacket', label: '红包', iconClass: 'bx bx-envelope' },
        { action: 'voicecall', label: '语音通话', iconClass: 'bx bx-phone-call' },
        { action: 'videocall', label: '视频通话', iconClass: 'bx bx-video' },
        { action: 'album', label: '相册', iconClass: 'bx bx-image' },
        { action: 'camera', label: '拍照', iconClass: 'bx bx-camera' },
        { action: 'location', label: '位置', iconClass: 'bx bx-map' },
        { action: 'voice', label: '语音', iconClass: 'bx bx-microphone' },
        { action: 'reroll', label: '一键重Roll', iconClass: 'bx bx-refresh' },
        { action: 'offline_novel', label: '长叙事模式', iconClass: 'bx bx-book' },
        { action: 'link', label: '链接', iconClass: 'bx bx-link' },
        { action: 'phone', label: '他的手机', iconClass: 'bx bx-mobile' },
        { action: 'card', label: '抽卡', iconClass: 'bx bx-id-card' },
        { action: 'dice', label: '骰子', iconClass: 'bx bx-dice-1' }
    ];
    let currentStickerCategory = 'mine';
    function updateHistoryHeight(isOpen) {
        if (!historyBox) return;
        historyBox.style.height = isOpen ? openHeight : baseHeight;
        historyBox.scrollTop = historyBox.scrollHeight;
    }
    function renderMorePanel() {
        if (!pagesContainer || !dotsContainer) return;
        pagesContainer.innerHTML = '';
        dotsContainer.innerHTML = '';
        const pageSize = 8;
        const pageCount = Math.max(1, Math.ceil(features.length / pageSize));
        for (let p = 0; p < pageCount; p++) {
            const pageEl = document.createElement('div');
            pageEl.className = 'more-page';
            const grid = document.createElement('div');
            grid.className = 'more-grid';
            const start = p * pageSize;
            const slice = features.slice(start, start + pageSize);
            slice.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'more-item';
                itemEl.setAttribute('data-action', item.action);
                const iconHtml = item.iconClass ? `<i class="${item.iconClass}"></i>` : '';
                itemEl.innerHTML = `
                    <div class="more-icon">${iconHtml}</div>
                    <div class="more-text">${item.label}</div>
                `;
                grid.appendChild(itemEl);
            });
            pageEl.appendChild(grid);
            pagesContainer.appendChild(pageEl);
            const dot = document.createElement('span');
            dot.className = 'chat-more-dot' + (p === 0 ? ' active' : '');
            dot.dataset.index = p;
            dotsContainer.appendChild(dot);
        }
    }
    function renderStickers() {
        if (!stickerGrid) return;
        const data = window.stickerData || {};
        const list = data[currentStickerCategory] || [];
        stickerGrid.innerHTML = '';
        list.forEach(sticker => {
            if (!sticker) return;
            let url = '';
            if (typeof sticker === 'string') {
                url = sticker;
            } else {
                url = sticker.src || sticker.url || sticker.href || '';
            }
            if (!url) return;
            const item = document.createElement('div');
            item.className = 'sticker-item';
            item.dataset.url = url;
            item.innerHTML = `<img src="${url}">`;
            stickerGrid.appendChild(item);
        });
    }
    function setActiveStickerTab(type) {
        if (!stickerPanel) return;
        const tabs = stickerPanel.querySelectorAll('.sticker-tab');
        tabs.forEach(tab => {
            const tabType = tab.getAttribute('data-type');
            if (tabType === type) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        currentStickerCategory = type;
        renderStickers();
    }
    function openStickerPanel() {
        if (!stickerPanel) return;
        if (!window.stickerData) {
            window.stickerData = {
                mine: [],
                his: [],
                general: []
            };
        }
        if (!stickerPanel.classList.contains('show')) {
            setActiveStickerTab(currentStickerCategory || 'mine');
            stickerPanel.classList.add('show');
        }
    }
    function closeStickerPanel() {
        if (!stickerPanel) return;
        stickerPanel.classList.remove('show');
    }
    function sendSticker(url) {
        const roleId = window.currentChatRole;
        if (!roleId || !url) return;
        const now = Date.now();
        if (!window.chatData[roleId]) window.chatData[roleId] = [];
        const msg = { role: 'me', content: `[STICKER:${url}]`, type: 'sticker', timestamp: now, status: 'sent', stickerUrl: url };
        window.chatData[roleId].push(msg);
        appendMessageToDOM(msg);
        saveData();
        if (msgInput) {
            setTimeout(function () {
                msgInput.focus();
            }, 10);
        }
    }
    function updateDotsByScroll() {
        if (!pagesContainer || !dotsContainer) return;
        const width = pagesContainer.clientWidth;
        if (!width) return;
        const index = Math.round(pagesContainer.scrollLeft / width);
        const dots = dotsContainer.querySelectorAll('.chat-more-dot');
        dots.forEach((dot, i) => {
            if (i === index) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    function handleMoreAction(action) {
        if (!action) return;
        if (action === 'voicecall') {
            startVoiceCall();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            return;
        }
        if (action === 'videocall') {
            startVideoCall();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            return;
        }
        if (action === 'offline_novel') {
            try {
                if (panel) {
                    panel.classList.remove('show');
                    updateHistoryHeight(false);
                }
                closeStickerPanel();
            } catch (e) { }
            if (typeof window.openOfflineModeConfirm === 'function') {
                window.openOfflineModeConfirm();
            }
            return;
        }
        if (action === 'link') {
            alert('链接功能开发中...');
            return;
        }
        if (action === 'location') {
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            showLocationSelectSheet();
            return;
        }
        if (action === 'album') {
            const uploader = document.getElementById('chat-image-uploader');
            if (uploader) uploader.click();
            closeStickerPanel();
            return;
        }
        if (action === 'camera') {
            const roleId = window.currentChatRole;
            if (!roleId) return;
            const inputText = prompt('请输入照片内容的描述', '');
            if (inputText === null) return;
            const desc = inputText.trim();
            if (!desc) return;
            const now = Date.now();
            if (!window.chatData[roleId]) window.chatData[roleId] = [];
            const msg = {
                role: 'me',
                type: 'image',
                content: window.virtualPhotoImagePath,
                description: desc,
                timestamp: now,
                status: 'sent'
            };
            window.chatData[roleId].push(msg);
            appendMessageToDOM(msg);
            saveData();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            if (msgInput) {
                setTimeout(function () {
                    msgInput.focus();
                }, 10);
            }
            return;
        }
        if (action === 'transfer') {
            const roleId = window.currentChatRole;
            if (!roleId) return;
            
            // 🛑 新增：校验余额
            const walletData = window.Wallet ? window.Wallet.getData() : { totalAssets: 0 };
            const balance = walletData.totalAssets || 0;

            const amountInput = prompt(`请输入转账金额（当前余额：¥${balance.toFixed(2)}）`, '88.00');
            if (amountInput === null) return;
            const amountNum = parseFloat(amountInput.trim());
            if (isNaN(amountNum) || amountNum <= 0) {
                alert('请输入有效的转账金额');
                return;
            }

            if (amountNum > balance) {
                alert(`余额不足！你当前只有 ¥${balance.toFixed(2)}，无法发送 ¥${amountNum.toFixed(2)} 的转账。`);
                return;
            }

            const amount = amountNum.toFixed(2);
            const noteInput = prompt('请输入转账备注', '恭喜发财');
            if (noteInput === null) return;
            const note = noteInput.trim();
            const now = Date.now();

            // 🛑 新增：立即扣费
            if (window.Wallet && typeof window.Wallet.addTransaction === 'function') {
                const p = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
                const peerName = (p.remark || p.nickName || p.name || '对方').toString();
                window.Wallet.addTransaction('expense', `转账给${peerName}`, amount, 'transfer', { peerName, peerRoleId: roleId, kind: 'transfer' });
            }

            if (!window.chatData[roleId]) window.chatData[roleId] = [];
            const msg = { role: 'me', type: 'transfer', amount: amount, note: note, timestamp: now, status: 'sent' };
            window.chatData[roleId].push(msg);
            appendMessageToDOM(msg);
            saveData();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            if (msgInput) {
                setTimeout(function () {
                    msgInput.focus();
                }, 10);
            }
            return;
        }
        if (action === 'reroll') {
            const roleId = window.currentChatRole;
            if (!roleId) return;
            const list = window.chatData[roleId] || [];
            if (list.length === 0) {
                alert('当前没有可以重置的内容');
                return;
            }
            const last = list[list.length - 1];
            if (!last || last.role !== 'ai') {
                alert('无法重置，最后一条不是AI的回复');
                return;
            }

            // 1. 连续弹出末尾所有 AI 消息
            const removedTimestamps = [];
            while (list.length > 0) {
                const tail = list[list.length - 1];
                if (!tail || tail.role !== 'ai') break;
                const ts = tail.timestamp;
                removedTimestamps.push(ts);
                list.pop();
            }

            // 2. 删除 DOM 中对应的气泡（按时间戳匹配）
            const chatBody = document.getElementById('chat-history');
            if (chatBody && removedTimestamps.length > 0) {
                const rows = Array.from(chatBody.querySelectorAll('.msg-row[data-role="ai"]'));
                rows.forEach(row => {
                    const tsAttr = row.getAttribute('data-timestamp');
                    if (!tsAttr) return;
                    const ts = parseInt(tsAttr, 10);
                    if (removedTimestamps.indexOf(ts) !== -1) {
                        row.remove();
                    }
                });
            }

            saveData();

            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();

            // 3. 重新触发 AI 回复（标记为重摇请求）
            if (typeof window !== 'undefined') {
                window.__chatRerollRequested = true;
            }
            triggerAI();
            return;
        }
        if (action === 'voice') {
            const roleId = window.currentChatRole;
            if (!roleId) return;
            const textInput = prompt('请输入你想说的话（模拟语音内容）', '');
            if (textInput === null) return;
            const contentText = textInput.trim();
            if (!contentText) return;
            const now = Date.now();
            const duration = calcVoiceDurationSeconds(contentText);
            if (!window.chatData[roleId]) window.chatData[roleId] = [];
            const msg = { role: 'me', type: 'voice', content: contentText, duration: duration, timestamp: now, status: 'sent' };
            window.chatData[roleId].push(msg);
            appendMessageToDOM(msg);
            saveData();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            if (msgInput) {
                setTimeout(function () {
                    msgInput.focus();
                }, 10);
            }
            return;
        }
        if (action === 'redpacket') {
            const roleId = window.currentChatRole;
            if (!roleId) return;

            // 🛑 新增：校验余额
            const walletData = window.Wallet ? window.Wallet.getData() : { totalAssets: 0 };
            const balance = walletData.totalAssets || 0;

            const amountInput = prompt(`请输入红包金额（当前余额：¥${balance.toFixed(2)}）`, '88.00');
            if (amountInput === null) return;
            const amountNum = parseFloat(String(amountInput).trim());
            if (isNaN(amountNum) || amountNum <= 0) {
                alert('请输入有效的红包金额');
                return;
            }

            if (amountNum > balance) {
                alert(`余额不足！你当前只有 ¥${balance.toFixed(2)}，无法发送 ¥${amountNum.toFixed(2)} 的红包。`);
                return;
            }

            const amount = amountNum.toFixed(2);
            const noteInput = prompt('请输入红包祝福语', '恭喜发财，大吉大利');
            if (noteInput === null) return;
            let note = String(noteInput).trim();
            if (!note) {
                note = '恭喜发财，大吉大利';
            }
            const now = Date.now();

            // 🛑 新增：立即扣费
            if (window.Wallet && typeof window.Wallet.addTransaction === 'function') {
                const p = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
                const peerName = (p.remark || p.nickName || p.name || '对方').toString();
                window.Wallet.addTransaction('expense', `发红包给${peerName}`, amount, 'transfer', { peerName, peerRoleId: roleId, kind: 'redpacket' });
            }

            if (!window.chatData[roleId]) window.chatData[roleId] = [];
            const msg = {
                role: 'me',
                type: 'redpacket',
                amount: amount,
                note: note,
                timestamp: now,
                status: 'unopened'
            };
            window.chatData[roleId].push(msg);
            appendMessageToDOM(msg);
            saveData();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            if (msgInput) {
                setTimeout(() => {
                    msgInput.focus();
                }, 10);
            }
            return;
        }
        if (action === 'dice') {
            const roleId = window.currentChatRole;
            if (!roleId) return;
            const point = Math.floor(Math.random() * 6) + 1;
            const now = Date.now();
            if (!window.chatData[roleId]) window.chatData[roleId] = [];
            const msg = { role: 'me', type: 'dice', content: String(point), timestamp: now, status: 'sent' };
            window.chatData[roleId].push(msg);
            appendMessageToDOM(msg);
            saveData();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            if (msgInput) {
                setTimeout(function () {
                    msgInput.focus();
                }, 10);
            }
            return;
        }
    }
    renderMorePanel();
    const quickEmojiBtn = document.getElementById('quick-emoji-btn');
    if (quickEmojiBtn) {
        quickEmojiBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!stickerPanel) return;
            if (stickerPanel.classList.contains('show')) {
                closeStickerPanel();
            } else {
                openStickerPanel();
                if (panel && !panel.classList.contains('show')) {
                    panel.classList.add('show');
                    updateHistoryHeight(true);
                }
            }
        });
    }

    if (pagesContainer) {
        pagesContainer.addEventListener('scroll', function () {
            updateDotsByScroll();
        });
        pagesContainer.addEventListener('click', function (e) {
            const item = e.target.closest('.more-item');
            if (!item) return;
            const action = item.getAttribute('data-action');
            handleMoreAction(action);
        });
    }
    if (dotsContainer && pagesContainer) {
        dotsContainer.addEventListener('click', function (e) {
            const dot = e.target.closest('.chat-more-dot');
            if (!dot) return;
            const index = parseInt(dot.dataset.index || '0', 10);
            const width = pagesContainer.clientWidth;
            pagesContainer.scrollTo({ left: index * width, behavior: 'smooth' });
        });
    }
    if (moreBtn && panel) {
        moreBtn.addEventListener('click', function () {
            const showing = panel.classList.contains('show');
            if (showing) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
                closeStickerPanel();
            } else {
                panel.classList.add('show');
                updateHistoryHeight(true);
            }
        });
    }
    if (msgInput && panel) {
        msgInput.addEventListener('focus', function () {
            panel.classList.remove('show');
            updateHistoryHeight(false);
            closeStickerPanel();
        });
    }
    if (historyBox && panel) {
        historyBox.addEventListener('click', function () {
            panel.classList.remove('show');
            updateHistoryHeight(false);
            closeStickerPanel();
        });
    }
    const uploader = document.getElementById('chat-image-uploader');
    if (uploader) {
        try { uploader.multiple = true; } catch (e) { }
        uploader.addEventListener('change', async function () {
            const roleId = window.currentChatRole;
            const files = uploader.files ? Array.from(uploader.files) : [];
            if (!files.length) {
                uploader.value = '';
                return;
            }

            const input = document.getElementById('msg-input');
            const caption = input && input.value ? String(input.value).trim() : '';

            const images = [];
            for (let i = 0; i < files.length; i++) {
                const base64 = await compressImageFileToDataUrl(files[i], 1024);
                if (!base64) continue;
                images.push(base64);
                const now = Date.now();
                if (!window.chatData[roleId]) window.chatData[roleId] = [];
                const msg = { role: 'me', content: base64, type: 'image', timestamp: now, status: 'sent' };
                window.chatData[roleId].push(msg);
                appendMessageToDOM(msg);
            }

            if (images.length) saveData();
            if (input) setTimeout(() => { input.focus(); }, 10);
            uploader.value = '';
            const panel = document.getElementById('chat-more-panel');
            if (panel) panel.classList.remove('show');
            updateHistoryHeight(false);
        });
    }
    if (stickerPanel && stickerGrid) {
        stickerGrid.addEventListener('click', function (e) {
            const item = e.target.closest('.sticker-item');
            if (!item) return;
            const url = item.dataset.url;
            if (!url) return;
            sendSticker(url);
        });
    }
    if (stickerPanel) {
        const tabs = stickerPanel.querySelectorAll('.sticker-tab');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                const type = tab.getAttribute('data-type');
                if (!type) return;
                setActiveStickerTab(type);
            });
        });
    }
    if (stickerAddBtn) {
        stickerAddBtn.addEventListener('click', function () {
            if (!stickerImportModal || !stickerImportText || !stickerImportCategory) return;
            stickerImportText.value = '';
            const key = currentStickerCategory || 'mine';
            if (key === 'mine' || key === 'his' || key === 'general') {
                stickerImportCategory.value = key;
            } else {
                stickerImportCategory.value = 'mine';
            }
            stickerImportModal.style.display = 'flex';
        });
    }
});

function closeStickerImportModal() {
    const modal = document.getElementById('sticker-import-modal');
    if (!modal) return;
    modal.style.display = 'none';
}

function confirmStickerImport() {
    const modal = document.getElementById('sticker-import-modal');
    const textarea = document.getElementById('sticker-import-text');
    const select = document.getElementById('sticker-import-category');
    if (!modal || !textarea || !select) return;
    const raw = textarea.value || '';
    const lines = raw.split('\n');
    const key = select.value || 'mine';
    if (!window.stickerData) {
        window.stickerData = {
            mine: [],
            his: [],
            general: []
        };
    }
    if (!Array.isArray(window.stickerData[key])) {
        window.stickerData[key] = [];
    }
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const idx = line.indexOf(':');
        if (idx === -1) continue;
        const namePart = line.slice(0, idx).trim();
        let urlPart = line.slice(idx + 1).trim();
        if (!namePart || !urlPart) continue;
        if (urlPart.length >= 2 && urlPart.startsWith('`') && urlPart.endsWith('`')) {
            urlPart = urlPart.slice(1, urlPart.length - 1).trim();
        }
        if (!urlPart) continue;
        window.stickerData[key].push({
            name: namePart,
            src: urlPart
        });
    }
    try {
        localStorage.setItem('stickerData', JSON.stringify(window.stickerData));
    } catch (e) { }
    modal.style.display = 'none';
}

function formatCallDuration(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(r).padStart(2, '0');
    return mm + ':' + ss;
}

function syncCallChatMessages() {
    const container = document.getElementById('call-chat-container');
    const videoContainer = document.getElementById('video-subtitle-container');
    if (!container && !videoContainer) return;
    const list = Array.isArray(window.voiceCallHistory) ? window.voiceCallHistory : [];
    function render(target) {
        target.innerHTML = '';
        for (let i = 0; i < list.length; i++) {
            const msg = list[i];
            if (!msg || !msg.content) continue;
            const row = document.createElement('div');
            row.className = msg.role === 'me' ? 'call-chat-row call-chat-row-me' : 'call-chat-row call-chat-row-ai';
            const bubble = document.createElement('div');
            bubble.className = 'call-chat-bubble';
            bubble.innerText = msg.content;
            row.appendChild(bubble);
            target.appendChild(row);
        }
        target.scrollTop = target.scrollHeight;
        const wrapper = target.parentElement;
        if (wrapper && wrapper.scrollHeight > wrapper.clientHeight) {
            wrapper.scrollTop = wrapper.scrollHeight;
        }
    }
    if (container) {
        render(container);
    }
    if (videoContainer) {
        render(videoContainer);
    }
}

function buildVoiceCallHandshakePrompt(roleId, isVideo) {
    const profile = window.charProfiles[roleId] || {};
    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    const modeText = isVideo ? '视频通话' : '语音通话';
    systemPrompt += `\n\n【${modeText}握手协议】\n` +
        `你现在收到的是一次“${modeText}邀请”，这是独立于普通文字聊天的一次通话。\n` +
        `1. 你需要根据当前时间（是否很晚）、你的人设（是否高冷/忙碌/黏人等）和你对用户当前的好感度、关系亲疏，决定是否接听。\n` +
        `2. 如果不方便或不想接，必须拒绝。\n` +
        `3. 输出格式必须严格遵守：\n` +
        `   - 如果拒绝：只输出一行，例如：[[REJECT]] 太晚了，我要睡了。\n` +
        `   - 如果接听：只输出一行，格式为：[[ACCEPT]] (场景音或语气描写) 开场白内容。\n` +
        `4. 禁止输出任何思考过程、markdown 列表、分隔线或 <thinking> 标签，只能输出上述格式的一行中文。`;

    return systemPrompt;
}

function buildVoiceCallTalkPrompt(roleId, isVideo) {
    const profile = window.charProfiles[roleId] || {};
    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【语音通话对话模式】\n` +
        `你现在处于“语音通话中”模式。\n` +
        `- 用户每条消息在内部都会自动加上前缀：[语音通话中]，你要把它理解为正在语音聊天而不是纯打字。\n` +
        `- 你的每一句回复必须强制使用下面的格式：\n` +
        `  (动作或场景音、语气描写) 实际回复内容\n` +
        `  括号里的内容必须是第一人称视角的“动作/神态/声音/视线”描写，可以结合你此刻的姿势、表情、说话方式、环境声等，让对话更有画面感。\n` +
        `  至少用 5~25 个字，避免只写一个词。\n` +
        `  示例：(抬手按了按眉心，声音有点低) 今天有点累，不过还是想听你说。\n` +
        `       (盯着屏幕笑了一下，镜头轻轻晃了晃) 在，听着呢。\n` +
        `- 如果用户表示要挂断、说再见或说明要去做别的事，你需要理解为对方准备结束通话，用一两句自然的话响应并帮忙收尾，不要再主动开启新的话题。\n` +
        `- 禁止输出任何 markdown、列表、<thinking> 标签或多余说明，只能输出一行这样的格式。`;

    if (isVideo) {
        systemPrompt += `\n\n【视频通话额外规则】\n` +
            `当前是视频通话，你可以看到用户的画面，你自己的背景来自你相册里的生活照。\n` +
            `- 当用户消息同时附带一张当前画面作为视觉输入时，请像“真的看着对方”一样，根据画面中能看到的姿势、表情、光线、环境，把这些信息自然地融入括号里的动作/视线描写中。\n` +
            `- 不能胡编乱造画面中不存在的细节（例如看不到的房间另一侧、手机上的具体内容等），只能基于画面进行合理推断。\n` +
            `- 如果画面模糊或你无法确定细节，可以使用更含糊但自然的描述，比如“看起来有点累”、“大概是在室内”等。`;
    }

    return systemPrompt;
}

function startVoiceCall(isVideo) {
    const roleId = window.currentChatRole;
    if (!roleId) return;
    const overlay = document.getElementById('voice-call-overlay');
    const floatWindow = document.getElementById('call-float-window');
    const avatarEl = document.getElementById('voice-call-avatar');
    const statusEl = document.getElementById('voice-call-status');
    const inputEl = document.getElementById('voice-call-input');
    const inputRow = document.getElementById('voice-call-input-row');
    if (!overlay || !statusEl) return;
    if (floatWindow) {
        floatWindow.style.display = 'none';
    }
    overlay.style.display = 'flex';
    const profile = window.charProfiles[roleId] || {};
    if (avatarEl) {
        avatarEl.src = profile.avatar || 'assets/chushitouxiang.jpg';
    }
    const state = window.voiceCallState || {};
    if (state.timerId) {
        clearInterval(state.timerId);
    }
    if (state.connectTimeoutId) {
        clearTimeout(state.connectTimeoutId);
    }
    if (state.chatSyncIntervalId) {
        clearInterval(state.chatSyncIntervalId);
    }
    const isVideoCall = !!isVideo;
    state.active = true;
    state.connected = false;
    state.seconds = 0;
    state.roleId = roleId;
    state.timerId = null;
    state.chatSyncIntervalId = null;
    state.connectTimeoutId = null;
    state.isVideo = isVideoCall;
    state.userCameraStream = null;
    state.userCameraOn = false;
    state.facingMode = 'user';
    window.voiceCallState = state;
    window.isVoiceCallActive = false;
    window.voiceCallHistory = [];
    if (inputRow) {
        inputRow.style.display = 'none';
    }
    if (inputEl) {
        inputEl.value = '';
    }
    syncCallChatMessages();
    statusEl.innerText = '等待对方接受邀请...';

    if (typeof window.callAI !== 'function') {
        return;
    }

    const systemPrompt = buildVoiceCallHandshakePrompt(roleId, isVideoCall);
    const now = new Date();
    const timeText = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const callTypeText = isVideoCall ? '视频通话' : '语音通话';
    const userText = `[系统通知：用户发起了${callTypeText}邀请，当前时间是 ${timeText}。请根据你的人设、作息表和当前好感度决定是否接听。]`;

    window.callAI(
        systemPrompt,
        [],
        userText,
        function (aiResponseText) {
            const currentState = window.voiceCallState || {};
            if (!currentState.active) return;
            let text = (aiResponseText || '').trim();
            if (!text) {
                statusEl.innerText = '对方无响应';
                setTimeout(function () {
                    endVoiceCall();
                }, 2000);
                return;
            }
            text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
            text = text.replace(/\|+/g, '').trim();
            const rejectIndex = text.indexOf('[[REJECT]]');
            const acceptIndex = text.indexOf('[[ACCEPT]]');

            if (rejectIndex !== -1 && (acceptIndex === -1 || rejectIndex <= acceptIndex)) {
                let reason = text.slice(rejectIndex + '[[REJECT]]'.length).trim();
                if (!reason) {
                    reason = '太晚了，我现在不方便接语音。';
                }
                statusEl.innerText = '对方已拒绝';

                if (!Array.isArray(window.voiceCallHistory)) {
                    window.voiceCallHistory = [];
                }
                window.voiceCallHistory.push({
                    role: 'ai',
                    content: reason
                });
                syncCallChatMessages();

                const ts = Date.now();
                if (!window.chatData[roleId]) window.chatData[roleId] = [];
                const msg = {
                    role: 'ai',
                    content: reason,
                    type: 'text',
                    timestamp: ts,
                    status: 'sent'
                };
                window.chatData[roleId].push(msg);
                appendMessageToDOM(msg);
                saveData();

                window.isVoiceCallActive = false;
                setTimeout(function () {
                    endVoiceCall();
                }, 2000);
                return;
            }

            if (acceptIndex !== -1) {
                let content = text.slice(acceptIndex + '[[ACCEPT]]'.length).trim();
                if (!content) {
                    content = '(声音里带着一点笑意) 嗯，我接通啦。';
                }
                currentState.connected = true;
                currentState.connectedAt = Date.now();
                currentState.seconds = 0;
                window.voiceCallState = currentState;
                window.isVoiceCallActive = true;
                statusEl.innerText = '00:00';
                if (currentState.timerId) {
                    clearInterval(currentState.timerId);
                }
                currentState.timerId = setInterval(function () {
                    const s = (window.voiceCallState && window.voiceCallState.seconds) || 0;
                    const next = s + 1;
                    window.voiceCallState.seconds = next;
                    statusEl.innerText = formatCallDuration(next);
                }, 1000);

                if (!Array.isArray(window.voiceCallHistory)) {
                    window.voiceCallHistory = [];
                }
                window.voiceCallHistory.push({
                    role: 'ai',
                    content: content
                });
                syncCallChatMessages();
                if (currentState.isVideo) {
                    overlay.style.display = 'none';
                    if (floatWindow) {
                        floatWindow.style.display = 'none';
                    }
                    startActiveVideoSession(roleId);
                }
                return;
            }

            statusEl.innerText = '对方无效回复';
            window.isVoiceCallActive = false;
            setTimeout(function () {
                endVoiceCall();
            }, 2000);
        },
        function () {
            statusEl.innerText = '通话请求失败';
            window.isVoiceCallActive = false;
            setTimeout(function () {
                endVoiceCall();
            }, 2000);
        }
    );
}

function startVideoCall() {
    startVoiceCall(true);
}

function endVoiceCall() {
    const overlay = document.getElementById('voice-call-overlay');
    const floatWindow = document.getElementById('call-float-window');
    const statusEl = document.getElementById('voice-call-status');
    const chatContainer = document.getElementById('call-chat-container');
    const state = window.voiceCallState || {};
    const userHangup = !!state.userHangup;
    const isVideoCall = !!state.isVideo;
    if (state.userCameraStream) {
        try {
            state.userCameraStream.getTracks().forEach(function (track) { track.stop(); });
        } catch (e) { }
        state.userCameraStream = null;
    }
    state.userCameraOn = false;
    const hadConnected = !!state.connected;
    const durationSec = state.seconds || 0;
    const roleId = state.roleId || window.currentChatRole;
    let callTranscriptText = '';
    try {
        if (Array.isArray(window.voiceCallHistory) && window.voiceCallHistory.length > 0) {
            const userName = (window.userPersonas && window.userPersonas[roleId] && window.userPersonas[roleId].name) ? window.userPersonas[roleId].name : '我';
            const charProfile = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
            const charName = charProfile.nickName || '对方';
            const lines = [];
            for (let i = 0; i < window.voiceCallHistory.length; i++) {
                const item = window.voiceCallHistory[i];
                if (!item || !item.content) continue;
                const prefix = item.role === 'me' ? (userName + ': ') : (charName + ': ');
                lines.push(prefix + item.content);
            }
            callTranscriptText = lines.join('\n');
        }
    } catch (e) { }
    if (hadConnected && durationSec > 0 && roleId) {
        if (!window.chatData[roleId]) window.chatData[roleId] = [];
        const ts = Date.now();
        const durationText = formatCallDuration(durationSec);
        const content = (isVideoCall ? '视频通话已结束 ' : '语音通话已结束 ') + durationText;
        const msg = {
            role: 'me',
            content: content,
            type: 'call_end',
            timestamp: ts,
            status: 'sent'
        };
        window.chatData[roleId].push(msg);
        appendMessageToDOM(msg);

        if (Array.isArray(window.voiceCallHistory) && window.voiceCallHistory.length > 0) {
            const userName = (window.userPersonas[roleId] && window.userPersonas[roleId].name) || '我';
            const charProfile = window.charProfiles[roleId] || {};
            const charName = charProfile.nickName || '对方';
            const lines = [];
            for (let i = 0; i < window.voiceCallHistory.length; i++) {
                const item = window.voiceCallHistory[i];
                if (!item || !item.content) continue;
                const prefix = item.role === 'me' ? (userName + ': ') : (charName + ': ');
                lines.push(prefix + item.content);
            }
            const summaryText = lines.join('\n');

            if (!window.callLogs) window.callLogs = {};
            if (!Array.isArray(window.callLogs[roleId])) window.callLogs[roleId] = [];
            window.callLogs[roleId].push({
                type: isVideoCall ? 'video' : 'voice',
                date: ts,
                duration: durationSec,
                content: summaryText
            });

            const startTs = normalizeTs(state.connectedAt) || (ts - durationSec * 1000);
            const kind = isVideoCall ? 'video_call' : 'voice_call';
            const redactionKey = { kind: kind, startTs: startTs, endTs: ts };
            appendRoleApiRedaction(roleId, {
                kind: kind,
                startTs: startTs,
                endTs: ts,
                summaryText: '',
                types: ['call_end', 'call_memory']
            });

            if (typeof window.callAIShortSummary === 'function') {
                try {
                    window.callAIShortSummary(
                        { kindLabel: isVideoCall ? '视频通话' : '语音通话', segmentText: summaryText },
                        function (resultText) {
                            const cleaned = String(resultText || '').replace(/\s+/g, ' ').trim();
                            const clipped = cleaned.length > 120 ? cleaned.slice(0, 120) : cleaned;
                            updateRoleApiRedactionSummary(roleId, redactionKey, clipped);
                        },
                        function () { }
                    );
                } catch (e) { }
            }
        }

        saveData();
    }
    if (state.timerId) {
        clearInterval(state.timerId);
    }
    if (state.connectTimeoutId) {
        clearTimeout(state.connectTimeoutId);
    }
    if (state.chatSyncIntervalId) {
        clearInterval(state.chatSyncIntervalId);
    }
    state.active = false;
    state.connected = false;
    state.seconds = 0;
    state.roleId = '';
    state.timerId = null;
    state.connectTimeoutId = null;
    state.chatSyncIntervalId = null;
    window.voiceCallState = state;
    window.isVoiceCallActive = false;
    window.voiceCallHistory = [];
    if (overlay) {
        overlay.style.display = 'none';
    }
    if (floatWindow) {
        floatWindow.style.display = 'none';
    }
    if (statusEl) {
        statusEl.innerText = '等待对方接受邀请...';
    }
    if (chatContainer) {
        chatContainer.innerHTML = '';
    }
    const videoLayer = document.getElementById('video-session-layer');
    if (videoLayer) {
        videoLayer.remove();
    }
    try {
        state.userHangup = false;
        window.voiceCallState = state;
    } catch (e) { }
    if (hadConnected && userHangup && roleId) {
        triggerCallHangupReaction(roleId, { isVideo: isVideoCall, durationSec: durationSec, transcript: callTranscriptText });
    }
}

async function triggerCallHangupReaction(roleId, info) {
    const id = String(roleId || '').trim();
    if (!id) return;
    if (typeof window.callAI !== 'function') return;
    await initData();

    const profile = window.charProfiles && window.charProfiles[id] ? window.charProfiles[id] : {};
    const roleNameForAI = profile.nickName || id || 'TA';
    let systemPrompt = `【角色名称】${roleNameForAI}\n` + (profile.desc || "你是一个友好的AI助手");
    const roleRemarkForUser = typeof profile.remark === 'string' ? profile.remark.trim() : '';
    if (roleRemarkForUser) {
        systemPrompt += `\n\n【用户给你的备注】${roleRemarkForUser}\n注意：这是用户侧的显示名，不等同于你的角色名称。你可以对这个备注做出自然反应。`;
    }
    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }
    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }
    const userPersona = window.userPersonas && window.userPersonas[id] ? window.userPersonas[id] : {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) systemPrompt += `用户名字：${userPersona.name}\n`;
        if (userPersona.gender) systemPrompt += `用户性别：${userPersona.gender}\n`;
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) systemPrompt += `用户背景：${userPersona.setting}\n`;
    }

    if (!window.memoryArchiveStore) {
        try {
            const raw = localStorage.getItem('wechat_memory_archive_v1');
            if (raw) window.memoryArchiveStore = JSON.parse(raw);
        } catch (e) { }
    }
    if (window.memoryArchiveStore && window.memoryArchiveStore[id]) {
        const archive = window.memoryArchiveStore[id];
        const filterExample = (txt) => {
            if (!txt) return "";
            const lines = String(txt)
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .filter(line => !line.includes("（示例）") && !line.includes("开启“自动总结”后"));
            return lines.join('\n');
        };
        const likes = filterExample(archive.likesText);
        const habits = filterExample(archive.habitsText);
        const events = filterExample(archive.eventsText);
        if (likes || habits || events) {
            let memText = `\n\n【🧠 核心记忆档案 (Long-term Memory)】\n`;
            memText += `以下是系统自动总结的关于用户的长期记忆，请在对话中自然地体现你知道这些事，不用刻意复述，但要保持记忆连贯性。\n`;
            if (likes) memText += `\n[TA的喜好/厌恶]:\n${likes}`;
            if (habits) memText += `\n[TA的行为习惯]:\n${habits}`;
            if (events) memText += `\n[近期聊天记忆/关系进展]:\n${events}`;
            systemPrompt += memText;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    const history = window.chatData && window.chatData[id] ? window.chatData[id] : [];
    const fullHistory = history.map(msg => ensureMessageContent({ ...msg }));
    const cleanHistory = fullHistory.filter(function (msg) {
        if (!msg) return false;
        if (msg.type === 'call_memory') return msg.includeInAI === true;
        if (msg.type === 'system_event') return msg.includeInAI === true;
        return !!msg.content;
    });
    const lastAiIndex = (function () {
        for (let i = cleanHistory.length - 1; i >= 0; i--) {
            if (cleanHistory[i] && cleanHistory[i].role === 'ai') return i;
        }
        return -1;
    })();
    const baseHistoryForApi = lastAiIndex >= 0 ? cleanHistory.slice(0, lastAiIndex + 1) : [];
    const historyForApi = typeof buildApiMemoryHistory === 'function' ? buildApiMemoryHistory(id, baseHistoryForApi) : baseHistoryForApi;

    const infoObj = info && typeof info === 'object' ? info : {};
    const isVideo = !!infoObj.isVideo;
    const transcript = typeof infoObj.transcript === 'string' ? infoObj.transcript.trim() : '';
    const status = window.roleStatusStore && window.roleStatusStore[id] ? window.roleStatusStore[id] : null;
    const favor = status && status.favorability != null ? String(status.favorability) : '';
    const clippedTranscript = transcript.length > 1200 ? transcript.slice(0, 1200) + '…' : transcript;
    const callLabel = isVideo ? '视频通话' : '语音通话';
    const transcriptBlock = clippedTranscript ? `\n\n【刚才通话内容摘录】\n${clippedTranscript}` : '';
    const favorBlock = favor ? `当前好感度：${favor}/100。` : '';

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    const userMessage = `[系统通知：用户突然挂断了电话（${callLabel}）。请根据你的人设（暴躁、委屈、傲娇等）、${favorBlock}以及你们刚才聊到的内容，立刻发一条微信文字消息回应用户的挂断行为。]${transcriptBlock}`;
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, userMessage, id, headerTitle, oldTitle);
}

function showIncomingLocationShareUI(roleId) {
    const old = document.getElementById('incoming-location-layer');
    if (old) {
        old.remove();
    }

    const profile = window.charProfiles[roleId] || {};
    const avatarUrl = profile.avatar || 'assets/chushitouxiang.jpg';
    const name = profile.nickName || '未知角色';

    const layer = document.createElement('div');
    layer.id = 'incoming-location-layer';
    layer.style.cssText = [
        'position: fixed',
        'top: 0',
        'left: 0',
        'width: 100%',
        'height: 100%',
        'background: rgba(0,0,0,0.9)',
        'z-index: 9999',
        'display: flex',
        'flex-direction: column',
        'align-items: center',
        'justify-content: space-between',
        'padding: 60px 0',
        'color: #fff',
        'backdrop-filter: blur(10px)'
    ].join(';') + ';';

    const topHtml = [
        '<div style="display:flex; flex-direction:column; align-items:center; margin-top:40px;">',
        '<img src="',
        avatarUrl,
        '" style="width:100px; height:100px; border-radius:10px; box-shadow:0 4px 15px rgba(0,0,0,0.3); margin-bottom:20px;">',
        '<div style="font-size:24px; font-weight:bold; margin-bottom:10px;">',
        name,
        '</div>',
        '<div style="font-size:14px; color:rgba(255,255,255,0.7);">正在向你发起实时位置共享...</div>',
        '</div>'
    ].join('');

    const bottomHtml = [
        '<div style="width:80%; display:flex; justify-content:space-between; margin-bottom:60px;">',
        '<div id="btn-reject-location" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">',
        '<div style="width:64px; height:64px; background:#ff3b30; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">',
        "<i class='bx bxs-x-circle' style=\"font-size:32px;\"></i>",
        '</div>',
        '<span style="font-size:12px;">拒绝</span>',
        '</div>',
        '<div id="btn-accept-location" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">',
        '<div style="width:64px; height:64px; background:#30d158; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">',
        "<i class='bx bx-map-pin' style=\"font-size:32px;\"></i>",
        '</div>',
        '<span style="font-size:12px;">接受</span>',
        '</div>',
        '</div>'
    ].join('');

    layer.innerHTML = topHtml + bottomHtml;
    document.body.appendChild(layer);

    const rejectBtn = document.getElementById('btn-reject-location');
    const acceptBtn = document.getElementById('btn-accept-location');

    if (rejectBtn) {
        rejectBtn.addEventListener('click', function () {
            layer.remove();
            const rid = roleId || window.currentChatRole;
            if (!rid) return;
            const now = Date.now();
            if (!window.chatData[rid]) window.chatData[rid] = [];
            const msg = {
                role: 'ai',
                type: 'text',
                content: '📍 [未接位置共享邀请]',
                timestamp: now
            };
            window.chatData[rid].push(msg);
            appendMessageToDOM(msg);
            saveData();

            // 触发AI对未接位置共享邀请的反应
            const profile = window.charProfiles[rid] || {};
            let systemPrompt = profile.desc || "你是一个友好的AI助手";

            if (profile.schedule && profile.schedule.trim()) {
                systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
            }
            if (profile.style && profile.style.trim()) {
                systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
            }
            const userPersona = window.userPersonas[rid] || {};
            if (userPersona.name || userPersona.setting || userPersona.gender || userPersona.birthday) {
                systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
                if (userPersona.name) {
                    systemPrompt += `用户名字：${userPersona.name}\n`;
                }
                if (userPersona.setting) {
                    systemPrompt += `用户背景：${userPersona.setting}\n`;
                }
                if (userPersona.gender) {
                    systemPrompt += `用户性别：${userPersona.gender}\n`;
                }
                if (userPersona.birthday) {
                    systemPrompt += `用户生日：${userPersona.birthday}\n`;
                }
            }

            const history = window.chatData[rid] || [];
            const cleanHistory = history.map(msg => ensureMessageContent({ ...msg })).filter(m => m.content);

            const headerTitle = document.getElementById('current-chat-name');
            const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
            if (headerTitle) {
                headerTitle.innerText = "对方正在输入...";
            }

            const userMessage = `[系统通知：你发起了实时位置共享邀请，但对方没有接受，显示为未接位置共享邀请。请根据你的人设，表现出委屈、失落或关心的反应，询问用户为什么没有接受位置共享邀请，语气要符合你的性格特点，表现出更多让人有好感的情绪，不要过于生气或愤怒。]`;
            invokeAIWithCommonHandlers(systemPrompt, cleanHistory, userMessage, rid, headerTitle, oldTitle);
        });
    }

    if (acceptBtn) {
        acceptBtn.addEventListener('click', function () {
            layer.remove();
            acceptIncomingLocationShare(roleId);
        });
    }
}

async function acceptIncomingLocationShare(roleId) {
    const rid = roleId || window.currentChatRole;
    if (!rid) return;

    await initData();

    const data = window.chatMapData && window.chatMapData[rid];
    if (!(data && data.isCreated === true)) {
        alert('对方想和你进行实时位置共享，但你还没有为 Ta 设置地图地点。\n\n请先进入地图创建界面，完成地点配置后再尝试。');
        openMapCreatorModal(rid);
        return;
    }

    if (!window.chatData[rid]) window.chatData[rid] = [];
    const ts = Date.now();
    const msg = {
        role: 'me',
        type: 'text',
        content: '✅ 我接受了你的实时位置共享邀请。',
        timestamp: ts,
        status: 'sent'
    };
    window.chatData[rid].push(msg);
    appendMessageToDOM(msg);
    saveData();

    startLocationShare(rid);
}

function createVideoSessionUI() {
    const old = document.getElementById('video-session-layer');
    if (old) old.remove();
    const layer = document.createElement('div');
    layer.id = 'video-session-layer';
    layer.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:#000; z-index:12000; overflow:hidden;';
    const bgBox = document.createElement('div');
    bgBox.className = 'video-session-bg';
    bgBox.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; overflow:hidden;';
    const bgImg = document.createElement('img');
    bgImg.id = 'video-session-bg-img';
    bgImg.style.cssText = 'width:100%; height:100%; object-fit:cover; transform:scale(1.05);';
    bgBox.appendChild(bgImg);
    layer.appendChild(bgBox);
    const userBox = document.createElement('div');
    userBox.id = 'video-session-user-box';
    userBox.style.cssText = 'position:absolute; top:20px; right:16px; width:26%; max-width:120px; aspect-ratio:9/16; background:#333; border-radius:8px; overflow:hidden; box-shadow:0 0 8px rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center;';
    const userAvatar = document.createElement('img');
    userAvatar.id = 'video-session-user-avatar';
    userAvatar.style.cssText = 'width:100%; height:100%; object-fit:cover; display:none;';
    const userVideo = document.createElement('video');
    userVideo.id = 'video-session-user-video';
    userVideo.autoplay = true;
    userVideo.muted = true;
    userVideo.playsInline = true;
    userVideo.style.cssText = 'width:100%; height:100%; object-fit:cover; background:#000; display:none;';
    userBox.appendChild(userAvatar);
    userBox.appendChild(userVideo);
    layer.appendChild(userBox);
    const subtitleBox = document.createElement('div');
    subtitleBox.id = 'video-subtitle-container';
    subtitleBox.className = 'call-chat-container';
    subtitleBox.style.cssText = 'position:absolute; left:0; bottom:100px; width:100%; max-height:40%; padding:10px 14px; box-sizing:border-box; overflow-y:auto;';
    layer.appendChild(subtitleBox);
    const inputRow = document.createElement('div');
    inputRow.id = 'video-call-input-row';
    inputRow.style.cssText = 'position:absolute; left:0; bottom:80px; width:100%; padding:0 16px; box-sizing:border-box; display:none;';
    const inputEl = document.createElement('input');
    inputEl.id = 'video-call-input';
    inputEl.className = 'voice-call-input';
    inputEl.type = 'text';
    inputEl.placeholder = '在通话中发消息...';
    const sendBtn = document.createElement('button');
    sendBtn.id = 'video-call-send';
    sendBtn.className = 'voice-call-send-btn';
    sendBtn.innerHTML = "<i class='bx bx-refresh'></i>";
    sendBtn.title = '一键重Roll';
    inputRow.appendChild(inputEl);
    inputRow.appendChild(sendBtn);
    layer.appendChild(inputRow);
    const controls = document.createElement('div');
    controls.id = 'video-session-controls';
    controls.style.cssText = 'position:absolute; left:0; bottom:20px; width:100%; display:flex; align-items:center; justify-content:center; gap:24px;';
    const micBtn = document.createElement('button');
    micBtn.id = 'video-call-mic-btn';
    micBtn.className = 'call-btn call-btn-small';
    micBtn.innerHTML = "<i class='bx bx-microphone'></i>";
    const hangupBtn = document.createElement('button');
    hangupBtn.id = 'video-call-hangup-btn';
    hangupBtn.className = 'call-btn call-btn-hangup';
    hangupBtn.innerHTML = "<i class='bx bx-phone-off'></i>";
    const cameraBtn = document.createElement('button');
    cameraBtn.id = 'video-call-camera-btn';
    cameraBtn.className = 'call-btn call-btn-small';
    cameraBtn.innerHTML = "<i class='bx bx-video'></i>";
    controls.appendChild(micBtn);
    controls.appendChild(hangupBtn);
    controls.appendChild(cameraBtn);
    const switchBtn = document.createElement('button');
    switchBtn.id = 'video-call-switch-camera-btn';
    switchBtn.className = 'call-btn call-btn-small';
    switchBtn.innerHTML = "<i class='bx bx-revision'></i>";
    controls.appendChild(switchBtn);
    layer.appendChild(controls);
    document.body.appendChild(layer);
}

function startActiveVideoSession(roleId) {
    const profile = window.charProfiles[roleId] || {};
    const album = Array.isArray(profile.videoAlbum) ? profile.videoAlbum : [];
    let bg = '';
    if (album.length > 0) {
        const index = Math.floor(Math.random() * album.length);
        bg = album[index];
    } else {
        bg = profile.avatar || 'assets/chushitouxiang.jpg';
    }
    createVideoSessionUI();
    const bgImg = document.getElementById('video-session-bg-img');
    if (bgImg && bg) {
        bgImg.src = bg;
        if (album.length === 0) {
            bgImg.style.filter = 'blur(10px)';
            bgImg.style.transform = 'scale(1.1)';
        } else {
            bgImg.style.filter = 'blur(5px)';
            bgImg.style.transform = 'scale(1.05)';
        }
    }
    const userAvatarEl = document.getElementById('video-session-user-avatar');
    const userVideoEl = document.getElementById('video-session-user-video');
    const userBox = document.getElementById('video-session-user-box');
    const personas = window.userPersonas || {};
    const persona = personas[roleId] || {};
    const userAvatarUrl = persona.avatar || 'assets/chushitouxiang.jpg';
    if (userAvatarEl) {
        userAvatarEl.src = userAvatarUrl;
        userAvatarEl.style.display = 'block';
    }
    if (userVideoEl) {
        userVideoEl.style.display = 'none';
    }
    if (userBox) {
        userBox.style.background = '#333';
    }
    syncCallChatMessages();
    const hangupBtn = document.getElementById('video-call-hangup-btn');
    const micBtn = document.getElementById('video-call-mic-btn');
    const cameraBtn = document.getElementById('video-call-camera-btn');
    const switchBtn = document.getElementById('video-call-switch-camera-btn');
    const inputRow = document.getElementById('video-call-input-row');
    const inputEl = document.getElementById('video-call-input');
    const sendBtn = document.getElementById('video-call-send');
    if (hangupBtn) {
        hangupBtn.onclick = function () {
            try {
                const s = window.voiceCallState || {};
                s.userHangup = true;
                window.voiceCallState = s;
            } catch (e) { }
            endVideoSession();
        };
    }
    if (micBtn && inputRow) {
        micBtn.onclick = function () {
            micBtn.classList.toggle('off');
            if (inputRow.style.display === 'none' || !inputRow.style.display) {
                inputRow.style.display = 'flex';
                if (inputEl) {
                    setTimeout(function () {
                        inputEl.focus();
                    }, 10);
                }
            } else {
                inputRow.style.display = 'none';
            }
        };
    }
    if (cameraBtn) {
        cameraBtn.onclick = function () {
            toggleUserCamera();
            cameraBtn.classList.toggle('off');
        };
    }
    if (switchBtn) {
        switchBtn.onclick = function () {
            switchCameraFacingMode();
        };
    }
    if (inputEl) {
        const send = function () {
            const raw = inputEl.value.trim();
            if (!raw) return;
            inputEl.value = '';
            sendTextInVoiceCall(raw);
        };
        inputEl.onkeydown = function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                send();
            }
        };
        if (sendBtn) {
            sendBtn.onclick = function (e) {
                e.preventDefault();
                rerollVoiceCallReply();
            };
        }
    }
}

function toggleUserCamera() {
    const videoEl = document.getElementById('video-session-user-video');
    const avatarEl = document.getElementById('video-session-user-avatar');
    const userBox = document.getElementById('video-session-user-box');
    if (!videoEl || !avatarEl || !userBox) return;
    const state = window.voiceCallState || {};
    if (state.userCameraOn && state.userCameraStream) {
        try {
            state.userCameraStream.getTracks().forEach(function (track) { track.stop(); });
        } catch (e) { }
        state.userCameraStream = null;
        state.userCameraOn = false;
        videoEl.srcObject = null;
        videoEl.style.display = 'none';
        avatarEl.style.display = 'block';
        userBox.style.background = '#333';
        window.voiceCallState = state;
        return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return;
    }
    const facing = state.facingMode || 'user';
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } }).then(function (stream) {
        const s = window.voiceCallState || {};
        s.userCameraStream = stream;
        s.userCameraOn = true;
        s.facingMode = facing;
        window.voiceCallState = s;
        videoEl.srcObject = stream;
        videoEl.style.display = 'block';
        avatarEl.style.display = 'none';
        userBox.style.background = '#000';
        const p = videoEl.play();
        if (p && typeof p.catch === 'function') {
            p.catch(function () { });
        }
    }).catch(function () { });
}

function endVideoSession() {
    const state = window.voiceCallState || {};
    if (state.userCameraStream) {
        try {
            state.userCameraStream.getTracks().forEach(function (track) { track.stop(); });
        } catch (e) { }
        state.userCameraStream = null;
    }
    state.userCameraOn = false;
    window.voiceCallState = state;
    const layer = document.getElementById('video-session-layer');
    if (layer) {
        layer.remove();
    }
    endVoiceCall();
}

function switchCameraFacingMode() {
    const videoEl = document.getElementById('video-session-user-video');
    const avatarEl = document.getElementById('video-session-user-avatar');
    const userBox = document.getElementById('video-session-user-box');
    if (!videoEl || !avatarEl || !userBox) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return;
    }
    const state = window.voiceCallState || {};
    const current = state.facingMode === 'environment' ? 'environment' : 'user';
    const next = current === 'user' ? 'environment' : 'user';
    if (state.userCameraStream) {
        try {
            state.userCameraStream.getTracks().forEach(function (track) { track.stop(); });
        } catch (e) { }
        state.userCameraStream = null;
    }
    const wasOn = !!state.userCameraOn;
    state.userCameraOn = false;
    state.facingMode = next;
    window.voiceCallState = state;
    if (!wasOn) {
        return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: next } }).then(function (stream) {
        const s = window.voiceCallState || {};
        s.userCameraStream = stream;
        s.userCameraOn = true;
        s.facingMode = next;
        window.voiceCallState = s;
        videoEl.srcObject = stream;
        videoEl.style.display = 'block';
        avatarEl.style.display = 'none';
        userBox.style.background = '#000';
        const p = videoEl.play();
        if (p && typeof p.catch === 'function') {
            p.catch(function () { });
        }
    }).catch(function () { });
}

function captureUserVideoFrame() {
    const videoEl = document.getElementById('video-session-user-video');
    if (!videoEl || !videoEl.srcObject) return '';
    const w = videoEl.videoWidth || 0;
    const h = videoEl.videoHeight || 0;
    if (!w || !h) return '';
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    try {
        ctx.drawImage(videoEl, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', 0.6);
    } catch (e) {
        return '';
    }
}

// 🔍 搜索 function cleanVoiceCallAIReply 并替换为：
function cleanVoiceCallAIReply(text) {
    let raw = String(text || '').trim();
    if (!raw) return '';

    // === 1. 尝试解析 Markdown/JSON 包裹的内容 ===
    try {
        let jsonStr = raw;
        // 移除 Markdown 代码块标记 (兼容 ```json 和 ``` 纯反引号)
        jsonStr = jsonStr.replace(/```(json)?/gi, '').trim();

        // 尝试提取 JSON 对象
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start !== -1 && end > start) {
            const inner = jsonStr.substring(start, end + 1);
            const obj = JSON.parse(inner);
            // 提取常见字段
            if (obj.reply) return String(obj.reply).trim();
            if (obj.content) return String(obj.content).trim();
            if (obj.text) return String(obj.text).trim();
            if (obj.message) return String(obj.message).trim();
        }
    } catch (e) {
        // 解析失败，说明不是 JSON，继续往下走
    }

    // === 2. 常规文本清洗 ===
    // 去除 <thinking> 标签
    raw = raw.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
    // 暴力去除剩余的所有反引号
    raw = raw.replace(/```+/g, '');

    // 去除 "System:", "Assistant:", "思考过程:" 等前缀行
    const lines = raw.split('\n');
    const cleanedLines = lines.map(l => l.trim()).filter(l => {
        if (!l) return false;
        // 过滤掉技术性前缀
        if (/^(system|assistant|model|user|思考过程|推理过程|解释|分析)\s*[:：]/i.test(l)) return false;
        return true;
    });

    return cleanedLines.join(' ').trim();
}


function sendTextInVoiceCall(text) {
    const roleId = window.currentChatRole;
    if (!roleId) return;
    if (!window.voiceCallState || !window.voiceCallState.connected || !window.isVoiceCallActive) {
        return;
    }
    if (!Array.isArray(window.voiceCallHistory)) {
        window.voiceCallHistory = [];
    }
    window.voiceCallHistory.push({
        role: 'me',
        content: text
    });
    syncCallChatMessages();
    if (typeof window.callAI !== 'function') {
        return;
    }
    const state = window.voiceCallState || {};
    const systemPrompt = buildVoiceCallTalkPrompt(roleId, !!state.isVideo);
    const historyForAI = (window.voiceCallHistory || []).map(function (m) {
        return {
            role: m.role === 'me' ? 'me' : 'ai',
            content: m.content
        };
    });
    const userMessageText = '[语音通话中] ' + text;
    let imageData = '';
    if (state.isVideo && state.userCameraOn) {
        imageData = captureUserVideoFrame();
    }
    let userPayload = userMessageText;
    if (state.isVideo && imageData) {
        userPayload = {
            type: 'image',
            text: userMessageText,
            base64: imageData
        };
    }
    window.callAI(
        systemPrompt,
        historyForAI,
        userPayload,
        function (aiResponseText) {
            if (!window.voiceCallState || !window.voiceCallState.connected || !window.isVoiceCallActive) {
                return;
            }
            const line = cleanVoiceCallAIReply(aiResponseText);
            if (!line) return;
            if (!Array.isArray(window.voiceCallHistory)) {
                window.voiceCallHistory = [];
            }
            window.voiceCallHistory.push({
                role: 'ai',
                content: line
            });
            syncCallChatMessages();
        },
        function () { }
    );
}

function rerollVoiceCallReply() {
    const state = window.voiceCallState || {};
    const roleId = state.roleId || window.currentChatRole;
    if (!roleId) return;
    if (!state.connected || !window.isVoiceCallActive) {
        return;
    }
    if (!Array.isArray(window.voiceCallHistory)) {
        window.voiceCallHistory = [];
    }
    const history = window.voiceCallHistory;
    let lastUserIndex = -1;
    for (let i = history.length - 1; i >= 0; i--) {
        const item = history[i];
        if (item && item.role === 'me') {
            lastUserIndex = i;
            break;
        }
    }
    if (lastUserIndex === -1) {
        alert('当前没有可重Roll的用户发言');
        return;
    }
    let removed = false;
    while (history.length > lastUserIndex + 1) {
        const tail = history[history.length - 1];
        if (!tail || tail.role !== 'ai') break;
        history.pop();
        removed = true;
    }
    if (!removed) {
        alert('没有可以重Roll的AI回复');
        return;
    }
    syncCallChatMessages();
    if (typeof window.callAI !== 'function') {
        return;
    }
    const systemPrompt = buildVoiceCallTalkPrompt(roleId, !!state.isVideo);
    const historyForAI = (window.voiceCallHistory || []).map(function (m) {
        return {
            role: m.role === 'me' ? 'me' : 'ai',
            content: m.content
        };
    });
    let lastUserMessage = null;
    for (let i = historyForAI.length - 1; i >= 0; i--) {
        const item = historyForAI[i];
        if (item && item.role === 'me') {
            lastUserMessage = item;
            break;
        }
    }
    if (!lastUserMessage || !lastUserMessage.content) {
        return;
    }
    const userMessageText = '[语音通话中] ' + lastUserMessage.content;
    if (typeof window !== 'undefined') {
        window.__chatRerollRequested = true;
    }
    window.callAI(
        systemPrompt,
        historyForAI,
        userMessageText,
        function (aiResponseText) {
            if (!window.voiceCallState || !window.voiceCallState.connected || !window.isVoiceCallActive) {
                return;
            }
            const line = cleanVoiceCallAIReply(aiResponseText);
            if (!line) return;
            if (!Array.isArray(window.voiceCallHistory)) {
                window.voiceCallHistory = [];
            }
            window.voiceCallHistory.push({
                role: 'ai',
                content: line
            });
            syncCallChatMessages();
        },
        function () { }
    );
}

// =========================================================
// 🔥 AI 主动来电功能模块
// =========================================================

// 1. 显示来电全屏界面
function showIncomingCallUI(roleId, isVideo) {
    // 移除可能存在的旧弹窗
    const old = document.getElementById('incoming-call-layer');
    if (old) old.remove();

    const profile = window.charProfiles[roleId] || {};
    const avatarUrl = profile.avatar || "assets/chushitouxiang.jpg";
    const name = profile.nickName || "未知角色";

    // 创建全屏遮罩
    const layer = document.createElement('div');
    layer.id = 'incoming-call-layer';
    layer.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); z-index: 9999;
        display: flex; flex-direction: column; align-items: center; justify-content: space-between;
        padding: 60px 0; color: #fff; backdrop-filter: blur(10px);
    `;

    // 上半部分：头像和名字
    const isVideoCall = !!isVideo;
    const subtitleText = isVideoCall ? "邀请你进行视频通话..." : "邀请你进行语音通话...";
    const iconHtml = isVideoCall
        ? "<i class='bx bx-video' style=\"font-size:32px;\"></i>"
        : "<i class='bx bxs-phone-call' style=\"font-size:32px;\"></i>";
    const topHtml = `
        <div style="display:flex; flex-direction:column; align-items:center; margin-top: 40px;">
            <img src="${avatarUrl}" style="width:100px; height:100px; border-radius:10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); margin-bottom: 20px;">
            <div style="font-size:24px; font-weight:bold; margin-bottom:10px;">${name}</div>
            <div style="font-size:14px; color:rgba(255,255,255,0.7);">${subtitleText}</div>
        </div>
    `;

    // 下半部分：接听/挂断按钮 (左红右绿)
    const bottomHtml = `
        <div style="width: 80%; display:flex; justify-content: space-between; margin-bottom: 60px;">
            <!-- 挂断 -->
            <div id="btn-reject-call" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                <div style="width:64px; height:64px; background:#ff3b30; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">
                    <i class='bx bxs-phone-off' style="font-size:32px;"></i>
                </div>
                <span style="font-size:12px;">挂断</span>
            </div>
            
            <!-- 接听 -->
            <div id="btn-accept-call" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                <div style="width:64px; height:64px; background:#30d158; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">
                    ${iconHtml}
                </div>
                <span style="font-size:12px;">接听</span>
            </div>
        </div>
    `;

    layer.innerHTML = topHtml + bottomHtml;
    document.body.appendChild(layer);

    // 绑定事件
    document.getElementById('btn-reject-call').addEventListener('click', function () {
        layer.remove();
        // 写入一条“未接来电”记录
        const now = Date.now();
        appendMessageToDOM({
            role: 'ai',
            type: 'text',
            content: '📞 [未接来电]',
            timestamp: now
        });
        saveData();

        // 触发AI对未接来电的反应
        if (roleId) {
            const profile = window.charProfiles[roleId] || {};
            let systemPrompt = profile.desc || "你是一个友好的AI助手";

            if (profile.schedule && profile.schedule.trim()) {
                systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
            }
            if (profile.style && profile.style.trim()) {
                systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
            }
            const userPersona = window.userPersonas[roleId] || {};
            if (userPersona.name || userPersona.setting || userPersona.gender || userPersona.birthday) {
                systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
                if (userPersona.name) {
                    systemPrompt += `用户名字：${userPersona.name}\n`;
                }
                if (userPersona.setting) {
                    systemPrompt += `用户背景：${userPersona.setting}\n`;
                }
                if (userPersona.gender) {
                    systemPrompt += `用户性别：${userPersona.gender}\n`;
                }
                if (userPersona.birthday) {
                    systemPrompt += `用户生日：${userPersona.birthday}\n`;
                }
            }

            const history = window.chatData[roleId] || [];
            const cleanHistory = history.map(msg => ensureMessageContent({ ...msg })).filter(m => m.content);

            const headerTitle = document.getElementById('current-chat-name');
            const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
            if (headerTitle) {
                headerTitle.innerText = "对方正在输入...";
            }

            const callType = isVideo ? "视频通话" : "语音通话";
            const userMessage = `[系统通知：你发起了${callType}，但对方没有接听，显示为未接来电。请根据你的人设，表现出委屈、失落或关心的反应，询问用户为什么没有接听电话，语气要符合你的性格特点，表现出更多让人有好感的情绪，不要过于生气或愤怒。]`;
            invokeAIWithCommonHandlers(systemPrompt, cleanHistory, userMessage, roleId, headerTitle, oldTitle);
        }
    });

    document.getElementById('btn-accept-call').addEventListener('click', function () {
        layer.remove();
        acceptIncomingCall(roleId, isVideoCall);
    });
}

// 2. 接听电话：初始化状态并唤起通话界面
function acceptIncomingCall(roleId, isVideo) {
    const overlay = document.getElementById('voice-call-overlay');
    const avatarEl = document.getElementById('voice-call-avatar');
    const statusEl = document.getElementById('voice-call-status');
    const inputRow = document.getElementById('voice-call-input-row');

    const isVideoCall = !!isVideo;

    // 1. 显示或隐藏语音通话界面
    if (overlay) {
        overlay.style.display = isVideoCall ? 'none' : 'flex';
    }
    if (inputRow && !isVideoCall) {
        inputRow.style.display = 'none';
    }

    // 2. 设置头像
    const profile = window.charProfiles[roleId] || {};
    if (avatarEl) avatarEl.src = profile.avatar || 'assets/chushitouxiang.jpg';

    // 3. 初始化状态 (直接 Connected，不需要握手)
    const state = window.voiceCallState || {};
    // 清理旧定时器
    if (state.timerId) clearInterval(state.timerId);
    if (state.chatSyncIntervalId) clearInterval(state.chatSyncIntervalId);

    state.active = true;
    state.connected = true;
    state.seconds = 0;
    state.roleId = roleId;
    state.isVideo = isVideoCall;
    window.voiceCallState = state;
    window.isVoiceCallActive = true;
    window.voiceCallHistory = [];

    // 4. 启动计时器（语音和视频都计时）
    if (statusEl) statusEl.innerText = '00:00';
    state.timerId = setInterval(function () {
        const s = (window.voiceCallState && window.voiceCallState.seconds) || 0;
        const next = s + 1;
        window.voiceCallState.seconds = next;
        if (statusEl && !isVideoCall) {
            statusEl.innerText = formatCallDuration(next);
        }
    }, 1000);

    // 5. 视频通话：直接进入视频界面
    if (isVideoCall) {
        startActiveVideoSession(roleId);
    }

    // 6. 🔥 关键：因为是AI打来的，接通后AI要先说话
    triggerAIFirstSpeakInCall(roleId);
}

// 3. 触发 AI 通话第一句 (修复版：带记忆功能)
// 🔍 搜索 function triggerAIFirstSpeakInCall 并替换为：
function triggerAIFirstSpeakInCall(roleId) {
    const state = window.voiceCallState || {};
    const systemPrompt = buildVoiceCallTalkPrompt(roleId, !!state.isVideo);

    const history = window.chatData[roleId] || [];
    const cleanHistory = history.map(msg => {
        if (!msg.content) return null;
        if (msg.type === 'call_end' || msg.type === 'call_memory') return null;
        return {
            role: msg.role === 'me' ? 'me' : 'ai',
            content: msg.content
        };
    }).filter(Boolean);

    const userMessage = "[系统通知：用户接听了你的电话。请结合之前的聊天上下文，直接开始说话，说出你的开场白。]";

    window.callAI(
        systemPrompt,
        cleanHistory,
        userMessage,
        function (aiResponseText) {
            if (!window.voiceCallState.active) return;

            // 🔥 修复点：使用 cleanVoiceCallAIReply 进行清洗
            let reply = cleanVoiceCallAIReply(aiResponseText);

            if (reply) {
                window.voiceCallHistory.push({
                    role: 'ai',
                    content: reply
                });
                syncCallChatMessages();
            }
        },
        function () {
            console.error("AI 接通后发言失败");
        }
    );
}




document.addEventListener('DOMContentLoaded', function () {
    const overlay = document.getElementById('voice-call-overlay');
    const floatWindow = document.getElementById('call-float-window');
    const minimizeBtn = document.getElementById('voice-call-minimize');
    const hangupBtn = document.getElementById('voice-call-hangup-btn');
    const micBtn = document.getElementById('voice-call-mic-btn');
    const speakerBtn = document.getElementById('voice-call-speaker-btn');
    const inputRow = document.getElementById('voice-call-input-row');
    const inputEl = document.getElementById('voice-call-input');
    const sendBtn = document.getElementById('voice-call-send');
    if (minimizeBtn && overlay && floatWindow) {
        minimizeBtn.addEventListener('click', function () {
            const state = window.voiceCallState || {};
            if (!state.active) return;
            overlay.style.display = 'none';
            floatWindow.style.display = 'flex';
        });
    }
    if (floatWindow && overlay) {
        floatWindow.addEventListener('click', function () {
            const state = window.voiceCallState || {};
            if (!state.active) return;
            floatWindow.style.display = 'none';
            overlay.style.display = 'flex';
        });
    }
    if (hangupBtn) {
        hangupBtn.addEventListener('click', function () {
            try {
                const s = window.voiceCallState || {};
                s.userHangup = true;
                window.voiceCallState = s;
            } catch (e) { }
            endVoiceCall();
        });
    }
    if (micBtn) {
        micBtn.addEventListener('click', function () {
            micBtn.classList.toggle('off');
            if (inputRow) {
                if (inputRow.style.display === 'none' || !inputRow.style.display) {
                    inputRow.style.display = 'flex';
                    if (inputEl) {
                        setTimeout(function () {
                            inputEl.focus();
                        }, 10);
                    }
                } else {
                    inputRow.style.display = 'none';
                }
            }
        });
    }
    if (speakerBtn) {
        speakerBtn.addEventListener('click', function () {
            speakerBtn.classList.toggle('off');
        });
    }
    if (sendBtn) {
        sendBtn.innerHTML = "<i class='bx bx-refresh'></i>";
        sendBtn.title = '一键重Roll';
    }
    if (inputEl) {
        const sendFromCallInput = function () {
            const raw = inputEl.value.trim();
            const roleId = window.currentChatRole;
            if (!raw || !roleId) return;
            if (!window.voiceCallState || !window.voiceCallState.connected || !window.isVoiceCallActive) {
                return;
            }
            const text = raw;
            inputEl.value = '';
            sendTextInVoiceCall(text);
        };
        inputEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendFromCallInput();
            }
        });
        if (sendBtn) {
            sendBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                rerollVoiceCallReply();
            });
        }
    }
});





// =========================================================
// === 2. 菜单与弹窗体系 (完整功能) ===
// =========================================================

// 打开主设置菜单
function openChatSettings() {
    const roleId = window.currentChatRole;
    const profiles = (window.charProfiles && typeof window.charProfiles === 'object') ? window.charProfiles : {};
    const profile = (roleId && profiles[roleId]) ? profiles[roleId] : {};

    const nameEl = document.getElementById('menu-role-name');
    const descEl = document.getElementById('menu-role-desc');
    const avatarEl = document.getElementById('menu-role-avatar');
    if (nameEl) nameEl.innerText = profile.remark || profile.nickName || roleId;
    if (descEl) descEl.innerText = profile.desc || "点击查看档案...";
    if (avatarEl) avatarEl.src = profile.avatar || "assets/chushitouxiang.jpg";

    const menu = document.getElementById('settings-menu-modal');
    if (!menu) return;
    menu.style.display = 'flex';
    if (typeof window.initChatSettingsUI === 'function') {
        window.initChatSettingsUI(roleId);
    }
}

function closeSettingsMenu() {
    document.getElementById('settings-menu-modal').style.display = 'none';
}

function renderEditVideoAlbum() {
    const list = document.getElementById('edit-video-album-list');
    if (!list) return;
    list.innerHTML = '';
    const data = Array.isArray(window.editVideoAlbumData) ? window.editVideoAlbumData : [];
    for (let i = 0; i < data.length; i++) {
        const url = data[i];
        if (!url) continue;
        const item = document.createElement('div');
        item.style.cssText = 'width:64px; height:64px; border-radius:6px; overflow:hidden; position:relative; background:#000;';
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
        const del = document.createElement('div');
        del.innerText = '×';
        del.style.cssText = 'position:absolute; top:0; right:0; width:18px; height:18px; line-height:18px; text-align:center; font-size:14px; color:#fff; background:rgba(0,0,0,0.6); cursor:pointer;';
        del.setAttribute('data-index', String(i));
        del.onclick = function () {
            const idx = parseInt(this.getAttribute('data-index') || '0', 10);
            if (Array.isArray(window.editVideoAlbumData)) {
                window.editVideoAlbumData.splice(idx, 1);
                renderEditVideoAlbum();
            }
        };
        item.appendChild(img);
        item.appendChild(del);
        list.appendChild(item);
    }
}

function handleEditVideoAlbumFile(input) {
    if (!input || !input.files || !input.files[0]) return;
    handleImageUpload(input, null, function (base64) {
        if (!Array.isArray(window.editVideoAlbumData)) {
            window.editVideoAlbumData = [];
        }
        window.editVideoAlbumData.push(base64);
        renderEditVideoAlbum();
    });
    input.value = '';
}

// --- A. 角色编辑器 ---
function openCharacterEditor() {
    const roleId = window.currentChatRole;
    const profile = window.charProfiles[roleId] || {};

    // 填充数据
    document.getElementById('edit-ai-name').value = profile.nickName || "";
    document.getElementById('edit-ai-remark').value = profile.remark || "";
    document.getElementById('edit-ai-personality').value = profile.desc || "";
    document.getElementById('edit-ai-style').value = profile.style || "";
    document.getElementById('edit-ai-schedule').value = profile.schedule || "";
    document.getElementById('edit-avatar-preview').src = profile.avatar || "assets/chushitouxiang.jpg";

    window.editVideoAlbumData = Array.isArray(profile.videoAlbum) ? profile.videoAlbum.slice() : [];
    renderEditVideoAlbum();

    // 🔥 新增：填充并回显选中的世界书 (支持多选)
    const container = document.getElementById('edit-ai-worldbook-container');
    if (container && window.getWorldBookCheckboxListHTML) {
        // profile.worldbookId 可能是数组，也可能是旧的单 ID 字符串
        let selectedIds = profile.worldbookId || [];
        if (typeof selectedIds === 'string') {
            selectedIds = selectedIds ? [selectedIds] : [];
        }
        container.innerHTML = window.getWorldBookCheckboxListHTML(selectedIds);
        if (typeof window.bindWorldBookCheckboxList === 'function') {
            window.bindWorldBookCheckboxList(container);
        }
    }

    // 先把上一级菜单关掉
    document.getElementById('settings-menu-modal').style.display = 'none';

    // 打开编辑弹窗
    document.getElementById('editor-modal').style.display = 'flex';
}


// 关闭编辑窗口
function closeEditor() {
    document.getElementById('editor-modal').style.display = 'none';
}

// 保存编辑结果
function saveEditResult() {
    const roleId = window.currentChatRole;
    if (!roleId) return;

    // 读取输入框
    const newName = document.getElementById('edit-ai-name').value;
    const newRemark = (function () {
        const el = document.getElementById('edit-ai-remark');
        const raw = el ? el.value : '';
        return String(raw || '').trim();
    })();
    const newDesc = document.getElementById('edit-ai-personality').value;
    const newStyle = document.getElementById('edit-ai-style').value;
    const newSchedule = document.getElementById('edit-ai-schedule').value;
    const newAvatar = document.getElementById('edit-avatar-preview').src;

    // 🔥 新增：读取多选世界书
    const wbContainer = document.getElementById('edit-ai-worldbook-container');
    let newWorldBookId = [];
    if (wbContainer) {
        const checkboxes = wbContainer.querySelectorAll('input[name="wb-checkbox"]:checked');
        newWorldBookId = Array.from(checkboxes).map(cb => cb.value);
    }

    if (!newName) return alert("名字不能为空");

    // 更新数据
    if (!window.charProfiles[roleId]) window.charProfiles[roleId] = {};
    const p = window.charProfiles[roleId];
    const oldRemark = typeof p.remark === 'string' ? p.remark.trim() : '';
    p.nickName = newName;
    p.remark = newRemark;
    p.desc = newDesc;
    p.style = newStyle;
    p.schedule = newSchedule;
    p.avatar = newAvatar;
    p.worldbookId = newWorldBookId;
    p.videoAlbum = Array.isArray(window.editVideoAlbumData) ? window.editVideoAlbumData.slice() : [];

    saveData();

    // 刷新当前页面的标题
    const titleEl = document.getElementById('current-chat-name');
    if (titleEl) titleEl.innerText = (newRemark || newName);

    if (oldRemark !== newRemark) {
        const myPersona = window.userPersonas[roleId] || {};
        const userName = (myPersona && typeof myPersona.name === 'string' && myPersona.name.trim()) ? myPersona.name.trim() : '用户';
        const showRemark = newRemark || newName;
        const sysText = `${userName}已将你的备注改成${showRemark}`;
        if (!window.chatData[roleId]) window.chatData[roleId] = [];
        const sysMsg = {
            role: 'me',
            content: sysText,
            type: 'system_event',
            includeInAI: true,
            timestamp: Date.now()
        };
        window.chatData[roleId].push(sysMsg);
        appendMessageToDOM(sysMsg);
        saveData();
    }

    closeEditor();
    alert("修改已保存！");
}


// 编辑角色时的头像预览
function previewEditAvatar(input) {
    // 角色头像也压缩到 150px
    handleImageUpload(input, 'edit-avatar-preview', null, 150);
}

function closeCreator() {
    document.getElementById('creator-modal').style.display = 'none';
}

// --- B. 我的身份设置 (修复层级遮挡) ---

function openUserPersonaModal() {
    document.getElementById('settings-menu-modal').style.display = 'none';

    disableChatStatusBarInteraction();

    const roleId = window.currentChatRole;
    const myPersona = window.userPersonas[roleId] || {};

    const nameInput = document.getElementById('user-settings-name');
    const settingInput = document.getElementById('user-persona-setting');
    const avatarImg = document.getElementById('user-settings-avatar');
    const genderSelect = document.getElementById('user-settings-gender');
    const birthdayTypeSelect = document.getElementById('user-birthday-type');

    // New birthday inputs
    const birthdaySolarInput = document.getElementById('user-settings-birthday-solar');
    const birthdayLunarInput = document.getElementById('user-settings-birthday-lunar');

    if (nameInput) nameInput.value = myPersona.name || "";
    if (settingInput) settingInput.value = myPersona.setting || "";
    if (avatarImg) avatarImg.src = myPersona.avatar || "assets/chushitouxiang.jpg";
    if (genderSelect) genderSelect.value = myPersona.gender || "";

    if (birthdayTypeSelect) {
        birthdayTypeSelect.value = myPersona.birthdayType || "solar";
    }

    // Populate birthday inputs
    const savedBirthday = myPersona.birthday || "";
    if (myPersona.birthdayType === 'lunar') {
        if (birthdayLunarInput) birthdayLunarInput.value = savedBirthday;
        if (birthdaySolarInput) birthdaySolarInput.value = "";
    } else {
        if (birthdaySolarInput) birthdaySolarInput.value = savedBirthday;
        if (birthdayLunarInput) birthdayLunarInput.value = "";
    }

    if (typeof syncCalendarToggleUI === 'function') syncCalendarToggleUI();

    document.getElementById('user-persona-modal').style.display = 'flex';
}

function saveUserPersona() {
    const roleId = window.currentChatRole;
    const nameInput = document.getElementById('user-settings-name');
    const settingInput = document.getElementById('user-persona-setting');
    const avatarImg = document.getElementById('user-settings-avatar');
    const genderSelect = document.getElementById('user-settings-gender');
    const birthdayTypeSelect = document.getElementById('user-birthday-type');

    // New birthday inputs
    const birthdaySolarInput = document.getElementById('user-settings-birthday-solar');
    const birthdayLunarInput = document.getElementById('user-settings-birthday-lunar');

    const name = nameInput ? nameInput.value.trim() : "";
    const setting = settingInput ? settingInput.value : "";
    const avatar = avatarImg ? avatarImg.src : "";
    const gender = genderSelect ? genderSelect.value : "";
    const birthdayType = birthdayTypeSelect ? birthdayTypeSelect.value : "solar";

    let birthday = "";
    if (birthdayType === 'lunar') {
        birthday = birthdayLunarInput ? birthdayLunarInput.value : "";
    } else {
        birthday = birthdaySolarInput ? birthdaySolarInput.value : "";
    }

    window.userPersonas[roleId] = {
        name: name,
        setting: setting,
        avatar: avatar || "assets/chushitouxiang.jpg",
        gender: gender,
        birthday: birthday,
        birthdayType: birthdayType
    };

    saveData();
    closeSubModal('user-persona-modal');
    alert("身份设定已更新");

    enterChat(roleId);
}

// 预览并压缩【我的头像】
function previewUserAvatar(input) {
    // 这里的 150 是关键！把头像限制在 150px 宽，体积极小，存100个都没问题
    handleImageUpload(input, 'user-settings-avatar', null, 150);
}

// --- C. 背景设置 (修复层级遮挡) ---

function openBgSettingModal() {
    // 【核心修复】：先关闭上一级菜单，防止遮挡
    document.getElementById('settings-menu-modal').style.display = 'none';

    disableChatStatusBarInteraction();

    const roleId = window.currentChatRole;
    const bgUrl = window.chatBackgrounds[roleId];
    const previewBox = document.getElementById('bg-preview-box');

    if (bgUrl) {
        previewBox.style.backgroundImage = `url('${bgUrl}')`;
        previewBox.innerText = "";
    } else {
        previewBox.style.backgroundImage = "";
        previewBox.innerText = "当前使用默认背景";
    }

    document.getElementById('bg-setting-modal').style.display = 'flex';
}

function previewChatBg(input) {
    // 背景图稍微大一点，设为 720 (手机屏幕宽度)，既清晰又不占太大空间
    handleImageUpload(input, null, function (base64) {
        const previewBox = document.getElementById('bg-preview-box');
        previewBox.style.backgroundImage = `url('${base64}')`;
        previewBox.style.backgroundSize = 'cover';
        previewBox.innerText = "";
        previewBox.dataset.tempUrl = base64; // 暂存
    }, 720);
}

function saveChatBg() {
    const roleId = window.currentChatRole;
    const previewBox = document.getElementById('bg-preview-box');

    // 优先取暂存的，没有就取当前的
    let newBg = previewBox.dataset.tempUrl;
    if (!newBg && previewBox.style.backgroundImage) {
        newBg = previewBox.style.backgroundImage.slice(5, -2).replace(/"/g, "");
    }

    if (newBg) {
        window.chatBackgrounds[roleId] = newBg;
        applyChatBackground(roleId);
        saveData(); // 🔥 关键修复：保存到 localStorage
    }
    closeSubModal('bg-setting-modal');
}

function resetChatBg() {
    const roleId = window.currentChatRole;
    delete window.chatBackgrounds[roleId];
    applyChatBackground(roleId);
    saveData(); // 🔥 关键修复：保存到 localStorage
    document.getElementById('bg-preview-box').style.backgroundImage = "";
    document.getElementById('bg-preview-box').innerText = "默认";
}

// 应用背景
function applyChatBackground(roleId) {
    const chatBody = document.getElementById('chat-history');
    const bgData = window.chatBackgrounds[roleId];
    if (bgData) {
        chatBody.style.backgroundImage = `url('${bgData}')`;
        chatBody.style.backgroundSize = 'cover';
        chatBody.style.backgroundPosition = 'center';
    } else {
        chatBody.style.backgroundImage = '';
    }
}

// =========================================================
// === 3. 闭环核心：返回首页 ===
// =========================================================

function goBackToHome() {
    saveData();
    // 设置暗号
    localStorage.setItem('autoOpenWechat', 'true');
    // 跳转
    window.location.href = 'index.html';
}

// =========================================================
// === 4. 工具函数：图片压缩与存储 ===
// =========================================================

function disableChatStatusBarInteraction() {
    const bar = document.querySelector('#chat-view .status-bar');
    if (bar) {
        bar.style.pointerEvents = 'none';
    }
}

function enableChatStatusBarInteraction() {
    const bar = document.querySelector('#chat-view .status-bar');
    if (bar) {
        bar.style.pointerEvents = '';
    }
}

function closeSubModal(id) {
    document.getElementById(id).style.display = 'none';

    enableChatStatusBarInteraction();

    // 🔥 关闭二级弹窗后，重新显示设置菜单（营造"返回上一级"的感觉）
    document.getElementById('settings-menu-modal').style.display = 'flex';
}

function clearChatHistory() {
    if (confirm("确定清空聊天记录吗？")) {
        const roleId = window.currentChatRole;
        window.chatData[roleId] = [];
        saveData();
        enterChat(roleId);
        closeSettingsMenu();
    }
}

function openCallLogModal() {
    const roleId = window.currentChatRole;
    if (!roleId) return;

    let modal = document.getElementById('call-log-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'call-log-modal';
        modal.className = 'modal-layer';
        modal.style.display = 'none';
        modal.style.background = '#f2f2f7';
        document.body.appendChild(modal);
    }

    const logsByRole = window.callLogs || {};
    const list = Array.isArray(logsByRole[roleId]) ? logsByRole[roleId] : [];

    let html = '';
    html += '<div class="modal-header-bar">';
    html += '<div class="modal-placeholder"></div>';
    html += '<div class="modal-title">通话记录</div>';
    html += '<div style="display:flex; align-items:center; gap:10px;">';
    html += '<div class="modal-close-icon" onclick="closeCallLogModal()">×</div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="call-log-body" style="flex:1; overflow-y:auto; padding:16px;">';

    if (!list.length) {
        html += '<div class="call-log-empty" style="margin-top:40px; text-align:center; color:#999; font-size:14px;">暂无通话记录</div>';
    } else {
        html += '<div class="call-log-list">';
        for (let i = list.length - 1; i >= 0; i--) {
            const item = list[i] || {};
            const index = i;
            const isVideo = item.type === 'video';
            const icon = isVideo ? '📹' : '📞';
            const date = item.date ? new Date(item.date) : null;
            const dateStr = date ? date.toLocaleString() : '';
            let durationText = '';
            if (typeof item.duration === 'number' && item.duration > 0) {
                durationText = formatCallDuration(item.duration);
            }
            let titleText = dateStr;
            if (durationText) {
                titleText += dateStr ? ' · 时长 ' + durationText : '时长 ' + durationText;
            }

            html += '<div class="call-log-item" data-index="' + index + '" style="background:#fff; border-radius:10px; padding:12px; margin-bottom:12px; cursor:pointer;">';
            html += '<div class="call-log-summary" style="display:flex; align-items:center; justify-content:space-between;">';
            html += '<div style="display:flex; align-items:center; gap:8px;">';
            html += '<span class="call-log-icon" style="font-size:18px;">' + icon + '</span>';
            html += '<span class="call-log-title" style="font-size:14px; color:#333;">' + titleText + '</span>';
            html += '</div>';
            html += '<div style="display:flex; align-items:center; gap:10px;">';
            html += '<button type="button" class="call-log-del-btn" data-index="' + index + '" style="border:none; background:rgba(255,59,48,0.10); color:#ff3b30; font-weight:900; border-radius:10px; padding:6px 10px; cursor:pointer;">删除</button>';
            html += '<span class="chevron">›</span>';
            html += '</div>';
            html += '</div>';

            const raw = item.content || '';
            const safe = String(raw)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>');
            html += '<div class="call-log-detail" style="display:none; margin-top:8px; font-size:13px; color:#555; white-space:pre-wrap;">' + safe + '</div>';

            html += '</div>';
        }
        html += '</div>';
    }

    html += '</div>';
    html += '<div id="call-log-batch-bar" style="display:none; gap:10px; align-items:center; padding:10px 16px 16px; background:#f2f2f7; border-top:1px solid rgba(0,0,0,0.06);">';
    html += '<button type="button" id="call-log-select-all-btn" style="border:none; background:#fff; color:#111; font-weight:900; border-radius:12px; padding:10px 12px; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.06);">全选</button>';
    html += '<button type="button" id="call-log-batch-delete-btn" style="flex:1; border:none; background:#ff3b30; color:#fff; font-weight:900; border-radius:12px; padding:10px 12px; cursor:pointer;">删除(0)</button>';
    html += '<button type="button" id="call-log-batch-cancel-btn" style="border:none; background:rgba(0,0,0,0.06); color:#111; font-weight:900; border-radius:12px; padding:10px 12px; cursor:pointer;">取消</button>';
    html += '</div>';
    modal.innerHTML = html;

    const menu = document.getElementById('settings-menu-modal');
    if (menu) menu.style.display = 'none';

    disableChatStatusBarInteraction();

    modal.style.display = 'flex';

    let selecting = false;
    let ignoreNextClick = false;
    const selected = new Set();
    const batchBar = modal.querySelector('#call-log-batch-bar');
    const selectAllBtn = modal.querySelector('#call-log-select-all-btn');
    const batchDeleteBtn = modal.querySelector('#call-log-batch-delete-btn');
    const batchCancelBtn = modal.querySelector('#call-log-batch-cancel-btn');

    const getAllItemEls = function () {
        return Array.from(modal.querySelectorAll('.call-log-item'));
    };

    const setSelecting = function (active) {
        selecting = !!active;
        if (!selecting) selected.clear();
        if (batchBar) batchBar.style.display = selecting ? 'flex' : 'none';
        syncSelectionUI();
    };

    const syncSelectionUI = function () {
        const items = getAllItemEls();
        items.forEach(function (itemEl) {
            const idx = String(itemEl.getAttribute('data-index') || '');
            const isSelected = idx && selected.has(idx);
            itemEl.style.outline = selecting && isSelected ? '2px solid rgba(255,59,48,0.35)' : '';
            itemEl.style.background = selecting && isSelected ? 'rgba(255,59,48,0.06)' : '#fff';
        });
        if (batchDeleteBtn) batchDeleteBtn.textContent = '删除(' + String(selected.size) + ')';
        if (selectAllBtn) {
            const allCount = items.length;
            selectAllBtn.textContent = selected.size && selected.size === allCount ? '取消全选' : '全选';
        }
    };

    const items = modal.querySelectorAll('.call-log-item');
    items.forEach(function (itemEl) {
        const idx = String(itemEl.getAttribute('data-index') || '');

        itemEl.addEventListener('click', function () {
            if (ignoreNextClick) {
                ignoreNextClick = false;
                return;
            }
            if (selecting) {
                if (!idx) return;
                if (selected.has(idx)) selected.delete(idx);
                else selected.add(idx);
                if (!selected.size) {
                    setSelecting(false);
                    return;
                }
                syncSelectionUI();
                return;
            }
            const detail = itemEl.querySelector('.call-log-detail');
            if (!detail) return;
            if (!detail.style.display || detail.style.display === 'none') {
                detail.style.display = 'block';
            } else {
                detail.style.display = 'none';
            }
        });

        let pressTimer = 0;
        let pressMoved = false;
        const clearPress = function () {
            if (pressTimer) window.clearTimeout(pressTimer);
            pressTimer = 0;
            pressMoved = false;
        };

        itemEl.addEventListener('touchstart', function () {
            clearPress();
            pressTimer = window.setTimeout(function () {
                ignoreNextClick = true;
                if (!idx) return;
                if (!selecting) setSelecting(true);
                selected.add(idx);
                syncSelectionUI();
            }, 520);
        }, { passive: true });

        itemEl.addEventListener('touchmove', function () {
            pressMoved = true;
            if (pressTimer) window.clearTimeout(pressTimer);
        }, { passive: true });

        itemEl.addEventListener('touchend', function () {
            if (pressMoved) clearPress();
            else if (pressTimer) window.clearTimeout(pressTimer);
            pressTimer = 0;
        }, { passive: true });

        itemEl.addEventListener('touchcancel', function () {
            clearPress();
        }, { passive: true });

        itemEl.addEventListener('contextmenu', function (e) {
            if (e) e.preventDefault();
            ignoreNextClick = true;
            if (!idx) return;
            if (!selecting) setSelecting(true);
            if (selected.has(idx)) selected.delete(idx);
            else selected.add(idx);
            if (!selected.size) {
                setSelecting(false);
                return;
            }
            syncSelectionUI();
        });
    });

    const delBtns = modal.querySelectorAll('.call-log-del-btn');
    delBtns.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            if (e) e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-index') || '0', 10);
            deleteCallLogItemForCurrentRole(idx);
        });
    });

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function () {
            const items = getAllItemEls();
            if (!items.length) return;
            const allSelected = selected.size && selected.size === items.length;
            selected.clear();
            if (!allSelected) {
                items.forEach(function (el) {
                    const idx = String(el.getAttribute('data-index') || '');
                    if (idx) selected.add(idx);
                });
                setSelecting(true);
            } else {
                setSelecting(false);
            }
            syncSelectionUI();
        });
    }

    if (batchCancelBtn) {
        batchCancelBtn.addEventListener('click', function () {
            setSelecting(false);
        });
    }

    if (batchDeleteBtn) {
        batchDeleteBtn.addEventListener('click', function () {
            if (!selected.size) return;
            const indices = Array.from(selected).map(v => parseInt(v, 10)).filter(n => Number.isFinite(n));
            if (!indices.length) return;
            deleteCallLogItemsForCurrentRole(indices);
        });
    }
}

function closeCallLogModal() {
    const modal = document.getElementById('call-log-modal');
    if (modal) modal.style.display = 'none';

    enableChatStatusBarInteraction();

    const menu = document.getElementById('settings-menu-modal');
    if (menu) menu.style.display = 'flex';
}

function clearCallLogsForCurrentRole() {
    const roleId = window.currentChatRole;
    if (!roleId) return;
    const ok = confirm('确定清空该角色的全部通话记录吗？(不可恢复)');
    if (!ok) return;
    if (!window.callLogs) window.callLogs = {};
    window.callLogs[roleId] = [];
    saveData();
    openCallLogModal();
}

function deleteCallLogItemForCurrentRole(index) {
    const roleId = window.currentChatRole;
    if (!roleId) return;
    const logsByRole = window.callLogs || {};
    const list = Array.isArray(logsByRole[roleId]) ? logsByRole[roleId] : [];
    const idx = typeof index === 'number' ? index : parseInt(String(index || '0'), 10);
    if (!(idx >= 0 && idx < list.length)) return;
    const ok = confirm('确定删除这条通话记录吗？(不可恢复)');
    if (!ok) return;
    list.splice(idx, 1);
    if (!window.callLogs) window.callLogs = {};
    window.callLogs[roleId] = list;
    saveData();
    openCallLogModal();
}

function deleteCallLogItemsForCurrentRole(indices) {
    const roleId = window.currentChatRole;
    if (!roleId) return;
    const arr = Array.isArray(indices) ? indices.slice() : [];
    const unique = Array.from(new Set(arr.map(n => (typeof n === 'number' ? n : parseInt(String(n || ''), 10))).filter(n => Number.isFinite(n))));
    if (!unique.length) return;
    const ok = confirm('确定删除选中的 ' + unique.length + ' 条通话记录吗？(不可恢复)');
    if (!ok) return;
    const logsByRole = window.callLogs || {};
    const list = Array.isArray(logsByRole[roleId]) ? logsByRole[roleId] : [];
    unique.sort((a, b) => b - a).forEach(function (idx) {
        if (idx >= 0 && idx < list.length) list.splice(idx, 1);
    });
    if (!window.callLogs) window.callLogs = {};
    window.callLogs[roleId] = list;
    saveData();
    openCallLogModal();
}

// 新建角色时的头像预览
function previewAvatar(input) {
    // 角色头像也压缩到 150px
    handleImageUpload(input, 'avatar-preview', null, 150);
}

/**
 * 通用图片处理 (智能压缩版)
 * @param {HTMLInputElement} input - 文件输入框
 * @param {string} targetImgId - 要显示预览的图片标签ID (可选)
 * @param {function} callback - 处理完后的回调，返回 base64
 * @param {number} specificMaxSize - (新功能) 指定最大宽度，头像建议 150，背景建议 720
 */
function handleImageUpload(input, targetImgId, callback, specificMaxSize) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                // === 智能压缩核心 ===
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // 默认最长边 1024，如果传入了 specificMaxSize 就用传入的
                const maxWidth = specificMaxSize || 1024;
                let width = img.width;
                let height = img.height;

                // 保持比例缩放
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    // 如果是竖图，限制高度也可以，或者简单点只限制宽度
                    // 这里为了头像，我们限制最长边
                    if (height > maxWidth) {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // 绘制并导出
                ctx.drawImage(img, 0, 0, width, height);

                // 质量压缩：0.6 (60% 质量)
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);

                console.log(`原图大小: ${e.target.result.length}, 压缩后: ${compressedDataUrl.length}`);

                // 显示预览
                if (targetImgId) {
                    const imgEl = document.getElementById(targetImgId);
                    if (imgEl) imgEl.src = compressedDataUrl;
                }

                // 回调
                if (callback) callback(compressedDataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

/* =================================
   聊天应用导航系统
   ================================= */

// 【后退】从聊天室 -> 返回到微信列表 (App Window)
function backToList() {
    const roleId = window.currentChatRole;
    const chatData = (window.chatData && typeof window.chatData === 'object') ? window.chatData : {};
    const chatUnread = (window.chatUnread && typeof window.chatUnread === 'object') ? window.chatUnread : {};

    if (roleId && Array.isArray(chatData[roleId])) {
        const list = chatData[roleId];
        const last = list[list.length - 1];
        const ts = last && last.timestamp ? last.timestamp : Date.now();
        if (!chatUnread[roleId]) chatUnread[roleId] = {};
        chatUnread[roleId].lastReadTs = ts;
        window.chatUnread = chatUnread;
        window.chatData = chatData;
        saveData();
    }
    // 1. 隐藏聊天室大盒子
    document.getElementById('chat-view').style.display = 'none';
    document.body.classList.remove('chat-view-active');

    // 2. 显示桌面 (因为 App Window 是浮在桌面上的)
    document.getElementById('desktop-view').style.display = 'block';

    // 3. 重新打开微信 App 窗口 (这就回到了列表页！)
    // 这一步会自动把右上角的 + 号带回来，也会刷新列表
    if (typeof window.openChatApp === 'function') {
        window.openChatApp();
        // 确保加号显示
        const plusBtn = document.getElementById('top-plus-btn');
        if (plusBtn) plusBtn.style.display = 'block';
    }
}

/* =========================================================
   === 最终修复版：删除功能 & 逻辑分离 (请替换 chat.js 底部代码) ===
   ========================================================= */

// 1. 【新建】点击桌面加号时触发
function renderCreatorVideoAlbum() {
    const list = document.getElementById('creator-video-album-list');
    if (!list) return;
    list.innerHTML = '';
    const data = Array.isArray(window.creatorVideoAlbumData) ? window.creatorVideoAlbumData : [];
    data.forEach(function (url, i) {
        if (!url) return;
        const item = document.createElement('div');
        item.style.cssText = 'width:64px; height:64px; border-radius:6px; overflow:hidden; position:relative; background:#000;';
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
        const del = document.createElement('div');
        del.innerText = '×';
        del.style.cssText = 'position:absolute; top:0; right:0; width:18px; height:18px; line-height:18px; text-align:center; font-size:14px; color:#fff; background:rgba(0,0,0,0.6); cursor:pointer;';
        del.onclick = function () {
            window.creatorVideoAlbumData.splice(i, 1);
            renderCreatorVideoAlbum();
        };
        item.appendChild(img);
        item.appendChild(del);
        list.appendChild(item);
    });
}

function handleCreatorVideoAlbumFile(input) {
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        if (!Array.isArray(window.creatorVideoAlbumData)) {
            window.creatorVideoAlbumData = [];
        }
        window.creatorVideoAlbumData.push(e.target.result);
        renderCreatorVideoAlbum();
    };
    reader.readAsDataURL(file);
    input.value = '';
}

function openCreator() {
    // 重置所有输入框
    document.getElementById('modal-title').innerText = "创建角色";
    document.getElementById('ai-name').value = '';
    document.getElementById('ai-personality').value = '';
    document.getElementById('ai-style').value = '';
    document.getElementById('ai-schedule').value = '';
    document.getElementById('avatar-preview').src = 'assets/chushitouxiang.jpg';

    window.creatorVideoAlbumData = [];
    renderCreatorVideoAlbum();

    // 🔥 填充世界书多选 (按分类折叠)
    const wbContainer = document.getElementById('ai-worldbook-container');
    if (wbContainer && window.getWorldBookCheckboxListHTML) {
        wbContainer.innerHTML = window.getWorldBookCheckboxListHTML([]);
        if (typeof window.bindWorldBookCheckboxList === 'function') {
            window.bindWorldBookCheckboxList(wbContainer);
        }
    } else if (wbContainer) {
        wbContainer.innerHTML = `<div style="color:#999; font-size:13px;">未加载世界书组件</div>`;
    }

    const presetSelect = document.getElementById('user-persona-preset-select');
    if (presetSelect) {
        presetSelect.innerHTML = '<option value="">不使用预设</option>';
        try {
            const raw = localStorage.getItem('user_persona_presets_v1');
            if (raw) {
                const list = JSON.parse(raw) || [];
                list.forEach(function (p) {
                    if (!p) return;
                    const opt = document.createElement('option');
                    const text = p.name || (p.setting ? p.setting.slice(0, 12) + (p.setting.length > 12 ? '...' : '') : '');
                    opt.value = p.id || '';
                    opt.textContent = text || '未命名预设';
                    presetSelect.appendChild(opt);
                });
            }
        } catch (e) { }
    }

    // 打开桌面的那个弹窗
    document.getElementById('creator-modal').style.display = 'flex';
}



// ⚠️ 注意：这里删除了那个重复的 openCharacterEditor 函数
// 现在程序会自动使用 chat.js 中间部分定义的那个正确的 openCharacterEditor
// 它会打开 #editor-modal (我们刚才修好层级的那个)

// 2. 【保存】桌面新建角色的保存逻辑
function saveCharacterData() {
    const name = document.getElementById('ai-name').value;
    const desc = document.getElementById('ai-personality').value;
    const style = document.getElementById('ai-style').value;
    const schedule = document.getElementById('ai-schedule').value;
    const avatar = document.getElementById('avatar-preview').src;

    // 🔥 获取选中的世界书 ID（数组）
    const wbContainer = document.getElementById('ai-worldbook-container');
    let worldBookId = [];
    if (wbContainer) {
        const checkboxes = wbContainer.querySelectorAll('input[name="wb-checkbox"]:checked');
        worldBookId = Array.from(checkboxes).map(cb => cb.value);
    }

    let personaPresetId = '';
    const presetSelect = document.getElementById('user-persona-preset-select');
    if (presetSelect) {
        personaPresetId = presetSelect.value || '';
    }

    if (!name) return alert("名字不能为空！");

    // 生成新 ID
    const targetId = 'role_' + Date.now();
    alert("创建成功！");

    // 存入数据
    if (!window.charProfiles[targetId]) window.charProfiles[targetId] = {};
    const p = window.charProfiles[targetId];

    p.nickName = name;
    p.desc = desc;
    p.style = style;
    p.schedule = schedule;
    p.avatar = avatar;
    p.worldbookId = Array.isArray(worldBookId) ? worldBookId : []; // 👈 保存关联ID数组
    p.videoAlbum = Array.isArray(window.creatorVideoAlbumData) ? window.creatorVideoAlbumData.slice() : [];

    saveData();

    if (personaPresetId) {
        try {
            const raw = localStorage.getItem('user_persona_presets_v1');
            if (raw) {
                const list = JSON.parse(raw) || [];
                const preset = list.find(p => p && p.id === personaPresetId);
                if (preset) {
                    window.userPersonas[targetId] = {
                        name: preset.name || "",
                        setting: preset.setting || "",
                        avatar: preset.avatar || "assets/chushitouxiang.jpg",
                        gender: preset.gender || "",
                        birthday: preset.birthday || "",
                        birthdayType: preset.birthdayType || "solar"
                    };
                    saveData();
                }
            }
        } catch (e) { }
    }
    closeCreator(); // 关闭桌面弹窗

    // 刷新微信列表
    if (typeof window.loadWechatChatList === 'function') {
        window.loadWechatChatList();
    }
}



// 3. 【删除】彻底删除当前角色
function deleteCurrentCharacter() {
    const roleId = window.currentChatRole;
    if (!roleId) return;

    if (confirm("⚠️ 警告：\n确定要彻底删除这个角色吗？\n删除后无法恢复！")) {
        // 删除所有关联数据
        delete window.charProfiles[roleId];
        delete window.chatData[roleId];
        delete window.userPersonas[roleId];
        delete window.chatBackgrounds[roleId];

        saveData();

        alert("角色已删除。");

        // 关闭菜单
        closeSettingsMenu();

        // 返回列表
        backToList();
    }
}

// 4. 关闭桌面新建弹窗
function closeCreator() {
    document.getElementById('creator-modal').style.display = 'none';
}

/* =================================
   🔥 核心导出 (确保按钮能找到函数)
   ================================= */

// 导航
window.backToList = backToList;
window.enterChat = enterChat;
window.handleImagesForAI = handleImagesForAI;
window.sendMessage = sendMessage;
window.triggerAI = triggerAI;
window.handleImageForAI = handleImageForAI;
window.goBackToHome = goBackToHome;

window.addEventListener('storage', function (e) {
    try {
        if (!e || e.key !== 'wechat_chatData') return;
        const raw = e.newValue || '';
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return;
        window.chatData = parsed;
        if (window.currentChatRole) {
            enterChat(window.currentChatRole);
        }
    } catch (err) { }
});

// 桌面新建
window.openCreator = openCreator;
window.saveCharacterData = saveCharacterData; // 桌面保存用
window.closeCreator = closeCreator;

// 聊天室编辑 (复用 chat.js 中间定义的函数)
window.openCharacterEditor = openCharacterEditor; // 👈 这里的 openCharacterEditor 指向的是上面第260行定义的正确版本！
window.saveEditResult = saveEditResult;           // 👈 聊天室保存用
window.closeEditor = closeEditor;

// 删除功能
window.deleteCurrentCharacter = deleteCurrentCharacter;

// 设置菜单
window.openChatSettings = openChatSettings;
window.closeSettingsMenu = closeSettingsMenu;

// 我的身份
window.openUserPersonaModal = openUserPersonaModal;
window.saveUserPersona = saveUserPersona;
window.previewUserAvatar = previewUserAvatar;
window.saveUserPersonaPreset = function () {
    const roleId = window.currentChatRole;
    if (!roleId) return;
    const nameInput = document.getElementById('user-settings-name');
    const settingInput = document.getElementById('user-persona-setting');
    const avatarImg = document.getElementById('user-settings-avatar');
    const genderSelect = document.getElementById('user-settings-gender');
    const birthdayTypeSelect = document.getElementById('user-birthday-type');

    // New birthday inputs
    const birthdaySolarInput = document.getElementById('user-settings-birthday-solar');
    const birthdayLunarInput = document.getElementById('user-settings-birthday-lunar');

    const name = nameInput ? nameInput.value.trim() : "";
    const setting = settingInput ? settingInput.value : "";
    const avatar = avatarImg ? avatarImg.src : "";
    const gender = genderSelect ? genderSelect.value : "";
    const birthdayType = birthdayTypeSelect ? birthdayTypeSelect.value : "solar";

    let birthday = "";
    if (birthdayType === 'lunar') {
        birthday = birthdayLunarInput ? birthdayLunarInput.value : "";
    } else {
        birthday = birthdaySolarInput ? birthdaySolarInput.value : "";
    }

    if (!name && !setting) {
        alert("至少填写名字或设定，才能存为预设");
        return;
    }

    let presets = [];
    try {
        const raw = localStorage.getItem('user_persona_presets_v1');
        if (raw) presets = JSON.parse(raw) || [];
    } catch (e) { presets = []; }

    const preset = {
        id: 'preset_' + Date.now(),
        name: name,
        setting: setting,
        avatar: avatar || "assets/chushitouxiang.jpg",
        gender: gender,
        birthday: birthday,
        birthdayType: birthdayType
    };

    presets.push(preset);
    try {
        localStorage.setItem('user_persona_presets_v1', JSON.stringify(presets));
        alert("已保存为预设");
    } catch (e) {
        alert("保存预设失败，请检查存储空间");
    }
};

// 背景设置
window.openBgSettingModal = openBgSettingModal;
window.saveChatBg = saveChatBg;
window.resetChatBg = resetChatBg;
window.previewChatBg = previewChatBg;

// 工具函数
window.previewAvatar = previewAvatar;
window.previewEditAvatar = previewEditAvatar;
window.closeSubModal = closeSubModal;
window.clearChatHistory = clearChatHistory;
window.startLocationShare = startLocationShare;
window.renderLocationShareUI = renderLocationShareUI;
window.updateDistance = updateDistance;
window.openStatusMonitorPanel = openStatusMonitorPanel;
window.closeStatusMonitorPanel = closeStatusMonitorPanel;
window.handleStatusMonitorMaskClick = handleStatusMonitorMaskClick;
/* =========================================================
   🔥 补丁：Enter 键发送 & 状态栏同步
   (修复版：删除了收起键盘的逻辑)
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {

    // --- 1. 修复 Enter 键发送消息 ---
    const msgInput = document.getElementById('msg-input');
    if (msgInput) {
        msgInput.addEventListener('keydown', function (e) {
            // 检测是否按下了 Enter (回车键)
            if (e.key === 'Enter') {
                e.preventDefault(); // 防止换行
                sendMessage();      // 调用发送函数

                // ❌ 删除了 msgInput.blur(); 
                // ✅ 现在的逻辑是：发完之后，什么都不做，键盘自然就留在那了
            }
        });
    }

    // --- 2. 修复聊天室顶部的时间和电量显示 ---
    function updateChatStatusBar() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeString = `${hours}:${minutes}`;

        // 更新聊天室的时间 (ID: status-time-text-chat)
        const chatTime = document.getElementById('status-time-text-chat');
        if (chatTime) chatTime.innerText = timeString;

        const chatBattery = document.getElementById('battery-num-chat');
        if (!chatBattery) {
            return;
        }

        if (window.currentBatteryLevel !== null && window.currentBatteryLevel !== undefined) {
            chatBattery.innerText = String(Math.round(window.currentBatteryLevel));
            return;
        }

        if (navigator.getBattery && typeof navigator.getBattery === 'function') {
            navigator.getBattery().then(function (battery) {
                if (!battery || typeof battery.level !== 'number') {
                    chatBattery.innerText = '--';
                    return;
                }
                chatBattery.innerText = String(Math.round(battery.level * 100));
            }).catch(function () {
                chatBattery.innerText = '--';
            });
        } else if (navigator.battery || navigator.mozBattery || navigator.msBattery) {
            const legacyBattery = navigator.battery || navigator.mozBattery || navigator.msBattery;
            const level = legacyBattery && typeof legacyBattery.level === 'number' ? legacyBattery.level * 100 : null;
            chatBattery.innerText = (level === null || level === undefined) ? '--' : String(Math.round(level));
        } else {
            chatBattery.innerText = '--';
        }
    }

    // 立即运行一次
    updateChatStatusBar();
    // 之后每秒刷新一次
    setInterval(updateChatStatusBar, 1000);
});
/* =========================================================
   === 5. 长按菜单功能 (Context Menu) ===
   ========================================================= */

let longPressTimer;
let currentSelectedMsgDiv = null; // 记录当前长按的是哪个气泡元素

// 初始化：给聊天记录容器添加事件监听
document.addEventListener('DOMContentLoaded', function () {
    const historyBox = document.getElementById('chat-history');
    if (!historyBox) return;

    // --- 触摸端 (Mobile) 长按逻辑 ---
    historyBox.addEventListener('touchstart', function (e) {
        handleStart(e);
    }, { passive: false });

    historyBox.addEventListener('touchend', function (e) {
        handleEnd();
    });

    historyBox.addEventListener('touchmove', function (e) {
        // 如果手指移动了，说明是在滑屏，取消长按
        handleEnd();
    });

    // --- 电脑端 (PC) 右键逻辑 ---
    // 方便你在电脑上测试，右键直接触发
    historyBox.addEventListener('contextmenu', function (e) {
        const t = e && e.target && e.target.nodeType === 3 ? e.target.parentElement : e.target;
        const bubble = t && t.closest ? t.closest('.msg-bubble') : null;
        if (bubble) {
            e.preventDefault(); // 阻止浏览器默认右键菜单
            showContextMenu(bubble, e.clientX, e.clientY); // 传入鼠标位置作为参考
        }
    });
});

// 开始按压
function handleStart(e) {
    // 找到被按下的气泡 (closest 处理点击到气泡内部文字的情况)
    const t = e && e.target && e.target.nodeType === 3 ? e.target.parentElement : e.target;
    const bubble = t && t.closest ? t.closest('.msg-bubble') : null;
    if (!bubble) return;

    // 500毫秒后触发菜单
    longPressTimer = setTimeout(() => {
        // 手机端长按触发时，禁止浏览器默认的选中/放大行为
        // e.preventDefault(); 
        // 注意：e.preventDefault() 在 passive listener 里不能用，这里主要靠逻辑控制
        try {
            if (navigator && typeof navigator.vibrate === 'function') {
                navigator.vibrate(12);
            }
        } catch (e2) { }
        showContextMenu(bubble);
    }, 500);
}

// 结束按压 (或移动)
function handleEnd() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

// 显示长按菜单
function showContextMenu(bubbleEl, mouseX, mouseY) {
    // 1. 记录当前选中的气泡 
    // 【修改点】去掉 window. 前缀，直接赋值给上面的 let 变量
    currentSelectedMsgDiv = bubbleEl;

    // 2. 获取菜单和遮罩
    const menu = document.getElementById('msg-context-menu');
    const mask = document.getElementById('context-menu-mask');

    if (!menu || !mask) return;

    mask.style.display = 'block';
    menu.style.display = 'block';
    menu.style.visibility = 'hidden';
    menu.style.left = '0px';
    menu.style.top = '0px';

    const gap = 10;
    const bubbleRect = bubbleEl && typeof bubbleEl.getBoundingClientRect === 'function'
        ? bubbleEl.getBoundingClientRect()
        : null;

    const viewportW = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;

    const menuW = menu.offsetWidth || 260;
    const menuH = menu.offsetHeight || 120;

    let left = gap;
    let top = gap;

    if (bubbleRect) {
        const isRight = !!(bubbleEl.closest && bubbleEl.closest('.msg-right'));
        left = isRight ? (bubbleRect.right - menuW) : bubbleRect.left;

        const preferTop = bubbleRect.top - menuH - gap;
        const preferBottom = bubbleRect.bottom + gap;
        top = preferTop >= gap ? preferTop : preferBottom;

        left = Math.max(gap, Math.min(left, viewportW - menuW - gap));
        top = Math.max(gap, Math.min(top, viewportH - menuH - gap));
    } else if (typeof mouseX === 'number' && typeof mouseY === 'number') {
        left = Math.max(gap, Math.min(mouseX - Math.round(menuW / 2), viewportW - menuW - gap));
        top = Math.max(gap, Math.min(mouseY - Math.round(menuH / 2), viewportH - menuH - gap));
    }

    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.visibility = 'visible';
    menu.classList.add('pop-up-anim');
}



// 关闭菜单
function closeContextMenu() {
    const menu = document.getElementById('msg-context-menu');
    const mask = document.getElementById('context-menu-mask');
    if (menu) menu.style.display = 'none';
    if (mask) mask.style.display = 'none';

    currentSelectedMsgDiv = null;
}

/* =========================================================
   === 6. 菜单功能实现 (编辑、引用、删除、多选) ===
   ========================================================= */

// 全局变量：暂存正在引用的内容
window.currentQuoteInfo = null;

function findMessageIndexByRow(row, roleId) {
    if (!row || !roleId) return -1;
    const list = window.chatData[roleId];
    if (!Array.isArray(list)) return -1;
    const msgIdAttr = row.getAttribute('data-msg-id');
    if (msgIdAttr) {
        const id = String(msgIdAttr || '').trim();
        if (id) {
            for (let i = 0; i < list.length; i++) {
                const m = list[i];
                if (!m) continue;
                if (String(m.id || '') === id) return i;
            }
        }
    }
    const tsAttr = row.getAttribute('data-timestamp');
    const typeAttr = row.getAttribute('data-type') || '';
    const roleAttr = row.getAttribute('data-role') || (row.classList.contains('msg-right') ? 'me' : 'ai');
    const ts = tsAttr ? parseInt(tsAttr, 10) : NaN;
    if (!isNaN(ts)) {
        for (let i = 0; i < list.length; i++) {
            const m = list[i];
            if (!m) continue;
            const mt = m.timestamp || 0;
            const mr = m.role || '';
            const ty = m.type || '';
            if (mt === ts && mr === roleAttr && ty === typeAttr) {
                return i;
            }
        }
    }
    const chatBody = document.getElementById('chat-history');
    if (!chatBody) return -1;
    const allRows = Array.from(chatBody.querySelectorAll('.msg-row'));
    return allRows.indexOf(row);
}

// 核心：菜单动作分发
window.menuAction = function (actionType) {
    if (!currentSelectedMsgDiv) return;

    // 1. 获取当前点击的气泡元素 和 文本
    // 🔥 重点：这里用局部变量 bubble 存住了引用
    const bubble = currentSelectedMsgDiv;
    const originalText = bubble.innerText;

    // 2. 获取这行消息的 DOM
    const row = bubble.closest('.msg-row');

    const roleId = window.currentChatRole;

    // 关闭菜单 (这会把 currentSelectedMsgDiv 设为 null，所以下面必须用 bubble 变量)
    closeContextMenu();

    switch (actionType) {
        case 'edit':
            const newText = prompt("编辑消息:", originalText);
            if (newText !== null && newText.trim() !== "") {
                const trimmed = String(newText).trim();
                bubble.innerText = trimmed;
                const index = findMessageIndexByRow(row, roleId);
                if (window.chatData[roleId] && index >= 0 && window.chatData[roleId][index]) {
                    window.chatData[roleId][index].content = trimmed;
                }
                try {
                    saveData();
                } catch (e) { }
                try {
                    if (typeof window.rebuildMemoryArchive === 'function') {
                        window.rebuildMemoryArchive(roleId);
                    } else if (typeof window.maybeAutoUpdateMemoryArchive === 'function') {
                        window.maybeAutoUpdateMemoryArchive(roleId);
                    }
                } catch (e2) { }
            }
            break;

        case 'quote':
            const quoteBar = document.getElementById('quote-bar');
            const quoteContent = document.getElementById('quote-content');
            const input = document.getElementById('msg-input');
            const index = findMessageIndexByRow(row, roleId);
            const msgObj = (window.chatData && window.chatData[roleId] && index >= 0) ? window.chatData[roleId][index] : null;
            const quoteId = msgObj ? ensureChatMessageId(msgObj) : '';
            const isMe = row.classList.contains('msg-right');
            const name = isMe ? "我" : (document.getElementById('current-chat-name').innerText || "TA");
            const quoteText = msgObj ? getMessagePlainText(msgObj) : originalText;
            window.currentQuoteInfo = { quoteId: quoteId, name: name, text: quoteText };
            if (quoteBar && quoteContent) {
                quoteBar.style.display = 'flex';
                let shortText = String(quoteText || '').replace(/\s+/g, ' ').trim();
                if (shortText.length > 120) shortText = shortText.substring(0, 120) + '...';
                quoteContent.innerText = `${name}: ${shortText}`;
            }
            if (input) input.focus();
            break;

        case 'delete':
            if (confirm("确定删除这条消息吗？")) {
                const index = findMessageIndexByRow(row, roleId);
                row.remove();
                if (window.chatData[roleId] && index >= 0) {
                    window.chatData[roleId].splice(index, 1);
                    saveData();
                }
            }
            break;

        case 'copy':
            navigator.clipboard.writeText(originalText).then(() => console.log("已复制"));
            break;

        case 'fav':
            (function () {
                const index = findMessageIndexByRow(row, roleId);
                let msgObj = (window.chatData && window.chatData[roleId] && index >= 0) ? window.chatData[roleId][index] : null;
                if (!msgObj) {
                    const ts = row && row.getAttribute ? parseInt(row.getAttribute('data-timestamp') || '', 10) : NaN;
                    msgObj = {
                        role: row && row.classList && row.classList.contains('msg-right') ? 'me' : 'ai',
                        type: row && row.getAttribute ? (row.getAttribute('data-type') || 'text') : 'text',
                        content: originalText,
                        timestamp: !isNaN(ts) ? ts : Date.now()
                    };
                    const rid = row && row.getAttribute ? String(row.getAttribute('data-msg-id') || '').trim() : '';
                    if (rid) msgObj.id = rid;
                }
                if (typeof window.addFavoriteMessage === 'function') {
                    window.addFavoriteMessage(roleId, msgObj);
                    showCenterToast('已添加至收藏');
                }
            })();
            break;

        case 'multi':
            enterMultiSelectMode();
            break;

        case 'recall':
            (function () {
                if (!row || !roleId) return;
                const index = findMessageIndexByRow(row, roleId);
                const list = window.chatData && window.chatData[roleId];
                if (!Array.isArray(list) || index < 0 || !list[index]) return;
                const target = list[index];
                const keepId = ensureChatMessageId(target);
                const isMe = target.role === 'me';
                let content = isMe ? '你撤回了一条消息' : '你撤回了对方的一条消息';
                if (!isMe) {
                    let preview = getMessagePlainText(target).replace(/\s+/g, ' ').trim();
                    if (preview.length > 60) preview = preview.substring(0, 60) + '...';
                    if (preview) content = content + `：「${preview}」`;
                }

                const placeholder = {
                    id: keepId,
                    role: 'system',
                    type: 'system',
                    content: content,
                    timestamp: typeof target.timestamp === 'number' ? target.timestamp : Date.now(),
                    recalled: true,
                    recalledRole: target.role,
                    recalledType: target.type
                };

                list.splice(index, 1, placeholder);
                try { saveData(); } catch (e) { }

                const replacement = createMessageRow(placeholder);
                if (!replacement) return;
                if (typeof row.animate === 'function') {
                    try {
                        const anim = row.animate(
                            [
                                { transform: 'scale(1)', opacity: 1 },
                                { transform: 'scale(0.8)', opacity: 0 }
                            ],
                            { duration: 160, easing: 'ease-out', fill: 'forwards' }
                        );
                        anim.onfinish = function () {
                            try {
                                row.parentNode.replaceChild(replacement, row);
                            } catch (e2) { }
                        };
                        return;
                    } catch (e3) { }
                }
                row.classList.add('msg-recall-leave');
                setTimeout(function () {
                    try {
                        row.parentNode.replaceChild(replacement, row);
                    } catch (e2) { }
                }, 170);
            })();
            break;

        case 'forward':
            // 🔥 修复点：这里直接用 bubble，不再判断 currentSelectedMsgDiv
            if (bubble) {
                const text = bubble.innerText;
                openForwardModal(text); // 打开弹窗，传入单条文本
            }
            break;
    }
};


// --- 引用功能的配套函数 ---

// 取消引用
window.cancelQuote = function () {
    const bar = document.getElementById('quote-bar');
    if (bar) bar.style.display = 'none';
    window.currentQuoteInfo = null;
};

window.sendMessage = sendMessage;



// --- 进入多选模式 ---
function enterMultiSelectMode() {
    const chatBody = document.getElementById('chat-history');
    const inputArea = document.querySelector('.chat-room-footer').parentNode; // 获取包含输入框和引用条的大容器
    const multiBar = document.getElementById('multi-select-bar');

    if (!chatBody || !multiBar) return;

    // 1. 样式切换
    chatBody.classList.add('select-mode');

    // 2. 底部栏切换：隐藏输入框，显示工具栏
    if (inputArea) inputArea.style.display = 'none';
    multiBar.style.display = 'flex';

    // 3. 给聊天区域下的所有直接子元素绑定点击事件，实现“全能多选”
    const children = Array.from(chatBody.children || []);
    children.forEach(el => {
        el.onclick = function (e) {
            if (!chatBody.classList.contains('select-mode')) return;
            e.preventDefault();
            e.stopPropagation();
            this.classList.toggle('selected');
        };
    });

    // 4. 修改顶部导航栏 (增加一个"完成"按钮来退出多选)
    const header = document.querySelector('.chat-room-header');
    const menuBtn = header.querySelector('.chat-room-menu');

    // 备份原来的右侧按钮（只在第一次进入多选时备份）
    if (!window.originalHeaderRight) {
        window.originalHeaderRight = menuBtn.innerHTML;
        window.originalHeaderClick = menuBtn.getAttribute('onclick');
    }

    // 清除所有事件监听，避免重复绑定
    const newMenuBtn = menuBtn.cloneNode(true);
    menuBtn.parentNode.replaceChild(newMenuBtn, menuBtn);

    // 设置新内容和事件
    newMenuBtn.innerHTML = '<span style="font-size:16px; color:#07c160; font-weight:bold;">完成</span>';
    newMenuBtn.removeAttribute('onclick');
    newMenuBtn.addEventListener('click', exitMultiSelectMode);
}

// --- 退出多选模式 ---
function exitMultiSelectMode() {
    const inputArea = document.querySelector('.chat-room-footer').parentNode;
    const multiBar = document.getElementById('multi-select-bar');

    // 1. 恢复样式
    const chatBody = document.getElementById('chat-history');
    if (chatBody) chatBody.classList.remove('select-mode');

    // 2. 恢复底部栏
    if (multiBar) multiBar.style.display = 'none';
    if (inputArea) inputArea.style.display = 'block';

    // 3. 清除所有选中状态与点击事件
    if (chatBody) {
        const children = Array.from(chatBody.children || []);
        children.forEach(el => {
            el.classList.remove('selected');
            el.onclick = null;
        });
    }

    // 4. 恢复顶部导航栏
    const header = document.querySelector('.chat-room-header');
    if (!header) return;

    const menuBtn = header.querySelector('.chat-room-menu');
    if (!menuBtn) return;

    // 使用 cloneNode 清除所有事件监听
    const newMenuBtn = menuBtn.cloneNode(true);
    menuBtn.parentNode.replaceChild(newMenuBtn, menuBtn);

    // 恢复原始内容和事件
    if (window.originalHeaderRight) {
        newMenuBtn.innerHTML = window.originalHeaderRight;
        if (window.originalHeaderClick) {
            newMenuBtn.setAttribute('onclick', window.originalHeaderClick);
        }
    }
}


// 导出关闭函数给 HTML 用
window.closeContextMenu = closeContextMenu;
// --- 执行多选操作 (转发/收藏/删除) ---
window.performMultiAction = function (type) {
    const chatBody = document.getElementById('chat-history');
    if (!chatBody) return;
    // 获取所有被选中的元素（不限于 msg-row）
    const selectedRows = Array.from(chatBody.querySelectorAll('.selected'));

    if (selectedRows.length === 0) {
        alert("请先选择消息");
        return;
    }

    if (type === 'delete') {
        if (!confirm(`确定删除这 ${selectedRows.length} 条消息吗？`)) return;

        const roleId = window.currentChatRole;
        if (window.chatData[roleId]) {
            const list = window.chatData[roleId];
            const indicesToDelete = [];
            selectedRows.forEach(row => {
                const tsAttr = row.getAttribute('data-timestamp');
                if (!tsAttr) return;
                const ts = parseInt(tsAttr, 10);
                if (isNaN(ts)) return;
                for (let i = list.length - 1; i >= 0; i--) {
                    const m = list[i];
                    if (!m) continue;
                    if (m.timestamp === ts) {
                        indicesToDelete.push(i);
                        break;
                    }
                }
            });
            const uniqueSorted = Array.from(new Set(indicesToDelete)).sort((a, b) => b - a);
            uniqueSorted.forEach(index => {
                list.splice(index, 1);
            });
            saveData();
        }

        // 3. 删除界面 DOM
        selectedRows.forEach(row => row.remove());

        // 4. 退出多选模式
        exitMultiSelectMode();

    } else if (type === 'fav') {
        const roleId = window.currentChatRole;
        let added = 0;
        selectedRows.forEach(function (row) {
            if (!row || !row.classList || !row.classList.contains('msg-row')) return;
            const index = findMessageIndexByRow(row, roleId);
            const msgObj = (window.chatData && window.chatData[roleId] && index >= 0) ? window.chatData[roleId][index] : null;
            if (!msgObj) return;
            if (typeof window.addFavoriteMessage === 'function') {
                window.addFavoriteMessage(roleId, msgObj);
                added++;
            }
        });
        if (added > 0) {
            showCenterToast('已添加至收藏');
        } else {
            showCenterToast('未找到可收藏的消息');
        }
        exitMultiSelectMode();
    } else if (type === 'forward') {
        // 1. 收集选中的消息数据
        const historyList = [];

        selectedRows.forEach(row => {
            const bubble = row.querySelector('.msg-bubble');
            if (!bubble) return;

            // 判断是谁发的
            const isMe = row.classList.contains('msg-right');
            // 获取对方名字 (如果不是我)
            let name = "我";
            if (!isMe) {
                const titleEl = document.getElementById('current-chat-name');
                name = titleEl ? titleEl.innerText : "对方";
            }

            historyList.push({
                name: name,
                text: bubble.innerText
            });
        });

        if (historyList.length > 0) {
            // 🔥 重点：传入数组，而不是字符串
            openForwardModal(historyList);
        }

        exitMultiSelectMode();
    }
};

/* =========================================================
   === 7. 转发功能 ===
   ========================================================= */

// 打开转发弹窗
window.openForwardModal = function (messageText) {
    const modal = document.getElementById('forward-modal');
    const listContainer = document.getElementById('forward-contact-list');

    if (!modal || !listContainer) return;

    const headerTitle = modal.querySelector('.forward-header span:first-child');
    if (headerTitle) {
        headerTitle.textContent = '选择发送给...';
    }

    // 清空列表
    listContainer.innerHTML = '';

    // 获取所有角色（排除当前聊天的角色）
    const allRoles = Object.keys(window.charProfiles);
    const currentRole = window.currentChatRole;

    if (allRoles.length <= 1) {
        listContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">暂无其他联系人</div>';
    } else {
        allRoles.forEach(roleId => {
            // 跳过当前聊天对象
            if (roleId === currentRole) return;

            const profile = window.charProfiles[roleId];
            const item = document.createElement('div');
            item.className = 'forward-item';
            item.onclick = function () {
                forwardMessageTo(roleId, messageText);
            };

            item.innerHTML = `
                <img src="${profile.avatar || 'assets/chushitouxiang.jpg'}" class="forward-avatar">
                <span class="forward-name">${profile.nickName}</span>
            `;

            listContainer.appendChild(item);
        });
    }

    // 显示弹窗
    modal.style.display = 'flex';
};

// 关闭转发弹窗
window.closeForwardModal = function () {
    const modal = document.getElementById('forward-modal');
    if (modal) modal.style.display = 'none';
};

// 执行转发
function forwardMessageTo(targetRoleId, contentData) {
    // 1. 初始化
    if (!window.chatData[targetRoleId]) {
        window.chatData[targetRoleId] = [];
    }

    const now = Date.now();
    let newMsg = {};

    // 2. 判断是 单条文本 还是 聊天记录数组
    if (Array.isArray(contentData)) {
        // === 多条合并 (聊天记录) ===
        // 简略预览图，只取前3条显示在气泡里
        const previewList = contentData.slice(0, 3).map(item => `${item.name}: ${item.text}`);
        if (contentData.length > 3) previewList.push("...");

        newMsg = {
            role: 'me',
            type: 'history', // 🔥 标记为历史记录类型
            content: "[聊天记录]", // 列表页显示的预览文本
            detail: contentData, // 完整数据存这里
            preview: previewList, // 气泡显示的文本数组
            timestamp: now
        };

    } else {
        // === 单条文本 ===
        newMsg = {
            role: 'me',
            type: 'text', // 默认为文本
            content: contentData,
            timestamp: now
        };
    }

    // 3. 存入
    window.chatData[targetRoleId].push(newMsg);
    saveData();

    // 4. 关闭并提示
    closeForwardModal();
    const targetName = window.charProfiles[targetRoleId]?.nickName || '联系人';
    alert(`已转发给 ${targetName}`);
}

// 导出函数
window.forwardMessageTo = forwardMessageTo;


/* =========================================================
   === 5. Settings Logic (Memory, Summary, CSS) ===
   ========================================================= */

window.openChatSettings = function () {
    const roleId = window.currentChatRole;
    const menu = document.getElementById('settings-menu-modal');
    if (!menu || !roleId) return;

    if (typeof window.initChatSettingsUI === 'function') {
        window.initChatSettingsUI(roleId);
    }

    const profiles = (window.charProfiles && typeof window.charProfiles === 'object') ? window.charProfiles : {};
    const profile = profiles[roleId] || {};

    const avatar = document.getElementById('menu-role-avatar');
    if (avatar) avatar.src = profile.avatar || 'assets/chushitouxiang.jpg';

    const name = document.getElementById('menu-role-name');
    if (name) name.innerText = profile.nickName || profile.name || '未知角色';

    const desc = document.getElementById('menu-role-desc');
    if (desc) desc.innerText = profile.desc ? (profile.desc.substring(0, 15) + '...') : '点击查看档案...';

    menu.style.display = 'flex';
}

window.closeSettingsMenu = function () {
    const modal = document.getElementById('settings-menu-modal');
    if (modal) modal.style.display = 'none';
}

window.loadChatSettings = function () {
    const roleId = window.currentChatRole;
    if (typeof window.initChatSettingsUI === 'function') {
        window.initChatSettingsUI(roleId);
    }
}

window.saveChatSettings = function () {
    // 1. Memory Limit
    const limitInput = document.getElementById('setting-memory-limit');
    if (limitInput) localStorage.setItem('chat_memory_limit', limitInput.value);

    // 2. Auto Summary
    const summarySwitch = document.getElementById('setting-auto-summary-switch');
    if (summarySwitch) localStorage.setItem('chat_auto_summary', summarySwitch.checked);

    const freqInput = document.getElementById('setting-summary-freq');
    if (freqInput) localStorage.setItem('chat_summary_freq', freqInput.value);

    // 3. Bubble CSS
    const cssInput = document.getElementById('setting-bubble-css');
    if (cssInput) {
        const css = cssInput.value;
        localStorage.setItem('chat_bubble_css', css);
        window.applyBubbleCSS(css);
    }
}

window.toggleSummaryInput = function () {
    const switchEl = document.getElementById('setting-auto-summary-switch');
    const box = document.getElementById('setting-summary-freq-box');
    if (switchEl && box) {
        box.style.display = switchEl.checked ? 'flex' : 'none';
    }
}

window.updateBubblePreview = function () {
    const cssInput = document.getElementById('setting-bubble-css');
    const preview = document.getElementById('bubble-preview');
    if (cssInput && preview) {
        const css = cssInput.value || '';
        const trimmed = String(css).trim();
        const hasSelectorSyntax = /[{]/.test(trimmed) || /[}]/.test(trimmed);
        const baseStyle = 'background: #ffffff; padding: 10px; border-radius: 4px; font-size: 15px; position: relative; max-width: 70%; border: 1px solid #ededed; color: #000;';
        preview.style.cssText = hasSelectorSyntax ? baseStyle : baseStyle + ' ' + trimmed;
    }
}

window.applyBubbleCSS = function (css) {
    let styleTag = document.getElementById('user-custom-css');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'user-custom-css';
        document.head.appendChild(styleTag);
    }

    const raw = css || '';
    const trimmed = String(raw).trim();
    if (!trimmed) {
        styleTag.innerHTML = '';
        return;
    }

    // 只允许修改气泡相关样式，强制加上作用域前缀，禁止影响全局布局/点击
    let finalCSS = trimmed;
    const hasBlock = /[{]/.test(trimmed) || /[}]/.test(trimmed);
    const startsWithSelector = /^[.#\w-]+\s*\{/.test(trimmed);

    if (!hasBlock && !startsWithSelector) {
        // 简写：直接当作内联样式应用到自定义气泡内容
        finalCSS = `.custom-bubble-content { ${trimmed} }`;
    } else {
        // 语法包含选择器/花括号时：统一包裹在 .custom-bubble-scope 作用域下
        finalCSS = `
.custom-bubble-scope {
}
.custom-bubble-scope .custom-bubble-content,
.custom-bubble-scope .msg-bubble,
.custom-bubble-scope .msg-text {
${trimmed}
}
`;
    }

    styleTag.innerHTML = finalCSS;
}

// Initialize settings on load
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(window.loadChatSettings, 500);
});

/* =========================================================
   === 记忆档案：UI + 数据 + 自动总结写入 (本地版) ===
   ========================================================= */

(function initMemoryArchiveModule() {
    const STORAGE_KEY = 'wechat_memory_archive_v1';

    // 数据结构：{ [roleId]: { likesText, habitsText, eventsText, meta:{ lastProcessedIndex } } }
    window.memoryArchiveStore = window.memoryArchiveStore || {};

    function loadStore() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) window.memoryArchiveStore = JSON.parse(raw) || {};
        } catch (e) {
            console.error('[MemoryArchive] load failed', e);
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
            console.error('[MemoryArchive] save failed', e);
        }
    }

    function getRoleArchive(roleId) {
        if (!roleId) roleId = window.currentChatRole || '';
        if (!window.memoryArchiveStore[roleId]) {
            window.memoryArchiveStore[roleId] = {
                likesText: "",
                habitsText: "",
                eventsText: "",
                meta: {
                    lastProcessedIndex: 0,
                    updatedAt: Date.now()
                }
            };
            saveStore();
        }

        const archive = window.memoryArchiveStore[roleId];

        if (archive.meta && archive.meta.lastProcessedIndex === 0) {
            const keys = ['likesText', 'habitsText', 'eventsText'];
            let changed = false;
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const val = archive[key];
                if (typeof val === 'string' && (val.indexOf("（示例）") !== -1 || val.indexOf("开启“自动总结”后") !== -1)) {
                    archive[key] = "";
                    changed = true;
                }
            }
            if (changed) saveStore();
        }

        if (!archive.meta) {
            archive.meta = { lastProcessedIndex: 0, updatedAt: Date.now() };
        }
        if (typeof archive.meta.lastProcessedIndex !== 'number') {
            archive.meta.lastProcessedIndex = 0;
        }
        return archive;
    }

    function setActiveTab(tabKey) {
        const modal = document.getElementById('memory-archive-modal');
        if (!modal) return;

        const allTabs = modal.querySelectorAll('.memory-tab-item');
        allTabs.forEach(btn => {
            const key = btn.getAttribute('data-key');
            if (key === tabKey) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    function renderArchive(tabKey) {
        const roleId = window.currentChatRole;
        const archive = getRoleArchive(roleId);

        const textEl = document.getElementById('memory-archive-text');

        const textMap = {
            likes: archive.likesText || '',
            habits: archive.habitsText || '',
            events: archive.eventsText || ''
        };

        const raw = textMap[tabKey] || '';
        const lines = raw
            ? String(raw)
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .filter(line => !line.includes("（示例）") && !line.includes("开启“自动总结”后") && !/<[^>]+>/.test(line))
            : [];

        if (textEl) {
            textEl.innerHTML = '';
            if (!lines.length) {
                textEl.innerHTML = '<div style="text-align:center; color:#999; margin-top:20px;">暂无记忆</div>';
            } else {
                const ul = document.createElement('ul');
                ul.style.listStyle = 'none';
                ul.style.padding = '0';
                ul.style.margin = '0';
                lines.forEach((line, index) => {
                    const li = document.createElement('li');
                    li.innerText = line.replace(/^[-•\s]+/, '');
                    li.setAttribute('data-index', String(index));
                    li.setAttribute('data-key', tabKey);
                    li.style.cursor = 'pointer';
                    li.onclick = function () {
                        handleMemoryArchiveItemClick(tabKey, index);
                    };
                    ul.appendChild(li);
                });
                textEl.appendChild(ul);
            }
        }
    }

    // === UI 交互：打开/关闭/切换 ===
    window.openMemoryArchiveModal = function () {
        loadStore();

        // 先关闭上一级菜单（避免层级遮挡）
        const menu = document.getElementById('settings-menu-modal');
        if (menu) menu.style.display = 'none';

        disableChatStatusBarInteraction();

        const modal = document.getElementById('memory-archive-modal');
        if (modal) modal.style.display = 'flex';

        // Update Identity and Stats
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

            // === Stats 统计计算 (修复版：反映真实的 API 压缩量) ===
            const msgs = (window.chatData && window.chatData[roleId]) ? window.chatData[roleId] : [];
            let msgCount = msgs.length;
            let tokenCount = 0;
            let daysCount = 0;

            if (msgs.length > 0) {
                // 相识天数：依然按照用户界面上物理聊天记录的最早时间计算
                const firstMsg = msgs[0];
                if (firstMsg && firstMsg.timestamp) {
                    const diff = Date.now() - firstMsg.timestamp;
                    daysCount = Math.ceil(diff / (1000 * 60 * 60 * 24));
                } else {
                    daysCount = 1;
                }

                // 消息条数和 Token 数：调用 api.js 中过滤后的实际发送量来计算
                if (typeof window.refreshActiveTokensUI === 'function') {
                    const stats = window.refreshActiveTokensUI(roleId, false);
                    // msgCount 保持 msgs.length 不变，只更新 tokenCount
                    tokenCount = stats.tokenCount;
                } else {
                    // 兜底逻辑
                    msgs.forEach(m => {
                        if (!m) return;
                        if (typeof m.content === 'string') tokenCount += m.content.length;
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

        // 默认选中第一个标签
        window.currentMemoryArchiveTab = 'likes';
        setActiveTab('likes');
        renderArchive('likes');
    };

    window.closeMemoryArchiveModal = function () {
        const modal = document.getElementById('memory-archive-modal');
        if (modal) modal.style.display = 'none';

        enableChatStatusBarInteraction();

        // 返回上一级：重新显示聊天设置菜单
        const menu = document.getElementById('settings-menu-modal');
        if (menu) menu.style.display = 'flex';
    };

    window.switchMemoryArchiveTab = function (tabKey) {
        window.currentMemoryArchiveTab = tabKey;
        setActiveTab(tabKey);
        renderArchive(tabKey);
    };

    function handleMemoryArchiveItemClick(tabKey, index) {
        const roleId = window.currentChatRole;
        if (!roleId) return;
        const archive = getRoleArchive(roleId);
        const map = {
            likes: 'likesText',
            habits: 'habitsText',
            events: 'eventsText'
        };
        const fieldKey = map[tabKey];
        if (!fieldKey) return;

        const raw = archive[fieldKey] || '';
        const lines = raw
            ? String(raw)
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .filter(line => !line.includes("（示例）") && !line.includes("开启“自动总结”后") && !/<[^>]+>/.test(line))
            : [];

        if (index < 0 || index >= lines.length) return;

        const originalLine = lines[index];
        const visibleText = originalLine.replace(/^[-•\s]+/, '');
        const edited = window.prompt('编辑记忆（留空则删除）', visibleText);
        if (edited === null) return;
        const trimmed = String(edited).trim();

        if (!trimmed) {
            lines.splice(index, 1);
        } else {
            const prefixMatch = originalLine.match(/^(\s*[-•]\s*)/);
            const prefix = prefixMatch ? prefixMatch[1] : '- ';
            lines[index] = prefix + trimmed;
        }

        archive[fieldKey] = lines.join('\n');
        if (!archive.meta) archive.meta = { lastProcessedIndex: 0, updatedAt: Date.now() };
        archive.meta.updatedAt = Date.now();
        window.memoryArchiveStore[roleId] = archive;
        saveStore();

        const currentTab = window.currentMemoryArchiveTab || tabKey;
        setActiveTab(currentTab);
        renderArchive(currentTab);
    }

    window.addMemoryArchiveItem = function () {
        const roleId = window.currentChatRole;
        if (!roleId) return;
        const inputEl = document.getElementById('memory-archive-input');
        if (!inputEl) return;
        const value = String(inputEl.value || '').trim();
        if (!value) return;

        const tabKey = window.currentMemoryArchiveTab || 'likes';
        const map = {
            likes: 'likesText',
            habits: 'habitsText',
            events: 'eventsText'
        };
        const fieldKey = map[tabKey];
        if (!fieldKey) return;

        const archive = getRoleArchive(roleId);
        const linesToAdd = value
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean)
            .map(l => `- ${l}`);

        archive[fieldKey] = uniqueAppend(archive[fieldKey], linesToAdd);
        if (!archive.meta) archive.meta = { lastProcessedIndex: 0, updatedAt: Date.now() };
        archive.meta.updatedAt = Date.now();
        window.memoryArchiveStore[roleId] = archive;
        saveStore();

        inputEl.value = '';
        setActiveTab(tabKey);
        renderArchive(tabKey);
    };

    // === 自动总结：本地规则版（保证离线可用，不依赖 API）===
    function normalizeText(s) {
        return (s || '')
            .replace(/^「回复：[\s\S]*?」\s*\n-+\s*\n/i, '') // 去掉引用发送的头
            .replace(/\r/g, '')
            .trim();
    }

    function containsAny(text, keywords) {
        const s = String(text || '');
        for (let i = 0; i < keywords.length; i++) {
            if (s.includes(keywords[i])) return true;
        }
        return false;
    }

    function normalizeSummaryLine(s) {
        const text = String(s || '').trim().replace(/^[-•\s]+/, '').trim();
        return text;
    }

    function isEmojiOnlyText(s) {
        const text = String(s || '').trim();
        if (!text) return false;
        const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
        const removed = text.replace(emojiRegex, '').replace(/\s/g, '');
        if (removed.length !== 0) return false;
        return !!text.match(emojiRegex);
    }

    function isEmojiHeavyMessage(m) {
        if (!m) return false;
        if (m.type === 'image') return true;
        if (m.type !== 'text') return false;
        const t = normalizeText(m.content);
        if (!t) return false;
        return isEmojiOnlyText(t) || t.length <= 2;
    }

    function uniqueAppend(baseText, linesToAdd) {
        const base = (baseText || '').trim();
        const existing = new Set(
            base
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean)
        );
        const out = [];
        linesToAdd.forEach(l => {
            const line = (l || '').trim();
            if (!line) return;
            if (existing.has(line)) return;
            existing.add(line);
            out.push(line);
        });
        if (!out.length) return baseText || '';
        return (base ? (base + '\n') : '') + out.join('\n');
    }

    function summarizeSegment(segmentMsgs) {
        const likes = [];
        const habits = [];
        const events = [];

        const userMsgs = (Array.isArray(segmentMsgs) ? segmentMsgs : []).filter(m => m && m.role === 'me');
        const userText = userMsgs
            .map(m => (m && m.type === 'text') ? normalizeText(m.content) : '')
            .filter(Boolean)
            .join('\n');

        const stopVals = new Set(['这个', '那个', '这样', '那样', '这种', '那种', '它', '啥', '什么']);

        const likePosRegex = /(喜欢|最喜欢|偏爱|爱吃|爱喝|爱看|爱玩|迷上|沉迷)\s*([^，。！？\n]{1,18})/g;
        const likeNegRegex = /(讨厌|不喜欢|不爱|不太喜欢|不想|不吃|怕|过敏|忌口)\s*([^，。！？\n]{1,18})/g;

        for (let i = 0; i < userMsgs.length; i++) {
            const m = userMsgs[i];
            if (!m) continue;
            if (m.type !== 'text') continue;
            const t = normalizeText(m.content);
            if (!t) continue;

            likePosRegex.lastIndex = 0;
            let match;
            while ((match = likePosRegex.exec(t)) !== null) {
                const val = String(match[2] || '').trim();
                if (!val) continue;
                if (stopVals.has(val)) continue;
                if (val.length === 1 && (val === '你' || val === '他' || val === '她' || val === '我')) continue;
                likes.push(`- 用户喜欢：${val}`);
            }

            likeNegRegex.lastIndex = 0;
            while ((match = likeNegRegex.exec(t)) !== null) {
                const val = String(match[2] || '').trim();
                if (!val) continue;
                if (stopVals.has(val)) continue;
                if (val.length === 1 && (val === '你' || val === '他' || val === '她' || val === '我')) continue;
                likes.push(`- 用户讨厌/避开：${val}`);
            }
        }

        const habitRegexList = [
            /(习惯|经常|总是|每天|通常|一般|老是|一直)\s*([^，。！？\n]{1,24})/g,
            /(熬夜|晚起|早起|失眠|夜宵|运动|健身|跑步|喝咖啡|加班|通勤|追剧|刷手机|吃辣|清淡)/g
        ];

        for (let i = 0; i < userMsgs.length; i++) {
            const m = userMsgs[i];
            if (!m) continue;
            if (m.type !== 'text') continue;
            const t = normalizeText(m.content);
            if (!t) continue;

            for (let j = 0; j < habitRegexList.length; j++) {
                const rgx = habitRegexList[j];
                rgx.lastIndex = 0;
                let match;
                while ((match = rgx.exec(t)) !== null) {
                    const tail = String(match[2] || match[1] || '').trim();
                    if (!tail) continue;
                    if (containsAny(tail, ['说话', '聊天', '打字', '语气', '口癖', '句尾'])) {
                        if (!containsAny(tail, ['表情', '表情包'])) continue;
                    }
                    habits.push(`- 用户习惯：${tail}`);
                }
            }
        }

        const emojiHeavyCount = userMsgs.filter(isEmojiHeavyMessage).length;
        if (userMsgs.length >= 3 && emojiHeavyCount / userMsgs.length >= 0.6) {
            habits.push('- 用户经常用表情包表达情绪');
        }

        const isTrivialChatLine = (t) => {
            const s = String(t || '').trim();
            if (!s) return true;
            if (s.length <= 3) return true;
            if (/^(嗯+|哦+|好+|好的+|行+|在吗+|哈哈+|hhh+|ok+|收到+|是的+|对+|？+|。+)$/i.test(s)) return true;
            return false;
        };

        const recentUserTexts = userMsgs
            .filter(m => m && m.type === 'text')
            .map(m => normalizeText(m.content))
            .filter(t => t && !isTrivialChatLine(t))
            .slice(-2);

        recentUserTexts.forEach(t => {
            const short = t.length > 60 ? t.slice(0, 60) + '...' : t;
            events.push(`- 最近：${short}`);
        });

        const recentAiCommit = (Array.isArray(segmentMsgs) ? segmentMsgs : [])
            .filter(m => m && m.role === 'ai' && m.type === 'text')
            .map(m => normalizeText(m.content))
            .filter(t => t && !isTrivialChatLine(t))
            .slice(-6)
            .reverse()
            .find(t => /我(会|可以|帮|尽量|记得|下次|以后)/.test(t));

        if (recentAiCommit) {
            const short = recentAiCommit.length > 60 ? recentAiCommit.slice(0, 60) + '...' : recentAiCommit;
            events.push(`- 最近：我说过${short}`);
        }

        const uniq = (arr) => Array.from(new Set(arr.map(s => String(s || '').trim()).filter(Boolean)));
        return {
            likes: uniq(likes),
            habits: uniq(habits),
            events: uniq(events)
        };
    }

    // 对外：每次有新消息时调用，按设置频率“累计到阈值再写入”
    window.maybeAutoUpdateMemoryArchive = function (roleId) {
        try {
            if (!roleId) roleId = window.currentChatRole;
            if (!roleId) return;

            let autoOn = false;
            let freq = 20;

            try {
                if (typeof window.getCurrentChatSettings === 'function') {
                    const settings = window.getCurrentChatSettings(roleId) || {};
                    if (typeof settings.autoSummary === 'boolean') {
                        autoOn = settings.autoSummary;
                    }
                    if (typeof settings.summaryFreq === 'number' && settings.summaryFreq > 0) {
                        freq = settings.summaryFreq;
                    }
                }
            } catch (e) { }

            if (!autoOn) {
                autoOn = localStorage.getItem('chat_auto_summary') === 'true';
            }
            if (!freq) {
                const legacyFreq = parseInt(localStorage.getItem('chat_summary_freq'), 10);
                if (!isNaN(legacyFreq) && legacyFreq > 0) {
                    freq = legacyFreq;
                }
            }

            if (!autoOn) return;

            const history = window.chatData[roleId] || [];
            if (!Array.isArray(history)) return;

            loadStore();
            const archive = getRoleArchive(roleId);
            const lastIdx = archive.meta.lastProcessedIndex || 0;
            const pendingCount = history.length - lastIdx;

            if (pendingCount < freq) return; // 未到阈值，不总结

            const segment = history.slice(lastIdx);

            // 防抖：同一角色同时只跑一个总结请求
            if (!archive.meta) archive.meta = {};
            if (archive.meta.summaryInProgress) return;
            archive.meta.summaryInProgress = true;
            window.memoryArchiveStore[roleId] = archive;
            saveStore();

            const profile = window.charProfiles[roleId] || {};
            const userPersonaObj = (window.userPersonas && window.userPersonas[roleId]) || {};
            const userPersona = userPersonaObj.setting || "";
            const userName = userPersonaObj.name || ""; // 🔥 新增：提取用户名字
            const userGender = userPersonaObj.gender || ""; // 🔥 新增：提取用户性别

            // 把片段整理成可读文本（用户/AI）
            const segmentText = segment
                .filter(m => m && (m.role === 'me' || m.role === 'ai') && m.content)
                .slice(-200) // 极限兜底，避免太长
                .map(m => {
                    const who = m.role === 'me' ? '用户' : 'AI';
                    if (m.type === 'image') return `${who}: [图片/表情包]`;
                    if (m.type === 'voice') return `${who}: [语音]`;
                    if (m.type === 'location' || m.type === 'location_share') return `${who}: [位置]`;
                    return `${who}: ${normalizeText(m.content)}`;
                })
                .filter(Boolean)
                .join('\n');

            const userMsgsForDetect = segment.filter(m => m && m.role === 'me');
            const userTextForDetect = userMsgsForDetect
                .map(m => (m && m.type === 'text') ? normalizeText(m.content) : '')
                .filter(Boolean)
                .join('\n');
            const emojiHeavyRatio = userMsgsForDetect.length
                ? (userMsgsForDetect.filter(isEmojiHeavyMessage).length / userMsgsForDetect.length)
                : 0;

            function filterApiLikes(items) {
                const markers = ['喜欢', '最喜欢', '偏爱', '爱吃', '爱喝', '爱看', '爱玩', '迷上', '沉迷', '讨厌', '不喜欢', '不爱', '不太喜欢', '不想', '不吃', '怕', '过敏', '忌口'];
                return (items || [])
                    .map(normalizeSummaryLine)
                    .filter(Boolean)
                    .filter(s => s.length <= 50)
                    .filter(s => containsAny(s, markers))
                    .filter(s => containsAny(userTextForDetect, markers) || containsAny(segmentText, markers));
            }

            function filterApiHabits(items) {
                const markers = ['习惯', '经常', '总是', '每天', '通常', '一般', '老是', '一直', '熬夜', '晚起', '早起', '失眠', '夜宵', '运动', '健身', '跑步', '喝咖啡', '加班', '通勤', '追剧', '刷手机', '表情', '表情包'];
                return (items || [])
                    .map(normalizeSummaryLine)
                    .filter(Boolean)
                    .filter(s => s.length <= 50)
                    .filter(s => {
                        if (containsAny(s, ['说话', '聊天', '打字', '语气', '口癖', '句尾'])) {
                            return containsAny(s, ['表情', '表情包']);
                        }
                        return true;
                    })
                    .filter(s => containsAny(s, markers) || (emojiHeavyRatio >= 0.6 && containsAny(s, ['表情', '表情包'])));
            }

            function filterApiEvents(items) {
                const filler = ['我们聊了很多', '对话很愉快', '聊得很愉快', '聊得很开心', '聊了不少', '日常闲聊'];
                return (items || [])
                    .map(normalizeSummaryLine)
                    .filter(Boolean)
                    .filter(s => s.length <= 80)
                    .filter(s => /^(我们|今天|最近)/.test(s))
                    .filter(s => !containsAny(s, filler))
                    .filter(s => !/^(我们|今天|最近)[：:]?\s*(聊了很多|聊得很愉快|聊得很开心)/.test(s));
            }

            // ✅ 优先用你的 API 总结（api.js 提供 window.callAISummary）
            if (typeof window.callAISummary === 'function') {
                window.callAISummary(
                    {
                        roleName: profile.nickName || profile.name || 'AI',
                        rolePrompt: profile.desc || '',
                        userPersona,
                        userName,   // 🔥 新增：传入用户名字
                        userGender, // 🔥 新增：传入用户性别
                        segmentText
                    },
                    (res) => {
                        try {
                            // 追加写入（去重）
                            const likesLines = filterApiLikes(res.likes).map(s => `- ${s}`);
                            const habitsLines = filterApiHabits(res.habits).map(s => `- ${s}`);
                            const eventsLines = filterApiEvents(res.events).map(s => `- ${s}`);

                            if (likesLines.length) archive.likesText = uniqueAppend(archive.likesText, likesLines);
                            if (habitsLines.length) archive.habitsText = uniqueAppend(archive.habitsText, habitsLines);
                            if (eventsLines.length) archive.eventsText = uniqueAppend(archive.eventsText, eventsLines);

                            archive.meta.lastProcessedIndex = history.length;
                            archive.meta.updatedAt = Date.now();
                        } finally {
                            archive.meta.summaryInProgress = false;
                            window.memoryArchiveStore[roleId] = archive;
                            saveStore();

                            // 如果面板正开着，实时刷新当前标签内容
                            const modal = document.getElementById('memory-archive-modal');
                            if (modal && modal.style.display !== 'none') {
                                const tab = window.currentMemoryArchiveTab || 'likes';
                                setActiveTab(tab);
                                renderArchive(tab);
                            }
                        }
                    },
                    (_err) => {
                        // 失败也要解除 inProgress，并推进索引避免反复狂刷请求
                        archive.meta.summaryInProgress = false;
                        archive.meta.lastProcessedIndex = history.length;
                        archive.meta.updatedAt = Date.now();
                        window.memoryArchiveStore[roleId] = archive;
                        saveStore();
                    }
                );
                return;
            }

            // ⛑️ 兜底：如果没有 API 总结函数，就用本地规则版
            const localRes = summarizeSegment(segment);
            if (localRes.likes.length) archive.likesText = uniqueAppend(archive.likesText, localRes.likes);
            if (localRes.habits.length) archive.habitsText = uniqueAppend(archive.habitsText, localRes.habits);
            if (localRes.events.length) archive.eventsText = uniqueAppend(archive.eventsText, localRes.events);
            archive.meta.lastProcessedIndex = history.length;
            archive.meta.updatedAt = Date.now();
            archive.meta.summaryInProgress = false;
            window.memoryArchiveStore[roleId] = archive;
            saveStore();

            const modal = document.getElementById('memory-archive-modal');
            if (modal && modal.style.display !== 'none') {
                const tab = window.currentMemoryArchiveTab || 'likes';
                setActiveTab(tab);
                renderArchive(tab);
            }
        } catch (e) {
            console.error('[MemoryArchive] auto update failed', e);
        }
    };

    window.rebuildMemoryArchive = function (roleId) {
        try {
            if (!roleId) roleId = window.currentChatRole;
            if (!roleId) return;

            const history = window.chatData[roleId] || [];
            if (!Array.isArray(history)) return;

            loadStore();
            const archive = getRoleArchive(roleId);
            archive.likesText = "";
            archive.habitsText = "";
            archive.eventsText = "";
            if (!archive.meta) archive.meta = { lastProcessedIndex: 0, updatedAt: Date.now() };
            archive.meta.lastProcessedIndex = 0;
            archive.meta.updatedAt = Date.now();
            archive.meta.summaryInProgress = false;
            window.memoryArchiveStore[roleId] = archive;
            saveStore();

            const profile = window.charProfiles[roleId] || {};
            const userPersonaObj = (window.userPersonas && window.userPersonas[roleId]) || {};
            const userPersona = userPersonaObj.setting || "";
            const userName = userPersonaObj.name || "";
            const userGender = userPersonaObj.gender || "";

            const segment = history.slice(-200);
            const segmentText = segment
                .filter(m => m && (m.role === 'me' || m.role === 'ai') && m.content)
                .map(m => {
                    const who = m.role === 'me' ? '用户' : 'AI';
                    if (m.type === 'image') return `${who}: [图片/表情包]`;
                    if (m.type === 'voice') return `${who}: [语音]`;
                    if (m.type === 'location' || m.type === 'location_share') return `${who}: [位置]`;
                    return `${who}: ${normalizeText(m.content)}`;
                })
                .filter(Boolean)
                .join('\n');

            const finalize = () => {
                const modal = document.getElementById('memory-archive-modal');
                if (modal && modal.style.display !== 'none') {
                    const tab = window.currentMemoryArchiveTab || 'likes';
                    setActiveTab(tab);
                    renderArchive(tab);
                }
            };

            if (typeof window.callAISummary === 'function' && segmentText) {
                archive.meta.summaryInProgress = true;
                window.memoryArchiveStore[roleId] = archive;
                saveStore();

                window.callAISummary(
                    {
                        roleName: profile.nickName || profile.name || 'AI',
                        rolePrompt: profile.desc || '',
                        userPersona,
                        userName,
                        userGender,
                        segmentText
                    },
                    (res) => {
                        try {
                            const likesLines = (res && res.likes ? res.likes : [])
                                .map(normalizeSummaryLine)
                                .filter(Boolean)
                                .slice(0, 80)
                                .map(s => `- ${s}`);
                            const habitsLines = (res && res.habits ? res.habits : [])
                                .map(normalizeSummaryLine)
                                .filter(Boolean)
                                .slice(0, 80)
                                .map(s => `- ${s}`);
                            const eventsLines = (res && res.events ? res.events : [])
                                .map(normalizeSummaryLine)
                                .filter(Boolean)
                                .slice(0, 80)
                                .map(s => `- ${s}`);

                            archive.likesText = likesLines.join('\n');
                            archive.habitsText = habitsLines.join('\n');
                            archive.eventsText = eventsLines.join('\n');
                            archive.meta.lastProcessedIndex = history.length;
                            archive.meta.updatedAt = Date.now();
                        } finally {
                            archive.meta.summaryInProgress = false;
                            window.memoryArchiveStore[roleId] = archive;
                            saveStore();
                            finalize();
                        }
                    },
                    (_err) => {
                        archive.meta.summaryInProgress = false;
                        archive.meta.lastProcessedIndex = history.length;
                        archive.meta.updatedAt = Date.now();
                        window.memoryArchiveStore[roleId] = archive;
                        saveStore();
                        finalize();
                    }
                );
                return;
            }

            const localRes = summarizeSegment(segment);
            archive.likesText = (localRes.likes || []).join('\n');
            archive.habitsText = (localRes.habits || []).join('\n');
            archive.eventsText = (localRes.events || []).join('\n');
            archive.meta.lastProcessedIndex = history.length;
            archive.meta.updatedAt = Date.now();
            archive.meta.summaryInProgress = false;
            window.memoryArchiveStore[roleId] = archive;
            saveStore();
            finalize();
        } catch (e) {
            console.error('[MemoryArchive] rebuild failed', e);
        }
    };

    // 初始化加载一次（避免首次打开时空对象）
    loadStore();
})();

// =========================================================
// === Added: Korean Style User Persona Logic ===
// =========================================================

function toggleCalendarType() {
    const input = document.getElementById('user-birthday-type');
    if (!input) return;

    // Toggle value
    input.value = input.value === 'solar' ? 'lunar' : 'solar';

    // Update UI
    syncCalendarToggleUI();
}

function syncCalendarToggleUI() {
    const input = document.getElementById('user-birthday-type');
    const dot = document.getElementById('calendar-toggle-dot');
    const labelSolar = document.getElementById('calendar-label-solar');
    const labelLunar = document.getElementById('calendar-label-lunar');

    // Inputs
    const inputSolar = document.getElementById('user-settings-birthday-solar');
    const inputLunar = document.getElementById('user-settings-birthday-lunar');

    if (!input || !dot || !labelSolar || !labelLunar) return;

    if (input.value === 'lunar') {
        // Move to right (Lunar state)
        dot.style.transform = 'translateX(28px)';
        labelSolar.style.opacity = '1';
        labelLunar.style.opacity = '0';

        // Show Lunar input, hide Solar
        if (inputLunar) inputLunar.classList.remove('hidden');
        if (inputSolar) inputSolar.classList.add('hidden');
    } else {
        // Move to left (Solar state)
        dot.style.transform = 'translateX(0)';
        labelSolar.style.opacity = '0';
        labelLunar.style.opacity = '1';

        // Show Solar input, hide Lunar
        if (inputSolar) inputSolar.classList.remove('hidden');
        if (inputLunar) inputLunar.classList.add('hidden');
    }
}

(function () {
    const OFFLINE_SESSIONS_KEY = 'offline_sessions';
    const DEFAULT_WB_ID = '';

    function safeParseJSON(raw) {
        try { return JSON.parse(raw); } catch (e) { return null; }
    }

    function loadOfflineSessions() {
        try {
            const raw = localStorage.getItem(OFFLINE_SESSIONS_KEY);
            const parsed = raw ? safeParseJSON(raw) : null;
            if (Array.isArray(parsed)) return parsed;
            return [];
        } catch (e) {
            return [];
        }
    }

    function saveOfflineSessions(list) {
        try {
            localStorage.setItem(OFFLINE_SESSIONS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
        } catch (e) { }
    }

    function upsertOfflineSession(session) {
        if (!session || !session.id) return;
        if (!session.roleId) session.roleId = window.currentChatRole || '';
        const list = loadOfflineSessions();
        const idx = list.findIndex(s => s && s.id === session.id);
        if (idx >= 0) list[idx] = session;
        else list.unshift(session);
        saveOfflineSessions(list);
    }

    function getOfflineSessionById(id) {
        if (!id) return null;
        const list = loadOfflineSessions();
        return list.find(s => s && s.id === id) || null;
    }

    function removeOfflineSessionById(id) {
        if (!id) return;
        const list = loadOfflineSessions().filter(s => s && s.id !== id);
        saveOfflineSessions(list);
    }

    function formatDateTime(ts) {
        const t = typeof ts === 'number' ? ts : Date.now();
        const d = new Date(t);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${dd} ${hh}:${mm}`;
    }

    function capText(text, maxLen) {
        const s = String(text || '');
        const n = Math.max(0, maxLen | 0);
        if (!n) return '';
        if (s.length <= n) return s;
        return s.slice(0, n) + '…';
    }

    function sanitizePlainText(text) {
        return String(text || '').replace(/\r/g, '').trim();
    }

    function stripThinkingTags(raw) {
        return String(raw || '')
            .replace(/<thinking[\s\S]*?<\/thinking>/gi, '')
            .replace(/<analysis[\s\S]*?<\/analysis>/gi, '');
    }

    function stripMarkdownCodeFences(raw) {
        let s = String(raw || '');
        if (!s) return s;
        s = s.replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1');
        s = s.replace(/```/g, '');
        return s;
    }

    function extractJSONObjectText(raw) {
        const s = stripMarkdownCodeFences(stripThinkingTags(raw)).trim();
        const start = s.indexOf('{');
        const end = s.lastIndexOf('}');
        if (start >= 0 && end >= 0 && end > start) return s.slice(start, end + 1);
        if (s.includes('"type"') && !s.trim().startsWith('{')) {
            return '{' + s;
        }
        return s;
    }

    function repairLikelyBrokenJson(jsonText) {
        let s = String(jsonText || '');
        if (!s) return s;
        s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
        const trimmed = s.trim();
        if (trimmed && !trimmed.startsWith('{') && trimmed.includes('"type"')) {
            s = '{' + trimmed;
        }
        if (trimmed && !trimmed.endsWith('}') && trimmed.includes('"content"') && trimmed.includes(']')) {
            const lastBracket = trimmed.lastIndexOf(']');
            if (lastBracket >= 0) {
                s = trimmed.slice(0, lastBracket + 1) + '}';
            }
        }

        let out = '';
        let inString = false;
        let escape = false;
        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (escape) {
                out += ch;
                escape = false;
                continue;
            }
            if (ch === '\\') {
                out += ch;
                escape = true;
                continue;
            }
            if (!inString) {
                if (ch === '"') inString = true;
                out += ch;
                continue;
            }

            if (ch === '\n' || ch === '\r') {
                out += '\\n';
                continue;
            }

            if (ch === '"') {
                let j = i + 1;
                while (j < s.length && /\s/.test(s[j])) j++;
                const next = j < s.length ? s[j] : '';
                if (next === ':' || next === ',' || next === ']' || next === '}' || next === '') {
                    inString = false;
                    out += '"';
                } else {
                    out += '\\"';
                }
                continue;
            }

            out += ch;
        }
        return out.trim();
    }

    function parseLongTextPayload(raw) {
        const jsonText = extractJSONObjectText(raw);
        let obj = safeParseJSON(jsonText);
        if (!obj) {
            const repaired = repairLikelyBrokenJson(jsonText);
            obj = safeParseJSON(repaired);
        }
        if (!obj || typeof obj !== 'object') return null;
        const type = String(obj.type || '').trim();
        const time = obj.time == null ? '' : String(obj.time);
        const location = obj.location == null ? '' : String(obj.location);
        const content = Array.isArray(obj.content) ? obj.content.map(p => String(p || '').trim()).filter(Boolean) : [];
        if (type !== 'long_text') return null;
        if (content.length === 0) return null;
        return { type: 'long_text', time, location, content };
    }

    function buildRolePrompt(roleId) {
        const id = roleId || window.currentChatRole;
        const profile = (window.charProfiles && window.charProfiles[id]) || {};
        const roleNameForAI = profile.nickName || id || 'TA';
        let systemPrompt = `【角色名称】${roleNameForAI}\n` + (profile.desc || '你是一个友好的AI助手');

        const roleRemarkForUser = typeof profile.remark === 'string' ? profile.remark.trim() : '';
        if (roleRemarkForUser) {
            systemPrompt += `\n\n【用户给你的备注】${roleRemarkForUser}\n注意：这是用户侧的显示名，不等同于你的角色名称。你可以对这个备注做出自然反应。`;
        }

        if (profile.schedule && String(profile.schedule).trim()) {
            systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${String(profile.schedule).trim()}`;
        }

        if (profile.style && String(profile.style).trim()) {
            systemPrompt += `\n\n【聊天风格】\n${String(profile.style).trim()}`;
        }

        const userPersona = (window.userPersonas && window.userPersonas[id]) || {};
        if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
            systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
            if (userPersona.name) systemPrompt += `用户名字：${userPersona.name}\n`;
            if (userPersona.gender) systemPrompt += `用户性别：${userPersona.gender}\n`;
            if (userPersona.birthday) {
                const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
                systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
            }
            if (userPersona.setting) systemPrompt += `用户背景：${userPersona.setting}\n`;
        }

        return systemPrompt;
    }

    function buildWorldBookPrompt(worldbookIds) {
        if (!worldbookIds) return '';
        const ids = Array.isArray(worldbookIds) ? worldbookIds : [String(worldbookIds || '').trim()];
        if (!window.worldBooks) return '';

        let totalPrompt = '';
        
        ids.forEach(id => {
            const wbId = String(id || '').trim();
            if (!wbId) return;

            // 处理分类 (兼容 cat: 和 CATEGORY: 前缀)
            if (wbId.startsWith('cat:') || wbId.startsWith('CATEGORY:')) {
                const targetCat = wbId.includes(':') ? wbId.split(':')[1] : wbId;
                const allIds = Object.keys(window.worldBooks || {});
                const catBooks = allIds
                    .map(bid => ({ ...window.worldBooks[bid], id: bid }))
                    .filter(b => {
                        if (!b) return false;
                        const bCat = b.category ? String(b.category).trim() : '未分类';
                        return bCat === targetCat;
                    });

                if (catBooks.length > 0) {
                    totalPrompt += `\n\n【🌍 当前世界观设定集分类：${targetCat}】\n`;
                    catBooks.forEach((b, index) => {
                        const title = b && b.title ? String(b.title) : `设定 ${index + 1}`;
                        const content = b && b.content ? String(b.content) : '(无内容)';
                        totalPrompt += `\n--- [设定: ${title}] ---\n${content}\n`;
                    });
                }
            } else {
                // 处理单本
                const wb = window.worldBooks[wbId];
                if (wb) {
                    totalPrompt += `\n\n【🌍 当前场景/世界观设定】\n标题：${wb.title}\n内容：${wb.content}`;
                }
            }
        });

        if (totalPrompt) {
            totalPrompt += `\n请基于以上选中的世界观设定进行叙事。`;
        }
        return totalPrompt;
    }

    function buildAutumnWaterPrompt() {
        return `\n\n<writing_style:秋水笔记>\n- 克制白描。避免比喻，避免情绪定义，避免解释。\n- 用动作、停顿、环境质感推进意义。\n- 句子自然舒展，节奏安静。\n</writing_style:秋水笔记>`;
    }

    function buildNovelModeRulesPrompt() {
        return `\n\n【NOVEL_MODE_RULES】\n用户已切换到长叙事模式。请按照沉浸式言情小说风格回复，生成一条 800-1200 字的完整叙述。\n\n【最高格式指令】\n你必须输出一个严格 JSON 对象，不要 Markdown，不要代码块，不要多余解释。\n{"type":"long_text","time":"202X年X月X日 XX:XX","location":"具体的地点","content":["段落1","段落2"]}\n\n【完整性要求】\n- 必须一次性输出完整 JSON，不得输出半截，必须以 } 结尾。\n\n【视角与称呼规范（最高优先级）】\n- 使用【第三人称限制视角】进行叙述。\n- 称呼AI角色：使用他的名字或“他”。\n- 称呼用户：使用“你”。\n- 示例句式：“${window.currentChatRole || '他'}嘴里说着浑话，眼神却很专注。他把掌心放在你腰间，低头凑近你的耳廓。”\n- 禁止使用第一人称“我”来指代AI角色。\n- 禁止替“你（用户）”做决定、说话或描写“你”的内心活动。\n\n【内容结构】\n- 环境/氛围：细腻描写当下的光影、气味、温度。\n- 动作捕捉：描写角色的眼神、指尖触感、呼吸频率等细节。\n- 对话规范：对话直接写在 content 字符串内，使用中文双引号“”，严禁使用反斜杠 \\ 或英文双引号 \\"。\n  正确示例："别动，"他低声说道，"就这样呆一会儿。"\n- 内心独白：描写AI角色的心理，用 *...* 包裹。\n\n【JSON 强约束】\n- content 必须是数组，至少 4 段。\n- 每个 content 元素内部严禁出现换行符。\n- 严禁在 content 的文本中使用反斜杠 \\ 符号。`;
    }

    // --- 新增：长叙事专属去八股规则 --- 
    function buildAntiBaguPrompt() { 
        return `\n\n【去八股文与去抽象专项禁令（最高优先级）】 
 你绝对不能使用以下词汇或意象： 
 1. 陈旧意象: "投入湖面的石子", "石子", "涟漪", "古井", "深潭", "枯井", "像是被羽毛...了一下", "羽毛", "一丝"(如: 一丝不易察觉的...) 
 2. 疼痛与身体: "骨血", "四肢百骸", "薄茧", "邪火", "肉刃", "低吼", "嘶吼", "灼热", "指节泛白", "眸色", "眼底", "故纸堆" 
 3. 锋利意象: "手术刀"(作比喻), "切开", "铁针", "钢针", "针", "刺入/刺穿"(作比喻) 
 4. 控制与物化: "祭品", "锚点", "钥匙", "锁", "锁链", "项圈", "枷锁", "亲手递给我的", "武器", "珍宝", "稀世", "易碎", "小东西", "东西"(指代人) 
 5. 宗教与权力: "神明", "信徒", "审判", "虔诚", "猎人", "猎物", "狩猎", "猫捉老鼠", "游戏", "不容置疑", "不容置喙", "不容抗拒", "孤注一掷" 
 6. 时间与抽象: "那一句", "那一刻", "彻底输了", "失而复得", "普通男人", "不易察觉", "未曾察觉" 
 7. 咯噔语录: "嘴上说着不要，身体却这么诚实" 
 
 【句式禁令】 
 - 严禁使用比喻或明喻来表达心理、情绪（不要写"像...一样"）。 
 - 严禁抽象句（如"她全然没有察觉"），请用具体动作和画面细节代替。 
 - 严禁桥接句式（"非但...而且...", "那不是...而是...", "好像是..."）。`; 
    }


    function buildOfflineSystemPrompt(session) {
        const base = buildRolePrompt(session && session.roleId);
        const wbId = session && session.worldbookId ? session.worldbookId : DEFAULT_WB_ID;
        const wbPrompt = buildWorldBookPrompt(wbId);
        const stylePrompt = buildAutumnWaterPrompt();
        const rulesPrompt = buildNovelModeRulesPrompt();
        
        const antiBaguPrompt = buildAntiBaguPrompt(); // <--- 1. 调用刚才写好的去八股函数

        let contextPrompt = '';
        if (session && session.plotMode === 'read_memory') {
            const summary = sanitizePlainText(session.chatMemorySummary || '');
            if (summary) {
                contextPrompt += `\n\n【承接记忆：此前微信聊天摘要（仅供你在脑内默读，不可在输出中复述/引用/展示）】\n${summary}`;
            }
        } else if (session && session.plotMode === 'new_plot') {
            const seed = sanitizePlainText(session.newPlotSetting || '');
            if (seed) {
                contextPrompt += `\n\n【新剧情设定】\n${seed}`;
            }
        }

        // <--- 2. 在最后拼接上 antiBaguPrompt
        return base + (wbPrompt || '') + stylePrompt + contextPrompt + rulesPrompt + antiBaguPrompt;
    }

    function normalizeOfflineHistoryForAI(messages) {
        const list = Array.isArray(messages) ? messages : [];
        const out = [];
        for (let i = 0; i < list.length; i++) {
            const m = list[i];
            if (!m || !m.role) continue;
            if (m.role !== 'me' && m.role !== 'ai') continue;
            if (m.role === 'me') {
                const content = sanitizePlainText(m.content || '');
                if (!content) continue;
                out.push({ role: 'me', content, timestamp: m.timestamp });
                continue;
            }
            if (m.type === 'long_text' && m.payload && Array.isArray(m.payload.content)) {
                const head = [];
                const time = m.payload.time ? String(m.payload.time) : '';
                const location = m.payload.location ? String(m.payload.location) : '';
                if (time || location) head.push([time, location].filter(Boolean).join(' · '));
                const body = m.payload.content.map(p => String(p || '').trim()).filter(Boolean).join('\n\n');
                const text = (head.length ? (head[0] + '\n') : '') + body;
                if (text.trim()) out.push({ role: 'ai', content: text.trim(), timestamp: m.timestamp });
                continue;
            }
            const content = sanitizePlainText(m.content || m.raw || '');
            if (!content) continue;
            out.push({ role: 'ai', content, timestamp: m.timestamp });
        }
        return out;
    }

    function buildChatHistorySummary(roleId) {
        const id = roleId || window.currentChatRole;
        const history = (window.chatData && window.chatData[id]) || [];
        const list = Array.isArray(history) ? history : [];
        const tail = list.filter(m => m && (m.role === 'me' || m.role === 'ai') && m.content).slice(-80);
        const lines = tail.map(m => {
            const who = m.role === 'me' ? '用户' : 'AI';
            const t = String(m.content || '').replace(/\s+/g, ' ').trim();
            if (!t) return '';
            return `${who}：${t}`;
        }).filter(Boolean);
        return capText(lines.join('\n'), 2200);
    }

    function getOverlayEl() { return document.getElementById('offline-mode-overlay'); }
    function getChatViewEl() { return document.getElementById('chat-view'); }
    function getConfirmModalEl() { return document.getElementById('offline-confirm-modal'); }
    function getSetupModalEl() { return document.getElementById('offline-setup-modal'); }
    function getArchiveModalEl() { return document.getElementById('offline-archive-modal'); }
    function getArchiveListEl() { return document.getElementById('offline-archive-list'); }
    function getHistoryEl() { return document.getElementById('offline-chat-history'); }
    function getSendBtnEl() { return document.getElementById('offline-send-btn'); }
    function getInputEl() { return document.getElementById('offline-msg-input'); }

    function showOfflineTyping() {
        const box = getHistoryEl();
        if (!box) return;
        const old = document.getElementById('offline-typing-indicator');
        if (old) old.remove();
        const wrap = document.createElement('div');
        wrap.id = 'offline-typing-indicator';
        wrap.className = 'offline-typing';
        wrap.innerHTML = `
            <div class="offline-typing-bubble">
                <span class="offline-typing-text">对方正在输入</span>
                <span class="offline-typing-dots"><i></i><i></i><i></i></span>
            </div>
        `;
        box.appendChild(wrap);
        try {
            const body = document.querySelector('#offline-mode-overlay .offline-body');
            if (body) body.scrollTop = body.scrollHeight;
        } catch (e) { }
    }

    function hideOfflineTyping() {
        const el = document.getElementById('offline-typing-indicator');
        if (el) el.remove();
    }

    function renderOfflineHistory(session) {
        const box = getHistoryEl();
        if (!box) return;
        box.innerHTML = '';
        const msgs = Array.isArray(session && session.messages) ? session.messages : [];

        msgs.forEach(m => {
            if (!m || !m.role) return;
            if (m.role === 'me') {
                const row = document.createElement('div');
                row.className = 'offline-user-entry';
                const label = document.createElement('span');
                label.className = 'offline-user-label';
                label.textContent = '我：';
                const content = document.createElement('span');
                content.textContent = String(m.content || '');
                row.appendChild(label);
                row.appendChild(content);
                box.appendChild(row);
                return;
            }

            if (m.type === 'long_text' && m.payload && Array.isArray(m.payload.content)) {
                const entry = document.createElement('div');
                entry.className = 'offline-novel-entry';

                const head = document.createElement('div');
                head.className = 'offline-novel-head';
                const time = m.payload.time ? String(m.payload.time) : '';
                const location = m.payload.location ? String(m.payload.location) : '';
                head.textContent = [time, location].filter(Boolean).join(' · ');
                if (!head.textContent) head.textContent = formatDateTime(m.timestamp);

                const parasWrap = document.createElement('div');
                parasWrap.className = 'offline-novel-paragraphs';
                m.payload.content.forEach(p => {
                    const txt = String(p || '').trim();
                    if (!txt) return;
                    const el = document.createElement('p');
                    el.textContent = txt;
                    parasWrap.appendChild(el);
                });

                entry.appendChild(head);
                entry.appendChild(parasWrap);
                box.appendChild(entry);
                return;
            }

            const entry = document.createElement('div');
            entry.className = 'offline-novel-entry';
            const head = document.createElement('div');
            head.className = 'offline-novel-head';
            head.textContent = formatDateTime(m.timestamp);
            const parasWrap = document.createElement('div');
            parasWrap.className = 'offline-novel-paragraphs';
            const el = document.createElement('p');
            el.textContent = String(m.content || m.raw || '');
            parasWrap.appendChild(el);
            entry.appendChild(head);
            entry.appendChild(parasWrap);
            box.appendChild(entry);
        });

        try {
            const body = document.querySelector('#offline-mode-overlay .offline-body');
            if (body) body.scrollTop = body.scrollHeight;
        } catch (e) { }
    }

    function renderArchiveList() {
        const listEl = getArchiveListEl();
        if (!listEl) return;
        const roleId = window.currentChatRole || '';
        const sessions = loadOfflineSessions().filter(s => s && String(s.roleId || '') === String(roleId));
        if (!sessions.length) {
            listEl.innerHTML = `<div style="padding:18px; color:#666; font-size:14px;">暂无长叙事存档</div>`;
            return;
        }
        listEl.innerHTML = '';
        sessions.forEach(s => {
            if (!s || !s.id) return;
            const item = document.createElement('div');
            item.className = 'offline-archive-item';
            item.style.position = 'relative';

            const profile = (window.charProfiles && s.roleId && window.charProfiles[s.roleId]) || {};
            const roleName = (profile && (profile.remark || profile.nickName)) ? String(profile.remark || profile.nickName) : (s.roleId || 'TA');
            const titleText = String(s.plotName || '').trim() || roleName;

            const title = document.createElement('div');
            title.style.cssText = 'font-size:15px; font-weight:900; color:#111; margin-bottom:6px;';
            title.textContent = titleText;

            const meta = document.createElement('div');
            meta.className = 'offline-archive-meta';
            meta.textContent = `${formatDateTime(s.updatedAt || s.createdAt)} · ${roleName}`;

            const summary = document.createElement('div');
            summary.className = 'offline-archive-summary';
            summary.textContent = String(s.summary || '（无摘要）');

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.textContent = '删除';
            delBtn.style.cssText = 'position:absolute; top:10px; right:10px; border:none; background:rgba(255,59,48,0.10); color:#ff3b30; font-weight:900; border-radius:10px; padding:6px 10px; cursor:pointer;';
            delBtn.addEventListener('click', function (e) {
                if (e) e.stopPropagation();
                const ok = confirm('确定删除这个长叙事存档吗？(不可恢复)');
                if (!ok) return;
                removeOfflineSessionById(s.id);
                renderArchiveList();
            });

            item.appendChild(title);
            item.appendChild(meta);
            item.appendChild(summary);
            item.appendChild(delBtn);
            item.onclick = function () {
                closeOfflineArchiveModal();
                openOfflineSession(s.id);
            };
            listEl.appendChild(item);
        });
    }

    function showChatView() {
        const chatView = getChatViewEl();
        if (chatView) chatView.style.display = 'block';
    }

    function hideChatView() {
        const chatView = getChatViewEl();
        if (chatView) chatView.style.display = 'none';
    }

    function showOfflineOverlay() {
        const overlay = getOverlayEl();
        if (overlay) overlay.style.display = 'flex';
    }

    function hideOfflineOverlay() {
        const overlay = getOverlayEl();
        if (overlay) overlay.style.display = 'none';
    }

    function openOfflineModeConfirm() {
        const modal = getConfirmModalEl();
        if (modal) modal.style.display = 'flex';
    }

    function closeOfflineConfirmModal() {
        const modal = getConfirmModalEl();
        if (modal) modal.style.display = 'none';
    }

    function openSetupModal() {
        const setup = getSetupModalEl();
        if (setup) setup.style.display = 'flex';
    }

    function closeSetupModal() {
        const setup = getSetupModalEl();
        if (setup) setup.style.display = 'none';
    }

    function openOfflineArchiveModal() {
        const modal = getArchiveModalEl();
        if (modal) modal.style.display = 'flex';
        renderArchiveList();
    }

    function closeOfflineArchiveModal() {
        const modal = getArchiveModalEl();
        if (modal) modal.style.display = 'none';
    }

    function getOfflineState() {
        if (!window.__offlineModeState) {
            window.__offlineModeState = {
                active: false,
                currentSessionId: '',
                aiInFlight: false
            };
        }
        return window.__offlineModeState;
    }

    function setAiInFlight(inFlight) {
        const state = getOfflineState();
        state.aiInFlight = !!inFlight;
        const btn = getSendBtnEl();
        if (btn) btn.disabled = !!inFlight;
    }

    function ensureWorldBookOptions() {
        const container = document.getElementById('offline-worldbook-container');
        if (!container) return;
        if (typeof window.getWorldBookCheckboxListHTML === 'function') {
            container.innerHTML = window.getWorldBookCheckboxListHTML([]);
            if (typeof window.bindWorldBookCheckboxList === 'function') {
                window.bindWorldBookCheckboxList(container);
            }
        } else {
            container.innerHTML = `<div style="color:#999; font-size:13px;">未加载世界书组件</div>`;
        }
    }

    function ensureSetupBindings() {
        const radios = Array.from(document.querySelectorAll('input[name="offline-plot-mode"]'));
        const newPlotRow = document.getElementById('offline-new-plot-row');
        const resumeSelect = document.getElementById('offline-resume-select');
        const fillResumeOptions = function () {
            if (!resumeSelect) return;
            const roleId = window.currentChatRole || '';
            const list = loadOfflineSessions().filter(s => s && String(s.roleId || '') === String(roleId));
            if (!list.length) {
                resumeSelect.innerHTML = `<option value="">暂无存档</option>`;
                resumeSelect.value = '';
                return;
            }
            resumeSelect.innerHTML = list.map(s => {
                const id = String(s && s.id ? s.id : '');
                const title = String((s && s.plotName) ? s.plotName : '').trim() || '未命名剧情';
                const time = formatDateTime((s && (s.updatedAt || s.createdAt)) || Date.now());
                const safeTitle = title.replace(/"/g, '&quot;');
                return `<option value="${id.replace(/"/g, '&quot;')}">${safeTitle} · ${time}</option>`;
            }).join('');
        };
        const onModeChange = function () {
            const checked = radios.find(r => r && r.checked);
            const v = checked ? String(checked.value) : 'read_memory';
            if (newPlotRow) newPlotRow.style.display = v === 'new_plot' ? 'block' : 'none';
            if (resumeSelect) {
                if (v === 'resume_plot') {
                    resumeSelect.style.display = 'block';
                    fillResumeOptions();
                } else {
                    resumeSelect.style.display = 'none';
                }
            }
        };
        radios.forEach(r => {
            if (!r || r._offlineBound) return;
            r._offlineBound = true;
            r.addEventListener('change', onModeChange);
        });
        onModeChange();

        const setupMask = getSetupModalEl();
        if (setupMask && !setupMask._offlineMaskBound) {
            setupMask._offlineMaskBound = true;
            setupMask.addEventListener('click', function (e) {
                if (e && e.target === setupMask) {
                    closeSetupModal();
                }
            });
        }
    }

    function ensureOverlayBindings() {
        const exitBtn = document.getElementById('offline-exit-btn');
        if (exitBtn && !exitBtn._offlineBound) {
            exitBtn._offlineBound = true;
            exitBtn.addEventListener('click', function () {
                exitOfflineMode();
            });
        }

        const sendBtn = document.getElementById('offline-send-btn');
        if (sendBtn && !sendBtn._offlineBound) {
            sendBtn._offlineBound = true;
            sendBtn.addEventListener('click', function () {
                offlineSendFromInput();
            });
        }

        const input = getInputEl();
        if (input && !input._offlineBound) {
            input._offlineBound = true;
            input.addEventListener('keydown', function (e) {
                if (!e) return;
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    offlineSendFromInput();
                }
            });
            input.addEventListener('input', function () {
                try {
                    input.style.height = 'auto';
                    input.style.height = Math.min(160, input.scrollHeight) + 'px';
                } catch (e) { }
            });
        }

        const startBtn = document.getElementById('offline-start-btn');
        if (startBtn && !startBtn._offlineBound) {
            startBtn._offlineBound = true;
            startBtn.addEventListener('click', function () {
                startNewOfflineSession();
            });
        }
    }

    function openOfflineOverlayForNewSession() {
        const state = getOfflineState();
        state.active = true;
        state.currentSessionId = '';
        hideChatView();
        showOfflineOverlay();
        ensureWorldBookOptions();
        ensureSetupBindings();
        ensureOverlayBindings();
        closeOfflineArchiveModal();
        renderOfflineHistory({ messages: [] });
        openSetupModal();
        setAiInFlight(false);
        try {
            const input = getInputEl();
            if (input) {
                input.value = '';
                input.style.height = 'auto';
            }
        } catch (e) { }
    }

    function confirmEnterOfflineMode() {
        closeOfflineConfirmModal();
        openOfflineOverlayForNewSession();
    }

    function exitOfflineMode() {
        try {
            const session = getCurrentOfflineSession();
            if (session && Array.isArray(session.messages) && session.messages.length === 0) {
                removeOfflineSessionById(session.id);
            }
            if (session && Array.isArray(session.messages) && session.messages.length > 1) {
                const defaultName = String(session.plotName || '').trim() || '未命名剧情';
                const input = prompt('请为当前剧情存档命名：', defaultName);
                if (input !== null) {
                    const name = String(input || '').trim() || '未命名剧情';
                    session.plotName = name;
                    upsertOfflineSession(session);
                }
            }
        } catch (e) { }
        const state = getOfflineState();
        state.active = false;
        state.currentSessionId = '';
        closeSetupModal();
        closeOfflineConfirmModal();
        closeOfflineArchiveModal();
        hideOfflineOverlay();
        showChatView();
        setAiInFlight(false);
    }

    function openOfflineSession(sessionId) {
        const session = getOfflineSessionById(sessionId);
        if (!session) return;
        const state = getOfflineState();
        state.active = true;
        state.currentSessionId = sessionId;
        hideChatView();
        showOfflineOverlay();
        ensureOverlayBindings();
        closeSetupModal();
        renderOfflineHistory(session);
        setAiInFlight(false);
    }

    function getCurrentOfflineSession() {
        const state = getOfflineState();
        const id = state.currentSessionId;
        if (!id) return null;
        return getOfflineSessionById(id);
    }

    function updateOfflineSessionSummary(session) {
        if (!session) return;
        const msgs = Array.isArray(session.messages) ? session.messages : [];
        for (let i = msgs.length - 1; i >= 0; i--) {
            const m = msgs[i];
            if (!m || m.role !== 'ai') continue;
            if (m.type === 'long_text' && m.payload && Array.isArray(m.payload.content)) {
                session.summary = capText(m.payload.content.join(' ').replace(/\s+/g, ' ').trim(), 80);
                return;
            }
            const txt = sanitizePlainText(m.content || m.raw || '');
            if (txt) {
                session.summary = capText(txt.replace(/\s+/g, ' '), 80);
                return;
            }
        }
        if (!session.summary) session.summary = '（无摘要）';
    }

    function appendOfflineMessage(session, msg) {
        if (!session || !msg) return;
        if (!Array.isArray(session.messages)) session.messages = [];
        session.messages.push(msg);
        session.updatedAt = Date.now();
        updateOfflineSessionSummary(session);
        upsertOfflineSession(session);
        renderOfflineHistory(session);
    }

    function buildInitialUserMessage(session) {
        if (!session) return '开始。';
        if (session.plotMode === 'new_plot') {
            return `请以长叙事模式开始叙事，并给出第一段场景。`;
        }
        return `请先在脑内默读系统提供的聊天记忆摘要，再直接开始长叙事描写。不要复述摘要。`;
    }

    function splitToParagraphs(text) {
        const cleaned = sanitizePlainText(text);
        if (!cleaned) return [];
        let parts = cleaned
            .split(/\n\s*\n+/)
            .map(s => s.replace(/\s+/g, ' ').trim())
            .filter(Boolean);
        if (parts.length >= 2) return parts;
        const sentences = (function () {
            const out = [];
            let buf = '';
            for (let i = 0; i < cleaned.length; i++) {
                const ch = cleaned[i];
                buf += ch;
                if (/[。！？!?]/.test(ch)) {
                    const s = buf.trim();
                    if (s) out.push(s);
                    buf = '';
                }
            }
            const tail = buf.trim();
            if (tail) out.push(tail);
            return out;
        })();
        if (sentences.length <= 1) return parts.length ? parts : [cleaned];
        const merged = [];
        let buf = '';
        for (let i = 0; i < sentences.length; i++) {
            const seg = sentences[i];
            if (!seg) continue;
            if ((buf + seg).length < 220) {
                buf += (buf ? '' : '') + seg;
                continue;
            }
            if (buf) merged.push(buf);
            buf = seg;
        }
        if (buf) merged.push(buf);
        return merged.length >= 2 ? merged : (parts.length ? parts : [cleaned]);
    }

    function fallbackLongTextPayloadFromRaw(raw) {
        let cleaned = sanitizePlainText(stripMarkdownCodeFences(stripThinkingTags(raw)));
        if (cleaned.includes('"type"') || cleaned.includes('"content"')) {
            cleaned = cleaned
                .replace(/^\s*\{?/g, '')
                .replace(/\}?\s*$/g, '')
                .replace(/"?(type|time|location|content)"?\s*:/g, '')
                .replace(/[\[\]\{\}]/g, ' ')
                .replace(/,\s*/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }
        const content = splitToParagraphs(cleaned);
        if (content.length === 0) return null;
        if (content.length === 1) content.push(' ');
        return { type: 'long_text', time: '', location: '', content };
    }

    function buildApiEndpoint(baseUrl) {
        let endpoint = String(baseUrl || '').trim();
        if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
        if (!endpoint.includes('/chat/completions')) {
            if (!endpoint.includes('/v1')) endpoint += '/v1';
            endpoint += '/chat/completions';
        }
        return endpoint;
    }

    async function callNovelApiDirect(params) {
        const baseUrl = localStorage.getItem('api_base_url');
        const apiKey = localStorage.getItem('user_api_key');
        const model = localStorage.getItem('selected_model') || 'deepseek-chat';
        const temperature = parseFloat(localStorage.getItem('model_temperature')) || 0.7;

        if (!baseUrl || !apiKey) {
            throw new Error('❌ 未配置 API。请去【设置】里填写地址和 Key。');
        }

        const endpoint = buildApiEndpoint(baseUrl);

        const systemPrompt = params && typeof params === 'object' ? String(params.systemPrompt || '') : '';
        const history = params && typeof params === 'object' && Array.isArray(params.history) ? params.history : [];
        const userText = params && typeof params === 'object' ? String(params.userText || '') : '';
        const maxTokens = params && typeof params === 'object' && params.maxTokens ? (params.maxTokens | 0) : 8192;

        const messages = [{ role: 'system', content: systemPrompt }];
        for (let i = 0; i < history.length; i++) {
            const h = history[i];
            if (!h || !h.role) continue;
            if (h.role === 'me') messages.push({ role: 'user', content: String(h.content || '') });
            else if (h.role === 'ai') messages.push({ role: 'assistant', content: String(h.content || '') });
        }
        messages.push({ role: 'user', content: userText });

        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: false
            })
        });

        if (!resp.ok) {
            throw new Error(`API错误: ${resp.status}`);
        }

        const data = await resp.json();
        const raw = data && data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
        return String(raw || '').trim();
    }

    async function callOfflineAI(session, userText, opts) {
        if (!session) return;
        setAiInFlight(true);
        showOfflineTyping();
        const systemPrompt = buildOfflineSystemPrompt(session);
        const history = normalizeOfflineHistoryForAI(session.messages);
        const userMessage = sanitizePlainText(userText);

        const reqId = 'offline_' + Date.now();
        session.lastReqId = reqId;
        upsertOfflineSession(session);

                try {
            const text = await callNovelApiDirect({
                systemPrompt,
                history,
                userText: userMessage,
                maxTokens: 8192
            });
            const cur = getOfflineSessionById(session.id);
            if (!cur || cur.lastReqId !== reqId) return;

            let raw = String(text || '').trim();

            // --- 【小白专用：清洗斜杠逻辑开始】 ---
            // 很多AI会乱加 \" 来表达引号，我们把它替换成中文引号，这样既美观又不会弄坏 JSON
            if (raw.includes('\\"')) {
                // 把所有的 \" 替换成中文双引号 “
                raw = raw.replace(/\\"/g, '“');
            }
            // 有时候AI会抽风输出 \/ 这种斜杠，也把它清理掉
            raw = raw.replace(/\\\//g, '/');
            // --- 【清洗逻辑结束】 ---

            const payload = parseLongTextPayload(raw);

            if (payload) {
                appendOfflineMessage(cur, {
                    role: 'ai',
                    type: 'long_text',
                    payload,
                    raw, // 这里保存的是清洗过的文本
                    timestamp: Date.now()
                });
            } else {
                // ... 剩下的逻辑保持不变
                const needRetry = !opts?.retried && raw && raw.includes('"type"') && (!raw.includes('}') || !raw.includes(']'));
                if (needRetry) {
                    await callOfflineAI(cur, '上次输出中断或JSON破损。请重新输出一份完整、可解析的JSON，且仅输出JSON。', { retried: true });
                    return;
                }
                const fallback = fallbackLongTextPayloadFromRaw(raw);
                if (fallback) {
                    appendOfflineMessage(cur, {
                        role: 'ai',
                        type: 'long_text',
                        payload: fallback,
                        raw,
                        timestamp: Date.now()
                    });
                } else {
                    appendOfflineMessage(cur, {
                        role: 'ai',
                        type: 'text',
                        content: '解析失败：请点“一键重Roll”或重发一次。',
                        raw,
                        timestamp: Date.now()
                    });
                }
            }
        } catch (e) {
            const cur = getOfflineSessionById(session.id);
            if (cur) {
                appendOfflineMessage(cur, {
                    role: 'ai',
                    type: 'text',
                    content: String(e && e.message ? e.message : '请求失败'),
                    timestamp: Date.now()
                });
            }
        } finally {
            hideOfflineTyping();
            setAiInFlight(false);
        }
    }

    function startNewOfflineSession() {
        const roleId = window.currentChatRole;
        if (!roleId) {
            alert('请先进入一个聊天窗口，再开启长叙事模式');
            return;
        }

        const wbContainer = document.getElementById('offline-worldbook-container');
        let worldbookId = [];
        if (wbContainer) {
            const checkboxes = wbContainer.querySelectorAll('input[name="wb-checkbox"]:checked');
            worldbookId = Array.from(checkboxes).map(cb => cb.value);
        }
        if (!Array.isArray(worldbookId)) worldbookId = [];

        const radios = Array.from(document.querySelectorAll('input[name="offline-plot-mode"]'));
        const checked = radios.find(r => r && r.checked);
        const plotMode = checked ? String(checked.value) : 'read_memory';

        if (plotMode === 'resume_plot') {
            const resumeSelect = document.getElementById('offline-resume-select');
            const sid = resumeSelect ? String(resumeSelect.value || '').trim() : '';
            if (!sid) {
                alert('请选择要续写的历史存档');
                return;
            }
            openOfflineSession(sid);
            return;
        }

        const seedEl = document.getElementById('offline-new-plot-input');
        const newPlotSetting = seedEl ? String(seedEl.value || '').trim() : '';

        if (plotMode === 'new_plot' && !newPlotSetting) {
            alert('请输入新剧情设定（时间、地点、起因）');
            return;
        }

        const now = Date.now();
        const session = {
            id: 'offline_' + now,
            roleId,
            worldbookId: worldbookId,
            plotMode: plotMode === 'new_plot' ? 'new_plot' : 'read_memory',
            newPlotSetting: plotMode === 'new_plot' ? newPlotSetting : '',
            chatMemorySummary: plotMode === 'read_memory' ? buildChatHistorySummary(roleId) : '',
            createdAt: now,
            updatedAt: now,
            summary: '',
            messages: []
        };

        upsertOfflineSession(session);
        const state = getOfflineState();
        state.currentSessionId = session.id;
        closeSetupModal();
        renderOfflineHistory(session);

        const initUserMessage = buildInitialUserMessage(session);
        callOfflineAI(session, initUserMessage);
    }

    function offlineSendFromInput() {
        const state = getOfflineState();
        if (!state.active) return;
        if (state.aiInFlight) return;
        const session = getCurrentOfflineSession();
        if (!session) return;
        const input = getInputEl();
        if (!input) return;
        const text = String(input.value || '').trim();
        if (!text) return;
        input.value = '';
        try {
            input.style.height = 'auto';
        } catch (e) { }
        appendOfflineMessage(session, { role: 'me', type: 'text', content: text, timestamp: Date.now() });
        callOfflineAI(session, text);
    }

    document.addEventListener('DOMContentLoaded', function () {
        ensureOverlayBindings();
        ensureSetupBindings();
        ensureWorldBookOptions();
    });

    window.openOfflineModeConfirm = openOfflineModeConfirm;
    window.closeOfflineConfirmModal = closeOfflineConfirmModal;
    window.confirmEnterOfflineMode = confirmEnterOfflineMode;
    window.openOfflineArchiveModal = openOfflineArchiveModal;
    window.closeOfflineArchiveModal = closeOfflineArchiveModal;
    window.exitOfflineMode = exitOfflineMode;
    window.openOfflineSession = openOfflineSession;
    window.removeOfflineSessionById = removeOfflineSessionById;
})();

// =========================================================
// 创建消息行的辅助函数（用于分批加载历史消息）
// =========================================================
function createMessageRow(msg) {
    if (!msg || msg.hidden || msg.type === 'call_memory' || msg.type === 'location_share') {
        return null;
    }

    const msgId = ensureChatMessageId(msg);

    if (
        (msg.type === 'system' || msg.type === 'system_event' || msg.role === 'system') &&
        typeof msg.content === 'string' &&
        msg.content.indexOf('[系统]') === 0 &&
        (msg.content.indexOf('一起听') !== -1 || msg.content.indexOf('歌曲切换为') !== -1)
    ) {
        return null;
    }

    // 系统消息处理
    if (msg.type === 'system_event' || msg.type === 'system') {
        const text = msg && msg.content !== undefined ? msg.content : "";
        const sysRow = document.createElement('div');
        sysRow.className = 'sys-msg-row';
        if (msgId) {
            sysRow.setAttribute('data-msg-id', msgId);
        }
        if (msg.timestamp) {
            sysRow.setAttribute('data-timestamp', String(msg.timestamp));
        }
        sysRow.innerHTML = `<span class="sys-msg-text">${text}</span>`;
        return sysRow;
    }

    const content = msg && msg.content !== undefined ? msg.content : "";
    let displayContent = content;
    
    // 检查是否是系统消息
    const isSysMsg = detectSystemMessage(msg, content);
    if (isSysMsg && msg.role === 'ai') {
        const sysRow = document.createElement('div');
        sysRow.className = 'sys-msg-row';
        if (msg.timestamp) {
            sysRow.setAttribute('data-timestamp', String(msg.timestamp));
        }
        sysRow.innerHTML = `<span class="sys-msg-text">${content}</span>`;
        return sysRow;
    }

    // 准备基础数据
    const roleId = window.currentChatRole;
    const isMe = (msg.role === 'me');
    let avatarUrl = "";

    resolveQuoteBlockForMessage(roleId, msg);

    if (isMe) {
        const myPersona = window.userPersonas[roleId] || {};
        avatarUrl = myPersona.avatar || "assets/chushitouxiang.jpg";
    } else {
        const profile = window.charProfiles[roleId] || {};
        avatarUrl = profile.avatar || "assets/chushitouxiang.jpg";
    }

    let smallTimeStr = msg.timestamp > 0 ? formatChatTime(msg.timestamp) : "";

    // 构建气泡内容
    let bubbleHtml = "";
    
    if (msg.type === 'image') {
        bubbleHtml = `
            <div class="msg-bubble msg-bubble-image custom-bubble-content custom-image-message">
                <img src="${content}">
            </div>
        `;
    } else if (msg.type === 'voice') {
        const safeVoiceText = content.replace(/\n/g, '<br>');
        const durationSec = msg.duration || calcVoiceDurationSeconds(content);
        bubbleHtml = `
            <div class="msg-bubble voice-bubble custom-bubble-content">
                <div class="voice-main">
                    <div class="voice-icon">
                        <span class="voice-wave wave1"></span>
                        <span class="voice-wave wave2"></span>
                        <span class="voice-wave wave3"></span>
                    </div>
                    <div class="voice-duration">${durationSec}"</div>
                </div>
                <div class="voice-text" style="display:none;">${safeVoiceText}</div>
            </div>
        `;
    } else if (msg.type === 'family_card') {
        const amount = msg.amount || "";
        const status = msg.status === 'accepted' ? 'accepted' : (msg.role === 'ai' ? 'pending' : (msg.status || 'sent'));
        const subtitle = status === 'accepted'
            ? '已领取'
            : (msg.role === 'ai' ? `额度 ¥${amount}，立即领取` : `额度 ¥${amount}`);
        bubbleHtml = `
            <div class="msg-bubble family-card-bubble custom-bubble-content" data-status="${status}">
                <div class="family-card-main">
                    <div class="family-card-icon"></div>
                    <div class="family-card-text">
                        <div class="family-card-title">送你一张亲属卡</div>
                        <div class="family-card-subtitle">${subtitle}</div>
                    </div>
                </div>
                <div class="family-card-divider"></div>
                <div class="family-card-footer">亲属卡</div>
            </div>
        `;
    } else if (msg.type === 'transfer') {
        const amount = msg.amount || "";
        const note = msg.note || "";
        const noteHtml = note ? `<div class="transfer-note">${note}</div>` : '';
        const status = msg.status || 'sent';
        let extraClass = '';
        if (status === 'accepted' || status === 'returned') {
            extraClass = ' transfer-bubble-accepted';
        }
        let footerText = '待领取';
        if (msg.role === 'me') {
            if (status === 'accepted') {
                footerText = '对方已收钱 ✓';
            }
        } else {
            if (status === 'accepted') {
                footerText = '已收钱';
            } else if (status === 'returned') {
                footerText = '已退回';
            }
        }
        bubbleHtml = `
            <div class="msg-bubble transfer-bubble custom-bubble-content custom-transfer-card${extraClass}">
                <div class="transfer-main">
                    <div class="transfer-icon-circle">
                        <i class="bx bx-transfer"></i>
                    </div>
                    <div class="transfer-info">
                        <div class="transfer-amount">¥${amount}</div>
                        ${noteHtml}
                    </div>
                </div>
                <div class="transfer-split"></div>
                <div class="transfer-footer">${footerText}</div>
            </div>
        `;
    } else if (msg.type === 'redpacket') {
        const amount = msg.amount || "";
        let note = msg.note || '';
        if (!note) {
            note = '恭喜发财，大吉大利';
        }
        const status = msg.status || 'unopened';
        const isOpened = status === 'opened';
        const amountHtml = isOpened && amount ? `<div class="redpacket-amount">¥${amount}</div>` : '';
        const statusText = isOpened ? '红包已领取' : '领取红包';
        bubbleHtml = `
            <div class="msg-bubble redpacket-bubble custom-bubble-content" data-status="${status}">
                <div class="redpacket-main">
                    <div class="redpacket-icon"></div>
                    <div class="redpacket-info">
                        <div class="redpacket-note">${note}</div>
                        <div class="redpacket-status-text">${statusText}</div>
                    </div>
                    ${amountHtml}
                </div>
            </div>
        `;
    } else {
        const safeContent = String(displayContent || '').replace(/\n/g, '<br>');
        let quoteBlockHtml = "";
        if (msg.quote && msg.quote.text) {
            let shortQuote = String(msg.quote.text || '').replace(/\s+/g, ' ').trim();
            if (shortQuote.length > 80) shortQuote = shortQuote.substring(0, 80) + '...';
            const quoteTargetId = msg.quoteId != null ? String(msg.quoteId).trim() : '';
            const quoteIdAttr = quoteTargetId ? ` data-quote-id="${quoteTargetId}"` : '';
            quoteBlockHtml = `
                <div class="quote-block"${quoteIdAttr}>
                    <span class="quote-name">${msg.quote.name || 'TA'}:</span>
                    <span class="quote-preview">${shortQuote}</span>
                </div>
            `;
        }

        bubbleHtml = `
            <div class="msg-bubble custom-bubble-content">
                ${quoteBlockHtml}
                <div class="msg-text custom-bubble-text">${safeContent}</div>
            </div>
        `;
    }

    // 构建状态文字
    let statusHtml = "";
    if (isMe && msg.type !== 'call_end') {
        let statusText = "已送达";
        if (msg.status === 'read') statusText = "已读";
        statusHtml = `<div class="msg-status-text">${statusText}</div>`;
    }

    // 组合最终 HTML
    const row = document.createElement('div');
    row.className = isMe ? 'msg-row msg-right custom-bubble-container is-me' : 'msg-row msg-left custom-bubble-container is-other';
    if (msg.role) {
        row.setAttribute('data-role', msg.role);
    }
    if (msg.type) {
        row.setAttribute('data-type', msg.type);
    }
    if (msg.timestamp) {
        row.setAttribute('data-timestamp', String(msg.timestamp));
    }
    if (msgId) {
        row.setAttribute('data-msg-id', msgId);
    }

    const avatarHtml = `
        <div class="custom-avatar-wrapper" style="display:flex; flex-direction:column; align-items:center;">
            <div class="msg-avatar custom-avatar">
                <img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">
            </div>
            <div class="custom-timestamp" style="font-size:10px; color:#b2b2b2; margin-top:4px; transform:scale(0.85);">
                ${smallTimeStr}
            </div>
        </div>
    `;

    row.innerHTML = `
        ${avatarHtml}
        <div class="msg-content-wrapper">
            ${bubbleHtml}
            ${statusHtml}
        </div>
    `;

    const quoteBlockEl = row.querySelector('.quote-block');
    if (quoteBlockEl && msg.quoteId) {
        quoteBlockEl.addEventListener('click', function (e) {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            if (typeof window.scrollToChatMessageById === 'function') {
                window.scrollToChatMessageById(String(msg.quoteId));
            }
        });
    }

    if (msg.type === 'family_card' && msg.role === 'ai') {
        const bubble = row.querySelector('.family-card-bubble');
        if (bubble) {
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                const st = msg && typeof msg.status === 'string' ? msg.status : 'pending';
                if (st !== 'pending') return;
                openFamilyCardAcceptModal({
                    msg: msg,
                    row: row,
                    roleId: roleId
                });
            });
        }
    }

    return row;
}

