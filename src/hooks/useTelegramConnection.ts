import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';

interface TelegramState {
  isConnected: boolean;
  optIn: boolean;
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
}

export function useTelegramConnection() {
  const { isAuthenticated } = useAuthState();
  const [state, setState] = useState<TelegramState>({
    isConnected: false,
    optIn: false,
    isLoading: true,
    isPolling: false,
    error: null
  });
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingCountRef = useRef(0);

  // Verificar estado inicial
  const checkConnection = useCallback(async () => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('telegram-link', {
        body: null,
        headers: { 'Content-Type': 'application/json' }
      });

      // Usar query param para action=check
      const response = await supabase.functions.invoke('telegram-link?action=check');
      
      if (response.error) {
        console.error('[Telegram] Check error:', response.error);
        setState(prev => ({ ...prev, isLoading: false, error: 'Error verificando conexión' }));
        return false;
      }

      const connected = response.data?.connected ?? false;
      const optIn = response.data?.optIn ?? false;
      
      setState(prev => ({ 
        ...prev, 
        isConnected: connected, 
        optIn,
        isLoading: false,
        error: null 
      }));
      
      return connected;
    } catch (err) {
      console.error('[Telegram] Check error:', err);
      setState(prev => ({ ...prev, isLoading: false, error: 'Error de conexión' }));
      return false;
    }
  }, [isAuthenticated]);

  // Generar deep link
  const generateDeepLink = useCallback(async (): Promise<string | null> => {
    if (!isAuthenticated) return null;

    try {
      const response = await supabase.functions.invoke('telegram-link?action=generate');
      
      if (response.error || !response.data?.deepLink) {
        console.error('[Telegram] Generate error:', response.error);
        setState(prev => ({ ...prev, error: 'Error generando enlace' }));
        return null;
      }

      return response.data.deepLink;
    } catch (err) {
      console.error('[Telegram] Generate error:', err);
      setState(prev => ({ ...prev, error: 'Error generando enlace' }));
      return null;
    }
  }, [isAuthenticated]);

  // Polling para detectar conexión automática
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    
    console.log('[Telegram] Starting polling...');
    pollingCountRef.current = 0;
    setState(prev => ({ ...prev, isPolling: true }));

    pollingRef.current = setInterval(async () => {
      pollingCountRef.current++;
      console.log(`[Telegram] Polling attempt ${pollingCountRef.current}/5`);
      
      const connected = await checkConnection();
      
      if (connected || pollingCountRef.current >= 5) {
        stopPolling();
        if (connected) {
          console.log('[Telegram] Connection detected!');
        } else {
          console.log('[Telegram] Polling timeout, no connection detected');
        }
      }
    }, 2000);
  }, [checkConnection]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    pollingCountRef.current = 0;
    setState(prev => ({ ...prev, isPolling: false }));
  }, []);

  // Activar/desactivar opt-in
  const setOptIn = useCallback(async (optIn: boolean) => {
    if (!isAuthenticated) return false;

    try {
      const response = await supabase.functions.invoke('telegram-link?action=opt-in', {
        body: { optIn }
      });

      if (response.error) {
        console.error('[Telegram] OptIn error:', response.error);
        return false;
      }

      setState(prev => ({ ...prev, optIn }));
      return true;
    } catch (err) {
      console.error('[Telegram] OptIn error:', err);
      return false;
    }
  }, [isAuthenticated]);

  // Check inicial
  useEffect(() => {
    if (isAuthenticated) {
      checkConnection();
    }
  }, [isAuthenticated, checkConnection]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    ...state,
    checkConnection,
    generateDeepLink,
    startPolling,
    stopPolling,
    setOptIn
  };
}
