import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/context/auth-provider';
import './globals.css';
import { PensionerProvider } from '@/context/pensioner-provider';
import { RecaptchaProvider } from '@/context/recaptcha-provider';

export const metadata: Metadata = {
  title: 'DAJUSTICIA | Abogados Expertos en Pensiones - Aumenta tu Pensión',
  description: 'Abogados especialistas en derecho pensional y laboral en Colombia. Te ayudamos a aumentar y mejorar tu pensión, realizar la reliquidación, y reclamar semanas no cotizadas. Consulta gratis tu caso con expertos.',
  keywords: [
    'aumentar mi pensión', 
    'abogados de pensiones', 
    'mejorar mi pensión en Colombia', 
    'tengo derecho a una mejor pensión', 
    'asesoría legal para pensionados', 
    'reliquidación de pensión', 
    'revisión de historia laboral Colpensiones', 
    'reclamar semanas no cotizadas', 
    'pensión mínima en Colombia 2025', 
    'derechos del pensionado en Colombia',
    'abogados de pensiones en Colombia'
  ],
  authors: [{ name: 'Fabian Muñoz Puello' }, { name: 'Leidy Vega Anaya' }],
  icons: {
    icon: 'https://firebasestorage.googleapis.com/v0/b/pensionados-d82b2.appspot.com/o/logos%2Flogo-removebg-preview.png?alt=media&token=9a935e08-66dd-4edc-83f8-31320b0b2680',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Belleza&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <RecaptchaProvider>
            <PensionerProvider>
              {children}
              <Toaster />
            </PensionerProvider>
          </RecaptchaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
