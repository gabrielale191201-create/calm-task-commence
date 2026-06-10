import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovableproject-dev.com") ||
  window.location.hostname.includes("beta.lovable.dev");

const cleanupOldAppShellWorker = async () => {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs.map((registration) => {
        const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || '';
        const isOldAppShell = scriptURL.endsWith('/sw.js');
        const isNotificationWorker = scriptURL.includes('OneSignalSDKWorker');
        if (isOldAppShell && !isNotificationWorker) return registration.unregister();
        return Promise.resolve(false);
      })
    );

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.allSettled(
        cacheNames
          .filter((name) =>
            name.startsWith('focuson-cache') ||
            /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name)
          )
          .map((name) => caches.delete(name))
      );
    }
  } catch (error) {
    console.warn('[PWA] Limpieza de caché pendiente:', error);
  }
};

if ('serviceWorker' in navigator) {
  if (isPreviewHost || isInIframe) {
    cleanupOldAppShellWorker();
  } else {
    window.addEventListener('load', cleanupOldAppShellWorker);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[PWA] Service Worker registrado:', registration.scope);
    } catch (error) {
      console.error('[PWA] Error al registrar Service Worker:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
