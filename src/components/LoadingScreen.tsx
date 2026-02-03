import { AppLogo } from './AppLogo';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Cargando...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      <div className="animate-pulse">
        <AppLogo size={64} />
      </div>
      <p className="text-muted-foreground text-sm animate-pulse">
        {message}
      </p>
    </div>
  );
}
