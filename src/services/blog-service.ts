
'use server';

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// Configuration for the second Firebase project (diamundia)
const diamundiaFirebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize the second Firebase app instance if it doesn't exist
const diamundiaApp = getApps().find(app => app.name === 'diamundia') || initializeApp(diamundiaFirebaseConfig, 'diamundia');
const diamundiaDb = getFirestore(diamundiaApp);

/**
 * Fetches blog articles from the 'diamundia' Firestore database
 * where the 'sitio' field is 'dajusticia'.
 * @returns A promise that resolves to an array of article objects.
 */
export async function getBlogArticles(): Promise<any[]> {
    try {
        const articlesCollection = collection(diamundiaDb, 'articles');
        const q = query(
            articlesCollection, 
            where('sitio', '==', 'dajusticia'),
            orderBy('publishedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        
        const articles = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return articles;
    } catch (error) {
        console.error("Error fetching articles from 'diamundia':", error);
        // Depending on requirements, you might want to throw the error
        // or return an empty array. Returning an empty array is safer for the UI.
        return [];
    }
}
