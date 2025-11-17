import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCoGHeXbCz4jAHttLtmeFkA9RPql8TL_3k",
  authDomain: "dads-trip.firebaseapp.com",
  projectId: "dads-trip",
  storageBucket: "dads-trip.firebasestorage.app",
  messagingSenderId: "317327996402",
  appId: "1:317327996402:web:40cbba252736a97b0e276b"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);