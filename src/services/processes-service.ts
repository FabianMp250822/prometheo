
'use server';

import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

export async function saveSyncedDataToFirebase(data: any): Promise<any> {
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!user) {
        throw new Error("Must be authenticated to save data.");
    }
    
    if (!data) {
        throw new Error("No data provided to save.");
    }

    try {
        const idToken = await user.getIdToken(true);

        const response = await fetch('/api/save-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to save data via API.');
        }

        return result;

    } catch (error) {
        console.error("Error in saveSyncedDataToFirebase service:", error);
        // Re-throw the error to be caught by the component
        throw error;
    }
}
