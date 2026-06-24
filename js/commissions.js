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

function slugVenditore(nome){
    return encodeURIComponent(nome);
}

function caricaContratti(){
    const dati = JSON.parse(localStorage.getItem("contrattiTopHouse"));

    if(Array.isArray(dati)){
        return dati;
    }

    return [];
}

function praticaValida(contratto){
    return contratto.stato === "OK" || contratto.stato === "Pagato";
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
function sommaUnita(lista){ return lista.reduce((totale, contratto) => totale + getContractUnits(contratto), 0); }

function calcolaMargine(contratto){

    if(!praticaValida(contratto)){
        return 0;
    }

    return numero(contratto.gettonePartner) - numero(contratto.gettoneVenditore);
}

const monthFilter = document.getElementById("monthFilter");
const searchInput = document.getElementById("searchInput");
const vendorFilter = document.getElementById("vendorFilter");
const paymentFilter = document.getElementById("paymentFilter");

function popolaVenditori(){

    vendorFilter.innerHTML = `<option value="">Tutti i venditori</option>`;

    VENDITORI_REGISTRATI.forEach(venditore => {
        vendorFilter.innerHTML += `<option value="${escapeHtml(venditore)}">${escapeHtml(venditore)}</option>`;
    });
}

function getContrattiProvvigioni(){

    const contratti = caricaContratti();

    const meseSelezionato = testo(monthFilter.value);
    const ricerca = testo(searchInput.value).toLowerCase();
    const venditoreSelezionato = testo(vendorFilter.value);
    const pagamentoSelezionato = testo(paymentFilter.value);

    return contratti.filter(contratto => {

        if(!praticaValida(contratto)){
            return false;
        }

        const meseContratto = testo(contratto.dataInserimento).slice(0, 7);

        const matchMese =
            meseSelezionato === "" ||
            meseContratto === meseSelezionato;

        const matchVenditore =
            venditoreSelezionato === "" ||
            testo(contratto.venditore) === venditoreSelezionato;

        const matchPagamento =
            pagamentoSelezionato === "" ||
            testo(contratto.pagamentoVenditore) === pagamentoSelezionato;

        const contenuto = `
            ${contratto.id}
            ${contratto.nome}
            ${contratto.cognome}
            ${contratto.venditore}
            ${contratto.partner}
            ${contratto.gestore}
            ${contratto.servizio}
            ${contratto.stato}
            ${contratto.pagamentoVenditore}
            ${contratto.note}
        `.toLowerCase();

        const matchRicerca = contenuto.includes(ricerca);

        return matchMese && matchVenditore && matchPagamento && matchRicerca;

    });
}

function badgePagamento(pagamento){

    if(pagamento === "Pagato"){
        return `<span class="badge ok">Pagato</span>`;
    }

    if(pagamento === "Da pagare"){
        return `<span class="badge storno">Da pagare</span>`;
    }

    if(pagamento === "Non dovuto"){
        return `<span class="badge pending">Non dovuto</span>`;
    }

    return `<span class="badge pending">${escapeHtml(pagamento)}</span>`;
}

function badgeStato(stato){

    if(stato === "OK"){
        return `<span class="badge ok">OK</span>`;
    }

    if(stato === "Pagato"){
        return `<span class="badge paid">Pagato</span>`;
    }

    return `<span class="badge pending">${escapeHtml(stato)}</span>`;
}

function aggiornaCards(lista){

    const pratichePagabili = sommaUnita(lista);

    const provvigioniMaturate = lista
        .filter(c => c.pagamentoVenditore !== "Non dovuto")
        .reduce((totale, c) => totale + numero(c.gettoneVenditore), 0);

    const daPagare = lista
        .filter(c => c.pagamentoVenditore === "Da pagare")
        .reduce((totale, c) => totale + numero(c.gettoneVenditore), 0);

    const pagato = lista
        .filter(c => c.pagamentoVenditore === "Pagato")
        .reduce((totale, c) => totale + numero(c.gettoneVenditore), 0);

    const nonDovuto = lista
        .filter(c => c.pagamentoVenditore === "Non dovuto")
        .reduce((totale, c) => totale + numero(c.gettoneVenditore), 0);

    const venditoriDaPagare = new Set(
        lista
            .filter(c =>
                c.pagamentoVenditore === "Da pagare" &&
                numero(c.gettoneVenditore) > 0
            )
            .map(c => testo(c.venditore))
            .filter(v => v !== "")
    ).size;

    const margineMaturato = lista
        .reduce((totale, c) => totale + calcolaMargine(c), 0);

    const praticheDaSaldare = lista
        .filter(c =>
            c.pagamentoVenditore === "Da pagare" &&
            numero(c.gettoneVenditore) > 0
        )
        .reduce((totale, c) => totale + getContractUnits(c), 0);

    document.getElementById("totaleCommodity").innerText = sommaCategoria(lista, "Commodity");
    document.getElementById("totaleExtraCommodity").innerText = sommaCategoria(lista, "Extra Commodity");
    document.getElementById("pratichePagabili").innerText = pratichePagabili;
    document.getElementById("provvigioniMaturate").innerText = provvigioniMaturate + "€";
    document.getElementById("daPagareVenditori").innerText = daPagare + "€";
    document.getElementById("pagatoVenditori").innerText = pagato + "€";
    document.getElementById("venditoriDaPagare").innerText = venditoriDaPagare;
    document.getElementById("nonDovuto").innerText = nonDovuto + "€";
    document.getElementById("margineMaturato").innerText = margineMaturato + "€";
    document.getElementById("praticheDaSaldare").innerText = praticheDaSaldare;

    const selectedText = monthFilter.options[monthFilter.selectedIndex].text;
    document.getElementById("selectedMonthLabel").innerText = selectedText;
}

function creaStatisticheVenditori(lista){

    const statistiche = {};

    VENDITORI_REGISTRATI.forEach(venditore => {
        statistiche[venditore] = {
            nome: venditore,
            pratiche: 0,
            provvigioni: 0,
            daPagare: 0,
            pagato: 0,
            nonDovuto: 0
        };
    });

    lista.forEach(contratto => {

        const venditore = testo(contratto.venditore);

        if(!venditore){
            return;
        }

        if(!statistiche[venditore]){
            statistiche[venditore] = {
                nome: venditore,
                pratiche: 0,
                provvigioni: 0,
                daPagare: 0,
                pagato: 0,
                nonDovuto: 0
            };
        }

        statistiche[venditore].pratiche += getContractUnits(contratto);

        if(contratto.pagamentoVenditore !== "Non dovuto"){
            statistiche[venditore].provvigioni += numero(contratto.gettoneVenditore);
        }

        if(contratto.pagamentoVenditore === "Da pagare"){
            statistiche[venditore].daPagare += numero(contratto.gettoneVenditore);
        }

        if(contratto.pagamentoVenditore === "Pagato"){
            statistiche[venditore].pagato += numero(contratto.gettoneVenditore);
        }

        if(contratto.pagamentoVenditore === "Non dovuto"){
            statistiche[venditore].nonDovuto += numero(contratto.gettoneVenditore);
        }

    });

    return Object.values(statistiche);
}

function renderVenditori(lista){

    const tbody = document.getElementById("vendorsCommissionsBody");

    tbody.innerHTML = "";

    const statistiche = creaStatisticheVenditori(lista)
        .sort((a, b) => {

            if(b.daPagare !== a.daPagare){
                return b.daPagare - a.daPagare;
            }

            return b.provvigioni - a.provvigioni;

        });

    const top = statistiche
        .filter(v => v.provvigioni > 0)
        .sort((a, b) => b.provvigioni - a.provvigioni)[0];

    if(top){
        document.getElementById("topVendorName").innerText = top.nome;
        document.getElementById("topVendorAmount").innerText = top.provvigioni + "€";
    }else{
        document.getElementById("topVendorName").innerText = "-";
        document.getElementById("topVendorAmount").innerText = "0€";
    }

    if(statistiche.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:30px; color:#6b7280; font-weight:bold;">
                    Nessuna provvigione disponibile.
                </td>
            </tr>
        `;

        return;
    }

    statistiche.forEach(v => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHtml(v.nome)}</td>
            <td>${v.pratiche}</td>
            <td>${v.provvigioni}€</td>
            <td>${v.daPagare}€</td>
            <td>${v.pagato}€</td>
            <td>${v.nonDovuto}€</td>
            <td>
                <a class="mini-btn" href="vendor-detail.html?vendor=${slugVenditore(v.nome)}">
                    Apri Scheda
                </a>
            </td>
        `;

        tbody.appendChild(row);

    });
}

function renderRegistro(lista){

    const tbody = document.getElementById("commissionsBody");

    tbody.innerHTML = "";

    if(lista.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="13" style="text-align:center; padding:30px; color:#6b7280; font-weight:bold;">
                    Nessuna pratica provvigionale trovata.
                </td>
            </tr>
        `;

        return;
    }

    lista.forEach(c => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHtml(c.id)}</td>
            <td>${escapeHtml(c.dataInserimento)}</td>
            <td>${escapeHtml(c.nome)} ${escapeHtml(c.cognome)}</td>
            <td>${escapeHtml(c.venditore)}</td>
            <td>${escapeHtml(c.partner)}</td>
            <td>${escapeHtml(c.gestore)}</td>
            <td>${escapeHtml(c.servizio)}</td>
            <td>${badgeStato(c.stato)}</td>
            <td>${numero(c.gettoneVenditore)}€</td>
            <td>${badgePagamento(c.pagamentoVenditore)}</td>
            <td>${numero(c.gettonePartner)}€</td>
            <td>${calcolaMargine(c)}€</td>
            <td>${escapeHtml(c.note)}</td>
        `;

        tbody.appendChild(row);

    });
}

function aggiornaPagina(){

    const lista = getContrattiProvvigioni();

    aggiornaCards(lista);

    renderVenditori(lista);

    renderRegistro(lista);
}

function resetCommissionFilters(){

    searchInput.value = "";
    vendorFilter.value = "";
    paymentFilter.value = "";

    aggiornaPagina();
}

async function exportCommissionsExcel(){

    const lista = getContrattiProvvigioni();

    const meseSelezionato = monthFilter.options[monthFilter.selectedIndex].text;
    const dataExport = new Date().toLocaleDateString("it-IT");

    const pratichePagabili = sommaUnita(lista);

    const provvigioniMaturate = lista
        .filter(c => c.pagamentoVenditore !== "Non dovuto")
        .reduce((totale, c) => totale + numero(c.gettoneVenditore), 0);

    const daPagare = lista
        .filter(c => c.pagamentoVenditore === "Da pagare")
        .reduce((totale, c) => totale + numero(c.gettoneVenditore), 0);

    const pagato = lista
        .filter(c => c.pagamentoVenditore === "Pagato")
        .reduce((totale, c) => totale + numero(c.gettoneVenditore), 0);

    const margineMaturato = lista
        .reduce((totale, c) => totale + calcolaMargine(c), 0);

    let righe = "";

    if(lista.length === 0){

        righe = `
            <tr>
                <td colspan="13" class="empty">
                    Nessuna pratica provvigionale trovata.
                </td>
            </tr>
        `;

    }else{

        lista.forEach(c => {

            righe += `
                <tr>
                    <td>${escapeHtml(c.id)}</td>
                    <td>${escapeHtml(c.dataInserimento)}</td>
                    <td>${escapeHtml(c.nome)} ${escapeHtml(c.cognome)}</td>
                    <td>${escapeHtml(c.venditore)}</td>
                    <td>${escapeHtml(c.partner)}</td>
                    <td>${escapeHtml(c.gestore)}</td>
                    <td>${escapeHtml(c.servizio)}</td>
                    <td>${escapeHtml(c.stato)}</td>
                    <td>${numero(c.gettoneVenditore)}€</td>
                    <td>${escapeHtml(c.pagamentoVenditore)}</td>
                    <td>${numero(c.gettonePartner)}€</td>
                    <td>${calcolaMargine(c)}€</td>
                    <td>${escapeHtml(c.note)}</td>
                </tr>
            `;

        });

    }

    const html = `
        <html>
        <head>
            <meta charset="UTF-8">

            <style>
                body{
                    font-family:Arial, Helvetica, sans-serif;
                    color:#081120;
                }

                .header-report{
                    background:linear-gradient(90deg,#d90429,#ff7b00);
                    color:white;
                    padding:24px;
                    border-radius:18px;
                    margin-bottom:24px;
                }

                .title{
                    font-size:30px;
                    font-weight:800;
                }

                .subtitle{
                    font-size:16px;
                    margin-top:6px;
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
                    color:white;
                    padding:12px;
                    border:1px solid #d1d5db;
                    text-align:left;
                }

                td{
                    padding:10px;
                    border:1px solid #e5e7eb;
                }

                tr:nth-child(even) td{
                    background:#f9fafb;
                }

                .section-title{
                    font-size:22px;
                    font-weight:800;
                    margin:24px 0 12px 0;
                }

                .empty{
                    text-align:center;
                    padding:28px;
                    color:#6b7280;
                    font-weight:bold;
                }
            </style>
        </head>

        <body>

            <div class="header-report">
                <div class="title">TOP HOUSE - Report Provvigioni</div>
                <div class="subtitle">
                    Mensilità: ${escapeHtml(meseSelezionato)} | Esportato il: ${escapeHtml(dataExport)}
                </div>
            </div>

            <table class="summary">
                <tr>
                    <td>Pratiche Pagabili<br><span class="value">${pratichePagabili}</span></td>
                    <td>Provvigioni Maturate<br><span class="value">${provvigioniMaturate}€</span></td>
                    <td>Da Pagare<br><span class="value">${daPagare}€</span></td>
                    <td>Pagato<br><span class="value">${pagato}€</span></td>
                    <td>Margine Maturato<br><span class="value">${margineMaturato}€</span></td>
                </tr>
            </table>

            <div class="section-title">Dettaglio Provvigioni</div>

            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Data Inserimento</th>
                        <th>Cliente</th>
                        <th>Venditore</th>
                        <th>Partner</th>
                        <th>Gestore</th>
                        <th>Servizio</th>
                        <th>Stato</th>
                        <th>Gettone Venditore</th>
                        <th>Pagamento Venditore</th>
                        <th>Gettone Partner</th>
                        <th>Margine</th>
                        <th>Note</th>
                    </tr>
                </thead>

                <tbody>
                    ${righe}
                </tbody>
            </table>

        </body>
        </html>
    `;

    const blob = new Blob([html], {
        type: "application/vnd.ms-excel;charset=utf-8;"
    });

    const link = document.createElement("a");

    const meseFile = monthFilter.value || "tutte-mensilita";

    link.href = URL.createObjectURL(blob);
    link.download = `report-provvigioni-top-house-${meseFile}.xls`;

    link.click();
}

monthFilter.addEventListener("change", aggiornaPagina);
searchInput.addEventListener("input", aggiornaPagina);
vendorFilter.addEventListener("change", aggiornaPagina);
paymentFilter.addEventListener("change", aggiornaPagina);

popolaVenditori();

aggiornaPagina();
