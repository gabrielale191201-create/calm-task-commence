import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from '@/hooks/useAuthState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { z } from 'zod';
import { FocusOnLogo } from '@/components/FocusOnLogo';
import { User } from 'lucide-react';
import { LoadingScreen } from '@/components/LoadingScreen';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated, isGuest, isLoading, enterGuestMode } = useAuthState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      <div className="mb-8">
        <FocusOnLogo />
      </div>
      
      {/* Guest Mode - Primary CTA */}
      <div className="w-full max-w-md mb-6">
        <button
          onClick={handleContinueAsGuest}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-primary text-primary-foreground rounded-2xl font-medium text-lg shadow-lg hover:opacity-90 transition-all active:scale-[0.98]"
        >
          <User size={22} />
          Empezar ahora
        </button>
        <p className="text-center text-xs text-muted-foreground mt-3 px-4">
          Sin registro. Tus datos se guardan solo en este dispositivo.
        </p>
      </div>

      {/* Divider */}
      <div className="w-full max-w-md flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">o si ya tienes cuenta</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-lg font-medium">Accede a tu espacio</CardTitle>
          <CardDescription className="text-xs">
            Para sincronizar en la nube y acceder desde cualquier lugar
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
    </div>
  );
}
