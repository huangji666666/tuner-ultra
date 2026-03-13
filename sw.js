/*
 * Service Worker for Pro Tuner Ultimate
 *
 * 该 Service Worker 实现了离线优先的缓存策略，并配合版本号进行缓存管理。
 * 在安装阶段预缓存应用壳的核心资源，同时通过 skipWaiting() 立即跳过等待阶段。
 * 在激活阶段删除旧版本缓存，并通过 clients.claim() 立刻接管所有页面。
 * 每次发布新版本时，修改 CACHE_VERSION 即可强制创建新的缓存并删除旧缓存。
 */

// 发布新版本时请递增此版本号
const CACHE_VERSION = 'v1';
const CACHE_PREFIX = 'tuner-cache-';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

// 应用壳需要预缓存的资源，方便离线加载
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png'
];

// 安装事件：预缓存资源并调用 skipWaiting 立即激活新 Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// 激活事件：删除旧版本缓存并立刻接管现有页面
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(name => {
          if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch 事件：采用网络优先策略，成功获取时更新缓存；离线时回退到缓存
self.addEventListener('fetch', event => {
  // 只处理 GET 请求，其他类型的请求直接放行
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // 克隆响应体用于缓存更新，确保不会消费原始响应体
        const responseClone = networkResponse.clone();
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone).catch(() => {
              // 某些响应（如跨域 opaque）缓存时会报错，可忽略
            });
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 网络请求失败时尝试从缓存读取；若缓存不存在则返回离线入口页
        return caches.match(event.request).then(cachedResponse => {
          return cachedResponse || caches.match('/index.html');
        });
      })
  );
});