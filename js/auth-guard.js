import { auth, onAuthStateChanged } from "./firebase-config.js";

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    window.topHouseCurrentUser = user;
    window.dispatchEvent(new CustomEvent("topHouseAuthReady", { detail: { user } }));

    const userEmailSlot = document.getElementById("userEmail");
    if (userEmailSlot) {
        userEmailSlot.textContent = user.email || "Utente autenticato";
    }
});
