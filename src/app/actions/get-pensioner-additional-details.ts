'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Payment } from '@/lib/data';
import { parsePeriodoPago } from '@/lib/helpers';

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

export async function getPensionerAdditionalDetails(pensionerId: string): Promise<LastPaymentData> {

    let lastPayment: any | null = null;
    try {
        const pagosRef = adminDb.collection(PENSIONADOS_COLLECTION).doc(pensionerId).collection('pagos');
        const pagosSnapshot = await pagosRef.get();

        if (!pagosSnapshot.empty) {
            const allPayments = pagosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));

            // Sort payments in-code using the end date of the payment period.
            // This is robust and handles non-timestamp date fields.
            allPayments.sort((a, b) => {
                const dateA = parsePeriodoPago(a.periodoPago)?.endDate || new Date(0);
                const dateB = parsePeriodoPago(b.periodoPago)?.endDate || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            // The first element after descending sort is the latest payment.
            lastPayment = allPayments[0];
        }
    } catch (e) {
        console.warn(`Could not fetch last payment for pensioner ID ${pensionerId}:`, e);
        // Do not throw, just return null so the page can render gracefully.
    }

    return serializeTimestamps({ lastPayment }) as LastPaymentData;
}
