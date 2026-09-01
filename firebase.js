
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Configuração oficial do Firebase fornecida
const firebaseConfig = {
  apiKey: "AIzaSyAtFpYzDSwbQqxvhj0FZGWXG26Ki_L7BRk",
  authDomain: "painel-de-aulas.firebaseapp.com",
  projectId: "painel-de-aulas",
  storageBucket: "painel-de-aulas.firebasestorage.app",
  messagingSenderId: "744292371574",
  appId: "1:744292371574:web:489ac7de95b515588c6357",
  measurementId: "G-KGQJSYH12H"
};

// Inicializa o app apenas uma vez
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, db, storage, analytics };

