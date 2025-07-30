

'use client';

import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(app);
const saveSyncedDataCallable = httpsCallable(functions, 'saveSyncedData');


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
        const result = await saveSyncedDataCallable(data);
        return result.data;

    } catch (error: any) {
        console.error("Error in saveSyncedDataToFirebase service:", error);
        // Re-throw the error to be caught by the component
        throw error;
    }
}
