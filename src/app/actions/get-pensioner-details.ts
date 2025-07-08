'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Pensioner, Parris1, Causante, ProcesoCancelado, PensionerProfile } from '@/lib/data';

// Define collection names
const PENSIONADOS_COLLECTION = "pensionados";
const PARRIS1_COLLECTION = "parris1";
const CAUSANTE_COLLECTION = "causante";
const PROCESOS_CANCELADOS_COLLECTION = "procesoscancelados";

export async function getPensionerDetails(pensionadoId: string): Promise<PensionerProfile | null> {
  if (!pensionadoId) return null;

  try {
    const pensionerDocRef = adminDb.collection(PENSIONADOS_COLLECTION).doc(pensionadoId);
    const parris1DocRef = adminDb.collection(PARRIS1_COLLECTION).doc(pensionadoId);
    const causanteDocRef = adminDb.collection(CAUSANTE_COLLECTION).doc(pensionadoId);
    const procesosQuery = adminDb.collection(PROCESOS_CANCELADOS_COLLECTION).where('pensionadoId', '==', pensionadoId);
    
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

    const pensioner = { id: pensionerSnap.id, ...pensionerSnap.data() } as Pensioner;
    const parris1Data = parris1Snap.exists ? { id: parris1Snap.id, ...parris1Snap.data() } as Parris1 : null;
    const causanteData = causanteSnap.exists ? { id: causanteSnap.id, ...causanteSnap.data() } as Causante : null;
    const procesosCancelados = procesosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcesoCancelado));

    // Get the latest payment for the summary
    const lastPaymentQuery = adminDb.collection('pensionados').doc(pensionadoId).collection('pagos').orderBy('fechaProcesado', 'desc').limit(1);
    const lastPaymentSnap = await lastPaymentQuery.get();
    const lastPayment = lastPaymentSnap.empty ? null : { id: lastPaymentSnap.docs[0].id, ...lastPaymentSnap.docs[0].data() };


    return {
        pensioner,
        parris1Data,
        causanteData,
        procesosCancelados,
        lastPayment: lastPayment as any, // Cast to any to avoid complex typing for now
    };

  } catch (error) {
    console.error(`Error fetching details for pensioner ${pensionadoId}:`, error);
    throw new Error('Failed to fetch pensioner details.');
  }
}
