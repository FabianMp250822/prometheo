'use server';

import { adminDb } from '@/lib/firebase-admin';

/**
 * Guarda los procesos y sus demandantes en la base de datos de Firebase.
 * @param procesos - Un array de objetos de proceso.
 * @param demandantes - Un objeto donde las claves son `num_registro` y los valores son arrays de demandantes.
 * @returns Un objeto indicando el éxito, el número de procesos guardados o un mensaje de error.
 */
export async function saveProcessesToFirebase(
  procesos: any[],
  demandantes: { [key: string]: any[] }
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!procesos || procesos.length === 0) {
    return { success: false, count: 0, error: 'No hay procesos para guardar.' };
  }

  const batch = adminDb.batch();
  const procesosCollection = adminDb.collection('procesos');

  try {
    procesos.forEach(proceso => {
      // Usamos num_registro como ID del documento para evitar duplicados.
      const procesoDocRef = procesosCollection.doc(proceso.num_registro);
      
      // Limpiamos el objeto proceso para no guardar undefined o null
      const procesoData = Object.fromEntries(
        Object.entries(proceso).filter(([_, v]) => v != null)
      );

      batch.set(procesoDocRef, procesoData);

      // Guardar demandantes en una subcolección
      const demandantesDeProceso = demandantes[proceso.num_registro];
      if (demandantesDeProceso && demandantesDeProceso.length > 0) {
        const demandantesSubCollection = procesoDocRef.collection('demandantes');
        demandantesDeProceso.forEach(demandante => {
          // Usamos identidad_demandante como ID del documento para evitar duplicados.
          if (demandante.identidad_demandante) {
            const demandanteDocRef = demandantesSubCollection.doc(demandante.identidad_demandante);
            
             const demandanteData = Object.fromEntries(
                Object.entries(demandante).filter(([_, v]) => v != null)
             );

            batch.set(demandanteDocRef, demandanteData);
          }
        });
      }
    });

    await batch.commit();

    return { success: true, count: procesos.length };
  } catch (error: any) {
    console.error('Error al guardar procesos en Firebase:', error);
    return { success: false, count: 0, error: `Error de Firestore: ${error.message}` };
  }
}
