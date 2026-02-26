/* =========================================================
   文件路径：JS脚本文件夹/apps.js
   作用：管理App的数据、图标渲染、打开窗口、以及微信列表逻辑
   ========================================================= */

// 1. 定义所有 App 的核心数据
window.appList = [
    { name: "微信", id: "wechat", iconClass: "fas fa-comment" },
    { name: "世界书", id: "worldbook", iconClass: "fas fa-book" },
    { name: "音乐", id: "music", iconClass: "fas fa-music" },
    { name: "小红书", id: "redbook", iconClass: "fas fa-hashtag" },
    { name: "游戏", id: "health", iconClass: "fas fa-gamepad" },
    { name: "信箱", id: "mail", iconClass: "fas fa-envelope" },
    { name: "驿站", id: "station", iconClass: "fas fa-truck" },
    { name: "更多", id: "more", iconClass: "fas fa-ellipsis-h" },
    { name: "设置", id: "settings", iconClass: "fas fa-cog" },
    { name: "TODO", id: "todo", iconClass: "fas fa-check-square" },
    { name: "外观", id: "appearance", iconClass: "fas fa-palette" },
];

function isImageSource(src) {
    if (!src) return false;
    return src.includes('/') || src.includes('.') || src.startsWith('data:image');
}

// 2. 初始化渲染：把图标画到桌面上
function renderApps() {
    const apps = window.appList || [];

    for (let i = 0; i < 8 && i < apps.length; i++) {
        const appData = apps[i];
        const itemEl = document.getElementById(`app-item-${i}`);
        const nameEl = document.getElementById(`app-name-${i}`);
        const iconEl = document.getElementById(`app-icon-${i}`);
        if (!appData || !itemEl || !nameEl) continue;

        const useImage = appData.icon && isImageSource(appData.icon);

        if (useImage) {
            let imgEl = iconEl;
            if (!imgEl || imgEl.tagName !== 'IMG') {
                const newImg = document.createElement('img');
                newImg.id = `app-icon-${i}`;
                newImg.className = imgEl ? imgEl.className : '';
                if (imgEl) {
                    imgEl.replaceWith(newImg);
                } else {
                    itemEl.insertBefore(newImg, nameEl);
                }
                imgEl = newImg;
            }
            imgEl.src = appData.icon;
            imgEl.alt = appData.name || '';
            imgEl.removeAttribute('style');
        } else {
            let iconNode = iconEl;
            if (!iconNode || iconNode.tagName !== 'I') {
                const newIcon = document.createElement('i');
                newIcon.id = `app-icon-${i}`;
                if (iconNode) {
                    iconNode.replaceWith(newIcon);
                } else {
                    itemEl.insertBefore(newIcon, nameEl);
                }
                iconNode = newIcon;
            }
            iconNode.className = appData.iconClass || '';
            iconNode.removeAttribute('style');
        }

        nameEl.innerText = appData.name || '';
    }

    const allAppItems = document.querySelectorAll('.app-item');
    let appIndex = 0;

    allAppItems.forEach(item => {
        const iconBox = item.querySelector('.app-icon-box');
        const nameSpan = item.querySelector('.app-name');
        if (!iconBox || !nameSpan) return;

        const appData = apps[appIndex];
        if (appData) {
            if (appData.icon && isImageSource(appData.icon)) {
                iconBox.innerHTML = `<img src="${appData.icon}" style="width:100%; height:100%; border-radius:10px; object-fit:cover; display:block;">`;
                iconBox.style.fontSize = '0';
                iconBox.style.display = 'flex';
                iconBox.style.alignItems = 'center';
                iconBox.style.justifyContent = 'center';
                iconBox.style.overflow = 'hidden';
            } else if (appData.iconClass) {
                iconBox.innerHTML = `<i class="${appData.iconClass}"></i>`;
                iconBox.style.fontSize = '';
            }
            nameSpan.innerText = appData.name || '';
        }
        appIndex++;
    });

    renderDock();
}

// 2.5 新增：渲染DOCK栏
function renderDock() {
    const dockItems = document.querySelectorAll('.dock-item');
    dockItems.forEach(item => {
        const iconBox = item.querySelector('.dock-icon-img');
        const nameSpan = item.querySelector('span');
        
        if (!iconBox || !nameSpan) return;
        
        // 通过onclick属性判断是哪个APP
        const onclickAttr = item.getAttribute('onclick');
        let appId = null;
        
        if (onclickAttr) {
            if (onclickAttr.includes("'settings'")) {
                appId = 'settings';
            } else if (onclickAttr.includes("'todo'")) {
                appId = 'todo';
            } else if (onclickAttr.includes("'appearance'")) {
                appId = 'appearance';
            }
        }
        
        if (appId) {
            const appData = window.appList.find(a => a.id === appId);
            if (appData) {
                // 更新图标
                if (appData.icon && (appData.icon.includes('/') || appData.icon.includes('.') || appData.icon.startsWith('data:image'))) {
                    iconBox.innerHTML = `<img src="${appData.icon}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;">`;
                    iconBox.style.fontSize = '0';
                    iconBox.style.background = 'transparent';
                } else if (appData.iconClass) {
                    iconBox.innerHTML = `<i class="${appData.iconClass}"></i>`;
                    iconBox.style.fontSize = '24px';
                    iconBox.style.background = 'transparent';
                }
                
                // 更新名称
                nameSpan.innerText = appData.name;
            }
        }
    });
}
document.addEventListener('DOMContentLoaded', renderApps);

// 3. 打开 App 的窗口逻辑
const appWindow = document.getElementById('app-window');
const appTitle = document.getElementById('app-title-text');
const appContent = document.getElementById('app-content-area');

// 定义普通 App 内容
const appContentData = {
    'todo': { title: 'TODO', content: '' }, // TODO内容将通过函数动态生成
};
  // 打开 App 主函数
function openApp(appId) {
    try {
        window.__foregroundAppId = String(appId || '');
        if (window.GlobalMusicPlayer && typeof window.GlobalMusicPlayer.setForegroundApp === 'function') {
            window.GlobalMusicPlayer.setForegroundApp(window.__foregroundAppId);
        }
    } catch (e) {}

    // 【核心修复】防止样式残留 - 清除容器上的所有内联样式
    if (appContent) appContent.setAttribute('style', ''); 

    const appHeader = document.querySelector('.app-header');
    if (appHeader) appHeader.style.display = 'flex';

    // 处理世界书应用
    if (appId === 'worldbook') {
        if(typeof window.openWorldBookApp === 'function') {
            window.openWorldBookApp();
        } else {
            console.error("未找到 openWorldBookApp，请检查 worldbook.js 是否引入");
        }
        return;
    }

    // 处理外观应用（改为走通用 app-window，与其他 App 动画一致）
    if (appId === 'appearance') {
        if (!appWindow || !appTitle || !appContent) return;
        appTitle.innerText = '外观设置';
        appContent.setAttribute('style', 'padding: 0;');
        appContent.innerHTML = '<div id="appearance-app"></div>';
        const appearanceRoot = document.getElementById('appearance-app');
        if (appearanceRoot && typeof window.openAppearanceApp === 'function') {
            window.openAppearanceApp();
        }
        appWindow.classList.add('active');
        return;
    }
    // 处理设置应用
    if (appId === 'settings') {
        if (typeof window.openSettingsApp === 'function') {
            window.openSettingsApp(); 
        } else {
            alert("请确保 settings.js 文件已创建并引入！");
        }
        return;
    }
    
    // TODO应用特殊处理
    if (appId === 'todo') {
        openTodoApp();
        return;
    }

    if (appId === 'music') {
        if (!appWindow || !appTitle || !appContent) return;
        appTitle.innerText = '音乐';
        appContent.setAttribute('style', 'padding: 0; overflow: hidden; background: #fff;');
        appContent.innerHTML =
            '<iframe src="apps/music.html" title="音乐" style="width:100%;height:100%;border:0;display:block;" allow="autoplay"></iframe>';
        appWindow.classList.add('active');
        return;
    }

    const data = appContentData[appId] || { title: '应用', content: '<div style="padding:20px; text-align:center;">开发中...</div>' };

    if (appTitle) appTitle.innerText = data.title;
    if (appContent) appContent.innerHTML = data.content;

    if(appWindow) appWindow.classList.add('active');
}

function closeApp() {
    if(appWindow) appWindow.classList.remove('active');
    const appHeader = document.querySelector('.app-header');
    if (appHeader) appHeader.style.display = 'flex';
    try {
        window.__foregroundAppId = '';
        if (window.GlobalMusicPlayer && typeof window.GlobalMusicPlayer.setForegroundApp === 'function') {
            window.GlobalMusicPlayer.setForegroundApp('');
        }
    } catch (e) {}

    if (window.__resumeChatViewAfterClose) {
        window.__resumeChatViewAfterClose = false;
        const desktopView = document.getElementById('desktop-view');
        const chatView = document.getElementById('chat-view');
        if (desktopView && desktopView.style) desktopView.style.display = 'none';
        if (chatView && chatView.style) chatView.style.display = 'block';
        const plusBtn = document.getElementById('top-plus-btn');
        if (plusBtn) plusBtn.style.display = 'none';
        try {
            window.__foregroundAppId = 'chat';
            if (window.GlobalMusicPlayer && typeof window.GlobalMusicPlayer.setForegroundApp === 'function') {
                window.GlobalMusicPlayer.setForegroundApp('chat');
            }
        } catch (e) {}
    }
}

// 暴露给全局
window.openApp = openApp;
window.closeApp = closeApp;
window.renderApps = renderApps;
window.renderDock = renderDock;

window.addEventListener('message', function (ev) {
    const data = ev && ev.data ? ev.data : null;
    if (!data || typeof data !== 'object') return;
    if (data.type !== 'MUSIC_PARENT_FULLSCREEN') return;
    if (String(window.__foregroundAppId || '') !== 'music') return;
    const appHeader = document.querySelector('.app-header');
    if (!appHeader) return;
    appHeader.style.display = data.enabled ? 'none' : 'flex';
});

/* =========================================================
   === 4. 微信 (WeChat) 专用逻辑 (核心部分) ===
   ========================================================= */

// 打开微信App窗口
function openChatApp() {
    try {
        window.__foregroundAppId = 'wechat';
        if (window.GlobalMusicPlayer && typeof window.GlobalMusicPlayer.setForegroundApp === 'function') {
            window.GlobalMusicPlayer.setForegroundApp('wechat');
        }
    } catch (e) {}

    const appWindow = document.getElementById('app-window');
    const appTitle = document.getElementById('app-title-text');
    const appContent = document.getElementById('app-content-area');
    
    if (!appWindow || !appTitle || !appContent) return;
    
    // 1. 【核心修复】强制清除容器上的残留样式，并移除 padding 防止遮挡
    appContent.setAttribute('style', 'padding: 0; overflow: hidden;'); 

    // 2. 隐藏原有的顶部加号（因为我们现在有了自定义Header）
    const topPlusBtn = document.getElementById('top-plus-btn');
    if (topPlusBtn) {
        topPlusBtn.style.display = 'none'; 
    }
    
    // 隐藏默认标题栏（因为我们有自定义Header）
    // appTitle.parentElement is .app-header
    if (appTitle && appTitle.parentElement) {
        appTitle.parentElement.style.display = 'none';
    }
    
    // 渲染 Kawaii Soft UI 结构
    appContent.innerHTML = `
        <div class="w-full h-full bg-gray-50 flex flex-col relative overflow-hidden font-sans">
            
            <!-- Tab Pages Container -->
            <div class="w-full h-full pb-16 relative">
                
                <!-- Tab: Chat (Home) -->
                <div id="tab-chat" class="chat-tab-page w-full h-full flex flex-col relative">
                    <!-- 1. Custom Header -->
                    <div class="flex flex-row justify-between items-center px-4 pt-6 pb-2 bg-gray-50 z-10">
                        <div class="text-2xl text-gray-600 cursor-pointer w-10" onclick="closeApp(); document.querySelector('.app-header').style.display='flex'"><i class='bx bx-chevron-left'></i></div>
                        <div id="wechat-header-kaomoji" class="text-xl font-bold text-gray-800 tracking-wider flex-1 text-center" contenteditable="true">· ◡ ·</div>
                        <div class="flex items-center justify-end gap-2 w-20">
                            <div class="text-2xl text-gray-600 cursor-pointer w-10 text-center" onclick="triggerWechatContactImport()"><i class='bx bx-upload'></i></div>
                            <div class="text-2xl text-gray-600 cursor-pointer w-10 text-right" onclick="window.openCreator && window.openCreator()"><i class='bx bx-plus'></i></div>
                        </div>
                    </div>
                    <input type="file" id="wechat-contact-import-input" accept="application/json,.json" style="display:none;">

                    <!-- Scrollable Content Area -->
                    <div class="flex-1 overflow-y-auto px-4 no-scrollbar">
                        
                        <!-- 2. Search Bar -->
                        <div class="mt-2 mb-4">
                            <div class="w-full h-10 bg-gray-100 rounded-full flex items-center px-4 text-gray-400">
                                <i class='bx bx-search text-lg mr-2'></i>
                                <input type="text" placeholder="搜索聊天记录" class="bg-transparent border-none outline-none text-sm w-full text-gray-600 placeholder-gray-400" oninput="filterChatList(this.value)">
                            </div>
                        </div>

                        <!-- 3. Relationship Stats Card (Redesigned) -->
                        <div id="relationship-stats-card" class="w-full bg-white rounded-3xl shadow-sm p-4 flex flex-row items-center justify-between mb-6 relative">
                            <!-- Avatars Area -->
                            <div class="flex items-center gap-3 pl-2">
                                 <!-- User Avatar -->
                                 <div class="w-12 h-12 rounded-full bg-gray-200 border-2 border-white overflow-hidden shadow-sm">
                                     <img id="stats-user-avatar" src="assets/chushitouxiang.jpg" class="w-full h-full object-cover">
                                 </div>
                                 <!-- Partner Avatar (Clickable) -->
                                 <div class="w-12 h-12 rounded-full bg-gray-200 border-2 border-white overflow-hidden shadow-sm cursor-pointer relative active:scale-95 transition-transform" onclick="openStatsPartnerSelector()">
                                     <img id="stats-partner-avatar" src="assets/icons/icon-placeholder.png" class="w-full h-full object-cover">
                                 </div>
                            </div>

                            <!-- Stats Text -->
                            <div class="flex flex-col items-end flex-1 pr-4">
                                <div class="text-lg font-bold text-black">已认识 <span id="stats-days" class="text-pink-500">0</span> 天</div>
                                <div class="text-xs text-gray-400 mt-1">共聊天 <span id="stats-count">0</span> 条</div>
                            </div>
                            
                            <!-- Heart Icon -->
                            <div class="pr-1">
                                 <i class='bx bxs-heart text-3xl text-pink-400'></i>
                            </div>
                        </div>

                        <!-- 4. Group Filter Bar (Dynamic) -->
                        <div id="chat-filter-bar" class="w-full bg-white rounded-2xl py-3 px-4 flex items-center gap-4 mb-6 shadow-sm overflow-x-auto no-scrollbar">
                             <!-- Will be populated by renderFilterBar() -->
                        </div>

                        <!-- 5. Chat Lists -->
                        <!-- Area A: Pinned -->
                        <div id="pinned-section" class="mb-4 hidden">
                             <div class="text-xs text-gray-400 mb-2 ml-1 font-medium">置顶</div>
                             <div id="pinned-chat-list-container" class="flex flex-col gap-3">
                                 <!-- Pinned items will be injected here -->
                             </div>
                        </div>

                        <!-- Area B: Normal -->
                        <div>
                             <div class="text-xs text-gray-400 mb-2 ml-1 font-medium">消息</div>
                             <div id="kawaii-chat-list-container" class="flex flex-col gap-3">
                                 <!-- Normal items will be injected here -->
                             </div>
                        </div>
                    </div>
                </div>

                <!-- Tab: Moments (Discover) -->
                <div id="moments-view" class="chat-tab-page w-full h-full hidden bg-white overflow-y-auto relative">
                    <!-- Moments content will be rendered here -->
                </div>

                <!-- Tab: Me -->
                <div id="mine-view" class="chat-tab-page w-full h-full hidden bg-white overflow-y-auto">
                    <!-- Profile content -->
                </div>

            </div>
            
            <!-- Bottom Bar -->
            <div class="absolute bottom-0 w-full h-16 bg-white/90 backdrop-blur-md border-t border-gray-100 flex items-center justify-around z-20 pb-2">
                 <div class="chat-nav-btn active text-black flex flex-col items-center gap-1 cursor-pointer" onclick="switchWechatTab('chat', this)">
                     <i class='bx bxs-message-rounded-dots text-2xl'></i>
                     <span class="text-[10px] font-medium">Chats</span>
                 </div>
                 <div class="chat-nav-btn text-gray-300 flex flex-col items-center gap-1 cursor-pointer" onclick="switchWechatTab('discover', this)">
                     <i class='bx bx-compass text-2xl'></i>
                     <span class="text-[10px] font-medium">Moments</span>
                 </div>
                 <div class="chat-nav-btn text-gray-300 flex flex-col items-center gap-1 cursor-pointer" onclick="switchWechatTab('me', this)">
                     <i class='bx bx-user text-2xl'></i>
                     <span class="text-[10px] font-medium">Me</span>
                 </div>
            </div>
        </div>
    `;
    
    // 显示窗口
    appWindow.classList.add('active');

    (function () {
        const el = document.getElementById('wechat-header-kaomoji');
        if (!el) return;
        const key = 'wechat_chatlist_kaomoji';
        const sanitize = (v) => String(v || '').replace(/\r?\n/g, ' ').trim().slice(0, 40);
        const saved = sanitize(localStorage.getItem(key));
        if (saved) el.innerText = saved;

        let t = null;
        const save = () => {
            const val = sanitize(el.innerText);
            if (val) {
                localStorage.setItem(key, val);
            } else {
                try { localStorage.removeItem(key); } catch (e) { }
                el.innerText = '· ◡ ·';
            }
        };

        el.addEventListener('keydown', (e) => {
            if (e && e.key === 'Enter') {
                e.preventDefault();
                try { el.blur(); } catch (e2) { }
            }
        });
        el.addEventListener('blur', save);
        el.addEventListener('input', () => {
            if (t) clearTimeout(t);
            t = setTimeout(save, 250);
        });
    })();

    (function () {
        const input = document.getElementById('wechat-contact-import-input');
        if (!input) return;
        input.onchange = function () {
            if (window.importWechatContactFromInput) window.importWechatContactFromInput(this);
        };
    })();
    
    // 渲染列表
    loadWechatChatList();
}

// 【核心逻辑】读取 localStorage 并生成列表 HTML (适配 Kawaii Soft UI)
function loadWechatChatList(forceRender) {
    const pinnedContainer = document.getElementById('pinned-chat-list-container');
    const normalContainer = document.getElementById('kawaii-chat-list-container');
    const pinnedSection = document.getElementById('pinned-section');
    
    if (!normalContainer) return;

    // 如果有 initData 且未强制渲染，则先初始化数据
    if (!forceRender && typeof window.initData === 'function') {
        try {
            const p = window.initData();
            if (p && typeof p.then === 'function') {
                normalContainer.innerHTML = '<div style="padding:40px; text-align:center; color:#999;">加载中...</div>';
                p.then(function () {
                    loadWechatChatList(true);
                }).catch(function (e) {
                    console.error(e);
                    loadWechatChatList(true);
                });
                return;
            }
        } catch (e) { console.error(e); }
    }

    if (pinnedContainer) pinnedContainer.innerHTML = '';
    normalContainer.innerHTML = '';

    // 1. 获取角色列表
    let profiles = {};
    if (window.charProfiles && typeof window.charProfiles === 'object') {
        profiles = window.charProfiles;
    } else {
        const savedProfiles = localStorage.getItem('wechat_charProfiles');
        if (savedProfiles) {
            try { profiles = JSON.parse(savedProfiles); } catch (e) { console.error(e); }
        }
    }

    const ids = Object.keys(profiles);

    if (ids.length === 0) {
        normalContainer.innerHTML = '<div style="padding:40px; text-align:center; color:#999;">暂无消息<br>点击右上角 + 号添加角色</div>';
        if (pinnedSection) pinnedSection.classList.add('hidden');
        return;
    }

    // 2. 获取聊天记录和未读数
    let chatData = window.chatData || {};
    if (!chatData || Object.keys(chatData).length === 0) {
         try { chatData = JSON.parse(localStorage.getItem('wechat_chatData') || '{}'); } catch(e){}
    }
    
    let unreadMap = window.chatUnread || {};
    if (!unreadMap || Object.keys(unreadMap).length === 0) {
         try { unreadMap = JSON.parse(localStorage.getItem('wechat_unread') || '{}'); } catch(e){}
    }

    // 3. 排序 (按最后一条消息时间倒序)
    const sortedIds = ids.slice().sort((a, b) => {
        const ha = Array.isArray(chatData[a]) ? chatData[a] : [];
        const hb = Array.isArray(chatData[b]) ? chatData[b] : [];
        const lastTa = ha.length ? (ha[ha.length - 1].timestamp || 0) : 0;
        const lastTb = hb.length ? (hb[hb.length - 1].timestamp || 0) : 0;
        return lastTb - lastTa; // Descending
    });

    let hasPinned = false;
    let maxMsgCount = -1;
    let mostChattedId = null;

    // 4. 遍历并渲染
    sortedIds.forEach(id => {
        const p = profiles[id];
        if (!p) return;

        const history = Array.isArray(chatData[id]) ? chatData[id] : [];
        
        // 统计最常联系人 (Relationship Stats)
        if (history.length > maxMsgCount) {
            maxMsgCount = history.length;
            mostChattedId = id;
        }

        // 获取最后一条消息
        let lastMsgObj = {};
        let lastTimeDisplay = "";
        if (history.length > 0) {
            lastMsgObj = history[history.length - 1];
            // 简单防错：如果最后一条是 hidden，往前找
            for (let i = history.length - 1; i >= 0; i--) {
                if (!history[i].hidden) {
                    lastMsgObj = history[i];
                    break;
                }
            }
        }
        
        // 时间格式化
        if (lastMsgObj.timestamp) {
            const d = new Date(lastMsgObj.timestamp);
            const now = new Date();
            if (d.toDateString() === now.toDateString()) {
                lastTimeDisplay = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            } else {
                lastTimeDisplay = `${d.getMonth()+1}/${d.getDate()}`;
            }
        }

        // 消息内容预览
        let msgPreview = "暂无消息";
        if (lastMsgObj.content) {
            if (lastMsgObj.content.includes('data:image') || lastMsgObj.content.includes('<img')) {
                msgPreview = "[图片]";
            } else {
                msgPreview = lastMsgObj.content;
            }
        } else if (p.desc) {
            msgPreview = p.desc;
        }

        // 计算未读数
        let unreadCount = 0;
        const info = unreadMap[id] || {};
        const lastReadTs = info.lastReadTs || 0;
        history.forEach(m => {
             if (m.role === 'ai' && (m.timestamp || 0) > lastReadTs) unreadCount++;
        });

        const displayName = p.remark || p.nickName || p.name || id;

        // 渲染 HTML
        const isPinned = p.isPinned === true;
        if (isPinned) hasPinned = true;

        const unreadBadge = unreadCount > 0 
            ? `<div class="bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center ml-2 shadow-sm border border-white" data-unread="true">${unreadCount > 99 ? '99+' : unreadCount}</div>`
            : '';

        const html = `
            <div class="chat-item bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 active:scale-95 transition-transform duration-100 cursor-pointer border border-transparent hover:border-pink-100 select-none" 
                     onmousedown="startChatPress('${id}')" 
                     onmouseup="cancelChatPress()" 
                     onmouseleave="cancelChatPress()"
                     ontouchstart="startChatPress('${id}')" 
                     ontouchend="cancelChatPress()"
                     onclick="tryEnterChat('${id}')"
                     oncontextmenu="event.preventDefault(); handleChatLongPress('${id}')"
                     data-id="${id}"
                     data-pinned="${isPinned}"
                     data-unread="${unreadCount > 0}"
                     data-is-group="${!!p.isGroup}"
                     data-groups="${(p.groups || []).join(',')}">
                <div class="w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 border border-gray-100 relative">
                   <img src="${p.avatar || 'assets/icons/icon-placeholder.png'}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center mb-1">
                       <div class="font-bold text-gray-800 text-sm truncate pr-2">${displayName}</div>
                       <div class="flex items-center">
                           <div class="text-xs text-gray-300 flex-shrink-0">${lastTimeDisplay}</div>
                           ${unreadBadge}
                       </div>
                    </div>
                    <div class="text-xs text-gray-400 truncate flex items-center">
                        ${msgPreview}
                    </div>
                </div>
            </div>
        `;

        if (isPinned && pinnedContainer) {
            pinnedContainer.insertAdjacentHTML('beforeend', html);
        } else {
            normalContainer.insertAdjacentHTML('beforeend', html);
        }
    });

    // 控制置顶区域显示
    if (hasPinned && pinnedSection) {
        pinnedSection.classList.remove('hidden');
    } else if (pinnedSection) {
        pinnedSection.classList.add('hidden');
    }

    // 更新 Relationship Stats
    updateRelationshipStats(mostChattedId, profiles, chatData);
    
    // 渲染动态过滤栏
    renderFilterBar();
}

// 辅助：更新关系卡片 (支持手动选择)
function updateRelationshipStats(defaultId, profiles, chatData) {
    // 优先使用用户手动选择的角色 (支持 LocalStorage 持久化)
    let charId = window.currentStatsPartnerId;
    if (!charId) {
        charId = localStorage.getItem('wechat_stats_partner_id');
        if (charId && profiles[charId]) {
            window.currentStatsPartnerId = charId;
        } else {
            charId = null; // Reset if invalid
        }
    }
    if (!charId) charId = defaultId;
    
    if (!charId || !profiles[charId]) return;

    const p = profiles[charId];
    const history = chatData[charId] || [];
    const count = history.length;
    
    // 计算认识天数 (第一条消息的时间)
    let days = 0;
    if (count > 0) {
        const dayMs = 1000 * 60 * 60 * 24;
        let firstTs = 0;
        for (let i = 0; i < history.length; i++) {
            const m = history[i];
            const ts = m && typeof m.timestamp === 'number' ? m.timestamp : 0;
            if (ts > 0) {
                firstTs = ts;
                break;
            }
        }
        if (firstTs > 0) {
            const diff = Date.now() - firstTs;
            days = Math.max(1, Math.ceil(diff / dayMs));
        } else {
            days = 1;
        }
    }

    // 更新 DOM
    const userAvatarEl = document.getElementById('stats-user-avatar');
    const partnerAvatarEl = document.getElementById('stats-partner-avatar');
    const daysEl = document.getElementById('stats-days');
    const countEl = document.getElementById('stats-count');

    const personas = window.userPersonas || {};
    const userPersona = personas[charId] || {};
    const userAvatar = userPersona.avatar || localStorage.getItem('user_avatar') || 'assets/chushitouxiang.jpg';
    if (userAvatarEl) userAvatarEl.src = userAvatar;

    if (partnerAvatarEl) partnerAvatarEl.src = p.avatar || 'assets/icons/icon-placeholder.png';
    if (daysEl) daysEl.innerText = days;
    if (countEl) countEl.innerText = count;
}

// 辅助：分类过滤
window.filterChatListByCategory = function(category, btnEl) {
    // 1. 更新按钮样式
    const pills = document.querySelectorAll('.filter-pill');
    pills.forEach(p => {
        // Remove active styles
        p.classList.remove('bg-pink-50', 'text-pink-600', 'border', 'border-pink-200');
        // Add inactive styles
        p.classList.add('bg-gray-100', 'text-gray-500');
    });
    if (btnEl) {
        // Add active styles
        btnEl.classList.remove('bg-gray-100', 'text-gray-500');
        btnEl.classList.add('bg-pink-50', 'text-pink-600', 'border', 'border-pink-200');
    }

    // 2. 执行过滤
    const allItems = document.querySelectorAll('.chat-item');
    allItems.forEach(item => {
        let show = false;
        if (category === 'all') {
            show = true;
        } else if (category === 'group') {
            show = item.getAttribute('data-is-group') === 'true';
        } else {
            // Check custom group
            const groupsStr = item.getAttribute('data-groups') || '';
            const groups = groupsStr.split(',');
            show = groups.includes(category);
        }
        
        item.style.display = show ? 'flex' : 'none';
    });
}

// 简单的搜索过滤功能 (保留)
window.filterChatList = function(keyword) {
    keyword = keyword.toLowerCase();
    const allItems = document.querySelectorAll('.chat-item');
    allItems.forEach(item => {
        const nameEl = item.querySelector('.font-bold');
        const msgEl = item.querySelector('.text-xs.text-gray-400'); // Note: class selector might need to be precise
        if (nameEl) {
            const text = (nameEl.innerText + " " + (msgEl ? msgEl.innerText : "")).toLowerCase();
            item.style.display = text.includes(keyword) ? 'flex' : 'none';
        }
    });
};

/* === 把 apps.js 里的 switchWechatTab 函数替换成这个 === */

// 【关键补丁】Tab 切换功能 + 自动渲染朋友圈
function switchWechatTab(tabName, btnElement) {
    const pages = Array.from(document.querySelectorAll('.chat-tab-page'));
    pages.forEach(el => {
        el.style.display = '';
        el.classList.add('hidden');
    });
    
    // 2. 显示目标页面
    const tabMap = {
        'chat': 'tab-chat',
        'discover': 'moments-view',
        'me': 'mine-view'
    };
    const targetId = tabMap[tabName];
    const targetPage = document.getElementById(targetId);
    if (targetPage) targetPage.classList.remove('hidden');
    
    // 3. 更新底部按钮样式
    document.querySelectorAll('.chat-nav-btn').forEach(btn => {
        btn.classList.remove('active', 'text-black');
        btn.classList.add('text-gray-300');
    });
    if(btnElement) {
        btnElement.classList.add('active', 'text-black');
        btnElement.classList.remove('text-gray-300');
    }

    // 🔥【新增逻辑】如果用户点了“发现”页，且朋友圈渲染函数存在，就立即执行渲染
    if (tabName === 'discover') {
        const appWindow = document.getElementById('app-window');
        if (appWindow) {
            appWindow.classList.add('moments-fullscreen');
        }
        document.body.classList.add('moments-hide-status');
        if (typeof window.renderMoments === 'function') {
            window.renderMoments();
        } else {
            console.warn("注意：window.renderMoments 未找到。请检查 moments.js 是否已引入");
        }
    } else {
        const appWindow = document.getElementById('app-window');
        if (appWindow) {
            appWindow.classList.remove('moments-fullscreen');
        }
        document.body.classList.remove('moments-hide-status');
    }

    if (tabName === 'me' && window.MineCore && typeof window.MineCore.show === 'function') {
        window.MineCore.show();
    }
}

// 【关键补丁】进入聊天室（不跳转页面，切换到全屏聊天层）
function enterChatRoom(characterId) {
    try {
        window.__foregroundAppId = 'chat';
        if (window.GlobalMusicPlayer && typeof window.GlobalMusicPlayer.setForegroundApp === 'function') {
            window.GlobalMusicPlayer.setForegroundApp('chat');
        }
    } catch (e) {}

    // 1. 保存当前聊谁
    window.currentChatRole = characterId;
    localStorage.setItem('currentChatId', characterId);

    // 2. 关闭列表窗口 (App Window)
    closeApp(); 
    // 同时隐藏右上角的加号（因为进入聊天室不需要那个加号了）
    const plusBtn = document.getElementById('top-plus-btn');
    if(plusBtn) plusBtn.style.display = 'none';

    // 3. 打开全屏聊天大盒子
    document.getElementById('desktop-view').style.display = 'none'; // 隐藏桌面
    document.getElementById('chat-view').style.display = 'block';   // 显示聊天室容器

    // 4. 调用 chat.js 里的 enterChat 函数来渲染聊天内容
    if (typeof window.enterChat === 'function') {
        window.enterChat(characterId);
    } else {
        console.error("未找到 enterChat 函数，请检查 chat.js 是否引入");
    }
}

// 暴露给全局
window.openChatApp = openChatApp;
window.loadWechatChatList = loadWechatChatList;
window.switchWechatTab = switchWechatTab;
window.enterChatRoom = enterChatRoom;

/* =========================================================
   === 4.1 新增功能：长按菜单、自定义分组、角色选择 ===
   ========================================================= */

// --- A. 长按交互逻辑 ---
let chatPressTimer = null;
let isLongPress = false;
let longPressHandled = false; // Prevent click after long press

window.startChatPress = function(id) {
    isLongPress = false;
    longPressHandled = false;
    chatPressTimer = setTimeout(() => {
        isLongPress = true;
        longPressHandled = true;
        handleChatLongPress(id);
    }, 600); // 600ms 长按触发
}

window.cancelChatPress = function() {
    if (chatPressTimer) {
        clearTimeout(chatPressTimer);
        chatPressTimer = null;
    }
}

window.tryEnterChat = function(id) {
    // 如果刚刚触发了长按，就不进入聊天
    if (longPressHandled) {
        longPressHandled = false;
        return;
    }
    enterChatRoom(id);
}

// 长按菜单
window.handleChatLongPress = function(id) {
    // 震动反馈 (如果有 API)
    if (navigator.vibrate) navigator.vibrate(50);

    const profiles = window.charProfiles || {};
    const p = profiles[id];
    if (!p) return;

    const displayName = p.remark || p.nickName || p.name || id;

    // 创建菜单 DOM
    const existingMenu = document.getElementById('chat-long-press-menu');
    if (existingMenu) existingMenu.remove();

    const isPinned = p.isPinned === true;
    
    // 获取当前分组
    const currentGroups = p.groups || [];
    
    const menuHtml = `
        <div id="chat-long-press-menu" class="fixed inset-0 z-[10050] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" style="z-index:10050;" onclick="this.remove()">
            <div class="bg-white w-64 rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100" onclick="event.stopPropagation()">
                <div class="p-4 border-b border-gray-100 flex items-center gap-3">
                    <img src="${p.avatar}" class="w-10 h-10 rounded-full object-cover">
                    <div class="font-bold text-gray-800">${displayName}</div>
                </div>
                
                <div class="flex flex-col p-2">
                    <!-- 置顶/取消置顶 -->
                    <div class="p-3 hover:bg-gray-50 rounded-xl cursor-pointer flex items-center gap-3 text-gray-700" onclick="togglePin('${id}')">
                        <i class='bx ${isPinned ? 'bxs-pin-off' : 'bxs-pin'} text-xl'></i>
                        <span>${isPinned ? '取消置顶' : '置顶聊天'}</span>
                    </div>
                    
                    <!-- 设置分组 -->
                    <div class="p-3 hover:bg-gray-50 rounded-xl cursor-pointer flex items-center gap-3 text-gray-700" onclick="openGroupSelector('${id}')">
                        <i class='bx bx-purchase-tag-alt text-xl'></i>
                        <span>设置分组</span>
                    </div>

                    <div class="p-3 hover:bg-gray-50 rounded-xl cursor-pointer flex items-center gap-3 text-gray-700" onclick="exportWechatContactBackup('${id}')">
                        <i class='bx bx-download text-xl'></i>
                        <span>导出该联系人</span>
                    </div>

                    <!-- 删除聊天 (可选) -->
                    <div class="p-3 hover:bg-red-50 rounded-xl cursor-pointer flex items-center gap-3 text-red-500" onclick="deleteChat('${id}')">
                        <i class='bx bx-trash text-xl'></i>
                        <span>删除聊天</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', menuHtml);
}

window.togglePin = function(id) {
    const profiles = window.charProfiles || {};
    if (profiles[id]) {
        profiles[id].isPinned = !profiles[id].isPinned;
        saveProfiles(profiles);
        loadWechatChatList(); // 重新渲染
    }
    // 关闭菜单
    const menu = document.getElementById('chat-long-press-menu');
    if (menu) menu.remove();
}

window.deleteChat = function(id) {
    if(!confirm("确定要删除与该角色的聊天记录吗？(不可恢复)")) return;
    
    // 删除数据
    if(window.chatData && window.chatData[id]) {
        delete window.chatData[id];
        localStorage.setItem('wechat_chatData', JSON.stringify(window.chatData));
    }
    
    // 重新渲染
    loadWechatChatList();
    
    const menu = document.getElementById('chat-long-press-menu');
    if (menu) menu.remove();
}

// 辅助：保存 Profiles
function saveProfiles(profiles) {
    window.charProfiles = profiles;
    localStorage.setItem('wechat_charProfiles', JSON.stringify(profiles));
}

window.triggerWechatContactImport = function () {
    const input = document.getElementById('wechat-contact-import-input');
    if (!input) {
        alert('找不到导入控件，请重新打开微信页面');
        return;
    }
    input.value = '';
    input.click();
};

window.exportWechatContactBackup = async function (roleId) {
    const closeMenu = function () {
        const menu = document.getElementById('chat-long-press-menu');
        if (menu) menu.remove();
    };

    const ensureReady = async function () {
        if (typeof window.initData !== 'function') return;
        try {
            const ret = window.initData();
            if (ret && typeof ret.then === 'function') await ret;
        } catch (e) { }
    };

    const safeFileName = function (name) {
        return String(name || '')
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 40) || 'contact';
    };

    const downloadText = function (filename, text) {
        const blob = new Blob([String(text || '')], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    try {
        await ensureReady();
        const id = String(roleId || '');
        const profiles = window.charProfiles || {};
        const p = profiles[id];
        if (!p) {
            alert('导出失败：找不到该联系人');
            closeMenu();
            return;
        }

        const payload = {
            __shubao_contact_backup__: 1,
            version: 1,
            createdAt: new Date().toISOString(),
            roleId: id,
            profile: p,
            chatData: (window.chatData && window.chatData[id]) ? window.chatData[id] : [],
            chatMapData: (window.chatMapData && window.chatMapData[id]) ? window.chatMapData[id] : null,
            userPersona: (window.userPersonas && window.userPersonas[id]) ? window.userPersonas[id] : null,
            chatBackground: (window.chatBackgrounds && window.chatBackgrounds[id]) ? window.chatBackgrounds[id] : null,
            callLogs: (window.callLogs && window.callLogs[id]) ? window.callLogs[id] : [],
            unread: (window.chatUnread && window.chatUnread[id]) ? window.chatUnread[id] : null,
            memoryArchive: (window.memoryArchiveStore && window.memoryArchiveStore[id]) ? window.memoryArchiveStore[id] : null
        };

        const displayName = p.remark || p.nickName || p.name || id;
        const stamp = payload.createdAt.replace(/[:.]/g, '-');
        const filename = 'shubao-contact-' + safeFileName(displayName) + '-' + stamp + '.json';
        downloadText(filename, JSON.stringify(payload));
        closeMenu();
        alert('✅ 已导出该联系人');
    } catch (e) {
        console.error(e);
        closeMenu();
        alert('❌ 导出失败：' + (e && e.message ? e.message : '未知错误'));
    }
};

window.importWechatContactFromInput = async function (fileInput) {
    const safeParse = function (text) {
        try {
            return JSON.parse(String(text || ''));
        } catch (e) {
            return null;
        }
    };

    const ensureReady = async function () {
        if (typeof window.initData !== 'function') return;
        try {
            const ret = window.initData();
            if (ret && typeof ret.then === 'function') await ret;
        } catch (e) { }
    };

    const closeMenu = function () {
        const menu = document.getElementById('chat-long-press-menu');
        if (menu) menu.remove();
    };

    try {
        const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        if (!file) return;
        const text = await file.text();
        const json = safeParse(text);
        if (!json || typeof json !== 'object') {
            alert('❌ 导入失败：文件不是有效 JSON');
            return;
        }
        if (json.__shubao_contact_backup__ !== 1) {
            alert('❌ 导入失败：不是导出的联系人文件');
            return;
        }

        const ok = confirm('⚠️ 将导入该联系人及其聊天记录。\n\n建议先在系统设置导出一次全量备份。\n\n确定继续吗？');
        if (!ok) return;

        await ensureReady();

        const rawRoleId = String(json.roleId || '');
        const incomingProfile = (json.profile && typeof json.profile === 'object') ? json.profile : null;
        if (!rawRoleId || !incomingProfile) {
            alert('❌ 导入失败：联系人数据不完整');
            return;
        }

        const profiles = window.charProfiles || {};
        let targetId = rawRoleId;
        if (profiles[targetId]) {
            targetId = rawRoleId + '_import_' + Date.now().toString(36);
        }

        const profileCopy = Object.assign({}, incomingProfile);
        if (profileCopy.id) profileCopy.id = targetId;

        profiles[targetId] = profileCopy;
        saveProfiles(profiles);

        if (!window.chatData) window.chatData = {};
        if (!window.chatMapData) window.chatMapData = {};
        if (!window.userPersonas) window.userPersonas = {};
        if (!window.chatBackgrounds) window.chatBackgrounds = {};
        if (!window.callLogs) window.callLogs = {};
        if (!window.chatUnread) window.chatUnread = {};
        if (!window.memoryArchiveStore) window.memoryArchiveStore = {};

        if (Array.isArray(json.chatData)) window.chatData[targetId] = json.chatData;
        if (json.chatMapData && typeof json.chatMapData === 'object') window.chatMapData[targetId] = json.chatMapData;
        if (json.userPersona && typeof json.userPersona === 'object') window.userPersonas[targetId] = json.userPersona;
        if (json.chatBackground !== null && json.chatBackground !== undefined) window.chatBackgrounds[targetId] = json.chatBackground;
        if (Array.isArray(json.callLogs)) window.callLogs[targetId] = json.callLogs;
        if (json.unread && typeof json.unread === 'object') window.chatUnread[targetId] = json.unread;
        if (json.memoryArchive && typeof json.memoryArchive === 'object') window.memoryArchiveStore[targetId] = json.memoryArchive;

        try {
            if (window.DB && typeof window.DB.configLargeStore === 'function') {
                window.DB.configLargeStore();
            }
        } catch (e) { }

        if (typeof window.saveData === 'function') {
            try {
                const ret = window.saveData();
                if (ret && typeof ret.then === 'function') await ret;
            } catch (e) { }
        }

        try {
            localStorage.setItem('wechat_memory_archive_v1', JSON.stringify(window.memoryArchiveStore || {}));
        } catch (e) { }

        closeMenu();
        loadWechatChatList(true);
        alert('✅ 已导入联系人' + (targetId !== rawRoleId ? '（ID 冲突已自动改名）' : ''));
    } catch (e) {
        console.error(e);
        alert('❌ 导入失败：' + (e && e.message ? e.message : '未知错误'));
    } finally {
        try {
            if (fileInput) fileInput.value = '';
        } catch (e) { }
    }
};

// --- B. 分组逻辑 ---

window.openGroupSelector = function(id) {
    // 关闭上一级菜单
    const menu = document.getElementById('chat-long-press-menu');
    if (menu) menu.remove();

    const profiles = window.charProfiles || {};
    const p = profiles[id];
    if (!p) return;

    const currentGroups = p.groups || [];
    const allCustomGroups = JSON.parse(localStorage.getItem('wechat_custom_groups') || '[]');

    let groupsHtml = allCustomGroups.map(g => {
        const isSelected = currentGroups.includes(g);
        return `
            <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl cursor-pointer" onclick="toggleGroupForUser('${id}', '${g}')">
                <span>${g}</span>
                ${isSelected ? "<i class='bx bx-check text-green-500 text-xl'></i>" : ""}
            </div>
        `;
    }).join('');

    if (allCustomGroups.length === 0) {
        groupsHtml = `<div class="p-4 text-center text-gray-400 text-sm">暂无自定义分组<br>请在首页列表上方添加</div>`;
    }

    const modalHtml = `
        <div id="group-selector-modal" class="fixed inset-0 z-[10060] flex items-center justify-center bg-black/40 backdrop-blur-sm" style="z-index:10060;" onclick="this.remove()">
            <div class="bg-white w-64 rounded-2xl shadow-xl overflow-hidden" onclick="event.stopPropagation()">
                <div class="p-4 border-b border-gray-100 font-bold text-center">设置分组</div>
                <div class="p-2 max-h-[50vh] overflow-y-auto">
                    ${groupsHtml}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.toggleGroupForUser = function(id, groupName) {
    const profiles = window.charProfiles || {};
    if (!profiles[id]) return;

    if (!profiles[id].groups) profiles[id].groups = [];
    
    const idx = profiles[id].groups.indexOf(groupName);
    if (idx > -1) {
        profiles[id].groups.splice(idx, 1);
    } else {
        profiles[id].groups.push(groupName);
    }
    
    saveProfiles(profiles);
    
    // 刷新选择器
    const modal = document.getElementById('group-selector-modal');
    if (modal) modal.remove();
    openGroupSelector(id); // 重新打开以显示更新后的状态
    
    // 刷新列表（如果当前正在过滤该分组，可能需要移除）
    loadWechatChatList();
}


window.renderFilterBar = function() {
    const container = document.getElementById('chat-filter-bar');
    if (!container) return;

    // Load custom groups
    let customGroups = [];
    try {
        customGroups = JSON.parse(localStorage.getItem('wechat_custom_groups') || '[]');
    } catch (e) {}

    let html = `
        <div class="filter-pill px-3 py-1 rounded-full bg-pink-50 text-pink-600 border border-pink-200 text-xs font-medium cursor-pointer whitespace-nowrap" onclick="filterChatListByCategory('all', this)">全部</div>
        <div class="filter-pill px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium cursor-pointer whitespace-nowrap" onclick="filterChatListByCategory('group', this)">群聊</div>
    `;

    customGroups.forEach(g => {
        html += `<div class="filter-pill px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium cursor-pointer whitespace-nowrap" onclick="filterChatListByCategory('${g}', this)" oncontextmenu="deleteCustomGroup('${g}'); return false;">${g}</div>`;
    });

    html += `
        <div class="px-3 py-1 rounded-full bg-gray-50 text-xs font-medium text-gray-400 cursor-pointer whitespace-nowrap border border-dashed border-gray-300 flex items-center" onclick="addCustomGroup()">
            <i class='bx bx-plus'></i>
        </div>
    `;

    container.innerHTML = html;
}

window.addCustomGroup = function() {
    const name = prompt("请输入新分组名称：");
    if (!name) return;
    
    let customGroups = JSON.parse(localStorage.getItem('wechat_custom_groups') || '[]');
    if (!customGroups.includes(name)) {
        customGroups.push(name);
        localStorage.setItem('wechat_custom_groups', JSON.stringify(customGroups));
        renderFilterBar();
    }
}

window.deleteCustomGroup = function(name) {
    if (!confirm(`确定要删除分组 "${name}" 吗？`)) return;
    
    let customGroups = JSON.parse(localStorage.getItem('wechat_custom_groups') || '[]');
    customGroups = customGroups.filter(g => g !== name);
    localStorage.setItem('wechat_custom_groups', JSON.stringify(customGroups));
    renderFilterBar();
}

// --- C. 关系数据显示逻辑 ---

window.openStatsPartnerSelector = function() {
    const profiles = window.charProfiles || {};
    const ids = Object.keys(profiles);
    
    if (ids.length === 0) return;

    let listHtml = ids.map(id => {
        const p = profiles[id];
        const displayName = (p && (p.remark || p.nickName || p.name)) ? (p.remark || p.nickName || p.name) : id;
        return `
            <div class="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors" onclick="selectStatsPartner('${id}')">
                <div class="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                    <img src="${p.avatar || 'assets/icons/icon-placeholder.png'}" class="w-full h-full object-cover">
                </div>
                <div class="text-sm font-bold text-gray-700">${displayName}</div>
            </div>
        `;
    }).join('');
    
    const modalHtml = `
        <div id="stats-selector-modal" class="fixed inset-0 z-[10070] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" style="z-index:10070;" onclick="this.remove()">
            <div class="bg-white w-72 rounded-3xl shadow-2xl p-4 max-h-[60vh] flex flex-col" onclick="event.stopPropagation()">
                <div class="text-center font-bold text-gray-800 mb-4 text-lg">选择展示角色</div>
                <div class="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
                    ${listHtml}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.selectStatsPartner = function(id) {
    window.currentStatsPartnerId = id;
    localStorage.setItem('wechat_stats_partner_id', id);
    
    const modal = document.getElementById('stats-selector-modal');
    if (modal) modal.remove();
    
    // 刷新数据
    let chatData = window.chatData || {};
    if (!chatData || Object.keys(chatData).length === 0) {
         try { chatData = JSON.parse(localStorage.getItem('wechat_chatData') || '{}'); } catch(e){}
    }
    updateRelationshipStats(null, window.charProfiles, chatData);
}

/* =========================================================
   === 5. TODO 应用逻辑 ===
   ========================================================= */

// 打开TODO应用
function openTodoApp() {
    const appWindow = document.getElementById('app-window');
    const appTitle = document.getElementById('app-title-text');
    const appContent = document.getElementById('app-content-area');
    
    if (!appWindow || !appTitle || !appContent) return;
    
    // 设置标题
    appTitle.innerText = 'TODO';
    
    // 渲染TODO界面
    appContent.innerHTML = `
        <div style="height: 100%; display: flex; flex-direction: column; background: #f5f5f5;">
            <!-- 顶部添加区域 -->
            <div style="background: white; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="todo-input" placeholder="添加新的待办事项..." 
                        style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                    <button onclick="addTodoItem()" 
                        style="background: #007aff; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        添加
                    </button>
                </div>
            </div>
            
            <!-- 分类标签 -->
            <div style="background: white; padding: 10px 15px; display: flex; gap: 10px; border-bottom: 1px solid #eee;">
                <button class="todo-filter-btn active" data-filter="all" onclick="filterTodos('all', this)"
                    style="padding: 6px 15px; border: none; background: #007aff; color: white; border-radius: 15px; cursor: pointer; font-size: 13px;">
                    全部
                </button>
                <button class="todo-filter-btn" data-filter="active" onclick="filterTodos('active', this)"
                    style="padding: 6px 15px; border: none; background: #e5e5ea; color: #333; border-radius: 15px; cursor: pointer; font-size: 13px;">
                    进行中
                </button>
                <button class="todo-filter-btn" data-filter="completed" onclick="filterTodos('completed', this)"
                    style="padding: 6px 15px; border: none; background: #e5e5ea; color: #333; border-radius: 15px; cursor: pointer; font-size: 13px;">
                    已完成
                </button>
            </div>
            
            <!-- TODO列表区域 -->
            <div id="todo-list-container" style="flex: 1; overflow-y: auto; padding: 15px;">
                <!-- 列表项将通过JS动态生成 -->
            </div>
            
            <!-- 底部统计 -->
            <div style="background: white; padding: 12px 15px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <span id="todo-count" style="color: #666; font-size: 13px;">0 个待办事项</span>
                <button onclick="clearCompletedTodos()" 
                    style="background: none; border: none; color: #ff3b30; cursor: pointer; font-size: 13px;">
                    清除已完成
                </button>
            </div>
        </div>
    `;
    
    // 显示窗口
    appWindow.classList.add('active');
    
    // 加载TODO列表
    loadTodoList();
}

// 加载TODO列表
function loadTodoList(filter = 'all') {
    const container = document.getElementById('todo-list-container');
    if (!container) return;
    
    // 从localStorage读取数据
    let todos = [];
    try {
        const saved = localStorage.getItem('todo_list');
        if (saved) todos = JSON.parse(saved);
    } catch(e) { console.error(e); }
    
    // 过滤
    let filteredTodos = todos;
    if (filter === 'active') {
        filteredTodos = todos.filter(t => !t.completed);
    } else if (filter === 'completed') {
        filteredTodos = todos.filter(t => t.completed);
    }
    
    // 清空容器
    container.innerHTML = '';
    
    // 如果没有数据
    if (filteredTodos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">✓</div>
                <div style="font-size: 16px;">暂无待办事项</div>
                <div style="font-size: 13px; margin-top: 8px;">在上方输入框添加新的目标吧！</div>
            </div>
        `;
        updateTodoCount();
        return;
    }
    
    // 生成列表项
    filteredTodos.forEach((todo, index) => {
        const realIndex = todos.findIndex(t => t.id === todo.id);
        const itemHtml = `
            <div class="todo-item" style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 10px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                    onchange="toggleTodo(${realIndex})"
                    style="width: 20px; height: 20px; cursor: pointer;">
                <div style="flex: 1; ${todo.completed ? 'text-decoration: line-through; color: #999;' : 'color: #333;'}">
                    ${todo.text}
                </div>
                <button onclick="deleteTodo(${realIndex})" 
                    style="background: none; border: none; color: #ff3b30; cursor: pointer; font-size: 18px; padding: 5px;">
                    🗑️
                </button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHtml);
    });
    
    updateTodoCount();
}

// 添加TODO项
function addTodoItem() {
    const input = document.getElementById('todo-input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) {
        alert('请输入待办事项内容');
        return;
    }
    
    // 读取现有数据
    let todos = [];
    try {
        const saved = localStorage.getItem('todo_list');
        if (saved) todos = JSON.parse(saved);
    } catch(e) { console.error(e); }
    
    // 添加新项
    todos.push({
        id: Date.now(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    });
    
    // 保存
    localStorage.setItem('todo_list', JSON.stringify(todos));
    
    // 清空输入框
    input.value = '';
    
    // 重新加载列表
    loadTodoList();
}

// 切换完成状态
function toggleTodo(index) {
    let todos = [];
    try {
        const saved = localStorage.getItem('todo_list');
        if (saved) todos = JSON.parse(saved);
    } catch(e) { console.error(e); }
    
    if (todos[index]) {
        todos[index].completed = !todos[index].completed;
        localStorage.setItem('todo_list', JSON.stringify(todos));
        loadTodoList();
    }
}

// 删除TODO项
function deleteTodo(index) {
    if (!confirm('确定要删除这个待办事项吗？')) return;
    
    let todos = [];
    try {
        const saved = localStorage.getItem('todo_list');
        if (saved) todos = JSON.parse(saved);
    } catch(e) { console.error(e); }
    
    todos.splice(index, 1);
    localStorage.setItem('todo_list', JSON.stringify(todos));
    loadTodoList();
}

// 清除已完成的TODO
function clearCompletedTodos() {
    let todos = [];
    try {
        const saved = localStorage.getItem('todo_list');
        if (saved) todos = JSON.parse(saved);
    } catch(e) { console.error(e); }
    
    const activeTodos = todos.filter(t => !t.completed);
    
    if (activeTodos.length === todos.length) {
        alert('没有已完成的待办事项');
        return;
    }
    
    if (!confirm('确定要清除所有已完成的待办事项吗？')) return;
    
    localStorage.setItem('todo_list', JSON.stringify(activeTodos));
    loadTodoList();
}

// 过滤TODO
function filterTodos(filter, btnElement) {
    // 更新按钮样式
    document.querySelectorAll('.todo-filter-btn').forEach(btn => {
        btn.style.background = '#e5e5ea';
        btn.style.color = '#333';
        btn.classList.remove('active');
    });
    
    if (btnElement) {
        btnElement.style.background = '#007aff';
        btnElement.style.color = 'white';
        btnElement.classList.add('active');
    }
    
    // 重新加载列表
    loadTodoList(filter);
}

// 更新统计数字
function updateTodoCount() {
    const countEl = document.getElementById('todo-count');
    if (!countEl) return;
    
    let todos = [];
    try {
        const saved = localStorage.getItem('todo_list');
        if (saved) todos = JSON.parse(saved);
    } catch(e) { console.error(e); }
    
    const activeCount = todos.filter(t => !t.completed).length;
    countEl.innerText = `${activeCount} 个待办事项`;
}

// 暴露给全局
window.openTodoApp = openTodoApp;
window.loadTodoList = loadTodoList;
window.addTodoItem = addTodoItem;
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
window.clearCompletedTodos = clearCompletedTodos;
window.filterTodos = filterTodos;
