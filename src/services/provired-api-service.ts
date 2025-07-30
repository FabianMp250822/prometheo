
'use server';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

const functions = getFunctions(app);

// Reference to the callable Cloud Function
const syncDailyNotificationsCallable = httpsCallable(functions, 'syncDailyNotifications');


export async function syncProviredNotifications(): Promise<{ success: boolean; count: number; message?: string }> {
    try {
        // Call the Cloud Function. It will handle the entire sync process securely on the server.
        const result = await syncDailyNotificationsCallable();
        const data = result.data as { success: boolean; count: number; message?: string };
        
        if (data.success) {
            return { success: true, count: data.count || 0, message: data.message || 'Sincronización completada.' };
        } else {
            return { success: false, count: 0, message: data.message || 'La función en la nube reportó un error.' };
        }

    } catch (error: any) {
        console.error("Error calling syncDailyNotifications function:", error);
        // The error object from a failed callable function has a 'message' property
        return { success: false, count: 0, message: error.message || "Error de comunicación con el servidor." };
    }
}
