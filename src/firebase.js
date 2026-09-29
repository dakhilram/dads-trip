import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCoGHeXbCz4jAHttLtmeFkA9RPql8TL_3k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dads-trip.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dads-trip",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dads-trip.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "317327996402",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:317327996402:web:40cbba252736a97b0e276b",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
