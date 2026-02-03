import { useEffect, useState } from 'react';

export function useServiceWorker() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setError('Service Worker no soportado');
      return;
    }

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setRegistration(reg);
        setIsRegistered(true);

        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('[SW] Service Worker registrado y activo');

        // Check for updates periodically
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] Nueva versión disponible');
              }
            });
          }
        });
      } catch (err) {
        console.error('[SW] Error al registrar:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      }
    };

    registerSW();
  }, []);

  return { isRegistered, registration, error };
}
