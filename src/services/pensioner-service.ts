'use server';

import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, Parris1, LegalProcess, Causante, PagosHistoricoRecord, Pensioner, ProcesoCancelado, PensionerProfileData } from '@/lib/data';
import { parsePeriodoPago, parseEmployeeName } from '@/lib/helpers';
import { onSnapshot, orderBy } from 'firebase/firestore';

const PENSIONADOS_COLLECTION = "pensionados";
const PROCESOS_COLLECTION = "procesos";
const PARRIS1_COLLECTION = "parris1";
const CAUSANTE_COLLECTION = "causante";
const PAGOS_HISTORICO_COLLECTION = "pagosHistorico";
const PROCESOS_CANCELADOS_COLLECTION = "procesoscancelados";

/**
 * Fetches the complete profile for a given pensioner, aggregating data from multiple collections.
 * @param pensionerId The document ID of the pensioner in the 'pensionados' collection.
 * @param document The document number (cédula) of the pensioner.
 * @returns An aggregated profile object.
 */
export async function getPensionerProfile(pensionerId: string, document: string): Promise<PensionerProfileData> {
    try {
        // 1. Fetch Payments from subcollection, sorted client-side
        const paymentsQuery = query(collection(db, PENSIONADOS_COLLECTION, pensionerId, 'pagos'));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        let payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        payments.sort((a, b) => {
            const dateA = parsePeriodoPago(a.periodoPago)?.endDate || new Date(0);
            const dateB = parsePeriodoPago(b.periodoPago)?.endDate || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        // 2. Fallback to historical payments if no recent payments are found
        let historicalPayment: PagosHistoricoRecord | null = null;
        if (payments.length === 0) {
            const historicalDocRef = doc(db, PAGOS_HISTORICO_COLLECTION, document);
            const historicalDoc = await getDoc(historicalDocRef);
            if (historicalDoc.exists()) {
                const data = historicalDoc.data();
                if (data.records && Array.isArray(data.records) && data.records.length > 0) {
                    const sortedRecords = [...data.records].sort((a, b) => (b.ANO_RET || 0) - (a.ANO_RET || 0));
                    historicalPayment = sortedRecords[0] as PagosHistoricoRecord;
                }
            }
        }

        // 3. Fetch Legal Processes
        const processesQuery = query(collection(db, PROCESOS_COLLECTION), where("identidad_clientes", "==", document));
        const processesSnapshot = await getDocs(processesQuery);
        const legalProcesses = processesSnapshot.docs.map(doc => ({
            id: doc.id, ...doc.data() 
        } as LegalProcess));

        // 4. Fetch Parris1 Data
        const parris1DocRef = doc(db, PARRIS1_COLLECTION, document);
        const parris1Doc = await getDoc(parris1DocRef);
        const parris1Data = parris1Doc.exists() ? { id: parris1Doc.id, ...parris1Doc.data() } as Parris1 : null;

        // 5. Fetch Causante Data
        const causanteQuery = query(collection(db, CAUSANTE_COLLECTION), where("cedula_causante", "==", document));
        const causanteSnapshot = await getDocs(causanteQuery);
        const causanteData = !causanteSnapshot.empty ? { id: causanteSnapshot.docs[0].id, ...causanteSnapshot.docs[0].data() } as Causante : null;
        
        return {
            payments,
            historicalPayment,
            legalProcesses,
            parris1Data,
            causanteData,
        };

    } catch (error) {
        console.error("Error fetching pensioner profile:", error);
        throw new Error("Failed to fetch pensioner profile data.");
    }
}


/**
 * Subscribes to real-time updates of a user's processed sentence payments.
 * @param onData A callback function to handle incoming data and metadata.
 * @param onError A callback function to handle errors.
 * @returns The unsubscribe function from Firestore.
 */
export function getProcesosCancelados(
    onData: (data: ProcesoCancelado[], metadata: { departments: string[], years: string[] }) => void,
    onError: (error: Error) => void
) {
    const q = query(collection(db, PROCESOS_CANCELADOS_COLLECTION), orderBy("creadoEn", "desc"));

    const unsubscribe = onSnapshot(q, async (procesosSnapshot) => {
        try {
            const procesosData = procesosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcesoCancelado));

            if (procesosData.length === 0) {
                onData([], { departments: [], years: [] });
                return;
            }

            // Efficiently fetch all required pensioners
            const pensionerIds = [...new Set(procesosData.map(p => p.pensionadoId).filter(Boolean))];
            const pensionersData: { [key: string]: Pensioner } = {};

            // Firestore 'in' query is limited to 30 items
            for (let i = 0; i < pensionerIds.length; i += 30) {
                const chunk = pensionerIds.slice(i, i + 30);
                if (chunk.length > 0) {
                    const pensionerQuery = query(collection(db, PENSIONADOS_COLLECTION), where('__name__', 'in', chunk));
                    const pensionerDocs = await getDocs(pensionerQuery);
                    pensionerDocs.forEach(pensionerDoc => {
                        const pensioner = { id: pensionerDoc.id, ...pensionerDoc.data() } as Pensioner;
                        pensionersData[pensioner.id] = pensioner;
                    });
                }
            }

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

            onData(enrichedProcesos, { departments, years });
        } catch (error: any) {
            onError(error);
        }
    }, (error) => {
        onError(error);
    });

    return unsubscribe;
}
