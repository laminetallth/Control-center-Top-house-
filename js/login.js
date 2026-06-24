import { auth, onAuthStateChanged, signInWithEmailAndPassword } from "./firebase-config.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorBox = document.getElementById("loginError");
const submitButton = document.getElementById("loginButton");

function showError(message) {
    errorBox.textContent = message;
    errorBox.style.display = "block";
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "index.html";
    }
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.style.display = "none";
    submitButton.disabled = true;
    submitButton.textContent = "Accesso in corso...";

    try {
        await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
        window.location.href = "index.html";
    } catch (error) {
        showError("Email o password non corretti. Controlla le credenziali e riprova.");
        submitButton.disabled = false;
        submitButton.textContent = "Accedi";
    }
});
