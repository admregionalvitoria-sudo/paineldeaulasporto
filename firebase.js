
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Configuração oficial do Firebase fornecida (com fallback por variáveis de ambiente)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAtFpYzDSwbQqxvhj0FZGWXG26Ki_L7BRk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "painel-de-aulas.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "painel-de-aulas",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "painel-de-aulas.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "744292371574",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:744292371574:web:489ac7de95b515588c6357",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-KGQJSYH12H"
};

// Inicializa o app apenas uma vez
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, db, storage, auth, analytics };


