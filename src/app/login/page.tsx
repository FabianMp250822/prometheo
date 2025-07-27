'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scale, Mail, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth(app);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executeRecaptcha) {
      toast({
        variant: 'destructive',
        title: 'Error de reCAPTCHA',
        description: 'No se pudo cargar el verificador de seguridad. Por favor, recargue la página.',
      });
      return;
    }
    setIsLoading(true);

    try {
      // Get reCAPTCHA token
      const token = await executeRecaptcha('login');

      // Note: In a production environment, this token should be sent to your backend (a Cloud Function)
      // along with the email/password. The backend would then verify the token with Google's API
      // before proceeding with Firebase Authentication. This frontend implementation is the first step.
      
      console.log('reCAPTCHA token:', token); // For demonstration

      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Inicio de sesión exitoso', description: 'Bienvenido de nuevo.' });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error de inicio de sesión:', error);
      toast({
        variant: 'destructive',
        title: 'Error de inicio de sesión',
        description: error.message || 'Credenciales incorrectas. Por favor, intente de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [auth, email, password, executeRecaptcha, router, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-card p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Scale className="text-accent h-10 w-10" />
            <h1 className="text-4xl font-headline text-primary">Prometeo</h1>
          </div>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>Ingrese sus credenciales para acceder al sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@prometeo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ingresar
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
           <div className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-green-600" />
              <span>Protegido por reCAPTCHA</span>
           </div>
          <p className="text-xs text-muted-foreground text-center w-full">
            © {new Date().getFullYear()} Prometeo. Todos los derechos reservados.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
