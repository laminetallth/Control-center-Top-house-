# Firebase — 3 passaggi da fare una volta sola

## 1. Chiave del CRM (progetto `crm-top-house`)
La chiave in `crm/js/firebase.js` ha 38 caratteri invece di 39: per questo il login dà `auth/api-key-not-valid`.

Firebase Console → progetto **crm-top-house** → ⚙ Impostazioni progetto → Generali → **Le tue app** → app web → *Configurazione SDK*.
Copia il valore di `apiKey` e sostituiscilo in `crm/js/firebase.js` (oppure mandalo a Claude, che lo aggiorna).

## 2. Regole di sicurezza
Firebase Console → **Firestore Database → Regole** → incolla → **Pubblica**:
- progetto `crm-top-house` → contenuto di `regole-crm-top-house.rules`
- progetto `top-house-gestionale` → contenuto di `regole-gestionale.rules`

Nel file del CRM c'è l'email del titolare (`laminetall.th@gmail.com`): è l'unico account che diventa Admin al primo accesso. Se usi un'altra email, cambiala prima di pubblicare.

## 3. Registrazione libera (solo `top-house-gestionale`)
Authentication → Impostazioni → Azioni utente → disattiva **Abilita creazione (registrazione)**.
Così solo gli account creati da te in Authentication → Utenti possono entrare nel gestionale.

Nel CRM la registrazione resta attiva perché è l'Admin a creare gli accessi da **Utenti e ruoli**; chi si registra da solo non ha un profilo e non vede nulla.
