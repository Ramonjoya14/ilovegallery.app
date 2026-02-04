import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
// Note: For Firebase Web SDK, these keys are designed to be public
// Security is enforced through Firestore and Storage Security Rules
const firebaseConfig = {
    projectId: "instaroll-2026",
    appId: "1:402998744302:web:fdfa52114047312fb10fff",
    storageBucket: "instaroll-2026.firebasestorage.app",
    apiKey: "AIzaSyBSxs4jQnHDFcnCMuR9RBwY9IGTBn4eeSU",
    authDomain: "instaroll-2026.firebaseapp.com",
    messagingSenderId: "402998744302",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence for React Native
// Using initializeAuth instead of getAuth to specify persistence
const authConfig: any = {};
if (typeof getReactNativePersistence === 'function') {
    authConfig.persistence = getReactNativePersistence(AsyncStorage);
}

export const auth = initializeAuth(app, authConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
