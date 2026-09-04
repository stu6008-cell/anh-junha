// 예전 게임 PWA가 등록해둔 서비스워커를 대체해서 스스로 없어지는 서비스워커.
// 캐시를 모두 지우고 등록을 해제한 뒤, 열려있는 탭을 새로고침한다.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' });
    for (const client of windows) client.navigate(client.url);
  })());
});
