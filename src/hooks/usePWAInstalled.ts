import { useState, useEffect } from 'react';

/**
 * Detects if the app is running as an installed PWA (standalone, fullscreen, or minimal-ui)
 * Works on Android Chrome, iOS Safari, and other PWA-capable browsers.
 */
export function usePWAInstalled(): boolean {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      // Check display-mode media queries (Chrome, Edge, Firefox, etc.)
      const standaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
      const fullscreenMatch = window.matchMedia('(display-mode: fullscreen)').matches;
      const minimalUIMatch = window.matchMedia('(display-mode: minimal-ui)').matches;
      
      // iOS Safari standalone mode
      const iosStandalone = (navigator as any).standalone === true;
      
      // Android TWA (Trusted Web Activity) detection
      const isTWA = document.referrer.includes('android-app://');
      
      const installed = standaloneMatch || fullscreenMatch || minimalUIMatch || iosStandalone || isTWA;
      
      console.log('[PWA] Detection:', {
        standalone: standaloneMatch,
        fullscreen: fullscreenMatch,
        minimalUI: minimalUIMatch,
        iosStandalone,
        isTWA,
        result: installed
      });
      
      setIsInstalled(installed);
    };

    checkInstalled();

    // Listen for changes (e.g., if user installs while using)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handler = () => checkInstalled();
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  return isInstalled;
}
