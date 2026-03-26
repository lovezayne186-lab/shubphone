/* =========================================================
   文件路径：JS脚本文件夹/widgets.js
   作用：管理组件逻辑（相册组件、音乐播放器），含大容量存储支持
   ========================================================= */

/* --- 1. 通用图片上传逻辑 --- */
window.activeImgId = '';
window.activeHintId = '';

// HTML中组件点击时调用此函数
function triggerUpload(imgId, hintId) {
    // 1. 标记当前正在编辑组件
    window.activeImgId = imgId;
    window.activeHintId = hintId;
    
    // 【新增这一行！】 强制清空 App 选中状态，防止冲突
    window.currentEditingAppIndex = -1;

    // 2. 打开文件选择框
    const uploader = document.getElementById('global-uploader');
    if(uploader) {
        uploader.value = ''; 
        uploader.click();
    }
}


// ✨✨✨ 新增：初始化组件状态 (恢复图片) ✨✨✨
async function initWidgetState() {
    // 获取页面上所有的图片标签
    const allImages = document.querySelectorAll('img');

    allImages.forEach(async (img) => {
        // 只处理有 ID 的图片（因为我们需要 ID 作为存取的钥匙）
        if (img.id) {
            // 尝试从数据库读取这个 ID 对应的图片
            const savedImg = await localforage.getItem('widget_img_' + img.id);
            
            if (savedImg) {
                // 1. 恢复图片
                img.src = savedImg;
                img.style.display = 'block';
                
                // 2. 尝试隐藏提示文字
                // 假设提示文字是 img 的兄弟元素
                if (img.nextElementSibling && img.nextElementSibling.classList.contains('upload-hint')) {
                    img.nextElementSibling.style.display = 'none';
                }
            }
        }
    });
    
    console.log("小组件图片已恢复");
}

/* --- 2. 音乐播放器逻辑 (保持不变) --- */
const audio = document.getElementById('audio-player');
const playIcon = document.getElementById('play-icon');
let isPlaying = false;

function togglePlay() {
    if (!audio || !playIcon) return;

    if (!audio.src || audio.src === window.location.href) {
        alert("请先点击标题加载音乐文件！");
        return;
    }
    
    if (isPlaying) {
        audio.pause();
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
    } else {
        audio.play();
        playIcon.classList.remove('fa-play');
        playIcon.classList.add('fa-pause');
    }
    isPlaying = !isPlaying;
}

// 对应 HTML 中的 type="file" onchange="loadSong(this)"
function loadSong(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const url = URL.createObjectURL(file);
        
        if (audio) {
            audio.src = url;
            audio.play();
            isPlaying = true;
            
            if (playIcon) {
                playIcon.classList.remove('fa-play');
                playIcon.classList.add('fa-pause');
            }
            
            // 可选：把歌名显示在界面上
            const titleEl = document.querySelector('.music-title');
            if(titleEl) titleEl.innerText = file.name.replace(/\.[^/.]+$/, ""); // 去掉后缀名
        }
    }
}

// 挂载全局
window.triggerUpload = triggerUpload;
window.initWidgetState = initWidgetState; // 暴露给主程序调用
window.togglePlay = togglePlay;
window.loadSong = loadSong;


/* --- 自动加载组件并在有图时隐藏文字 (修复版) --- */
document.addEventListener('DOMContentLoaded', () => {
    // 这里列出了可能用到的组件 ID (第一页和第二页的所有组件)
    // 多写几个没关系，系统找不到的会自动忽略，不会报错
    const widgetConfig = [
        { imgId: 'img-widget', hintId: 'hint-widget' },        // 第一页大组件
        { imgId: 'music-cover-img', hintId: 'music-hint' },    // 第二页音乐封面
        { imgId: 'id-card-img', hintId: 'id-hint' },           // 第二页左侧图片组件
        { imgId: 'polaroid-img', hintId: 'polaroid-hint' },    // 第二页拍立得
        { imgId: 'w5-img', hintId: 'w5-hint' },
        { imgId: 'w6-img', hintId: 'w6-hint' }
    ];

    widgetConfig.forEach(widget => {
        // 尝试从数据库获取图片
        if(typeof localforage !== 'undefined') {
            localforage.getItem('widget_img_' + widget.imgId).then(function(imgSrc) {
                if (imgSrc) {
                    const imgEl = document.getElementById(widget.imgId);
                    const hintEl = document.getElementById(widget.hintId);

                    // 1. 恢复图片
                    if (imgEl) {
                        imgEl.src = imgSrc;
                        imgEl.style.display = 'block';
                    }

                    // 2. ★★★ 关键修复：如果有图，必须强制隐藏文字 ★★★
                    if (hintEl) {
                        hintEl.style.display = 'none'; 
                    }
                }
            });
        }
    });
});
