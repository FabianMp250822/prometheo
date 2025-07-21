'use server';

import axios from 'axios';

const API_BASE_URL = 'https://appdajusticia.com/procesos.php';

interface ApiResponse {
    success: boolean;
    data?: any[];
    error?: string;
}

// Fetch all processes
export async function getAllExternalDemands(): Promise<ApiResponse> {
    try {
        const response = await axios.get(API_BASE_URL, { params: { all: 'true' } });
        if (response.data.error) {
             return { success: false, error: `API Error: ${response.data.error}` };
        }
        return { success: true, data: response.data };
    } catch (error: any) {
        console.error("Failed to fetch all external demands:", error.message);
        return { success: false, error: 'Error de red al consultar todos los procesos: ' + error.message };
    }
}

// Fetch demandantes for a specific num_registro
export async function getDemandantesByRegistro(numRegistro: string): Promise<ApiResponse> {
    if (!numRegistro) {
        return { success: false, error: 'Número de registro no proporcionado.' };
    }
    try {
        const response = await axios.get(API_BASE_URL, { params: { num_registro: numRegistro } });
         if (response.data.error) {
            return { success: false, error: `API Error for registro ${numRegistro}: ${response.data.error}` };
        }
        return { success: true, data: response.data };
    } catch (error: any) {
        console.error(`Failed to fetch demandantes for registro ${numRegistro}:`, error.message);
        return { success: false, error: `Error de red al consultar demandantes para ${numRegistro}: ` + error.message };
    }
}

// This function is kept for conceptual similarity but is now an API health check
export async function checkDbConnection(): Promise<{ success: boolean; error?: string }> {
    // This function now checks the availability of the external API endpoint
    try {
        const response = await axios.get(API_BASE_URL, { params: { health_check: 'true' }, timeout: 5000 });
        if (response.status === 200) {
            return { success: true };
        }
        return { success: false, error: `El servicio externo respondió con estado: ${response.status}`};
    } catch (error: any) {
         return { success: false, error: 'La conexión al servicio externo falló: ' + error.message };
    }
}

export async function getExternalDemands(cedula: string): Promise<ApiResponse> {
    if (!cedula) {
        return { success: false, error: 'Cédula no proporcionada.' };
    }

    try {
        const response = await axios.get(API_BASE_URL, { params: { cedula } });
        if (response.data.error) {
            return { success: false, error: `API Error: ${response.data.error}` };
        }
        return { success: true, data: response.data };
    } catch (error: any) {
        console.error(`Failed to fetch demands for cedula ${cedula}:`, error.message);
        return { success: false, error: 'Error al consultar las demandas: ' + error.message };
    }
}
