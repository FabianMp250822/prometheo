'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { PensionerProfile } from '@/lib/data';

const PENSIONADOS_COLLECTION = "pensionados";
const PARRIS1_COLLECTION = "parris1";
const CAUSANTE_COLLECTION = "causante";
const PROCESOS_CANCELADOS_COLLECTION = "procesoscancelados";

const serializeTimestamps = (data: any): any => {
    if (!data) return data;
    if (Array.isArray(data)) return data.map(serializeTimestamps);
    if (typeof data === 'object' && data !== null) {
        if (typeof (data as any).toDate === 'function') {
            return (data as any).toDate().toISOString();
        }
        const res: { [key: string]: any } = {};
        for (const key in data) {
            res[key] = serializeTimestamps(data[key]);
        }
        return res;
    }
    return data;
};

export async function getPensionerDetails(documento: string): Promise<PensionerProfile | null> {
    if (!documento) return null;

    let pensionerDoc;
    try {
        // Step 1: Find the pensioner using their national ID ('documento'). This is the only critical step.
        const pensionerQuery = await adminDb.collection(PENSIONADOS_COLLECTION)
            .where('documento', '==', documento)
            .limit(1)
            .get();

        if (pensionerQuery.empty) {
            console.warn(`No pensionado encontrado con documento: ${documento}`);
            return null;
        }
        pensionerDoc = pensionerQuery.docs[0];
    } catch (error) {
        console.error(`Error fetching main pensioner document for ${documento}:`, error);
        // If we can't get the main document, we must throw an error as we cannot proceed.
        throw new Error('Error al obtener el documento principal del pensionado.');
    }
    
    const pensioner = { id: pensionerDoc.id, ...pensionerDoc.data() };
    const pensionerFirestoreId = pensionerDoc.id; // Correctly store the Firestore document ID

    // --- Resilient Data Fetching for secondary collections ---
    // Each fetch is wrapped in a try-catch to prevent a single failure from crashing the entire process.

    let parris1Data = null;
    try {
        const parris1Query = await adminDb.collection(PARRIS1_COLLECTION)
            .where('cedula', '==', documento)
            .limit(1)
            .get();
        if (!parris1Query.empty) {
            parris1Data = { id: parris1Query.docs[0].id, ...parris1Query.docs[0].data() };
        }
    } catch (e) {
        console.warn(`Could not fetch parris1 data for ${documento}:`, e);
    }

    let causanteData = null;
    try {
        const causanteQuery = await adminDb.collection(CAUSANTE_COLLECTION)
            .where('cedula_causante', '==', documento)
            .limit(1)
            .get();
        if (!causanteQuery.empty) {
            causanteData = { id: causanteQuery.docs[0].id, ...causanteQuery.docs[0].data() };
        }
    } catch (e) {
        console.warn(`Could not fetch causante data for ${documento}:`, e);
    }
    
    let procesosCancelados: any[] = [];
    try {
        // **FIXED**: Query using the correct pensioner's Firestore Document ID
        const procesosQuery = await adminDb.collection(PROCESOS_CANCELADOS_COLLECTION)
            .where('pensionadoId', '==', pensionerFirestoreId)
            .get();
        
        const fetchedProcesos = procesosQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedProcesos.sort((a: any, b: any) => {
            const dateA = (a.creadoEn?.toDate?.())?.getTime?.() || 0;
            const dateB = (b.creadoEn?.toDate?.())?.getTime?.() || 0;
            return dateB - dateA;
        });
        procesosCancelados = fetchedProcesos;
    } catch (e) {
        console.warn(`Could not fetch procesosCancelados for ${documento}:`, e);
    }

    let lastPayment: any | null = null;
    try {
        const pagosRef = adminDb.collection(PENSIONADOS_COLLECTION).doc(pensionerFirestoreId).collection('pagos');
        const pagosQuery = await pagosRef.select('fechaProcesado').get();

        if (!pagosQuery.empty) {
            let latest = { id: '', time: 0 };
            pagosQuery.forEach(doc => {
                const data = doc.data();
                const t = data.fechaProcesado?.toDate?.()?.getTime?.() || 0;
                if (t > latest.time) latest = { id: doc.id, time: t };
            });

            if (latest.id) {
                const pagoDoc = await pagosRef.doc(latest.id).get();
                lastPayment = { id: pagoDoc.id, ...pagoDoc.data() };
            }
        }
    } catch (e) {
        console.warn(`Could not fetch last payment for ${documento}:`, e);
    }

    const profileData = {
        pensioner,
        parris1Data,
        causanteData,
        procesosCancelados,
        lastPayment,
    };

    return serializeTimestamps(profileData) as PensionerProfile;
}
