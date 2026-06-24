const PARTNER_REGISTRATI = [
    {
        nome: "Greenword",
        categoria: "Luce / Gas",
        descrizione: "Partner multi-gestore per luce e gas",
        servizi: ["Luce", "Gas", "Luce + Gas"],
        logo: "assets/partners/logo-greenword.png"
    },
    {
        nome: "Onova",
        categoria: "Luce / Gas",
        descrizione: "Partner diretto energia",
        servizi: ["Luce", "Gas", "Luce + Gas"],
        logo: "assets/partners/logo-onova.png"
    },
    {
        nome: "S4",
        categoria: "Luce / Gas",
        descrizione: "Partner diretto energia",
        servizi: ["Luce", "Gas", "Luce + Gas"],
        logo: "assets/partners/logo-s4.png"
    },
    {
        nome: "Union",
        categoria: "Luce / Gas",
        descrizione: "Partner diretto energia",
        servizi: ["Luce", "Gas", "Luce + Gas"],
        logo: "assets/partners/logo-union.png"
    },
    {
        nome: "EKO",
        categoria: "Casa / Impianti",
        descrizione: "Partner servizi casa e impianti",
        servizi: ["Fotovoltaico", "Pompe di calore", "Climatizzatori"],
        logo: "assets/partners/logo-eko.png"
    },
    {
        nome: "WLD Impianti",
        categoria: "Allarmi / Sicurezza",
        descrizione: "Partner specializzato in sistemi di allarme e sicurezza",
        servizi: ["Allarmi"],
        logo: "assets/partners/logo-wldimpianti.png"
    },
    {
        nome: "New costruction",
        categoria: "Casa / Infissi",
        descrizione: "Partner specializzato in infissi",
        servizi: ["Infissi"],
        logo: "assets/partners/logo-newcostruction.png"
    },
    {
        nome: "Vita Group",
        categoria: "Acqua / Depuratori",
        descrizione: "Partner per depuratori acqua e servizi casa",
        servizi: ["Depuratori", "Acqua", "Casa"],
        logo: "assets/partners/logo-vitagroup.png"
    }
];

function testo(valore){
    return String(valore || "").trim();
}

function normalizzaTesto(value){
    return String(value || "").trim().toLowerCase();
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

function getParametro(nome){
    const params = new URLSearchParams(window.location.search);
    return params.get(nome) || "";
}

function iniziale(nome){
    return testo(nome).charAt(0).toUpperCase();
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
    const servizio = String(contratto.servizio || "")
        .toLowerCase()
        .replaceAll(" ", "")
        .replaceAll("_", "-");

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

function normalizzaNomePartner(nome){

    const valore = testo(nome).toLowerCase();

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

    const trovato = PARTNER_REGISTRATI.find(p => p.nome.toLowerCase() === valore);

    return trovato ? trovato.nome : testo(nome);
}

function trovaPartner(nome){

    const nomeNormalizzato = normalizzaNomePartner(nome);

    return PARTNER_REGISTRATI.find(p => p.nome === nomeNormalizzato) || {
        nome: nomeNormalizzato || "Partner non trovato",
        categoria: "-",
        descrizione: "Partner non registrato",
        servizi: ["Altro"],
        logo: ""
    };
}

const nomePartnerUrl = decodeURIComponent(getParametro("partner"));
const partner = trovaPartner(nomePartnerUrl);

const monthFilter = document.getElementById("monthFilter");
const greenwordExcludedManagers = ["onova", "union", "s4"];
const greenwordColors = ["#16a34a", "#22c55e", "#84cc16", "#ff7b00", "#d90429", "#0ea5e9", "#8b5cf6", "#f59e0b", "#14b8a6", "#64748b"];

function filtraContrattiPartner(){

    const tuttiContratti = caricaContratti();

    const meseSelezionato = monthFilter.value;

    return tuttiContratti.filter(contratto => {

        const matchPartner = normalizzaNomePartner(contratto.partner) === partner.nome;

        const meseContratto = testo(contratto.dataInserimento).slice(0, 7);

        const matchMese =
            meseSelezionato === "" ||
            meseContratto === meseSelezionato;

        return matchPartner && matchMese;

    });
}

function filtraContrattiPartnerSenzaMese(){

    const tuttiContratti = caricaContratti();

    return tuttiContratti.filter(contratto => {
        return normalizzaNomePartner(contratto.partner) === partner.nome;
    });
}

function aggiornaProfilo(){

    document.getElementById("partnerName").innerText = partner.nome;
    document.getElementById("partnerCategory").innerText = partner.categoria;
    document.getElementById("partnerCategoryInfo").innerText = partner.categoria;
    document.getElementById("partnerDescription").innerText = partner.descrizione;
    document.getElementById("partnerInitial").innerText = iniziale(partner.nome);

    const logoBox = document.getElementById("partnerLogoBox");
    const logo = document.getElementById("partnerLogo");

    if(partner.logo){
        logo.src = partner.logo;
        logo.alt = partner.nome;

        logo.onerror = function(){
            logo.style.display = "none";
            logoBox.classList.add("no-logo");
        };
    }else{
        logo.style.display = "none";
        logoBox.classList.add("no-logo");
    }

    const servicesBox = document.getElementById("partnerServices");

    servicesBox.innerHTML = "";

    partner.servizi.forEach(servizio => {
        const span = document.createElement("span");
        span.className = "service-tag";
        span.innerText = servizio;
        servicesBox.appendChild(span);
    });
}

function aggiornaCards(lista){

    const totale = sommaUnita(lista);

    const ok = sommaUnita(lista.filter(c => praticaValida(c)));

    const ko = sommaUnita(lista.filter(c => c.stato === "KO"));

    const storni = sommaUnita(lista.filter(c => c.stato === "Storno"));

    const daIncassare = lista
        .filter(c =>
            praticaValida(c) &&
            c.pagamentoPartner === "Da incassare"
        )
        .reduce((totale, c) => totale + numero(c.gettonePartner), 0);

    const incassato = lista
        .filter(c =>
            praticaValida(c) &&
            c.pagamentoPartner === "Incassato"
        )
        .reduce((totale, c) => totale + numero(c.gettonePartner), 0);

    const margine = lista
        .filter(c => praticaValida(c))
        .reduce((totale, c) => totale + calcolaMargine(c), 0);

    const okRate = totale > 0 ? Math.round((ok / totale) * 100) : 0;
    const negativeCount = ko + storni;
    const saldoPartner = incassato - daIncassare;

    document.getElementById("totaleContratti").innerText = totale;
    document.getElementById("totaleOk").innerText = ok;
    document.getElementById("totaleKo").innerText = ko;
    document.getElementById("totaleStorni").innerText = storni;
    document.getElementById("daIncassarePartner").innerText = daIncassare + "€";
    document.getElementById("incassatoPartner").innerText = incassato + "€";
    document.getElementById("margineMaturato").innerText = margine + "€";

    document.getElementById("okRate").innerText = okRate + "%";
    document.getElementById("negativeCount").innerText = negativeCount;

    document.getElementById("partnerBalance").innerText = saldoPartner + "€";

    const selectedText = monthFilter.options[monthFilter.selectedIndex].text;
    document.getElementById("selectedMonthLabel").innerText = selectedText;
}

function renderContratti(lista){

    const tbody = document.getElementById("partnerContractsBody");

    tbody.innerHTML = "";

    if(lista.length === 0){

        const row = document.createElement("tr");

        row.innerHTML = `
            <td colspan="14" style="text-align:center; padding:30px; color:#6b7280; font-weight:bold;">
                Nessun contratto trovato per questo partner.
            </td>
        `;

        tbody.appendChild(row);

        return;
    }

    lista.forEach(contratto => {

        const margine = calcolaMargine(contratto);

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHtml(contratto.id)}</td>
            <td>${escapeHtml(contratto.dataInserimento)}</td>
            <td>${escapeHtml(contratto.dataEsito)}</td>
            <td>${escapeHtml(contratto.nome)}</td>
            <td>${escapeHtml(contratto.cognome)}</td>
            <td>${escapeHtml(contratto.venditore)}</td>
            <td>${escapeHtml(contratto.gestore)}</td>
            <td>${escapeHtml(contratto.servizio)}</td>
            <td><span class="badge pending">${getContractCategory(contratto)}</span></td>
            <td>${escapeHtml(contratto.stato)}</td>
            <td>${numero(contratto.gettonePartner)}€</td>
            <td>${escapeHtml(contratto.pagamentoPartner)}</td>
            <td>${numero(contratto.gettoneVenditore)}€</td>
            <td>${margine}€</td>
            <td>${escapeHtml(contratto.note)}</td>
        `;

        tbody.appendChild(row);

    });
}

function creaDatiMensili(){

    const contratti = filtraContrattiPartnerSenzaMese();

    const mesi = [
        { value: "2026-01", label: "Gen" },
        { value: "2026-02", label: "Feb" },
        { value: "2026-03", label: "Mar" },
        { value: "2026-04", label: "Apr" },
        { value: "2026-05", label: "Mag" },
        { value: "2026-06", label: "Giu" },
        { value: "2026-07", label: "Lug" },
        { value: "2026-08", label: "Ago" },
        { value: "2026-09", label: "Set" },
        { value: "2026-10", label: "Ott" },
        { value: "2026-11", label: "Nov" },
        { value: "2026-12", label: "Dic" }
    ];

    return mesi.map(mese => {

        const contrattiMese = contratti.filter(c => {
            return testo(c.dataInserimento).slice(0, 7) === mese.value;
        });

        return {
            mese: mese.label,
            ok: sommaUnita(contrattiMese.filter(c => praticaValida(c))),
            ko: sommaUnita(contrattiMese.filter(c => c.stato === "KO")),
            storni: sommaUnita(contrattiMese.filter(c => c.stato === "Storno")),
            incassato: contrattiMese
                .filter(c =>
                    praticaValida(c) &&
                    c.pagamentoPartner === "Incassato"
                )
                .reduce((totale, c) => totale + numero(c.gettonePartner), 0)
        };

    });
}

function renderGraficoMensile(){

    const container = document.getElementById("monthlyChart");

    const dati = creaDatiMensili();

    const maxValore = Math.max(
        1,
        ...dati.map(d => d.ok + d.ko + d.storni)
    );

    container.innerHTML = "";

    dati.forEach(dato => {

        const totale = dato.ok + dato.ko + dato.storni;
        const altezza = Math.max(8, Math.round((totale / maxValore) * 150));

        const item = document.createElement("div");

        item.className = "chart-item";

        item.innerHTML = `
            <div class="chart-bar" style="height:${altezza}px;">
                <span>${totale}</span>
            </div>
            <strong>${dato.mese}</strong>
            <small>OK ${dato.ok} · KO ${dato.ko} · S ${dato.storni}</small>
        `;

        container.appendChild(item);

    });
}


function getPartnerNameForGreenwordCheck(){
    const nomeDaUrl = getParametro("partner");
    const nomeDaOggetto = partner?.nome;
    const nomeDaPagina = document.getElementById("partnerName")?.innerText;

    return nomeDaUrl || nomeDaOggetto || nomeDaPagina || "";
}

function isGreenwordPartner(){
    const partnerName = normalizzaNomePartner(getPartnerNameForGreenwordCheck());
    const isGreenword = normalizzaTesto(partnerName) === "greenword";

    return isGreenword;
}

function isGreenwordContract(contratto){
    const partnerName = normalizzaNomePartner(contratto.partner);
    const isGreenword = normalizzaTesto(partnerName) === "greenword";

    return isGreenword;
}

function ensureGreenwordAnalysisSection(){
    let box = document.getElementById("greenwordAnalysisBox");

    if(box){
        return box;
    }

    const contractsSection = document.querySelector("#partnerContractsBody")?.closest("section");

    if(!contractsSection){
        return null;
    }

    box = document.createElement("section");
    box.className = "box full-box greenword-analysis";
    box.id = "greenwordAnalysisBox";
    box.innerHTML = `
        <div class="section-title">
            <div>
                <h3>🟢 Analisi Greenword</h3>
                <p>Distribuzione contratti Greenword per gestore e venditore.</p>
            </div>

            <div class="greenword-controls">
                <select id="greenwordChartMode">
                    <option value="gestori">Contratti per gestore</option>
                    <option value="venditori">Venditori Greenword</option>
                </select>
            </div>
        </div>

        <div class="greenword-chart-layout">
            <div class="greenword-chart-left">
                <div id="greenwordPieChart" class="greenword-pie-chart"></div>
                <div id="greenwordPieLegend" class="greenword-legend"></div>
            </div>

            <div class="greenword-chart-right">
                <div id="greenwordChartSummary"></div>
            </div>
        </div>
    `;

    contractsSection.parentNode.insertBefore(box, contractsSection);
    document.getElementById("greenwordChartMode")?.addEventListener("change", renderGreenwordAnalysis);

    return box;
}

function filtraContrattiGreenword(){
    return caricaContratti().filter(isGreenwordContract);
}


function raggruppaGreenword(contratti, campo, escludiGestori){
    const mappa = new Map();

    contratti.forEach(contratto => {
        const nome = testo(contratto[campo]) || "Non specificato";
        const nomeNormalizzato = normalizzaTesto(nome);

        if(escludiGestori && greenwordExcludedManagers.includes(nomeNormalizzato)){
            return;
        }

        mappa.set(nome, (mappa.get(nome) || 0) + getContractUnits(contratto));
    });

    return [...mappa.entries()]
        .map(([nome, valore]) => ({ nome, valore }))
        .sort((a, b) => b.valore - a.valore || a.nome.localeCompare(b.nome));
}

function renderGreenwordPie(dati){
    const chart = document.getElementById("greenwordPieChart");
    const legend = document.getElementById("greenwordPieLegend");
    const totale = dati.reduce((somma, dato) => somma + dato.valore, 0);

    if(!chart || !legend){
        return totale;
    }

    if(totale === 0){
        chart.style.background = "#f3f4f6";
        chart.innerHTML = `<span>Nessun dato</span>`;
        legend.innerHTML = `<div class="greenword-empty">Nessun dato Greenword disponibile</div>`;
        return totale;
    }

    let start = 0;
    const gradient = dati.map((dato, index) => {
        const percentuale = (dato.valore / totale) * 100;
        const end = start + percentuale;
        const slice = `${greenwordColors[index % greenwordColors.length]} ${start}% ${end}%`;
        start = end;
        return slice;
    }).join(", ");

    chart.style.background = `conic-gradient(${gradient})`;
    chart.innerHTML = `<span>${totale}<small>contratti</small></span>`;
    legend.innerHTML = dati.map((dato, index) => {
        const percentuale = Math.round((dato.valore / totale) * 100);
        const colore = greenwordColors[index % greenwordColors.length];
        return `<div><span><span class="legend-dot" style="background:${colore}"></span>${escapeHtml(dato.nome)}</span><span>${dato.valore} (${percentuale}%)</span></div>`;
    }).join("");

    return totale;
}

function renderGreenwordSummary(dati, totale, mode){
    const summary = document.getElementById("greenwordChartSummary");

    if(!summary){
        return;
    }

    if(totale === 0){
        summary.innerHTML = `<div class="greenword-empty">Nessun dato Greenword disponibile</div>`;
        return;
    }

    const titolo = mode === "venditori" ? "Venditori più attivi con Greenword" : "Gestori Greenword";

    summary.innerHTML = `
        <h4>${titolo}</h4>
        <p class="greenword-total">Totale contratti Greenword considerati: <strong>${totale}</strong></p>
        <div class="greenword-ranking">
            ${dati.map(dato => {
                const percentuale = Math.round((dato.valore / totale) * 100);
                const nome = escapeHtml(dato.nome);
                const link = mode === "venditori"
                    ? `<a href="vendor-detail.html?vendor=${encodeURIComponent(dato.nome)}">${nome}</a>`
                    : `<strong>${nome}</strong>`;

                return `
                    <div class="greenword-ranking-row">
                        <div class="ranking-info">
                            <span>${link}</span>
                            <small>${dato.valore} contratti · ${percentuale}%</small>
                        </div>
                        <div class="greenword-ranking-bar"><span style="width:${percentuale}%"></span></div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function renderGreenwordAnalysis(){
    if(!isGreenwordPartner()){
        document.getElementById("greenwordAnalysisBox")?.remove();
        return;
    }

    const box = ensureGreenwordAnalysisSection();

    if(!box){
        return;
    }

    const mode = document.getElementById("greenwordChartMode")?.value || "gestori";
    const contratti = filtraContrattiGreenword();
    const dati = mode === "venditori"
        ? raggruppaGreenword(contratti, "venditore", false)
        : raggruppaGreenword(contratti, "gestore", true);
    const totale = renderGreenwordPie(dati);

    renderGreenwordSummary(dati, totale, mode);
}

function aggiornaPagina(){

    const lista = filtraContrattiPartner();

    aggiornaCards(lista);

    renderContratti(lista);

    renderGraficoMensile();

    renderGreenwordAnalysis();
}

async function exportPartnerExcel(){

    const lista = filtraContrattiPartner();

    const meseSelezionato = monthFilter.options[monthFilter.selectedIndex].text;
    const dataExport = new Date().toLocaleDateString("it-IT");

    const totale = sommaUnita(lista);
    const ok = sommaUnita(lista.filter(c => praticaValida(c)));
    const ko = sommaUnita(lista.filter(c => c.stato === "KO"));
    const storni = sommaUnita(lista.filter(c => c.stato === "Storno"));

    const daIncassare = lista
        .filter(c =>
            praticaValida(c) &&
            c.pagamentoPartner === "Da incassare"
        )
        .reduce((totale, c) => totale + numero(c.gettonePartner), 0);

    const incassato = lista
        .filter(c =>
            praticaValida(c) &&
            c.pagamentoPartner === "Incassato"
        )
        .reduce((totale, c) => totale + numero(c.gettonePartner), 0);

    const margine = lista
        .filter(c => praticaValida(c))
        .reduce((totale, c) => totale + calcolaMargine(c), 0);

    let righe = "";

    if(lista.length === 0){

        righe = `
            <tr>
                <td colspan="14" class="empty">
                    Nessun contratto trovato.
                </td>
            </tr>
        `;

    }else{

        lista.forEach(c => {

            const margineContratto = calcolaMargine(c);

            righe += `
                <tr>
                    <td>${escapeHtml(c.id)}</td>
                    <td>${escapeHtml(c.dataInserimento)}</td>
                    <td>${escapeHtml(c.dataEsito)}</td>
                    <td>${escapeHtml(c.nome)}</td>
                    <td>${escapeHtml(c.cognome)}</td>
                    <td>${escapeHtml(c.venditore)}</td>
                    <td>${escapeHtml(c.gestore)}</td>
                    <td>${escapeHtml(c.servizio)}</td>
                    <td>${escapeHtml(c.stato)}</td>
                    <td>${numero(c.gettonePartner)}€</td>
                    <td>${escapeHtml(c.pagamentoPartner)}</td>
                    <td>${numero(c.gettoneVenditore)}€</td>
                    <td>${margineContratto}€</td>
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
                <div class="title">TOP HOUSE - Report Partner</div>
                <div class="subtitle">
                    Partner: ${escapeHtml(partner.nome)} | Categoria: ${escapeHtml(partner.categoria)} | Mensilità: ${escapeHtml(meseSelezionato)} | Esportato il: ${escapeHtml(dataExport)}
                </div>
            </div>

            <table class="summary">
                <tr>
                    <td>Contratti Totali<br><span class="value">${totale}</span></td>
                    <td>Contratti OK<br><span class="value">${ok}</span></td>
                    <td>KO<br><span class="value">${ko}</span></td>
                    <td>Storni<br><span class="value">${storni}</span></td>
                    <td>Da Incassare<br><span class="value">${daIncassare}€</span></td>
                    <td>Incassato<br><span class="value">${incassato}€</span></td>
                    <td>Margine Maturato<br><span class="value">${margine}€</span></td>
                </tr>
            </table>

            <div class="section-title">Dettaglio Contratti</div>

            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Data Inserimento</th>
                        <th>Data Esito</th>
                        <th>Nome</th>
                        <th>Cognome</th>
                        <th>Venditore</th>
                        <th>Gestore</th>
                        <th>Servizio</th>
                        <th>Stato</th>
                        <th>Gettone Partner</th>
                        <th>Pagamento Partner</th>
                        <th>Gettone Venditore</th>
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
    const nomeFile = partner.nome.toLowerCase().replaceAll(" ", "-");

    link.href = URL.createObjectURL(blob);
    link.download = `report-partner-${nomeFile}-${meseFile}.xls`;

    link.click();
}

function printPartnerReport(){
    window.print();
}

monthFilter.addEventListener("change", aggiornaPagina);


aggiornaProfilo();

aggiornaPagina();
