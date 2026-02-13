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

            <!-- 清除数据按钮 -->
            <button onclick="clearAllData()" style="width: 100%; padding: 14px; background: #ff3b30; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3); cursor: pointer; transition: transform 0.1s; margin-top: 15px;">
                清除数据
            </button>
            <div style="text-align:center; margin-top:10px; font-size:12px; color:#ff3b30;">⚠️ 此操作将清除所有保存的数据</div>

        </div>
    `;
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

// 挂载
window.openSettingsApp = openSettingsApp;
window.fetchModelList = fetchModelList;
window.saveAllSettings = saveAllSettings;
window.clearAllData = clearAllData;
