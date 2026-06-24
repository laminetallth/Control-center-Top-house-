import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBIeD4OhruGkqV_vO2136XOoWagzNMZR78",
    authDomain: "top-house-gestionale.firebaseapp.com",
    projectId: "top-house-gestionale",
    storageBucket: "top-house-gestionale.firebasestorage.app",
    messagingSenderId: "909636434842",
    appId: "1:909636434842:web:b945ad66da29214923d823"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
    app,
    auth,
    db,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    collection,
    doc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy
};
