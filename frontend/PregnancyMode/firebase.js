import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your exact Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAUG5yVfgc9ir5l0ii282DfMyxdIi-6l8",
  authDomain: "lunaclip-be678.firebaseapp.com",
  projectId: "lunaclip-be678",
  storageBucket: "lunaclip-be678.firebasestorage.app",
  messagingSenderId: "1009505384308",
  appId: "1:1009505384308:web:30de404767ca57d6aa5e21",
  measurementId: "G-QZF2QWL6HC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Authentication and Firestore so the rest of the app can use them
export const auth = getAuth(app);
export const db = getFirestore(app);