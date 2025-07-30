
import { initializeApp, getApps, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

// This function ensures we initialize the app only once.
function initializeAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  // Check if service account environment variables are set
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };
    
    return initializeApp({
      credential: cert(serviceAccount),
    });
  }
  
  // Fallback for environments with Application Default Credentials (like App Hosting)
  try {
    return initializeApp();
  } catch (error) {
    console.error('Firebase admin initialization error', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Ensure service account credentials are set or you are in a supported environment.');
  }
}

const adminApp = initializeAdminApp();
const adminDb = getFirestore(adminApp);
const adminStorage = getStorage(adminApp);
const adminAuth = getAuth(adminApp);

export { adminDb, adminStorage, adminAuth };
