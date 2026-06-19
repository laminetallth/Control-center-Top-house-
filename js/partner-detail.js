const PARTNER_REGISTRATI = [
    {
        nome: "EKO",
        categoria: "Partner Energia / Servizi",
        zona: "Italia",
        foto: "assets/partners/eko.jpg"
    },
    {
        nome: "Greenword",
        categoria: "Partner Energia",
        zona: "Italia",
        foto: "assets/partners/greenword.jpg"
    },
    {
        nome: "New costruction",
        categoria: "Partner Edilizia / Casa",
        zona: "Italia",
        foto: "assets/partners/new-costruction.jpg"
    },
    {
        nome: "Onova",
        categoria: "Partner Energia",
        zona: "Italia",
        foto: "assets/partners/onova.jpg"
    },
    {
        nome: "S4",
        categoria: "Partner Energia",
        zona: "Italia",
        foto: "assets/partners/s4.jpg"
    },
    {
        nome: "Union",
        categoria: "Partner Energia",
        zona: "Italia",
        foto: "assets/partners/union.jpg"
    },
    {
        nome: "WLD Impianti",
        categoria: "Partner Impianti",
        zona: "Italia",
        foto: "assets/partners/wld-impianti.jpg"
    }
];

function testo(valore){
    return String(valore || "").trim();
}

function numero(valore){
    return Number(valore || 0);
}

function getParametro(nome){
    const params = new URLSearchParams(window.location.search);
    return params.get(nome) || "";
}

function iniziali(nome){
    return testo(nome)
        .split(" ")
        .map(parte => parte.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function caricaContratti(){
    try{
        const dati = JSON.parse(localStorage.getItem("contrattiTopHouse"));

        if(Array.isArray(dati)){
            return dati;
        }

        return [];
    }catch(error){
        return [];
    }
}

function calcolaMargine(contratto){

    if(contratto.stato !== "OK" && contratto.stato !== "Pagato"){
        return 0;
    }

    return numero(contratto.gettonePartner) - numero(contratto.gettoneVenditore);
}

function trovaPartner(nome){
    return PARTNER_REGISTRATI.find(p => p.nome === nome) || {
        nome: nome,
        categoria: "Partner",
        zona: "-",
        foto: ""
    };
}

const nomePartner = decodeURIComponent(getParametro("partner"));
const partner = trovaPartner(nomePartner);

const monthFilter = document.getElementById("monthFilter");

function filtraContrattiPartner(){

    const tuttiContratti = caricaContratti();

    const meseSelezionato = monthFilter.value;

    return tuttiContratti.filter(contratto => {

        const matchPartner = testo(contratto.partner) === nomePartner;

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
        return testo(contratto.partner) === nomePartner;
    });
}

function aggiornaProfilo(){

    document.getElementById("partnerName").innerText = partner.nome || "-";
    document.getElementById("partnerCategory").innerText = partner.categoria || "Partner";
    document.getElementById("partnerArea").innerText = partner.zona || "-";
    document.getElementById("partnerInitials").innerText = iniziali(partner.nome);

    const photo = document.getElementById("partnerPhoto");
    const photoBox = document.getElementById("partnerPhotoBox");

    if(partner.foto){
        photo.src = partner.foto;
        photo.alt = partner.nome;

        photo.onerror = function(){
            photo.style.display = "none";
            photoBox.classList.add("no-photo");
        };
    }else{
        photo.style.display = "none";
        photoBox.classList.add("no-photo");
    }
}

function aggiornaCards(lista){

    const totale = lista.length;

    const ok = lista.filter(c => c.stato === "OK" || c.stato === "Pagato").length;

    const ko = lista.filter(c => c.stato === "KO").length;

    const storni = lista.filter(c => c.stato === "Storno").length;

    const daIncassare = lista
        .filter(c =>
            (c.stato === "OK" || c.stato === "Pagato") &&
            c.pagamentoPartner === "Da incassare"
        )
        .reduce((totale, c) => totale + numero(c.gettonePartner), 0);

    const incassato = lista
        .filter(c =>
            (c.stato === "OK" || c.stato === "Pagato") &&
            c.pagamentoPartner === "Incassato"
        )
        .reduce((totale, c) => totale + numero(c.gettonePartner), 0);

    const margine = lista
        .filter(c => c.stato === "OK" || c.stato === "Pagato")
        .reduce((totale, c) => totale + calcolaMargine(c), 0);

    const okRate = totale > 0 ? Math.round((ok / totale) * 100) : 0;

    document.getElementById("totaleContratti").innerText = totale;
    document.getElementById("totaleOk").innerText = ok;
    document.getElementById("totaleKo").innerText = ko;
    document.getElementById("totaleStorni").innerText = storni;
    document.getElementById("daIncassare").innerText = daIncassare + "€";
    document.getElementById("incassato").innerText = incassato + "€";
    document.getElementById("margineGenerato").innerText = margine + "€";

    document.getElementById("okRate").innerText = okRate + "%";
    document.getElementById("negativeCount").innerText = ko + storni;

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
            <td>${contratto.id || ""}</td>
            <td>${contratto.dataInserimento || ""}</td>
            <td>${contratto.dataEsito || ""}</td>
            <td>${contratto.nome || ""}</td>
            <td>${contratto.cognome || ""}</td>
            <td>${contratto.venditore || ""}</td>
            <td>${contratto.gestore || ""}</td>
            <td>${contratto.servizio || ""}</td>
            <td>${contratto.stato || ""}</td>
            <td>${contratto.gettonePartner || 0}€</td>
            <td>${contratto.gettoneVenditore || 0}€</td>
            <td>${margine}€</td>
            <td>${contratto.pagamentoPartner || ""}</td>
            <td>${contratto.note || ""}</td>
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
            ok: contrattiMese.filter(c => c.stato === "OK" || c.stato === "Pagato").length,
            ko: contrattiMese.filter(c => c.stato === "KO").length,
            storni: contrattiMese.filter(c => c.stato === "Storno").length
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

function aggiornaPagina(){

    const lista = filtraContrattiPartner();

    aggiornaCards(lista);

    renderContratti(lista);

    renderGraficoMensile();
}

async function exportPartnerExcel(){

    const lista = filtraContrattiPartner();

    const meseSelezionato = monthFilter.options[monthFilter.selectedIndex].text;
    const dataExport = new Date().toLocaleDateString("it-IT");

    const totale = lista.length;
    const ok = lista.filter(c => c.stato === "OK" || c.stato === "Pagato").length;
    const ko = lista.filter(c => c.stato === "KO").length;
    const storni = lista.filter(c => c.stato === "Storno").length;

    const daIncassare = lista
        .filter(c =>
            (c.stato === "OK" || c.stato === "Pagato") &&
            c.pagamentoPartner === "Da incassare"
        )
        .reduce((totale, c) => totale + numero(c.gettonePartner), 0);

    const incassato = lista
        .filter(c =>
            (c.stato === "OK" || c.stato === "Pagato") &&
            c.pagamentoPartner === "Incassato"
        )
        .reduce((totale, c) => totale + numero(c.gettonePartner), 0);

    const margine = lista
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
                    <td>${c.id || ""}</td>
                    <td>${c.dataInserimento || ""}</td>
                    <td>${c.dataEsito || ""}</td>
                    <td>${c.nome || ""}</td>
                    <td>${c.cognome || ""}</td>
                    <td>${c.venditore || ""}</td>
                    <td>${c.gestore || ""}</td>
                    <td>${c.servizio || ""}</td>
                    <td>${c.stato || ""}</td>
                    <td>${c.gettonePartner || 0}€</td>
                    <td>${c.gettoneVenditore || 0}€</td>
                    <td>${margineContratto}€</td>
                    <td>${c.pagamentoPartner || ""}</td>
                    <td>${c.note || ""}</td>
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

                ${logoBase64 ? `<img src="${logoBase64}" class="logo">` : ""}

                <div class="title">TOP HOUSE - Report Partner</div>
                <div class="subtitle">
                    Partner: ${partner.nome} | Categoria: ${partner.categoria} | Mensilità: ${meseSelezionato} | Esportato il: ${dataExport}
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
                        <th>Gettone Venditore</th>
                        <th>Margine Maturato</th>
                        <th>Pagamento Partner</th>
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
    const nomeFile = partner.nome.toLowerCase().replace(/\s+/g, "-");

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
