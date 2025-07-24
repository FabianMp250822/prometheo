'use server';

import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Pensioner } from '@/lib/data';

const PENSIONADOS_COLLECTION = 'pensionados';
const SEARCH_LIMIT = 15;

export async function searchPensioner(searchTerm: string): Promise<Pensioner[]> {
    if (!searchTerm || searchTerm.trim().length < 3) {
        return [];
    }

    const searchTermUpper = searchTerm.toUpperCase();

    try {
        // Query for document
        const docQuery = query(
            collection(db, PENSIONADOS_COLLECTION),
            where('documento', '>=', searchTerm),
            where('documento', '<=', searchTerm + '\uf8ff'),
            limit(SEARCH_LIMIT)
        );

        // Query for name (empleado)
        const nameQuery = query(
            collection(db, PENSIONADOS_COLLECTION),
            where('empleado', '>=', searchTermUpper),
            where('empleado', '<=', searchTermUpper + '\uf8ff'),
            limit(SEARCH_LIMIT)
        );

        const [docSnapshot, nameSnapshot] = await Promise.all([
            getDocs(docQuery),
            getDocs(nameQuery),
        ]);

        const combinedResults: Map<string, Pensioner> = new Map();

        docSnapshot.forEach(doc => {
            if (!combinedResults.has(doc.id)) {
                 combinedResults.set(doc.id, { id: doc.id, ...doc.data() } as Pensioner);
            }
        });
        
        nameSnapshot.forEach(doc => {
            if (!combinedResults.has(doc.id)) {
                combinedResults.set(doc.id, { id: doc.id, ...doc.data() } as Pensioner);
            }
        });

        return Array.from(combinedResults.values());
        
    } catch (error) {
        console.error('Error in searchPensioner server action:', error);
        // In a real app, you might want to log this error to a monitoring service
        return []; // Return empty array on error to prevent crashing the client
    }
}
