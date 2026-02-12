const MOMENTS_STORAGE_KEY = 'wechat_moments_data';
const DEFAULT_MOMENTS_COVER = 'assets/images/beijing.jpg';
const DEFAULT_MOMENTS_AVATAR = 'assets/images/touxiang.jpg';
const DEFAULT_MOMENTS_NAME = '我';

function normalizeMomentsData(rawData) {
    const data = rawData && typeof rawData === 'object' ? rawData : {};
    if (!Array.isArray(data.posts)) data.posts = [];
    if (!data.userCover) data.userCover = DEFAULT_MOMENTS_COVER;
    if (!data.userAvatar) data.userAvatar = DEFAULT_MOMENTS_AVATAR;
    if (!data.userName) data.userName = DEFAULT_MOMENTS_NAME;
    return data;
}

function createDefaultMomentsData() {
    const now = Date.now();
    return {
        userCover: DEFAULT_MOMENTS_COVER,
        userAvatar: DEFAULT_MOMENTS_AVATAR,
        userName: DEFAULT_MOMENTS_NAME,
        posts: [
            {
                id: 'post_' + now,
                roleId: 'me',
                content: '今天天气真不错！',
                images: [DEFAULT_MOMENTS_COVER],
                timestamp: now,
                likes: [],
                comments: []
            }
        ]
    };
}

function initMomentsData() {
    let stored = null;
    const raw = localStorage.getItem(MOMENTS_STORAGE_KEY);
    if (raw) {
        try {
            stored = JSON.parse(raw);
        } catch (e) {
            stored = null;
        }
    }
    let data = null;
    if (stored && typeof stored === 'object') {
        data = normalizeMomentsData(stored);
        if (!Array.isArray(data.posts) || data.posts.length === 0) {
            data = createDefaultMomentsData();
        }
    } else {
        data = createDefaultMomentsData();
    }
    window.momentsData = data;
    saveMomentsData();
    return data;
}

function saveMomentsData() {
    if (!window.momentsData || typeof window.momentsData !== 'object') return;
    try {
        localStorage.setItem(MOMENTS_STORAGE_KEY, JSON.stringify(window.momentsData));
    } catch (e) {}
}

function formatMomentsTime(ts) {
    if (!ts) return '';
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return '刚刚';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return minutes + '分钟前';
    const nowDate = new Date();
    const todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    if (ts >= yesterdayStart && ts < todayStart) return '昨天';
    const d = new Date(ts);
    return d.getMonth() + 1 + '/' + d.getDate();
}

function getDisplayNameById(id, data) {
    if (id === 'me' || !id) return data.userName || DEFAULT_MOMENTS_NAME;
    const profiles = window.charProfiles || {};
    const p = profiles[id] || {};
    return p.nickName || id;
}

function getAvatarByRoleId(roleId, data) {
    if (roleId === 'me' || !roleId) return data.userAvatar || DEFAULT_MOMENTS_AVATAR;
    const profiles = window.charProfiles || {};
    const p = profiles[roleId] || {};
    return p.avatar || DEFAULT_MOMENTS_AVATAR;
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function bindMomentsGlobalClick() {
    if (window._momentsClickBound) return;
    window._momentsClickBound = true;
    document.addEventListener('click', function (e) {
        const target = e.target;
        if (!target) return;
        if (target.closest && (target.closest('.post-action-btn') || target.closest('.action-menu'))) return;
        const menus = document.querySelectorAll('.action-menu.show');
        for (let i = 0; i < menus.length; i++) {
            menus[i].classList.remove('show');
        }
    });
}

function bindMomentsScroll() {
    const container = document.getElementById('moments-view');
    if (!container) return;
    const nav = container.querySelector('.moments-navbar');
    if (!nav || nav._scrollBound) return;
    nav._scrollBound = true;
    container.addEventListener('scroll', function () {
        if (container.scrollTop > 10) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
    });
}

function renderMoments() {
    const container = document.getElementById('moments-view');
    if (!container) return;
    const data = initMomentsData();
    const posts = Array.isArray(data.posts) ? data.posts.slice() : [];
    posts.sort(function (a, b) {
        const ta = a && a.timestamp ? a.timestamp : 0;
        const tb = b && b.timestamp ? b.timestamp : 0;
        return tb - ta;
    });
    let html = '';
    html += '<div class="moments-navbar">';
    html += '  <div class="moments-nav-left" onclick="exitMoments()" style="cursor:pointer;">';
    html += '      <i class="fas fa-chevron-left"></i>';
    html += '  </div>';
    html += '  <div class="moments-nav-title">朋友圈</div>';
    html += '  <div class="moments-nav-camera" onclick="openMomentsPublisher()"><i class="bx bxs-camera"></i></div>';
    html += '</div>';
    html += '<div class="moments-header">';
    html += '  <img class="moments-cover" src="' + escapeHtml(data.userCover || DEFAULT_MOMENTS_COVER) + '" alt="" onclick="changeMomentsCover()">';
    html += '  <div class="moments-user-float">';
    html += '      <div class="moments-user-name">' + escapeHtml(data.userName || DEFAULT_MOMENTS_NAME) + '</div>';
    html += '      <img class="moments-user-avatar" src="' + escapeHtml(data.userAvatar || DEFAULT_MOMENTS_AVATAR) + '" alt="" onclick="changeMomentsAvatar()">';
    html += '  </div>';
    html += '</div>';
    html += '<div class="moments-list">';
    for (let i = 0; i < posts.length; i++) {
        const post = posts[i] || {};
        const postId = String(post.id || '');
        const roleId = post.roleId || 'me';
        const nickname = getDisplayNameById(roleId, data);
        const avatar = getAvatarByRoleId(roleId, data);
        const content = post.content || '';
        const images = Array.isArray(post.images) ? post.images : [];
        const likes = Array.isArray(post.likes) ? post.likes : [];
        const comments = Array.isArray(post.comments) ? post.comments : [];
        const likedByMe = likes.indexOf('me') !== -1;
        let imagesClass = 'post-images-grid';
        if (images.length === 1) imagesClass += ' one-img';
        else if (images.length === 4) imagesClass += ' four-imgs';
        html += '<div class="moment-post" data-post-id="' + escapeHtml(postId) + '">';
        html += '  <div class="post-avatar">';
        html += '      <img src="' + escapeHtml(avatar) + '" alt="">';
        html += '  </div>';
        html += '  <div class="post-content">';
        html += '      <div class="post-nickname">' + escapeHtml(nickname) + '</div>';
        html += '      <div class="post-text">' + escapeHtml(content) + '</div>';
        if (images.length > 0) {
            html += '      <div class="' + imagesClass + '">';
            for (let j = 0; j < images.length; j++) {
                const src = images[j];
                if (!src) continue;
                html += '          <img class="post-img" src="' + escapeHtml(src) + '" onclick="previewImage(\'' + escapeHtml(src) + '\')" alt="">';
            }
            html += '      </div>';
        }
        html += '      <div class="post-meta-row">';
        html += '          <span class="post-time">' + escapeHtml(formatMomentsTime(post.timestamp || 0)) + '</span>';
        html += '          <span class="post-action-btn" onclick="toggleActionMenu(this, \'' + escapeHtml(postId) + '\')">···</span>';
        if (roleId === 'me') {
            html += '      <span class="post-delete-btn" onclick="deletePost(\'' + escapeHtml(postId) + '\')">删除</span>';
        }
        html += '          <div class="action-menu">';
        html += '              <div class="menu-item-btn" onclick="toggleLike(\'' + escapeHtml(postId) + '\')">' + (likedByMe ? '取消赞' : '赞') + '</div>';
        html += '              <div class="menu-item-btn" onclick="showCommentInput(\'' + escapeHtml(postId) + '\')">评论</div>';
        html += '          </div>';
        html += '      </div>';
        const hasLikes = likes.length > 0;
        const hasComments = comments.length > 0;
        if (hasLikes || hasComments) {
            html += '      <div class="post-comments-area has-content">';
            if (hasLikes) {
                const likeNames = [];
                for (let k = 0; k < likes.length; k++) {
                    likeNames.push(escapeHtml(getDisplayNameById(likes[k], data)));
                }
                html += '          <div class="like-list">❤️ ' + likeNames.join('，') + '</div>';
            }
            if (hasComments) {
                html += '          <div class="comment-list">';
                for (let m = 0; m < comments.length; m++) {
                    const c = comments[m] || {};
                    const fromName = getDisplayNameById(c.from || '', data);
                    html += '              <div class="comment-row">';
                    html += '                  <span class="comment-user">' + escapeHtml(fromName) + '：</span>';
                    html += '                  <span>' + escapeHtml(c.content || '') + '</span>';
                    html += '              </div>';
                }
                html += '          </div>';
            }
            html += '      </div>';
        }
        html += '  </div>';
        html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    bindMomentsGlobalClick();
    bindMomentsScroll();
}

function exitMoments() {
    const appWindow = document.getElementById('app-window');
    if (appWindow) {
        appWindow.classList.remove('moments-fullscreen');
    }
    if (typeof window.switchWechatTab === 'function') {
        const tabBtn = document.querySelector('.chat-nav-btn[onclick*="switchWechatTab(\'chat\'"]');
        window.switchWechatTab('chat', tabBtn || null);
    }
}

window.renderMoments = renderMoments;
window.exitMoments = exitMoments;

function toggleActionMenu(btnElement, postId) {
    bindMomentsGlobalClick();
    const row = btnElement && btnElement.closest ? btnElement.closest('.post-meta-row') : null;
    if (!row) return;
    const menu = row.querySelector('.action-menu');
    if (!menu) return;
    const isShow = menu.classList.contains('show');
    const menus = document.querySelectorAll('.action-menu.show');
    for (let i = 0; i < menus.length; i++) {
        menus[i].classList.remove('show');
    }
    if (!isShow) menu.classList.add('show');
}

function toggleLike(postId) {
    const data = initMomentsData();
    const posts = Array.isArray(data.posts) ? data.posts : [];
    const targetIndex = posts.findIndex(function (p) {
        return String(p.id || '') === String(postId);
    });
    if (targetIndex === -1) return;
    const post = posts[targetIndex];
    if (!Array.isArray(post.likes)) post.likes = [];
    const myId = 'me';
    const idx = post.likes.indexOf(myId);
    if (idx === -1) post.likes.push(myId);
    else post.likes.splice(idx, 1);
    window.momentsData.posts = posts;
    saveMomentsData();
    renderMoments();
}

function showCommentInput(postId) {
    const bar = document.getElementById('moments-input-bar');
    if (!bar) return;
    bar.style.display = 'flex';
    bar.setAttribute('data-post-id', String(postId));
    const input = bar.querySelector('input, textarea');
    if (input) {
        input.value = '';
        input.focus();
        input.onkeydown = function (e) {
            if (e.key === 'Enter') submitComment();
        };
    }
}

function submitComment() {
    const bar = document.getElementById('moments-input-bar');
    if (!bar) return;
    const postId = bar.getAttribute('data-post-id') || '';
    if (!postId) return;
    const input = bar.querySelector('input, textarea');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const data = initMomentsData();
    const posts = Array.isArray(data.posts) ? data.posts : [];
    const targetIndex = posts.findIndex(function (p) {
        return String(p.id || '') === String(postId);
    });
    if (targetIndex === -1) return;
    const post = posts[targetIndex];
    if (!Array.isArray(post.comments)) post.comments = [];
    post.comments.push({ from: 'me', content: text });
    input.value = '';
    bar.style.display = 'none';
    window.momentsData.posts = posts;
    saveMomentsData();
    renderMoments();
}

function deletePost(postId) {
    if (!confirm('确定要删除这条朋友圈吗？')) return;
    const data = initMomentsData();
    const posts = Array.isArray(data.posts) ? data.posts : [];
    const filtered = posts.filter(function (p) {
        return String(p.id || '') !== String(postId);
    });
    window.momentsData.posts = filtered;
    saveMomentsData();
    renderMoments();
}

function changeMomentsCover() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = function () {
        if (!input.files || !input.files[0]) return;
        if (typeof window.handleImageUpload === 'function') {
            window.handleImageUpload(input, null, function (base64) {
                const data = initMomentsData();
                data.userCover = base64;
                window.momentsData = data;
                saveMomentsData();
                renderMoments();
            }, 720);
        } else {
            const reader = new FileReader();
            reader.onload = function (e) {
                const data = initMomentsData();
                data.userCover = e.target.result;
                window.momentsData = data;
                saveMomentsData();
                renderMoments();
            };
            reader.readAsDataURL(input.files[0]);
        }
    };
    document.body.appendChild(input);
    input.click();
    setTimeout(function () {
        if (input.parentNode) input.parentNode.removeChild(input);
    }, 0);
}

function changeMomentsAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = function () {
        if (!input.files || !input.files[0]) return;
        if (typeof window.handleImageUpload === 'function') {
            window.handleImageUpload(input, null, function (base64) {
                const data = initMomentsData();
                data.userAvatar = base64;
                window.momentsData = data;
                saveMomentsData();
                renderMoments();
                try {
                    localStorage.setItem('user_avatar', data.userAvatar || '');
                } catch (e) {}
                if (window.MineProfile && typeof window.MineProfile.handleAvatarFromMoments === 'function') {
                    window.MineProfile.handleAvatarFromMoments(data.userAvatar || '');
                }
            }, 720);
        } else {
            const reader = new FileReader();
            reader.onload = function (e) {
                const data = initMomentsData();
                data.userAvatar = e.target.result;
                window.momentsData = data;
                saveMomentsData();
                renderMoments();
                try {
                    localStorage.setItem('user_avatar', data.userAvatar || '');
                } catch (e2) {}
                if (window.MineProfile && typeof window.MineProfile.handleAvatarFromMoments === 'function') {
                    window.MineProfile.handleAvatarFromMoments(data.userAvatar || '');
                }
            };
            reader.readAsDataURL(input.files[0]);
        }
    };
    document.body.appendChild(input);
    input.click();
    setTimeout(function () {
        if (input.parentNode) input.parentNode.removeChild(input);
    }, 0);
}

function previewImage(src) {
    let overlay = document.getElementById('moments-image-preview');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'moments-image-preview';
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.background = 'rgba(0,0,0,0.8)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        const img = document.createElement('img');
        img.id = 'moments-image-preview-img';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        overlay.appendChild(img);
        overlay.addEventListener('click', function () {
            overlay.style.display = 'none';
        });
        document.body.appendChild(overlay);
    }
    const imgEl = document.getElementById('moments-image-preview-img') || overlay.querySelector('img');
    if (imgEl) imgEl.src = src;
    overlay.style.display = 'flex';
}

function openMomentsPublisher() {
    var modal = document.getElementById('moments-publish-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'moments-publish-modal';
        modal.className = 'moments-publish-modal';
        modal.innerHTML = ''
            + '<div class="moments-publish-nav">'
            + '  <button class="moments-publish-cancel" onclick="closeMomentsPublisher()">取消</button>'
            + '  <div class="moments-publish-title">发朋友圈</div>'
            + '  <button id="moments-publish-submit" class="moments-publish-submit disabled" onclick="submitMomentFromModal()">发表</button>'
            + '</div>'
            + '<div class="moments-publish-body">'
            + '  <textarea id="moments-publish-text" class="moments-publish-text" placeholder="这一刻的想法..." oninput="onMomentsDraftChange()"></textarea>'
            + '  <div class="moments-publish-images">'
            + '    <div id="moments-publish-images-grid" class="moments-publish-grid"></div>'
            + '    <input type="file" id="moments-publish-file" accept="image/*" multiple style="display:none" onchange="handleMomentsImageFiles(this)">'
            + '  </div>'
            + '  <div class="moments-publish-options">'
            + '    <div class="publish-option-item"><span class="option-icon">📍</span><span class="option-text">所在位置</span><span class="option-arrow">›</span></div>'
            + '    <div class="publish-option-item"><span class="option-icon">👤</span><span class="option-text">提醒谁看</span><span class="option-arrow">›</span></div>'
            + '    <div class="publish-option-item"><span class="option-icon">🔒</span><span class="option-text">谁可以看</span><span class="option-arrow">›</span></div>'
            + '  </div>'
            + '</div>';
        document.body.appendChild(modal);
    }
    window._momentsDraftImages = [];
    window._momentsDraftText = '';
    var textEl = document.getElementById('moments-publish-text');
    if (textEl) textEl.value = '';
    renderMomentsDraftImages();
    updateMomentsPublishButtonState();
    modal.style.display = 'flex';
}

function closeMomentsPublisher() {
    var modal = document.getElementById('moments-publish-modal');
    if (modal) modal.style.display = 'none';
    window._momentsDraftImages = [];
    window._momentsDraftText = '';
}

function renderMomentsDraftImages() {
    var grid = document.getElementById('moments-publish-images-grid');
    if (!grid) return;
    var images = window._momentsDraftImages || [];
    grid.innerHTML = '';
    for (var i = 0; i < images.length; i++) {
        var src = images[i];
        var item = document.createElement('div');
        item.className = 'publish-img-item';
        item.innerHTML = '<img src="' + src + '"><span class="publish-img-remove" onclick="removeMomentsImage(' + i + ')">×</span>';
        grid.appendChild(item);
    }
    if (images.length < 9) {
        var add = document.createElement('div');
        add.className = 'publish-img-add';
        add.innerHTML = '+';
        add.onclick = function () {
            var input = document.getElementById('moments-publish-file');
            if (input) {
                input.value = '';
                input.click();
            }
        };
        grid.appendChild(add);
    }
}

function handleMomentsImageFiles(input) {
    if (!input || !input.files || !input.files.length) return;
    var files = Array.prototype.slice.call(input.files);
    var images = window._momentsDraftImages || [];
    var remain = 9 - images.length;
    if (remain <= 0) return;
    files = files.slice(0, remain);

    var index = 0;
    function next() {
        if (index >= files.length) {
            window._momentsDraftImages = images;
            renderMomentsDraftImages();
            updateMomentsPublishButtonState();
            return;
        }
        var file = files[index++];
        if (!file) {
            next();
            return;
        }
        if (typeof window.handleImageUpload === 'function') {
            var tempInput = document.createElement('input');
            tempInput.type = 'file';
            tempInput.style.display = 'none';
            var dt = new DataTransfer();
            dt.items.add(file);
            tempInput.files = dt.files;
            window.handleImageUpload(tempInput, null, function (base64) {
                if (base64) images.push(base64);
                next();
            }, 1024);
        } else {
            var reader = new FileReader();
            reader.onload = function (e) {
                if (e.target && e.target.result) images.push(e.target.result);
                next();
            };
            reader.readAsDataURL(file);
        }
    }
    next();
}

function removeMomentsImage(index) {
    var images = window._momentsDraftImages || [];
    if (index < 0 || index >= images.length) return;
    images.splice(index, 1);
    window._momentsDraftImages = images;
    renderMomentsDraftImages();
    updateMomentsPublishButtonState();
}

function onMomentsDraftChange() {
    var textEl = document.getElementById('moments-publish-text');
    var value = textEl ? String(textEl.value || '') : '';
    window._momentsDraftText = value;
    updateMomentsPublishButtonState();
}

function updateMomentsPublishButtonState() {
    var btn = document.getElementById('moments-publish-submit');
    if (!btn) return;
    var text = window._momentsDraftText || '';
    var images = window._momentsDraftImages || [];
    var hasContent = (text && text.trim()) || (images && images.length > 0);
    if (hasContent) {
        btn.classList.remove('disabled');
    } else {
        btn.classList.add('disabled');
    }
}

function submitMomentFromModal() {
    var text = window._momentsDraftText || '';
    var images = window._momentsDraftImages || [];
    var hasText = text && String(text).trim();
    var hasImages = Array.isArray(images) && images.length > 0;
    if (!hasText && !hasImages) return;

    var data = initMomentsData();
    var posts = Array.isArray(data.posts) ? data.posts : [];
    var now = Date.now();
    var newPost = {
        id: 'post_' + now,
        roleId: 'me',
        content: hasText ? String(text).trim() : '',
        images: hasImages ? images.slice() : [],
        timestamp: now,
        likes: [],
        comments: []
    };
    posts.push(newPost);
    data.posts = posts;
    window.momentsData = data;
    saveMomentsData();
    renderMoments();
    closeMomentsPublisher();

    try {
        triggerAIReactionToMoment(newPost);
    } catch (e) {
        console.error('triggerAIReactionToMoment error:', e);
    }
}

function getCurrentChatRoleId() {
    if (window.currentChatRole && typeof window.currentChatRole === 'string' && window.currentChatRole) {
        return window.currentChatRole;
    }
    var stored = null;
    try {
        stored = localStorage.getItem('currentChatId') || '';
    } catch (e) { }
    return stored || '';
}

function getUserPersonaForRole(roleId) {
    if (!roleId) return '';
    var personas = window.userPersonas || {};
    var p = personas[roleId];
    if (!p || typeof p !== 'object') return '';
    return p.persona || p.desc || '';
}

function buildAIReactionPrompt(post, aiId, aiProfile, userName, userPersona) {
    var aiName = aiProfile && (aiProfile.nickName || aiProfile.name) ? (aiProfile.nickName || aiProfile.name) : aiId || 'AI';
    var contentText = post && post.content ? String(post.content).trim() : '';
    var hasImage = post && Array.isArray(post.images) && post.images.length > 0;
    var imagesDesc = hasImage ? '有图片' : '没有图片';
    var userLabel = userName || '用户';

    var basePersona = aiProfile && (aiProfile.persona || aiProfile.prompt || aiProfile.desc) ? (aiProfile.persona || aiProfile.prompt || aiProfile.desc) : '';
    var userPersonaText = userPersona ? userPersona : '';

    var systemPrompt = '你是聊天中的 AI 角色：' + aiName + '。你和 ' + userLabel + ' 在微信里聊天，你可以看到对方发的朋友圈，并根据关系选择是否点赞或评论。';

    var userMessageParts = [];
    userMessageParts.push('用户刚刚在微信朋友圈发了一条新动态。');
    userMessageParts.push('【动态内容】' + (contentText || '(用户只发了图片，没有文字)'));
    userMessageParts.push('【图片】' + imagesDesc + '。');
    if (basePersona) {
        userMessageParts.push('【你的角色人设】' + basePersona);
    }
    if (userPersonaText) {
        userMessageParts.push('【关于用户的设定】' + userPersonaText);
    }
    userMessageParts.push('请完全按照下面格式，输出一个 JSON 对象，不要写解释：');
    userMessageParts.push('{');
    userMessageParts.push('  "like": true 或 false,');
    userMessageParts.push('  "comment": "这里写评论内容，如果不想评论就留空字符串"');
    userMessageParts.push('}');
    userMessageParts.push('注意：你可以什么都不做（既不点赞也不评论），此时请返回 {"like": false, "comment": ""}。');

    return {
        systemPrompt: systemPrompt,
        userMessage: userMessageParts.join('\n')
    };
}

function triggerAIReactionToMoment(post) {
    if (!post || typeof post !== 'object') return;
    var aiId = getCurrentChatRoleId();
    if (!aiId) return;

    var profiles = window.charProfiles || {};
    var aiProfile = profiles[aiId] || {};

    var data = window.momentsData || initMomentsData();
    var userName = data && data.userName ? data.userName : DEFAULT_MOMENTS_NAME;
    var userPersona = getUserPersonaForRole(aiId);

    var prompts = buildAIReactionPrompt(post, aiId, aiProfile, userName, userPersona);

    if (typeof window.callAI !== 'function') {
        console.warn('callAI not found, skip AI reaction to moment.');
        return;
    }

    var delay = 5000 + Math.floor(Math.random() * 10000);

    setTimeout(function () {
        try {
            window.callAI(
                prompts.systemPrompt,
                [],
                prompts.userMessage,
                function (text) {
                    if (!text) return;
                    var raw = String(text).trim();
                    var jsonText = raw;
                    if (!jsonText.startsWith('{')) {
                        var start = jsonText.indexOf('{');
                        var end = jsonText.lastIndexOf('}');
                        if (start >= 0 && end > start) {
                            jsonText = jsonText.slice(start, end + 1);
                        }
                    }
                    var obj = null;
                    try {
                        obj = JSON.parse(jsonText);
                    } catch (e) {
                        console.warn('AI reaction JSON parse failed:', e, raw);
                        return;
                    }
                    if (!obj || typeof obj !== 'object') return;
                    var like = !!obj.like;
                    var commentText = obj.comment != null ? String(obj.comment) : '';

                    var currentData = initMomentsData();
                    var postsArr = Array.isArray(currentData.posts) ? currentData.posts : [];
                    var idx = postsArr.findIndex(function (p) {
                        return String(p.id || '') === String(post.id || '');
                    });
                    if (idx === -1) return;
                    var target = postsArr[idx];
                    if (!Array.isArray(target.likes)) target.likes = [];
                    if (!Array.isArray(target.comments)) target.comments = [];

                    if (like) {
                        if (target.likes.indexOf(aiId) === -1) {
                            target.likes.push(aiId);
                        }
                    }

                    if (commentText && commentText.trim()) {
                        target.comments.push({
                            from: aiId,
                            content: commentText.trim()
                        });
                    }

                    currentData.posts = postsArr;
                    window.momentsData = currentData;
                    saveMomentsData();
                    renderMoments();

                    if (commentText && commentText.trim()) {
                        try {
                            var discoverBtn = document.querySelector('.chat-bottom-bar .chat-nav-btn:nth-child(2)');
                            if (discoverBtn) {
                                discoverBtn.setAttribute('data-has-moments-notification', '1');
                                discoverBtn.style.position = 'relative';
                                var dot = discoverBtn.querySelector('.moments-notify-dot');
                                if (!dot) {
                                    dot = document.createElement('span');
                                    dot.className = 'moments-notify-dot';
                                    dot.style.position = 'absolute';
                                    dot.style.top = '4px';
                                    dot.style.right = '20px';
                                    dot.style.width = '6px';
                                    dot.style.height = '6px';
                                    dot.style.borderRadius = '50%';
                                    dot.style.backgroundColor = '#f44';
                                    discoverBtn.appendChild(dot);
                                }
                            }
                        } catch (e2) {
                            console.warn('set discover notification failed:', e2);
                        }
                    }
                },
                function (err) {
                    console.warn('AI reaction to moment failed:', err);
                }
            );
        } catch (e) {
            console.error('triggerAIReactionToMoment callAI error:', e);
        }
    }, delay);
}

window.initMomentsData = initMomentsData;
window.saveMomentsData = saveMomentsData;
window.formatMomentsTime = formatMomentsTime;
window.renderMoments = renderMoments;
window.toggleActionMenu = toggleActionMenu;
window.toggleLike = toggleLike;
window.showCommentInput = showCommentInput;
window.submitComment = submitComment;
window.deletePost = deletePost;
window.changeMomentsCover = changeMomentsCover;
window.changeMomentsAvatar = changeMomentsAvatar;
window.previewImage = previewImage;
window.openMomentsPublisher = openMomentsPublisher;

initMomentsData();
