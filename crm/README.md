# TOP HOUSE CRM — Foundation

Prima struttura del nuovo CRM venditori Top House.

## Moduli iniziali
1. Dashboard — contratti personali, OK, lavorazione, affiliati.
2. Contratti — inserimento: nome/cognome cliente, data firma, RID/No RID, servizio, gestore, città.
3. Affiliati — CAF, agenzie, venditori e altri soggetti con percentuale.
4. Piano compensi — area personale del venditore.

## Architettura
La prima versione usa localStorage solo come prototipo UI. La struttura è volutamente pronta per il passaggio a Firebase/Auth/Firestore: i dati sono centralizzati nell'oggetto `data` e la UI è separata dalla navigazione.

## Prossimi step
- Login e ruoli (admin / venditore).
- Firestore per dati reali.
- Venditore associato automaticamente ai contratti.
- Gestione stati OK/KO/Storno e maturazione compensi.
- Upload del piano compensi PDF.
- Filtri per mese, servizio, gestore e città.
- Vista admin completa e permessi.
