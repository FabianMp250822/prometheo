'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Pensioner, Parris1, Causante, ProcesoCancelado, PensionerProfile, Payment } from '@/lib/data';

// Define collection names
const PENSIONADOS_COLLECTION = "pensionados";
const PARRIS1_COLLECTION = "parris1";
const CAUSANTE_COLLECTION = "causante";
const PROCESOS_CANCELADOS_COLLECTION = "procesoscancelados";

// Helper to recursively convert Firestore Timestamps to ISO strings
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

export async function getPensionerDetails(pensionadoId: string): Promise<PensionerProfile | null> {
  if (!pensionadoId) return null;

  try {
    const pensionerDocRef = adminDb.collection(PENSIONADOS_COLLECTION).doc(pensionadoId);
    const parris1DocRef = adminDb.collection(PARRIS1_COLLECTION).doc(pensionadoId);
    const causanteDocRef = adminDb.collection(CAUSANTE_COLLECTION).doc(pensionadoId);
    
    // Fetch base data in parallel
    const [pensionerSnap, parris1Snap, causanteSnap] = await Promise.all([
        pensionerDocRef.get(),
        parris1DocRef.get(),
        causanteDocRef.get(),
    ]);

    if (!pensionerSnap.exists) {
        console.error(`No pensioner found with ID: ${pensionadoId}`);
        return null;
    }

    const pensioner = { id: pensionerSnap.id, ...pensionerSnap.data() };
    const parris1Data = parris1Snap.exists ? { id: parris1Snap.id, ...parris1Snap.data() } : null;
    const causanteData = causanteSnap.exists ? { id: causanteSnap.id, ...causanteSnap.data() } : null;
    
    let procesosCancelados: any[] = [];
    try {
        const procesosQuery = adminDb
            .collection(PROCESOS_CANCELADOS_COLLECTION)
            .where('pensionadoId', '==', pensionadoId);
        const procesosSnap = await procesosQuery.get();

        procesosCancelados = procesosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        procesosCancelados.sort((a: any, b: any) => {
            const dateA = (a.creadoEn && typeof a.creadoEn.toDate === 'function') ? a.creadoEn.toDate().getTime() : 0;
            const dateB = (b.creadoEn && typeof b.creadoEn.toDate === 'function') ? b.creadoEn.toDate().getTime() : 0;
            return dateB - dateA;
        });
    } catch (e) {
        console.warn(`Could not fetch 'procesos cancelados' for pensioner ${pensionadoId}. This may be due to data inconsistency or a missing index.`, e);
        procesosCancelados = [];
    }


    let lastPayment: any | null = null;
    try {
        const paymentsCollectionRef = adminDb.collection('pensionados').doc(pensionadoId).collection('pagos');
        const paymentsDateQuery = paymentsCollectionRef.select('fechaProcesado');
        const paymentsDateSnap = await paymentsDateQuery.get();

        if (!paymentsDateSnap.empty) {
            let latestPaymentInfo = { id: '', time: 0 };
            paymentsDateSnap.docs.forEach(doc => {
                const data = doc.data();
                const date = (data.fechaProcesado && typeof data.fechaProcesado.toDate === 'function') ? data.fechaProcesado.toDate().getTime() : 0;
                if (date > latestPaymentInfo.time) {
                    latestPaymentInfo = { id: doc.id, time: date };
                }
            });

            if (latestPaymentInfo.id) {
                const lastPaymentDoc = await paymentsCollectionRef.doc(latestPaymentInfo.id).get();
                lastPayment = { id: lastPaymentDoc.id, ...lastPaymentDoc.data() };
            }
        }
    } catch (e) {
        console.warn(`Could not fetch last payment for pensioner ${pensionadoId}. This may be due to a timeout or data inconsistency. The rest of the profile will be loaded.`, e);
        lastPayment = null;
    }


    const profileData = {
        pensioner,
        parris1Data,
        causanteData,
        procesosCancelados,
        lastPayment,
    };

    return serializeTimestamps(profileData) as PensionerProfile;

  } catch (error: any) {
    console.error(`Error fetching details for pensioner ${pensionadoId}:`, error, error.stack);
    if (error.code === 9 || (error.code === 5 && error.message.includes('index'))) {
        throw new Error(
            'Error de base de datos: Falta un índice en Firestore. ' +
            'Por favor, revise los logs de Firebase para encontrar el enlace y crearlo.'
        );
    }
    throw new Error('Failed to fetch pensioner details.');
  }
}
