/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

// Initialize admin SDK if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

// Type definitions (copied from src/lib/data.ts to avoid import path issues)
interface PaymentDetail {
  codigo: string | null;
  nombre: string;
  ingresos: number;
  egresos: number;
}
interface Payment {
  id: string;
  pagoId: string;
  año: string;
  periodoPago: string;
  fechaProcesado: Timestamp;
  detalles: PaymentDetail[];
}
interface ProcesoCanceladoConcepto {
    codigo: string;
    egresos: number;
    ingresos: number;
    nombre: string;
}

const SENTENCE_CONCEPT_PREFIXES = ["470-", "785-", "475-"];

/**
 * Scans for new sentence-related payments and saves them to the 'procesoscancelados' collection.
 * This function is designed to be called from the client-side application.
 */
export const syncNewProcesses = onCall(async (request) => {
  // onCall functions automatically check for an authenticated user.
  // If request.auth is null, the function will throw an 'unauthenticated' error.
  if (!request.auth) {
      logger.error("Unauthenticated call to syncNewProcesses. The user must be logged in.");
      // The onCall handler will convert this to an HttpsError.
      throw new Error("unauthenticated", "The user must be logged in to perform this action.");
  }

  logger.info("Starting process synchronization for authenticated user...");
  try {
    // 1. Get all existing pagoIds from procesoscancelados to avoid duplicates.
    const existingProcesosSnapshot = await db.collection("procesoscancelados").get();
    const existingPagoIds = new Set(existingProcesosSnapshot.docs.map((d) => d.data().pagoId));
    logger.info(`Found ${existingPagoIds.size} existing processed payments.`);

    // 2. Use a collection group query to efficiently fetch all payments.
    const allPagosSnapshot = await db.collectionGroup("pagos").get();
    logger.info(`Scanning ${allPagosSnapshot.size} total payment documents.`);

    let batch = db.batch();
    let newProcessesCount = 0;
    let batchCounter = 0;
    const MAX_BATCH_SIZE = 499;

    // 3. Iterate through all found payments
    for (const pagoDoc of allPagosSnapshot.docs) {
      const pago = {id: pagoDoc.id, ...pagoDoc.data()} as Payment;
      const pensionerId = pagoDoc.ref.parent.parent!.id; // Get the parent 'pensionado' ID

      // 4. Skip if this payment has already been processed or has no pagoId
      if (!pago.pagoId || existingPagoIds.has(pago.pagoId)) {
        continue;
      }

      // 5. Check if the payment contains any sentence-related concepts
      const sentenceConceptsInPayment = pago.detalles.filter((detail) =>
        SENTENCE_CONCEPT_PREFIXES.some((prefix) => detail.nombre?.startsWith(prefix)),
      );

      // 6. If sentence concepts are found, create a new 'proceso cancelado' document
      if (sentenceConceptsInPayment.length > 0) {
        const newProcessDocRef = db.collection("procesoscancelados").doc();

        const fechaLiquidacionDate = pago.fechaProcesado?.toDate ? pago.fechaProcesado.toDate() : new Date();

        const newProcessData = {
          año: pago.año,
          conceptos: sentenceConceptsInPayment.map((c): ProcesoCanceladoConcepto => ({
            codigo: c.codigo || c.nombre?.split("-")[0] || "",
            nombre: c.nombre,
            ingresos: c.ingresos,
            egresos: c.egresos,
          })),
          creadoEn: Timestamp.now(), // Use admin SDK's Timestamp for server-side time
          fechaLiquidacion: fechaLiquidacionDate.toISOString(),
          pagoId: pago.pagoId,
          pensionadoId: pensionerId,
          periodoPago: pago.periodoPago,
        };

        batch.set(newProcessDocRef, newProcessData);
        newProcessesCount++;
        batchCounter++;
        existingPagoIds.add(pago.pagoId); // Add to set to avoid processing duplicates in the same run

        // 7. Commit batch if full to avoid exceeding limits
        if (batchCounter >= MAX_BATCH_SIZE) {
          await batch.commit();
          logger.info(`Committed a batch of ${batchCounter} new processes.`);
          batch = db.batch();
          batchCounter = 0;
        }
      }
    }

    // 8. Commit any remaining operations in the final batch
    if (batchCounter > 0) {
      await batch.commit();
      logger.info(`Committed final batch of ${batchCounter} new processes.`);
    }

    logger.info(`Synchronization complete. Found ${newProcessesCount} new processes.`);
    return {success: true, count: newProcessesCount};
  } catch (error) {
    logger.error("Error during process synchronization:", error);
    // Let the onCall handler wrap this in an HttpsError for the client
    throw new Error("An unexpected error occurred during synchronization.");
  }
});
