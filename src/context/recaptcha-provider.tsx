'use client';

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { ReactNode } from 'react';

export function RecaptchaProvider({ children }: { children: ReactNode }) {
    const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (!recaptchaKey) {
        // This is a failsafe. It's better to catch this during the build process.
        console.error("reCAPTCHA Site Key is not defined in environment variables.");
        // Render children without the provider if the key is missing.
        // Or you could render an error message.
        return <>{children}</>;
    }

    return (
        <GoogleReCaptchaProvider
            reCaptchaKey={recaptchaKey}
            scriptProps={{
                async: false,
                defer: false,
                appendTo: 'head',
                nonce: undefined,
            }}
        >
            {children}
        </GoogleReCaptchaProvider>
    );
}
