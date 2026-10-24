# TOP HOUSE CRM

CRM venditori Top House, integrato nel Control Center esistente.

## Sezioni
1. Dashboard — riepilogo produzione personale.
2. Contratti — inserimento e ricerca delle pratiche.
3. Affiliati — CAF, agenzie, venditori e altri affiliati.
4. Piano compensi — area personale del piano compensi.
5. Stato contratti — monitoraggio Inserito, In lavorazione, OK, KO e Storno.

## Versione attuale
- Accesso con email e password (Firebase Authentication, progetto `crm-top-house`).
- Il primo accesso del titolare crea l'Admin; gli altri accessi si creano da **Utenti e ruoli**.
- Dati condivisi su Firestore (`crmData/main`), salvati pratica per pratica: due persone che lavorano insieme non si sovrascrivono.
- Se il cloud non è raggiungibile si può continuare in modalità locale (solo su quel browser).
- Configurazione Firebase e regole: vedi `firebase/ISTRUZIONI.md`.

## Evoluzione prevista
- Login reale con ruoli Admin/Venditore.
- Firebase Authentication + Firestore.
- Ogni contratto associato automaticamente al venditore autenticato.
- Stato e storico delle pratiche gestiti dall'Admin.
- Piani compensi associati ai singoli venditori.
- Calcolo compensi e maturazione.
- Filtri per mese, servizio, gestore e città.
- Area Admin completa per venditori, contratti, affiliati e piani.


## CRM v3
- Cataloghi preimpostati di servizi Top House e gestori energia/telefonia.
- Campi contratto: prezzo stipulato, durata offerta, scadenza, note, cliente, contatti, venditore, fonte lead, priorità e prossimo contatto.
- Ricerca e filtri avanzati, modifica/eliminazione, cambio stato rapido, dashboard con valore offerte e scadenze.
- Branding Top House con logo e interfaccia responsive.
