
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

  const credentialString = process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (!credentialString) {
      throw new Error('La variable de entorno FIREBASE_ADMIN_CREDENTIALS no está definida.');
  }

  try {
    const serviceAccount: ServiceAccount = JSON.parse(credentialString);
    
    return initializeApp({
      credential: cert(serviceAccount)
    });

  } catch (error) {
    console.error('Error al parsear las credenciales de Firebase o al inicializar la app:', error);
    throw new Error('Las credenciales de Firebase Admin no tienen un formato JSON válido.');
  }
}

const adminApp = initializeAdminApp();
const adminDb = getFirestore(adminApp);
const adminStorage = getStorage(adminApp);
const adminAuth = getAuth(adminApp);

export { adminDb, adminStorage, adminAuth };
