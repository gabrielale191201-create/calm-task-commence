import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingScreen } from '@/components/LoadingScreen';

/**
 * AuthCallback handles the OAuth redirect after login.
 * Simplified and more robust version to handle mobile/PWA contexts.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    const handleCallback = async () => {
      try {
        console.log('[Auth Callback] Processing OAuth callback...');
        
        // Check for error in URL first
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const errorParam = hashParams.get('error') || queryParams.get('error');
        if (errorParam) {
          const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
          console.error('[Auth Callback] OAuth error:', errorParam, errorDescription);
          setError(errorDescription || errorParam);
          setTimeout(() => navigate('/auth', { replace: true }), 3000);
          return;
        }

        // Try to get session - the Lovable auth helper should have already set it
        const checkSession = async (): Promise<boolean> => {
          try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error('[Auth Callback] Session error:', sessionError.message);
              return false;
            }

            if (session) {
              console.log('[Auth Callback] Session found!');
              if (mounted) {
                window.history.replaceState({}, document.title, '/');
                navigate('/', { replace: true });
              }
              return true;
            }
            return false;
          } catch (e) {
            console.error('[Auth Callback] Check session error:', e);
            return false;
          }
        };

        // Check immediately
        if (await checkSession()) return;

        // If no session yet, wait and retry a few times
        const retryCheck = async () => {
          if (!mounted) return;
          
          retryCount++;
          console.log(`[Auth Callback] Retry ${retryCount}/${maxRetries}...`);
          
          if (await checkSession()) return;
          
          if (retryCount < maxRetries) {
            setTimeout(retryCheck, 1500);
          } else {
            // Final attempt: listen for auth state change
            console.log('[Auth Callback] Setting up auth listener...');
            
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
              if (!mounted) return;
              console.log('[Auth Callback] Auth state:', event);
              
              if (session) {
                subscription.unsubscribe();
                window.history.replaceState({}, document.title, '/');
                navigate('/', { replace: true });
              } else if (event === 'SIGNED_OUT') {
                subscription.unsubscribe();
                navigate('/auth', { replace: true });
              }
            });

            // Timeout after 8 more seconds
            setTimeout(() => {
              if (mounted) {
                subscription.unsubscribe();
                setError('No se pudo completar el inicio de sesión. Por favor intenta de nuevo.');
                setTimeout(() => navigate('/auth', { replace: true }), 3000);
              }
            }, 8000);
          }
        };

        // Start retry after a short delay
        setTimeout(retryCheck, 1000);
        
      } catch (err: any) {
        console.error('[Auth Callback] Error:', err);
        if (mounted) {
          setError('Error al procesar el inicio de sesión. Intenta de nuevo.');
          setTimeout(() => navigate('/auth', { replace: true }), 3000);
        }
      }
    };

    handleCallback();
    
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-2 font-medium">Error de autenticación</p>
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{error}</p>
          <p className="text-xs text-muted-foreground mt-4">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return <LoadingScreen message="Completando inicio de sesión..." />;
}
