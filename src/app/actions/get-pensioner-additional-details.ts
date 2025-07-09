'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Payment } from '@/lib/data';

const PENSIONADOS_COLLECTION = "pensionados";

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

export interface LastPaymentData {
    lastPayment: Payment | null;
}

export async function getPensionerAdditionalDetails(pensionerFirestoreId: string): Promise<LastPaymentData> {

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
        console.warn(`Could not fetch last payment for pensioner ID ${pensionerFirestoreId}:`, e);
        // Do not throw, just return null so the page can render gracefully.
    }

    return serializeTimestamps({ lastPayment }) as LastPaymentData;
}
