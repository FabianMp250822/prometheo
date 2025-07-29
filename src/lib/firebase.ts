import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};

// This function ensures we only initialize the app once on the client-side.
const getClientApp = (): FirebaseApp => {
    if (getApps().length) {
        return getApp();
    }
    return initializeApp(firebaseConfig);
};

const clientApp = getClientApp();
const clientDb = getFirestore(clientApp);
const clientAuth = getAuth(clientApp);
const clientStorage = getStorage(clientApp);

// Re-exporting with 'app' for backward compatibility in some files if needed,
// but using more descriptive names is better.
export { clientApp as app, clientDb as db, clientAuth as auth, clientStorage as storage };

// Also exporting the named client versions for clarity in new code.
export { clientApp, clientDb, clientAuth, clientStorage };
