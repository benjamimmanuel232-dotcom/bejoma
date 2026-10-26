/* Service worker – Bejoma Gestão / Bejoma Pessoal
   Sempre que publicar uma versão nova do index.html, mude o número em VERSAO. */
const VERSAO = 'v1';
const CACHE = 'bejoma-' + VERSAO;
const FICHEIROS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FICHEIROS.map(f => c.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('bejoma-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Rede primeiro (apanha sempre a versão mais recente); sem internet usa a cópia guardada. */
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith('http')) return;
  e.respondWith(
    fetch(r)
      .then(res => {
        if (res && res.ok && new URL(r.url).origin === location.origin) {
          const cp = res.clone();
          caches.open(CACHE).then(c => c.put(r, cp)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});

/* Ao tocar numa notificação, abre (ou volta a) a app. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
      for (const w of ws) if ('focus' in w) return w.focus();
      return self.clients.openWindow('./');
    })
  );
});
