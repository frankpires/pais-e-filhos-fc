const CACHE = 'paisfilhos-20260913160000';
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
  // Rede primeiro para o Firebase (dados em tempo real) — deixa passar direto
  if(e.request.url.includes('firebaseio.com') || e.request.url.includes('googleapis.com')){
    return;
  }
  // Rede primeiro pro resto também, com o cache só como plano B pra quando
  // estiver offline. Antes era "cache primeiro": mesmo fechando e abrindo
  // o app de novo, uma página já em cache continuava sendo servida sem
  // nem tentar a rede — o app podia ficar preso numa versão velha
  // indefinidamente, sem relação nenhuma com o aviso de nova versão.
  e.respondWith(
    fetch(e.request).then(res => {
      if(res.ok){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
