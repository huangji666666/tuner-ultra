const CACHE_NAME = 'tuner-v1';
// 这里列出所有需要缓存的文件
const assets = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// 安装时缓存文件
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// 离线时从缓存读取
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});
