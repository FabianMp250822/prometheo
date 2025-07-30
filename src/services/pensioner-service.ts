import { collection, query, getDocs, where, documentId, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProcesoCancelado, Payment } from '@/lib/data';

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
 * Fetches all processed sentence payments and enriches them with pensioner and original payment details.
 * This is optimized to reduce Firestore reads.
 * @returns A promise that resolves to the enriched data.
 */
export async function getProcesosCanceladosConPensionados(): Promise<ProcesoCancelado[]> {
    try {
        const procesosSnapshot = await getDocs(query(collection(db, PROCESOS_CANCELADOS_COLLECTION)));
        let data = procesosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcesoCancelado));

        if (data.length > 0) {
            const pensionerIds = [...new Set(data.map(p => p.pensionadoId).filter(Boolean))];
            const pensionersData: { [key: string]: { name: string, document: string, department: string } } = {};
            
            const chunks = [];
            for (let i = 0; i < pensionerIds.length; i += 30) {
                chunks.push(pensionerIds.slice(i, i + 30));
            }
            
            for (const chunk of chunks) {
                if (chunk.length === 0) continue;
                const pensionersQuery = query(collection(db, 'pensionados'), where('documento', 'in', chunk));
                const pensionersSnapshot = await getDocs(pensionersQuery);
                
                pensionersSnapshot.forEach(doc => {
                    const pData = doc.data();
                    pensionersData[pData.documento] = {
                        name: pData.empleado,
                        document: pData.documento,
                        department: pData.dependencia1
                    };
                });
            }

            // Enrich with pensioner info and fetch original payment
            data = await Promise.all(data.map(async (p) => {
                const pagoDocRef = doc(db, 'pensionados', p.pensionadoId, 'pagos', p.pagoId);
                const pagoSnap = await getDoc(pagoDocRef);
                const pagoOriginal = pagoSnap.exists() ? pagoSnap.data() as Payment : null;

                return {
                    ...p,
                    pensionerInfo: pensionersData[p.pensionadoId],
                    pagoOriginal: pagoOriginal
                };
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
        throw new Error(`Failed to fetch processed sentences with pensioner details: ${error.message}`);
    }
}
