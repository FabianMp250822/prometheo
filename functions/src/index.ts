'use server';
import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {initializeApp, getApps} from "firebase-admin/app";
import {
  getFirestore,
  Timestamp,
  FieldPath,
  DocumentSnapshot,
} from "firebase-admin/firestore";

// Initialize admin SDK if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

// Type definitions for clarity
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
const READ_CHUNK_SIZE = 1000; // How many payments to read from DB at a time
const MAX_BATCH_SIZE = 499; // Max items in a Firestore batch write

/**
 * Scans for new sentence-related payments and saves them to the
 * 'procesoscancelados' collection by processing payments in chunks
 * to avoid memory limits.
 */
export const syncNewProcesses = onCall(async (request) => {
  if (!request.auth) {
    logger.error(
      "Unauthenticated call to syncNewProcesses. User must be logged in."
    );
    throw new Error("The user must be logged in to perform this action.");
  }

  logger.info("Starting chunked process synchronization...");

  try {
    const existingProcesosSnapshot = await db
      .collection("procesoscancelados")
      .get();
    const existingPagoIds = new Set(
      existingProcesosSnapshot.docs.map((d) => d.data().pagoId)
    );
    logger.info(`Found ${existingPagoIds.size} existing processed payments.`);

    let lastVisible: DocumentSnapshot | null = null;
    let totalNewProcessesCount = 0;
    let chunksProcessed = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      logger.info(`Processing chunk #${chunksProcessed + 1}...`);
      let query = db.collectionGroup("pagos")
        .orderBy(FieldPath.documentId())
        .limit(READ_CHUNK_SIZE);

      if (lastVisible) {
        query = query.startAfter(lastVisible);
      }

      const pagosChunkSnapshot = await query.get();

      if (pagosChunkSnapshot.empty) {
        logger.info("No more payment documents to process.");
        break; // Exit loop when no more documents are found
      }

      const docs = pagosChunkSnapshot.docs;
      lastVisible = docs[docs.length - 1];
      chunksProcessed++;

      let batch = db.batch();
      let batchCounter = 0;

      for (const pagoDoc of docs) {
        const pago = {id: pagoDoc.id, ...pagoDoc.data()} as Payment;

        if (!pago.pagoId || existingPagoIds.has(pago.pagoId)) {
          continue;
        }

        const pensionerDocRef = pagoDoc.ref.parent.parent;
        if (!pensionerDocRef) {
          logger.warn(`Could not find parent for pagoDoc ${pagoDoc.id}`);
          continue;
        }
        const pensionerId = pensionerDocRef.id;

        const sentenceConcepts = pago.detalles.filter((detail) =>
          SENTENCE_CONCEPT_PREFIXES.some((prefix) =>
            detail.nombre?.startsWith(prefix)
          )
        );

        if (sentenceConcepts.length > 0) {
          const newProcessDocRef = db.collection("procesoscancelados").doc();
          const fechaLiquidacionDate = pago.fechaProcesado?.toDate ?
            pago.fechaProcesado.toDate() :
            new Date();

          const newProcessData = {
            año: pago.año,
            conceptos: sentenceConcepts.map((c): ProcesoCanceladoConcepto => ({
              codigo: c.codigo || c.nombre?.split("-")[0] || "",
              nombre: c.nombre,
              ingresos: c.ingresos,
              egresos: c.egresos,
            })),
            creadoEn: Timestamp.now(),
            fechaLiquidacion: fechaLiquidacionDate.toISOString(),
            pagoId: pago.pagoId,
            pensionadoId: pensionerId,
            periodoPago: pago.periodoPago,
          };

          batch.set(newProcessDocRef, newProcessData);
          batchCounter++;
          totalNewProcessesCount++;
          existingPagoIds.add(pago.pagoId);

          if (batchCounter >= MAX_BATCH_SIZE) {
            await batch.commit();
            const msg = `Committed batch of ${batchCounter} new processes.`;
            logger.info(msg);
            batch = db.batch();
            batchCounter = 0;
          }
        }
      }

      if (batchCounter > 0) {
        await batch.commit();
        const msg = `Committed final batch of ${batchCounter} for chunk.`;
        logger.info(msg);
      }
    }

    const finalMsg =
      `Sync complete. Found ${totalNewProcessesCount} new processes.`;
    logger.info(finalMsg);
    return {success: true, count: totalNewProcessesCount};
  } catch (error) {
    logger.error("Error during chunked process synchronization:", error);
    throw new Error("An unexpected error occurred during synchronization.");
  }
});
