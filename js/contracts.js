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

function numero(valore){
    return Number(valore || 0);
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

let contrattiSalvati = JSON.parse(localStorage.getItem("contrattiTopHouse"));

let contratti = Array.isArray(contrattiSalvati)
    ? contrattiSalvati.map(normalizzaContratto)
    : CONTRATTI_DEMO.map(normalizzaContratto);

const form = document.getElementById("contractForm");
const tbody = document.getElementById("contractsBody");
const searchInput = document.getElementById("searchInput");
const saveButton = document.getElementById("saveButton");
const formTitle = document.getElementById("formTitle");
const cancelEditButton = document.getElementById("cancelEditButton");

const monthFilter = document.getElementById("monthFilter");
const vendorFilter = document.getElementById("vendorFilter");
const partnerFilter = document.getElementById("partnerFilter");
const managerFilter = document.getElementById("managerFilter");
const statusFilter = document.getElementById("statusFilter");
const paymentVendorFilter = document.getElementById("paymentVendorFilter");

function salvaStorage(){
    localStorage.setItem("contrattiTopHouse", JSON.stringify(contratti));
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

        return matchRicerca &&
               matchMese &&
               matchVenditore &&
               matchPartner &&
               matchGestore &&
               matchStato &&
               matchPagamentoVenditore;

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
            <td>${statoBadge(contratto.stato)}</td>
            <td>${contratto.gettonePartner}€</td>
            <td>${contratto.gettoneVenditore}€</td>
            <td>${margine}€</td>
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
    document.getElementById("totaleOk").innerText = ok;
    document.getElementById("totaleKo").innerText = ko;
    document.getElementById("totaleStorni").innerText = storni;
    document.getElementById("daIncassarePartner").innerText = daIncassarePartner + "€";
    document.getElementById("totaleVenditori").innerText = daPagareVenditori + "€";
    document.getElementById("margineTopHouse").innerText = margineMaturato + "€";
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

form.addEventListener("submit", function(e){

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
        gettonePartner: Number(document.getElementById("gettonePartner").value || 0),
        gettoneVenditore: Number(document.getElementById("gettoneVenditore").value || 0),
        pagamentoPartner: document.getElementById("pagamentoPartner").value,
        pagamentoVenditore: document.getElementById("pagamentoVenditore").value,
        note: document.getElementById("note").value
    };

    if(editId){
        contratti = contratti.map(c => c.id === Number(editId) ? normalizzaContratto(datiContratto, 0) : c);
    }else{
        contratti.push(normalizzaContratto(datiContratto, contratti.length));
    }

    salvaStorage();
    renderContratti();
    resetForm();
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
    document.getElementById("gettonePartner").value = contratto.gettonePartner;
    document.getElementById("gettoneVenditore").value = contratto.gettoneVenditore;
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

function eliminaContratto(id){

    const conferma = confirm("Vuoi davvero eliminare questo contratto?");

    if(!conferma){
        return;
    }

    contratti = contratti.filter(c => c.id !== id);

    salvaStorage();
    renderContratti();
    resetForm();
}

function annullaModifica(){
    resetForm();
}

function resetForm(){

    form.reset();

    document.getElementById("editId").value = "";

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

    renderContratti();
}

searchInput.addEventListener("input", renderContratti);

monthFilter.addEventListener("change", renderContratti);
vendorFilter.addEventListener("change", renderContratti);
partnerFilter.addEventListener("change", renderContratti);
managerFilter.addEventListener("change", renderContratti);
statusFilter.addEventListener("change", renderContratti);
paymentVendorFilter.addEventListener("change", renderContratti);


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
    const righeContratti = lista.map(c => `<tr><td>${c.id}</td><td>${escapeHtml(c.dataInserimento)}</td><td>${escapeHtml(c.dataEsito)}</td><td>${escapeHtml(c.nome)}</td><td>${escapeHtml(c.cognome)}</td><td>${escapeHtml(c.venditore)}</td><td>${escapeHtml(c.partner)}</td><td>${escapeHtml(c.gestore)}</td><td>${escapeHtml(c.servizio)}</td><td>${getContractUnits(c)}</td><td>${escapeHtml(c.stato)}</td><td>${c.gettonePartner}€</td><td>${c.gettoneVenditore}€</td><td>${calcolaMargine(c)}€</td><td>${escapeHtml(c.pagamentoPartner)}</td><td>${escapeHtml(c.pagamentoVenditore)}</td><td>${escapeHtml(c.note)}</td></tr>`).join("") || `<tr><td colspan="17">Nessun contratto trovato.</td></tr>`;
    const reportHtml = `<html><head><meta charset="UTF-8"></head><body><h1>TOP HOUSE - Report Contratti</h1><p>Mensilità: ${escapeHtml(meseSelezionato)} | Export: ${escapeHtml(dataExport)}</p><table border="1"><tbody><tr><td>Totale contratti</td><td>${totale}</td><td>OK</td><td>${ok}</td><td>KO</td><td>${ko}</td><td>Storni</td><td>${storni}</td><td>Da incassare partner</td><td>${daIncassarePartner}€</td><td>Da pagare venditori</td><td>${daPagareVenditori}€</td><td>Margine</td><td>${margineMaturato}€</td></tr></tbody></table><br><table border="1"><thead><tr><th>ID</th><th>Data Inserimento</th><th>Data Esito</th><th>Nome</th><th>Cognome</th><th>Venditore</th><th>Partner</th><th>Gestore</th><th>Servizio</th><th>Unità</th><th>Stato</th><th>Gettone Partner</th><th>Gettone Venditore</th><th>Margine</th><th>Pagamento Partner</th><th>Pagamento Venditore</th><th>Note</th></tr></thead><tbody>${righeContratti}</tbody></table></body></html>`;
    const blob = new Blob([reportHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `contratti-top-house-${monthFilter.value || "tutti"}.xls`;
    link.click();
}

function resetContratti(){
    if(!confirm("Vuoi davvero svuotare tutti i contratti?")){
        return;
    }
    contratti = [];
    salvaStorage();
    renderContratti();
    resetForm();
}

popolaFiltriFissi();
salvaStorage();
renderContratti();
resetForm();
