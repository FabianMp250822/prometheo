'use server';

interface FetchOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  cache?: RequestCache;
}

const API_URL = 'https://appdajusticia.com/procesos.php';

// Helper para hacer fetch con manejo de errores y user-agent
async function fetchFromApi(endpoint: string, options: FetchOptions = {}) {
    const { method = 'GET', headers = {}, body, cache = 'no-store' } = options;

    const defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        ...headers,
    };
    
    if (method === 'POST') {
        defaultHeaders['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers: defaultHeaders,
            body,
            cache,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error en la respuesta de la red: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`Error en la respuesta de la red: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.error) {
             throw new Error(`Error de la API: ${data.error}`);
        }
        return data;

    } catch (e: any) {
        console.error(`Error al hacer fetch a ${API_URL}${endpoint}:`, e);
        throw e;
    }
}

export async function getDemandantesByRegistro(num_registro: string): Promise<any> {
    if (!num_registro) {
        throw new Error('El número de registro es requerido.');
    }
    return fetchFromApi(`?num_registro=${num_registro}`);
}

export async function addDemandante(body: any): Promise<any> {
    if (!body) {
        throw new Error('El cuerpo de la solicitud es requerido.');
    }
    return fetchFromApi('', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
