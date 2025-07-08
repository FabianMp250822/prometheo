import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

// Initialize admin SDK if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

// Define the prefixes for the legal concepts we're interested in.
const SENTENCE_CONCEPT_PREFIXES = ["470-", "785-", "475-"];

/**
 * A Cloud Function that triggers when a new payment is created.
 * It checks for specific legal concepts within the payment details and,
 * if found, creates a corresponding document in the 'procesoscancelados'
 * collection.
 */
export const onNewPaymentCreate = functions.firestore
  .document("pensionados/{pensionadoId}/pagos/{pagoId}")
  .onCreate(async (snap, context) => {
    const paymentData = snap.data();
    const {pensionadoId} = context.params;

    if (!paymentData || !paymentData.detalles) {
      logger.info(
        `Payment ${snap.id} has no data or 'detalles' field. Exiting.`
      );
      return null;
    }

    // Filter for details that match our sentence concepts.
    const sentenceConcepts = paymentData.detalles.filter((detail: any) =>
      SENTENCE_CONCEPT_PREFIXES.some((prefix) =>
        detail.nombre?.startsWith(prefix),
      ),
    );

    // If no sentence-related concepts are found, do nothing.
    if (sentenceConcepts.length === 0) {
      logger.info(`No sentence concepts in payment ${snap.id}. Exiting.`);
      return null;
    }

    logger.info(
      `Found ${sentenceConcepts.length} sentence concepts in payment ${snap.id}.`
    );

    const newProcessDocRef = db.collection("procesoscancelados").doc();

    const fechaLiquidacionDate = paymentData.fechaProcesado?.toDate ?
      paymentData.fechaProcesado.toDate() :
      new Date();

    const newProcessData = {
      año: paymentData.año,
      conceptos: sentenceConcepts.map((c: any) => ({
        codigo: c.codigo || c.nombre?.split("-")[0] || "",
        nombre: c.nombre,
        ingresos: c.ingresos || 0,
        egresos: c.egresos || 0,
      })),
      creadoEn: Timestamp.now(),
      fechaLiquidacion: fechaLiquidacionDate.toISOString(),
      pagoId: paymentData.pagoId || snap.id,
      pensionadoId: pensionadoId,
      periodoPago: paymentData.periodoPago,
    };

    try {
      await newProcessDocRef.set(newProcessData);
      logger.info(
        `Created 'procesocancelado' doc ${newProcessDocRef.id} for pmt ${snap.id}.`
      );
      return {success: true, newDocId: newProcessDocRef.id};
    } catch (error) {
      logger.error(
        `Error creating 'procesocancelado' doc for pmt ${snap.id}:`,
        error,
      );
      return Promise.reject(error);
    }
  });
