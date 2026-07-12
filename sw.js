// 게임을 수정해서 올릴 때마다 아래 버전 숫자를 올려줘! (v1 → v2 → v3 ...)
const CACHE = "rpg-v9";
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// 설치: 게임 파일을 폰에 저장
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

// 새 버전이 생기면 옛날 저장본 삭제
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 저장된 파일이 있으면 그걸 쓰고, 없으면 인터넷에서 받기
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
