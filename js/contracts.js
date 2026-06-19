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
    "EKO",
    "Greenword",
    "New costruction",
    "Onova",
    "S4",
    "Union",
    "WLD Impianti"
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

function abbinaDaLista(valore, lista){
    const valorePulito = testo(valore).toLowerCase();
    const trovato = lista.find(elemento => elemento.toLowerCase() === valorePulito);
    return trovato || testo(valore);
}

function normalizzaContratto(c, index){
    return {
        id: Number(c.id || index + 1),
        dataInserimento: testo(c.dataInserimento),
        dataEsito: testo(c.dataEsito),
        nome: testo(c.nome),
        cognome: testo(c.cognome),
        venditore: abbinaDaLista(c.venditore, VENDITORI_REGISTRATI),
        partner: abbinaDaLista(c.partner, PARTNER_REGISTRATI),
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

    return `<span class="badge pending">${stato}</span>`;
}

function pagamentoBadge(pagamento){

    if(pagamento === "Incassato" || pagamento === "Pagato"){
        return `<span class="badge ok">${pagamento}</span>`;
    }

    if(pagamento === "Da incassare" || pagamento === "Da pagare"){
        return `<span class="badge storno">${pagamento}</span>`;
    }

    return `<span class="badge pending">${pagamento}</span>`;
}

function calcolaMargine(contratto){

    if(contratto.stato !== "OK" && contratto.stato !== "Pagato"){
        return 0;
    }

    return Number(contratto.gettonePartner || 0) - Number(contratto.gettoneVenditore || 0);
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
            <td>${contratto.dataInserimento}</td>
            <td>${contratto.dataEsito}</td>
            <td>${contratto.nome}</td>
            <td>${contratto.cognome}</td>
            <td>${contratto.venditore}</td>
            <td>${contratto.partner}</td>
            <td>${contratto.gestore}</td>
            <td>${contratto.servizio}</td>
            <td>${statoBadge(contratto.stato)}</td>
            <td>${contratto.gettonePartner}€</td>
            <td>${contratto.gettoneVenditore}€</td>
            <td>${margine}€</td>
            <td>${pagamentoBadge(contratto.pagamentoPartner)}</td>
            <td>${pagamentoBadge(contratto.pagamentoVenditore)}</td>
            <td>${contratto.note}</td>
        `;

        tbody.appendChild(row);

    });

    aggiornaStatistiche(lista);
}

function aggiornaStatistiche(lista){

    const totale = lista.length;

    const ok = lista.filter(c => c.stato === "OK" || c.stato === "Pagato").length;

    const ko = lista.filter(c => c.stato === "KO").length;

    const storni = lista.filter(c => c.stato === "Storno").length;

    const daIncassarePartner = lista
        .filter(c =>
            (c.stato === "OK" || c.stato === "Pagato") &&
            c.pagamentoPartner === "Da incassare"
        )
        .reduce((totale, c) => totale + Number(c.gettonePartner || 0), 0);

    const daPagareVenditori = lista
        .filter(c =>
            (c.stato === "OK" || c.stato === "Pagato") &&
            c.pagamentoVenditore === "Da pagare"
        )
        .reduce((totale, c) => totale + Number(c.gettoneVenditore || 0), 0);

    const margineTopHouse = lista
        .filter(c => c.stato === "OK" || c.stato === "Pagato")
        .reduce((totale, c) => totale + calcolaMargine(c), 0);

    document.getElementById("totaleContratti").innerText = totale;
    document.getElementById("totaleOk").innerText = ok;
    document.getElementById("totaleKo").innerText = ko;
    document.getElementById("totaleStorni").innerText = storni;
    document.getElementById("daIncassarePartner").innerText = daIncassarePartner + "€";
    document.getElementById("totaleVenditori").innerText = daPagareVenditori + "€";
    document.getElementById("margineTopHouse").innerText = margineTopHouse + "€";
}

function popolaFiltriFissi(){

    vendorFilter.innerHTML = `<option value="">Tutti i venditori</option>`;

    VENDITORI_REGISTRATI.forEach(venditore => {
        vendorFilter.innerHTML += `<option value="${venditore}">${venditore}</option>`;
    });

    partnerFilter.innerHTML = `<option value="">Tutti i partner</option>`;

    PARTNER_REGISTRATI.forEach(partner => {
        partnerFilter.innerHTML += `<option value="${partner}">${partner}</option>`;
    });

    managerFilter.innerHTML = `<option value="">Tutti i gestori</option>`;

    GESTORI_REGISTRATI.forEach(gestore => {
        managerFilter.innerHTML += `<option value="${gestore}">${gestore}</option>`;
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

monthFilter.addEventListener("change", function(){
    renderContratti();
});

vendorFilter.addEventListener("change", renderContratti);
partnerFilter.addEventListener("change", renderContratti);
managerFilter.addEventListener("change", renderContratti);
statusFilter.addEventListener("change", renderContratti);
paymentVendorFilter.addEventListener("change", renderContratti);

async function exportReport(){

    const lista = getListaFiltrata();

    const meseSelezionato = monthFilter.options[monthFilter.selectedIndex].text;
    const dataExport = new Date().toLocaleDateString("it-IT");

    const totale = lista.length;
    const ok = lista.filter(c => c.stato === "OK" || c.stato === "Pagato").length;
    const ko = lista.filter(c => c.stato === "KO").length;
    const storni = lista.filter(c => c.stato === "Storno").length;

    const daIncassarePartner = lista
        .filter(c =>
            (c.stato === "OK" || c.stato === "Pagato") &&
            c.pagamentoPartner === "Da incassare"
        )
        .reduce((totale, c) => totale + Number(c.gettonePartner || 0), 0);

    const daPagareVenditori = lista
        .filter(c =>
            (c.stato === "OK" || c.stato === "Pagato") &&
            c.pagamentoVenditore === "Da pagare"
        )
        .reduce((totale, c) => totale + Number(c.gettoneVenditore || 0), 0);

    const margineTopHouse = lista
        .filter(c => c.stato === "OK" || c.stato === "Pagato")
        .reduce((totale, c) => totale + calcolaMargine(c), 0);

    let logoBase64 = "";

    try{
        const response = await fetch("assets/logo-tophouse.png");
        const blob = await response.blob();

        logoBase64 = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }catch(error){
        logoBase64 = "";
    }

    let righeContratti = "";

    if(lista.length === 0){

        righeContratti = `
            <tr>
                <td colspan="16" class="empty">
                    Nessun contratto trovato per i filtri selezionati.
                </td>
            </tr>
        `;

    }else{

        lista.forEach(c => {

            const margine = calcolaMargine(c);

            righeContratti += `
                <tr>
                    <td>${c.id}</td>
                    <td>${c.dataInserimento}</td>
                    <td>${c.dataEsito}</td>
                    <td>${c.nome}</td>
                    <td>${c.cognome}</td>
                    <td>${c.venditore}</td>
                    <td>${c.partner}</td>
                    <td>${c.gestore}</td>
                    <td>${c.servizio}</td>
                    <td>${c.stato}</td>
                    <td>${c.gettonePartner}€</td>
                    <td>${c.gettoneVenditore}€</td>
                    <td>${margine}€</td>
                    <td>${c.pagamentoPartner}</td>
                    <td>${c.pagamentoVenditore}</td>
                    <td>${c.note}</td>
                </tr>
            `;

        });

    }

    const reportHtml = `
        <html>
        <head>
            <meta charset="UTF-8">

            <style>

                body{
                    font-family: Arial, Helvetica, sans-serif;
                    background:#ffffff;
                    color:#081120;
                }

                .header-report{
                    background:linear-gradient(90deg,#d90429,#ff7b00);
                    color:white;
                    padding:24px;
                    border-radius:18px;
                    margin-bottom:24px;
                }

                .logo{
                    max-height:80px;
                    margin-bottom:12px;
                    background:white;
                    padding:10px;
                    border-radius:12px;
                }

                .title{
                    font-size:30px;
                    font-weight:800;
                    margin-bottom:6px;
                }

                .subtitle{
                    font-size:16px;
                    opacity:.95;
                }

                .summary{
                    width:100%;
                    border-collapse:collapse;
                    margin-bottom:24px;
                }

                .summary td{
                    background:#f8fafc;
                    border:1px solid #e5e7eb;
                    padding:16px;
                    font-size:15px;
                    font-weight:bold;
                    vertical-align:top;
                }

                .summary .value{
                    color:#ff7b00;
                    font-size:22px;
                    font-weight:800;
                }

                table{
                    width:100%;
                    border-collapse:collapse;
                }

                th{
                    background:#081120;
                    c
