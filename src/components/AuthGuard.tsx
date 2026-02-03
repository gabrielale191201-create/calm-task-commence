import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGuestMode } from '@/hooks/useGuestMode';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();
  const { isGuest } = useGuestMode();
  const navigate = useNavigate();

  useEffect(() => {
    // Allow guests to access the app
    if (!loading && !isAuthenticated && !isGuest) {
      navigate('/auth', { replace: true });
    }
  }, [isAuthenticated, isGuest, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  // Allow access for authenticated users OR guests
  if (!isAuthenticated && !isGuest) {
    return null;
  }

  return <>{children}</>;
}
