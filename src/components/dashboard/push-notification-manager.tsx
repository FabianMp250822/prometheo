
'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { BellPlus } from 'lucide-react';
import { Button } from '../ui/button';

const functions = getFunctions();
const savePushSubscriptionCallable = httpsCallable(functions, 'savePushSubscription');

export function PushNotificationManager() {
    const { toast } = useToast();

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            // Register service worker
            navigator.serviceWorker.register('/sw.js')
                .then((swReg) => {
                    console.log('Service Worker is registered', swReg);
                    // Check if permission was already granted
                    if (Notification.permission === 'granted') {
                        subscribeUserToPush();
                    } else if (Notification.permission === 'default') {
                        // Show a toast to ask for permission non-intrusively
                         toast({
                            title: 'Habilitar Notificaciones',
                            description: 'Reciba alertas importantes sobre su agenda directamente en su dispositivo.',
                            action: (
                                <Button onClick={() => askPermission()} size="sm">
                                    <BellPlus className="mr-2"/> Habilitar
                                </Button>
                            ),
                            duration: 10000,
                        });
                    }
                })
                .catch((error) => {
                    console.error('Service Worker Error', error);
                });
        }
    }, [toast]);

    const askPermission = () => {
        Notification.requestPermission().then((result) => {
            if (result === 'granted') {
                subscribeUserToPush();
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Permiso Denegado',
                    description: 'No podremos enviarle notificaciones de agenda.',
                });
            }
        });
    };

    const subscribeUserToPush = () => {
        navigator.serviceWorker.ready.then((registration) => {
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                console.error('VAPID public key is not defined.');
                return;
            }

            registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidPublicKey,
            })
            .then((subscription) => {
                // Send subscription to backend
                savePushSubscriptionCallable({ subscription: subscription.toJSON() })
                    .then(() => {
                        console.log('User is subscribed.');
                    })
                    .catch((err) => {
                        console.error('Failed to save subscription:', err);
                    });
            })
            .catch(err => console.error('Failed to subscribe the user: ', err));
        });
    };

    // This component does not render anything to the UI itself
    return null;
}
