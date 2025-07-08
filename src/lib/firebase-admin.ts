import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // When running in a Google Cloud environment, Application Default Credentials
    // are automatically discovered. When called with no arguments, the Admin SDK
    // will automatically use the project's service account.
    admin.initializeApp();
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminDb = admin.firestore();
