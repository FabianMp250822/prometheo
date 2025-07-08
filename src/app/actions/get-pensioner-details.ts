'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Pensioner, Parris1, Causante, ProcesoCancelado, PensionerProfile, Payment } from '@/lib/data';

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

    // Get all payments and find the latest one in code to be more resilient
    const allPaymentsQuery = adminDb.collection('pensionados').doc(pensionadoId).collection('pagos');
    const allPaymentsSnap = await allPaymentsQuery.get();

    let lastPayment: Payment | null = null;
    if (!allPaymentsSnap.empty) {
        const allPayments = allPaymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        
        // Sort client-side to find the latest payment, safely handling potential data issues
        allPayments.sort((a, b) => {
            const dateA = a.fechaProcesado?.toDate ? a.fechaProcesado.toDate().getTime() : 0;
            const dateB = b.fechaProcesado?.toDate ? b.fechaProcesado.toDate().getTime() : 0;
            return dateB - dateA;
        });
        lastPayment = allPayments.length > 0 ? allPayments[0] : null;
    }

    return {
        pensioner,
        parris1Data,
        causanteData,
        procesosCancelados,
        lastPayment,
    };

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
