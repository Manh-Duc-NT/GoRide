import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCu1wYox7aCigo7GuvAi9y8K7FbNABomVw",
  authDomain: "tutorial-ac26c.firebaseapp.com",
  databaseURL: "https://tutorial-ac26c-default-rtdb.firebaseio.com",
  projectId: "tutorial-ac26c",
  storageBucket: "tutorial-ac26c.appspot.com",
  messagingSenderId: "94313690600",
  appId: "1:94313690600:web:14d253a6d0da83fc98e05d",
  measurementId: "G-RR0P0FD4GM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage }; 