
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import firebaseAppletConfig from "./firebase-applet-config.json";

// Configuração oficial do Firebase provisionado
const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || firebaseAppletConfig.measurementId || ""
};

const databaseId = import.meta.env?.VITE_FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId || "(default)";

// Inicializa o app apenas uma vez
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = databaseId && databaseId !== "(default)" ? getFirestore(app, databaseId) : getFirestore(app);
const storage = getStorage(app);
const analytics = typeof window !== 'undefined' && firebaseConfig.measurementId ? getAnalytics(app) : null;

export { app, auth, db, storage, analytics, firebaseConfig, databaseId };


