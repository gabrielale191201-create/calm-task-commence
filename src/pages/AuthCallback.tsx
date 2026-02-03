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
    let mounted = true;
    
    const handleCallback = async () => {
      try {
        console.log('[Auth Callback] Processing OAuth callback...');
        console.log('[Auth Callback] Full URL:', window.location.href);
        console.log('[Auth Callback] Origin:', window.location.origin);
        
        // Get the hash fragment and query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check for error in callback (from OAuth provider)
        const errorParam = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
        
        if (errorParam) {
          console.error('[Auth Callback] OAuth error:', errorParam, errorDescription);
          const friendlyError = errorDescription?.includes('access_denied') 
            ? 'Acceso denegado. ¿Cancelaste el inicio de sesión?'
            : `${errorParam}: ${errorDescription || 'Error desconocido'}`;
          setError(friendlyError);
          setTimeout(() => navigate('/auth', { replace: true }), 4000);
          return;
        }

        // Check for authorization code (PKCE flow - preferred for security)
        const code = queryParams.get('code');
        
        if (code) {
          console.log('[Auth Callback] Found authorization code, exchanging for session...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (!mounted) return;
          
          if (exchangeError) {
            console.error('[Auth Callback] Code exchange error:', exchangeError.message);
            // Handle specific errors
            if (exchangeError.message.includes('code verifier')) {
              setError('Error de verificación. Por favor intenta iniciar sesión de nuevo.');
            } else {
              setError(`Error: ${exchangeError.message}`);
            }
            setTimeout(() => navigate('/auth', { replace: true }), 4000);
            return;
          }
          
          if (data.session) {
            console.log('[Auth Callback] Session established successfully via PKCE');
            // Clean URL and redirect
            window.history.replaceState({}, document.title, '/');
            navigate('/', { replace: true });
            return;
          }
        }

        // Check for tokens in hash (implicit flow - fallback)
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          console.log('[Auth Callback] Found access token in hash (implicit flow)...');
          const refreshToken = hashParams.get('refresh_token') || '';
          
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (!mounted) return;
          
          if (setSessionError) {
            console.error('[Auth Callback] Set session error:', setSessionError.message);
            setError(`Error de sesión: ${setSessionError.message}`);
            setTimeout(() => navigate('/auth', { replace: true }), 4000);
            return;
          }
          
          if (data.session) {
            console.log('[Auth Callback] Session established via implicit flow');
            window.history.replaceState({}, document.title, '/');
            navigate('/', { replace: true });
            return;
          }
        }

        // No code or tokens - check if session already exists
        console.log('[Auth Callback] No code/tokens in URL, checking existing session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error('[Auth Callback] Session check error:', sessionError.message);
          setError(sessionError.message);
          setTimeout(() => navigate('/auth', { replace: true }), 4000);
          return;
        }

        if (session) {
          console.log('[Auth Callback] Existing session found, redirecting to home');
          window.history.replaceState({}, document.title, '/');
          navigate('/', { replace: true });
          return;
        }
        
        // No session yet - wait for auth state change with timeout
        console.log('[Auth Callback] No session yet, waiting for auth state...');
        
        let resolved = false;
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (resolved || !mounted) return;
          console.log('[Auth Callback] Auth state changed:', event);
          
          if (newSession) {
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

        // Timeout fallback - if no session after 10 seconds, redirect to auth
        setTimeout(() => {
          if (!resolved && mounted) {
            resolved = true;
            subscription.unsubscribe();
            console.log('[Auth Callback] Timeout - no session established');
            setError('No se pudo completar el inicio de sesión. Por favor intenta de nuevo.');
            setTimeout(() => navigate('/auth', { replace: true }), 3000);
          }
        }, 10000);
        
      } catch (err: any) {
        console.error('[Auth Callback] Unexpected error:', err);
        if (mounted) {
          // Handle abort/signal errors specifically
          const msg = err.message || '';
          if (msg.includes('signal is aborted') || msg.includes('aborted') || err.name === 'AbortError') {
            setError('La conexión fue interrumpida. Por favor intenta de nuevo.');
          } else {
            setError(`Error inesperado: ${msg || 'Error desconocido'}`);
          }
          setTimeout(() => navigate('/auth', { replace: true }), 4000);
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
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg font-mono break-all">{error}</p>
          <p className="text-xs text-muted-foreground mt-4">Redirigiendo a login...</p>
        </div>
      </div>
    );
  }

  return <LoadingScreen message="Completando inicio de sesión..." />;
}
