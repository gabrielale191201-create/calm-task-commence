import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

const N8N_WEBHOOK_URL = 'https://focuson.app.n8n.cloud/webhook/telegram-webhook';

/**
 * Hook para enviar webhook a n8n cuando una tarea tiene fecha + hora.
 * La PWA solo envía el webhook inmediatamente. n8n se encarga de esperar
 * con su nodo Wait y enviar el mensaje a Telegram a la hora exacta.
 */
export function useTelegramWebhook() {
  const [isConnected] = useLocalStorage<boolean>('telegram_connected', false);
  const [chatId] = useLocalStorage<string | null>('telegram_chat_id', null);

  const hasTelegramConnected = useMemo(() => isConnected && !!chatId, [isConnected, chatId]);

  /**
   * Envía el webhook a n8n inmediatamente. No espera, no hace timers.
   * Payload exacto: { chat_id, task, notify_at } con notify_at en formato "YYYY-MM-DD HH:mm"
   */
  const triggerWebhook = useCallback(
    async (
      taskId: string,
      taskText: string,
      scheduledDate?: string,
      scheduledTime?: string
    ): Promise<{ sent: boolean; reason?: 'missing_datetime' | 'no_telegram' }> => {
      if (!scheduledDate || !scheduledTime) {
        console.log('[TelegramWebhook] Skipping - missing date or time');
        return { sent: false, reason: 'missing_datetime' };
      }

      if (!chatId) {
        console.log('[TelegramWebhook] Skipping - no chat_id');
        return { sent: false, reason: 'no_telegram' };
      }

      // notify_at en formato exacto: "YYYY-MM-DD HH:mm" (NO ISO, NO timezone offset)
      const notifyAt = `${scheduledDate.trim()} ${scheduledTime.trim()}`;

      const payload = {
        chat_id: String(chatId).trim(),
        task: String(taskText).trim(),
        notify_at: notifyAt,
      };

      console.log('[TelegramWebhook] Sending:', payload);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        const webhookSecret = import.meta.env.VITE_N8N_WEBHOOK_SECRET as string | undefined;
        if (webhookSecret) {
          headers['X-Webhook-Secret'] = webhookSecret;
        }
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.status}`);
        }

        console.log('[TelegramWebhook] Success - n8n will contact at task time.');
        return { sent: true };
      } catch (error) {
        console.error('[TelegramWebhook] Error sending webhook:', error);
        return { sent: false };
      }
    },
    [chatId]
  );

  return {
    triggerWebhook,
    hasTelegramConnected,
  };
}
