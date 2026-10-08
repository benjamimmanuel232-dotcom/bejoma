/* Bejoma Gestão - funciona sem internet. Mude a versão para forçar actualização. */
const V='bejoma-v4',SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(r.mode==='navigate'){ /* página: tenta a rede (para actualizar), senão usa a cópia guardada */
    e.respondWith(fetch(r).then(x=>{const k=x.clone();caches.open(V).then(c=>c.put('./index.html',k));return x}).catch(()=>caches.match('./index.html').then(x=>x||caches.match('./'))));return}
  if(u.origin===location.origin||u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){ /* ficheiros e fonte: cópia guardada primeiro */
    e.respondWith(caches.match(r).then(h=>h||fetch(r).then(x=>{if(x&&(x.ok||x.type==='opaque')){const k=x.clone();caches.open(V).then(c=>c.put(r,k))}return x}).catch(()=>h)))}
});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>l.length?l[0].focus():self.clients.openWindow('./index.html')))});
