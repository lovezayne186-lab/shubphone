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

(function () {
    const STORAGE_KEY = 'global_music_state_v1';

    function safeJsonParse(text, fallback) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return fallback;
        }
    }

    function pickTrack(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const title = typeof raw.title === 'string' ? raw.title : '';
        const artist = typeof raw.artist === 'string' ? raw.artist : '';
        const cover = typeof raw.cover === 'string' ? raw.cover : '';
        const key = typeof raw.key === 'string' ? raw.key : '';
        const id = typeof raw.id === 'string' ? raw.id : '';
        const sourceType = typeof raw.sourceType === 'string' ? raw.sourceType : '';
        const url = typeof raw.url === 'string' ? raw.url : '';
        return { title, artist, cover, key, id, sourceType, url };
    }

    function loadPersisted() {
        const raw = safeJsonParse(localStorage.getItem(STORAGE_KEY) || '{}', {});
        const track = pickTrack(raw.track);
        const currentTime = Number(raw.currentTime);
        const volume = Number(raw.volume);
        const muted = !!raw.muted;
        return {
            track,
            currentTime: Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0,
            volume: Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : 1,
            muted,
        };
    }

    function ensureAudioEl() {
        let audio = document.getElementById('global-music-audio');
        if (audio && audio.tagName === 'AUDIO') return audio;
        audio = document.createElement('audio');
        audio.id = 'global-music-audio';
        audio.preload = 'none';
        audio.playsInline = true;
        audio.style.display = 'none';
        document.body.appendChild(audio);
        return audio;
    }

    function ensureIslandEl() {
        let el = document.getElementById('dynamic-island');
        if (el) return el;
        const screen = document.querySelector('.screen');
        if (!screen) return null;
        el = document.createElement('button');
        el.id = 'dynamic-island';
        el.type = 'button';
        el.className = 'dynamic-island';
        el.setAttribute('aria-label', '正在播放，点击回到音乐');
        el.innerHTML = `
            <span class="dynamic-island-cover">
                <img id="dynamic-island-cover-img" alt="" />
            </span>
            <span class="dynamic-island-waves" aria-hidden="true">
                <span class="di-bar"></span>
                <span class="di-bar"></span>
                <span class="di-bar"></span>
                <span class="di-bar"></span>
            </span>
        `;
        screen.appendChild(el);
        return el;
    }

    const persisted = loadPersisted();
    const audio = ensureAudioEl();
    audio.volume = persisted.volume;
    audio.muted = persisted.muted;
    if (persisted.track && persisted.track.url) audio.src = persisted.track.url;

    window.__globalAudioEl = audio;

    const state = {
        track: persisted.track,
        currentTime: persisted.currentTime,
        duration: 0,
        isPlaying: false,
        volume: audio.volume,
        muted: audio.muted,
    };

    let lastEmitAt = 0;
    let rafPending = false;

    function getForegroundAppId() {
        const v = window.__foregroundAppId;
        return typeof v === 'string' ? v : '';
    }

    function isMusicForeground() {
        const fg = getForegroundAppId();
        if (fg === 'music') return true;
        const appWindow = document.getElementById('app-window');
        if (!appWindow || !appWindow.classList.contains('active')) return false;
        const iframe = document.querySelector('#app-content-area iframe');
        const src = iframe && iframe.getAttribute('src') ? String(iframe.getAttribute('src')) : '';
        return src.indexOf('apps/music.html') !== -1;
    }

    function shouldShowIsland() {
        if (!state.track || !state.track.url) return false;
        if (!state.isPlaying) return false;
        return !isMusicForeground();
    }

    function persist() {
        const payload = {
            track: state.track,
            currentTime: Number.isFinite(state.currentTime) ? state.currentTime : 0,
            volume: Number.isFinite(audio.volume) ? audio.volume : 1,
            muted: !!audio.muted,
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {}
    }

    function emitNow() {
        state.currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        state.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        state.volume = Number.isFinite(audio.volume) ? audio.volume : 1;
        state.muted = !!audio.muted;
        try {
            window.dispatchEvent(new CustomEvent('global-music-state', { detail: getState() }));
        } catch (e) {}
        updateIsland();
        lastEmitAt = Date.now();
        rafPending = false;
    }

    function emitThrottled() {
        const now = Date.now();
        if (now - lastEmitAt > 120) {
            emitNow();
            return;
        }
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(emitNow);
    }

    function updateIsland() {
        const el = ensureIslandEl();
        if (!el) return;
        el.classList.toggle('is-visible', shouldShowIsland());
        const img = document.getElementById('dynamic-island-cover-img');
        if (img && state.track && state.track.cover) {
            img.src = state.track.cover;
        }
        el.classList.toggle('is-playing', !!state.isPlaying);
    }

    function setForegroundApp(appId) {
        window.__foregroundAppId = typeof appId === 'string' ? appId : '';
        updateIsland();
    }

    function setTrack(nextTrack) {
        const t = pickTrack(nextTrack);
        state.track = t;
        if (t && t.url) {
            if (audio.src !== t.url) audio.src = t.url;
        }
        persist();
        emitNow();
    }

    function play() {
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
            p.catch(function () {});
        }
        return p;
    }

    function pause() {
        audio.pause();
    }

    function toggle() {
        if (audio.paused) play();
        else pause();
    }

    function seek(timeSeconds) {
        const t = Number(timeSeconds);
        if (!Number.isFinite(t)) return;
        try {
            audio.currentTime = Math.max(0, t);
        } catch (e) {}
        emitThrottled();
        persist();
    }

    function getState() {
        return {
            track: state.track,
            isPlaying: !!state.isPlaying,
            currentTime: Number.isFinite(state.currentTime) ? state.currentTime : 0,
            duration: Number.isFinite(state.duration) ? state.duration : 0,
            volume: Number.isFinite(state.volume) ? state.volume : 1,
            muted: !!state.muted,
        };
    }

    function openNowPlaying() {
        window.__musicOpenPlayerOnLoad = true;
        const desktopView = document.getElementById('desktop-view');
        const chatView = document.getElementById('chat-view');
        const isChatVisible = !!(chatView && chatView.style && chatView.style.display !== 'none');
        if (isChatVisible) {
            window.__resumeChatViewAfterClose = true;
            chatView.style.display = 'none';
            if (desktopView && desktopView.style) desktopView.style.display = 'block';
        }
        if (typeof window.openApp === 'function') {
            window.openApp('music');
            setForegroundApp('music');
        }
        window.setTimeout(function () {
            const iframe = document.querySelector('#app-content-area iframe');
            if (!iframe) return;
            try {
                iframe.contentWindow.postMessage({ type: 'MUSIC_OPEN_PLAYER' }, '*');
            } catch (e) {}
        }, 180);
    }

    audio.addEventListener('play', function () {
        state.isPlaying = true;
        persist();
        emitNow();
    });

    audio.addEventListener('pause', function () {
        state.isPlaying = false;
        persist();
        emitNow();
    });

    audio.addEventListener('timeupdate', emitThrottled);
    audio.addEventListener('loadedmetadata', emitNow);
    audio.addEventListener('volumechange', function () {
        persist();
        emitNow();
    });

    if (persisted.currentTime > 0) {
        try {
            audio.currentTime = persisted.currentTime;
        } catch (e) {}
    }

    const island = ensureIslandEl();
    if (island) {
        island.addEventListener('click', function () {
            openNowPlaying();
        });
    }

    window.GlobalMusicPlayer = {
        audio,
        setTrack,
        play,
        pause,
        toggle,
        seek,
        getState,
        setForegroundApp,
        openNowPlaying,
    };

    emitNow();
})();

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
                    const uploadTargetId = (typeof window.currentUploadTargetId === 'string') ? window.currentUploadTargetId : '';

                    if (uploadTargetId) {
                        const imgEl = document.getElementById(uploadTargetId);
                        if (imgEl) {
                            imgEl.src = resultSrc;
                            imgEl.style.opacity = '1';
                            if (imgEl.style.display === 'none') {
                                imgEl.style.display = 'block';
                            }
                            if (imgEl.previousElementSibling && imgEl.previousElementSibling.classList && imgEl.previousElementSibling.classList.contains('main-widget-placeholder')) {
                                imgEl.previousElementSibling.style.display = 'none';
                            }
                            if (imgEl.nextElementSibling && imgEl.nextElementSibling.classList && imgEl.nextElementSibling.classList.contains('upload-hint-text')) {
                                imgEl.nextElementSibling.style.display = 'none';
                            }
                        }

                        try {
                            if (window.localforage) {
                                if (window.DB && typeof DB.configLargeStore === 'function') {
                                    DB.configLargeStore();
                                }
                                localforage.setItem('widget_img_' + uploadTargetId, resultSrc);
                            } else {
                                localStorage.setItem('widget_save_' + uploadTargetId, resultSrc);
                            }
                        } catch (err) {
                            console.error("保存小组件图片失败", err);
                            alert("图片太大，可能无法保存，建议截个图再传~");
                        }

                        window.currentUploadTargetId = '';
                        window.currentEditingAppIndex = -1;
                        window.activeImgId = null;
                        window.activeHintId = null;
                        appIconInput.value = '';
                        return;
                    }

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
                        appIconInput.value = '';
                    } 
                    
                    // === 之后再判断是不是 App ===
                    else if (typeof window.currentEditingAppIndex === 'number' && window.currentEditingAppIndex !== -1) {
                        if (typeof window.updateAppIcon === 'function') {
                            window.updateAppIcon(window.currentEditingAppIndex, resultSrc);
                            alert("App图标修改成功！"); 
                        }
                        window.currentEditingAppIndex = -1;
                        appIconInput.value = '';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
});
