/* Service worker – Bejoma Gestão / Bejoma Pessoal
   Sempre que publicar uma versão nova do index.html, mude o número em VERSAO.
   Usa o MESMO ficheiro nas duas apps: o nome da cache depende do endereço de cada app,
   por isso uma não apaga nem mistura a cache da outra. */
const VERSAO = 'v2';
const ESCOPO = new URL(self.registration.scope).pathname.replace(/[^\w]+/g, '-'); // ex.: -minha-rotina-
const PREFIXO = 'bejoma' + ESCOPO;
const CACHE = PREFIXO + VERSAO;
const FICHEIROS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const ESPERA_REDE = 4000;   // ms. Com internet muito lenta, abre logo a cópia guardada
const MAX_ENTRADAS = 40;    // limite de ficheiros guardados (os 4 de cima nunca são apagados)

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      /* 'reload' = vai buscar sempre uma cópia nova à internet, nunca a da cache do navegador */
      .then(c => Promise.all(FICHEIROS.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIXO) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function guardar(r, res) {
  if (!res || !res.ok || res.status === 206) return;
  const cp = res.clone();
  caches.open(CACHE).then(c => c.put(r, cp)).then(limitar).catch(() => {});
}

async function limitar() {
  const c = await caches.open(CACHE), ks = await c.keys();
  if (ks.length <= MAX_ENTRADAS) return;
  const nucleo = new Set(FICHEIROS.map(f => new URL(f, self.registration.scope).pathname));
  const velhos = ks.filter(k => !nucleo.has(new URL(k.url).pathname));
  await Promise.all(velhos.slice(0, ks.length - MAX_ENTRADAS).map(k => c.delete(k)));
}

async function daCopia(r) {
  const c = await caches.open(CACHE);
  const m = await c.match(r, { ignoreSearch: r.mode === 'navigate' });
  return m || (r.mode === 'navigate' ? c.match('index.html') : undefined);
}

/* Rede primeiro (apanha sempre a versão mais recente, sem usar a cache do navegador).
   Sem internet, ou se a internet demorar mais de ESPERA_REDE, usa a cópia guardada
   e deixa a rede acabar em segundo plano para a próxima vez já ser a versão nova. */
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith('http')) return;
  if (new URL(r.url).origin !== location.origin) return;
  const rede = fetch(r, { cache: 'no-cache' }).then(res => { guardar(r, res); return res; });
  e.waitUntil(rede.catch(() => {}));
  e.respondWith((async () => {
    try {
      const espera = new Promise(ok => setTimeout(() => ok(null), ESPERA_REDE));
      const res = await Promise.race([rede, espera]);
      if (res) return res;
    } catch (err) { /* sem internet: usa a cópia */ }
    const cp = await daCopia(r);
    if (cp) return cp;
    return rede;   // não há cópia: espera pela rede (ou falha como antes)
  })());
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
