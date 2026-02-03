import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingScreen } from '@/components/LoadingScreen';

/**
 * AuthCallback handles the OAuth redirect after login.
 * It processes tokens from the URL and establishes the session.
 * Supports both hash-based (implicit) and code-based (PKCE) flows.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[Auth Callback] Processing OAuth callback...');
        console.log('[Auth Callback] URL:', window.location.href);
        
        // Get the hash fragment and query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check for error in callback
        const errorParam = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
        
        if (errorParam) {
          console.error('[Auth Callback] OAuth error:', errorParam, errorDescription);
          setError(`${errorParam}: ${errorDescription || 'Error desconocido'}`);
          setTimeout(() => navigate('/auth', { replace: true }), 5000);
          return;
        }

        // Check for authorization code (PKCE flow)
        const code = queryParams.get('code');
        
        if (code) {
          console.log('[Auth Callback] Found authorization code, exchanging...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('[Auth Callback] Code exchange error:', exchangeError.message);
            setError(`Error de intercambio: ${exchangeError.message}`);
            setTimeout(() => navigate('/auth', { replace: true }), 5000);
            return;
          }
          
          if (data.session) {
            console.log('[Auth Callback] Session established via code exchange');
            window.history.replaceState({}, document.title, '/');
            navigate('/', { replace: true });
            return;
          }
        }

        // Check for tokens in hash (implicit flow)
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          console.log('[Auth Callback] Found access token in hash, setting session...');
          const refreshToken = hashParams.get('refresh_token') || '';
          
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (setSessionError) {
            console.error('[Auth Callback] Set session error:', setSessionError.message);
            setError(`Error de sesión: ${setSessionError.message}`);
            setTimeout(() => navigate('/auth', { replace: true }), 5000);
            return;
          }
          
          if (data.session) {
            console.log('[Auth Callback] Session established via tokens');
            window.history.replaceState({}, document.title, '/');
            navigate('/', { replace: true });
            return;
          }
        }

        // Fallback: Try to get existing session
        console.log('[Auth Callback] No code/tokens found, checking existing session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[Auth Callback] Session error:', sessionError.message);
          setError(sessionError.message);
          setTimeout(() => navigate('/auth', { replace: true }), 5000);
          return;
        }

        if (session) {
          console.log('[Auth Callback] Existing session found');
          window.history.replaceState({}, document.title, '/');
          navigate('/', { replace: true });
        } else {
          // No session yet - wait for onAuthStateChange with timeout
          console.log('[Auth Callback] No session, waiting for auth state change...');
          
          let resolved = false;
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (resolved) return;
            console.log('[Auth Callback] Auth state changed:', event);
            
            if (session) {
              resolved = true;
              subscription.unsubscribe();
              window.history.replaceState({}, document.title, '/');
              navigate('/', { replace: true });
            } else if (event === 'SIGNED_OUT') {
              resolved = true;
              subscription.unsubscribe();
              navigate('/auth', { replace: true });
            }
          });

          // Timeout fallback - if no session after 8 seconds, show error
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              subscription.unsubscribe();
              console.log('[Auth Callback] Timeout - no session established');
              setError('No se pudo establecer la sesión. Intenta de nuevo.');
              setTimeout(() => navigate('/auth', { replace: true }), 3000);
            }
          }, 8000);
        }
      } catch (err: any) {
        console.error('[Auth Callback] Unexpected error:', err);
        setError(`Error inesperado: ${err.message || 'Error desconocido'}`);
        setTimeout(() => navigate('/auth', { replace: true }), 5000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-2 font-medium">Error de autenticación</p>
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg font-mono break-all">{error}</p>
          <p className="text-xs text-muted-foreground mt-4">Redirigiendo a login...</p>
        </div>
      </div>
    );
  }

  return <LoadingScreen message="Completando inicio de sesión..." />;
}
