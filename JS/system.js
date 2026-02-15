/* =========================================================
   文件路径：JS脚本文件夹/system.js
   作用：处理系统级功能（初始化、时间、电池、全局监听）
   ========================================================= */

// --- 0. 系统初始化 (最先执行) ---
document.addEventListener('DOMContentLoaded', function() {

    // =============== 【无感返回：暴力修正版】 ===============
    if (localStorage.getItem('isReturnFromChat') === 'true') {
        localStorage.removeItem('isReturnFromChat');

        // 1. 隐藏锁屏
        const lockScreen = document.getElementById('lock-screen');
        if (lockScreen) lockScreen.style.display = 'none';

        // 2. 找到 App 窗口
        const appWindow = document.getElementById('app-window');
        
        if (appWindow) {
            // ★★★ 关键修改：直接把样式写死，不给浏览器任何动画的机会 ★★★
            appWindow.style.transition = 'none !important'; 
            appWindow.style.transform = 'scale(1)'; // 强制全屏大小
            appWindow.style.opacity = '1';          // 强制完全不透明
            appWindow.style.display = 'flex';       // 强制显示
            
            // 手动加上 active 类 (防止 openChatApp 里的逻辑还没跑完)
            appWindow.classList.add('active');

            // 3. 调用 apps.js 里的函数渲染内容
            if (typeof window.openChatApp === 'function') {
                window.openChatApp(); 
            }

            // 4. 延迟 300ms 再恢复。
            // 就像魔术师，先把东西变出来(无动画)，等观众看清了，再把布盖上(恢复动画属性)
            setTimeout(() => {
                appWindow.style.transition = ''; 
                appWindow.style.transform = ''; 
                appWindow.style.opacity = ''; 
                // display 不要清空，不然窗口会消失
            }, 300);
        }
    }  
    // 检查是否有保存的全屏状态
    const savedMode = localStorage.getItem('is_immersive_mode');
    if (savedMode === 'true') {
        document.body.classList.add('fullscreen-active');
    }

    // 检查状态栏显示设置
    const showStatusInfoSetting = localStorage.getItem('show_status_info');
    if (showStatusInfoSetting === 'false') {
        document.body.classList.add('hide-status-info');
    } else {
        document.body.classList.remove('hide-status-info');
    }
});

// --- 全局变量 ---
window.currentEditingAppIndex = -1;

/* --- 1. 时间与日期逻辑 --- */
function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    // 状态栏
    const statusTimeEl = document.getElementById('status-time-text');
    if (statusTimeEl) statusTimeEl.innerText = `${hours}:${minutes}`;

    // 大时间
    const timeEl = document.getElementById('time-text');
    if (timeEl) timeEl.innerText = `${hours}:${minutes}`;

    // 日期
    const dateEl = document.getElementById('date-text');
    if (dateEl) {
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        dateEl.innerText = `${now.getFullYear()}年${month}月${date}日 ${weekDays[now.getDay()]}`;
    }
}
updateTime();
setInterval(updateTime, 1000);

/* --- 2. 电池电量逻辑 --- */
(function initBatteryIndicator() {
    function setBatteryText(value) {
        const batteryEl = document.getElementById('battery-num');
        const text = (value === null || value === undefined) ? '--' : String(Math.round(value));
        if (batteryEl) batteryEl.innerText = text;
        window.currentBatteryLevel = (value === null || value === undefined) ? null : Number(value);
    }

    if (navigator.getBattery && typeof navigator.getBattery === 'function') {
        navigator.getBattery().then(function (battery) {
            function updateBattery() {
                const level = battery && typeof battery.level === 'number' ? battery.level * 100 : null;
                setBatteryText(level);
            }
            updateBattery();
            battery.addEventListener('levelchange', updateBattery);
        }).catch(function () {
            setBatteryText(null);
        });
    } else if (navigator.battery || navigator.mozBattery || navigator.msBattery) {
        const legacyBattery = navigator.battery || navigator.mozBattery || navigator.msBattery;
        function updateLegacyBattery() {
            const level = legacyBattery && typeof legacyBattery.level === 'number' ? legacyBattery.level * 100 : null;
            setBatteryText(level);
        }
        updateLegacyBattery();
        if (legacyBattery && typeof legacyBattery.addEventListener === 'function') {
            legacyBattery.addEventListener('levelchange', updateLegacyBattery);
        }
    } else {
        setBatteryText(null);
    }
})();

/* --- 3. API 设置弹窗逻辑 --- */
window.saveApi = function() {
    const key = document.getElementById('api-key-input').value;
    if(key) {
        localStorage.setItem('user_api_key', key);
        document.getElementById('api-modal').classList.remove('show');
        alert("API Key 已保存！");
    }
}
window.showApiSettings = function() { 
    const modal = document.getElementById('api-modal');
    if(modal) modal.classList.add('show');
}
const apiModal = document.getElementById('api-modal');
if (apiModal) {
    apiModal.addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('show');
    });
}

/* --- 4. 全局文件上传监听 --- */
document.addEventListener('DOMContentLoaded', function() {
    
    // (A) 壁纸
    const wallpaperInput = document.getElementById('wallpaper-uploader');
    if (wallpaperInput) {
        wallpaperInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const screen = document.querySelector('.screen');
                    const wallpaperData = evt.target.result;
                    if(screen) {
                        screen.style.backgroundImage = `url('${wallpaperData}')`;
                        screen.style.backgroundSize = 'cover';
                        screen.style.backgroundPosition = 'center';
                        
                        // 【修复】保存壁纸到数据库，防止刷新后丢失
                        if(window.localforage) {
                            localforage.setItem('desktopWallpaper', wallpaperData).then(() => {
                                console.log("壁纸已保存到数据库！");
                                alert("壁纸更换成功并已保存！");
                            }).catch(err => {
                                console.error("保存壁纸失败：", err);
                                alert("壁纸更换成功！");
                            });
                        } else {
                            alert("壁纸更换成功！");
                        }
                        if (typeof window.updateThemeFromWallpaper === 'function') {
                            window.updateThemeFromWallpaper(wallpaperData);
                        }
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // (B) App图标 / 组件图片
    const appIconInput = document.getElementById('global-uploader');
    if (appIconInput) {
        appIconInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();

                reader.onload = function(evt) {
                    const resultSrc = evt.target.result;

                    // === 改动点：先判断是不是组件 (Widget) ===
                    if (window.activeImgId) {
                        // 1. 找元素
                        const img = document.getElementById(window.activeImgId);
                        const hint = window.activeHintId ? document.getElementById(window.activeHintId) : null;
                        
                        // 2. 更新视图
                        if (img) { 
                            img.src = resultSrc; 
                            img.style.display = 'block'; 
                            
                            // 【新增】保存到数据库 (之前这里缺了这一句，导致刷新就没)
                            if(window.localforage) {
                                localforage.setItem('widget_img_' + window.activeImgId, resultSrc);
                            }
                        }
                        if (hint) { hint.style.display = 'none'; }
                        
                        // 3. 清空状态
                        window.activeImgId = null;
                        window.activeHintId = null;
                    } 
                    
                    // === 之后再判断是不是 App ===
                    else if (window.currentEditingAppIndex !== -1) {
                        if (typeof window.updateAppIcon === 'function') {
                            window.updateAppIcon(window.currentEditingAppIndex, resultSrc);
                            alert("App图标修改成功！"); 
                        }
                        window.currentEditingAppIndex = -1;
                    }
                    
                    // 清空输入框
                    appIconInput.value = '';
                };
                reader.readAsDataURL(file);
            }
        });
    }
});
