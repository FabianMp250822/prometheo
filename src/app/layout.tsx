import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/context/auth-provider';
import './globals.css';
import { PensionerProvider } from '@/context/pensioner-provider';
import { RecaptchaProvider } from '@/context/recaptcha-provider';

export const metadata: Metadata = {
  title: 'Prometeo - Asesoría Experta para Mejorar tu Pensión',
  description: 'Expertos en derecho pensional y laboral. Te ayudamos a aumentar y mejorar tu pensión. Consulta tus derechos como pensionado y obtén la asesoría que mereces.',
  keywords: ['aumentar pensión', 'mejorar mi pensión', 'derechos del pensionado', 'consultoría para pensionados', 'reajuste pensional', 'abogados de pensiones'],
  authors: [{ name: 'Fabian Muñoz Puello' }, { name: 'Leidy Vega Anaya' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Belleza&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <RecaptchaProvider>
          <AuthProvider>
            <PensionerProvider>
              {children}
              <Toaster />
            </PensionerProvider>
          </AuthProvider>
        </RecaptchaProvider>
      </body>
    </html>
  );
}
