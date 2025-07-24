
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

// --- Sync Function ---

export async function syncAllProviredDataToFirebase(
    progressCallback: (progress: { value: number; text: string }) => void
): Promise<{ success: boolean; message?: string }> {
    const collectionsToSync = {
        provired_departments: () => makeApiRequest('departament', 'getData'),
        provired_municipalities: () => makeApiRequest('municipality', 'getData'),
        provired_corporations: () => makeApiRequest('corporation', 'getData'),
        provired_offices: () => makeApiRequest('office', 'getData'),
        provired_notifications: () => makeApiRequest('report', 'getData'),
    };
    const totalSteps = Object.keys(collectionsToSync).length * 2; // Fetch + Write for each
    let currentStep = 0;

    try {
        for (const [collectionName, fetchFunction] of Object.entries(collectionsToSync)) {
            // Fetching data
            currentStep++;
            progressCallback({ value: (currentStep / totalSteps) * 100, text: `Obteniendo datos para ${collectionName}...` });
            const { success, data, message } = await fetchFunction();
            if (!success || !Array.isArray(data)) {
                throw new Error(`Failed to fetch ${collectionName}: ${message}`);
            }
            
            // Writing data
            currentStep++;
            progressCallback({ value: (currentStep / totalSteps) * 100, text: `Guardando ${data.length} registros en ${collectionName}...` });

            const batch = writeBatch(db);
            const collectionRef = collection(db, collectionName);

            data.forEach((item: any) => {
                let docId;
                if(item.IdDep) docId = String(item.IdDep);
                else if (item.IdMun) docId = String(item.IdMun);
                else if (item.IdCorp) docId = String(item.IdCorp);
                else if (item.IdDes) docId = String(item.IdDes);
                else if (item.notificacion) docId = String(item.notificacion);
                else docId = doc(collectionRef).id; // Fallback to auto-id

                const docRef = doc(db, collectionName, docId);

                // Add lowercase fields for searching notifications
                if (collectionName === 'provired_notifications') {
                    item.demandante_lower = item.demandante?.toLowerCase() || '';
                    item.demandado_lower = item.demandado?.toLowerCase() || '';
                }
                batch.set(docRef, item);
            });
            
            await batch.commit();
        }

        progressCallback({ value: 100, text: 'Sincronización completada.' });
        return { success: true };

    } catch (error: any) {
        console.error("Firebase sync error:", error);
        return { success: false, message: error.message };
    }
}
