# TOP HOUSE CRM

CRM venditori Top House, integrato nel Control Center esistente.

## Sezioni
1. Dashboard — riepilogo produzione personale.
2. Contratti — inserimento e ricerca delle pratiche.
3. Affiliati — CAF, agenzie, venditori e altri affiliati.
4. Piano compensi — area personale del piano compensi.
5. Stato contratti — monitoraggio Inserito, In lavorazione, OK, KO e Storno.

## Versione attuale
Questa è la **versione UI/prototipo**: i dati vengono salvati nel browser tramite localStorage. Non è ancora un database condiviso tra venditori.

## Evoluzione prevista
- Login reale con ruoli Admin/Venditore.
- Firebase Authentication + Firestore.
- Ogni contratto associato automaticamente al venditore autenticato.
- Stato e storico delle pratiche gestiti dall'Admin.
- Piani compensi associati ai singoli venditori.
- Calcolo compensi e maturazione.
- Filtri per mese, servizio, gestore e città.
- Area Admin completa per venditori, contratti, affiliati e piani.
