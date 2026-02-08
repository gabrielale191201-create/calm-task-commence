import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';

const N8N_WEBHOOK_URL = 'https://focuson.app.n8n.cloud/webhook/telegram-webhook';

interface TelegramWebhookPayload {
  task: string;
  date: string;
  time: string;
  chat_id: string;
}

/**
 * Hook para disparar el webhook de n8n cuando una tarea tiene fecha + hora.
 * Obtiene el chat_id del usuario desde user_telegram.
 */
export function useTelegramWebhook() {
  const { user } = useAuthState();
  const [chatId, setChatId] = useState<string | null>(null);

  // Fetch chat_id on mount and when user changes
  useEffect(() => {
    if (!user?.id) {
      setChatId(null);
      return;
    }

    const fetchChatId = async () => {
      const { data, error } = await supabase
        .from('user_telegram')
        .select('telegram_chat_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data?.telegram_chat_id) {
        setChatId(data.telegram_chat_id);
      } else {
        setChatId(null);
      }
    };

    fetchChatId();
  }, [user?.id]);

  /**
   * Dispara el webhook a n8n si la tarea tiene fecha + hora y el usuario tiene chat_id.
   * @param taskText - Nombre de la tarea
   * @param scheduledDate - Fecha en formato YYYY-MM-DD
   * @param scheduledTime - Hora en formato HH:mm
   */
  const triggerWebhook = useCallback(
    async (taskText: string, scheduledDate?: string, scheduledTime?: string) => {
      // Solo disparar si tiene fecha Y hora
      if (!scheduledDate || !scheduledTime) {
        console.log('[TelegramWebhook] Skipping - missing date or time');
        return;
      }

      // Solo disparar si tenemos chat_id
      if (!chatId) {
        console.log('[TelegramWebhook] Skipping - no chat_id');
        return;
      }

      const payload: TelegramWebhookPayload = {
        task: taskText,
        date: scheduledDate,
        time: scheduledTime,
        chat_id: chatId,
      };

      console.log('[TelegramWebhook] Sending:', payload);

      try {
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          console.log('[TelegramWebhook] Success - reminder scheduled');
        } else {
          console.error('[TelegramWebhook] Error:', response.status, await response.text());
        }
      } catch (error) {
        console.error('[TelegramWebhook] Network error:', error);
      }
    },
    [chatId]
  );

  return {
    triggerWebhook,
    hasTelegramConnected: !!chatId,
  };
}
