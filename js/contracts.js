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
    const mese = monthFilter.value;
    const venditore = vendorFilter.value;
    const partner = partnerFilter.value;
    const gestore = managerFilter.value;
    const stato = statusFilter.value;
    const pagamentoVenditore = paymentVendorFilter.value;

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

        const matchRicerca = contenuto.includes(ricerca);

        const matchMese =
            mese === "" ||
            testo(c.dataInserimento).startsWith(mese);

        const matchVenditore =
            venditore === "" ||
            c.venditore === venditore;

        const matchPartner =
            partner === "" ||
            c.partner === partner;

        const matchGestore =
            gestore === "" ||
            c.gestore === gestore;

        const matchStato =
            stato === "" ||
            c.stato === stato;

        const matchPagamentoVenditore =
            pagamentoVenditore === "" ||
            c.pagamentoVenditore === pagamentoVenditore;

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

    const koStorni = lista.filter(c => c.stato === "KO" || c.stato === "Storno").length;

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
    document.getElementById("totaleKo").innerText = koStorni;
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
monthFilter.addEventListener("change", renderContratti);
vendorFilter.addEventListener("change", renderContratti);
partnerFilter.addEventListener("change", renderContratti);
managerFilter.addEventListener("change", renderContratti);
statusFilter.addEventListener("change", renderContratti);
paymentVendorFilter.addEventListener("change", renderContratti);

function exportCSV(){

    const lista = getListaFiltrata();

    let csv = "ID,Data Inserimento,Data Esito,Nome,Cognome,Venditore,Partner,Gestore,Servizio,Stato,Gettone Partner,Gettone Venditore,Margine Top House,Pagamento Partner,Pagamento Venditore,Note\n";

    lista.forEach(c => {

        const margine = calcolaMargine(c);

        csv += `${c.id},${c.dataInserimento},${c.dataEsito},${c.nome},${c.cognome},${c.venditore},${c.partner},${c.gestore},${c.servizio},${c.stato},${c.gettonePartner},${c.gettoneVenditore},${margine},${c.pagamentoPartner},${c.pagamentoVenditore},${c.note}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = "contratti-top-house-filtrati.csv";

    link.click();
}

function resetContratti(){

    if(confirm("Vuoi davvero svuotare tutti i contratti?")){

        contratti = [];

        salvaStorage();
        renderContratti();
        resetForm();
    }
}

function resetDemo(){

    if(confirm("Vuoi ricaricare i contratti demo? I dati attuali verranno sostituiti.")){

        contratti = CONTRATTI_DEMO.map(normalizzaContratto);

        salvaStorage();
        renderContratti();
        resetForm();
    }
}

salvaStorage();

cancelEditButton.style.display = "none";

popolaFiltriFissi();

renderContratti();
