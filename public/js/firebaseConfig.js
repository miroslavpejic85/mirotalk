// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB_Aq6mTX8SzN5nvXdT69cxPwOqTcNkAdc",
  authDomain: "williamai-2025.firebaseapp.com",
  projectId: "williamai-2025",
  storageBucket: "williamai-2025.firebasestorage.app",
  messagingSenderId: "203066635498",
  appId: "1:203066635498:web:c49c9c6bc64f9b034bd393"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();