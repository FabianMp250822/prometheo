
'use server';

import { unstable_cache as cache } from 'next/cache';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc } from "firebase/firestore";

const API_BASE_URL = 'https://apiclient.proviredcolombia.com';
const STATIC_TOKEN = 'iYmMqGfKb057z8ImmAm82ULmMgd26lelgs5BcYkOkQJgkacDljdbBbyb4Dh2pPP8';

const getJwtToken = cache(
  async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: STATIC_TOKEN }),
      });
      if (!response.ok) throw new Error(`Failed to get JWT: ${response.status}`);
      const data = await response.json();
      if (!data.token) throw new Error('JWT not found in token response');
      return data.token as string;
    } catch (error) {
      console.error('Error fetching JWT:', error);
      throw new Error('Could not authenticate with the external API.');
    }
  },
  ['provired_jwt_token'],
  { revalidate: 18000, tags: ['provired-auth'] }
);

async function makeApiRequest(endpoint: string, method: string, params?: object) {
  try {
    const jwt = await getJwtToken();
    const body = JSON.stringify({ method, params });
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
      body,
      cache: 'no-store',
    });
    if (!response.ok) {
        const errorBody = await response.text();
        return { success: false, message: `API Error: ${response.status} ${errorBody}`, data: null };
    }
    const responseData = await response.json();
    return { success: true, message: 'Data fetched successfully', data: responseData.data };
  } catch (error: any) {
    console.error(`API request failed for endpoint ${endpoint}:`, error);
    return { success: false, message: error.message, data: null };
  }
}

// --- Specific Sync Functions ---

async function syncCollection(
    collectionName: string, 
    fetchFunction: () => Promise<{ success: boolean; data: any; message: string | undefined; }>,
    progressCallback?: (progress: { current: number, total: number }) => void
): Promise<{ success: boolean; count: number; message?: string; }> {
    const { success, data, message } = await fetchFunction();
    if (!success || !Array.isArray(data)) {
        throw new Error(`Failed to fetch ${collectionName}: ${message}`);
    }

    const BATCH_SIZE = 400; // Firestore batch writes are limited to 500 operations.
    const totalBatches = Math.ceil(data.length / BATCH_SIZE);

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = data.slice(i, i + BATCH_SIZE);

        for (const item of chunk) {
            let docId: string;
            // Use the most specific ID available first to ensure uniqueness.
            if (item.IdDes) docId = String(item.IdDes);
            else if (item.IdCorp) docId = String(item.IdCorp);
            else if (item.IdMun) docId = String(item.IdMun);
            else if (item.IdDep) docId = String(item.IdDep);
            else if (item.notificacion) docId = String(item.notificacion); // For notifications
            else docId = doc(collection(db, collectionName)).id; // Fallback for safety

            const docRef = doc(db, collectionName, docId);

            if (collectionName === 'provired_notifications') {
                item.demandante_lower = item.demandante?.toLowerCase() || '';
                item.demandado_lower = item.demandado?.toLowerCase() || '';
            }
            batch.set(docRef, item);
        }

        await batch.commit();
        if (progressCallback) {
            progressCallback({ current: Math.floor(i / BATCH_SIZE) + 1, total: totalBatches });
        }
        await new Promise(resolve => setTimeout(resolve, 50)); // Pause to avoid overwhelming Firestore
    }
    
    return { success: true, count: data.length };
}


// --- Main Service Functions ---

export async function syncProviredNotifications(
    progressCallback: (progress: { current: number, total: number }) => void
): Promise<{ success: boolean; count: number; message?: string }> {
    try {
        return await syncCollection(
            'provired_notifications',
            () => makeApiRequest('report', 'getData'),
            progressCallback
        );
    } catch (error: any) {
        console.error("Firebase notifications sync error:", error);
        return { success: false, count: 0, message: error.message };
    }
}


export async function syncAllProviredDataToFirebase(): Promise<{ success: boolean; message?: string }> {
    const collectionsToSync = {
        provired_departments: () => makeApiRequest('departament', 'getData'),
        provired_municipalities: () => makeApiRequest('municipality', 'getData'),
        provired_corporations: () => makeApiRequest('corporation', 'getData'),
        provired_offices: () => makeApiRequest('office', 'getData'),
        provired_notifications: () => makeApiRequest('report', 'getData'),
    };
    
    try {
        for (const [collectionName, fetchFunction] of Object.entries(collectionsToSync)) {
            await syncCollection(collectionName, fetchFunction);
        }
        return { success: true, message: 'All collections synced successfully.' };
    } catch (error: any) {
        console.error("Firebase sync all error:", error);
        return { success: false, message: error.message };
    }
}
