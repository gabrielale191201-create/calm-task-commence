import { createRoot } from "react-dom/client";
import OneSignal from 'react-onesignal';
import App from "./App.tsx";
import "./index.css";

(OneSignal as any).init({
  appId: '52a6f5c7-05ef-4284-b0fd-93cad0533ebf',
  allowLocalhostAsSecureOrigin: true,
  notifyButton: { enable: false },
  serviceWorkerParam: { scope: '/' },
}).catch(() => {});

// Register Service Worker for PWA (skip in iframes and preview hosts)
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) =>
    regs.forEach((r) => r.unregister())
  );
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[PWA] Service Worker registrado:', registration.scope);
    } catch (error) {
      console.error('[PWA] Error al registrar Service Worker:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
