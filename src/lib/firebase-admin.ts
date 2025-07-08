import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// This ensures we initialize the app only once, which is crucial in a
// server environment where modules can be re-evaluated.
if (getApps().length === 0) {
  try {
    // When running in a Google Cloud environment, Application Default Credentials
    // are automatically discovered. When called with no arguments, the Admin SDK
    // will automatically use the project's service account.
    initializeApp();
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

// getFirestore() will use the default app that has been initialized.
const adminDb = getFirestore();

export { adminDb };
