let contratti = JSON.parse(localStorage.getItem("contrattiTopHouse")) || [
    {
        id: 1,
        dataInserimento: "2026-06-01",
        dataEsito: "2026-06-10",
        nome: "Mario",
        cognome: "Rossi",
        venditore: "Fabio Magnago",
        partner: "Partner Energia",
        gestore: "Enel",
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
        partner: "Partner Casa",
        gestore: "Engie",
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
        partner: "Partner Energia",
        gestore: "A2A",
        servizio: "Luce + Gas",
        stato: "Storno",
        gettonePartner: 0,
        gettoneVenditore: 0,
        pagamentoPartner: "Non dovuto",
        pagamentoVenditore: "Non dovuto",
        note: "Cliente ha annullato"
    }
];

const form = document.getElementById("contractForm");
const tbody = document.getElementById("contractsBody");
const searchInput = document.getElementById("searchInput");
const saveButton = document.getElementById("saveButton");
const formTitle = document.getElementById("formTitle");
const cancelEditButton = document.getElementById("cancelEditButton");

const monthFilter = document.getElementById("monthFilter");
const vendorFilter = document.getElementById("vendorFilter");
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

function getListaFiltrata(){

    const ricerca = searchInput.value.toLowerCase();
    const mese = monthFilter.value;
    const venditore = vendorFilter.value;
    const gestore = managerFilter.value;
    const stato = statusFilter.value;
    const pagamentoVenditore = paymentVendorFilter.value;

    return contratti.filter(c => {

        const matchRicerca =
            String(c.id).includes(ricerca) ||
            c.nome.toLowerCase().includes(ricerca) ||
            c.cognome.toLowerCase().includes(ricerca) ||
            c.venditore.toLowerCase().includes(ricerca) ||
            c.partner.toLowerCase().includes(ricerca) ||
            c.gestore.toLowerCase().includes(ricerca) ||
            c.servizio.toLowerCase().includes(ricerca) ||
            c.stato.toLowerCase().includes(ricerca) ||
            c.pagamentoPartner.toLowerCase().includes(ricerca) ||
            c.pagamentoVenditore.toLowerCase().includes(ricerca);

        const matchMese = mese === "" || (c.dataInserimento && c.dataInserimento.startsWith(mese));
        const matchVenditore = venditore === "" || c.venditore === venditore;
        const matchGestore = gestore === "" || c.gestore === gestore;
        const matchStato = stato === "" || c.stato === stato;
        const matchPagamentoVenditore = pagamentoVenditore === "" || c.pagamentoVenditore === pagamentoVenditore;

        return matchRicerca && matchMese && matchVenditore && matchGestore && matchStato && matchPagamentoVenditore;

    });

}

function renderContratti(lista = getListaFiltrata()){

    tbody.innerHTML = "";

    lista.forEach(contratto => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <div class="action-buttons">
                    <button class="edit-btn" onclick="modificaContratto(${contratto.id})">Modifica</button>
                    <button class="delete-btn" onclick="eliminaContratto(${contratto.id})">Elimina</button>
                </div>
            </td>
            <td>${contratto.id}</td>
            <td>${contratto.dataInserimento || ""}</td>
            <td>${contratto.dataEsito || ""}</td>
            <td>${contratto.nome}</td>
            <td>${contratto.cognome}</td>
            <td>${contratto.venditore}</td>
            <td>${contratto.partner}</td>
            <td>${contratto.gestore}</td>
            <td>${contratto.servizio}</td>
            <td>${statoBadge(contratto.stato)}</td>
            <td>${contratto.gettonePartner || 0}€</td>
            <td>${contratto.gettoneVenditore || 0}€</td>
            <td>${pagamentoBadge(contratto.pagamentoPartner)}</td>
            <td>${pagamentoBadge(contratto.pagamentoVenditore)}</td>
            <td>${contratto.note || ""}</td>
        `;

        tbody.appendChild(row);

    });

    aggiornaStatistiche(lista);
    aggiornaFiltri();

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

    document.getElementById("totaleContratti").innerText = totale;
    document.getElementById("totaleOk").innerText = ok;
    document.getElementById("totaleKo").innerText = koStorni;
    document.getElementById("totaleVenditori").innerText = daPagareVenditori + "€";

}

function aggiornaFiltri(){

    const venditoreCorrente = vendorFilter.value;
    const gestoreCorrente = managerFilter.value;

    const venditori = [...new Set(contratti.map(c => c.venditore).filter(Boolean))].sort();
    const gestori = [...new Set(contratti.map(c => c.gestore).filter(Boolean))].sort();

    vendorFilter.innerHTML = `<option value="">Tutti i venditori</option>`;
    managerFilter.innerHTML = `<option value="">Tutti i gestori</option>`;

    venditori.forEach(v => {
        vendorFilter.innerHTML += `<option value="${v}">${v}</option>`;
    });

    gestori.forEach(g => {
        managerFilter.innerHTML += `<option value="${g}">${g}</option>`;
    });

    vendorFilter.value = venditoreCorrente;
    managerFilter.value = gestoreCorrente;

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
        contratti = contratti.map(c => c.id === Number(editId) ? datiContratto : c);
    }else{
        contratti.push(datiContratto);
    }

    salvaStorage();
    renderContratti();
    resetForm();

});

function generaNuovoId(){
    if(contratti.length === 0){
        return 1;
    }

    return Math.max(...contratti.map(c => c.id)) + 1;
}

function modificaContratto(id){

    const contratto = contratti.find(c => c.id === id);

    if(!contratto){
        return;
    }

    document.getElementById("editId").value = contratto.id;
    document.getElementById("dataInserimento").value = contratto.dataInserimento || "";
    document.getElementById("dataEsito").value = contratto.dataEsito || "";
    document.getElementById("nome").value = contratto.nome || "";
    document.getElementById("cognome").value = contratto.cognome || "";
    document.getElementById("venditore").value = contratto.venditore || "";
    document.getElementById("partner").value = contratto.partner || "";
    document.getElementById("gestore").value = contratto.gestore || "";
    document.getElementById("servizio").value = contratto.servizio || "";
    document.getElementById("stato").value = contratto.stato || "Inserito";
    document.getElementById("gettonePartner").value = contratto.gettonePartner || 0;
    document.getElementById("gettoneVenditore").value = contratto.gettoneVenditore || 0;
    document.getElementById("pagamentoPartner").value = contratto.pagamentoPartner || "Da incassare";
    document.getElementById("pagamentoVenditore").value = contratto.pagamentoVenditore || "Da pagare";
    document.getElementById("note").value = contratto.note || "";

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
    managerFilter.value = "";
    statusFilter.value = "";
    paymentVendorFilter.value = "";

    renderContratti();

}

searchInput.addEventListener("input", renderContratti);
monthFilter.addEventListener("change", renderContratti);
vendorFilter.addEventListener("change", renderContratti);
managerFilter.addEventListener("change", renderContratti);
statusFilter.addEventListener("change", renderContratti);
paymentVendorFilter.addEventListener("change", renderContratti);

function exportCSV(){

    const lista = getListaFiltrata();

    let csv = "ID,Data Inserimento,Data Esito,Nome,Cognome,Venditore,Partner,Gestore,Servizio,Stato,Gettone Partner,Gettone Venditore,Pagamento Partner,Pagamento Venditore,Note\n";

    lista.forEach(c => {
        csv += `${c.id},${c.dataInserimento},${c.dataEsito},${c.nome},${c.cognome},${c.venditore},${c.partner},${c.gestore},${c.servizio},${c.stato},${c.gettonePartner},${c.gettoneVenditore},${c.pagamentoPartner},${c.pagamentoVenditore},${c.note}\n`;
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

cancelEditButton.style.display = "none";

renderContratti();
