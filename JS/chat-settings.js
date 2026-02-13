function getCurrentChatSettings(roleId) {
    const allSettingsRaw = localStorage.getItem('chat_settings_by_role') || '{}';
    let allSettings = {};
    try {
        allSettings = JSON.parse(allSettingsRaw);
    } catch (e) {
        allSettings = {};
    }
    const id = roleId || window.currentChatRole || '';
    return allSettings[id] || {};
}

function saveCurrentChatSettings(roleId, settings) {
    const allSettingsRaw = localStorage.getItem('chat_settings_by_role') || '{}';
    let allSettings = {};
    try {
        allSettings = JSON.parse(allSettingsRaw);
    } catch (e) {
        allSettings = {};
    }
    const id = roleId || window.currentChatRole || '';
    if (!id) return;
    allSettings[id] = Object.assign({}, allSettings[id] || {}, settings || {});
    localStorage.setItem('chat_settings_by_role', JSON.stringify(allSettings));
}

function applyChatBubbleCssFromSettings(roleId) {
    const id = roleId || window.currentChatRole || '';
    if (!id) return;
    const settings = getCurrentChatSettings(id);
    const cssText = settings.bubbleCss || '';
    const styleId = 'chat-bubble-css-style';
    let styleEl = document.getElementById(styleId);
    if (!cssText) {
        if (styleEl && styleEl.parentNode) {
            styleEl.parentNode.removeChild(styleEl);
        }
        return;
    }
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = `.msg-bubble { ${cssText} }
.msg-left .msg-bubble { ${cssText} }
.msg-right .msg-bubble { ${cssText} }`;
}

function updateBubblePreview() {
    const textarea = document.getElementById('setting-bubble-css');
    const preview = document.getElementById('bubble-preview');
    if (!textarea || !preview) return;
    const cssText = textarea.value || '';
    if (!cssText.trim()) {
        const left = preview.querySelector('.preview-bubble-left');
        const right = preview.querySelector('.preview-bubble-right');
        if (left) {
            left.setAttribute('style', 'background: #ffffff; padding: 8px 12px; border-radius: 4px; font-size: 14px; max-width: 70%; color: #000;');
        }
        if (right) {
            right.setAttribute('style', 'background: #95ec69; padding: 8px 12px; border-radius: 4px; font-size: 14px; max-width: 70%; color: #000; margin-right:8px;');
        }
        return;
    }
    const temp = document.createElement('div');
    document.body.appendChild(temp);
    temp.setAttribute('style', cssText);
    const applied = temp.getAttribute('style') || '';
    document.body.removeChild(temp);
    const left = preview.querySelector('.preview-bubble-left');
    const right = preview.querySelector('.preview-bubble-right');
    if (left) left.setAttribute('style', applied);
    if (right) right.setAttribute('style', applied);
}

function saveChatSettings() {
    const roleId = window.currentChatRole || '';
    const memoryLimitInput = document.getElementById('setting-memory-limit');
    const autoSummarySwitch = document.getElementById('setting-auto-summary-switch');
    const summaryFreqInput = document.getElementById('setting-summary-freq');
    const bubbleCssInput = document.getElementById('setting-bubble-css');
    const settings = {};
    if (memoryLimitInput) {
        settings.memoryLimit = parseInt(memoryLimitInput.value, 10) || 0;
    }
    if (autoSummarySwitch) {
        settings.autoSummary = !!autoSummarySwitch.checked;
    }
    if (summaryFreqInput) {
        settings.summaryFreq = parseInt(summaryFreqInput.value, 10) || 0;
    }
    if (bubbleCssInput) {
        settings.bubbleCss = bubbleCssInput.value || '';
    }
    saveCurrentChatSettings(roleId, settings);
    applyChatBubbleCssFromSettings(roleId);
}

function toggleSummaryInput() {
    const autoSummarySwitch = document.getElementById('setting-auto-summary-switch');
    const box = document.getElementById('setting-summary-freq-box');
    if (!autoSummarySwitch || !box) return;
    if (autoSummarySwitch.checked) {
        box.style.display = 'flex';
    } else {
        box.style.display = 'none';
    }
}

function initChatSettingsUI(roleId) {
    const id = roleId || window.currentChatRole || '';
    if (!id) return;
    const settings = getCurrentChatSettings(id);
    const memoryLimitInput = document.getElementById('setting-memory-limit');
    const autoSummarySwitch = document.getElementById('setting-auto-summary-switch');
    const summaryFreqInput = document.getElementById('setting-summary-freq');
    const bubbleCssInput = document.getElementById('setting-bubble-css');
    if (memoryLimitInput && typeof settings.memoryLimit === 'number' && settings.memoryLimit > 0) {
        memoryLimitInput.value = String(settings.memoryLimit);
    }
    if (autoSummarySwitch && typeof settings.autoSummary === 'boolean') {
        autoSummarySwitch.checked = settings.autoSummary;
    }
    if (summaryFreqInput && typeof settings.summaryFreq === 'number' && settings.summaryFreq > 0) {
        summaryFreqInput.value = String(settings.summaryFreq);
    }
    if (bubbleCssInput && typeof settings.bubbleCss === 'string') {
        bubbleCssInput.value = settings.bubbleCss;
    }
    toggleSummaryInput();
    updateBubblePreview();
}

window.getCurrentChatSettings = getCurrentChatSettings;
window.saveCurrentChatSettings = saveCurrentChatSettings;
window.applyChatBubbleCssFromSettings = applyChatBubbleCssFromSettings;
window.updateBubblePreview = updateBubblePreview;
window.saveChatSettings = saveChatSettings;
window.toggleSummaryInput = toggleSummaryInput;
window.initChatSettingsUI = initChatSettingsUI;

