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
    'music': { title: '音乐', content: '<div style="padding:20px; text-align:center;">正在播放: Happy Together</div>' },
    'todo': { title: 'TODO', content: '' }, // TODO内容将通过函数动态生成
};
  // 打开 App 主函数
function openApp(appId) {
    // 【核心修复】防止样式残留 - 清除容器上的所有内联样式
    if (appContent) appContent.setAttribute('style', ''); 

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

    const data = appContentData[appId] || { title: '应用', content: '<div style="padding:20px; text-align:center;">开发中...</div>' };

    if (appTitle) appTitle.innerText = data.title;
    if (appContent) appContent.innerHTML = data.content;

    if(appWindow) appWindow.classList.add('active');
}

function closeApp() {
    if(appWindow) appWindow.classList.remove('active');
}

// 暴露给全局
window.openApp = openApp;
window.closeApp = closeApp;
window.renderApps = renderApps;
window.renderDock = renderDock;

/* =========================================================
   === 4. 微信 (WeChat) 专用逻辑 (核心部分) ===
   ========================================================= */

// 打开微信App窗口
function openChatApp() {
    const appWindow = document.getElementById('app-window');
    const appTitle = document.getElementById('app-title-text');
    const appContent = document.getElementById('app-content-area');
    
    if (!appWindow || !appTitle || !appContent) return;
    
    // 1. 【核心修复】强制清除容器上的残留样式，并移除 padding 防止遮挡
    appContent.setAttribute('style', 'padding: 0; overflow: hidden;'); 

    // 2. 【核心修复】夺回右上角加号控制权
    const topPlusBtn = document.getElementById('top-plus-btn');
    if (topPlusBtn) {
        topPlusBtn.style.display = 'block'; // 确保显示
        // 重新绑定点击事件为"创建角色"
        topPlusBtn.onclick = function() {
            if(typeof window.openCreator === 'function') {
                window.openCreator();
            }
        };
    }
    
    // 设置标题
    appTitle.innerText = '微信';
    
    // 渲染微信的框架 (消息/发现/我)
    appContent.innerHTML = `
        <div class="chat-layout-container">
            <div class="chat-content-stage" id="wechat-stage">
                <div id="tab-chat" class="chat-tab-page" style="display: block;">
                    <div id="chat-list-container"></div>
                </div>
                <div id="tab-discover" class="chat-tab-page" style="display: none;">
                    <div id="moments-view"></div>
                    <div id="moments-input-bar">
                        <input type="text" id="moments-comment-input" placeholder="评论">
                    </div>
                </div>
                <div id="tab-me" class="chat-tab-page" style="display: none;">
                    <div id="mine-view"></div>
                </div>
            </div>
            <div class="chat-bottom-bar">
                <div class="chat-nav-btn active" onclick="switchWechatTab('chat', this)">
                    <i class="fas fa-comment"></i>
                    <span>消息</span>
                </div>
                <div class="chat-nav-btn" onclick="switchWechatTab('discover', this)">
                    <i class="fas fa-compass"></i>
                    <span>发现</span>
                </div>
                <div class="chat-nav-btn" onclick="switchWechatTab('me', this)">
                    <i class="fas fa-user"></i>
                    <span>我</span>
                </div>
            </div>
        </div>
    `;

    
    // 显示窗口
    appWindow.classList.add('active');
    
    // 【关键】调用渲染函数 (这里补上了你缺失的函数！)
    loadWechatChatList();
}

// 【关键补丁】读取 localStorage 并生成列表 HTML
function loadWechatChatList(forceRender) {
    const container = document.getElementById('chat-list-container');
    if (!container) return;

    if (!forceRender && typeof window.initData === 'function') {
        try {
            const p = window.initData();
            if (p && typeof p.then === 'function') {
                container.innerHTML = '<div style="padding:40px; text-align:center; color:#999;">加载中...</div>';
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

    container.innerHTML = '';

    let profiles = {};
    if (window.charProfiles && typeof window.charProfiles === 'object') {
        profiles = window.charProfiles;
    } else {
        const savedProfiles = localStorage.getItem('wechat_charProfiles');
        if (savedProfiles) {
            try {
                profiles = JSON.parse(savedProfiles);
            } catch (e) { console.error(e); }
        }
    }

    const ids = Object.keys(profiles);

    if (ids.length === 0) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:#999;">暂无消息<br>点击右上角 + 号添加角色</div>';
        return;
    }

    let chatData = window.chatData;
    if (!chatData || typeof chatData !== 'object') {
        chatData = {};
        const savedChat = localStorage.getItem('wechat_chatData');
        if (savedChat) {
            try {
                chatData = JSON.parse(savedChat);
            } catch (e) { console.error(e); }
        }
    }

    let unreadMap = window.chatUnread;
    if (!unreadMap || typeof unreadMap !== 'object') {
        unreadMap = {};
        const savedUnread = localStorage.getItem('wechat_unread');
        if (savedUnread) {
            try {
                unreadMap = JSON.parse(savedUnread);
            } catch (e) { console.error(e); }
        }
    }

    function formatLastActiveTime(ts) {
        if (!ts) return '';
        const date = new Date(ts);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

        if (ts >= todayStart) {
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            return hh + ':' + mm;
        }
        if (ts >= yesterdayStart) {
            return '昨天';
        }
        if (date.getFullYear() === now.getFullYear()) {
            return (date.getMonth() + 1) + '/' + date.getDate();
        }
        return date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
    }

    const sortedIds = ids.slice().sort((a, b) => {
        const ha = Array.isArray(chatData[a]) ? chatData[a] : [];
        const hb = Array.isArray(chatData[b]) ? chatData[b] : [];
        const lastTa = ha.length ? (ha[ha.length - 1].timestamp || 0) : 0;
        const lastTb = hb.length ? (hb[hb.length - 1].timestamp || 0) : 0;

        if (!lastTa && !lastTb) return 0;
        if (!lastTa) return 1;
        if (!lastTb) return -1;
        return lastTb - lastTa;
    });

    sortedIds.forEach(id => {
        const p = profiles[id] || {};
        let lastMsgDisplay = "暂无消息";
        let lastTimeDisplay = "";
        let unreadCount = 0;

        const history = chatData[id];
        if (Array.isArray(history) && history.length > 0) {
            let lastMsgObj = null;
            for (let i = history.length - 1; i >= 0; i--) {
                const m = history[i];
                if (!m) continue;
                if (m.hidden) continue;
                lastMsgObj = m;
                break;
            }
            if (!lastMsgObj) {
                lastMsgObj = history[history.length - 1] || {};
            }
            lastTimeDisplay = formatLastActiveTime(lastMsgObj.timestamp);
            const content = typeof lastMsgObj.content === 'string' ? lastMsgObj.content : '';
            if (content && (content.indexOf('data:image') !== -1 || content.indexOf('<img') !== -1)) {
                lastMsgDisplay = "[图片]";
            } else if (content) {
                lastMsgDisplay = content;
            }
            const info = unreadMap[id] || {};
            const lastReadTs = info.lastReadTs || 0;
            for (let i = 0; i < history.length; i++) {
                const m = history[i];
                if (!m || m.role !== 'ai') continue;
                const ts = m.timestamp || 0;
                if (ts > lastReadTs) unreadCount++;
            }
        } else if (p.desc) {
            lastMsgDisplay = p.desc;
        }

        const avatar = p.avatar || 'assets/default-avatar.png';
        const name = p.nickName || id;

        let unreadHtml = '';
        if (unreadCount > 0) {
            const numText = unreadCount > 99 ? '99+' : String(unreadCount);
            unreadHtml = `<span class="chat-unread-badge">${numText}</span>`;
        }

        const html = `
        <div class="chat-list-item" onclick="enterChatRoom('${id}')">
            <div class="avatar-circle" style="padding:0; background:none; overflow:hidden;">
                <img src="${avatar}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div class="chat-text-col">
                <div class="chat-name">${name}</div>
                <div class="chat-preview">${lastMsgDisplay}</div>
            </div>
            <div class="chat-time">${lastTimeDisplay}${unreadHtml}</div>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
}

/* === 把 apps.js 里的 switchWechatTab 函数替换成这个 === */

// 【关键补丁】Tab 切换功能 + 自动渲染朋友圈
function switchWechatTab(tabName, btnElement) {
    // 1. 隐藏所有页面
    document.querySelectorAll('.chat-tab-page').forEach(el => el.style.display = 'none');
    
    // 2. 显示目标页面
    const targetPage = document.getElementById('tab-' + tabName);
    if (targetPage) targetPage.style.display = 'block';
    
    // 3. 更新底部按钮样式
    document.querySelectorAll('.chat-nav-btn').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    // 🔥【新增逻辑】如果用户点了“发现”页，且朋友圈渲染函数存在，就立即执行渲染
    if (tabName === 'discover') {
        const appWindow = document.getElementById('app-window');
        if (appWindow) {
            appWindow.classList.add('moments-fullscreen');
        }
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
    }

    if (tabName === 'me' && window.MineCore && typeof window.MineCore.show === 'function') {
        window.MineCore.show();
    }
}

// 【关键补丁】进入聊天室（不跳转页面，切换到全屏聊天层）
function enterChatRoom(characterId) {
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
