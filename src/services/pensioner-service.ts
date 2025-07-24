'use server';

import { collection, query, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProcesoCancelado } from '@/lib/data';
import { parsePeriodoPago } from '@/lib/helpers';

const PROCESOS_CANCELADOS_COLLECTION = "procesoscancelados";


/**
 * Fetches all processed sentence payments once.
 * The data is denormalized by a Cloud Function, so we only need to query
 * the 'procesoscancelados' collection. This is highly efficient.
 * @returns A promise that resolves to the data and metadata.
 */
export async function getProcesosCancelados(): Promise<{
    data: ProcesoCancelado[],
    metadata: { departments: string[], years: string[] }
}> {
    try {
        // Remove server-side ordering to avoid index-related errors.
        // Ordering will be handled client-side.
        const q = query(collection(db, PROCESOS_CANCELADOS_COLLECTION));
        const procesosSnapshot = await getDocs(q);
        
        const procesosData = procesosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcesoCancelado));

        if (procesosData.length === 0) {
            return { data: [], metadata: { departments: [], years: [] } };
        }
        
        // Perform sorting on the client side.
        const sortedProcesos = procesosData.sort((a, b) => {
            const dateA = a.creadoEn ? (a.creadoEn as any).toDate?.() || new Date(a.creadoEn) : new Date(0);
            const dateB = b.creadoEn ? (b.creadoEn as any).toDate?.() || new Date(b.creadoEn) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        // Extract metadata for filters from the already fetched data
        const departments = [...new Set(sortedProcesos.map(p => p.pensionerInfo?.department).filter(Boolean) as string[])].sort();
        const years = [...new Set(sortedProcesos.map(p => p.año).filter(Boolean))].sort((a, b) => Number(b) - Number(a));

        return { data: sortedProcesos, metadata: { departments, years } };

    } catch (error: any) {
        console.error("Error fetching procesos cancelados:", error);
        throw new Error("Failed to fetch a list of processed sentences.");
    }
}
