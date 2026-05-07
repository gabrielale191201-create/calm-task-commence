import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

const TELEGRAM_BOT = 'focusonnowbot';
const VERIFICATION_ENDPOINT = 'https://focuson.app.n8n.cloud/webhook/telegram-status';

interface TelegramLocalState {
  isConnected: boolean;
  chatId: string | null;
  linkCode: string | null;
}

/**
 * Genera un código de vinculación único: FO-XXXXXXXX (8 caracteres A-Z0-9)
 */
function generateLinkCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return 'FO-' + Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

export function useTelegramLocalConnection() {
  const [isConnected, setIsConnected] = useLocalStorage<boolean>('telegram_connected', false);
  const [chatId, setChatId] = useLocalStorage<string | null>('telegram_chat_id', null);
  const [linkCode, setLinkCode] = useLocalStorage<string | null>('telegram_link_code', null);
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  /**
   * Inicia el proceso de vinculación:
   * 1. Genera código único
   * 2. Guarda en localStorage
   * 3. Devuelve la URL del deep link
   */
  const startLinking = useCallback((): string => {
    const code = generateLinkCode();
    setLinkCode(code);
    setIsConnected(false);
    setChatId(null);
    setVerificationError(null);
    
    const deepLink = `https://t.me/${TELEGRAM_BOT}?start=${code}`;
    console.log('[TelegramLocal] Generated link code:', code);
    console.log('[TelegramLocal] Deep link:', deepLink);
    
    return deepLink;
  }, [setLinkCode, setIsConnected, setChatId]);

  /**
   * Verifica si el usuario ya presionó Start en Telegram
   * Llama al endpoint de n8n para verificar el estado
   */
  const verifyConnection = useCallback(async (): Promise<boolean> => {
    if (!linkCode) {
      console.log('[TelegramLocal] No link code to verify');
      return false;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const url = `${VERIFICATION_ENDPOINT}?code=${encodeURIComponent(linkCode)}`;
      console.log('[TelegramLocal] Verifying connection:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[TelegramLocal] Verification failed:', response.status);
        setVerificationError('Error al verificar. Intenta de nuevo.');
        setIsVerifying(false);
        return false;
      }

      const data = await response.json();
      console.log('[TelegramLocal] Verification response:', data);

      if (data.connected === true && data.chat_id) {
        setIsConnected(true);
        setChatId(String(data.chat_id));
        setIsVerifying(false);
        console.log('[TelegramLocal] Connection verified! chat_id:', data.chat_id);
        return true;
      } else {
        setVerificationError('Aún no está conectado. Vuelve a Telegram y presiona Start.');
        setIsVerifying(false);
        return false;
      }
    } catch (error) {
      console.error('[TelegramLocal] Verification error:', error);
      setVerificationError('Error de conexión. Verifica tu internet.');
      setIsVerifying(false);
      return false;
    }
  }, [linkCode, setIsConnected, setChatId]);

  /**
   * Desconecta Telegram (limpia localStorage)
   */
  const disconnect = useCallback(() => {
    setIsConnected(false);
    setChatId(null);
    setLinkCode(null);
    setVerificationError(null);
    console.log('[TelegramLocal] Disconnected');
  }, [setIsConnected, setChatId, setLinkCode]);

  return {
    isConnected,
    chatId,
    linkCode,
    isVerifying,
    verificationError,
    startLinking,
    verifyConnection,
    disconnect,
  };
}
