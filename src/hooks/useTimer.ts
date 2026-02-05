import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useLocalNotifications } from './useLocalNotifications';

interface TimerState {
  isRunning: boolean;
  endTime: number | null;
  duration: number;
  task: string;
}

const INITIAL_STATE: TimerState = {
  isRunning: false,
  endTime: null,
  duration: 0,
  task: '',
};

// Fixed ID for Focus Time notifications
const FOCUS_TIME_NOTIFICATION_ID = 999999;

export function useTimer() {
  const [timerState, setTimerState] = useLocalStorage<TimerState>('focuson-timer', INITIAL_STATE);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const { 
    isNative, 
    scheduleNotification, 
    cancelNotification, 
    showImmediateNotification 
  } = useLocalNotifications();

  const calculateTimeLeft = useCallback(() => {
    if (!timerState.endTime) return 0;
    const remaining = Math.max(0, timerState.endTime - Date.now());
    return Math.ceil(remaining / 1000);
  }, [timerState.endTime]);

  // Handle timer completion - show native notification
  const handleCompletion = useCallback(async (task: string) => {
    if (isNative) {
      await showImmediateNotification(
        '✅ Focus Time terminado',
        `Completaste: "${task}"`
      );
    }
  }, [isNative, showImmediateNotification]);

  useEffect(() => {
    if (timerState.isRunning && timerState.endTime) {
      const updateTimer = () => {
        const remaining = calculateTimeLeft();
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          setIsCompleted(true);
          // Trigger native notification on completion
          handleCompletion(timerState.task);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
      };

      updateTimer();
      intervalRef.current = window.setInterval(updateTimer, 100);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      setTimeLeft(0);
    }
  }, [timerState.isRunning, timerState.endTime, timerState.task, calculateTimeLeft, handleCompletion]);

  const startTimer = useCallback(async (minutes: number, task: string) => {
    const durationMs = minutes * 60 * 1000;
    const endTime = Date.now() + durationMs;
    
    setTimerState({
      isRunning: true,
      endTime,
      duration: minutes * 60,
      task,
    });
    setIsCompleted(false);

    // Schedule native notification for when timer ends (if app is in background)
    if (isNative) {
      await scheduleNotification({
        id: FOCUS_TIME_NOTIFICATION_ID,
        title: '✅ Focus Time terminado',
        body: `Completaste: "${task}"`,
        scheduleAt: new Date(endTime),
      });
    }
  }, [setTimerState, isNative, scheduleNotification]);

  const stopTimer = useCallback(async () => {
    // Cancel scheduled notification
    if (isNative) {
      await cancelNotification(FOCUS_TIME_NOTIFICATION_ID);
    }

    setTimerState(INITIAL_STATE);
    setTimeLeft(0);
    setIsCompleted(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [setTimerState, isNative, cancelNotification]);

  const continueTimer = useCallback(async (minutes: number) => {
    const durationMs = minutes * 60 * 1000;
    const endTime = Date.now() + durationMs;
    
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      endTime,
      duration: minutes * 60,
    }));
    setIsCompleted(false);

    // Schedule new notification for extended time
    if (isNative) {
      await cancelNotification(FOCUS_TIME_NOTIFICATION_ID);
      await scheduleNotification({
        id: FOCUS_TIME_NOTIFICATION_ID,
        title: '✅ Focus Time terminado',
        body: `Completaste: "${timerState.task}"`,
        scheduleAt: new Date(endTime),
      });
    }
  }, [setTimerState, timerState.task, isNative, cancelNotification, scheduleNotification]);

  const acknowledgeCompletion = useCallback(() => {
    setIsCompleted(false);
  }, []);

  const progress = timerState.duration > 0 
    ? ((timerState.duration - timeLeft) / timerState.duration) * 100 
    : 0;

  return {
    isRunning: timerState.isRunning,
    timeLeft,
    task: timerState.task,
    duration: timerState.duration,
    progress,
    isCompleted,
    startTimer,
    stopTimer,
    continueTimer,
    acknowledgeCompletion,
  };
}
