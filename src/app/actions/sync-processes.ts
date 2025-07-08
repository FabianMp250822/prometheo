'use server';

import { adminDb } from '@/lib/firebase-admin';
import { FieldPath, Timestamp } from 'firebase-admin/firestore';
import type { Payment, ProcesoCanceladoConcepto } from '@/lib/data';

const SENTENCE_CONCEPT_PREFIXES = ['470-', '785-', '475-'];
const READ_CHUNK_SIZE = 100;
const MAX_BATCH_SIZE = 499;

/**
 * Scans for new sentence-related payments for the year 2025 and saves them
 * to the 'procesoscancelados' collection. This server action processes
 * payments in chunks to avoid memory limits and timeouts.
 * This version uses idempotent writes and filters by year at the query level,
 * which requires a Firestore index for performance.
 */
export async function syncNewProcesses(): Promise<{ success: boolean; count: number; error?: string }> {
    console.log("Starting idempotent process synchronization for year 2025 from server action...");

    try {
        let lastVisible: FirebaseFirestore.DocumentSnapshot | null = null;
        let totalProcessesProcessedCount = 0;
        let chunksProcessed = 0;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            console.log(`Processing chunk #${chunksProcessed + 1}...`);
            
            // This query now filters by year. It REQUIRES a composite index in Firestore.
            // If the index is missing, this will throw a FAILED_PRECONDITION error.
            // The Firebase console logs will provide a direct link to create the index.
            let query = adminDb.collectionGroup("pagos")
                .where("año", "==", "2025")
                .orderBy(FieldPath.documentId())
                .limit(READ_CHUNK_SIZE);

            if (lastVisible) {
                query = query.startAfter(lastVisible);
            }

            const pagosChunkSnapshot = await query.get();

            if (pagosChunkSnapshot.empty) {
                console.log("No more payment documents to process for 2025.");
                break; // Exit loop when no more documents are found
            }

            const docs = pagosChunkSnapshot.docs;
            lastVisible = docs[docs.length - 1];
            chunksProcessed++;

            let batch = adminDb.batch();
            let batchCounter = 0;

            for (const pagoDoc of docs) {
                const pago = { id: pagoDoc.id, ...pagoDoc.data() } as Payment;

                if (!pago.pagoId) {
                    continue;
                }

                if (!pago.detalles || !Array.isArray(pago.detalles)) {
                    console.warn(`Skipping payment ${pagoDoc.id} due to missing or invalid 'detalles' field.`);
                    continue;
                }

                const pensionerDocRef = pagoDoc.ref.parent.parent;
                if (!pensionerDocRef) {
                    console.warn(`Could not find parent for pagoDoc ${pagoDoc.id}`);
                    continue;
                }
                const pensionerId = pensionerDocRef.id;

                const sentenceConcepts = pago.detalles.filter((detail) =>
                    SENTENCE_CONCEPT_PREFIXES.some((prefix) =>
                        detail.nombre?.startsWith(prefix)
                    )
                );

                if (sentenceConcepts.length > 0) {
                    const newProcessDocRef = adminDb.collection("procesoscancelados").doc(pago.pagoId);
                    
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

                    batch.set(newProcessDocRef, newProcessData, { merge: true });
                    batchCounter++;
                    totalProcessesProcessedCount++;

                    if (batchCounter >= MAX_BATCH_SIZE) {
                        await batch.commit();
                        console.log(`Committed batch of ${batchCounter} processes.`);
                        batch = adminDb.batch();
                        batchCounter = 0;
                    }
                }
            }

            if (batchCounter > 0) {
                await batch.commit();
                console.log(`Committed final batch of ${batchCounter} for chunk.`);
            }
        }

        const finalMsg = `Sync complete. Processed ${totalProcessesProcessedCount} sentence payments for 2025.`;
        console.log(finalMsg);
        return { success: true, count: totalProcessesProcessedCount };
    } catch (error: any) {
        console.error("Error during server action process synchronization:", error);
        
        // Specifically check for the FAILED_PRECONDITION error which indicates a missing index.
        if (error.code === 'failed-precondition' || (error.message && error.message.includes('FAILED_PRECONDITION'))) {
             const detailedError = "La consulta falló porque falta un índice en Firestore. Revisa los logs de Firebase (Cloud Run) para encontrar un enlace y crear el índice automáticamente.";
            return { success: false, count: 0, error: detailedError };
        }
        
        return { success: false, count: 0, error: "An unexpected error occurred during synchronization." };
    }
}
