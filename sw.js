// GIJO Smart MD Studio 웹판 서비스 워커.
// 한 번 열면 인터넷 없이도 다시 열리게 앱 파일을 기기에 담아 둔다.
// 문서 내용은 여기서 다루지 않는다(문서는 브라우저 저장소에만 있다). 바깥 주소로는 아무것도 보내지 않는다.
// 파일을 바꿔 배포할 때 VERSION 을 올리면 예전 캐시가 정리된다.
const VERSION = 'v1';
const CACHE = 'mdstudio-web-' + VERSION;
const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "assets/logo.png",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  "css/print.css",
  "css/style.css",
  "js/annotate.js",
  "js/app.js",
  "js/export.js",
  "js/storage.js",
  "js/templates.js",
  "vendor/dompurify/purify.min.js",
  "vendor/fontawesome/css/fontawesome.min.css",
  "vendor/fontawesome/css/regular.min.css",
  "vendor/fontawesome/css/solid.min.css",
  "vendor/fontawesome/webfonts/fa-regular-400.woff2",
  "vendor/fontawesome/webfonts/fa-solid-900.woff2",
  "vendor/html-to-docx/html-to-docx.browser.js",
  "vendor/html-to-docx/polyfills.js",
  "vendor/marked/marked.js",
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(ASSETS.map((path) => cache.add(new Request(path, { cache: 'reload' })).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mdstudio-web-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 같은 출처의 GET 만 다룬다. 온라인이면 새 파일을 받아 캐시를 갈고, 안 되면 캐시로 연다.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html')))
  );
});
