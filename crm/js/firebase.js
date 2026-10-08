import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
const firebaseConfig={apiKey:"AIzaSyDNSxo3293qS2EhcRsEhGXpJ-i_16CNTAYj4",authDomain:"crm-top-house.firebaseapp.com",projectId:"crm-top-house",storageBucket:"crm-top-house.firebasestorage.app",messagingSenderId:"109863984210",appId:"1:109863984210:web:f9f9b23a4e76aa013b938b",measurementId:"G-1VMZK2CJC4"};
const app=initializeApp(firebaseConfig);export const auth=getAuth(app);export const db=getFirestore(app);