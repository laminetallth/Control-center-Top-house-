import { initializeApp,getApps,getApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const config={apiKey:"AIzaSyDNSxo3293qS2EhcRsGXpJ-i_16CNTAY4",authDomain:"crm-top-house.firebaseapp.com",projectId:"crm-top-house",storageBucket:"crm-top-house.firebasestorage.app",messagingSenderId:"109863984210",appId:"1:109863984210:web:f9f9b23a4e76aa013b938b",measurementId:"G-1VMZK2CJC4"};
const app=getApps().some(x=>x.name==="[DEFAULT]")?getApp():initializeApp(config);
const auth=getAuth(app);

const messages={
"auth/invalid-credential":"Email o password non corretti.",
"auth/user-not-found":"Account non trovato.",
"auth/wrong-password":"Password non corretta.",
"auth/invalid-email":"Inserisci un indirizzo email valido.",
"auth/email-already-in-use":"Questa email è già registrata. Usa Accedi.",
"auth/weak-password":"La password deve avere almeno 6 caratteri.",
"auth/operation-not-allowed":"Accesso Email/Password non attivo in Firebase.",
"auth/user-disabled":"Questo account è stato disattivato.",
"auth/network-request-failed":"Problema di connessione. Riprova.",
"auth/too-many-requests":"Troppi tentativi. Riprova più tardi.",
"auth/unauthorized-domain":"Dominio non autorizzato in Firebase Authentication."
};

function bind(){
  const form=document.querySelector("#auth-form"), submit=document.querySelector("#auth-submit"), toggle=document.querySelector("#auth-toggle"), error=document.querySelector("#auth-error");
  if(!form||!submit||!toggle||!error)return;
  let signup=false;
  toggle.onclick=()=>{signup=!signup;submit.textContent=signup?"Crea account":"Accedi";toggle.textContent=signup?"Hai già un account? Accedi":"Non hai ancora un account? Crea account";error.textContent=""};
  form.onsubmit=async e=>{
    e.preventDefault();
    error.textContent="";
    submit.disabled=true;
    submit.textContent=signup?"Creazione...":"Accesso...";
    try{
      const email=document.querySelector("#auth-email").value.trim();
      const password=document.querySelector("#auth-password").value;
      if(signup) await createUserWithEmailAndPassword(auth,email,password);
      else await signInWithEmailAndPassword(auth,email,password);
    }catch(err){
      console.error("Auth bootstrap:",err);
      error.textContent=messages[err?.code]||("Errore Firebase: "+(err?.code||"operazione non riuscita"));
      submit.disabled=false;
      submit.textContent=signup?"Crea account":"Accedi";
    }
  };
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
onAuthStateChanged(auth,user=>{ if(user) console.log("Auth bootstrap: account autenticato"); });
