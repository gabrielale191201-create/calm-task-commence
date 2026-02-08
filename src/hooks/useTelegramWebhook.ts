import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';

const N8N_WEBHOOK_URL = 'https://focuson.app.n8n.cloud/webhook/telegram-webhook';

interface TelegramWebhookPayload {
  task: string;
  task_id: string;
  event_id: string; // UUID para deduplicación/idempotencia
  date: string;
  time: string;
  notify_at: string; // ISO 8601 con timezone: YYYY-MM-DDTHH:mm:00-05:00
  timezone: string;
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
   * @param taskId - ID único de la tarea
   * @param taskText - Nombre de la tarea
   * @param scheduledDate - Fecha en formato YYYY-MM-DD
   * @param scheduledTime - Hora en formato HH:mm
   * @returns { sent: boolean, reason?: string } - Indica si se envió o no y por qué
   */
  const triggerWebhook = useCallback(
    async (
      taskId: string,
      taskText: string,
      scheduledDate?: string,
      scheduledTime?: string
    ): Promise<{ sent: boolean; reason?: 'missing_datetime' | 'no_telegram' }> => {
      // Solo disparar si tiene fecha Y hora
      if (!scheduledDate || !scheduledTime) {
        console.log('[TelegramWebhook] Skipping - missing date or time');
        return { sent: false, reason: 'missing_datetime' };
      }

      // Solo disparar si tenemos chat_id
      if (!chatId) {
        console.log('[TelegramWebhook] Skipping - no chat_id');
        return { sent: false, reason: 'no_telegram' };
      }

      // Generar event_id único para deduplicación/idempotencia
      const eventId = crypto.randomUUID();

      // Construir notify_at en ISO 8601 con timezone Peru (-05:00)
      const TIMEZONE = 'America/Lima';
      const TIMEZONE_OFFSET = '-05:00';
      const notifyAt = `${scheduledDate}T${scheduledTime}:00${TIMEZONE_OFFSET}`;

      const payload: TelegramWebhookPayload = {
        task: taskText,
        task_id: taskId,
        event_id: eventId,
        date: scheduledDate,
        time: scheduledTime,
        notify_at: notifyAt,
        timezone: TIMEZONE,
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
          return { sent: true };
        } else {
          console.error('[TelegramWebhook] Error:', response.status, await response.text());
          return { sent: false };
        }
      } catch (error) {
        console.error('[TelegramWebhook] Network error:', error);
        return { sent: false };
      }
    },
    [chatId]
  );

  return {
    triggerWebhook,
    hasTelegramConnected: !!chatId,
  };
}
