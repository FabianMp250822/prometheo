
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// This function ensures we initialize the app only once.
function initializeAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  try {
    // When running in a Google Cloud environment (like App Hosting),
    // initializeApp() with no arguments automatically uses Application
    // Default Credentials.
    return initializeApp();
  } catch (error) {
    console.error('Firebase admin initialization error', error);
    // Re-throw the error to make it clear that initialization failed.
    throw new Error('Failed to initialize Firebase Admin SDK');
  }
}

const adminApp = initializeAdminApp();
const adminDb = getFirestore(adminApp);
const adminStorage = getStorage(adminApp);

export { adminDb, adminStorage };
