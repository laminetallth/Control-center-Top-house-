import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDNSxo3293qS2EhcRsGXpJ-i_16CNTAY4",
  authDomain: "crm-top-house.firebaseapp.com",
  databaseURL: "https://crm-top-house-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "crm-top-house",
  storageBucket: "crm-top-house.firebasestorage.app",
  messagingSenderId: "109863984210",
  appId: "1:109863984210:web:f9f9b23a4e76aa013b938b",
  measurementId: "G-1VMZK2CJC4"
};

// Una chiave API Firebase valida ha sempre 39 caratteri e inizia con "AIza".
// Quella qui sopra ne ha 38 (un carattere è andato perso copiandola): copia quella esatta da
// Firebase Console → ⚙ Impostazioni progetto → Generali → Le tue app → Configurazione SDK.
export const configProblem = /^AIza[0-9A-Za-z_-]{35}$/.test(firebaseConfig.apiKey)
  ? ""
  : "La chiave API Firebase del CRM è incompleta: va ricopiata da Firebase Console.";

export const app = getApps().some(x => x.name === "[DEFAULT]")
  ? getApp()
  : initializeApp(firebaseConfig);

export const db = getFirestore(app);
