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
        else if (images.length > 1 && images.length <= 4) imagesClass += ' two-cols';
        else if (images.length > 4) imagesClass += ' three-cols';
        html += '<div class="moment-post" data-post-id="' + escapeHtml(postId) + '">';
        html += '  <div class="post-avatar">';
        html += '      <img src="' + escapeHtml(avatar) + '" alt="">';
        html += '  </div>';
        html += '  <div class="post-content">';
        html += '      <div class="post-nickname">' + escapeHtml(nickname) + '</div>';
        if (content) {
            html += '      <div class="post-text">' + escapeHtml(content) + '</div>';
        }
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
        html += '          <div class="post-meta-left">';
        html += '              <span class="post-time">' + escapeHtml(formatMomentsTime(post.timestamp || 0)) + '</span>';
        var visibility = post && post.visibility ? post.visibility : { type: 'public', list: [] };
        var restricted = visibility && visibility.type && visibility.type !== 'public';
        if (roleId === 'me' && restricted) {
            html += '              <span class="post-visibility-flag"><i class="fas fa-user-lock"></i></span>';
        }
        if (roleId === 'me') {
            html += '              <span class="post-delete-btn" onclick="deletePost(\'' + escapeHtml(postId) + '\')">删除</span>';
        }
        html += '          </div>';
        html += '          <span class="post-action-btn" onclick="toggleActionMenu(this, \'' + escapeHtml(postId) + '\')">···</span>';
        html += '          <div class="action-menu">';
        html += '              <div class="menu-item-btn" onclick="toggleLike(\'' + escapeHtml(postId) + '\')">' + (likedByMe ? '取消赞' : '赞') + '</div>';
        html += '              <div class="menu-item-btn" onclick="onClickComment(\'' + escapeHtml(postId) + '\')">评论</div>';
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
                    const fromId = c.from || '';
                    const fromName = getDisplayNameById(fromId, data);
                    const safeFromName = escapeHtml(fromName).replace(/'/g, "\\'");
                    html += '              <div class="comment-row" onclick="onReplyComment(\'' + escapeHtml(postId) + '\', \'' + escapeHtml(fromId) + '\', \'' + safeFromName + '\')">';
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

function onClickComment(postId) {
    window._momentsReplyTarget = null;
    showCommentInput(postId);
    const input = document.querySelector('#moments-input-bar input, #moments-input-bar textarea');
    if (input) input.placeholder = '';
}

function onReplyComment(postId, targetRoleId, targetName) {
    if (!postId || !targetRoleId) return;
    if (targetRoleId === 'me') return;
    window._momentsReplyTarget = { id: targetRoleId, name: targetName || '' };
    showCommentInput(postId);
    const input = document.querySelector('#moments-input-bar input, #moments-input-bar textarea');
    if (input) input.placeholder = '回复 ' + (targetName || '') + '：';
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
    let finalContent = text;
    let replyTargetId = null;
    let replyTargetName = '';
    if (window._momentsReplyTarget && window._momentsReplyTarget.id) {
        replyTargetId = window._momentsReplyTarget.id;
        replyTargetName = window._momentsReplyTarget.name || '';
        finalContent = '回复 ' + (replyTargetName || '') + '：' + text;
    } else {
        const roleId = post.roleId || '';
        if (roleId && roleId !== 'me') {
            replyTargetId = roleId;
        } else if (Array.isArray(post.comments) && post.comments.length > 0) {
            for (let i = post.comments.length - 1; i >= 0; i--) {
                const c = post.comments[i];
                if (c && c.from && c.from !== 'me') {
                    replyTargetId = c.from;
                    break;
                }
            }
        }
    }
    post.comments.push({ from: 'me', content: finalContent });
    input.value = '';
    bar.style.display = 'none';
    window._momentsReplyTarget = null;
    input.placeholder = '';
    window.momentsData.posts = posts;
    saveMomentsData();
    renderMoments();

    if (replyTargetId && replyTargetId !== 'me') {
        try {
            triggerAIResponseToReply(post, text, replyTargetId);
        } catch (e) {
            console.error('triggerAIResponseToReply error:', e);
        }
    }
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
            + '    <div class="publish-option-item" id="moments-option-location" onclick="onClickMomentsLocation()">'
            + '      <span class="option-icon"><i class="fas fa-location-dot"></i></span>'
            + '      <span class="option-text">所在位置</span>'
            + '      <span class="option-extra" id="moments-option-location-text"></span>'
            + '      <span class="option-arrow">›</span>'
            + '    </div>'
            + '    <div class="publish-option-item" id="moments-option-remind" onclick="onClickMomentsRemind()">'
            + '      <span class="option-icon"><i class="fas fa-at"></i></span>'
            + '      <span class="option-text">提醒谁看</span>'
            + '      <span class="option-extra" id="moments-option-remind-text"></span>'
            + '      <span class="option-arrow">›</span>'
            + '    </div>'
            + '    <div class="publish-option-item" id="moments-option-visibility" onclick="onClickMomentsVisibility()">'
            + '      <span class="option-icon"><i class="fas fa-user-lock"></i></span>'
            + '      <span class="option-text">谁可以看</span>'
            + '      <span class="option-extra" id="moments-option-visibility-text"></span>'
            + '      <span class="option-arrow">›</span>'
            + '    </div>'
            + '  </div>'
            + '</div>';
        document.body.appendChild(modal);
    }
    window._momentsDraftImages = [];
    window._momentsDraftText = '';
    window._momentsDraftLocation = '';
    window._momentsDraftRemindIds = [];
    window._momentsDraftVisibility = { type: 'public', list: [] };
    var textEl = document.getElementById('moments-publish-text');
    if (textEl) textEl.value = '';
    updateMomentsOptionTexts();
    renderMomentsDraftImages();
    updateMomentsPublishButtonState();
    modal.style.display = 'flex';
}

function closeMomentsPublisher() {
    var modal = document.getElementById('moments-publish-modal');
    if (modal) modal.style.display = 'none';
    window._momentsDraftImages = [];
    window._momentsDraftText = '';
    window._momentsDraftLocation = '';
    window._momentsDraftRemindIds = [];
    window._momentsDraftVisibility = { type: 'public', list: [] };
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

function updateMomentsOptionTexts() {
    var locTextEl = document.getElementById('moments-option-location-text');
    var remindTextEl = document.getElementById('moments-option-remind-text');
    var visTextEl = document.getElementById('moments-option-visibility-text');

    var loc = window._momentsDraftLocation || '';
    if (locTextEl) {
        locTextEl.textContent = loc ? loc : '';
    }

    var remindIds = Array.isArray(window._momentsDraftRemindIds) ? window._momentsDraftRemindIds : [];
    if (remindTextEl) {
        if (remindIds.length > 0) {
            var names = [];
            var profiles = window.charProfiles || {};
            for (var i = 0; i < remindIds.length; i++) {
                var rid = remindIds[i];
                var p = profiles[rid] || {};
                var name = p.nickName || p.name || rid;
                names.push('@' + name);
            }
            remindTextEl.textContent = names.join('、');
        } else {
            remindTextEl.textContent = '';
        }
    }

    var vis = window._momentsDraftVisibility || { type: 'public', list: [] };
    if (visTextEl) {
        if (vis.type === 'public') {
            visTextEl.textContent = '公开';
        } else if (vis.type === 'private') {
            visTextEl.textContent = '仅自己可见';
        } else if (vis.type === 'allow') {
            visTextEl.textContent = '部分可见';
        } else if (vis.type === 'deny') {
            visTextEl.textContent = '不给谁看';
        } else {
            visTextEl.textContent = '';
        }
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

function onClickMomentsLocation() {
    var current = window._momentsDraftLocation || '';
    var input = window.prompt('填写所在位置：', current || '');
    if (input === null) return;
    input = String(input || '').trim();
    window._momentsDraftLocation = input;
    updateMomentsOptionTexts();
}

function onClickMomentsRemind() {
    var modal = document.getElementById('forward-modal');
    var listContainer = document.getElementById('forward-contact-list');
    if (!modal || !listContainer) return;

    listContainer.innerHTML = '';

    var allRoles = Object.keys(window.charProfiles || {});

    allRoles.forEach(function (roleId) {
        var profile = (window.charProfiles && window.charProfiles[roleId]) || {};
        var item = document.createElement('div');
        item.className = 'forward-item';

        var checked = Array.isArray(window._momentsDraftRemindIds) && window._momentsDraftRemindIds.indexOf(roleId) !== -1;

        item.onclick = function () {
            var arr = Array.isArray(window._momentsDraftRemindIds) ? window._momentsDraftRemindIds.slice() : [];
            var idx = arr.indexOf(roleId);
            if (idx === -1) {
                arr.push(roleId);
            } else {
                arr.splice(idx, 1);
            }
            window._momentsDraftRemindIds = arr;
            updateMomentsOptionTexts();
            var nowChecked = arr.indexOf(roleId) !== -1;
            if (nowChecked) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
            var checkEl = item.querySelector('.forward-check');
            if (checkEl) {
                checkEl.textContent = nowChecked ? '✓' : '';
            }
        };

        item.innerHTML = ''
            + '<img src="' + (profile.avatar || 'assets/default-avatar.png') + '" class="forward-avatar">'
            + '<span class="forward-name">' + (profile.nickName || profile.name || roleId) + '</span>'
            + '<span class="forward-check">' + (checked ? '✓' : '') + '</span>';

        if (checked) {
            item.classList.add('selected');
        }

        listContainer.appendChild(item);
    });

    modal.style.display = 'flex';
}

function onClickMomentsVisibility() {
    var sheet = document.getElementById('moments-visibility-sheet');
    if (!sheet) {
        sheet = document.createElement('div');
        sheet.id = 'moments-visibility-sheet';
        sheet.className = 'moments-visibility-sheet';
        sheet.innerHTML = ''
            + '<div class="moments-visibility-mask" onclick="closeMomentsVisibilitySheet()"></div>'
            + '<div class="moments-visibility-panel">'
            + '  <div class="moments-visibility-option" data-value="public" onclick="onSelectMomentsVisibility(\'public\')">公开</div>'
            + '  <div class="moments-visibility-option" data-value="private" onclick="onSelectMomentsVisibility(\'private\')">私密（仅自己可见）</div>'
            + '  <div class="moments-visibility-option" data-value="allow" onclick="onSelectMomentsVisibility(\'allow\')">部分可见...</div>'
            + '  <div class="moments-visibility-option" data-value="deny" onclick="onSelectMomentsVisibility(\'deny\')">不给谁看...</div>'
            + '  <div class="moments-visibility-cancel" onclick="closeMomentsVisibilitySheet()">取消</div>'
            + '</div>';
        document.body.appendChild(sheet);
    }
    sheet.style.display = 'flex';
}

function closeMomentsVisibilitySheet() {
    var sheet = document.getElementById('moments-visibility-sheet');
    if (sheet) sheet.style.display = 'none';
}

function onSelectMomentsVisibility(type) {
    closeMomentsVisibilitySheet();
    if (type === 'public') {
        window._momentsDraftVisibility = { type: 'public', list: [] };
        updateMomentsOptionTexts();
        return;
    }
    if (type === 'private') {
        window._momentsDraftVisibility = { type: 'private', list: [] };
        updateMomentsOptionTexts();
        return;
    }
    if (type === 'allow') {
        var currentAllow = window._momentsDraftVisibility && Array.isArray(window._momentsDraftVisibility.list) && window._momentsDraftVisibility.type === 'allow'
            ? window._momentsDraftVisibility.list
            : [];
        pickMomentsRoles('选择可以看到这条朋友圈的联系人', currentAllow, function (ids) {
            window._momentsDraftVisibility = { type: 'allow', list: ids || [] };
            updateMomentsOptionTexts();
        });
        return;
    }
    if (type === 'deny') {
        var currentDeny = window._momentsDraftVisibility && Array.isArray(window._momentsDraftVisibility.list) && window._momentsDraftVisibility.type === 'deny'
            ? window._momentsDraftVisibility.list
            : [];
        pickMomentsRoles('选择不会看到这条朋友圈的联系人', currentDeny, function (ids2) {
            window._momentsDraftVisibility = { type: 'deny', list: ids2 || [] };
            updateMomentsOptionTexts();
        });
        return;
    }
}

function pickMomentsRoles(title, initialSelected, onDone) {
    var modal = document.getElementById('forward-modal');
    var listContainer = document.getElementById('forward-contact-list');
    if (!modal || !listContainer) {
        alert('暂不支持选择联系人');
        if (typeof onDone === 'function') {
            onDone(Array.isArray(initialSelected) ? initialSelected : []);
        }
        return;
    }

    listContainer.innerHTML = '';

    var publishModal = document.getElementById('moments-publish-modal');
    var publishWasVisible = publishModal && publishModal.style.display === 'flex';
    if (publishModal && publishWasVisible) {
        publishModal.setAttribute('data-moments-publish-visible', '1');
        publishModal.style.display = 'none';
    }

    var headerTitle = modal.querySelector('.forward-header span:first-child');
    if (headerTitle) {
        headerTitle.textContent = title || '选择联系人';
    }

    var selected = Array.isArray(initialSelected) ? initialSelected.slice() : [];
    var allRoles = Object.keys(window.charProfiles || {});

    allRoles.forEach(function (roleId) {
        var p = window.charProfiles[roleId] || {};
        var name = p.nickName || p.name || roleId;

        var item = document.createElement('div');
        item.className = 'forward-item';

        var checked = selected.indexOf(roleId) !== -1;

        item.onclick = function () {
            var idx = selected.indexOf(roleId);
            if (idx === -1) {
                selected.push(roleId);
            } else {
                selected.splice(idx, 1);
            }
            var nowChecked = selected.indexOf(roleId) !== -1;
            if (nowChecked) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
            var checkEl = item.querySelector('.forward-check');
            if (checkEl) {
                checkEl.textContent = nowChecked ? '✓' : '';
            }
        };

        item.innerHTML = ''
            + '<img src="' + (p.avatar || 'assets/default-avatar.png') + '" class="forward-avatar">'
            + '<span class="forward-name">' + name + '</span>'
            + '<span class="forward-check">' + (checked ? '✓' : '') + '</span>';

        if (checked) {
            item.classList.add('selected');
        }

        listContainer.appendChild(item);
    });

    var footer = modal.querySelector('.forward-footer');
    if (!footer) {
        footer = document.createElement('div');
        footer.className = 'forward-footer';
        var btn = document.createElement('button');
        btn.id = 'forward-select-confirm';
        btn.textContent = '完成';
        btn.style.width = '100%';
        btn.style.padding = '10px 0';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.backgroundColor = '#07c160';
        btn.style.color = '#ffffff';
        btn.style.fontSize = '15px';
        btn.style.cursor = 'pointer';
        footer.appendChild(btn);
        var box = modal.querySelector('.forward-box');
        if (box) {
            box.appendChild(footer);
        }
    }

    var confirmBtn = modal.querySelector('#forward-select-confirm');
    if (confirmBtn) {
        confirmBtn.onclick = function () {
            window.closeForwardModal();
            var pm = document.getElementById('moments-publish-modal');
            if (pm && pm.getAttribute('data-moments-publish-visible') === '1') {
                pm.style.display = 'flex';
                pm.removeAttribute('data-moments-publish-visible');
            }
            if (typeof onDone === 'function') {
                onDone(selected.slice());
            }
        };
    }

    modal.style.display = 'flex';
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
    var locationText = window._momentsDraftLocation || '';
    var remindIds = Array.isArray(window._momentsDraftRemindIds) ? window._momentsDraftRemindIds.slice() : [];
    var visibility = window._momentsDraftVisibility || { type: 'public', list: [] };
    var newPost = {
        id: 'post_' + now,
        roleId: 'me',
        content: hasText ? String(text).trim() : '',
        images: hasImages ? images.slice() : [],
        timestamp: now,
        location: locationText,
        mentions: remindIds,
        visibility: visibility,
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
    var imagesCount = post && Array.isArray(post.images) ? post.images.length : 0;
    var hasImage = imagesCount > 0;
    var imagesDesc = hasImage
        ? ('有 ' + imagesCount + ' 张图片（模型可以直接理解这些图片的画面内容）')
        : '没有图片';
    var userLabel = userName || '用户';
    var locationText = post && post.location ? String(post.location).trim() : '';
    var mentions = post && Array.isArray(post.mentions) ? post.mentions : [];
    var remindForAi = mentions.indexOf(aiId) !== -1;

    var basePersona = aiProfile && (aiProfile.persona || aiProfile.prompt || aiProfile.desc) ? (aiProfile.persona || aiProfile.prompt || aiProfile.desc) : '';
    var userPersonaText = userPersona ? userPersona : '';

    var systemPrompt = '你是聊天中的 AI 角色：' + aiName + '。你和 ' + userLabel + ' 在微信里聊天，你可以看到对方发的朋友圈，并根据关系选择是否点赞或评论。';

    var userMessageParts = [];
    userMessageParts.push('用户刚刚在微信朋友圈发了一条新动态。');
    userMessageParts.push('【动态内容】' + (contentText || '(用户只发了图片，没有文字)'));
    userMessageParts.push('【图片】' + imagesDesc + '。');
    if (locationText) {
        userMessageParts.push('【发布位置】' + locationText);
    }
    if (remindForAi) {
        userMessageParts.push('【特别提醒】用户在这条朋友圈中 @ 了你，请优先考虑互动。');
    } else if (mentions.length > 0) {
        userMessageParts.push('【特别提醒的人】这条动态中 @ 了部分联系人。');
    }
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
    userMessageParts.push('其中 "comment" 字段的值必须是【纯文本的一句话】，禁止包含思考过程、理由说明、代码块、markdown 语法、JSON 字符串或任何额外结构。');
    userMessageParts.push('不要在上面 JSON 之外输出任何内容，不要输出代码块，不要解释你的思路。');

    return {
        systemPrompt: systemPrompt,
        userMessage: userMessageParts.join('\n')
    };
}

function triggerAIReactionToMoment(post) {
    if (!post || typeof post !== 'object') return;
    var profiles = window.charProfiles || {};
    var allRoles = Object.keys(profiles);
    if (!allRoles || !allRoles.length) return;

    var visibility = post && post.visibility ? post.visibility : { type: 'public', list: [] };

    allRoles.forEach(function (roleId) {
        var canSee = true;
        if (visibility && visibility.type) {
            if (visibility.type === 'private') {
                canSee = false;
            } else if (visibility.type === 'allow') {
                if (!visibility.list || visibility.list.indexOf(roleId) === -1) {
                    canSee = false;
                }
            } else if (visibility.type === 'deny') {
                if (visibility.list && visibility.list.indexOf(roleId) !== -1) {
                    canSee = false;
                }
            }
        }
        if (!canSee) return;

        var delay = 3000 + Math.floor(Math.random() * 15000);
        setTimeout(function (targetId) {
            return function () {
                triggerSingleAIReaction(post, targetId);
            };
        }(roleId), delay);
    });
}

function triggerSingleAIReaction(post, aiId) {
    if (!post || typeof post !== 'object') return;
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

    try {
        var userPayload = prompts.userMessage;
        if (post && Array.isArray(post.images) && post.images.length > 0) {
            var firstImage = post.images[0];
            if (firstImage && typeof firstImage === 'string') {
                userPayload = {
                    type: 'image',
                    base64: firstImage,
                    text: prompts.userMessage
                };
            }
        }
        window.callAI(
            prompts.systemPrompt,
            [],
            userPayload,
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
                commentText = sanitizeAIPlainText(commentText);

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
        console.error('triggerSingleAIReaction callAI error:', e);
    }
}

// 🔍 搜索 function sanitizeAIPlainText 并替换为：
function sanitizeAIPlainText(text) {
    if (text == null) return '';
    let s = String(text);

    // === 1. 尝试从 Markdown/JSON 中提取内容 ===
    try {
        let potentialJson = s;
        // 移除 ```json ... ```
        potentialJson = potentialJson.replace(/```(json)?/gi, '').trim();
        
        const start = potentialJson.indexOf('{');
        const end = potentialJson.lastIndexOf('}');
        
        if (start !== -1 && end > start) {
            const jsonBody = potentialJson.substring(start, end + 1);
            const obj = JSON.parse(jsonBody);
            
            // 朋友圈回复常见的字段
            if (obj.comment) s = String(obj.comment);
            else if (obj.reply) s = String(obj.reply);
            else if (obj.content) s = String(obj.content);
            else if (obj.message) s = String(obj.message);
            // 如果解析成功但没有上述字段，s 保持原样 (可能 AI 把内容放在了别的地方，或者本身就不是 JSON)
        }
    } catch (e) {
        // 解析失败，按普通文本处理
    }

    // === 2. 文本清洗 ===
    // 去除 <thinking>
    s = s.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    if (s.indexOf('<thinking>') !== -1) s = s.split('<thinking>')[0];
    
    // 彻底移除剩余的 ```
    s = s.replace(/```/g, '');

    // 移除前缀行
    const lines = s.split('\n');
    const cleanedLines = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        if (/^(思考过程|推理过程|解释|思路|分析|推断|system|assistant)\s*[:：]/i.test(line)) continue;
        cleanedLines.push(line);
    }
    s = cleanedLines.join(' ');
    
    return s.replace(/[ \t]{2,}/g, ' ').trim();
}


function triggerAIResponseToReply(post, userContent, targetRoleId) {
    if (!post || typeof post !== 'object') return;
    if (!userContent) return;
    if (!targetRoleId) return;
    if (typeof window.callAI !== 'function') {
        console.warn('callAI not found, skip AI response to reply.');
        return;
    }

    var profiles = window.charProfiles || {};
    var aiProfile = profiles[targetRoleId] || {};
    var aiName = aiProfile.nickName || aiProfile.name || targetRoleId;

    var originalText = post.content || '';
    var images = Array.isArray(post.images) ? post.images : [];
    var imageInfo = '';
    if (images.length === 0) {
        imageInfo = '无图片';
    } else if (images.length === 1) {
        imageInfo = '有 1 张图片（模型可以直接理解这张图片的画面内容）';
    } else {
        imageInfo = '有 ' + images.length + ' 张图片（模型可以直接理解这些图片的画面内容）';
    }

    var previousComment = '';
    if (Array.isArray(post.comments)) {
        for (var i = post.comments.length - 1; i >= 0; i--) {
            var c = post.comments[i];
            if (c && c.from === targetRoleId) {
                previousComment = c.content || '';
                break;
            }
        }
    }

    var systemPrompt = '你是朋友圈中的角色「' + aiName + '」。用户刚刚在朋友圈中回复了你的评论。';
    var userMessageParts = [];
    userMessageParts.push('请根据以下上下文，用一句自然的话回复用户，不要重复你之前的观点：');
    userMessageParts.push('【朋友圈原贴内容】' + (originalText || '（无文字，仅图片）'));
    userMessageParts.push('【图片情况】' + imageInfo);
    userMessageParts.push('【你之前的评论】' + (previousComment || '（之前没有评论内容）'));
    userMessageParts.push('【用户的回复】' + userContent);
    userMessageParts.push('要求：只回复一句话，不要带任何前缀或解释。禁止输出思考过程、分析步骤、代码块、markdown、JSON 或任何额外结构，只输出这句话的正文内容。');

    var userMessage = userMessageParts.join('\n');

    var delay = 2000 + Math.floor(Math.random() * 3000);
    setTimeout(function () {
        try {
            window.callAI(
                systemPrompt,
                [],
                {
                    type: images && images.length > 0 && typeof images[0] === 'string' ? 'image' : undefined,
                    base64: images && images.length > 0 && typeof images[0] === 'string' ? images[0] : undefined,
                    text: userMessage
                },
                function (text) {
                    if (!text) return;
                    var raw = String(text).trim();
                    // 修改点开始：处理 Markdown 包裹的 JSON
                    if (raw.includes('```')) {
                        raw = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
                    }
                    // 修改点结束
                    
                    var reply = raw;
                    // 尝试解析 JSON 提取内容 (借助新的 sanitizeAIPlainText 逻辑)
                    reply = sanitizeAIPlainText(reply);
                    
                    if (!reply) return;

                    var currentData = initMomentsData();
                    var postsArr = Array.isArray(currentData.posts) ? currentData.posts : [];
                    var idx = postsArr.findIndex(function (p) {
                        return String(p.id || '') === String(post.id || '');
                    });
                    if (idx === -1) return;
                    var targetPost = postsArr[idx];
                    if (!Array.isArray(targetPost.comments)) targetPost.comments = [];

                    var userNameData = currentData && currentData.userName ? currentData.userName : (typeof DEFAULT_MOMENTS_NAME !== 'undefined' ? DEFAULT_MOMENTS_NAME : '');
                    var atName = userNameData || '';
                    if (atName) {
                        var atPrefix = '@' + atName;
                        if (reply.indexOf(atPrefix) !== 0) {
                            reply = atPrefix + ' ' + reply;
                        }
                    }

                    targetPost.comments.push({
                        from: targetRoleId,
                        content: reply
                    });

                    currentData.posts = postsArr;
                    window.momentsData = currentData;
                    saveMomentsData();
                    renderMoments();
                },
                function (err) {
                    console.warn('AI response to reply failed:', err);
                }
            );
        } catch (e) {
            console.error('triggerAIResponseToReply callAI error:', e);
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

var MOMENTS_PROACTIVE_KEY = 'moments_proactive_state_v1';

function loadProactiveState() {
    var raw = null;
    try {
        raw = localStorage.getItem(MOMENTS_PROACTIVE_KEY);
    } catch (e) { }
    if (!raw) return {};
    try {
        var obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') return obj;
    } catch (e2) { }
    return {};
}

function saveProactiveState(state) {
    try {
        localStorage.setItem(MOMENTS_PROACTIVE_KEY, JSON.stringify(state || {}));
    } catch (e) { }
}

function checkProactiveMomentsTick() {
    var profiles = window.charProfiles || {};
    var roleIds = Object.keys(profiles || {});
    if (!roleIds || !roleIds.length) return;
    var now = Date.now();
    var baseInterval = 60 * 60 * 1000;
    var state = loadProactiveState();
    roleIds.forEach(function (roleId) {
        if (!roleId || roleId === 'me') return;
        var s = state[roleId] || {};
        var lastCheck = typeof s.lastCheckAt === 'number' ? s.lastCheckAt : 0;
        if (now - lastCheck < baseInterval) return;
        s.lastCheckAt = now;
        state[roleId] = s;
        maybeTriggerRoleProactiveMoment(roleId, s);
    });
    saveProactiveState(state);
}

function maybeTriggerRoleProactiveMoment(roleId, roleState) {
    if (!roleId) return;
    if (typeof window.callAI !== 'function') return;
    var profiles = window.charProfiles || {};
    var profile = profiles[roleId] || {};
    var data = window.momentsData || initMomentsData();
    var postsForLimit = Array.isArray(data.posts) ? data.posts : [];
    var nowTsForLimit = Date.now();
    var dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    var dayStartTs = dayStart.getTime();
    var todayCount = 0;
    for (var i = 0; i < postsForLimit.length; i++) {
        var p = postsForLimit[i];
        if (!p || p.roleId !== roleId) continue;
        var ts = typeof p.timestamp === 'number' ? p.timestamp : 0;
        if (ts >= dayStartTs && ts <= nowTsForLimit) {
            todayCount++;
        }
    }
    var personaTextRaw = profile.desc || profile.persona || profile.prompt || '';
    var personaTextLower = String(personaTextRaw || '');
    var isExtrovert = personaTextLower.indexOf('外向') !== -1
        || personaTextLower.indexOf('开朗') !== -1
        || personaTextLower.indexOf('活泼') !== -1
        || personaTextLower.indexOf('社牛') !== -1;
    var isIntrovert = personaTextLower.indexOf('内向') !== -1
        || personaTextLower.indexOf('安静') !== -1
        || personaTextLower.indexOf('慢热') !== -1
        || personaTextLower.indexOf('害羞') !== -1;
    var maxPerDay = 2;
    if (isExtrovert) maxPerDay = 3;
    else if (isIntrovert) maxPerDay = 2;
    if (todayCount >= maxPerDay) return;
    var userName = data && data.userName ? data.userName : DEFAULT_MOMENTS_NAME;
    var personaText = profile.desc || profile.persona || profile.prompt || '';
    var styleText = profile.style || '';
    var scheduleText = profile.schedule || '';
    var worldbookText = '';
    if (profile.worldbookId && window.worldBooks && window.worldBooks[profile.worldbookId]) {
        var wb = window.worldBooks[profile.worldbookId];
        worldbookText = '世界书标题：' + (wb.title || '') + '\n世界书内容：' + (wb.content || '');
    }
    var archive = null;
    if (window.memoryArchiveStore && window.memoryArchiveStore[roleId]) {
        archive = window.memoryArchiveStore[roleId];
    }
    var likesText = archive && archive.likesText ? archive.likesText : '';
    var habitsText = archive && archive.habitsText ? archive.habitsText : '';
    var eventsText = archive && archive.eventsText ? archive.eventsText : '';
    var lastPostAt = roleState && typeof roleState.lastPostAt === 'number' ? roleState.lastPostAt : 0;
    var lastPostDesc = lastPostAt ? new Date(lastPostAt).toLocaleString() : '从未发过朋友圈';
    var nowStr = new Date().toLocaleString();

    var systemPrompt = '你是微信里的 AI 角色「' + (profile.nickName || profile.name || roleId) + '」。你和用户正在微信里聊天。你需要根据自己的人设、世界书和对话记忆，决定现在要不要主动发一条朋友圈。';

    var msgParts = [];
    msgParts.push('当前时间：' + nowStr);
    msgParts.push('用户昵称：' + (userName || '用户'));
    if (personaText) msgParts.push('角色人设：' + personaText);
    if (styleText) msgParts.push('说话风格：' + styleText);
    if (scheduleText) msgParts.push('作息偏好：' + scheduleText);
    if (worldbookText) msgParts.push(worldbookText);
    if (likesText) msgParts.push('关于用户的喜好总结：\n' + likesText);
    if (habitsText) msgParts.push('关于用户的习惯总结：\n' + habitsText);
    if (eventsText) msgParts.push('你和用户之间的重要事件：\n' + eventsText);
    msgParts.push('你上一次主动发朋友圈的时间：' + lastPostDesc);
    msgParts.push('请你结合上面的信息，自主判断现在是否适合发一条新的朋友圈。');
    msgParts.push('请只输出一个 JSON 对象，格式如下：');
    msgParts.push('{');
    msgParts.push('  "should_post": true 或 false,');
    msgParts.push('  "content": "如果要发，这里写朋友圈文案，控制在 50 字以内，纯文本一句话",');
    msgParts.push('  "visibility": "public 或 private 或 friends",');
    msgParts.push('  "mood": "happy 或 neutral 或 sad"');
    msgParts.push('}');
    msgParts.push('要求：');
    msgParts.push('1. 严格只返回上面这个 JSON，不要在前后增加任何解释、思考过程或额外内容。');
    msgParts.push('2. 如果你觉得现在不适合发朋友圈，就返回 {"should_post": false, "content": "", "visibility": "public", "mood": "neutral"}。');
    msgParts.push('3. "content" 必须是纯文本，不要包含表情代码、markdown、换行、JSON 或代码块。');

    var userMessage = msgParts.join('\n');

    window.callAI(
        systemPrompt,
        [],
        userMessage,
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
                console.warn('AI proactive moment JSON parse failed:', e, raw);
                return;
            }
            if (!obj || typeof obj !== 'object') return;
            var shouldPost = !!obj.should_post;
            var content = obj.content != null ? String(obj.content) : '';
            content = sanitizeAIPlainText(content);
            if (!shouldPost || !content) return;

            var visibilityType = 'public';
            if (obj.visibility === 'private') {
                visibilityType = 'private';
            } else if (obj.visibility === 'friends') {
                visibilityType = 'public';
            }

            var currentData = initMomentsData();
            var posts = Array.isArray(currentData.posts) ? currentData.posts : [];
            var nowTs = Date.now();
            var newPost = {
                id: 'post_ai_' + roleId + '_' + nowTs,
                roleId: roleId,
                content: content,
                images: [],
                timestamp: nowTs,
                location: '',
                mentions: [],
                visibility: { type: visibilityType, list: [] },
                likes: [],
                comments: []
            };
            posts.push(newPost);
            currentData.posts = posts;
            window.momentsData = currentData;
            saveMomentsData();

            var state = loadProactiveState();
            if (!state[roleId]) state[roleId] = {};
            state[roleId].lastPostAt = nowTs;
            saveProactiveState(state);
        },
        function (err) {
            console.warn('AI proactive moment failed:', err);
        }
    );
}

if (!window._momentsProactiveTimer) {
    window._momentsProactiveTimer = setInterval(checkProactiveMomentsTick, 5 * 60 * 1000);
}
