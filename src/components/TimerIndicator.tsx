import { Target } from 'lucide-react';

interface TimerIndicatorProps {
  timeLeft: number;
  task: string;
  onClick: () => void;
}

export function TimerIndicator({ timeLeft, task, onClick }: TimerIndicatorProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <button
      onClick={onClick}
      className="fixed top-4 right-4 z-40 flex items-center gap-3 px-4 py-2.5 rounded-full bg-primary text-white shadow-focus animate-fade-in"
    >
      <Target size={18} className="animate-pulse-soft" />
      <span className="font-medium">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </button>
  );
}
