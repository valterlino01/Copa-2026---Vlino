const CACHE = 'copa2026-v2';

// Assume o controle imediatamente (sem esperar abas fecharem)
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Apaga TODOS os caches antigos (inclusive copa2026-v1)
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    // Assume o controle de todas as abas abertas
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  // Rede sempre, ignorando cache HTTP; fallback offline básico
  e.respondWith(
    fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request))
  );
});
