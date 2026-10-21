import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCXFh81NPGfD7VNQ2-wIvv_95YqAZzA3UU",
  authDomain: "nagarst-16040.firebaseapp.com",
  projectId: "nagarst-16040",
  storageBucket: "nagarst-16040.firebasestorage.app",
  messagingSenderId: "905215853273",
  appId: "1:905215853273:web:f36a799788874ba89a74c8",
  measurementId: "G-2SY06TRPY2"
};

// Initialize Firebase safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
