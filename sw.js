/*
 * Service Worker for Pro Tuner Ultimate
 *
 * 实现离线优先的缓存策略并带有版本控制。
 * 每次发布新版本时，更新 `CACHE_VERSION`。
 * 新的 service worker 安装后会自动清理旧版本的缓存，
 * 保证用户无需手动清理浏览器缓存即可获取最新内容。
 */

// 发布新版本时请修改此版本号
const CACHE_VERSION = 'v2';
const CACHE_PREFIX = 'tuner-cache-';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

// 需要预缓存的核心资源，便于离线加载
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png'
];

// 安装阶段：打开当前版本的缓存并预缓存必要资源，随后立即激活
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// 激活阶段：删除旧版本缓存，随后立即接管页面控制
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截请求：网络优先，失败时回退到缓存；并将成功的响应写入缓存
self.addEventListener('fetch', event => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // 克隆响应用于缓存，确保不会消费原响应体
        const responseClone = networkResponse.clone();
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone).catch(() => {
              // 某些响应可能是 opaque 的，缓存时会报错，忽略即可
            });
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 网络请求失败时尝试从缓存读取，如无缓存则回退到根页面
        return caches.match(event.request).then(cachedResponse => {
          return cachedResponse || caches.match('/index.html');
        });
      })
  );
});