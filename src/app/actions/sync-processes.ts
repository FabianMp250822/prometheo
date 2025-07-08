'use server';

/**
 * @fileOverview Server action to synchronize sentence payments using Firebase Admin SDK.
 *
 * This action scans for new sentence-related payments by querying the 'pagos'
 * collection group, identifies payments that haven't been processed, and saves
 * them to the 'procesoscancelados' collection in Firestore. It uses the Admin
 * SDK to bypass security rules for server-side execution.
 */

import { adminDb as db } from '@/lib/firebase-admin';
import type { Payment, ProcesoCanceladoConcepto } from '@/lib/data';

const SENTENCE_CONCEPT_PREFIXES = ['470-', '785-', '475-'];

/**
 * Scans for new sentence-related payments and saves them to the 'procesoscancelados' collection.
 * This function uses a collection group query and requires a corresponding index in Firestore.
 * @returns An object indicating success or failure, and the count of new processes found.
 */
export async function syncNewProcesses(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // 1. Get all existing pagoIds from procesoscancelados to avoid duplicates.
    const existingProcesosSnapshot = await db.collection('procesoscancelados').get();
    const existingPagoIds = new Set(existingProcesosSnapshot.docs.map(d => d.data().pagoId));

    // 2. Use a collection group query to efficiently fetch all payments.
    const allPagosSnapshot = await db.collectionGroup('pagos').get();
    
    let batch = db.batch();
    let newProcessesCount = 0;
    let batchCounter = 0;
    let docsScannedCounter = 0;
    const MAX_BATCH_SIZE = 499; // Firestore batches are limited to 500 operations.
    const SCAN_COMMIT_INTERVAL = 5000; // Commit after scanning this many docs to keep the function alive.

    // 3. Iterate through all found payments
    for (const pagoDoc of allPagosSnapshot.docs) {
        docsScannedCounter++;
        const pago = { id: pagoDoc.id, ...pagoDoc.data() } as Payment;
        const pensionerId = pagoDoc.ref.parent.parent!.id; // Get the parent 'pensionado' ID

        // 4. Skip if this payment has already been processed
        if (!pago.pagoId || existingPagoIds.has(pago.pagoId)) {
          continue;
        }

        // 5. Check if the payment contains any sentence-related concepts
        const sentenceConceptsInPayment = pago.detalles.filter(detail =>
          SENTENCE_CONCEPT_PREFIXES.some(prefix => detail.nombre?.startsWith(prefix))
        );

        // 6. If sentence concepts are found, create a new 'proceso cancelado' document
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
            pensionadoId: pensionerId,
            periodoPago: pago.periodoPago,
          };

          batch.set(newProcessDocRef, newProcessData);
          newProcessesCount++;
          batchCounter++;
          existingPagoIds.add(pago.pagoId); // Add to set to avoid processing duplicates in the same run
        }

        // 7. Commit batch if full, or periodically after scanning a certain number of documents.
        // This prevents the function from timing out on very large datasets.
        if (batchCounter >= MAX_BATCH_SIZE || (docsScannedCounter % SCAN_COMMIT_INTERVAL === 0 && batchCounter > 0)) {
            await batch.commit();
            batch = db.batch();
            batchCounter = 0;
        }
    }

    // 8. Commit any remaining operations in the final batch
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
