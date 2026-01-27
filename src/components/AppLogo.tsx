import { cn } from "@/lib/utils";
import logoImage from "@/assets/focuson-logo.png";

interface AppLogoProps {
  /** Pixel size for width/height */
  size?: number;
  className?: string;
}

/**
 * FocusON logo component.
 * Uses the uploaded logo image.
 * Visual-only: do not wrap in links/buttons.
 */
export function AppLogo({ size = 56, className }: AppLogoProps) {
  return (
    <img
      src={logoImage}
      alt="FocusON"
      width={size}
      height={size}
      className={cn("block object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
