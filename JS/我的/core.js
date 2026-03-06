var MineCore = (function () {
    var initialized = false;

    function compressImageDataUrl(dataUrl, maxSide, done) {
        if (!dataUrl) return done('');
        var img = new Image();
        img.onload = function () {
            var w = img.naturalWidth || img.width || 0;
            var h = img.naturalHeight || img.height || 0;
            if (!w || !h) return done(dataUrl);
            var maxDim = Math.max(w, h);
            var scale = maxDim > maxSide ? (maxSide / maxDim) : 1;
            var outW = Math.max(1, Math.round(w * scale));
            var outH = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            var ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, outW, outH);
                ctx.drawImage(img, 0, 0, outW, outH);
            }
            var out = '';
            try {
                out = canvas.toDataURL('image/jpeg', 0.86);
            } catch (e) {
                out = dataUrl;
            }
            done(out || dataUrl);
        };
        img.onerror = function () {
            done(dataUrl);
        };
        img.src = dataUrl;
    }

    function readImageFileAsAvatar(file, done) {
        if (!file) return done('');
        var reader = new FileReader();
        reader.onload = function (e) {
            var dataUrl = e && e.target ? e.target.result : '';
            dataUrl = typeof dataUrl === 'string' ? dataUrl : '';
            if (!dataUrl) return done('');
            compressImageDataUrl(dataUrl, 512, done);
        };
        reader.onerror = function () {
            done('');
        };
        try {
            reader.readAsDataURL(file);
        } catch (e) {
            done('');
        }
    }

    function buildHtml() {
        var html = '';
        html += '<div class="mine-root">';
        html += '  <div class="mine-header">';
        html += '    <div class="mine-header-avatar" data-mine-action="change-avatar">';
        html += '      <img data-mine-role="avatar" src="" alt="">';
        html += '    </div>';
        html += '    <div class="mine-header-info">';
        html += '      <div class="mine-header-name" data-mine-role="name" data-mine-action="edit-name"></div>';
        html += '      <div class="mine-header-signature" data-mine-role="signature" data-mine-action="edit-signature"></div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <input type="file" id="mine-avatar-input" class="mine-avatar-input" accept="image/*">';
        html += '  <div class="mine-list-section">';
        html += '    <div class="mine-list-item" data-mine-item="wallet">';
        html += '      <div class="mine-item-icon"><i class="bx bx-wallet"></i></div>';
        html += '      <div class="mine-item-text">钱包</div>';
        html += '      <div class="mine-item-arrow">›</div>';
        html += '    </div>';
        html += '    <div class="mine-list-item" data-mine-item="favorites">';
        html += '      <div class="mine-item-icon"><i class="bx bx-bookmark-heart"></i></div>';
        html += '      <div class="mine-item-text">收藏</div>';
        html += '      <div class="mine-item-arrow">›</div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="mine-list-section">';
        html += '    <div class="mine-list-item" data-mine-item="moments">';
        html += '      <div class="mine-item-icon"><i class="bx bx-image-alt"></i></div>';
        html += '      <div class="mine-item-text">我们</div>';
        html += '      <div class="mine-item-arrow">›</div>';
        html += '    </div>';
        html += '    <div class="mine-list-item" data-mine-item="sports">';
        html += '      <div class="mine-item-icon"><i class="bx bx-run"></i></div>';
        html += '      <div class="mine-item-text">运动</div>';
        html += '      <div class="mine-item-arrow">›</div>';
        html += '    </div>';
        html += '    <div class="mine-list-item" data-mine-item="period">';
        html += '      <div class="mine-item-icon"><i class="bx bx-droplet"></i></div>';
        html += '      <div class="mine-item-text">经期</div>';
        html += '      <div class="mine-item-arrow">›</div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="mine-favorites-panel" id="mine-favorites-panel" style="display:none;">';
        html += '    <div class="mine-favorites-header">';
        html += '      <div class="mine-favorites-back" data-fav-action="back">‹</div>';
        html += '      <div class="mine-favorites-title">收藏</div>';
        html += '      <div class="mine-favorites-spacer"></div>';
        html += '    </div>';
        html += '    <div class="mine-favorites-list" id="mine-favorites-list"></div>';
        html += '  </div>';
        html += '  <div class="mine-edit-overlay" id="mine-edit-overlay" style="display:none;" aria-hidden="true">';
        html += '    <div class="mine-edit-card" role="dialog" aria-modal="true">';
        html += '      <div class="mine-edit-title" id="mine-edit-title"></div>';
        html += '      <input id="mine-edit-input" class="mine-edit-input" type="text" autocomplete="off">';
        html += '      <textarea id="mine-edit-textarea" class="mine-edit-textarea" rows="3"></textarea>';
        html += '      <div class="mine-edit-actions">';
        html += '        <button type="button" class="mine-edit-btn mine-edit-cancel" data-mine-edit="cancel">取消</button>';
        html += '        <button type="button" class="mine-edit-btn mine-edit-save" data-mine-edit="save">保存</button>';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
        return html;
    }

    function formatTime(ts) {
        var t = typeof ts === 'number' ? ts : parseInt(String(ts || ''), 10);
        if (!t || isNaN(t)) return '';
        var d = new Date(t);
        var now = new Date();
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        if (d.toDateString() === now.toDateString()) {
            return hh + ':' + mm;
        }
        return (d.getMonth() + 1) + '/' + d.getDate();
    }

    function getFavoritesList() {
        if (window.getFavorites && typeof window.getFavorites === 'function') {
            return window.getFavorites();
        }
        try {
            var raw = localStorage.getItem('wechat_favorites_v2');
            var parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function toggleFavoritesPanel(container, visible) {
        var panel = container.querySelector('#mine-favorites-panel');
        if (panel) panel.style.display = visible ? 'block' : 'none';
        var header = container.querySelector('.mine-header');
        if (header) header.style.display = visible ? 'none' : '';
        var sections = container.querySelectorAll('.mine-list-section');
        sections.forEach(function (el) {
            el.style.display = visible ? 'none' : '';
        });
    }

    function renderFavorites(container) {
        var listEl = container.querySelector('#mine-favorites-list');
        if (!listEl) return;
        var list = getFavoritesList();
        list = list.slice().sort(function (a, b) {
            var ta = a && typeof a.timestamp === 'number' ? a.timestamp : 0;
            var tb = b && typeof b.timestamp === 'number' ? b.timestamp : 0;
            return tb - ta;
        });
        if (!list.length) {
            listEl.innerHTML = '<div class="mine-favorites-empty">暂无收藏</div>';
            return;
        }
        var html = '';
        list.forEach(function (fav) {
            var id = fav && fav.id ? String(fav.id) : '';
            var avatar = fav && fav.senderAvatar ? String(fav.senderAvatar) : 'assets/chushitouxiang.jpg';
            var name = fav && fav.senderName ? String(fav.senderName) : 'TA';
            var timeText = formatTime(fav && fav.timestamp);
            var content = fav && fav.content ? String(fav.content) : '';
            content = content.replace(/\s+/g, ' ').trim();
            if (content.length > 80) content = content.slice(0, 80) + '...';
            html += '<div class="mine-fav-item" data-fav-id="' + id + '">';
            html += '  <div class="mine-fav-avatar"><img src="' + avatar + '" alt=""></div>';
            html += '  <div class="mine-fav-main">';
            html += '    <div class="mine-fav-top">';
            html += '      <div class="mine-fav-name">' + name + '</div>';
            html += '      <div class="mine-fav-time">' + timeText + '</div>';
            html += '    </div>';
            html += '    <div class="mine-fav-content">' + content + '</div>';
            html += '  </div>';
            html += '</div>';
        });
        listEl.innerHTML = html;
        var items = listEl.querySelectorAll('.mine-fav-item');
        items.forEach(function (el) {
            el.onclick = function () {
                var id = el.getAttribute('data-fav-id') || '';
                var picked = null;
                for (var i = 0; i < list.length; i++) {
                    if (String(list[i] && list[i].id || '') === String(id)) {
                        picked = list[i];
                        break;
                    }
                }
                if (!picked) return;
                if (picked.roleId && window.enterChatRoom && typeof window.enterChatRoom === 'function') {
                    window.enterChatRoom(String(picked.roleId));
                    setTimeout(function () {
                        if (picked.messageId && window.scrollToChatMessageById && typeof window.scrollToChatMessageById === 'function') {
                            window.scrollToChatMessageById(String(picked.messageId));
                        }
                    }, 380);
                }
            };
        });
    }

    function closeEditOverlay(container) {
        var overlay = container.querySelector('#mine-edit-overlay');
        if (!overlay) return;
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('data-field', '');
    }

    function saveEditOverlay(container) {
        var overlay = container.querySelector('#mine-edit-overlay');
        if (!overlay) return;
        var field = overlay.getAttribute('data-field') || '';
        var input = container.querySelector('#mine-edit-input');
        var textarea = container.querySelector('#mine-edit-textarea');
        if (!field) return closeEditOverlay(container);

        if (field === 'name') {
            var nameVal = input ? String(input.value || '').trim() : '';
            if (window.MineProfile && typeof window.MineProfile.setName === 'function') {
                window.MineProfile.setName(nameVal);
            }
        } else if (field === 'signature') {
            var signVal = textarea ? String(textarea.value || '') : '';
            if (window.MineProfile && typeof window.MineProfile.setSignature === 'function') {
                window.MineProfile.setSignature(signVal);
            }
        }
        closeEditOverlay(container);
    }

    function openEditOverlay(container, field) {
        var overlay = container.querySelector('#mine-edit-overlay');
        if (!overlay) return;
        var title = container.querySelector('#mine-edit-title');
        var input = container.querySelector('#mine-edit-input');
        var textarea = container.querySelector('#mine-edit-textarea');

        var profile = null;
        if (window.MineProfile && typeof window.MineProfile.getProfile === 'function') {
            profile = window.MineProfile.getProfile();
        }
        profile = profile || { name: '', signature: '' };

        overlay.setAttribute('data-field', field || '');
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');

        if (field === 'name') {
            if (title) title.textContent = '修改昵称';
            if (input) {
                input.style.display = '';
                input.value = profile.name || '';
            }
            if (textarea) textarea.style.display = 'none';
            setTimeout(function () {
                try { input && input.focus(); } catch (e) { }
                try { input && input.select && input.select(); } catch (e2) { }
            }, 0);
        } else if (field === 'signature') {
            if (title) title.textContent = '修改个性签名';
            if (textarea) {
                textarea.style.display = '';
                textarea.value = profile.signature || '';
            }
            if (input) input.style.display = 'none';
            setTimeout(function () {
                try { textarea && textarea.focus(); } catch (e) { }
            }, 0);
        }
    }

    function bindEvents(container) {
        var avatarBox = container.querySelector('[data-mine-action="change-avatar"]');
        var avatarInput = container.querySelector('#mine-avatar-input');
        if (avatarInput) avatarInput.value = '';
        if (avatarBox && avatarInput) {
            avatarBox.onclick = function () {
                try { avatarInput.click(); } catch (e) { }
            };
        }
        if (avatarInput) {
            avatarInput.onchange = function () {
                var file = avatarInput.files && avatarInput.files[0] ? avatarInput.files[0] : null;
                readImageFileAsAvatar(file, function (avatarDataUrl) {
                    if (avatarDataUrl && window.MineProfile && typeof window.MineProfile.setAvatar === 'function') {
                        window.MineProfile.setAvatar(avatarDataUrl);
                    }
                });
                avatarInput.value = '';
            };
        }

        var nameEl = container.querySelector('[data-mine-action="edit-name"]');
        if (nameEl) {
            nameEl.onclick = function (e) {
                if (e && e.stopPropagation) e.stopPropagation();
                openEditOverlay(container, 'name');
            };
        }
        var signEl = container.querySelector('[data-mine-action="edit-signature"]');
        if (signEl) {
            signEl.onclick = function (e) {
                if (e && e.stopPropagation) e.stopPropagation();
                openEditOverlay(container, 'signature');
            };
        }

        var editOverlay = container.querySelector('#mine-edit-overlay');
        if (editOverlay) {
            editOverlay.onclick = function (e) {
                if (e && e.target === editOverlay) closeEditOverlay(container);
            };
            var cancelBtn = editOverlay.querySelector('[data-mine-edit="cancel"]');
            if (cancelBtn) cancelBtn.onclick = function () { closeEditOverlay(container); };
            var saveBtn = editOverlay.querySelector('[data-mine-edit="save"]');
            if (saveBtn) saveBtn.onclick = function () { saveEditOverlay(container); };

            var editInput = container.querySelector('#mine-edit-input');
            if (editInput) {
                editInput.onkeydown = function (e) {
                    if (!e) return;
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        closeEditOverlay(container);
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        saveEditOverlay(container);
                    }
                };
            }
            var editTextarea = container.querySelector('#mine-edit-textarea');
            if (editTextarea) {
                editTextarea.onkeydown = function (e) {
                    if (!e) return;
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        closeEditOverlay(container);
                    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        saveEditOverlay(container);
                    }
                };
            }
        }

        var panelBack = container.querySelector('[data-fav-action="back"]');
        if (panelBack) {
            panelBack.onclick = function () {
                toggleFavoritesPanel(container, false);
            };
        }
        var items = container.querySelectorAll('.mine-list-item');
        items.forEach(function (item) {
            item.addEventListener('click', function () {
                var type = item.getAttribute('data-mine-item');
                if (type === 'wallet') {
                    if (window.Wallet && typeof window.Wallet.open === 'function') {
                        window.Wallet.open();
                    }
                } else if (type === 'favorites') {
                    toggleFavoritesPanel(container, true);
                    renderFavorites(container);
                } else if (type === 'sports') {
                    if (window.SportsLeaderboard && typeof window.SportsLeaderboard.show === 'function') {
                        window.SportsLeaderboard.show();
                    }
                }
            });
        });
    }

    function render() {
        var container = document.getElementById('mine-view');
        if (!container) return;
        container.innerHTML = buildHtml();
        bindEvents(container);
        if (window.MineProfile && typeof window.MineProfile.applyToView === 'function') {
            window.MineProfile.applyToView();
        }
        initialized = true;
    }

    function show() {
        var container = document.getElementById('mine-view');
        if (!container) return;
        if (!initialized || !container.querySelector || !container.querySelector('.mine-root')) {
            render();
        } else if (window.MineProfile && typeof window.MineProfile.applyToView === 'function') {
            window.MineProfile.applyToView();
        }
    }

    function refreshProfile() {
        if (window.MineProfile && typeof window.MineProfile.applyToView === 'function') {
            window.MineProfile.applyToView();
        }
    }

    return {
        show: show,
        render: render,
        refreshProfile: refreshProfile
    };
})();

window.MineCore = MineCore;
