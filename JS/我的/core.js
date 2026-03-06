var MineCore = (function () {
    var initialized = false;

    function buildHtml() {
        var html = '';
        html += '<div class="mine-root">';
        html += '  <div class="mine-header" id="mine-header">';
        html += '    <div class="mine-header-avatar">';
        html += '      <img data-mine-role="avatar" src="" alt="">';
        html += '    </div>';
        html += '    <div class="mine-header-info">';
        html += '      <div class="mine-header-name" data-mine-role="name"></div>';
        html += '      <div class="mine-header-signature" data-mine-role="signature"></div>';
        html += '    </div>';
        html += '  </div>';
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

    function bindEvents(container) {
        var header = container.querySelector('#mine-header');
        if (header && window.MineProfile && typeof window.MineProfile.handleHeaderClick === 'function') {
            header.onclick = function () {
                window.MineProfile.handleHeaderClick();
            };
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
