'use server';

/**
 * @fileoverview DEPRECATED
 * This server action is no longer in use.
 * The synchronization logic has been moved to a Firestore trigger
 * in `functions/src/index.ts` which processes new payments automatically.
 */

export async function syncNewProcesses(): Promise<{ success: boolean; count: number; error?: string }> {
    console.warn("syncNewProcesses Server Action is deprecated and should not be used.");
    return { 
        success: false, 
        count: 0, 
        error: "This function is deprecated. Synchronization is now automatic." 
    };
}
