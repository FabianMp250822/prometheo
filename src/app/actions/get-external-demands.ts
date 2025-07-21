'use server';

// This action is kept for potential future use or debugging but is no longer
// the primary method for fetching data in the 'gestion-demandas' page.
// The data fetching logic for the page is now handled client-side
// with direct reads from Firebase for performance and cost optimization.

async function fetchExternalData(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            cache: 'no-store', // Avoid caching responses from the external server
        });

        if (!response.ok) {
            throw new Error(`Error de red: ${response.status} ${response.statusText}`);
        }
        
        const textResponse = await response.text();
        // Attempt to clean the response by finding the start of the JSON array
        const jsonStartIndex = textResponse.indexOf('[');
        if (jsonStartIndex === -1) {
             throw new Error("La respuesta de la API no contiene un array JSON válido.");
        }
        const cleanedJsonString = textResponse.substring(jsonStartIndex);
        
        return JSON.parse(cleanedJsonString);

    } catch (error: any) {
        console.error(`Error fetching from ${url}:`, error);
        // Return an empty array on error to allow the process to continue
        return [];
    }
}

export async function getExternalDemands(): Promise<{
  success: boolean;
  procesos?: any[];
  demandantes?: { [key: string]: any[] };
  anotaciones?: { [key: string]: any[] };
  anexos?: { [key: string]: any[] };
  error?: string;
}> {
  try {
    const procesos = await fetchExternalData('https://appdajusticia.com/procesos.php?all=true');

    if (!Array.isArray(procesos) || procesos.length === 0) {
      return { success: false, error: 'No se pudieron obtener los procesos iniciales o la lista está vacía.' };
    }
    
    const registrosUnicos = [...new Set(procesos.map((p: any) => p.num_registro))];

    const demandantesPromises = registrosUnicos.map(num => fetchExternalData(`https://appdajusticia.com/procesos.php?num_registro=${num}`).then(data => ({key: num, data})));
    const anotacionesPromises = registrosUnicos.map(num => fetchExternalData(`https://appdajusticia.com/anotaciones.php?num_registro=${num}`).then(data => ({key: num, data})));
    const anexosPromises = registrosUnicos.map(num => fetchExternalData(`https://appdajusticia.com/crud_anexos.php?num_registro=${num}`).then(data => ({key: num, data})));
    
    const demandantesResults = await Promise.all(demandantesPromises);
    const anotacionesResults = await Promise.all(anotacionesPromises);
    const anexosResults = await Promise.all(anexosPromises);

    const demandantes = Object.fromEntries(demandantesResults.map(item => [item.key, item.data]));
    const anotaciones = Object.fromEntries(anotacionesResults.map(item => [item.key, item.data]));
    const anexos = Object.fromEntries(anexosResults.map(item => [item.key, item.data]));

    return { success: true, procesos, demandantes, anotaciones, anexos };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
