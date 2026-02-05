import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions, PendingLocalNotificationSchema } from '@capacitor/local-notifications';

export interface LocalNotificationOptions {
  id: number;
  title: string;
  body: string;
  scheduleAt?: Date;
  sound?: string;
  extra?: Record<string, unknown>;
}

// Generate stable numeric ID from task string ID
function taskIdToNumericId(taskId: string): number {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    const char = taskId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function useLocalNotifications() {
  const [isNative, setIsNative] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const native = platform === 'android' || platform === 'ios';
    setIsNative(native);
    setIsSupported(native);

    if (native) {
      checkPermissions();
    }
  }, []);

  const checkPermissions = async (): Promise<boolean> => {
    try {
      const result = await LocalNotifications.checkPermissions();
      const granted = result.display === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('[LocalNotifications] checkPermissions error:', error);
      return false;
    }
  };

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      console.log('[LocalNotifications] Not running on native platform');
      return false;
    }

    try {
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === 'granted';
      setHasPermission(granted);
      console.log('[LocalNotifications] Permission result:', result.display);
      return granted;
    } catch (error) {
      console.error('[LocalNotifications] requestPermissions error:', error);
      return false;
    }
  }, [isNative]);

  const scheduleNotification = useCallback(async (options: LocalNotificationOptions): Promise<boolean> => {
    if (!isNative) {
      console.log('[LocalNotifications] Skipping - not native platform');
      return false;
    }

    if (!hasPermission) {
      const granted = await requestPermissions();
      if (!granted) {
        console.error('[LocalNotifications] Permission denied');
        return false;
      }
    }

    try {
      const scheduleOptions: ScheduleOptions = {
        notifications: [
          {
            id: options.id,
            title: options.title,
            body: options.body,
            schedule: options.scheduleAt ? { at: options.scheduleAt, allowWhileIdle: true } : undefined,
            sound: options.sound,
            extra: options.extra,
            // Android specific
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#4aba82',
            // For exact alarms on Android 12+
            autoCancel: true,
          }
        ]
      };

      await LocalNotifications.schedule(scheduleOptions);
      console.log('[LocalNotifications] Scheduled notification:', options.id, options.scheduleAt?.toISOString());
      return true;
    } catch (error) {
      console.error('[LocalNotifications] Schedule error:', error);
      return false;
    }
  }, [isNative, hasPermission, requestPermissions]);

  const cancelNotification = useCallback(async (notificationId: number): Promise<boolean> => {
    if (!isNative) return false;

    try {
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
      console.log('[LocalNotifications] Cancelled notification:', notificationId);
      return true;
    } catch (error) {
      console.error('[LocalNotifications] Cancel error:', error);
      return false;
    }
  }, [isNative]);

  const cancelNotificationByTaskId = useCallback(async (taskId: string): Promise<boolean> => {
    const numericId = taskIdToNumericId(taskId);
    return cancelNotification(numericId);
  }, [cancelNotification]);

  const getPendingNotifications = useCallback(async (): Promise<PendingLocalNotificationSchema[]> => {
    if (!isNative) return [];

    try {
      const result = await LocalNotifications.getPending();
      return result.notifications;
    } catch (error) {
      console.error('[LocalNotifications] getPending error:', error);
      return [];
    }
  }, [isNative]);

  // Immediate notification (for Focus Time end)
  const showImmediateNotification = useCallback(async (title: string, body: string): Promise<boolean> => {
    if (!isNative) {
      console.log('[LocalNotifications] Skipping immediate - not native platform');
      return false;
    }

    if (!hasPermission) {
      const granted = await requestPermissions();
      if (!granted) return false;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(), // Unique ID
            title,
            body,
            // No schedule = immediate
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#4aba82',
            autoCancel: true,
          }
        ]
      });
      console.log('[LocalNotifications] Showed immediate notification');
      return true;
    } catch (error) {
      console.error('[LocalNotifications] Immediate notification error:', error);
      return false;
    }
  }, [isNative, hasPermission, requestPermissions]);

  return {
    isNative,
    isSupported,
    hasPermission,
    requestPermissions,
    scheduleNotification,
    cancelNotification,
    cancelNotificationByTaskId,
    getPendingNotifications,
    showImmediateNotification,
    taskIdToNumericId,
  };
}

// Export helper for use outside hook
export { taskIdToNumericId };
