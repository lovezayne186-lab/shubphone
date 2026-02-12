// sw.js - 开发友好版：网络优先 (Network First)
// 修改后：每次刷新都会尝试获取最新代码，没网时才用缓存
const CACHE_NAME = 'shubao-phone-dev-v1'; 
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './CSS/global.css',
  './CSS/pages.css',
  './CSS/widgets.css',
  './CSS/chat-page.css',
  './CSS/weixin.css', // 确保你的CSS文件夹里有这个，没有就删掉这行
  './JS/system.js',
  './JS/apps.js',
  './JS/chat.js',
  './JS/api.js',
  './JS/widgets.js',
  './JS/slider.js',
  './JS/appearance.js',
  './JS/settings.js',
  './assets/icons/icon-512.png',
  './assets/icons/splash-screen.png',
  'https://cdn.bootcdn.net/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.bootcdn.net/ajax/libs/localforage/1.10.0/localforage.min.js'
];

// 1. 安装：还是把核心文件存一下
self.addEventListener('install', (e) => {
  console.log('SW: 正在安装...');
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// 2. 激活：清理旧缓存
self.addEventListener('activate', (e) => {
  console.log('SW: 已激活');
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 拦截请求：🔥 核心修改：网络优先策略 🔥
self.addEventListener('fetch', (e) => {
  e.respondWith(
    // 第一步：先尝试去网络请求最新的
    fetch(e.request)
      .then(response => {
        // 如果网络请求成功：
        // 1. 克隆一份响应（因为流只能用一次）
        const responseToCache = response.clone();
        
        // 2. 把最新的代码存进缓存，覆盖旧的！
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(e.request, responseToCache);
          });
          
        // 3. 返回最新的给页面
        return response;
      })
      .catch(() => {
        // 第二步：如果没网（fetch失败），才去缓存里找
        console.log('网络断开，切换到离线缓存:', e.request.url);
        return caches.match(e.request);
      })
  );
});
