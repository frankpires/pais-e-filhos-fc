const CACHE = 'paisfilhos-20260913013000';
const ASSETS = ['/'];

self.addEventListener('install', e => {
  // Não pula a espera sozinho — fica em "waiting" até a página mandar
  // SKIP_WAITING (usuário tocou em "Atualizar" no aviso de nova versão).
  // Assim quem está com o app aberto nunca é trocado de versão sem avisar.
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if(e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  // Rede primeiro para o Firebase (dados em tempo real), cache para o resto
  if(e.request.url.includes('firebaseio.com') || e.request.url.includes('googleapis.com')){
    return; // deixa o Firebase passar direto
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
