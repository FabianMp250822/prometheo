
'use server';

import { adminDb } from '@/lib/firebase-admin'; // Use the admin SDK for server-side operations
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { clientDb, clientStorage } from '@/lib/firebase'; // Keep client SDK for specific needs if any, or remove
import { 
    collection, 
    getDocs, 
    doc, 
    deleteDoc, 
    addDoc, 
    setDoc, 
    updateDoc,
    query,
    writeBatch
} from 'firebase/firestore';
import type { Anotacion } from '@/lib/data';

const PROCESOS_COLLECTION = 'procesos';

// --- Anotaciones Management ---

export async function getAnotaciones(procesoId: string): Promise<Anotacion[]> {
    const q = query(collection(adminDb, PROCESOS_COLLECTION, procesoId, 'anotaciones'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anotacion));
}

export async function saveAnotacion(procesoId: string, anotacion: Partial<Anotacion>, file?: File | null): Promise<void> {
    let fileUrl = anotacion.archivo_url || '';
    let fileName = anotacion.nombre_documento || '';

    if (file) {
        // For file uploads from server actions, you might still use the client storage SDK instance
        // if the action is triggered from a client component that provides the file.
        const storageRef = ref(clientStorage, `anotaciones/${procesoId}/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(uploadResult.ref);
        fileName = file.name;
    }

    const dataToSave = {
        ...anotacion,
        num_registro: procesoId,
        archivo_url: fileUrl,
        nombre_documento: fileName,
    };

    const anotacionesCollectionRef = collection(adminDb, PROCESOS_COLLECTION, procesoId, 'anotaciones');

    if (anotacion.id) {
        const docRef = doc(anotacionesCollectionRef, anotacion.id);
        await setDoc(docRef, dataToSave, { merge: true });
    } else {
        await addDoc(anotacionesCollectionRef, dataToSave);
    }
}

export async function deleteAnotacion(procesoId: string, anotacionId: string): Promise<void> {
    const docRef = doc(adminDb, PROCESOS_COLLECTION, procesoId, 'anotaciones', anotacionId);
    await deleteDoc(docRef);
}

// --- Anexos Management ---

export async function getAnexos(procesoId: string) {
    const anexosCollectionRef = collection(adminDb, PROCESOS_COLLECTION, procesoId, 'anexos');
    const querySnapshot = await getDocs(anexosCollectionRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addAnexo(procesoId: string, description: string, file: File): Promise<void> {
    const storageRef = ref(clientStorage, `anexos/${procesoId}/${Date.now()}_${file.name}`);
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(uploadResult.ref);

    const anexoData = {
        num_registro: procesoId,
        nombre_documento: file.name,
        descripccion: description,
        tipo_archivo: file.type,
        ruta_archivo: downloadURL,
        fecha_subida: new Date().toISOString(),
    };

    const anexosCollectionRef = collection(adminDb, PROCESOS_COLLECTION, procesoId, 'anexos');
    await addDoc(anexosCollectionRef, anexoData);
}

export async function deleteAnexo(procesoId: string, anexoId: string): Promise<void> {
    // Note: This only deletes the Firestore record, not the file in Storage.
    // Implementing file deletion would require a Firebase Function.
    const anexoDocRef = doc(adminDb, PROCESOS_COLLECTION, procesoId, 'anexos', anexoId);
    await deleteDoc(anexoDocRef);
}

// --- Demandantes Management ---

export async function getDemandantes(procesoId: string) {
    const collectionRef = collection(adminDb, PROCESOS_COLLECTION, procesoId, 'demandantes');
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updateDemandante(procesoId: string, demandanteId: string, data: any): Promise<void> {
    const docRef = doc(adminDb, PROCESOS_COLLECTION, procesoId, 'demandantes', demandanteId);
    await updateDoc(docRef, data);
}

export async function addDemandante(procesoId: string, data: any): Promise<void> {
    const collectionRef = collection(adminDb, PROCESOS_COLLECTION, procesoId, 'demandantes');
    await addDoc(collectionRef, { num_registro: procesoId, ...data });
}

export async function deleteDemandante(procesoId: string, demandanteId: string): Promise<void> {
    const docRef = doc(adminDb, PROCESOS_COLLECTION, procesoId, 'demandantes', demandanteId);
    await deleteDoc(docRef);
}

// --- Sync to Firebase Logic ---
// This function remains a Server Action because it's called from a Cloud Function, not the client.
export async function saveSyncedDataToFirebase(data: any, progressCallback: (progress: { current: number, total: number }) => void): Promise<void> {
    const { procesos, demandantes, anotaciones, anexos } = data;
    const BATCH_SIZE = 400; // Firestore batch writes are limited to 500 operations.
    const totalBatches = Math.ceil(procesos.length / BATCH_SIZE);

    for (let i = 0; i < procesos.length; i += BATCH_SIZE) {
        const batch = writeBatch(adminDb);
        const chunk = procesos.slice(i, i + BATCH_SIZE);

        for (const proceso of chunk) {
            if (!proceso.num_registro) continue; // Skip if no ID
            const procesoDocRef = doc(adminDb, PROCESOS_COLLECTION, proceso.num_registro);
            batch.set(procesoDocRef, Object.fromEntries(Object.entries(proceso).filter(([_, v]) => v != null)));

            // Add subcollections
            const subCollections = {
                demandantes: demandantes[proceso.num_registro],
                anotaciones: anotaciones[proceso.num_registro],
                anexos: anexos[proceso.num_registro],
            };

            for (const [key, items] of Object.entries(subCollections)) {
                if (items && Array.isArray(items) && items.length > 0) {
                    const subCollectionRef = collection(procesoDocRef, key);
                    items.forEach(item => {
                        const itemId = item.identidad_demandante || item.auto || item.id_anexo;
                        if (itemId) {
                            const itemDocRef = doc(subCollectionRef, itemId.toString());
                            batch.set(itemDocRef, Object.fromEntries(Object.entries(item).filter(([_, v]) => v != null)));
                        }
                    });
                }
            }
        }
        await batch.commit();
        // Progress callback can't be called from the client, this would need a different mechanism
        // like writing progress to Firestore and listening for changes on the client.
        // For now, we remove the callback to fix the immediate error.
        // progressCallback({ current: Math.floor(i / BATCH_SIZE) + 1, total: totalBatches });
        await new Promise(resolve => setTimeout(resolve, 50)); // Avoid overwhelming Firestore
    }
}
