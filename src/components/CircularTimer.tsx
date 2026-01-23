import { cn } from '@/lib/utils';

interface CircularTimerProps {
  timeLeft: number;
  duration: number;
  progress: number;
  size?: number;
}

export function CircularTimer({ timeLeft, duration, progress, size = 280 }: CircularTimerProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="relative flex items-center justify-center timer-circle">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--timer-track))"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--timer-ring))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="progress-ring transition-all duration-300"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(
          "font-display font-semibold tracking-tight text-foreground",
          size >= 280 ? "text-6xl" : "text-4xl"
        )}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
        {duration > 0 && (
          <span className="text-muted-foreground text-sm mt-2">
            de {Math.floor(duration / 60)} min
          </span>
        )}
      </div>
    </div>
  );
}
