/* =========================================================
   文件路径：JS/worldbook.js
   作用：世界书系统 (存储设定集，供角色关联)
   ========================================================= */

// --- 全局变量 ---
window.worldBooks = window.worldBooks || {}; // 存储格式: { id: { title: "", content: "" } }

// 1. 初始化读取数据
function loadWorldBooks() {
    try {
        const saved = localStorage.getItem('wechat_worldbooks');
        if (saved) {
            window.worldBooks = JSON.parse(saved);
        }
    } catch (e) { console.error("读取世界书失败", e); }
}

// 2. 保存数据
function saveWorldBooks() {
    localStorage.setItem('wechat_worldbooks', JSON.stringify(window.worldBooks));
}

// 3. 打开世界书 APP (渲染列表)
window.openWorldBookApp = function() {
    // A. 切换到全屏 APP 视图
    const appWindow = document.getElementById('app-window');
    const contentArea = document.getElementById('app-content-area');
    const title = document.getElementById('app-title-text');
    const plusBtn = document.getElementById('top-plus-btn');

    if (!appWindow || !contentArea || !title) {
        console.error('找不到必要的DOM元素');
        return;
    }

    // 【核心修复】清除容器样式，确保干净的环境
    contentArea.setAttribute('style', ''); 
    
    // 显示应用窗口（使用正确的类名）
    appWindow.classList.add('active');
    
    // B. 设置标题和按钮
    title.innerText = "世界书 (设定集)";
    if (plusBtn) {
        plusBtn.style.display = 'block';
        // 修改右上角+号的功能：变成新建世界书
        plusBtn.onclick = createNewBook;
    }

    // 【重要】恢复返回按钮的原始功能（关闭应用返回桌面）
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.onclick = function() {
            closeApp();
            document.getElementById('top-plus-btn').style.display = 'none';
        };
    }

    // C. 渲染列表
    renderBookList();
};

// 4. 渲染书籍列表（支持分类显示）
function renderBookList() {
    const contentArea = document.getElementById('app-content-area');
    contentArea.innerHTML = ""; // 清空

    const ids = Object.keys(window.worldBooks);

    if (ids.length === 0) {
        contentArea.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:60%; color:#999;">
                <div style="font-size:50px; margin-bottom:20px;">📖</div>
                <div>这里空空如也</div>
                <div style="font-size:12px; margin-top:5px;">点击右上角 + 号创建设定集</div>
            </div>
        `;
        return;
    }

    // 按分类组织书籍
    const categorized = {};
    ids.forEach(id => {
        const book = window.worldBooks[id];
        const category = book.category || '未分类';
        if (!categorized[category]) {
            categorized[category] = [];
        }
        categorized[category].push({ id, book });
    });

    // 列表容器
    const list = document.createElement('div');
    list.style.padding = "15px";
    list.style.paddingBottom = "30px";

    // 按分类渲染
    Object.keys(categorized).sort().forEach(category => {
        // 分类标题
        const categoryHeader = document.createElement('div');
        categoryHeader.style.cssText = `
            font-size: 13px;
            color: #666;
            font-weight: bold;
            margin: 20px 0 10px 5px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e5e5;
        `;
        categoryHeader.textContent = category;
        list.appendChild(categoryHeader);

        // 该分类下的书籍
        categorized[category].forEach(({ id, book }) => {
            const item = document.createElement('div');
            item.style.cssText = `
                background: #fff; padding: 15px; border-radius: 12px; margin-bottom: 10px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;
            `;
            
            item.innerHTML = `
                <div style="flex:1;">
                    <div style="font-weight:bold; font-size:16px; color:#333;">${book.title}</div>
                    <div style="font-size:12px; color:#888; margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px;">
                        ${book.content || "暂无内容..."}
                    </div>
                </div>
                <div style="color:#ccc;">›</div>
            `;

            // 点击编辑这本书
            item.onclick = () => editBook(id);
            
            list.appendChild(item);
        });
    });

    contentArea.appendChild(list);
}

// 5. 新建书籍（支持分类）
function createNewBook() {
    const title = prompt("请输入世界书/设定集名称：\n(例如：赛博朋克背景、修仙体系)");
    if (!title) return;

    const category = prompt("请输入分类（可选）：\n(例如：科幻、奇幻、现代等)\n留空则归入\"未分类\"");

    const newId = 'book_' + Date.now();
    window.worldBooks[newId] = {
        title: title,
        category: category ? category.trim() : '', // 如果输入了分类就保存，否则为空
        content: "" // 初始内容为空
    };
    saveWorldBooks();
    renderBookList(); // 刷新
}

// 6. 编辑书籍 (复用 prompt 简单实现，后期可以做弹窗)
function editBook(id) {
    const book = window.worldBooks[id];
    
    // 这里的交互比较简单，如果你想做复杂弹窗也可以，但 prompt 够用了
    // 第一步：改名？
    // const newTitle = prompt("修改标题 (留空则不改):", book.title);
    // if (newTitle) book.title = newTitle;

    // 核心：修改内容
    // 由于 prompt 写大段文字不方便，建议这里我们复用那个 #editor-modal 或者做一个专用的 textarea 页面
    // 为了简单起见，我们先用一个临时的全屏 textarea 页面
    
    openBookEditorUI(id);
}

// 7. 专用书籍编辑器 UI (临时生成的 DOM)
function openBookEditorUI(id) {
    const book = window.worldBooks[id];
    const appWindow = document.getElementById('app-window');
    
    // 临时覆盖 app-content-area
    const contentArea = document.getElementById('app-content-area');
    const categoryValue = book.category || '';
    const contentValue = book.content || '';
    
    contentArea.innerHTML = `
        <div style="display:flex; flex-direction:column; height:100%; padding:15px; background:#f2f2f7;">
            <input type="text" id="book-title-input" value="${book.title}" 
                style="padding:15px; border:none; border-radius:10px; margin-bottom:10px; font-weight:bold; font-size:18px;">
            
            <input type="text" id="book-category-input" value="${categoryValue}" 
                placeholder="分类（可选，如：科幻、奇幻等）"
                style="padding:12px 15px; border:none; border-radius:10px; margin-bottom:15px; font-size:14px; color:#666;">
            
            <textarea id="book-content-input" 
                style="flex:1; border:none; border-radius:10px; padding:15px; resize:none; font-size:15px; line-height:1.6;"
                placeholder="在此输入世界观、设定、魔法体系、历史背景等...\n\n当角色关联此书时，AI会自动读取这些设定。">${contentValue}</textarea>
            
            <div style="display:flex; gap:10px; margin-top:15px; padding-bottom:20px;">
                <button onclick="deleteBook('${id}')" style="flex:1; background:#ff3b30; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">删除</button>
                <button onclick="saveBookAndClose('${id}')" style="flex:1; background:#07c160; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">保存</button>
            </div>
        </div>
    `;
    
    // 修改返回按钮的行为：返回到世界书列表而不是关闭应用
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.openWorldBookApp(); // 返回世界书列表
        };
    }
    
    // 隐藏右上角加号
    const plusBtn = document.getElementById('top-plus-btn');
    if (plusBtn) {
        plusBtn.style.display = 'none';
    }
}

// 8. 保存并返回
window.saveBookAndClose = function(id) {
    const titleInput = document.getElementById('book-title-input');
    const categoryInput = document.getElementById('book-category-input');
    const contentInput = document.getElementById('book-content-input');
    
    if(window.worldBooks[id]) {
        window.worldBooks[id].title = titleInput.value;
        window.worldBooks[id].category = categoryInput ? categoryInput.value.trim() : '';
        window.worldBooks[id].content = contentInput.value;
        saveWorldBooks();
        alert("已保存");
        // 返回列表
        window.openWorldBookApp();
    }
};

// 9. 删除书籍
window.deleteBook = function(id) {
    if(confirm("确定删除这本设定集吗？关联的角色将失去此设定。")) {
        delete window.worldBooks[id];
        saveWorldBooks();
        window.openWorldBookApp(); // 返回列表
    }
};

// =========================================================
// 10. 【升级版】获取下拉菜单用的选项 HTML (支持选整类)
// =========================================================
window.getWorldBookOptionsHTML = function(selectedId) {
    const ids = Object.keys(window.worldBooks);
    if (ids.length === 0) return '<option value="">暂无世界书 (请去世界书APP创建)</option>';
    
    // 1. 先按分类整理数据
    const catMap = {};
    
    ids.forEach(id => {
        const book = window.worldBooks[id];
        const cat = book.category ? book.category.trim() : '未分类';
        if (!catMap[cat]) catMap[cat] = [];
        catMap[cat].push({ id, title: book.title });
    });

    let html = '<option value="">-- 不关联 (默认) --</option>';

    // 2. 遍历分类生成选项
    Object.keys(catMap).sort().forEach(cat => {
        const books = catMap[cat];
        
        // A. 生成“整个分类”的选项 (特殊前缀 CATEGORY:)
        const catValue = `CATEGORY:${cat}`;
        const isCatSelected = (selectedId === catValue) ? 'selected' : '';
        
        html += `<option value="${catValue}" style="font-weight:bold; color:#000;" ${isCatSelected}>
            📚 [设定集] ${cat} (共${books.length}条)
        </option>`;

        // B. 生成“单本书”的选项
        books.forEach(b => {
            const isBookSelected = (selectedId === b.id) ? 'selected' : '';
            html += `<option value="${b.id}" style="color:#666;" ${isBookSelected}>
                &nbsp;&nbsp;&nbsp;&nbsp;📄 ${b.title}
            </option>`;
        });
    });

    return html;
};

// 立即运行加载
loadWorldBooks();
