import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

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

export function useTimer() {
  const [timerState, setTimerState] = useLocalStorage<TimerState>('focuson-timer', INITIAL_STATE);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const calculateTimeLeft = useCallback(() => {
    if (!timerState.endTime) return 0;
    const remaining = Math.max(0, timerState.endTime - Date.now());
    return Math.ceil(remaining / 1000);
  }, [timerState.endTime]);

  useEffect(() => {
    if (timerState.isRunning && timerState.endTime) {
      const updateTimer = () => {
        const remaining = calculateTimeLeft();
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          setIsCompleted(true);
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
  }, [timerState.isRunning, timerState.endTime, calculateTimeLeft]);

  const startTimer = useCallback((minutes: number, task: string) => {
    const durationMs = minutes * 60 * 1000;
    const endTime = Date.now() + durationMs;
    
    setTimerState({
      isRunning: true,
      endTime,
      duration: minutes * 60,
      task,
    });
    setIsCompleted(false);
  }, [setTimerState]);

  const stopTimer = useCallback(() => {
    setTimerState(INITIAL_STATE);
    setTimeLeft(0);
    setIsCompleted(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [setTimerState]);

  const continueTimer = useCallback((minutes: number) => {
    const durationMs = minutes * 60 * 1000;
    const endTime = Date.now() + durationMs;
    
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      endTime,
      duration: minutes * 60,
    }));
    setIsCompleted(false);
  }, [setTimerState]);

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
