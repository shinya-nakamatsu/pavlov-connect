/* PAVLOV Connect — Service Worker（プッシュ通知の受信と、通知タップで該当画面を開く） */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

const FUJI = self.registration.scope.indexOf('fuji') >= 0;
const ICON = FUJI ? 'icon-fuji-192.png' : 'icon-192.png';

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  const title = d.title || (FUJI ? 'FujiGakuin Connect' : 'PAVLOV Connect');
  const url = d.url || 'index.html';
  e.waitUntil((async () => {
    // アイコンのバッジ（未読件数）。LINE と同じように件数を表示
    try { if (typeof d.unread === 'number' && 'setAppBadge' in navigator) { if (d.unread > 0) await navigator.setAppBadge(d.unread); else await navigator.clearAppBadge(); } } catch (_) {}
    // アプリを前面で開いているときは、画面内で分かるので通知は出さない
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (cs.some(c => c.visibilityState === 'visible' && c.focused)) {
      cs.forEach(c => c.postMessage({ type: 'push', data: d }));
      return;
    }
    await self.registration.showNotification(title, {
      body: d.body || '',
      icon: ICON, badge: ICON,
      tag: d.tag || 'pavlov-connect', renotify: true,
      data: { url },
    });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL(e.notification.data && e.notification.data.url || 'index.html', self.registration.scope).href;
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const c = cs.find(x => x.url.indexOf(self.registration.scope) === 0);
    if (c) { try { await c.navigate(target); } catch (_) {} return c.focus(); }
    return self.clients.openWindow(target);
  })());
});

// 購読が更新されたら、次にアプリを開いたときに登録し直す（index.html 側で getSubscription を見る）
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.forEach(c => c.postMessage({ type: 'resubscribe' }))));
});
