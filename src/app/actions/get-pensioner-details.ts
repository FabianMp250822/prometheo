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

    try {
        // Step 1: Find the pensioner using their national ID ('documento')
        const pensionerQuery = await adminDb.collection(PENSIONADOS_COLLECTION)
            .where('documento', '==', documento)
            .limit(1)
            .get();

        if (pensionerQuery.empty) {
            console.warn(`No pensionado encontrado con documento: ${documento}`);
            return null;
        }

        const pensionerDoc = pensionerQuery.docs[0];
        const pensioner = { id: pensionerDoc.id, ...pensionerDoc.data() };

        // Step 2: Use the 'documento' to find related data in other collections
        const parris1Query = await adminDb.collection(PARRIS1_COLLECTION)
            .where('cedula', '==', documento)
            .limit(1)
            .get();

        const parris1Data = !parris1Query.empty
            ? { id: parris1Query.docs[0].id, ...parris1Query.docs[0].data() }
            : null;

        const causanteQuery = await adminDb.collection(CAUSANTE_COLLECTION)
            .where('cedula_causante', '==', documento)
            .limit(1)
            .get();

        const causanteData = !causanteQuery.empty
            ? { id: causanteQuery.docs[0].id, ...causanteQuery.docs[0].data() }
            : null;

        const procesosQuery = await adminDb.collection(PROCESOS_CANCELADOS_COLLECTION)
            .where('pensionadoId', '==', documento)
            .get();

        let procesosCancelados = procesosQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        procesosCancelados.sort((a: any, b: any) => {
            const dateA = (a.creadoEn?.toDate?.())?.getTime?.() || 0;
            const dateB = (b.creadoEn?.toDate?.())?.getTime?.() || 0;
            return dateB - dateA;
        });

        // Step 3: Use the Firestore document ID to get the 'pagos' subcollection
        let lastPayment: any | null = null;
        try {
            const pagosRef = adminDb.collection(PENSIONADOS_COLLECTION).doc(pensionerDoc.id).collection('pagos');
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
            console.warn(`Error al obtener último pago de ${documento}:`, e);
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
        console.error(`Error al obtener detalles para documento ${documento}:`, error);
        throw new Error('Error al obtener detalles del pensionado.');
    }
}
