'use server';

/**
 * @fileOverview Server action to synchronize sentence payments using Firebase Admin SDK.
 *
 * This action scans through all pensioners and their payments, identifies payments
 * related to legal sentences that have not yet been processed, and saves them
 * to the 'procesoscancelados' collection in Firestore. It uses the Admin SDK
 * to bypass security rules for server-side execution.
 */

import { adminDb as db } from '@/lib/firebase-admin';
import type { Payment, ProcesoCanceladoConcepto } from '@/lib/data';

const SENTENCE_CONCEPT_PREFIXES = ['470-', '785-', '475-'];

/**
 * Scans for new sentence-related payments and saves them to the 'procesoscancelados' collection.
 * @returns An object indicating success or failure, and the count of new processes found.
 */
export async function syncNewProcesses(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // 1. Get all existing pagoIds from procesoscancelados to avoid duplicates.
    const existingProcesosSnapshot = await db.collection('procesoscancelados').get();
    const existingPagoIds = new Set(existingProcesosSnapshot.docs.map(d => d.data().pagoId));

    // 2. Get all pensioners
    const pensionersSnapshot = await db.collection('pensionados').get();
    const allPensioners = pensionersSnapshot.docs;

    let batch = db.batch();
    let newProcessesCount = 0;
    let batchCounter = 0;
    const MAX_BATCH_SIZE = 499; // Firestore batches are limited to 500 operations

    // 3. Iterate through each pensioner
    for (const pensionerDoc of allPensioners) {
      // 4. Get all payments for the current pensioner
      const pagosSnapshot = await pensionerDoc.ref.collection('pagos').get();

      for (const pagoDoc of pagosSnapshot.docs) {
        const pago = { id: pagoDoc.id, ...pagoDoc.data() } as Payment;

        // 5. Skip if this payment has already been processed
        if (!pago.pagoId || existingPagoIds.has(pago.pagoId)) {
          continue;
        }

        // 6. Check if the payment contains any sentence-related concepts
        const sentenceConceptsInPayment = pago.detalles.filter(detail =>
          SENTENCE_CONCEPT_PREFIXES.some(prefix => detail.nombre?.startsWith(prefix))
        );

        // 7. If sentence concepts are found, create a new 'proceso cancelado' document
        if (sentenceConceptsInPayment.length > 0) {
          const newProcessDocRef = db.collection('procesoscancelados').doc();

          // Firestore admin SDK's Timestamp has a `toDate` method, same as client.
          const fechaLiquidacionDate = pago.fechaProcesado?.toDate ? pago.fechaProcesado.toDate() : new Date();

          const newProcessData = {
            año: pago.año,
            conceptos: sentenceConceptsInPayment.map((c): ProcesoCanceladoConcepto => ({
              codigo: c.codigo || c.nombre?.split('-')[0] || '',
              nombre: c.nombre,
              ingresos: c.ingresos,
              egresos: c.egresos,
            })),
            creadoEn: new Date(), // Admin SDK converts JS Date to Timestamp
            fechaLiquidacion: fechaLiquidacionDate.toISOString(),
            pagoId: pago.pagoId,
            pensionadoId: pensionerDoc.id,
            periodoPago: pago.periodoPago,
          };

          batch.set(newProcessDocRef, newProcessData);
          newProcessesCount++;
          batchCounter++;
          existingPagoIds.add(pago.pagoId); // Add to set to avoid processing duplicates in the same run

          // 8. Commit the batch periodically to avoid exceeding size limits
          if (batchCounter >= MAX_BATCH_SIZE) {
            await batch.commit();
            batch = db.batch();
            batchCounter = 0;
          }
        }
      }
    }

    // 9. Commit any remaining operations in the final batch
    if (batchCounter > 0) {
      await batch.commit();
    }

    return { success: true, count: newProcessesCount };

  } catch (error) {
    console.error("Error synchronizing processes:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: errorMessage };
  }
}
