
'use client';

import { useEffect, useState } from 'react';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { app } from '@/lib/firebase';

let appCheckInitialized = false;

export function FirebaseAppCheckProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(appCheckInitialized);

  useEffect(() => {
    if (!initialized && typeof window !== 'undefined') {
      try {
        const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
        if (!key) {
          console.error("reCAPTCHA Site Key is not defined. App Check will not be initialized.");
          return;
        }

        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(key),
          isTokenAutoRefreshEnabled: true,
        });

        appCheckInitialized = true;
        setInitialized(true);
        console.log("Firebase App Check initialized successfully.");
      } catch (error) {
        console.error("Error initializing Firebase App Check:", error);
      }
    }
  }, [initialized]);

  return <>{children}</>;
}
