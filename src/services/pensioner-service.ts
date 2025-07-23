'use server';

import { collection, query, getDocs, where, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Pensioner, ProcesoCancelado } from '@/lib/data';
import { parsePeriodoPago, parseEmployeeName } from '@/lib/helpers';

const PENSIONADOS_COLLECTION = "pensionados";
const PROCESOS_CANCELADOS_COLLECTION = "procesoscancelados";


/**
 * Fetches all processed sentence payments once.
 * @returns A promise that resolves to the data and metadata.
 */
export async function getProcesosCancelados(): Promise<{
    data: ProcesoCancelado[],
    metadata: { departments: string[], years: string[] }
}> {
    try {
        const q = query(collection(db, PROCESOS_CANCELADOS_COLLECTION), orderBy("creadoEn", "desc"));
        const procesosSnapshot = await getDocs(q);
        const procesosData = procesosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcesoCancelado));

        if (procesosData.length === 0) {
            return { data: [], metadata: { departments: [], years: [] } };
        }

        // Efficiently fetch all required pensioners
        const pensionerIds = [...new Set(procesosData.map(p => p.pensionadoId).filter(Boolean))];
        const pensionersData: { [key: string]: Pensioner } = {};

        // Fetch pensioner data individually to avoid complex query rule requirements
        await Promise.all(pensionerIds.map(async (id) => {
            try {
                const pensionerRef = doc(db, PENSIONADOS_COLLECTION, id);
                const pensionerDoc = await getDoc(pensionerRef);
                if (pensionerDoc.exists()) {
                    pensionersData[id] = { id: pensionerDoc.id, ...pensionerDoc.data() } as Pensioner;
                }
            } catch (e) {
                console.warn(`Could not fetch pensioner with ID ${id}:`, e);
            }
        }));
        
        // Enrich procesos with pensioner info and sort
        const enrichedProcesos = procesosData.map(proceso => {
            const pensioner = pensionersData[proceso.pensionadoId];
            return {
                ...proceso,
                pensionerInfo: pensioner ? {
                    name: parseEmployeeName(pensioner.empleado),
                    document: pensioner.documento,
                    department: pensioner.dependencia1
                } : undefined,
            };
        }).filter(p => p.pensionerInfo)
        .sort((a, b) => {
            const dateA = parsePeriodoPago(a.periodoPago)?.endDate || new Date(0);
            const dateB = parsePeriodoPago(b.periodoPago)?.endDate || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        // Extract metadata for filters
        const departments = [...new Set(enrichedProcesos.map(p => p.pensionerInfo?.department).filter(Boolean) as string[])].sort();
        const years = [...new Set(enrichedProcesos.map(p => p.año).filter(Boolean))].sort((a, b) => Number(b) - Number(a));

        return { data: enrichedProcesos, metadata: { departments, years } };

    } catch (error: any) {
        console.error("Error fetching procesos cancelados:", error);
        throw new Error("Failed to fetch a list of processed sentences.");
    }
}
