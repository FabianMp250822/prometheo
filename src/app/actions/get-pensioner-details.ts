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
    // Simplified query to avoid potential index/ordering issues. Sorting will be done in code.
    const procesosQuery = adminDb
      .collection(PROCESOS_CANCELADOS_COLLECTION)
      .where('pensionadoId', '==', pensionadoId);
    
    const [pensionerSnap, parris1Snap, causanteSnap, procesosSnap] = await Promise.all([
        pensionerDocRef.get(),
        parris1DocRef.get(),
        causanteDocRef.get(),
        procesosQuery.get()
    ]);

    if (!pensionerSnap.exists) {
        console.error(`No pensioner found with ID: ${pensionadoId}`);
        return null;
    }

    const pensioner = { id: pensionerSnap.id, ...pensionerSnap.data() };
    const parris1Data = parris1Snap.exists ? { id: parris1Snap.id, ...parris1Snap.data() } : null;
    const causanteData = causanteSnap.exists ? { id: causanteSnap.id, ...causanteSnap.data() } : null;
    
    // Map and sort procesos in code for robustness
    let procesosCancelados = procesosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    procesosCancelados.sort((a: any, b: any) => {
        const dateA = (a.creadoEn && typeof a.creadoEn.toDate === 'function') ? a.creadoEn.toDate().getTime() : 0;
        const dateB = (b.creadoEn && typeof b.creadoEn.toDate === 'function') ? b.creadoEn.toDate().getTime() : 0;
        return dateB - dateA;
    });

    // Fetch only the latest payment for efficiency
    const latestPaymentQuery = adminDb
      .collection('pensionados')
      .doc(pensionadoId)
      .collection('pagos')
      .orderBy('fechaProcesado', 'desc')
      .limit(1);
      
    const latestPaymentSnap = await latestPaymentQuery.get();

    let lastPayment: any | null = null;
    if (!latestPaymentSnap.empty) {
      lastPayment = { id: latestPaymentSnap.docs[0].id, ...latestPaymentSnap.docs[0].data() };
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
    console.error(`Error fetching details for pensioner ${pensionadoId}:`, error);
    if (error.code === 9 || (error.code === 5 && error.message.includes('index'))) {
        throw new Error(
            'Error de base de datos: Falta un índice en Firestore. ' +
            'Por favor, revise los logs de Firebase para encontrar el enlace y crearlo.'
        );
    }
    throw new Error('Failed to fetch pensioner details.');
  }
}
