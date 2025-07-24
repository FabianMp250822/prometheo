
'use server';

import { unstable_cache as cache } from 'next/cache';

const API_BASE_URL = 'https://apiclient.proviredcolombia.com';
const STATIC_TOKEN = 'iYmMqGfKb057z8ImmAm82ULmMgd26lelgs5BcYkOkQJgkacDljdbBbyb4Dh2pPP8';

// This function is cached to avoid requesting a new JWT on every single API call.
// The cache will hold the token for 5 hours (18000 seconds), as the token expires in 6 hours.
const getJwtToken = cache(
  async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: STATIC_TOKEN }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to get JWT: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      if (!data.token) {
        throw new Error('JWT not found in token response');
      }
      return data.token as string;
    } catch (error) {
      console.error('Error fetching JWT:', error);
      throw new Error('Could not authenticate with the external API.');
    }
  },
  ['provired_jwt_token'],
  { revalidate: 18000, tags: ['provired-auth'] } // Revalidate every 5 hours and add a tag
);

async function makeApiRequest(endpoint: string, method: string, params?: object) {
  try {
    const jwt = await getJwtToken();
    const body = JSON.stringify({ method, params });

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body,
      // Disable caching for data requests to get fresh data
      cache: 'no-store',
    });

    if (!response.ok) {
        const errorBody = await response.text();
        // Handle cases where the API might return non-JSON errors
        try {
            const errorJson = JSON.parse(errorBody);
            return { success: false, message: errorJson.message || 'Unknown API error', data: null };
        } catch {
            return { success: false, message: errorBody, data: null };
        }
    }
    
    const responseData = await response.json();
    return { success: true, message: 'Data fetched successfully', data: responseData.data };

  } catch (error: any) {
    console.error(`API request failed for endpoint ${endpoint}:`, error);
    return { success: false, message: error.message, data: null };
  }
}

// --- API Methods ---

export async function getDepartments() {
  return makeApiRequest('departament', 'getData');
}

export async function getDepartmentById(id: string) {
  return makeApiRequest('departament', 'getDataId', { IdDep: id });
}

export async function getMunicipalities() {
  return makeApiRequest('municipality', 'getData');
}

export async function getMunicipalityById(id: string) {
  return makeApiRequest('municipality', 'getDataId', { id });
}

export async function getMunicipalitiesByDepartment(departmentId: string) {
  return makeApiRequest('municipality', 'getDataIdDepto', { id: departmentId });
}

export async function getCorporations() {
  return makeApiRequest('corporation', 'getData');
}

export async function getCorporationById(id: string) {
  return makeApiRequest('corporation', 'getDataId', { id });
}

export async function getCorporationsByMunicipality(municipalityId: string) {
  return makeApiRequest('corporation', 'getDataIdMun', { id: String(municipalityId) });
}

export async function getOffices() {
  return makeApiRequest('office', 'getData');
}

export async function getOfficeById(id: string) {
  return makeApiRequest('office', 'getDataId', { id });
}

export async function getOfficesByCorporation(corporationId: string) {
  return makeApiRequest('office', 'getDataIdCorp', { id: corporationId });
}

export async function getNotifications() {
  return makeApiRequest('notification', 'getData');
}

export async function getReportNotifications() {
    return makeApiRequest('report', 'getData');
}
