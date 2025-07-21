'use server';

import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';

// Re-usable helper function to make authenticated API requests
async function makeApiRequest(numRegistro: string, formData?: FormData) {
    const API_ENDPOINT = 'https://appdajusticia.com/crud_anexos.php';
    const url = formData ? API_ENDPOINT : `${API_ENDPOINT}?num_registro=${numRegistro}`;

    try {
        const response = await fetch(url, {
            method: formData ? 'POST' : 'GET',
            body: formData,
            // We are not setting Content-Type for FormData, browser will do it with the correct boundary
            headers: {
                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            }
        });

        if (!response.ok) {
            throw new Error(`Error de red: ${response.status} ${response.statusText}.`);
        }
        
        const text = await response.text();
        // Try to parse JSON, but if it fails, return the raw text for debugging.
        try {
            return JSON.parse(text);
        } catch (e) {
            return { error: `Respuesta no válida del servidor: ${text}` };
        }

    } catch (error: any) {
        console.error('Error en la API de anexos:', error);
        return { success: false, error: error.message || 'Error desconocido en el servidor.' };
    }
}


export async function getAnexos(numRegistro: string) {
    return makeApiRequest(numRegistro);
}

export async function addAnexo(formData: FormData) {
    formData.append('action', 'addAnexo');
    return makeApiRequest(formData.get('num_registro') as string, formData);
}

export async function deleteAnexo(auto: string) {
    const formData = new FormData();
    formData.append('action', 'deleteAnexo');
    formData.append('auto', auto);
    return makeApiRequest('', formData);
}
