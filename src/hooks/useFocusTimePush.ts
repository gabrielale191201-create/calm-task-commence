import { useCallback, useRef } from 'react';
import { usePushNotifications } from './usePushNotifications';

// Unique task ID for focus time notifications
const FOCUS_TIME_TASK_ID = 'focus-time-session';

export function useFocusTimePush() {
  const { scheduleReminder, cancelReminder, subscribe, isSubscribed, isSupported } = usePushNotifications();
  const scheduledRef = useRef(false);

  const scheduleFocusEndNotification = useCallback(async (task: string, endTime: Date): Promise<boolean> => {
    if (!isSupported) {
      console.log('Push notifications not supported');
      return false;
    }

    // Ensure we're subscribed
    if (!isSubscribed) {
      const subscribed = await subscribe();
      if (!subscribed) {
        console.log('Could not subscribe to push notifications');
        return false;
      }
    }

    // Cancel any existing focus time notification first
    await cancelReminder(FOCUS_TIME_TASK_ID);

    // Schedule the new notification
    const notificationText = `¡Focus Time terminado! "${task}"`;
    const success = await scheduleReminder(FOCUS_TIME_TASK_ID, notificationText, endTime);
    
    if (success) {
      scheduledRef.current = true;
      console.log('Focus Time notification scheduled for:', endTime.toISOString());
    }
    
    return success;
  }, [isSupported, isSubscribed, subscribe, scheduleReminder, cancelReminder]);

  const cancelFocusEndNotification = useCallback(async (): Promise<boolean> => {
    if (!scheduledRef.current) {
      return true; // Nothing to cancel
    }

    const success = await cancelReminder(FOCUS_TIME_TASK_ID);
    if (success) {
      scheduledRef.current = false;
      console.log('Focus Time notification cancelled');
    }
    return success;
  }, [cancelReminder]);

  return {
    scheduleFocusEndNotification,
    cancelFocusEndNotification,
    isSupported,
  };
}
