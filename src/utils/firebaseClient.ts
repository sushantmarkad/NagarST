import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCbxsoLoqqKQIORWGwMg4pJtkjYFJY3G5E",
  authDomain: "nagarst-2111f.firebaseapp.com",
  projectId: "nagarst-2111f",
  storageBucket: "nagarst-2111f.firebasestorage.app",
  messagingSenderId: "763785088493",
  appId: "1:763785088493:web:6d1b2954f0c08d8b24ebe4",
  measurementId: "G-1HFLYM8T8R"
};

// Initialize Firebase safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
