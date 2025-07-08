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
 */
export async function syncNewProcesses(): Promise<{ success: boolean; count: number; error?: string }> {
    console.log("Starting chunked process synchronization for year 2025 from server action...");

    try {
        const existingProcesosSnapshot = await adminDb
            .collection("procesoscancelados")
            .get();
        const existingPagoIds = new Set(
            existingProcesosSnapshot.docs.map((d) => d.data().pagoId)
        );
        console.log(`Found ${existingPagoIds.size} existing processed payments.`);

        let lastVisible: FirebaseFirestore.DocumentSnapshot | null = null;
        let totalNewProcessesCount = 0;
        let chunksProcessed = 0;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            console.log(`Processing chunk #${chunksProcessed + 1}...`);
            
            let query = adminDb.collectionGroup("pagos")
                .orderBy(FieldPath.documentId())
                .limit(READ_CHUNK_SIZE);

            if (lastVisible) {
                query = query.startAfter(lastVisible);
            }

            const pagosChunkSnapshot = await query.get();

            if (pagosChunkSnapshot.empty) {
                console.log("No more payment documents to process.");
                break; // Exit loop when no more documents are found
            }

            const docs = pagosChunkSnapshot.docs;
            lastVisible = docs[docs.length - 1];
            chunksProcessed++;

            let batch = adminDb.batch();
            let batchCounter = 0;

            for (const pagoDoc of docs) {
                const pago = { id: pagoDoc.id, ...pagoDoc.data() } as Payment;

                // Manually filter for year 2025 to avoid needing a composite index
                if (pago.año !== "2025") {
                    continue;
                }

                if (!pago.pagoId || existingPagoIds.has(pago.pagoId)) {
                    continue;
                }

                // Defensive check to prevent crashes on inconsistent data
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
                    const newProcessDocRef = adminDb.collection("procesoscancelados").doc();
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
                        console.log(`Committed batch of ${batchCounter} new processes.`);
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

        const finalMsg = `Sync complete. Found ${totalNewProcessesCount} new processes.`;
        console.log(finalMsg);
        return { success: true, count: totalNewProcessesCount };
    } catch (error: any) {
        console.error("Error during server action process synchronization:", error);
        return { success: false, count: 0, error: "An unexpected error occurred during synchronization." };
    }
}
