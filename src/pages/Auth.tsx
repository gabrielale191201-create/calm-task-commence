import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from '@/hooks/useAuthState';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { z } from 'zod';
import { FocusOnLogo } from '@/components/FocusOnLogo';
import { User, Mail, Loader2 } from 'lucide-react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { lovable } from '@/integrations/lovable/index';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated, isGuest, isLoading, enterGuestMode } = useAuthState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // If already guest or authenticated, go to home
  useEffect(() => {
    if (!isLoading && (isAuthenticated || isGuest)) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isGuest, isLoading, navigate]);

  const handleContinueAsGuest = () => {
    enterGuestMode();
    toast.success('¡Bienvenido! Tus datos se guardarán en este dispositivo.');
    navigate('/', { replace: true });
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      console.log('[Auth] Starting Google sign-in...');
      
      // Check if we're on a custom domain (not lovable.app)
      const isCustomDomain = 
        !window.location.hostname.includes('lovable.app') &&
        !window.location.hostname.includes('lovableproject.com') &&
        !window.location.hostname.includes('localhost');
      
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('[Auth] Redirect URL:', redirectUrl);
      console.log('[Auth] Is custom domain:', isCustomDomain);

      if (isCustomDomain) {
        // For custom domains, use Supabase directly with skipBrowserRedirect
        // This bypasses auth-bridge which can cause issues on custom domains
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          console.error('[Auth] Google sign-in error:', error);
          toast.error(`Error: ${error.message}`);
          setIsGoogleLoading(false);
          return;
        }

        if (data?.url) {
          console.log('[Auth] Redirecting to OAuth URL...');
          // Validate OAuth URL for security
          try {
            const oauthUrl = new URL(data.url);
            const allowedHosts = ['accounts.google.com', 'www.google.com'];
            if (!allowedHosts.some(host => oauthUrl.hostname.includes(host))) {
              // If not Google, it might be Supabase auth endpoint which is also valid
              if (!oauthUrl.hostname.includes('supabase')) {
                throw new Error('URL de OAuth no válida');
              }
            }
            window.location.href = data.url;
          } catch (urlError) {
            console.error('[Auth] Invalid OAuth URL:', urlError);
            toast.error('Error en la URL de autenticación');
            setIsGoogleLoading(false);
          }
        }
      } else {
        // For lovable.app domains, use the managed auth flow
        const { error } = await lovable.auth.signInWithOAuth('google', {
          redirect_uri: redirectUrl,
        });
        
        if (error) {
          console.error('[Auth] Google sign-in error:', error);
          toast.error(`Error: ${error.message}`);
          setIsGoogleLoading(false);
        }
      }
      // Don't set loading to false on success - we're redirecting
    } catch (err: any) {
      console.error('[Auth] Google sign-in exception:', err);
      toast.error(`Error: ${err.message || 'Algo salió mal. Intenta de nuevo.'}`);
      setIsGoogleLoading(false);
    }
  };


  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email o contraseña incorrectos');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Por favor confirma tu email antes de iniciar sesión');
      } else {
        toast.error('Error al iniciar sesión: ' + error.message);
      }
      return;
    }
    
    toast.success('¡Bienvenido!');
    navigate('/', { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    const { error } = await signUp(email, password);
    setIsSubmitting(false);
    
    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('Este email ya está registrado');
      } else {
        toast.error('Error al registrarse: ' + error.message);
      }
      return;
    }
    
    toast.success('¡Cuenta creada! Revisa tu email para confirmar tu cuenta.');
  };

  if (isLoading) {
    return <LoadingScreen message="Verificando sesión..." />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-6">
        <FocusOnLogo />
      </div>

      {/* Privacy message */}
      <p className="text-center text-sm text-muted-foreground mb-8 max-w-xs">
        Tu espacio es privado. Guardamos tus datos de forma segura.
      </p>
      
      {/* Google Sign-In - Primary CTA */}
      <div className="w-full max-w-md mb-4">
        <button
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white text-gray-800 border border-gray-300 rounded-2xl font-medium text-base shadow-sm hover:bg-gray-50 transition-all active:scale-[0.98] disabled:opacity-70"
        >
          {isGoogleLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Continuar con Google
        </button>
      </div>

      {/* Guest Mode - Secondary */}
      <div className="w-full max-w-md mb-6">
        <button
          onClick={handleContinueAsGuest}
          className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-primary text-primary-foreground rounded-2xl font-medium text-base shadow-lg hover:opacity-90 transition-all active:scale-[0.98]"
        >
          <User size={20} />
          Empezar sin cuenta
        </button>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Tus datos se guardan solo en este dispositivo
        </p>
      </div>

      {/* Divider */}
      <div className="w-full max-w-md flex items-center gap-4 mb-4">
        <div className="flex-1 h-px bg-border" />
        <button 
          onClick={() => setShowEmailForm(!showEmailForm)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <Mail size={14} />
          {showEmailForm ? 'Ocultar' : 'Usar email'}
        </button>
        <div className="flex-1 h-px bg-border" />
      </div>
      
      {showEmailForm && (
        <Card className="w-full max-w-md border-border/50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg font-medium">Accede con email</CardTitle>
            <CardDescription className="text-xs">
              Para sincronizar en la nube desde cualquier lugar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Crear Cuenta</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Contraseña</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" variant="secondary" disabled={isSubmitting}>
                    {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" variant="secondary" disabled={isSubmitting}>
                    {isSubmitting ? 'Creando cuenta...' : 'Crear Cuenta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
