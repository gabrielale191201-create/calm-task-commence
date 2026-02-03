import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingScreen } from '@/components/LoadingScreen';

/**
 * AuthCallback handles the OAuth redirect after login.
 * It processes tokens from the URL and establishes the session.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[Auth Callback] Processing OAuth callback...');
        
        // Get the hash fragment or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check for error in callback
        const errorParam = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
        
        if (errorParam) {
          console.error('[Auth Callback] OAuth error:', errorParam, errorDescription);
          setError(errorDescription || errorParam);
          setTimeout(() => navigate('/auth', { replace: true }), 3000);
          return;
        }

        // Try to get the session - Supabase client should handle the token exchange
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[Auth Callback] Session error:', sessionError.message);
          setError(sessionError.message);
          setTimeout(() => navigate('/auth', { replace: true }), 3000);
          return;
        }

        if (session) {
          console.log('[Auth Callback] Session established successfully');
          // Clear any URL fragments/params
          window.history.replaceState({}, document.title, '/');
          navigate('/', { replace: true });
        } else {
          // No session yet - wait for onAuthStateChange
          console.log('[Auth Callback] No session yet, waiting for auth state change...');
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[Auth Callback] Auth state changed:', event);
            if (session) {
              subscription.unsubscribe();
              window.history.replaceState({}, document.title, '/');
              navigate('/', { replace: true });
            } else if (event === 'SIGNED_OUT') {
              subscription.unsubscribe();
              navigate('/auth', { replace: true });
            }
          });

          // Timeout fallback - if no session after 5 seconds, go to auth
          setTimeout(() => {
            subscription.unsubscribe();
            console.log('[Auth Callback] Timeout - redirecting to auth');
            navigate('/auth', { replace: true });
          }, 5000);
        }
      } catch (err) {
        console.error('[Auth Callback] Unexpected error:', err);
        setError('Error procesando el inicio de sesión');
        setTimeout(() => navigate('/auth', { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center">
          <p className="text-destructive mb-2">Error de autenticación</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-4">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return <LoadingScreen message="Completando inicio de sesión..." />;
}
