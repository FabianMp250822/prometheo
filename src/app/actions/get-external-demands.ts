'use server';

import { adminDb } from '@/lib/firebase-admin';
import * as adminFirestore from 'firebase-admin/firestore';

const API_URL = 'https://appdajusticia.com/procesos.php';

// Helper para hacer fetch con manejo de errores y user-agent
async function fetchExternalData(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });
        if (!response.ok) {
            throw new Error(`Error en la respuesta de la red: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.error) {
             throw new Error(`Error de la API: ${data.error}`);
        }
        return data;
    } catch (e: any) {
        console.error(`Error al hacer fetch a ${url}:`, e);
        throw e;
    }
}


export async function getExternalDemands(): Promise<{
  success: boolean;
  procesos?: any[];
  demandantes?: { [key: string]: any[] };
  error?: string;
}> {
  try {
    // 1. Fetch all processes
    const procesosData = await fetchExternalData(`${API_URL}?all=true`);
    if (!Array.isArray(procesosData)) {
      return { success: false, error: 'La respuesta de la API de procesos no es un array válido.' };
    }

    // 2. Fetch demandantes for each process
    const registrosUnicos = [...new Set(procesosData.map((p: any) => p.num_registro))];
    const demandantesData: { [key: string]: any[] } = {};
    
    // Usamos Promise.all para ejecutar las peticiones en paralelo para mayor eficiencia
    await Promise.all(
        registrosUnicos.map(async (numRegistro) => {
             try {
                const res = await fetchExternalData(`${API_URL}?num_registro=${numRegistro}`);
                if (res && !res.error && Array.isArray(res)) {
                    demandantesData[numRegistro] = res;
                } else {
                    demandantesData[numRegistro] = [];
                }
             } catch (e) {
                console.warn(`No se pudieron cargar demandantes para el registro ${numRegistro}`, e);
                demandantesData[numRegistro] = [];
             }
        })
    );
    
    return { success: true, procesos: procesosData, demandantes: demandantesData };

  } catch (err: any) {
    console.error('Fallo al obtener datos externos:', err);
    return {
      success: false,
      error: `Error al conectar con el servicio externo: ${err.message}. Por favor, verifique que el servicio esté disponible.`,
    };
  }
}
