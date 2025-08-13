

import { collection, query, getDocs, where, documentId, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProcesoCancelado, Payment, Pensioner, LegalProcess, Parris1, Causante, DajusticiaClient, DajusticiaPayment, ProviredNotification, PagosHistoricoRecord, PensionerProfileData } from '@/lib/data';
import { parseEmployeeName, parsePeriodoPago } from '@/lib/helpers';

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
        const data = procesosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcesoCancelado));

        if (data.length === 0) return [];
        
        // Group by pagoId to consolidate duplicated entries
        const groupedByPagoId = new Map<string, ProcesoCancelado>();
        data.forEach(p => {
            const existing = groupedByPagoId.get(p.pagoId);
            if(existing) {
                // Merge concepts from duplicate entry, ensuring no duplicate concepts are added.
                p.conceptos.forEach(newConcept => {
                    const conceptExists = existing.conceptos.some(
                        existingConcept => existingConcept.codigo === newConcept.codigo && existingConcept.nombre === newConcept.nombre
                    );
                    if (!conceptExists) {
                        existing.conceptos.push(newConcept);
                    }
                });
            } else {
                // Use a copy of the conceptos array to avoid mutation issues
                groupedByPagoId.set(p.pagoId, { ...p, conceptos: [...p.conceptos] });
            }
        });

        let consolidatedData = Array.from(groupedByPagoId.values());


        if (consolidatedData.length > 0) {
            const pensionerIds = [...new Set(consolidatedData.map(p => p.pensionadoId).filter(Boolean))];
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
            consolidatedData = await Promise.all(consolidatedData.map(async (p) => {
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

        const sortedData = consolidatedData.sort((a, b) => {
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


/**
 * Fetches all relevant data for a single pensioner to build a complete profile.
 * @param pensionerId The ID of the pensioner document.
 * @param document The document number of the pensioner.
 * @returns A promise that resolves to the complete pensioner profile data.
 */
export async function getFullPensionerData(pensionerId: string, document: string): Promise<Partial<PensionerProfileData>> {
    try {
        const [
            paymentsSnapshot,
            historicalDoc,
            processesSnapshot,
            parris1Doc,
            causanteSnapshot,
            clientSnapshot,
            notificationsSnapshot
        ] = await Promise.all([
            getDocs(query(collection(db, 'pensionados', pensionerId, 'pagos'))),
            getDoc(doc(db, 'pagosHistorico', document)),
            getDocs(query(collection(db, 'procesos'), where("identidad_clientes", "==", document))),
            getDoc(doc(db, "parris1", document)),
            getDocs(query(collection(db, "causante"), where("cedula_causante", "==", document))),
            getDocs(query(collection(db, "nuevosclientes"), where("cedula", "==", document), limit(1))),
            getDocs(query(collection(db, 'provired_notifications'), where('demandante_lower', '==', document.toLowerCase()), orderBy('fechaPublicacion', 'desc'), limit(1)))
        ]);

        let payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        payments.sort((a, b) => {
            const dateA = parsePeriodoPago(a.periodoPago)?.endDate || new Date(0);
            const dateB = parsePeriodoPago(b.periodoPago)?.endDate || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
        
        const historicalPayments = historicalDoc.exists() && Array.isArray(historicalDoc.data().records) ? historicalDoc.data().records as PagosHistoricoRecord[] : [];
        const legalProcesses = processesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LegalProcess));
        const parris1Data = parris1Doc.exists() ? { id: parris1Doc.id, ...parris1Doc.data() } as Parris1 : null;
        const causanteData = !causanteSnapshot.empty ? { id: causanteSnapshot.docs[0].id, ...causanteSnapshot.docs[0].data() } as Causante : null;
        const lastNotification = !notificationsSnapshot.empty ? { id: notificationsSnapshot.docs[0].id, ...notificationsSnapshot.docs[0].data() } as ProviredNotification : null;

        let dajusticiaClientData: DajusticiaClient | null = null;
        let dajusticiaPayments: DajusticiaPayment[] = [];
        if (!clientSnapshot.empty) {
            const clientDoc = clientSnapshot.docs[0];
            dajusticiaClientData = { id: clientDoc.id, ...clientDoc.data() } as DajusticiaClient;
            const clientPaymentsSnapshot = await getDocs(query(collection(db, "nuevosclientes", clientDoc.id, "pagos")));
            dajusticiaPayments = clientPaymentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as DajusticiaPayment));
        }

        return {
            payments,
            legalProcesses,
            parris1Data,
            causanteData,
            historicalPayments,
            dajusticiaClientData,
            dajusticiaPayments,
            lastNotification,
        };

    } catch (error) {
        console.error(`Error fetching full data for pensioner ${document}:`, error);
        throw error;
    }
}
