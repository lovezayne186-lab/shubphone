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
        html += '</div>';
        return html;
    }

    function bindEvents(container) {
        var header = container.querySelector('#mine-header');
        if (header && window.MineProfile && typeof window.MineProfile.handleHeaderClick === 'function') {
            header.onclick = function () {
                window.MineProfile.handleHeaderClick();
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
