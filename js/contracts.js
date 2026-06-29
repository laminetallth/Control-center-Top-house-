import {
    db,
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy
} from "./firebase-config.js";

const VENDITORI_REGISTRATI = [
    "Antonio Attardi",
    "Davide Marino",
    "Fabio Magnago",
    "Gabriele Straniero",
    "Giuseppe Maresca",
    "Lamine Tall",
    "Morena Caccavo",
    "Studio Cian"
];

const PARTNER_REGISTRATI = [
    "Greenword",
    "Onova",
    "S4",
    "Union",
    "EKO",
    "WLD Impianti",
    "New costruction",
    "Vita Group"
];

const GESTORI_REGISTRATI = [
    "ACEA",
    "ALPERIA",
    "COGEME",
    "DUFERCO",
    "ENEL",
    "ENGIE",
    "GDE",
    "HERA",
    "IREN",
    "ONOVA",
    "S4",
    "SIMECOM",
    "SORGENIA",
    "STREAM",
    "UNION",
    "UNOENERGY",
    "VIVIENERGIA"
];

const CONTRATTI_DEMO = [
    {
        id: 1,
        dataInserimento: "2026-06-01",
        dataEsito: "2026-06-10",
        nome: "Mario",
        cognome: "Rossi",
        venditore: "Fabio Magnago",
        partner: "S4",
        gestore: "ENEL",
        servizio: "Luce",
        stato: "OK",
        gettonePartner: 120,
        gettoneVenditore: 80,
        pagamentoPartner: "Da incassare",
        pagamentoVenditore: "Da pagare",
        note: "Pratica completa"
    },
    {
        id: 2,
        dataInserimento: "2026-06-03",
        dataEsito: "2026-06-12",
        nome: "Giulia",
        cognome: "Bianchi",
        venditore: "Studio Cian",
        partner: "Onova",
        gestore: "ENGIE",
        servizio: "Gas",
        stato: "KO",
        gettonePartner: 0,
        gettoneVenditore: 0,
        pagamentoPartner: "Non dovuto",
        pagamentoVenditore: "Non dovuto",
        note: "Documento mancante"
    },
    {
        id: 3,
        dataInserimento: "2026-07-05",
        dataEsito: "2026-07-15",
        nome: "Paolo",
        cognome: "Neri",
        venditore: "Antonio Attardi",
        partner: "EKO",
        gestore: "ACEA",
        servizio: "Luce + Gas",
        stato: "Storno",
        gettonePartner: 0,
        gettoneVenditore: 0,
        pagamentoPartner: "Non dovuto",
        pagamentoVenditore: "Non dovuto",
        note: "Cliente ha annullato"
    }
];

function testo(valore){
    return String(valore || "").trim();
}

function parseImporto(valore){
    const importo = testo(valore).replace(",", ".");
    const numeroConvertito = Number.parseFloat(importo);

    return Number.isFinite(numeroConvertito) ? numeroConvertito : 0;
}

function numero(valore){
    return parseImporto(valore);
}

function formattaImportoMassimoDueDecimali(valore){
    return String(Math.round((parseImporto(valore) + Number.EPSILON) * 100) / 100);
}

function formatEuro(valore){
    const importoArrotondato = Math.round((parseImporto(valore) + Number.EPSILON) * 100) / 100;

    return importoArrotondato.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + "€";
}

function escapeHtml(valore){
    return testo(valore)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function abbinaDaLista(valore, lista){
    const valorePulito = testo(valore).toLowerCase();

    const trovato = lista.find(elemento => elemento.toLowerCase() === valorePulito);

    return trovato || testo(valore);
}

function normalizzaPartner(partner){

    const valore = testo(partner).toLowerCase();

    if(valore === "greenworld"){
        return "Greenword";
    }

    if(valore === "new construction"){
        return "New costruction";
    }

    if(valore === "wld"){
        return "WLD Impianti";
    }

    if(valore === "vita group" || valore === "vitagroup"){
        return "Vita Group";
    }

    return abbinaDaLista(partner, PARTNER_REGISTRATI);
}

function normalizzaContratto(c, index){
    return {
        id: Number(c.id || index + 1),
        firestoreId: testo(c.firestoreId || c.localId || c.id || index + 1),
        localId: testo(c.localId || c.id || index + 1),
        dataInserimento: testo(c.dataInserimento),
        dataEsito: testo(c.dataEsito),
        nome: testo(c.nome),
        cognome: testo(c.cognome),
        venditore: abbinaDaLista(c.venditore, VENDITORI_REGISTRATI),
        partner: normalizzaPartner(c.partner),
        gestore: abbinaDaLista(c.gestore, GESTORI_REGISTRATI),
        servizio: testo(c.servizio),
        stato: testo(c.stato) || "Inserito",
        gettonePartner: numero(c.gettonePartner),
        gettoneVenditore: numero(c.gettoneVenditore),
        pagamentoPartner: testo(c.pagamentoPartner) || "Da incassare",
        pagamentoVenditore: testo(c.pagamentoVenditore) || "Da pagare",
        note: testo(c.note)
    };
}

const contrattiLocaliIniziali = getContrattiLocali();
let contratti = [];

const form = document.getElementById("contractForm");
const tbody = document.getElementById("contractsBody");
const searchInput = document.getElementById("searchInput");
const saveButton = document.getElementById("saveButton");
const formTitle = document.getElementById("formTitle");
const cancelEditButton = document.getElementById("cancelEditButton");
const firebaseStatus = document.getElementById("firebaseStatus");
const migrateLocalContractsBtn = document.getElementById("migrateLocalContractsBtn");
const archiveLocalContractsBtn = document.getElementById("archiveLocalContractsBtn");
const contractsCollection = collection(db, "contracts");
const gettonePartnerInput = document.getElementById("gettonePartner");
const gettoneVenditoreInput = document.getElementById("gettoneVenditore");
const percentualeVenditoreSelect = document.getElementById("percentualeVenditore");

const monthFilter = document.getElementById("monthFilter");
const vendorFilter = document.getElementById("vendorFilter");
const partnerFilter = document.getElementById("partnerFilter");
const managerFilter = document.getElementById("managerFilter");
const statusFilter = document.getElementById("statusFilter");
const paymentVendorFilter = document.getElementById("paymentVendorFilter");
const categoryFilter = document.getElementById("categoryFilter");

function calcolaGettoneVenditoreDaPercentuale(){
    const percentuale = percentualeVenditoreSelect.value;

    if(percentuale === "manuale"){
        return;
    }

    const gettonePartner = parseImporto(gettonePartnerInput.value);
    const gettoneVenditore = gettonePartner * (parseImporto(percentuale) / 100);
    gettoneVenditoreInput.value = formattaImportoMassimoDueDecimali(gettoneVenditore);
}

function aggiornaPercentualeDaModificaManuale(){
    const percentuale = percentualeVenditoreSelect.value;

    if(percentuale === "manuale"){
        return;
    }

    const gettonePartner = parseImporto(gettonePartnerInput.value);
    const gettoneVenditoreAtteso = gettonePartner * (parseImporto(percentuale) / 100);
    const gettoneVenditoreCorrente = parseImporto(gettoneVenditoreInput.value);

    if(Math.abs(gettoneVenditoreCorrente - gettoneVenditoreAtteso) > 0.009){
        percentualeVenditoreSelect.value = "manuale";
    }
}

function salvaStorage(){
    localStorage.setItem("contrattiTopHouse", JSON.stringify(contratti));
}

function setFirebaseStatus(message, type){
    if(!firebaseStatus){ return; }
    firebaseStatus.textContent = message;
    firebaseStatus.className = `firebase-status ${type || ""}`.trim();
}

function getFirestoreId(contratto){
    return testo(contratto.firestoreId || contratto.localId || contratto.id);
}

function contrattoPerFirestore(contratto){
    const normalizzato = normalizzaContratto(contratto, 0);
    return {
        ...normalizzato,
        firestoreId: getFirestoreId(contratto),
        localId: testo(contratto.localId || contratto.id),
        updatedAt: serverTimestamp()
    };
}

function getContrattiLocali(){
    try{
        const dati = JSON.parse(localStorage.getItem("contrattiTopHouse"));
        return Array.isArray(dati) ? dati.map(normalizzaContratto) : [];
    }catch(error){
        return [];
    }
}

function aggiornaAzioniMigrazione(){
    const locali = contrattiLocaliIniziali.length ? contrattiLocaliIniziali : getContrattiLocali();
    const mostra = locali.length > 0;
    if(migrateLocalContractsBtn){ migrateLocalContractsBtn.style.display = mostra ? "inline-block" : "none"; }
    if(archiveLocalContractsBtn){ archiveLocalContractsBtn.style.display = mostra ? "inline-block" : "none"; }
}



function getContractCategory(contratto){
    const servizio = String(contratto.servizio || "")
        .toLowerCase()
        .replaceAll(" ", "")
        .replaceAll("_", "-");

    if(
        servizio === "luce" ||
        servizio === "gas" ||
        servizio === "luce+gas" ||
        servizio === "luce-gas" ||
        servizio === "lucegas"
    ){
        return "Commodity";
    }

    return "Extra Commodity";
}

function sommaCategoria(lista, categoria){
    return lista.filter(c => getContractCategory(c) === categoria)
        .reduce((totale, contratto) => totale + getContractUnits(contratto), 0);
}
function getContractUnits(contratto){
    const servizio = String(contratto.servizio || "").toLowerCase().replaceAll(" ", "");
    if(servizio === "luce+gas" || servizio === "luce-gas" || servizio === "lucegas"){
        return 2;
    }
    return 1;
}

function praticaValidaPerCompensi(contratto){
    return contratto.stato === "OK" || contratto.stato === "Pagato";
}

function statoBadge(stato){

    if(stato === "OK"){
        return `<span class="badge ok">OK</span>`;
    }

    if(stato === "KO"){
        return `<span class="badge ko">KO</span>`;
    }

    if(stato === "Storno"){
        return `<span class="badge storno">Storno</span>`;
    }

    if(stato === "Pagato"){
        return `<span class="badge paid">Pagato</span>`;
    }

    return `<span class="badge pending">${escapeHtml(stato)}</span>`;
}

function pagamentoBadge(pagamento){

    if(pagamento === "Incassato" || pagamento === "Pagato"){
        return `<span class="badge ok">${escapeHtml(pagamento)}</span>`;
    }

    if(pagamento === "Da incassare" || pagamento === "Da pagare"){
        return `<span class="badge storno">${escapeHtml(pagamento)}</span>`;
    }

    if(pagamento === "Non dovuto"){
        return `<span class="badge pending">${escapeHtml(pagamento)}</span>`;
    }

    return `<span class="badge pending">${escapeHtml(pagamento)}</span>`;
}

function calcolaMargine(contratto){

    if(!praticaValidaPerCompensi(contratto)){
        return 0;
    }

    return numero(contratto.gettonePartner) - numero(contratto.gettoneVenditore);
}

function getListaFiltrata(){

    const ricerca = testo(searchInput.value).toLowerCase();
    const meseSelezionato = testo(monthFilter.value);
    const venditoreSelezionato = testo(vendorFilter.value);
    const partnerSelezionato = testo(partnerFilter.value);
    const gestoreSelezionato = testo(managerFilter.value);
    const statoSelezionato = testo(statusFilter.value);
    const pagamentoVenditoreSelezionato = testo(paymentVendorFilter.value);
    const categoriaSelezionata = testo(categoryFilter.value);

    return contratti.filter(c => {

        const contenuto = `
            ${c.id}
            ${c.nome}
            ${c.cognome}
            ${c.venditore}
            ${c.partner}
            ${c.gestore}
            ${c.servizio}
            ${c.stato}
            ${c.pagamentoPartner}
            ${c.pagamentoVenditore}
            ${c.note}
        `.toLowerCase();

        const meseContratto = testo(c.dataInserimento).slice(0, 7);

        const matchRicerca = contenuto.includes(ricerca);

        const matchMese =
            meseSelezionato === "" ||
            meseContratto === meseSelezionato;

        const matchVenditore =
            venditoreSelezionato === "" ||
            c.venditore === venditoreSelezionato;

        const matchPartner =
            partnerSelezionato === "" ||
            c.partner === partnerSelezionato;

        const matchGestore =
            gestoreSelezionato === "" ||
            c.gestore === gestoreSelezionato;

        const matchStato =
            statoSelezionato === "" ||
            c.stato === statoSelezionato;

        const matchPagamentoVenditore =
            pagamentoVenditoreSelezionato === "" ||
            c.pagamentoVenditore === pagamentoVenditoreSelezionato;

        const matchCategoria =
            categoriaSelezionata === "" ||
            getContractCategory(c) === categoriaSelezionata;

        return matchRicerca &&
               matchMese &&
               matchVenditore &&
               matchPartner &&
               matchGestore &&
               matchStato &&
               matchPagamentoVenditore &&
               matchCategoria;

    });
}

function renderContratti(){

    const lista = getListaFiltrata();

    tbody.innerHTML = "";

    if(lista.length === 0){

        const row = document.createElement("tr");

        row.innerHTML = `
            <td colspan="17" style="text-align:center; padding:30px; color:#6b7280; font-weight:bold;">
                Nessun contratto trovato per i filtri selezionati.
            </td>
        `;

        tbody.appendChild(row);

        aggiornaStatistiche(lista);

        return;
    }

    lista.forEach(contratto => {

        const margine = calcolaMargine(contratto);

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <div class="action-buttons">
                    <button class="edit-btn" onclick="modificaContratto(${contratto.id})">Modifica</button>
                    <button class="delete-btn" onclick="eliminaContratto(${contratto.id})">Elimina</button>
                </div>
            </td>
            <td>${contratto.id}</td>
            <td>${escapeHtml(contratto.dataInserimento)}</td>
            <td>${escapeHtml(contratto.dataEsito)}</td>
            <td>${escapeHtml(contratto.nome)}</td>
            <td>${escapeHtml(contratto.cognome)}</td>
            <td>${escapeHtml(contratto.venditore)}</td>
            <td>${escapeHtml(contratto.partner)}</td>
            <td>${escapeHtml(contratto.gestore)}</td>
            <td>${escapeHtml(contratto.servizio)}</td>
            <td><span class="badge pending">${getContractCategory(contratto)}</span></td>
            <td>${statoBadge(contratto.stato)}</td>
            <td>${formatEuro(contratto.gettonePartner)}</td>
            <td>${formatEuro(contratto.gettoneVenditore)}</td>
            <td>${formatEuro(margine)}</td>
            <td>${pagamentoBadge(contratto.pagamentoPartner)}</td>
            <td>${pagamentoBadge(contratto.pagamentoVenditore)}</td>
            <td>${escapeHtml(contratto.note)}</td>
        `;

        tbody.appendChild(row);

    });

    aggiornaStatistiche(lista);
}

function aggiornaStatistiche(lista){

    const totale = sommaUnita(lista);

    const ok = sommaUnita(lista.filter(c => praticaValidaPerCompensi(c)));

    const ko = sommaUnita(lista.filter(c => c.stato === "KO"));

    const storni = sommaUnita(lista.filter(c => c.stato === "Storno"));

    const daIncassarePartner = lista
        .filter(c =>
            praticaValidaPerCompensi(c) &&
            c.pagamentoPartner === "Da incassare"
        )
        .reduce((totale, c) => totale + numero(c.gettonePartner), 0);

    const daPagareVenditori = lista
        .filter(c =>
            praticaValidaPerCompensi(c) &&
            c.pagamentoVenditore === "Da pagare"
        )
        .reduce((totale, c) => totale + numero(c.gettoneVenditore), 0);

    const margineMaturato = lista
        .filter(c => praticaValidaPerCompensi(c))
        .reduce((totale, c) => totale + calcolaMargine(c), 0);

    document.getElementById("totaleContratti").innerText = totale;
    document.getElementById("totaleCommodity").innerText = sommaCategoria(lista, "Commodity");
    document.getElementById("totaleExtraCommodity").innerText = sommaCategoria(lista, "Extra Commodity");
    document.getElementById("totaleOk").innerText = ok;
    document.getElementById("totaleKo").innerText = ko;
    document.getElementById("totaleStorni").innerText = storni;
    document.getElementById("daIncassarePartner").innerText = formatEuro(daIncassarePartner);
    document.getElementById("totaleVenditori").innerText = formatEuro(daPagareVenditori);
    document.getElementById("margineTopHouse").innerText = formatEuro(margineMaturato);
}

function popolaFiltriFissi(){

    vendorFilter.innerHTML = `<option value="">Tutti i venditori</option>`;

    VENDITORI_REGISTRATI.forEach(venditore => {
        vendorFilter.innerHTML += `<option value="${escapeHtml(venditore)}">${escapeHtml(venditore)}</option>`;
    });

    partnerFilter.innerHTML = `<option value="">Tutti i partner</option>`;

    PARTNER_REGISTRATI.forEach(partner => {
        partnerFilter.innerHTML += `<option value="${escapeHtml(partner)}">${escapeHtml(partner)}</option>`;
    });

    managerFilter.innerHTML = `<option value="">Tutti i gestori</option>`;

    GESTORI_REGISTRATI.forEach(gestore => {
        managerFilter.innerHTML += `<option value="${escapeHtml(gestore)}">${escapeHtml(gestore)}</option>`;
    });
}

form.addEventListener("submit", async function(e){

    e.preventDefault();

    const editId = document.getElementById("editId").value;

    const datiContratto = {
        id: editId ? Number(editId) : generaNuovoId(),
        dataInserimento: document.getElementById("dataInserimento").value,
        dataEsito: document.getElementById("dataEsito").value,
        nome: document.getElementById("nome").value,
        cognome: document.getElementById("cognome").value,
        venditore: document.getElementById("venditore").value,
        partner: document.getElementById("partner").value,
        gestore: document.getElementById("gestore").value,
        servizio: document.getElementById("servizio").value,
        stato: document.getElementById("stato").value,
        gettonePartner: parseImporto(gettonePartnerInput.value),
        gettoneVenditore: parseImporto(gettoneVenditoreInput.value),
        pagamentoPartner: document.getElementById("pagamentoPartner").value,
        pagamentoVenditore: document.getElementById("pagamentoVenditore").value,
        note: document.getElementById("note").value
    };

    try{
        const normalizzato = normalizzaContratto(datiContratto, contratti.length);
        const firestoreId = editId ? getFirestoreId(contratti.find(c => c.id === Number(editId)) || normalizzato) : String(normalizzato.id);
        const payload = contrattoPerFirestore({ ...normalizzato, firestoreId, localId: firestoreId });
        if(!editId){ payload.createdAt = serverTimestamp(); }
        await setDoc(doc(db, "contracts", firestoreId), payload, { merge: true });
        await caricaContrattiDaFirestore();
        resetForm();
    }catch(error){
        console.error(error);
        setFirebaseStatus("Errore Firebase: contratto non salvato", "error");
    }
});

function generaNuovoId(){

    if(contratti.length === 0){
        return 1;
    }

    return Math.max(...contratti.map(c => Number(c.id || 0))) + 1;
}

function modificaContratto(id){

    const contratto = contratti.find(c => c.id === id);

    if(!contratto){
        return;
    }

    document.getElementById("editId").value = contratto.id;
    document.getElementById("dataInserimento").value = contratto.dataInserimento;
    document.getElementById("dataEsito").value = contratto.dataEsito;
    document.getElementById("nome").value = contratto.nome;
    document.getElementById("cognome").value = contratto.cognome;
    document.getElementById("venditore").value = contratto.venditore;
    document.getElementById("partner").value = contratto.partner;
    document.getElementById("gestore").value = contratto.gestore;
    document.getElementById("servizio").value = contratto.servizio;
    document.getElementById("stato").value = contratto.stato;
    gettonePartnerInput.value = contratto.gettonePartner;
    gettoneVenditoreInput.value = contratto.gettoneVenditore;
    percentualeVenditoreSelect.value = "manuale";
    document.getElementById("pagamentoPartner").value = contratto.pagamentoPartner;
    document.getElementById("pagamentoVenditore").value = contratto.pagamentoVenditore;
    document.getElementById("note").value = contratto.note;

    saveButton.innerText = "Aggiorna Contratto";
    formTitle.innerText = "✏️ Modifica Contratto";
    cancelEditButton.style.display = "block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

async function eliminaContratto(id){

    const conferma = confirm("Vuoi davvero eliminare questo contratto?");

    if(!conferma){
        return;
    }

    try{
        const contratto = contratti.find(c => c.id === id);
        await deleteDoc(doc(db, "contracts", getFirestoreId(contratto || { id })));
        await caricaContrattiDaFirestore();
        resetForm();
    }catch(error){
        console.error(error);
        setFirebaseStatus("Errore Firebase: contratto non eliminato", "error");
    }
}

function annullaModifica(){
    resetForm();
}

function resetForm(){

    form.reset();

    document.getElementById("editId").value = "";
    percentualeVenditoreSelect.value = "manuale";

    saveButton.innerText = "Salva Contratto";

    formTitle.innerText = "➕ Nuovo Contratto";

    cancelEditButton.style.display = "none";
}

function resetFiltri(){

    searchInput.value = "";
    monthFilter.value = "";
    vendorFilter.value = "";
    partnerFilter.value = "";
    managerFilter.value = "";
    statusFilter.value = "";
    paymentVendorFilter.value = "";
    categoryFilter.value = "";

    renderContratti();
}

searchInput.addEventListener("input", renderContratti);

gettonePartnerInput.addEventListener("input", calcolaGettoneVenditoreDaPercentuale);
gettoneVenditoreInput.addEventListener("input", aggiornaPercentualeDaModificaManuale);
percentualeVenditoreSelect.addEventListener("change", calcolaGettoneVenditoreDaPercentuale);

monthFilter.addEventListener("change", renderContratti);
vendorFilter.addEventListener("change", renderContratti);
partnerFilter.addEventListener("change", renderContratti);
managerFilter.addEventListener("change", renderContratti);
statusFilter.addEventListener("change", renderContratti);
paymentVendorFilter.addEventListener("change", renderContratti);
categoryFilter.addEventListener("change", renderContratti);


function sommaUnita(lista){
    return lista.reduce((totale, contratto) => totale + getContractUnits(contratto), 0);
}

function exportReport(){
    const lista = getListaFiltrata();
    const meseSelezionato = monthFilter.options[monthFilter.selectedIndex].text;
    const dataExport = new Date().toLocaleDateString("it-IT");
    const totale = sommaUnita(lista);
    const ok = sommaUnita(lista.filter(c => praticaValidaPerCompensi(c)));
    const ko = sommaUnita(lista.filter(c => c.stato === "KO"));
    const storni = sommaUnita(lista.filter(c => c.stato === "Storno"));
    const daIncassarePartner = lista.filter(c => praticaValidaPerCompensi(c) && c.pagamentoPartner === "Da incassare").reduce((totale, c) => totale + numero(c.gettonePartner), 0);
    const daPagareVenditori = lista.filter(c => praticaValidaPerCompensi(c) && c.pagamentoVenditore === "Da pagare").reduce((totale, c) => totale + numero(c.gettoneVenditore), 0);
    const margineMaturato = lista.filter(c => praticaValidaPerCompensi(c)).reduce((totale, c) => totale + calcolaMargine(c), 0);
    const righeContratti = lista.map(c => `<tr><td>${c.id}</td><td>${escapeHtml(c.dataInserimento)}</td><td>${escapeHtml(c.dataEsito)}</td><td>${escapeHtml(c.nome)}</td><td>${escapeHtml(c.cognome)}</td><td>${escapeHtml(c.venditore)}</td><td>${escapeHtml(c.partner)}</td><td>${escapeHtml(c.gestore)}</td><td>${escapeHtml(c.servizio)}</td><td>${getContractCategory(c)}</td><td>${getContractUnits(c)}</td><td>${escapeHtml(c.stato)}</td><td>${formatEuro(c.gettonePartner)}</td><td>${formatEuro(c.gettoneVenditore)}</td><td>${formatEuro(calcolaMargine(c))}</td><td>${escapeHtml(c.pagamentoPartner)}</td><td>${escapeHtml(c.pagamentoVenditore)}</td><td>${escapeHtml(c.note)}</td></tr>`).join("") || `<tr><td colspan="17">Nessun contratto trovato.</td></tr>`;
    const reportHtml = `<html><head><meta charset="UTF-8"></head><body><h1>TOP HOUSE - Report Contratti</h1><p>Mensilità: ${escapeHtml(meseSelezionato)} | Export: ${escapeHtml(dataExport)}</p><table border="1"><tbody><tr><td>Totale contratti</td><td>${totale}</td><td>OK</td><td>${ok}</td><td>KO</td><td>${ko}</td><td>Storni</td><td>${storni}</td><td>Da incassare partner</td><td>${formatEuro(daIncassarePartner)}</td><td>Da pagare venditori</td><td>${formatEuro(daPagareVenditori)}</td><td>Margine</td><td>${formatEuro(margineMaturato)}</td></tr></tbody></table><br><table border="1"><thead><tr><th>ID</th><th>Data Inserimento</th><th>Data Esito</th><th>Nome</th><th>Cognome</th><th>Venditore</th><th>Partner</th><th>Gestore</th><th>Servizio</th><th>Categoria</th><th>Unità</th><th>Stato</th><th>Gettone Partner</th><th>Gettone Venditore</th><th>Margine</th><th>Pagamento Partner</th><th>Pagamento Venditore</th><th>Note</th></tr></thead><tbody>${righeContratti}</tbody></table></body></html>`;
    const blob = new Blob([reportHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `contratti-top-house-${monthFilter.value || "tutti"}.xls`;
    link.click();
}

async function resetContratti(){
    if(!confirm("Vuoi davvero svuotare tutti i contratti?")){
        return;
    }
    try{
        await Promise.all(contratti.map(c => deleteDoc(doc(db, "contracts", getFirestoreId(c)))));
        await caricaContrattiDaFirestore();
        resetForm();
    }catch(error){
        console.error(error);
        setFirebaseStatus("Errore Firebase: contratti non svuotati", "error");
    }
}

async function caricaContrattiDaFirestore(){
    try{
        const snapshot = await getDocs(query(contractsCollection, orderBy("id")));
        contratti = snapshot.docs.map((documento, index) => normalizzaContratto({
            ...documento.data(),
            firestoreId: documento.id,
            localId: documento.data().localId || documento.id
        }, index));
        if(contratti.length || !contrattiLocaliIniziali.length){
            salvaStorage();
        }
        renderContratti();
        aggiornaAzioniMigrazione();
        setFirebaseStatus(contratti.length ? "Online Firebase" : "Nessun contratto caricato", contratti.length ? "online" : "empty");
    }catch(error){
        console.error(error);
        contratti = getContrattiLocali();
        renderContratti();
        aggiornaAzioniMigrazione();
        setFirebaseStatus("Errore Firebase: dati locali visualizzati", "error");
    }
}

async function migraContrattiLocali(){
    const locali = contrattiLocaliIniziali.length ? contrattiLocaliIniziali : getContrattiLocali();
    if(!locali.length){
        setFirebaseStatus("Nessun contratto locale da migrare", "empty");
        return;
    }
    let caricati = 0;
    try{
        const snapshot = await getDocs(contractsCollection);
        const esistenti = new Set(snapshot.docs.map(documento => documento.id));
        for(const contratto of locali){
            const firestoreId = getFirestoreId(contratto);
            if(esistenti.has(firestoreId)){ continue; }
            await setDoc(doc(db, "contracts", firestoreId), {
                ...contrattoPerFirestore({ ...contratto, firestoreId, localId: firestoreId }),
                createdAt: serverTimestamp()
            }, { merge: true });
            caricati += 1;
        }
        await caricaContrattiDaFirestore();
        setFirebaseStatus(`Migrazione completata: ${caricati} contratti caricati su Firebase`, "online");
    }catch(error){
        console.error(error);
        setFirebaseStatus("Errore Firebase durante la migrazione", "error");
    }
}

function archiviaContrattiLocali(){
    if(!confirm("Vuoi archiviare i dati locali dopo la migrazione? Verranno copiati in una chiave di archivio e rimossi dalla chiave operativa locale.")){
        return;
    }
    const dati = localStorage.getItem("contrattiTopHouse");
    if(dati){
        localStorage.setItem(`contrattiTopHouse_archivio_${new Date().toISOString()}`, dati);
        localStorage.removeItem("contrattiTopHouse");
    }
    aggiornaAzioniMigrazione();
}

if(migrateLocalContractsBtn){ migrateLocalContractsBtn.addEventListener("click", migraContrattiLocali); }
if(archiveLocalContractsBtn){ archiveLocalContractsBtn.addEventListener("click", archiviaContrattiLocali); }

window.modificaContratto = modificaContratto;
window.eliminaContratto = eliminaContratto;
window.annullaModifica = annullaModifica;
window.exportReport = exportReport;
window.resetFiltri = resetFiltri;
window.resetContratti = resetContratti;

popolaFiltriFissi();
renderContratti();
resetForm();
aggiornaAzioniMigrazione();
caricaContrattiDaFirestore();
