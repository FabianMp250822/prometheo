'use server';

import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProcesoCancelado } from '@/lib/data';

const PROCESOS_CANCELADOS_COLLECTION = "procesoscancelados";

/**
 * Fetches all processed sentence payments once from the root collection.
 * The data is denormalized by a Cloud Function, so we only need to query
 * the 'procesoscancelados' collection.
 * @returns A promise that resolves to the data.
 */
export async function getProcesosCancelados(): Promise<ProcesoCancelado[]> {
    try {
        const collectionRef = collection(db, PROCESOS_CANCELADOS_COLLECTION);
        const q = query(collectionRef);
        const procesosSnapshot = await getDocs(q);
        
        const procesosData = procesosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcesoCancelado));

        // Perform sorting on the client side after fetching to avoid indexing issues.
        const sortedProcesos = procesosData.sort((a, b) => {
            const dateAValue = a.creadoEn ? (a.creadoEn as any).toDate?.() || new Date(a.creadoEn as string) : new Date(0);
            const dateBValue = b.creadoEn ? (b.creadoEn as any).toDate?.() || new Date(b.creadoEn as string) : new Date(0);
            
            const timeA = !isNaN(dateAValue.getTime()) ? dateAValue.getTime() : 0;
            const timeB = !isNaN(dateBValue.getTime()) ? dateBValue.getTime() : 0;
            
            return timeB - timeA; // Sort descending (most recent first)
        });

        return sortedProcesos;

    } catch (error: any) {
        console.error("Error fetching procesos cancelados:", error);
        throw new Error("Failed to fetch a list of processed sentences.");
    }
}
