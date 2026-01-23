import { useCallback, useRef, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useAlarmSound() {
  const [soundEnabled, setSoundEnabled] = useLocalStorage('focuson-sound-enabled', true);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playAlarm = useCallback(() => {
    if (!soundEnabled) return;

    try {
      // Create or resume AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Create a gentle, meditation-like tone
      const duration = 7; // 7 seconds
      const now = ctx.currentTime;

      // Create multiple harmonious oscillators for a bell-like sound
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 chord
      
      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, now);
        
        // Soft fade in and out
        const maxVolume = 0.08 - (index * 0.02); // Decreasing volume for harmonics
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(maxVolume, now + 0.5); // Fade in
        gainNode.gain.setValueAtTime(maxVolume, now + duration - 2);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Fade out
        
        oscillator.start(now);
        oscillator.stop(now + duration);
      });

      // Add a subtle high-frequency shimmer
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);
      shimmer.type = 'sine';
      shimmer.frequency.setValueAtTime(1046.5, now); // C6
      shimmerGain.gain.setValueAtTime(0, now);
      shimmerGain.gain.linearRampToValueAtTime(0.03, now + 1);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      shimmer.start(now + 0.5);
      shimmer.stop(now + duration);

    } catch (error) {
      console.error('Error playing alarm sound:', error);
    }
  }, [soundEnabled]);

  return {
    soundEnabled,
    setSoundEnabled,
    playAlarm,
  };
}
