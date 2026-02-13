/* =========================================================
   文件路径：JS脚本文件夹/appearance.js
   作用：外观设置逻辑 (含全屏开关记忆功能)
   ========================================================= */

const DEFAULT_APP_LIST = [
    { name: "微信", id: "wechat", iconClass: "fas fa-comment" },
    { name: "世界书", id: "worldbook", iconClass: "fas fa-book" },
    { name: "音乐", id: "music", iconClass: "fas fa-music" },
    { name: "小红书", id: "redbook", iconClass: "fas fa-hashtag" },
    { name: "游戏", id: "health", iconClass: "fas fa-heartbeat" },
    { name: "信箱", id: "mail", iconClass: "fas fa-envelope" },
    { name: "驿站", id: "station", iconClass: "fas fa-truck" },
    { name: "更多", id: "more", iconClass: "fas fa-ellipsis-h" },
    { name: "设置", id: "settings", iconClass: "fas fa-cog" },
    { name: "TODO", id: "todo", iconClass: "fas fa-check-square" },
    { name: "外观", id: "appearance", iconClass: "fas fa-palette" }
];

// 1. 打开外观 App（现在通过 app-window 统一承载）
function openAppearanceApp() {
    const container = document.getElementById('appearance-app');
    if (!container) return;
    renderAppearanceUI(container);
}

// 2. 关闭外观 App（交给通用 closeApp 处理，这里为空实现以兼容旧代码）
function closeAppearanceApp() {
}

// 3. 渲染 UI
function renderAppearanceUI(container) {
    const apps = window.appList || [];
    let appListHTML = '';
    const resetButtonStyle = 'position:absolute; top:-5px; right:-5px; width:18px; height:18px; background:#ff3b30; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; cursor:pointer; z-index:10; border:none; padding:0;';

    apps.forEach((app, index) => {
        const defaultApp = DEFAULT_APP_LIST[index];
        const hasImageIcon = app.icon && (app.icon.includes('.') || app.icon.includes('/') || app.icon.startsWith('data:'));
        let isModified = false;
        if (defaultApp) {
            if (hasImageIcon) {
                isModified = true;
            } else {
                if (defaultApp.iconClass && app.iconClass !== defaultApp.iconClass) {
                    isModified = true;
                }
                if (defaultApp.icon && app.icon !== defaultApp.icon) {
                    isModified = true;
                }
            }
        }

        let iconDisplay = '';
        if (hasImageIcon) {
            iconDisplay = `<img src="${app.icon}" style="width:100%; border-radius:10px;">`;
        } else if (app.iconClass) {
            iconDisplay = `<i class="${app.iconClass}"></i>`;
        } else if (app.icon) {
            iconDisplay = app.icon;
        } else {
            iconDisplay = app.name ? app.name.charAt(0) : '';
        }

        const resetBtnHTML = isModified
            ? `<button type="button" onclick="resetSingleApp(${index})" style="${resetButtonStyle}">×</button>`
            : '';

        appListHTML += `
            <div class="setting-item-row">
                <div class="app-preview">
                    <div class="app-icon-box" style="font-size: 20px; position: relative;">
                        ${iconDisplay}
                        ${resetBtnHTML}
                    </div>
                    <span style="font-size:14px; margin-left:10px; cursor: pointer; color: #007aff;" 
                          onclick="editAppName(${index})" 
                          title="点击修改名称">${app.name}</span>
                </div>
                <button class="mini-btn" onclick="triggerAppIconUpload(${index})">
                    <i class="fas fa-upload"></i> 上传
                </button>
            </div>
            <div class="url-input-row">
                <input type="text" placeholder="或粘贴图标 URL..." id="app-url-${index}">
                <button class="mini-btn-ok" onclick="saveAppIconByUrl(${index})">确定</button>
            </div>
            <div class="url-input-row" style="margin-top: 5px;">
                <input type="text" placeholder="点击上方名称或在此输入新名称..." id="app-name-${index}" value="${app.name}">
                <button class="mini-btn-ok" onclick="saveAppName(${index})">改名</button>
            </div>
            <div class="divider"></div>
        `;
    });

    const showStatus = localStorage.getItem('show_status_info') !== 'false';
    const iconFollowSetting = localStorage.getItem('icon_follow_wallpaper');
    const iconFollow = iconFollowSetting === null ? true : iconFollowSetting === 'true';
    const iconCustomColor = localStorage.getItem('icon_custom_color') || '#555555';

    container.innerHTML = `
        <div style="padding: 20px 20px 50px 20px;">
            <div class="setting-card" style="margin-bottom:20px; border:2px solid #007aff;">
                <div class="setting-row-between">
                    <span style="font-weight:600; color:#007aff;">顶部状态栏显示</span>
                    <label class="switch">
                        <input type="checkbox" id="statusbar-toggle" onchange="toggleStatusBar(this)" ${showStatus ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
                <p style="font-size:12px; color:#666; margin-top:5px;">
                    开启时显示桌面的顶部状态栏。关闭后隐藏顶部时间、电量等信息条。
                </p>
            </div>

            <div class="setting-card" style="margin-bottom:20px;">
                <h3 style="margin-top:0;">桌面壁纸</h3>
                <div class="setting-row-between" style="margin-bottom:10px;">
                    <span>本地相册</span>
                    <button class="mini-btn" onclick="triggerWallpaperUpload()">选择图片</button>
                </div>
                <div class="url-input-row">
                    <input type="text" id="wallpaper-url-input" placeholder="输入图片 URL..." class="url-input">
                    <button class="mini-btn-ok" onclick="setWallpaperByUrl()">应用</button>
                </div>
            </div>

            <div class="setting-card" style="margin-bottom:20px;">
                <h3 style="margin-top:0;">桌面图标主题色</h3>
                <div class="setting-row-between" style="margin-bottom:10px;">
                    <span>图标随壁纸自动变色</span>
                    <label class="switch">
                        <input type="checkbox" id="icon-follow-toggle" onchange="toggleIconFollow(this)" ${iconFollow ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
                <p style="font-size:12px; color:#666; margin-top:0; margin-bottom:10px;">
                    开启后图标颜色会根据壁纸主色调自动调整；关闭后使用默认或自定义颜色。
                </p>
                <div class="setting-row-between">
                    <span>自定义图标颜色</span>
                    <input type="color" id="icon-color-picker" value="${iconCustomColor}" ${iconFollow ? 'disabled' : ''} onchange="onIconColorChange(this)" style="width:40px; height:24px; padding:0; border:none; background:transparent;">
                </div>
            </div>

            <div class="setting-card">
                <h3 style="margin-top:0;">App 图标管理</h3>
                ${appListHTML}
            </div>

            <div class="setting-card" style="margin-top:20px; border:1px solid #ff3b30; background:#fff5f5;">
                <h3 style="margin-top:0; color:#ff3b30;">危险操作区</h3>
                <p style="font-size:12px; color:#666; margin-bottom:10px;">将清除所有自定义图标、壁纸和小组件图片缓存，并恢复默认布局。</p>
                <button style="width:100%; padding:10px 0; background:#ff3b30; color:#fff; border:none; border-radius:8px; font-size:14px; cursor:pointer;" onclick="resetFactorySettings()">恢复出厂设置</button>
            </div>
        </div>
    `;
}

function toggleStatusBar(checkbox) {
    const show = !!checkbox.checked;
    localStorage.setItem('show_status_info', show ? 'true' : 'false');
    if (show) {
        document.body.classList.remove('hide-status-info');
    } else {
        document.body.classList.add('hide-status-info');
    }
}

function toggleIconFollow(checkbox) {
    const follow = !!checkbox.checked;
    localStorage.setItem('icon_follow_wallpaper', follow ? 'true' : 'false');
    const picker = document.getElementById('icon-color-picker');
    if (picker) {
        picker.disabled = follow;
    }
    if (typeof localforage !== 'undefined') {
        localforage.getItem('desktopWallpaper').then(savedWallpaper => {
            if (typeof window.updateThemeFromWallpaper === 'function') {
                window.updateThemeFromWallpaper(follow ? (savedWallpaper || '') : '');
            }
        }).catch(() => {
            if (typeof window.updateThemeFromWallpaper === 'function') {
                window.updateThemeFromWallpaper('');
            }
        });
    } else {
        if (typeof window.updateThemeFromWallpaper === 'function') {
            window.updateThemeFromWallpaper('');
        }
    }
}

function onIconColorChange(input) {
    if (!input) return;
    const color = input.value;
    if (!color) return;
    localStorage.setItem('icon_custom_color', color);
    localStorage.setItem('icon_follow_wallpaper', 'false');
    const toggle = document.getElementById('icon-follow-toggle');
    if (toggle) {
        toggle.checked = false;
    }
    const picker = document.getElementById('icon-color-picker');
    if (picker) {
        picker.disabled = false;
    }
    if (typeof window.updateThemeFromWallpaper === 'function') {
        window.updateThemeFromWallpaper('');
    }
}

// 其他辅助函数保持不变...
function triggerAppIconUpload(index) {
    // 1. 标记当前正在编辑 App
    window.currentEditingAppIndex = index;
    
    // 2. 【关键】强制清除组件的标记，防止系统搞混
    window.activeImgId = null; 
    window.activeHintId = null;

    // 3. 打开文件选择框
    const uploader = document.getElementById('global-uploader');
    if(uploader) { 
        uploader.value = ''; 
        uploader.click(); 
    }
}


function saveAppIconByUrl(index) {
    const input = document.getElementById(`app-url-${index}`);
    const url = input.value.trim();
    if (url) { updateAppIcon(index, url); input.value = ''; }
}

function updateAppIcon(index, newIconSrc) {
    if (window.appList && window.appList[index]) {
        window.appList[index].icon = newIconSrc;
        if (typeof window.renderApps === 'function') window.renderApps();
        const appWindow = document.getElementById('appearance-app');
        if (appWindow && appWindow.classList.contains('active')) renderAppearanceUI(appWindow);
        
        // 新增：保存整个 App 列表到数据库
        localforage.setItem('desktopAppList', window.appList).then(() => {
            console.log("App 列表已保存到数据库！");
        }).catch(err => {
            console.error("保存 App 列表失败：", err);
        });
    }
}

function triggerWallpaperUpload() {
    const wpUploader = document.getElementById('wallpaper-uploader');
    if(wpUploader) { wpUploader.value = ''; wpUploader.click(); }
}

function computeThemeFromImage(src, callback) {
    if (!src) {
        callback(null);
        return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h) {
            callback(null);
            return;
        }
        const maxSize = 80;
        if (w > h) {
            if (w > maxSize) {
                h = Math.round(h * (maxSize / w));
                w = maxSize;
            }
        } else {
            if (h > maxSize) {
                w = Math.round(w * (maxSize / h));
                h = maxSize;
            }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        let data;
        try {
            data = ctx.getImageData(0, 0, w, h).data;
        } catch (e) {
            callback(null);
            return;
        }
        let rTotal = 0;
        let gTotal = 0;
        let bTotal = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a < 128) continue;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            rTotal += r;
            gTotal += g;
            bTotal += b;
            count++;
        }
        if (!count) {
            callback(null);
            return;
        }
        let r = Math.round(rTotal / count);
        let g = Math.round(gTotal / count);
        let b = Math.round(bTotal / count);
        const brightnessBase = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightnessBase < 110) {
            r = Math.min(255, r + 60);
            g = Math.min(255, g + 60);
            b = Math.min(255, b + 60);
        } else if (brightnessBase > 200) {
            r = Math.max(0, r - 40);
            g = Math.max(0, g - 40);
            b = Math.max(0, b - 40);
        }
        const gray = (r * 299 + g * 587 + b * 114) / 1000;
        const mixColor = 0.9;
        const mixGray = 0.2;
        const rMuted = Math.round(r * mixColor + gray * mixGray);
        const gMuted = Math.round(g * mixColor + gray * mixGray);
        const bMuted = Math.round(b * mixColor + gray * mixGray);
        const brightness2 = (rMuted * 299 + gMuted * 587 + bMuted * 114) / 1000;

        let iconR = rMuted;
        let iconG = gMuted;
        let iconB = bMuted;
        if (brightness2 < 120) {
            iconR = Math.min(255, Math.round(rMuted * 0.7 + 255 * 0.3));
            iconG = Math.min(255, Math.round(gMuted * 0.7 + 255 * 0.3));
            iconB = Math.min(255, Math.round(bMuted * 0.7 + 255 * 0.3));
        } else if (brightness2 > 200) {
            iconR = Math.max(0, Math.round(rMuted * 0.8));
            iconG = Math.max(0, Math.round(gMuted * 0.8));
            iconB = Math.max(0, Math.round(bMuted * 0.8));
        }

        const primary = 'rgb(' + rMuted + ',' + gMuted + ',' + bMuted + ')';
        const primarySoft = 'rgba(' + rMuted + ',' + gMuted + ',' + bMuted + ',0.9)';
        const foreground = 'rgb(' + iconR + ',' + iconG + ',' + iconB + ')';
        const label = 'rgb(' + iconR + ',' + iconG + ',' + iconB + ')';

        let dockR = Math.max(0, rMuted - 30);
        let dockG = Math.max(0, gMuted - 30);
        let dockB = Math.max(0, bMuted - 30);
        const dockBg = 'rgb(' + dockR + ',' + dockG + ',' + dockB + ')';
        callback({
            primary: primary,
            primarySoft: primarySoft,
            foreground: foreground,
            label: label,
            dockBg: dockBg
        });
    };
    img.onerror = function() {
        callback(null);
    };
    img.src = src;
}

function applyIconThemeFromHex(color, rootStyle) {
    if (!color || !rootStyle) return;
    let c = String(color).trim();
    if (!c) return;
    if (c[0] === '#') c = c.slice(1);
    if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    if (c.length !== 6) return;
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const foreground = 'rgb(' + r + ',' + g + ',' + b + ')';
    const label = foreground;
    const dockR = Math.max(0, r - 30);
    const dockG = Math.max(0, g - 30);
    const dockB = Math.max(0, b - 30);
    const dockBg = 'rgb(' + dockR + ',' + dockG + ',' + dockB + ')';
    rootStyle.setProperty('--theme-foreground', foreground);
    rootStyle.setProperty('--theme-label', label);
    rootStyle.setProperty('--dock-bg', dockBg);
}

function updateThemeFromWallpaper(src) {
    const rootStyle = document.documentElement.style;
    const iconFollowSetting = localStorage.getItem('icon_follow_wallpaper');
    const iconFollow = iconFollowSetting === null ? true : iconFollowSetting === 'true';
    const iconCustomColor = localStorage.getItem('icon_custom_color');

    if (!iconFollow) {
        rootStyle.setProperty('--theme-primary', '#f3f4fb');
        rootStyle.setProperty('--theme-primary-soft', 'rgba(243, 244, 251, 0.9)');
        if (iconCustomColor) {
            applyIconThemeFromHex(iconCustomColor, rootStyle);
        } else {
            rootStyle.setProperty('--theme-foreground', '#555555');
            rootStyle.setProperty('--theme-label', '#333333');
            rootStyle.setProperty('--dock-bg', '#aeb0b2');
        }
        return;
    }

    if (!src) {
        rootStyle.setProperty('--theme-primary', '#f3f4fb');
        rootStyle.setProperty('--theme-primary-soft', 'rgba(243, 244, 251, 0.9)');
        rootStyle.setProperty('--theme-foreground', '#555555');
        rootStyle.setProperty('--theme-label', '#333333');
        rootStyle.setProperty('--dock-bg', '#aeb0b2');
        return;
    }

    computeThemeFromImage(src, function(theme) {
        if (!theme) {
            rootStyle.setProperty('--theme-primary', '#f3f4fb');
            rootStyle.setProperty('--theme-primary-soft', 'rgba(243, 244, 251, 0.9)');
            rootStyle.setProperty('--theme-foreground', '#555555');
            rootStyle.setProperty('--theme-label', '#333333');
            rootStyle.setProperty('--dock-bg', '#aeb0b2');
            return;
        }
        rootStyle.setProperty('--theme-primary', theme.primary);
        rootStyle.setProperty('--theme-primary-soft', theme.primarySoft);
        rootStyle.setProperty('--theme-foreground', theme.foreground);
        rootStyle.setProperty('--theme-label', theme.label);
        rootStyle.setProperty('--dock-bg', theme.dockBg);
    });
}

window.updateThemeFromWallpaper = updateThemeFromWallpaper;

function setWallpaperByUrl() {
    const url = document.getElementById('wallpaper-url-input').value.trim();
    if(url) {
        const screen = document.querySelector('.screen');
        if(screen) {
            screen.style.backgroundImage = `url('${url}')`;
            screen.style.backgroundSize = 'cover';
            screen.style.backgroundPosition = 'center';
            
            // 新增：保存壁纸 URL 到数据库
            localforage.setItem('desktopWallpaper', url).then(() => {
                console.log("壁纸 URL 已保存到数据库！");
                alert('壁纸已应用并保存');
            }).catch(err => {
                console.error("保存壁纸失败：", err);
                alert('壁纸已应用');
            });
            if (typeof window.updateThemeFromWallpaper === 'function') {
                window.updateThemeFromWallpaper(url);
            }
        }
    }
}

// 5. 新增：开机时恢复桌面数据（增强版：带详细日志）
function initDesktopState() {
    console.log("=== 开始恢复桌面数据 ===");
    console.log("localforage 是否可用:", typeof localforage !== 'undefined');
    
    if (typeof localforage === 'undefined') {
        console.error("❌ localforage 未加载！请检查CDN连接");
        return;
    }
    
    // 1. 恢复 App 列表
    localforage.getItem('desktopAppList').then(savedAppList => {
        if (savedAppList && Array.isArray(savedAppList)) {
            window.appList = savedAppList;
            console.log("✅ 已恢复 App 列表，共", savedAppList.length, "个应用");
            // 重新渲染桌面图标
            if (typeof window.renderApps === 'function') {
                window.renderApps();
                console.log("✅ App 图标已重新渲染");
            } else {
                console.warn("⚠️ renderApps 函数不存在");
            }
        } else {
            console.log("ℹ️ 没有找到保存的 App 列表，使用默认配置");
        }
    }).catch(err => {
        console.error("❌ 恢复 App 列表失败：", err);
    });
    
    // 2. 恢复壁纸
    localforage.getItem('desktopWallpaper').then(savedWallpaper => {
        if (savedWallpaper) {
            const screen = document.querySelector('.screen');
            if (screen) {
                screen.style.backgroundImage = `url('${savedWallpaper}')`;
                screen.style.backgroundSize = 'cover';
                screen.style.backgroundPosition = 'center';
                console.log("✅ 已恢复桌面壁纸，数据大小:", (savedWallpaper.length / 1024).toFixed(2), "KB");
                if (typeof window.updateThemeFromWallpaper === 'function') {
                    window.updateThemeFromWallpaper(savedWallpaper);
                }
            } else {
                console.error("❌ 找不到 .screen 元素");
            }
        } else {
            console.log("ℹ️ 没有找到保存的壁纸");
        }
    }).catch(err => {
        console.error("❌ 恢复壁纸失败：", err);
    });
    
    console.log("=== 桌面数据恢复流程已启动 ===");
}

function editAppName(index) {
    const appWindow = document.getElementById('appearance-app');
    if (!appWindow) return;
    const input = appWindow.querySelector(`#app-name-${index}`);
    if (input) {
        input.focus();
        input.select();
    }
}

function saveAppName(index) {
    const appWindow = document.getElementById('appearance-app');
    if (!appWindow) return;
    const input = appWindow.querySelector(`#app-name-${index}`);
    if (!input) return;
    
    const value = typeof input.value === 'string' ? input.value : '';
    const newName = value.trim();
    if (!newName) {
        alert('名称不能为空');
        return;
    }
    
    if (window.appList && window.appList[index]) {
        const oldName = window.appList[index].name;
        window.appList[index].name = newName;
        
        // 重新渲染桌面图标
        if (typeof window.renderApps === 'function') {
            window.renderApps();
        }
        
        // 重新渲染外观设置界面
        const appWindow = document.getElementById('appearance-app');
        if (appWindow && appWindow.classList.contains('active')) {
            renderAppearanceUI(appWindow);
        }
        
        // 保存到数据库
        localforage.setItem('desktopAppList', window.appList).then(() => {
            console.log(`App 名称已更新：${oldName} → ${newName}`);
            alert(`已将"${oldName}"改名为"${newName}"`);
        }).catch(err => {
            console.error("保存 App 名称失败：", err);
            alert('名称已更改，但保存失败');
        });
    }
}

function resetSingleApp(index) {
    if (!Array.isArray(DEFAULT_APP_LIST) || !DEFAULT_APP_LIST[index]) return;
    if (!Array.isArray(window.appList)) window.appList = [];
    window.appList[index] = {
        name: DEFAULT_APP_LIST[index].name,
        id: DEFAULT_APP_LIST[index].id,
        iconClass: DEFAULT_APP_LIST[index].iconClass
    };
    delete window.appList[index].icon;
    if (typeof window.renderApps === 'function') {
        window.renderApps();
    }
    const appWindow = document.getElementById('appearance-app');
    if (appWindow && appWindow.classList.contains('active')) {
        renderAppearanceUI(appWindow);
    }
    if (typeof localforage !== 'undefined') {
        localforage.setItem('desktopAppList', window.appList).catch(function(err) {
            console.error('重置单个 App 失败：', err);
        });
    }
}

function resetFactorySettings() {
    const confirmed = window.confirm('确定要恢复出厂设置吗？这将清除所有自定义 App 图标、壁纸和小组件图片缓存。');
    if (!confirmed) return;
    const tasks = [];
    if (typeof localforage !== 'undefined') {
        tasks.push(localforage.removeItem('desktopAppList').catch(function() {}));
        tasks.push(localforage.removeItem('desktopWallpaper').catch(function() {}));
        tasks.push(
            localforage.keys().then(function(keys) {
                const removes = keys.filter(function(k) { return k && k.indexOf('widget_img_') === 0; })
                    .map(function(k) { return localforage.removeItem(k).catch(function() {}); });
                return Promise.all(removes);
            }).catch(function() {})
        );
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.indexOf('widget_save_') === 0) {
            localStorage.removeItem(key);
        }
    }
    localStorage.removeItem('aes_bubble_text');
    if (tasks.length > 0) {
        Promise.all(tasks).finally(function() {
            window.location.reload();
        });
    } else {
        window.location.reload();
    }
}

// 挂载全局
window.openAppearanceApp = openAppearanceApp;
window.closeAppearanceApp = closeAppearanceApp;
window.triggerAppIconUpload = triggerAppIconUpload;
window.saveAppIconByUrl = saveAppIconByUrl;
window.updateAppIcon = updateAppIcon;
window.triggerWallpaperUpload = triggerWallpaperUpload;
window.setWallpaperByUrl = setWallpaperByUrl;
window.toggleStatusBar = toggleStatusBar;
window.initDesktopState = initDesktopState;
window.editAppName = editAppName;
window.saveAppName = saveAppName;
window.resetSingleApp = resetSingleApp;
window.resetFactorySettings = resetFactorySettings;
