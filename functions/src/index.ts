import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

// Initialize admin SDK if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

// Type definitions to avoid import path issues in Firebase Functions
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
 * Scans for new sentence-related payments and saves them to the
 * 'procesoscancelados' collection.
 */
export const syncNewProcesses = onCall(async (request) => {
  if (!request.auth) {
    logger.error(
      "Unauthenticated call to syncNewProcesses. User must be logged in."
    );
    throw new Error(
      "unauthenticated",
      "The user must be logged in to perform this action."
    );
  }

  logger.info("Starting process synchronization for authenticated user...");
  try {
    const existingProcesosSnapshot = await db
      .collection("procesoscancelados")
      .get();
    const existingPagoIds = new Set(
      existingProcesosSnapshot.docs.map((d) => d.data().pagoId)
    );
    logger.info(`Found ${existingPagoIds.size} existing processed payments.`);

    const allPagosSnapshot = await db.collectionGroup("pagos").get();
    logger.info(`Scanning ${allPagosSnapshot.size} total payment documents.`);

    let batch = db.batch();
    let newProcessesCount = 0;
    let batchCounter = 0;
    const MAX_BATCH_SIZE = 499;

    for (const pagoDoc of allPagosSnapshot.docs) {
      const pago = {id: pagoDoc.id, ...pagoDoc.data()} as Payment;

      const pensionerDocRef = pagoDoc.ref.parent.parent;
      if (!pensionerDocRef) {
        logger.warn(`Could not find parent for pagoDoc ${pagoDoc.id}`);
        continue;
      }
      const pensionerId = pensionerDocRef.id;

      if (!pago.pagoId || existingPagoIds.has(pago.pagoId)) {
        continue;
      }

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
        newProcessesCount++;
        batchCounter++;
        existingPagoIds.add(pago.pagoId);

        if (batchCounter >= MAX_BATCH_SIZE) {
          await batch.commit();
          logger.info(`Committed a batch of ${batchCounter} new processes.`);
          batch = db.batch();
          batchCounter = 0;
        }
      }
    }

    if (batchCounter > 0) {
      await batch.commit();
      logger.info(`Committed final batch of ${batchCounter} new processes.`);
    }

    logger.info(
      `Synchronization complete. Found ${newProcessesCount} new processes.`
    );
    return {success: true, count: newProcessesCount};
  } catch (error) {
    logger.error("Error during process synchronization:", error);
    throw new Error("An unexpected error occurred during synchronization.");
  }
});