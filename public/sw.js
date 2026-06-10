// Limpieza del antiguo caché de la app.
// Mantener este archivo por un ciclo de publicación para que los teléfonos
// que tenían una versión vieja de Focus On dejen de servir HTML/JS obsoleto.
function isOldFocusOnCache(name) {
  const isFocusOnManualCache = name.startsWith('focuson-cache');
  const isWorkboxCache = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
  return isFocusOnManualCache || isWorkboxCache;
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.allSettled(
          cacheNames.filter(isOldFocusOnCache).map((name) => caches.delete(name))
        );
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: 'window' });
        await Promise.allSettled(clients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })()
  );
});
