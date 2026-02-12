/* =========================================================
   文件路径：JS脚本文件夹/chat.js
   作用：聊天室全功能完整版 (修复闭环 + 保留所有原有功能)
   ========================================================= */

const DB = {
    keys: {
        chatData: 'wechat_chatData',
        chatMapData: 'wechat_chatMapData',
        charProfiles: 'wechat_charProfiles',
        userPersonas: 'wechat_userPersonas',
        chatBackgrounds: 'wechat_backgrounds',
        callLogs: 'wechat_callLogs',
        chatUnread: 'wechat_unread'
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

                if (savedProfiles) window.charProfiles = normalizeStoredValue(savedProfiles, {});
                if (savedChatData) window.chatData = normalizeStoredValue(savedChatData, {});
                if (savedChatMapData) window.chatMapData = normalizeStoredValue(savedChatMapData, {});
                if (savedPersonas) window.userPersonas = normalizeStoredValue(savedPersonas, {});
                if (savedBgs) window.chatBackgrounds = normalizeStoredValue(savedBgs, {});
                if (savedCallLogs) window.callLogs = normalizeStoredValue(savedCallLogs, {});
                if (savedUnread) window.chatUnread = normalizeStoredValue(savedUnread, {});
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
        return;
    }

    await Promise.all([
        window.localforage.setItem(DB.keys.charProfiles, window.charProfiles || {}),
        window.localforage.setItem(DB.keys.chatData, window.chatData || {}),
        window.localforage.setItem(DB.keys.chatMapData, window.chatMapData || {}),
        window.localforage.setItem(DB.keys.userPersonas, window.userPersonas || {}),
        window.localforage.setItem(DB.keys.chatBackgrounds, window.chatBackgrounds || {}),
        window.localforage.setItem(DB.keys.callLogs, window.callLogs || {}),
        window.localforage.setItem(DB.keys.chatUnread, window.chatUnread || {})
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
        if (chatTitle) chatTitle.innerText = profile.nickName;

        applyChatBackground(roleId);
        if (typeof window.applyChatBubbleCssFromSettings === 'function') {
            window.applyChatBubbleCssFromSettings(roleId);
        }

        // 3. 渲染历史记录
        historyBox.innerHTML = "";

        // 【关键新增】重置"上一条消息的时间"记录器
        window.lastRenderedTime = 0;

        let historyData = window.chatData[roleId];

        if (!Array.isArray(historyData)) {
            historyData = [];
            window.chatData[roleId] = [];
        }

        if (historyData.length === 0) {
            // 新对话显示欢迎语，且加上当前时间戳
            const now = Date.now();
            appendMessageToDOM({
                role: 'ai',
                content: `你好，我是${profile.nickName}。`,
                timestamp: now // 给欢迎语加上时间
            });
        } else {
            // 加载旧记录
            historyData.forEach(msg => {
                appendMessageToDOM(msg);
            });
        }

        // 滚到底部
        setTimeout(() => {
            historyBox.scrollTop = historyBox.scrollHeight;
        }, 100);
    }
}

// =========================================================
// 🔄 替换开始：sendMessage (修复版：发完保持键盘不收起)
// =========================================================
function sendMessage() {
    const input = document.getElementById('msg-input');
    if (!input || !input.value.trim()) return;

    const text = input.value.trim();
    const roleId = window.currentChatRole;

    // 【修改点】记录当前时间戳
    const now = Date.now();
    const userMsg = {
        role: 'me',
        content: text,
        type: 'text',
        timestamp: now, // 👈 加上这行
        status: 'sent'
    };

    // 初始化数组防止报错
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

    if (msg.type === 'image' && msg.description) {
        const desc = String(msg.description || '').trim();
        if (desc) {
            msg.content = `[图片消息：用户发送了一张图片，内容是：${desc}]`;
            return msg;
        }
    }

    // 如果已有content，直接返回
    if (msg.content) return msg;

    // 根据type生成虚拟content
    if (msg.type === 'transfer') {
        // 转账消息：生成描述性文本
        const amount = msg.amount || '未知金额';
        const note = msg.note || '（无备注）';
        msg.content = `[用户发起转账] 金额：¥${amount}，备注：${note}`;
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
        return { text: '', transfer: null, acceptTransfer: false };
    }

    let acceptTransfer = false;
    const acceptPattern = /\[\[ACCEPT_TRANSFER\]\]/i;
    if (acceptPattern.test(rawText)) {
        acceptTransfer = true;
        rawText = rawText.replace(acceptPattern, '');
    }

    const pattern = /:::\s*TRANSFER\s*:(\{[\s\S]*?\})\s*:::/i;
    const match = rawText.match(pattern);

    if (!match) {
        return { text: rawText.trim(), transfer: null, acceptTransfer: acceptTransfer };
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
            }
        }
    } catch (e) {
        console.error('转账解析失败:', e);
    }

    const cleanedText = rawText.replace(pattern, '').trim();
    return {
        text: cleanedText,
        transfer: transfer,
        acceptTransfer: acceptTransfer
    };
}


/// =========================================================
// triggerAI (魔法棒 - 修复版：时间提示不泄露)
// =========================================================
async function triggerAI() {
    const roleId = window.currentChatRole;
    if (!roleId) return;

    const historyData = window.chatData[roleId] || [];
    const lastHistoryMsg = historyData[historyData.length - 1];
    let justSwitchedToOnline = false;

    if (lastHistoryMsg && lastHistoryMsg.role === 'me') {
        const text = lastHistoryMsg.content || "";
        const exitPattern = /[\(（].*(结束见面|回归线上|模式切换|回到手机|分开|再见).*[\)）]/;
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
        // =========================================================
    // 🧠 [MEMORY MOD] 注入记忆档案 (长期记忆)
    // =========================================================
    // 确保内存中有数据
    if (!window.memoryArchiveStore) {
        try {
            const raw = localStorage.getItem('wechat_memory_archive_v1');
            if (raw) window.memoryArchiveStore = JSON.parse(raw);
        } catch(e) {}
    }

    if (window.memoryArchiveStore && window.memoryArchiveStore[roleId]) {
        const archive = window.memoryArchiveStore[roleId];
        let memText = "";
        
        // 辅助函数：过滤掉初始的示例文字
        const filterExample = (txt) => {
            if (!txt) return "";
            if (txt.includes("（示例）") || txt.includes("开启“自动总结”后")) return "";
            return txt.trim();
        };
        
        const likes = filterExample(archive.likesText);
        const habits = filterExample(archive.habitsText);
        const events = filterExample(archive.eventsText);

        // 只有当真的有内容时才注入
        if (likes || habits || events) {
            memText += `\n\n【🧠 核心记忆档案 (Long-term Memory)】\n`;
            memText += `以下是系统自动总结的关于用户的长期记忆，请在对话中自然地体现你知道这些事（例如：知道他喜欢什么、记得发生过什么），不用刻意复述，但要保持记忆连贯性。\n`;
            
            if (likes) memText += `\n[TA的喜好/厌恶]:\n${likes}`;
            if (habits) memText += `\n[TA的行为习惯]:\n${habits}`;
            if (events) memText += `\n[共同经历/重要回忆]:\n${events}`;
            
            systemPrompt += memText;
        }
    }
    // =========================================================

    // =========================================================
    // 📖 [WorldBook MOD] 世界书/设定集注入逻辑 (支持单本 & 整类)
    // =========================================================
    const wbId = profile.worldbookId;
    if (wbId && window.worldBooks) {
        let wbPrompt = "";

        // 情况 A: 用户选的是【整个分类】 (ID 格式如 "CATEGORY:科幻")
        if (wbId.startsWith('CATEGORY:')) {
            const targetCat = wbId.split(':')[1]; // 提取分类名
            const allIds = Object.keys(window.worldBooks);
            
            // 筛选出该分类下所有的书
            const catBooks = allIds
                .map(id => window.worldBooks[id])
                .filter(b => {
                    const bCat = b.category ? b.category.trim() : '未分类';
                    return bCat === targetCat;
                });

            if (catBooks.length > 0) {
                wbPrompt += `\n\n【🌍 当前世界观设定集：${targetCat}】\n`;
                wbPrompt += `(以下是该设定集下的 ${catBooks.length} 条核心设定，请遵循这些规则)\n`;
                
                catBooks.forEach((b, index) => {
                    wbPrompt += `\n--- [设定 ${index + 1}: ${b.title}] ---\n${b.content || "(无内容)"}\n`;
                });
            }
        }
        // 情况 B: 用户选的是【单本设定】 (ID 格式如 "book_1729...")
        else if (window.worldBooks[wbId]) {
            const wb = window.worldBooks[wbId];
            wbPrompt += `\n\n【🌍 当前场景/世界观设定】\n标题：${wb.title}\n内容：${wb.content}\n请基于以上世界观进行对话。`;
        }

        // 注入到 System Prompt
        if (wbPrompt) {
            systemPrompt += wbPrompt;
        }
    }

    const mapData = window.chatMapData && window.chatMapData[roleId];

    if (justSwitchedToOnline) {
        systemPrompt += `\n\n【⚠️ 系统转场通知】\n` +
            `用户刚刚和你分开了（结束了线下见面），你们各自回到了家中/单位。\n` +
            `现在的对话**重新变回微信聊天模式**。\n` +
            `1. 请停止使用括号内的动作描写。\n` +
            `2. 像往常一样回复微信消息，不用太拘谨。\n` +
            `3. 对用户的上一句话（结束指令）做一个简单的道别或回应。`;
    } else if (mapData && mapData.isMeeting === true) {
        systemPrompt += `\n\n【⚠️ 强制模式：线下见面中】\n` +
            `此刻你正和用户面对面在一起（Offline Meeting），你们不再是隔着屏幕聊天。\n` +
            `1. 每一轮回复必须同时包含动作描写和说话内容，并用符号 ||| 将两部分严格分隔。\n` +
            `2. 固定格式：先写一整句动作描写（放在括号里），然后写三个竖线，再写你真正说给对方听的话。\n` +
            `   例如：(抬眼看向你，压低声音靠近了一点) ||| 你刚刚在想什么？\n` +
            `3. 前端会把括号里的部分当作单独的一条“灰色状态条”显示，把 ||| 后面的内容当作正常对话气泡，所以绝对不要把动作和说话混在同一个片段里。\n` +
            `4. 描写要体现"在身边"的实感（如视线接触、触碰、声音的距离等）。\n` +
            `5. 禁止出现"看手机"、"发信息"、"打字"等行为，除非剧情需要。\n`;
    } else {
        systemPrompt += `\n\n【语音消息规则】\n你可以发送语音消息。当你觉得打字不方便、情绪激动、或者需要长篇大论时，或者用户要求你发语音时，请使用格式：[VOICE: 这里是语音转文字的内容] 回复。`;
        systemPrompt += `\n\n【发送照片规则】\n如果你想给用户发一张自拍或环境照片，请回复格式：[PHOTO: 照片内容的详细画面描述]。系统会自动生成一张虚拟图片显示给用户。`;
        systemPrompt += `\n\n【发送位置规则】\n如果你想向用户分享你的位置（例如用户问你在哪，或者你想约用户去某个地方），请回复格式：[LOCATION: 地点名称 | 详细地址]。系统会自动生成位置卡片。`;
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
        if (msg.type === 'call_memory') return true;
        if (msg.type === 'system_event') return false;
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

    // 转账特殊处理
    const lastMsg = cleanHistory[cleanHistory.length - 1];
    if (lastMsg && lastMsg.role === 'me' && lastMsg.type === 'transfer' && lastMsg.status !== 'accepted') {
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
    }

    const text = '请继续上一轮被截断的回复，避免重复前面的内容，并继续使用当前会话约定的 JSON 协议格式作答。';

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    invokeAIWithCommonHandlers(systemPrompt, cleanHistory, text, roleId, headerTitle, oldTitle);
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
}

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
        avatarEl.src = profile.avatar || 'assets/default-avatar.png';
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

function handleActions(roleId, actions) {
    if (!roleId || !actions || typeof actions !== 'object') return;
    if (!window.chatData) window.chatData = {};
    if (!window.chatData[roleId]) window.chatData[roleId] = [];

    try {
        const act = actions || {};

        if (act.transfer) {
            const info = act.transfer;
            const amountNum = typeof info.amount === 'number' ? info.amount : parseFloat(info.amount);
            if (!isNaN(amountNum) && amountNum > 0) {
                const now = Date.now();
                const transferMsg = {
                    role: 'ai',
                    type: 'transfer',
                    amount: amountNum.toFixed(2),
                    note: typeof info.remark === 'string' ? info.remark : '',
                    timestamp: now,
                    status: 'sent'
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
    } catch (e) {
        console.error('handleActions 处理失败:', e);
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
                        handleActions(roleId, jsonPayload.actions);
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

                // ... (后面原有的 [[VIDEO_CALL]] 等逻辑保持不变，直接接在后面即可) ...


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

                const parsed = parseAITransferFromContent(rawText || '');
                const transferInfo = parsed.transfer;
                const acceptTransfer = parsed.acceptTransfer;
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


                // ... (上面的代码保持不变) ...

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
                            window.chatData[roleId].push(textMsg);
                            appendMessageToDOM(textMsg);

                            await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                        }
                    }

                    if (!voiceMatch && !photoMatch && !locationMatch) {
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

                    window.chatData[roleId].push(aiMsg);
                    appendMessageToDOM(aiMsg);

                    // === 模拟打字延迟（保持不变）===
                    if (i < parts.length - 1) {
                        await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                    }
                }

                // 🔥【修改结束】

                // ... (下面的转账处理逻辑保持不变) ...


                if (transferInfo) {
                    const nowTransfer = Date.now();
                    const transferMsg = {
                        role: 'ai',
                        type: 'transfer',
                        amount: transferInfo.amount,
                        note: transferInfo.remark || '',
                        timestamp: nowTransfer,
                        status: 'sent'
                    };
                    window.chatData[roleId].push(transferMsg);
                    appendMessageToDOM(transferMsg);
                }

                if (acceptTransfer) {
                    markLastUserTransferAccepted(roleId);
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
                        footer.innerText = '对方已收钱 ✓';
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
    if (userPersona.name || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    if (profile.worldbookId && window.worldBooks && window.worldBooks[profile.worldbookId]) {
        const wb = window.worldBooks[profile.worldbookId];
        systemPrompt += `\n\n【当前场景/世界观设定】\n标题：${wb.title}\n内容：${wb.content}\n请基于以上世界观进行对话。`;
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

    invokeAIWithCommonHandlers(systemPrompt, cleanHistory, text, roleId, headerTitle, oldTitle);
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
    if (userPersona.name || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    if (profile.worldbookId && window.worldBooks && window.worldBooks[profile.worldbookId]) {
        const wb = window.worldBooks[profile.worldbookId];
        systemPrompt += `\n\n【当前场景/世界观设定】\n标题：${wb.title}\n内容：${wb.content}\n请基于以上世界观进行对话。`;
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

    invokeAIWithCommonHandlers(systemPrompt, cleanHistory, userPayload, roleId, headerTitle, oldTitle);
}

// =========================================================
// 🔄 替换结束
// =========================================================

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

    if (msg && msg.type === 'system_event') {
        const text = msg && msg.content !== undefined ? msg.content : "";
        const sysRow = document.createElement('div');
        sysRow.className = 'sys-msg-row';
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

    if (isMe) {
        const myPersona = window.userPersonas[roleId] || {};
        avatarUrl = myPersona.avatar || "assets/default-avatar.png";
    } else {
        const profile = window.charProfiles[roleId] || {};
        avatarUrl = profile.avatar || "assets/default-avatar.png";
    }

    let smallTimeStr = msgTime > 0 ? formatChatTime(msgTime) : "";

    // --- 3. 🔥 构建气泡内容 (支持引用块) ---
    let bubbleHtml = "";

    if (msg.type === 'history') {
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
            if (shortQuote.length > 30) {
                shortQuote = shortQuote.substring(0, 30) + '...';
            }
            quoteBlockHtml = `
                <div class="quote-block">
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

    historyBox.appendChild(row);
    historyBox.scrollTop = historyBox.scrollHeight;

    if (shouldTriggerLocationShare) {
        try {
            const rid = window.currentChatRole;
            if (rid) {
                showIncomingLocationShareUI(rid);
            }
        } catch (e) { }
    }
}

let currentAITransferContext = null;

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

function openMapCreatorModal(roleId) {
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
    const markers = (mapData && Array.isArray(mapData.markers) ? mapData.markers : []).map(function (m) {
        return { x: Number(m && m.x), y: Number(m && m.y), name: String(m && m.name || '').trim() };
    }).filter(function (m) {
        return isFinite(m.x) && isFinite(m.y) && m.name;
    });
    const bgUrl = (mapData && mapData.bgUrl) ? mapData.bgUrl : 'assets/gongxiangmap.jpg';

    layer.style.display = 'flex';
    layer.innerHTML = `
        <div class="location-share-bg">
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
        markers.forEach(function (m) {
            const dot = document.createElement('div');
            dot.className = 'location-share-marker';
            dot.style.left = String(m.x) + '%';
            dot.style.top = String(m.y) + '%';
            dot.dataset.name = String(m.name || '');

            const label = document.createElement('span');
            label.className = 'marker-name';
            label.textContent = String(m.name || '');
            dot.appendChild(label);

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
    if (userPersona.name || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }
    if (profile.worldbookId && window.worldBooks && window.worldBooks[profile.worldbookId]) {
        const wb = window.worldBooks[profile.worldbookId];
        systemPrompt += `\n\n【当前场景/世界观设定】\n标题：${wb.title}\n内容：${wb.content}\n请基于以上世界观进行对话。`;
    }
    const modeCode = travelMode ? String(travelMode).toUpperCase() : '';
    const modeLabel = modeCode ? getLocationShareModeLabel(modeCode) : '';
    const modeText = modeLabel ? `你刚刚一路以${modeLabel}（${modeCode}）的方式赶到用户面前，现在已经停在他面前。` : '你刚刚一路沿着地图导航赶到用户面前，现在已经停在他面前。';
    systemPrompt += `\n\n【到达场景】\n${modeText}\n请用第一人称描写你停下来的动作、表情、呼吸状态和你此刻看到的环境细节，然后自然地向用户打招呼，开启面对面聊天。不要再谈论导航路径。`;
    const history = window.chatData[roleId] || [];
    const fullHistory = history.map(function (msg) { return ensureMessageContent({ ...msg }); });
    const cleanHistory = fullHistory.filter(function (msg) {
        if (!msg) return false;
        if (msg.type === 'call_memory') return true;
        return !!msg.content;
    });
    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) {
        headerTitle.innerText = "对方走到你面前";
    }
    const userMessage = '[系统通知：你刚刚从实时位置共享导航中到达了用户面前。请根据上面的到达场景说明，说出你见到他后的第一句话。]';
    invokeAIWithCommonHandlers(systemPrompt, cleanHistory, userMessage, roleId, headerTitle, oldTitle);
}

function handleLocationShareAIReply(rawReply, state, markers, chatBox, roleId) {
    if (!chatBox || !state || !roleId) return;
    const raw = String(rawReply || '');
    const cleaned = cleanLocationShareAIThinking(raw);
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
            rawContent: raw,
            type: 'location_share',
            timestamp: ts
        };
        window.chatData[roleId].push(aiMsg);
        appendLocationShareChatRow(chatBox, 'ai', segment);
    }
    if (!hasText) {
        appendLocationShareChatRow(chatBox, 'ai', '（仅支持文字回复）');
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

    if (profile.worldbookId && window.worldBooks && window.worldBooks[profile.worldbookId]) {
        const wb = window.worldBooks[profile.worldbookId];
        systemPrompt += `\n\n【当前场景/世界观设定】\n标题：${wb.title}\n内容：${wb.content}\n请基于以上世界观进行对话。`;
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
        if (msg.type === 'call_memory') return true;
        return !!msg.content;
    });

    let systemPrompt = buildLocationShareBaseSystemPrompt(roleId);
    systemPrompt += `\n\n用户发起了位置共享请求。请根据当前聊天上下文和你正在做的事，从以下地点列表中选择一个你当前所在的位置。\n\n地点列表：\n${placeNames.map(n => `- ${n}`).join('\n')}\n\n必须回复精确的地点名称，只输出地点名称本身。无法确定请回复：无法确定。`;

    if (typeof window.callAI !== 'function') {
        closeLocationShareLayer();
        alert('AI 接口未初始化，请先配置 API。');
        return;
    }

    window.callAI(
        systemPrompt,
        cleanHistory,
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
    const charAvatarUrl = profile.avatar || 'assets/default-avatar.png';
    const userAvatarUrl = persona.avatar || 'assets/default-avatar.png';

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
            <div class="location-share-chat-box hidden" id="location-share-chat-box"></div>
            
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
                const cleanHistory = history.map(msg => ensureMessageContent({ ...msg })).filter(m => m && m.content);
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
                    cleanHistory,
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
            e.stopPropagation(); // 防止穿透
            const ts = Date.now();
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

    if (chatBox) {
        chatBox.addEventListener('click', function (e) {
            e.stopPropagation();
            if (chatBox.classList.contains('hidden')) return;
            sendLocationShareMessage();
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
        const msg = { role: 'me', content: url, type: 'image', timestamp: now, status: 'sent' };
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
            const amountInput = prompt('请输入转账金额', '88.00');
            if (amountInput === null) return;
            const amount = amountInput.trim();
            if (!amount) return;
            const noteInput = prompt('请输入转账备注', '恭喜发财');
            if (noteInput === null) return;
            const note = noteInput.trim();
            const now = Date.now();
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
            const now = Date.now();
            if (!window.chatData[roleId]) window.chatData[roleId] = [];
            const text = '[红包] 恭喜发财，大吉大利';
            const msg = { role: 'me', content: text, type: 'text', timestamp: now, status: 'sent' };
            window.chatData[roleId].push(msg);
            appendMessageToDOM(msg);
            saveData();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            if (msgInput) setTimeout(() => { msgInput.focus(); }, 10);
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
        uploader.addEventListener('change', function () {
            handleImageUpload(uploader, null, function (base64) {
                const roleId = window.currentChatRole;
                const now = Date.now();
                if (!window.chatData[roleId]) window.chatData[roleId] = [];
                const msg = { role: 'me', content: base64, type: 'image', timestamp: now, status: 'sent' };
                window.chatData[roleId].push(msg);
                appendMessageToDOM(msg);
                saveData();
                if (typeof window.handleImageForAI === 'function') {
                    window.handleImageForAI(base64, roleId);
                }
                const input = document.getElementById('msg-input');
                if (input) setTimeout(() => { input.focus(); }, 10);
            }, 1024);
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
    if (userPersona.name || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    if (profile.worldbookId && window.worldBooks && window.worldBooks[profile.worldbookId]) {
        const wb = window.worldBooks[profile.worldbookId];
        systemPrompt += `\n\n【当前场景/世界观设定】\n标题：${wb.title}\n内容：${wb.content}\n请基于以上世界观进行对话。`;
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

    if (profile.worldbookId && window.worldBooks && window.worldBooks[profile.worldbookId]) {
        const wb = window.worldBooks[profile.worldbookId];
        systemPrompt += `\n\n【当前场景/世界观设定】\n标题：${wb.title}\n内容：${wb.content}\n请基于以上世界观进行对话。`;
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
        avatarEl.src = profile.avatar || 'assets/default-avatar.png';
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
    if (hadConnected && durationSec > 0 && roleId) {
        if (!window.chatData[roleId]) window.chatData[roleId] = [];
        const ts = Date.now();
        const durationText = formatCallDuration(durationSec);
        const isVideo = !!state.isVideo;
        const content = (isVideo ? '视频通话已结束 ' : '语音通话已结束 ') + durationText;
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
                type: isVideo ? 'video' : 'voice',
                date: ts,
                duration: durationSec,
                content: summaryText
            });

            const memoryPrefix = isVideo ? '刚才的视频通话已结束。' : '刚才的语音通话已结束。';
            const memoryMsg = {
                role: 'system',
                type: 'call_memory',
                content: '[系统提示：' + memoryPrefix + '通话期间的对话内容记录如下：\n' + summaryText + '\n请读取以上对话内容作为短期记忆，不要认为这是未接来电，继续与用户自然对话。]',
                timestamp: Date.now()
            };
            window.chatData[roleId].push(memoryMsg);
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
}

function showIncomingLocationShareUI(roleId) {
    const old = document.getElementById('incoming-location-layer');
    if (old) {
        old.remove();
    }

    const profile = window.charProfiles[roleId] || {};
    const avatarUrl = profile.avatar || 'assets/default-avatar.png';
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
            if (!window.chatData[rid]) window.chatData[rid] = [];
            const msg = {
                role: 'ai',
                type: 'text',
                content: '📍 [未接位置共享邀请]',
                timestamp: Date.now()
            };
            window.chatData[rid].push(msg);
            appendMessageToDOM(msg);
            saveData();
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
    sendBtn.innerText = '发送';
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
        bg = profile.avatar || 'assets/default-avatar.png';
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
    const userAvatarUrl = persona.avatar || 'assets/default-avatar.png';
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
    if (inputEl && sendBtn) {
        const send = function () {
            const raw = inputEl.value.trim();
            if (!raw) return;
            inputEl.value = '';
            sendTextInVoiceCall(raw);
        };
        sendBtn.onclick = function () {
            send();
        };
        inputEl.onkeydown = function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                send();
            }
        };
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
            let reply = (aiResponseText || '').trim();
            if (!reply) return;
            reply = reply.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
            reply = reply.replace(/\|+/g, '').trim();
            const lines = reply.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
            if (!lines.length) return;
            const line = lines[0];
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
    const avatarUrl = profile.avatar || "assets/default-avatar.png";
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
        appendMessageToDOM({
            role: 'ai',
            type: 'text', // 或者 call_end
            content: '📞 [未接来电]',
            timestamp: Date.now()
        });
        saveData();
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
    if (avatarEl) avatarEl.src = profile.avatar || 'assets/default-avatar.png';

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
function triggerAIFirstSpeakInCall(roleId) {
    const state = window.voiceCallState || {};
    const systemPrompt = buildVoiceCallTalkPrompt(roleId, !!state.isVideo);

    // --- 🔥 关键修改开始：获取并处理历史记录 ---
    const history = window.chatData[roleId] || [];

    // 过滤掉没内容的坏数据，确保 AI 能读懂之前的聊天
    const cleanHistory = history
        .map(msg => {
            // 简单的防错处理
            if (!msg.content) return null;
            // 过滤掉纯系统消息，保留对话
            if (msg.type === 'call_end' || msg.type === 'call_memory') return null;
            return {
                role: msg.role === 'me' ? 'me' : 'ai',
                content: msg.content
            };
        })
        .filter(Boolean); // 去除 null
    // --- 🔥 关键修改结束 ---

    // 伪造一条系统消息，告诉 AI 电话接通了，并让它根据历史记录开场
    const userMessage = "[系统通知：用户接听了你的电话。请结合之前的聊天上下文，直接开始说话，说出你的开场白。]";

    window.callAI(
        systemPrompt,
        cleanHistory, // 👈 这里以前是 []，现在改成 cleanHistory，它就记得住之前的事了！
        userMessage,
        function (aiResponseText) {
            if (!window.voiceCallState.active) return;

            let reply = (aiResponseText || '').trim();
            reply = reply.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();

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
    if (inputEl && sendBtn) {
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
        sendBtn.addEventListener('click', function () {
            sendFromCallInput();
        });
        inputEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendFromCallInput();
            }
        });
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
    if (nameEl) nameEl.innerText = profile.nickName || roleId;
    if (descEl) descEl.innerText = profile.desc || "点击查看档案...";
    if (avatarEl) avatarEl.src = profile.avatar || "assets/default-avatar.png";

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
    document.getElementById('edit-ai-personality').value = profile.desc || "";
    document.getElementById('edit-ai-style').value = profile.style || "";
    document.getElementById('edit-ai-schedule').value = profile.schedule || "";
    document.getElementById('edit-avatar-preview').src = profile.avatar || "assets/default-avatar.png";

    window.editVideoAlbumData = Array.isArray(profile.videoAlbum) ? profile.videoAlbum.slice() : [];
    renderEditVideoAlbum();

    // 🔥 新增：填充并回显选中的世界书
    const select = document.getElementById('edit-ai-worldbook-select');
    if (select && window.getWorldBookOptionsHTML) {
        // 传入 profile.worldbookId，让它自动选中当前角色已关联的那本
        select.innerHTML = window.getWorldBookOptionsHTML(profile.worldbookId || "");
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
    const newDesc = document.getElementById('edit-ai-personality').value;
    const newStyle = document.getElementById('edit-ai-style').value;
    const newSchedule = document.getElementById('edit-ai-schedule').value;
    const newAvatar = document.getElementById('edit-avatar-preview').src;

    // 🔥 新增：读取下拉框
    const worldBookSelect = document.getElementById('edit-ai-worldbook-select');
    const newWorldBookId = worldBookSelect ? worldBookSelect.value : "";

    if (!newName) return alert("名字不能为空");

    // 更新数据
    if (!window.charProfiles[roleId]) window.charProfiles[roleId] = {};
    const p = window.charProfiles[roleId];
    p.nickName = newName;
    p.desc = newDesc;
    p.style = newStyle;
    p.schedule = newSchedule;
    p.avatar = newAvatar;
    p.worldbookId = newWorldBookId;
    p.videoAlbum = Array.isArray(window.editVideoAlbumData) ? window.editVideoAlbumData.slice() : [];

    saveData();

    // 刷新当前页面的标题
    const titleEl = document.getElementById('current-chat-name');
    if (titleEl) titleEl.innerText = newName;

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
    // 【核心修复】：先关闭上一级菜单，防止遮挡
    document.getElementById('settings-menu-modal').style.display = 'none';

    disableChatStatusBarInteraction();

    const roleId = window.currentChatRole;
    const myPersona = window.userPersonas[roleId] || {};

    document.getElementById('user-settings-name').value = myPersona.name || "";
    document.getElementById('user-persona-setting').value = myPersona.setting || "";
    document.getElementById('user-settings-avatar').src = myPersona.avatar || "assets/default-avatar.png";

    document.getElementById('user-persona-modal').style.display = 'flex';
}

function saveUserPersona() {
    const roleId = window.currentChatRole;
    const name = document.getElementById('user-settings-name').value.trim();
    const setting = document.getElementById('user-persona-setting').value;
    const avatar = document.getElementById('user-settings-avatar').src;

    window.userPersonas[roleId] = {
        name: name,
        setting: setting,
        avatar: avatar
    };

    saveData();
    closeSubModal('user-persona-modal');
    alert("身份设定已更新");

    // 刷新当前聊天界面（让我的头像立即生效）
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
    html += '<div class="modal-close-icon" onclick="closeCallLogModal()">×</div>';
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
            html += '<span class="chevron">›</span>';
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
    modal.innerHTML = html;

    const menu = document.getElementById('settings-menu-modal');
    if (menu) menu.style.display = 'none';

    disableChatStatusBarInteraction();

    modal.style.display = 'flex';

    const items = modal.querySelectorAll('.call-log-item');
    items.forEach(function (itemEl) {
        itemEl.addEventListener('click', function () {
            const detail = itemEl.querySelector('.call-log-detail');
            if (!detail) return;
            if (!detail.style.display || detail.style.display === 'none') {
                detail.style.display = 'block';
            } else {
                detail.style.display = 'none';
            }
        });
    });
}

function closeCallLogModal() {
    const modal = document.getElementById('call-log-modal');
    if (modal) modal.style.display = 'none';

    enableChatStatusBarInteraction();

    const menu = document.getElementById('settings-menu-modal');
    if (menu) menu.style.display = 'flex';
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
function openCreator() {
    // 重置所有输入框
    document.getElementById('modal-title').innerText = "创建角色";
    document.getElementById('ai-name').value = '';
    document.getElementById('ai-personality').value = '';
    document.getElementById('ai-style').value = '';
    document.getElementById('ai-schedule').value = '';
    document.getElementById('avatar-preview').src = 'assets/default-avatar.png';

    // 🔥 新增：填充世界书下拉框 (调用 worldbook.js 的方法)
    const select = document.getElementById('ai-worldbook-select');
    if (select && window.getWorldBookOptionsHTML) {
        select.innerHTML = window.getWorldBookOptionsHTML(""); // 传入空字符串，表示默认不选中
    }

    // 打开桌面的那个弹窗
    document.getElementById('creator-modal').style.display = 'block';
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

    // 🔥 新增：获取选中的世界书 ID
    const worldBookSelect = document.getElementById('ai-worldbook-select');
    const worldBookId = worldBookSelect ? worldBookSelect.value : "";

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
    p.worldbookId = worldBookId; // 👈 保存关联ID

    saveData();
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
window.sendMessage = sendMessage;
window.triggerAI = triggerAI;
window.handleImageForAI = handleImageForAI;
window.goBackToHome = goBackToHome;

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
        const bubble = e.target.closest('.msg-bubble');
        if (bubble) {
            e.preventDefault(); // 阻止浏览器默认右键菜单
            showContextMenu(bubble, e.clientX, e.clientY); // 传入鼠标位置作为参考
        }
    });
});

// 开始按压
function handleStart(e) {
    // 找到被按下的气泡 (closest 处理点击到气泡内部文字的情况)
    const bubble = e.target.closest('.msg-bubble');
    if (!bubble) return;

    // 500毫秒后触发菜单
    longPressTimer = setTimeout(() => {
        // 手机端长按触发时，禁止浏览器默认的选中/放大行为
        // e.preventDefault(); 
        // 注意：e.preventDefault() 在 passive listener 里不能用，这里主要靠逻辑控制
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

// 显示长按菜单 (改版：固定位置)
function showContextMenu(bubbleEl, mouseX, mouseY) {
    // 1. 记录当前选中的气泡 
    // 【修改点】去掉 window. 前缀，直接赋值给上面的 let 变量
    currentSelectedMsgDiv = bubbleEl;

    // 2. 获取菜单和遮罩
    const menu = document.getElementById('msg-context-menu');
    const mask = document.getElementById('context-menu-mask');

    if (!menu || !mask) return;

    // 3. 直接显示 (CSS 已经定死了位置在底部，不需要JS计算 left/top)
    mask.style.display = 'block';
    menu.style.display = 'block';

    // 增加一个小动画类(可选)
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
window.currentQuoteText = "";

function findMessageIndexByRow(row, roleId) {
    if (!row || !roleId) return -1;
    const list = window.chatData[roleId];
    if (!Array.isArray(list)) return -1;
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

    // 3. 计算索引
    const allRows = Array.from(document.querySelectorAll('#chat-history .msg-row'));
    const msgIndex = allRows.indexOf(row);
    const roleId = window.currentChatRole;

    // 关闭菜单 (这会把 currentSelectedMsgDiv 设为 null，所以下面必须用 bubble 变量)
    closeContextMenu();

    switch (actionType) {
        case 'edit':
            const newText = prompt("编辑消息:", originalText);
            if (newText !== null && newText.trim() !== "") {
                bubble.innerText = newText;
                if (window.chatData[roleId] && window.chatData[roleId][msgIndex]) {
                    window.chatData[roleId][msgIndex].content = newText;
                    saveData();
                }
            }
            break;

        case 'quote':
            const quoteBar = document.getElementById('quote-bar');
            const quoteContent = document.getElementById('quote-content');
            const input = document.getElementById('msg-input');
            window.currentQuoteText = originalText;
            if (quoteBar && quoteContent) {
                quoteBar.style.display = 'flex';
                let shortText = originalText.length > 20 ? originalText.substring(0, 20) + '...' : originalText;
                const isMe = row.classList.contains('msg-right');
                const name = isMe ? "我" : (document.getElementById('current-chat-name').innerText || "TA");
                quoteContent.innerText = `回复 ${name}: ${shortText}`;
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
            let favs = JSON.parse(localStorage.getItem('wechat_favorites') || "[]");
            favs.push({ text: originalText, from: roleId, date: Date.now() });
            localStorage.setItem('wechat_favorites', JSON.stringify(favs));
            alert("已加入收藏");
            break;

        case 'multi':
            enterMultiSelectMode();
            break;

        case 'trans':
            alert("翻译功能暂未开通");
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
    document.getElementById('quote-bar').style.display = 'none';
    window.currentQuoteText = "";
}

// ⚠️ 重要：我们需要修改 sendMessage 函数，让它发送时带上引用
// 请把下面的函数覆盖原来的 sendMessage
const oldSendMessage = window.sendMessage; // 备份原来的(如果有必要)

window.sendMessage = function () {
    const input = document.getElementById('msg-input');
    if (!input || !input.value.trim()) return;

    let text = input.value.trim();
    const roleId = window.currentChatRole;
    const now = Date.now();

    const userMsg = {
        role: 'me',
        content: text,
        type: 'text',
        timestamp: now,
        status: 'sent'
    };

    if (window.currentQuoteText) {
        const quoteBar = document.getElementById('quote-content');
        let quoteName = "TA";
        if (quoteBar && quoteBar.innerText) {
            const match = quoteBar.innerText.match(/回复\s*(.+?):/);
            if (match) quoteName = match[1];
        }

        userMsg.quote = {
            name: quoteName,
            text: window.currentQuoteText
        };

        cancelQuote();
    }

    if (!window.chatData[roleId]) window.chatData[roleId] = [];
    window.chatData[roleId].push(userMsg);
    appendMessageToDOM(userMsg);

    input.value = '';
    saveData();

    if (typeof window.maybeAutoUpdateMemoryArchive === 'function') {
        window.maybeAutoUpdateMemoryArchive(roleId);
    }

    setTimeout(() => { input.focus(); }, 10);

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
        text = text + ` (系统提示: 你正在${modeLabel}前往用户，距离约 ${distText}，还有 ${timeText}。你必须清晰地意识到自己还在路上，不能说已经到达或马上就在眼前。请结合当前出行方式，自然描写周围环境或身体状态，例如车内环境、脚步声或喘气等。)`;
    }
};



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

    // 3. 给每行绑定点击事件
    const rows = chatBody.querySelectorAll('.msg-row');
    rows.forEach(row => {
        // 先移除可能存在的旧事件
        row.onclick = function (e) {
            if (chatBody.classList.contains('select-mode')) {
                e.preventDefault();
                e.stopPropagation();
                this.classList.toggle('selected'); // 切换选中状态
            }
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
    const chatBody = document.getElementById('chat-history');
    const inputArea = document.querySelector('.chat-room-footer').parentNode;
    const multiBar = document.getElementById('multi-select-bar');

    // 1. 恢复样式
    if (chatBody) chatBody.classList.remove('select-mode');

    // 2. 恢复底部栏
    if (multiBar) multiBar.style.display = 'none';
    if (inputArea) inputArea.style.display = 'block';

    // 3. 清除所有选中状态
    const rows = document.querySelectorAll('#chat-history .msg-row');
    rows.forEach(r => {
        r.classList.remove('selected');
        r.onclick = null;
    });

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
    // 获取所有被选中的行
    const selectedRows = Array.from(chatBody.querySelectorAll('.msg-row.selected'));

    if (selectedRows.length === 0) {
        alert("请先选择消息");
        return;
    }

    if (type === 'delete') {
        if (!confirm(`确定删除这 ${selectedRows.length} 条消息吗？`)) return;

        const roleId = window.currentChatRole;
        if (window.chatData[roleId]) {
            const indicesToDelete = selectedRows
                .map(row => findMessageIndexByRow(row, roleId))
                .filter(index => index >= 0)
                .sort((a, b) => b - a);
            indicesToDelete.forEach(index => {
                window.chatData[roleId].splice(index, 1);
            });
            // 保存数据
            saveData();
        }

        // 3. 删除界面 DOM
        selectedRows.forEach(row => row.remove());

        // 4. 退出多选模式
        exitMultiSelectMode();

    } else if (type === 'fav') {
        alert(`已收藏 ${selectedRows.length} 条消息 (模拟)`);
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
                <img src="${profile.avatar || 'assets/default-avatar.png'}" class="forward-avatar">
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
    const modal = document.getElementById('settings-menu-modal');
    if (modal) modal.style.display = 'flex';

    // Load Role Info
    const roleId = window.currentChatRole;
    const profile = window.charProfiles[roleId] || {};

    const avatar = document.getElementById('menu-role-avatar');
    if (avatar) avatar.src = profile.avatar || 'assets/default-avatar.png';

    const name = document.getElementById('menu-role-name');
    if (name) name.innerText = profile.nickName || profile.name || '未知角色';

    const desc = document.getElementById('menu-role-desc');
    if (desc) desc.innerText = profile.desc ? (profile.desc.substring(0, 15) + '...') : '点击查看档案...';

    // Load Settings
    window.loadChatSettings();
}

window.closeSettingsMenu = function () {
    const modal = document.getElementById('settings-menu-modal');
    if (modal) modal.style.display = 'none';
}

window.loadChatSettings = function () {
    // 1. Memory Limit
    const limit = localStorage.getItem('chat_memory_limit') || 50;
    const limitInput = document.getElementById('setting-memory-limit');
    if (limitInput) limitInput.value = limit;

    // 2. Auto Summary
    const autoSummary = localStorage.getItem('chat_auto_summary') === 'true';
    const summarySwitch = document.getElementById('setting-auto-summary-switch');
    if (summarySwitch) summarySwitch.checked = autoSummary;
    window.toggleSummaryInput();

    const summaryFreq = localStorage.getItem('chat_summary_freq') || 20;
    const freqInput = document.getElementById('setting-summary-freq');
    if (freqInput) freqInput.value = summaryFreq;

    // 3. Bubble CSS
    const bubbleCSS = localStorage.getItem('chat_bubble_css') || '';
    const cssInput = document.getElementById('setting-bubble-css');
    if (cssInput) cssInput.value = bubbleCSS;
    window.updateBubblePreview();
    window.applyBubbleCSS(bubbleCSS);
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify(window.memoryArchiveStore || {}));
        } catch (e) {
            console.error('[MemoryArchive] save failed', e);
        }
    }

    function getRoleArchive(roleId) {
        if (!roleId) roleId = window.currentChatRole || '';
        if (!window.memoryArchiveStore[roleId]) {
            // ✅ 数据模拟：给首次打开的人一个示例展示（后续自动总结会覆盖/追加）
            window.memoryArchiveStore[roleId] = {
                likesText: "（示例）\n- 用户喜欢：奶茶 / 甜食\n- 用户讨厌：被催促\n\n（开启“自动总结”后，这里会自动整理对话里出现的偏好）",
                habitsText: "（示例）\n- 用户习惯：晚上12点前睡觉\n- 用户经常：早上先喝水再说话\n\n（开启“自动总结”后，这里会自动整理对话里出现的习惯）",
                eventsText: "（示例）\n- 我们发生的事：一起讨论了周末去哪玩\n\n（开启“自动总结”后，这里会自动把近期对话整理成事件摘要）",
                meta: {
                    lastProcessedIndex: 0,
                    updatedAt: Date.now()
                }
            };
            saveStore();
        }
        // 兜底 meta
        if (!window.memoryArchiveStore[roleId].meta) {
            window.memoryArchiveStore[roleId].meta = { lastProcessedIndex: 0, updatedAt: Date.now() };
        }
        if (typeof window.memoryArchiveStore[roleId].meta.lastProcessedIndex !== 'number') {
            window.memoryArchiveStore[roleId].meta.lastProcessedIndex = 0;
        }
        return window.memoryArchiveStore[roleId];
    }

    function setActiveTab(tabKey) {
        const modal = document.getElementById('memory-archive-modal');
        if (!modal) return;

        const allTabs = modal.querySelectorAll('.memory-archive-tab');
        allTabs.forEach(btn => {
            const key = btn.getAttribute('data-key');
            if (key === tabKey) btn.classList.add('is-active');
            else btn.classList.remove('is-active');
        });
    }

    function renderArchive(tabKey) {
        const roleId = window.currentChatRole;
        const archive = getRoleArchive(roleId);

        const titleEl = document.getElementById('memory-archive-title');
        const textEl = document.getElementById('memory-archive-text');

        const titles = {
            likes: 'TA的喜好',
            habits: 'TA的习惯',
            events: '我们发生的事'
        };
        const textMap = {
            likes: archive.likesText || '',
            habits: archive.habitsText || '',
            events: archive.eventsText || ''
        };

        if (titleEl) titleEl.innerText = titles[tabKey] || '记忆档案';
        if (textEl) textEl.innerText = textMap[tabKey] || '';
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

    // === 自动总结：本地规则版（保证离线可用，不依赖 API）===
    function normalizeText(s) {
        return (s || '')
            .replace(/^「回复：[\s\S]*?」\s*\n-+\s*\n/i, '') // 去掉引用发送的头
            .replace(/\r/g, '')
            .trim();
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

        // 1) 抽取“喜好/讨厌”
        const likeRegexList = [
            /喜欢([^，。！？\n]{1,16})/g,
            /爱([^，。！？\n]{1,16})/g,
            /最喜欢([^，。！？\n]{1,16})/g,
            /讨厌([^，。！？\n]{1,16})/g
        ];

        // 2) 抽取“习惯/频率词”
        const habitRegexList = [
            /习惯([^，。！？\n]{1,18})/g,
            /经常([^，。！？\n]{1,18})/g,
            /总是([^，。！？\n]{1,18})/g,
            /每天([^，。！？\n]{1,18})/g,
            /(早上|晚上)([^，。！？\n]{1,18})/g
        ];

        // 3) 事件：把这段对话中“我方内容”做成简短纪要（最多3条）
        const myLines = [];

        segmentMsgs.forEach(m => {
            if (!m || (m.role !== 'me' && m.role !== 'ai')) return;
            const t = normalizeText(m.content);
            if (!t) return;

            // 喜好
            likeRegexList.forEach(rgx => {
                rgx.lastIndex = 0;
                let match;
                while ((match = rgx.exec(t)) !== null) {
                    const val = (match[1] || match[2] || '').trim();
                    if (val) likes.push(`- ${match[0].includes('讨厌') ? '用户讨厌：' : '用户喜欢：'}${val}`);
                }
            });

            // 习惯
            habitRegexList.forEach(rgx => {
                rgx.lastIndex = 0;
                let match;
                while ((match = rgx.exec(t)) !== null) {
                    const tail = (match[1] && match[2]) ? (match[1] + match[2]) : (match[1] || '').trim();
                    if (tail) habits.push(`- 用户习惯：${tail.trim()}`);
                }
            });

            // 事件（只收集“我”的发言，更像“我们发生的事”）
            if (m.role === 'me') {
                const short = t.length > 40 ? t.slice(0, 40) + '...' : t;
                myLines.push(short);
            }
        });

        if (myLines.length) {
            const take = myLines.slice(-3);
            const dateStr = new Date().toLocaleString();
            events.push(`- ${dateStr}：我们聊到 ${take.join(' / ')}`);
        }

        return { likes, habits, events };
    }

    // 对外：每次有新消息时调用，按设置频率“累计到阈值再写入”
    window.maybeAutoUpdateMemoryArchive = function (roleId) {
        try {
            if (!roleId) roleId = window.currentChatRole;
            if (!roleId) return;

            // 仅在开关打开时工作
            const autoOn = localStorage.getItem('chat_auto_summary') === 'true';
            if (!autoOn) return;

            const freq = parseInt(localStorage.getItem('chat_summary_freq')) || 20;
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

            // 把片段整理成可读文本（用户/AI）
            const segmentText = segment
                .filter(m => m && (m.role === 'me' || m.role === 'ai') && m.content)
                .slice(-200) // 极限兜底，避免太长
                .map(m => `${m.role === 'me' ? '用户' : 'AI'}: ${normalizeText(m.content)}`)
                .filter(Boolean)
                .join('\n');

            // ✅ 优先用你的 API 总结（api.js 提供 window.callAISummary）
            if (typeof window.callAISummary === 'function') {
                window.callAISummary(
                    {
                        roleName: profile.nickName || profile.name || 'AI',
                        rolePrompt: profile.desc || '',
                        userPersona,
                        userName, // 🔥 新增：传入用户名字
                        segmentText
                    },
                    (res) => {
                        try {
                            // 追加写入（去重）
                            const likesLines = (res.likes || []).map(s => `- ${String(s).trim()}`).filter(Boolean);
                            const habitsLines = (res.habits || []).map(s => `- ${String(s).trim()}`).filter(Boolean);
                            const eventsLines = (res.events || []).map(s => `- ${String(s).trim()}`).filter(Boolean);

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

    // 初始化加载一次（避免首次打开时空对象）
    loadStore();
})();
