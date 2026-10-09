# TOP HOUSE CRM — configurazione automazioni email

Le funzioni email sono predisposte in `functions/`. La chiave Brevo resta nei Secret Manager di Firebase e non deve essere inserita nel JavaScript del browser o committata nel repository.

## Funzioni incluse
- `sendWelcomeEmail`: invio manuale della mail di benvenuto da I miei clienti.
- `processCustomerAutomations`: controllo giornaliero alle 08:00 (Europe/Rome) per compleanni e offerte luce/gas in scadenza fra tre mesi.
- `listAutomationLogs`: registro protetto degli invii e degli errori.
- Log persistenti nella raccolta Firestore `automationLogs`.

La scadenza viene calcolata dalla data firma e dalla durata selezionata (es. luce 2 anni, gas 1 anno). Per servizi luce+gas il controllo è separato. Se il cliente ha più contratti con la stessa email, gli auguri di compleanno vengono deduplicati per email e anno.

## Prerequisiti da completare nel progetto Firebase
1. Nel progetto Firebase `crm-top-house`, attivare **Authentication → Sign-in method → Email/Password**.
2. Creare un account Firebase Authentication per ciascun utente autorizzato.
3. In Firestore, creare `users/{UID}` per ciascun account. Campi minimi:
   - `name`: nome esatto del venditore mostrato nel CRM
   - `email`: email aziendale del venditore
   - `role`: `admin`, `manager` oppure `seller`
   - `active`: `true`
4. In Brevo, verificare il dominio mittente e completare i record DNS richiesti (DKIM/SPF e gli eventuali record indicati da Brevo). Usare come mittente un indirizzo appartenente al dominio verificato.
5. Verificare che il progetto Firebase sia sul piano **Blaze**: Cloud Functions e Cloud Scheduler possono richiedere fatturazione attiva.

## Deploy
Da una copia locale del repository con Firebase CLI installata e accesso autorizzato:

```bash
firebase login
firebase use crm-top-house
cd functions
npm install
cd ..
firebase functions:secrets:set BREVO_API_KEY
firebase functions:secrets:set MAIL_FROM
firebase functions:secrets:set MAIL_FROM_NAME
firebase deploy --only functions
```

Quando richiesto, inserire:
- `BREVO_API_KEY`: chiave API di Brevo (non la chiave SMTP).
- `MAIL_FROM`: indirizzo mittente già verificato in Brevo, ad esempio un indirizzo reale del dominio aziendale.
- `MAIL_FROM_NAME`: `TOP HOUSE`.

Non salvare questi valori in file, screenshot o commit Git.

## Prima di usare in produzione
- Creare e testare un utente autorizzato in Firebase Authentication e il relativo documento `users/{UID}`.
- Verificare che il CRM punti al documento Firestore `crmData/main` con contratti aggiornati.
- Inserire una data di nascita solo quando disponibile e appropriato.
- Provare prima l'invio di benvenuto verso una casella di test.
- Verificare che le email dei venditori siano valorizzate nei documenti `users`: senza email venditore il promemoria cliente può partire, ma la notifica al venditore viene registrata come errore.
- Controllare `automationLogs` e i log di Cloud Functions dopo il primo test.

## Nota sullo stato attuale
Il codice del CRM mantiene una modalità locale per la normale navigazione. L'invio email e il registro sono intenzionalmente protetti da Firebase Authentication e non funzionano finché non vengono completati i passaggi sopra e distribuite le Cloud Functions. Nessuna chiave Brevo è esposta al browser.
