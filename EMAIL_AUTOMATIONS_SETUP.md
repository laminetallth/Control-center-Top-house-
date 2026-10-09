# TOP HOUSE CRM — automazioni email senza Firebase Blaze

Questa versione usa GitHub Actions come esecutore programmato, Firebase/Firestore come archivio e Brevo per l'invio. **Non richiede Cloud Functions né l'upgrade Firebase Blaze.** GitHub Actions controlla gli eventi ogni ora; una richiesta di benvenuto viene presa in carico al prossimo controllo.

## Funzioni previste
- Pulsante CRM **Invia benvenuto**: mette in coda l'invio, senza esporre la chiave Brevo nel browser.
- Auguri automatici il giorno del compleanno inserito nel campo data di nascita.
- Promemoria distinti per luce e gas a partire da tre mesi prima della scadenza (scadenza calcolata dalla data contratto e dalla durata, oppure dai campi di scadenza se presenti).
- Email di scadenza al cliente e al venditore; al venditore vengono inclusi email/telefono cliente e gestore.
- Registro Firestore `automationLogs`; gli errori sono salvati per diagnosi.

## Configurazione necessaria una sola volta

### 1. Crea due Secrets in GitHub
Apri **Settings → Secrets and variables → Actions → New repository secret** nel repository TOP HOUSE.

**Secret `BREVO_API_KEY`**
- Inserisci una nuova chiave API transazionale Brevo.
- La chiave incollata in chat va considerata esposta: revocala da Brevo e non riutilizzarla.

**Secret `FIREBASE_SERVICE_ACCOUNT_JSON`**
- Firebase Console → Impostazioni progetto → Account di servizio → genera una nuova chiave privata per un account di servizio dedicato.
- Incolla nel secret l'intero contenuto JSON scaricato. Non caricarlo nel repository, non inviarlo in chat e non inserirlo nel sito.
- L'account deve avere accesso Firestore al progetto `crm-top-house`. Proteggi questo secret e limita chi può modificare workflow e script.

### 2. Abilita GitHub Actions
Apri la scheda **Actions** del repository e abilita i workflow se richiesto. Il workflow `TOP HOUSE email automations` può essere lanciato manualmente con **Run workflow** per un test.

### 3. Permessi Firestore
Il CRM deve permettere agli utenti autenticati autorizzati di creare documenti in `emailQueue` e leggere `automationLogs`. Non rendere pubbliche queste raccolte. Se le regole attuali bloccano queste operazioni, vanno aggiornate con regole che richiedano autenticazione e controllo del profilo in `users/{uid}` (active=true); non usare regole aperte a tutti.

### 4. Email venditori
Per ogni venditore, verifica che esista `users/{uid}` con `name` identico al nome nel CRM, `email` aziendale corretta e `active: true`.

## Limiti importanti
- I workflow programmati GitHub possono essere ritardati; nel repository pubblico possono essere disattivati dopo 60 giorni senza attività. Per questo il registro va controllato regolarmente.
- Il workflow gira ogni ora, entro i limiti inclusi di GitHub Actions; controlla **Settings → Billing → Actions** per evitare sorprese se il repository è privato e il consumo incluso è diverso.
- Non eseguire il vecchio deploy di Cloud Functions e non passare a Blaze per questa soluzione.
- Il worker usa un account di servizio Firestore e una chiave Brevo conservati solo nei GitHub Secrets.
