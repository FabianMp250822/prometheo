'use server';

import { collection, query, getDocs, where, documentId } from 'firebase/firestore';
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


/**
 * Fetches all processed sentence payments and enriches them with pensioner details.
 * This is optimized to reduce Firestore reads.
 * @returns A promise that resolves to the enriched data.
 */
export async function getProcesosCanceladosConPensionados(): Promise<ProcesoCancelado[]> {
    try {
        const procesosSnapshot = await getDocs(query(collection(db, PROCESOS_CANCELADOS_COLLECTION)));
        let data = procesosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcesoCancelado));

        if (data.length > 0) {
            // Get unique pensioner IDs from the processes
            const pensionerIds = [...new Set(data.map(p => p.pensionadoId).filter(Boolean))];
            
            // This will hold the fetched pensioner data, keyed by their ID.
            const pensionersData: { [key: string]: { name: string, document: string, department: string } } = {};
            
            // Firestore 'in' queries are limited to 30 values. We must process in chunks.
            const chunks = [];
            for (let i = 0; i < pensionerIds.length; i += 30) {
                chunks.push(pensionerIds.slice(i, i + 30));
            }
            
            for (const chunk of chunks) {
                if (chunk.length === 0) continue;

                // **OPTIMIZED QUERY**: Instead of querying a field, query by document ID.
                // This is faster and more reliable. The document ID in 'pensionados' is the pensioner's document number.
                const pensionersQuery = query(collection(db, 'pensionados'), where(documentId(), 'in', chunk));
                const pensionersSnapshot = await getDocs(pensionersQuery);
                
                pensionersSnapshot.forEach(doc => {
                    const pData = doc.data();
                    // Use the document ID as the key, as it's guaranteed to be the pensioner's ID.
                    pensionersData[doc.id] = {
                        name: pData.empleado,
                        document: pData.documento || doc.id, // Fallback to doc.id if field is missing
                        department: pData.dependencia1
                    };
                });
            }

            // Enrich the original process data with the fetched pensioner info.
            data = data.map(p => ({
                ...p,
                pensionerInfo: pensionersData[p.pensionadoId]
            }));
        }

        const sortedData = data.sort((a, b) => {
            const dateA = a.creadoEn ? new Date((a.creadoEn as any).seconds * 1000) : new Date(0);
            const dateB = b.creadoEn ? new Date((b.creadoEn as any).seconds * 1000) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        return sortedData;

    } catch (error: any) {
        console.error("Error fetching data:", error);
        // Throw a more specific error to help with debugging.
        throw new Error(`Failed to fetch processed sentences with pensioner details: ${error.message}`);
    }
}
