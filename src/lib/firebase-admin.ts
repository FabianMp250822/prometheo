
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

  // In a Google Cloud environment like App Hosting, initializeApp() with no arguments
  // will automatically use the service account credentials of the environment.
  // This is the recommended approach over using environment variables for credentials.
  try {
    return initializeApp();
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Ensure you are in a supported Google Cloud environment or that Application Default Credentials are set up.');
  }
}

const adminApp = initializeAdminApp();
const adminDb = getFirestore(adminApp);
const adminStorage = getStorage(adminApp);
const adminAuth = getAuth(adminApp);

export { adminDb, adminStorage, adminAuth };
