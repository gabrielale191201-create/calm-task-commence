import { useCallback } from 'react';
import { usePushNotifications } from './usePushNotifications';

const FOCUS_TIME_TASK_ID = 'focus_time';
const FOCUS_TIME_TEXT = 'Focus Time terminado';

export function useFocusTimePush() {
  const { scheduleReminder, cancelReminder, subscribe, isSubscribed, isSupported } = usePushNotifications();

  const scheduleFocusEndNotification = useCallback(async (endTime: Date): Promise<boolean> => {
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

    // Cancel any existing focus time reminder first
    await cancelReminder(FOCUS_TIME_TASK_ID);

    // Schedule the new reminder with exact values
    const success = await scheduleReminder(FOCUS_TIME_TASK_ID, FOCUS_TIME_TEXT, endTime);
    
    if (success) {
      console.log('Focus Time reminder scheduled for:', endTime.toISOString());
    }
    
    return success;
  }, [isSupported, isSubscribed, subscribe, scheduleReminder, cancelReminder]);

  const cancelFocusEndNotification = useCallback(async (): Promise<boolean> => {
    const success = await cancelReminder(FOCUS_TIME_TASK_ID);
    if (success) {
      console.log('Focus Time reminder cancelled');
    }
    return success;
  }, [cancelReminder]);

  return {
    scheduleFocusEndNotification,
    cancelFocusEndNotification,
    isSupported,
  };
}
