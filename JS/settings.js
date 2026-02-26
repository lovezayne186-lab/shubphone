/* =========================================================
   文件路径：JS脚本文件夹/settings.js
   作用：管理系统设置（API配置、模型拉取、温度控制、保存）
   ========================================================= */

// 1. 打开设置 App
function openSettingsApp() {
    const appWindow = document.getElementById('app-window');
    const title = document.getElementById('app-title-text');
    const content = document.getElementById('app-content-area');

    if (!appWindow) return;

    title.innerText = "系统设置";
    renderSettingsUI(content);
    appWindow.classList.add('active');
}

// 2. 渲染 UI 界面
function renderSettingsUI(container) {
    const savedUrl = localStorage.getItem('api_base_url') || "";
    const savedKey = localStorage.getItem('user_api_key') || "";
    const savedModel = localStorage.getItem('selected_model') || "gpt-3.5-turbo";
    // 新增：读取温度，默认为 0.7
    const savedTemp = localStorage.getItem('model_temperature') || "0.7";

    container.innerHTML = `
        <div style="padding: 20px;padding-bottom: 100px;">
            
            <!-- API 地址设置 -->
            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <h4 style="margin: 0 0 10px 0; color:#333;">API 地址 (Base URL)</h4>
                <input type="text" id="setting-api-url" value="${savedUrl}" placeholder="例如 https://api.deepseek.com" 
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size:14px;">
                <p style="font-size: 12px; color: #999; margin: 5px 0 0;">会自动检测是否需要加 /v1</p>
            </div>

            <!-- API Key 设置 -->
            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <h4 style="margin: 0 0 10px 0; color:#333;">API Key (密钥)</h4>
                <input type="password" id="setting-api-key" value="${savedKey}" placeholder="sk-..." 
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size:14px;">
            </div>

            <!-- 模型选择区域 -->
            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0; color:#333;">选择模型</h4>
                    <button onclick="fetchModelList()" style="padding: 6px 12px; background: #007aff; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer;">
                        🔄 拉取列表
                    </button>
                </div>
                
                <select id="setting-model-select" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; background: white; font-size:14px;">
                    <option value="${savedModel}">${savedModel} (当前)</option>
                </select>
                <p id="fetch-status" style="font-size: 12px; color: #666; margin-top: 8px; min-height: 16px;"></p>
            </div>

            <!-- 新增：温度控制区域 -->
            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0; color:#333;">模型温度 (Temperature)</h4>
                    <!-- 显示当前数值 -->
                    <span id="temp-display" style="font-weight:bold; color:#007aff; font-size:16px;">${savedTemp}</span>
                </div>
                
                <!-- 滑动条：0 到 2，步长 0.1 -->
                <input type="range" id="setting-temp-slider" min="0" max="2" step="0.1" value="${savedTemp}" 
                    style="width: 100%; cursor: pointer;"
                    oninput="document.getElementById('temp-display').innerText = this.value">
                
                <div style="display:flex; justify-content:space-between; font-size: 12px; color: #999; margin-top: 5px;">
                    <span>0.0 (严谨)</span>
                    <span>1.0 (平衡)</span>
                    <span>2.0 (发散)</span>
                </div>
            </div>

            <!-- 保存按钮 -->
            <button onclick="saveAllSettings()" style="width: 100%; padding: 14px; background: #34c759; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(52, 199, 89, 0.3); cursor: pointer; transition: transform 0.1s;">
                保存所有配置
            </button>
            <div style="text-align:center; margin-top:10px; font-size:12px; color:#aaa;">配置将保存在本地</div>

            <div class="setting-card" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; margin-top: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <h4 style="margin: 0 0 10px 0; color:#333;">数据导出 / 导入 (JSON)</h4>
                <div style="display:flex; gap:10px;">
                    <button onclick="exportAppData()" style="flex:1; padding: 12px; background: #007aff; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: bold; cursor: pointer;">
                        导出 JSON
                    </button>
                    <button onclick="triggerImportAppData()" style="flex:1; padding: 12px; background: #5856d6; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: bold; cursor: pointer;">
                        导入 JSON
                    </button>
                </div>
                <input type="file" id="settings-import-json" accept="application/json" style="display:none;">
                <p style="font-size: 12px; color: #999; margin: 10px 0 0; line-height: 1.6;">
                    导出包含：聊天记录、联系人与头像、桌面数据与壁纸、小组件图片、音乐数据、朋友圈背景与内容。导入会覆盖这些数据并自动刷新页面。
                </p>
            </div>

            <!-- 清除数据按钮 -->
            <button onclick="clearAllData()" style="width: 100%; padding: 14px; background: #ff3b30; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3); cursor: pointer; transition: transform 0.1s; margin-top: 15px;">
                清除数据
            </button>
            <div style="text-align:center; margin-top:10px; font-size:12px; color:#ff3b30;">⚠️ 此操作将清除所有保存的数据</div>

        </div>
    `;

    try {
        const fileInput = container.querySelector('#settings-import-json');
        if (fileInput && !fileInput._bound) {
            fileInput._bound = true;
            fileInput.addEventListener('change', function () {
                importAppDataFromInput(this);
            });
        }
    } catch (e) { }
}

// 3. 拉取模型列表逻辑
async function fetchModelList() {
    let urlInput = document.getElementById('setting-api-url').value.trim();
    const keyInput = document.getElementById('setting-api-key').value.trim();
    const statusText = document.getElementById('fetch-status');
    const selectBox = document.getElementById('setting-model-select');

    if (!urlInput || !keyInput) {
        statusText.innerText = "❌ 请先填写 API 地址和 Key";
        statusText.style.color = "red";
        return;
    }

    let targetUrl = urlInput;
    if (targetUrl.endsWith('/')) targetUrl = targetUrl.slice(0, -1);
    
    // 智能尝试补全路径
    if (!targetUrl.endsWith('/v1')) {
        targetUrl += '/v1';
    }
    targetUrl += '/models';

    statusText.innerText = "⏳ 正在连接服务器...";
    statusText.style.color = "#007aff";

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${keyInput}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`请求失败: ${response.status}`);
        }

        const data = await response.json();
        
        let models = [];
        if (data.data && Array.isArray(data.data)) {
            models = data.data;
        } else if (Array.isArray(data)) {
            models = data;
        }

        if (models.length > 0) {
            selectBox.innerHTML = '';
            models.forEach(model => {
                const mId = model.id || model.name;
                const option = document.createElement('option');
                option.value = mId;
                option.innerText = mId;
                selectBox.appendChild(option);
            });
            selectBox.value = models[0].id || models[0].name;
            statusText.innerText = `✅ 成功获取 ${models.length} 个模型`;
            statusText.style.color = "green";
        } else {
            statusText.innerText = "⚠️ 连接成功但未找到模型";
            statusText.style.color = "orange";
        }

    } catch (error) {
        console.error(error);
        if (error.message.includes('Failed to fetch')) {
            statusText.innerText = "❌ 网络错误或跨域拦截";
        } else {
            statusText.innerText = `❌ ${error.message}`;
        }
        statusText.style.color = "red";
    }
}

// 4. 保存所有设置
function saveAllSettings() {
    let url = document.getElementById('setting-api-url').value.trim();
    const key = document.getElementById('setting-api-key').value.trim();
    const model = document.getElementById('setting-model-select').value;
    // 新增：获取滑块的值
    const temp = document.getElementById('setting-temp-slider').value;

    if (url && key) {
        if (url.endsWith('/')) url = url.slice(0, -1);

        localStorage.setItem('api_base_url', url);
        localStorage.setItem('user_api_key', key);
        localStorage.setItem('selected_model', model);
        // 新增：保存温度
        localStorage.setItem('model_temperature', temp);
        
        alert(`✅ 设置已保存！\n\n模型：${model}\n温度：${temp}`);
        if(window.closeApp) window.closeApp();
    } else {
        alert("地址和 Key 不能为空！");
    }
}

// 5. 清除所有数据（彻底版）
async function clearAllData() {
    // 弹出确认对话框
    const confirmed = confirm("⚠️ 警告：此操作将清除所有保存的数据！\n\n包括：\n• API 配置\n• 聊天记录\n• 角色数据\n• 所有设置\n• 缓存文件\n\n确定要继续吗？");
    
    if (confirmed) {
        // 二次确认
        const doubleConfirm = confirm("🚨 最后确认：\n\n数据清除后无法恢复！\n\n确定要清除所有数据吗？");
        
        if (doubleConfirm) {
            try {
                // 1. 清除 localStorage
                localStorage.clear();
                console.log("✅ localStorage 已清除");
                
                // 2. 清除 sessionStorage
                sessionStorage.clear();
                console.log("✅ sessionStorage 已清除");
                
                // 3. 清除 IndexedDB (localForage)
                if (window.localforage) {
                    await localforage.clear();
                    console.log("✅ localForage 已清除");
                }
                
                // 4. 清除所有 IndexedDB 数据库（彻底清除）
                if (window.indexedDB && indexedDB.databases) {
                    const databases = await indexedDB.databases();
                    for (const db of databases) {
                        indexedDB.deleteDatabase(db.name);
                        console.log("✅ 删除数据库:", db.name);
                    }
                }
                
                // 5. 注销 Service Worker（清除缓存控制）
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        await registration.unregister();
                        console.log("✅ Service Worker 已注销");
                    }
                }
                
                // 6. 清除所有缓存
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    for (const cacheName of cacheNames) {
                        await caches.delete(cacheName);
                        console.log("✅ 缓存已删除:", cacheName);
                    }
                }
                
                // 显示成功消息
                alert("✅ 所有数据已彻底清除！\n\n页面将自动刷新...");
                
                // 强制刷新（绕过缓存）
                setTimeout(() => {
                    window.location.href = window.location.href;
                }, 500);
                
            } catch (error) {
                console.error("清除数据时出错:", error);
                alert("❌ 清除数据时出错: " + error.message + "\n\n请查看控制台了解详情");
            }
        }
    }
}

function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function safeJsonParse(text) {
    try { return JSON.parse(text); } catch (e) { return null; }
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
}

function base64ToUint8Array(base64) {
    const binary = atob(String(base64 || ''));
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function gzipToBase64(text) {
    const input = new TextEncoder().encode(String(text || ''));
    const stream = new Blob([input]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return arrayBufferToBase64(buf);
}

async function gunzipFromBase64(base64) {
    const bytes = base64ToUint8Array(base64);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(buf);
}

function getBackupLocalStorageKeys() {
    return [
        'wechat_moments_data',
        'moments_proactive_state_v1',
        'music_library_v1',
        'wechat_worldbooks',
        'wechat_worldbook_categories',
        'wechat_worldbook_active_category',
        'wechat_memory_archive_v1',
        'user_avatar',
        'user_name',
        'user_signature',
        'aes_bubble_text',
        'show_status_info',
        'icon_follow_wallpaper',
        'icon_custom_color',
        'appearance_icon_manager_open',
        'wechat_stats_partner_id',
        'wechat_custom_groups',
        'wechat_chatlist_kaomoji',
        'chat_settings_by_role'
    ];
}

function getChatStoreKeys() {
    const fallback = [
        'wechat_chatData',
        'wechat_chatMapData',
        'wechat_charProfiles',
        'wechat_userPersonas',
        'wechat_backgrounds',
        'wechat_callLogs',
        'wechat_unread'
    ];
    try {
        if (window.DB && isObject(window.DB.keys)) {
            const vals = Object.values(window.DB.keys).filter(Boolean).map(String);
            if (vals.length) return vals;
        }
    } catch (e) { }
    return fallback;
}

function shouldBackupLocalStorageKey(key) {
    if (!key) return false;
    const k = String(key);
    if (k.indexOf('widget_save_') === 0) return true;
    return getBackupLocalStorageKeys().indexOf(k) !== -1;
}

async function buildAppBackupPayload() {
    const ls = {};
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!shouldBackupLocalStorageKey(key)) continue;
            const value = localStorage.getItem(key);
            if (value != null) ls[key] = value;
        }
    } catch (e) { }

    const lf = {};
    const lfKeysWanted = new Set();
    getChatStoreKeys().forEach(k => lfKeysWanted.add(k));
    lfKeysWanted.add('desktopAppList');
    lfKeysWanted.add('desktopWallpaper');

    const hasForage = !!(window.localforage && typeof window.localforage.getItem === 'function');
    if (hasForage) {
        try {
            if (window.DB && typeof window.DB.configLargeStore === 'function') {
                window.DB.configLargeStore();
            }
        } catch (e) { }

        try {
            const keys = await window.localforage.keys();
            (keys || []).forEach(k => {
                if (!k) return;
                const sk = String(k);
                if (sk.indexOf('widget_img_') === 0) lfKeysWanted.add(sk);
            });
        } catch (e) { }

        const lfKeys = Array.from(lfKeysWanted);
        for (let i = 0; i < lfKeys.length; i++) {
            const key = lfKeys[i];
            try {
                const v = await window.localforage.getItem(key);
                if (v !== null && v !== undefined) lf[key] = v;
            } catch (e) { }
        }
    } else {
        const lfKeys = Array.from(lfKeysWanted);
        for (let i = 0; i < lfKeys.length; i++) {
            const key = lfKeys[i];
            try {
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const parsed = safeJsonParse(raw);
                lf[key] = parsed !== null ? parsed : raw;
            } catch (e) { }
        }
    }

    return {
        __shubao_backup__: 1,
        createdAt: new Date().toISOString(),
        payload: { ls: ls, lf: lf }
    };
}

function downloadTextFile(filename, text) {
    const blob = new Blob([String(text || '')], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportAppData() {
    try {
        const backup = await buildAppBackupPayload();
        const payloadText = JSON.stringify(backup.payload || {});
        const base = {
            __shubao_backup__: backup.__shubao_backup__,
            createdAt: backup.createdAt,
            format: 'plain',
            data: backup.payload
        };

        let outText = JSON.stringify(base);
        let suffix = 'json';

        const canZip = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
        if (canZip) {
            try {
                const gz = await gzipToBase64(payloadText);
                outText = JSON.stringify({
                    __shubao_backup__: backup.__shubao_backup__,
                    createdAt: backup.createdAt,
                    format: 'gzip-base64',
                    data: gz
                });
            } catch (e) {
            }
        }

        const stamp = backup.createdAt.replace(/[:.]/g, '-');
        const filename = 'shubao-backup-' + stamp + '.' + suffix;
        downloadTextFile(filename, outText);
        alert('✅ 已导出 JSON 备份文件');
    } catch (e) {
        console.error(e);
        alert('❌ 导出失败：' + (e && e.message ? e.message : '未知错误'));
    }
}

function triggerImportAppData() {
    const input = document.getElementById('settings-import-json');
    if (!input) {
        alert('找不到导入控件，请重新打开设置页面');
        return;
    }
    input.value = '';
    input.click();
}

async function importAppDataFromInput(fileInput) {
    try {
        const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        if (!file) return;
        const text = await file.text();
        const json = safeJsonParse(text);
        if (!json || !isObject(json)) {
            alert('❌ 导入失败：文件不是有效 JSON');
            return;
        }

        if (json.__shubao_backup__ !== 1) {
            alert('❌ 导入失败：不是本系统导出的备份文件');
            return;
        }

        let payload = null;
        if (json.format === 'gzip-base64') {
            if (typeof DecompressionStream === 'undefined') {
                alert('❌ 当前环境不支持解压缩，无法导入该备份');
                return;
            }
            const rawText = await gunzipFromBase64(json.data || '');
            payload = safeJsonParse(rawText);
        } else if (json.format === 'plain') {
            payload = json.data;
        } else if (json.payload) {
            payload = json.payload;
        } else if (json.data) {
            payload = json.data;
        }

        if (!payload || !isObject(payload) || !isObject(payload.ls) || !isObject(payload.lf)) {
            alert('❌ 导入失败：备份结构不正确');
            return;
        }

        const ok = confirm('⚠️ 导入会覆盖聊天/联系人/桌面/音乐/朋友圈等数据，且操作不可撤销。\n\n建议先导出一份当前数据备份。\n\n确定要继续导入吗？');
        if (!ok) return;

        try {
            if (window.DB && typeof window.DB.configLargeStore === 'function') {
                window.DB.configLargeStore();
            }
        } catch (e) { }

        const lsKeys = Object.keys(payload.ls || {});
        for (let i = 0; i < lsKeys.length; i++) {
            const k = lsKeys[i];
            try {
                localStorage.setItem(k, String(payload.ls[k]));
            } catch (e) { }
        }

        const hasForage = !!(window.localforage && typeof window.localforage.setItem === 'function');
        const lfKeys = Object.keys(payload.lf || {});
        if (hasForage) {
            for (let i = 0; i < lfKeys.length; i++) {
                const k = lfKeys[i];
                try {
                    await window.localforage.setItem(k, payload.lf[k]);
                } catch (e) { }
            }
        } else {
            for (let i = 0; i < lfKeys.length; i++) {
                const k = lfKeys[i];
                try {
                    const v = payload.lf[k];
                    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
                } catch (e) { }
            }
        }

        alert('✅ 导入完成，页面将刷新以加载新数据');
        setTimeout(() => window.location.reload(), 300);
    } catch (e) {
        console.error(e);
        alert('❌ 导入失败：' + (e && e.message ? e.message : '未知错误'));
    } finally {
        try {
            if (fileInput) fileInput.value = '';
        } catch (e) { }
    }
}

// 挂载
window.openSettingsApp = openSettingsApp;
window.fetchModelList = fetchModelList;
window.saveAllSettings = saveAllSettings;
window.clearAllData = clearAllData;
window.exportAppData = exportAppData;
window.triggerImportAppData = triggerImportAppData;
window.importAppDataFromInput = importAppDataFromInput;
