import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('[PWA] Service Worker registrado:', registration.scope);
    } catch (error) {
      console.error('[PWA] Error al registrar Service Worker:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
