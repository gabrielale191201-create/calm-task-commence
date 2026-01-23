import { cn } from "@/lib/utils";

interface FocusOnLogoProps {
  /** Pixel size for width/height */
  size?: number;
  className?: string;
}

/**
 * FocusON primary mark: green circle + white power symbol.
 * Visual-only: do not wrap in links/buttons.
 */
export function FocusOnLogo({ size = 56, className }: FocusOnLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={cn("block", className)}
    >
      <circle cx="32" cy="32" r="30" fill="hsl(var(--primary))" />
      {/* Power symbol (white) */}
      <path
        d="M32 14c1.6 0 3 1.3 3 3v14c0 1.6-1.3 3-3 3s-3-1.3-3-3V17c0-1.7 1.4-3 3-3Z"
        fill="hsl(var(--primary-foreground))"
      />
      <path
        d="M44.4 20.6c1.1-1.1 3-1.1 4.1 0 1.1 1.1 1.1 3 0 4.1a18 18 0 1 1-32.9 10.9c0-4.7 1.8-9.1 5-12.2 1.1-1.1 3-1.1 4.1 0 1.1 1.1 1.1 3 0 4.1A12.2 12.2 0 1 0 44.4 20.6Z"
        fill="hsl(var(--primary-foreground))"
      />
    </svg>
  );
}
