
'use server';

import { getFunctions, httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { Anotacion } from '@/lib/data';

const functions = getFunctions(app); // Pass the app instance here

// Callable function references
const saveSyncedDataCallable = httpsCallable(functions, 'saveSyncedData');


// --- Anotaciones Management (Client-side wrappers for callable functions if needed) ---
// For now, these are not implemented as they are managed within the ProcessDetailsSheet
// which should also be updated to use callable functions if they perform writes.

// --- Main Sync to Firebase Logic ---
export async function saveSyncedDataToFirebase(data: any): Promise<HttpsCallableResult<any>> {
    if (!data) {
        throw new Error("No data provided to save.");
    }
    // This function now calls the Cloud Function 'saveSyncedData'
    // The data is passed as the second argument to the callable function.
    return await saveSyncedDataCallable(data);
}
