'use server';

import { db, storage } from '@/lib/firebase';
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Anotacion } from '@/lib/data';

const PROCESOS_COLLECTION = 'procesos';

// --- Anotaciones Management ---

export async function getAnotaciones(procesoId: string): Promise<Anotacion[]> {
    const q = query(collection(db, PROCESOS_COLLECTION, procesoId, 'anotaciones'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anotacion));
}

export async function saveAnotacion(procesoId: string, anotacion: Partial<Anotacion>, file?: File | null): Promise<void> {
    let fileUrl = anotacion.archivo_url || '';
    let fileName = anotacion.nombre_documento || '';

    if (file) {
        const storageRef = ref(storage, `anotaciones/${procesoId}/${Date.now()}_${file.name}`);
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

    const anotacionesCollectionRef = collection(db, PROCESOS_COLLECTION, procesoId, 'anotaciones');

    if (anotacion.id) {
        const docRef = doc(anotacionesCollectionRef, anotacion.id);
        await setDoc(docRef, dataToSave, { merge: true });
    } else {
        await addDoc(anotacionesCollectionRef, dataToSave);
    }
}

export async function deleteAnotacion(procesoId: string, anotacionId: string): Promise<void> {
    const docRef = doc(db, PROCESOS_COLLECTION, procesoId, 'anotaciones', anotacionId);
    await deleteDoc(docRef);
}

// --- Anexos Management ---

export async function getAnexos(procesoId: string) {
    const anexosCollectionRef = collection(db, PROCESOS_COLLECTION, procesoId, 'anexos');
    const querySnapshot = await getDocs(anexosCollectionRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addAnexo(procesoId: string, description: string, file: File): Promise<void> {
    const storageRef = ref(storage, `anexos/${procesoId}/${Date.now()}_${file.name}`);
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

    const anexosCollectionRef = collection(db, PROCESOS_COLLECTION, procesoId, 'anexos');
    await addDoc(anexosCollectionRef, anexoData);
}

export async function deleteAnexo(procesoId: string, anexoId: string): Promise<void> {
    // Note: This only deletes the Firestore record, not the file in Storage.
    // Implementing file deletion would require a Firebase Function.
    const anexoDocRef = doc(db, PROCESOS_COLLECTION, procesoId, 'anexos', anexoId);
    await deleteDoc(anexoDocRef);
}

// --- Demandantes Management ---

export async function getDemandantes(procesoId: string) {
    const collectionRef = collection(db, PROCESOS_COLLECTION, procesoId, 'demandantes');
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updateDemandante(procesoId: string, demandanteId: string, data: any): Promise<void> {
    const docRef = doc(db, PROCESOS_COLLECTION, procesoId, 'demandantes', demandanteId);
    await updateDoc(docRef, data);
}

export async function addDemandante(procesoId: string, data: any): Promise<void> {
    const collectionRef = collection(db, PROCESOS_COLLECTION, procesoId, 'demandantes');
    await addDoc(collectionRef, { num_registro: procesoId, ...data });
}

export async function deleteDemandante(procesoId: string, demandanteId: string): Promise<void> {
    const docRef = doc(db, PROCESOS_COLLECTION, procesoId, 'demandantes', demandanteId);
    await deleteDoc(docRef);
}


// --- External Data Sync ---

async function fetchExternalData(url: string): Promise<any[]> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            cache: 'no-store',
        });
        if (!response.ok) {
            console.error(`Network error for ${url}: ${response.statusText}`);
            return []; // Return empty on error
        }
        const textResponse = await response.text();
        const jsonStart = textResponse.indexOf('[');
        const jsonEnd = textResponse.lastIndexOf(']');
        if (jsonStart === -1 || jsonEnd === -1) return [];
        
        const jsonString = textResponse.substring(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error(`Error fetching or parsing from ${url}:`, error);
        return [];
    }
}

export async function getAndSyncExternalData(
    progressCallback: (message: string) => void
): Promise<{ success: boolean, data?: any, error?: string }> {
    try {
        progressCallback('Obteniendo lista de procesos...');
        const procesos = await fetchExternalData('https://appdajusticia.com/procesos.php?all=true');
        if (!Array.isArray(procesos) || procesos.length === 0) {
            return { success: false, error: 'No se pudieron obtener los procesos iniciales o la lista está vacía.' };
        }
        
        const uniqueIds = [...new Set(procesos.map(p => p.num_registro))];
        
        progressCallback(`Obteniendo detalles para ${uniqueIds.length} procesos...`);
        
        const demandantesPromises = uniqueIds.map(id => fetchExternalData(`https://appdajusticia.com/procesos.php?num_registro=${id}`).then(data => ({ key: id, data })));
        const anotacionesPromises = uniqueIds.map(id => fetchExternalData(`https://appdajusticia.com/anotaciones.php?num_registro=${id}`).then(data => ({ key: id, data })));
        const anexosPromises = uniqueIds.map(id => fetchExternalData(`https://appdajusticia.com/crud_anexos.php?num_registro=${id}`).then(data => ({ key: id, data })));
        
        const [demandantesResults, anotacionesResults, anexosResults] = await Promise.all([
            Promise.all(demandantesPromises),
            Promise.all(anotacionesPromises),
            Promise.all(anexosPromises)
        ]);

        const demandantes = Object.fromEntries(demandantesResults.map(item => [item.key, item.data]));
        const anotaciones = Object.fromEntries(anotacionesResults.map(item => [item.key, item.data]));
        const anexos = Object.fromEntries(anexosResults.map(item => [item.key, item.data]));

        return { success: true, data: { procesos, demandantes, anotaciones, anexos } };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function saveSyncedDataToFirebase(data: any, progressCallback: (progress: { current: number, total: number }) => void): Promise<void> {
    const { procesos, demandantes, anotaciones, anexos } = data;
    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(procesos.length / BATCH_SIZE);

    for (let i = 0; i < procesos.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = procesos.slice(i, i + BATCH_SIZE);

        for (const proceso of chunk) {
            const procesoDocRef = doc(db, PROCESOS_COLLECTION, proceso.num_registro);
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
                        const itemId = item.identidad_demandante || item.auto;
                        if (itemId) {
                            const itemDocRef = doc(subCollectionRef, itemId.toString());
                            batch.set(itemDocRef, Object.fromEntries(Object.entries(item).filter(([_, v]) => v != null)));
                        }
                    });
                }
            }
        }
        await batch.commit();
        progressCallback({ current: (i / BATCH_SIZE) + 1, total: totalBatches });
        await new Promise(resolve => setTimeout(resolve, 50)); // Avoid overwhelming Firestore
    }
}
