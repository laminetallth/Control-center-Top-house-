const PARTNER_REGISTRATI = [
    {
        nome: "Greenword",
        categoria: "Luce / Gas",
        descrizione: "Partner multi-gestore per luce e gas",
        servizi: ["Luce", "Gas", "Luce + Gas"],
        zona: "Italia",
        foto: "assets/partners/greenword.jpg"
    },
    {
        nome: "Onova",
        categoria: "Luce / Gas",
        descrizione: "Partner diretto energia",
        servizi: ["Luce", "Gas", "Luce + Gas"],
        zona: "Italia",
        foto: "assets/partners/onova.jpg"
    },
    {
        nome: "S4",
        categoria: "Luce / Gas",
        descrizione: "Partner diretto energia",
        servizi: ["Luce", "Gas", "Luce + Gas"],
        zona: "Italia",
        foto: "assets/partners/s4.jpg"
    },
    {
        nome: "Union",
        categoria: "Luce / Gas",
        descrizione: "Partner diretto energia",
        servizi: ["Luce", "Gas", "Luce + Gas"],
        zona: "Italia",
        foto: "assets/partners/union.jpg"
    },
    {
        nome: "EKO",
        categoria: "Casa / Impianti",
        descrizione: "Fotovoltaico, caldaie, wall box, pompe di calore e climatizzatori",
        servizi: ["Fotovoltaico", "Caldaia", "Wall box", "Pompa di calore", "Climatizzatore"],
        zona: "Italia",
        foto: "assets/partners/eko.jpg"
    },
    {
        nome: "New costruction",
        categoria: "Infissi",
        descrizione: "Partner dedicato agli infissi",
        servizi: ["Infissi"],
        zona: "Italia",
        foto: "assets/partners/new-costruction.jpg"
    },
    {
        nome: "WLD Impianti",
        categoria: "Allarmi",
        descrizione: "Partner dedicato agli allarmi",
        servizi: ["Allarmi"],
        zona: "Italia",
        foto: "assets/partners/wld-impianti.jpg"
    },
    {
        nome: "Vita Group",
        categoria: "Depuratori acqua",
        descrizione: "Partner dedicato ai depuratori acqua",
        servizi: ["Depuratore acqua"],
        zona: "Italia",
        foto: "assets/partners/vita-group.jpg"
    }
];

const COLORI_GRAFICO = [
    "#d90429",
    "#ff7b00",
    "#081120",
    "#f97316",
    "#dc2626",
    "#64748b",
    "#111827",
    "#fb923c",
    "#b91c1c",
    "#475569"
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
        categoria: "Altro",
        descrizione: "Partner non classificato",
        servizi: [],
        zona: "-",
        foto: ""
    };
}

const nomePartner = decodeURIComponent(getParametro("partner"));
const partner = trovaPartner(nomePartner);

const monthFilter = document.getElementById("monthFilter");
const chartMode = document.getElementById("chartMode");

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
    document.getElementById("partnerCategory").innerText = partner.descrizione || "Partner";
    document.getElementById("partnerCategoryLabel").innerText = partner.categoria || "-";
    document.getElementById("partnerArea").innerText = partner.zona || "-";
    document.getElementById("partnerInitials").innerText = iniziali(partner.nome);
    document.getElementById("partnerServices").innerText = partner.servizi.join(" · ") || "-";

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

    if(partner.nome === "Greenword"){
        chartMode.value = "gestori";
        document.getElementById("analysisSubtitle").innerText = "Greenword è multi-gestore: puoi analizzare gestori, venditori o andamento mensile.";
    }else{
        chartMode.value = "andamento";
        document.getElementById("analysisSubtitle").innerText = "Puoi cambiare grafico scegliendo andamento, gestori o venditori.";
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

function raggruppa(lista, campo){

    const gruppi = {};

    lista.forEach(contratto => {

        const chiave = testo(contratto[campo]) || "Non indicato";

        if(!gruppi[chiave]){
            gruppi[chiave] = {
                nome: chiave,
                valore: 0,
                ok: 0,
                ko: 0,
                storni: 0
            };
        }

        gruppi[chiave].valore += 1;

        if(contratto.stato === "OK" || contratto.stato === "Pagato"){
            gruppi[chiave].ok += 1;
        }

        if(contratto.stato === "KO"){
            gruppi[chiave].ko += 1;
        }

        if(contratto.stato === "Storno"){
            gruppi[chiave].storni += 1;
        }

    });

    return Object.values(gruppi).sort((a, b) => b.valore - a.valore);
}

function renderGraficoTorta(dati, titolo, sottotitolo){

    const container = document.getElementById("analysisChart");

    if(dati.length === 0){

        container.innerHTML = `
            <div class="empty-chart">
                Nessun dato disponibile per il grafico selezionato.
            </div>
        `;

        return;
    }

    const totale = dati.reduce((somma, voce) => somma + voce.valore, 0);

    let inizio = 0;

    const gradienti = dati.map((voce, index) => {

        const percentuale = (voce.valore / totale) * 100;
        const fine = inizio + percentuale;
        const colore = COLORI_GRAFICO[index % COLORI_GRAFICO.length];

        const pezzo = `${colore} ${inizio}% ${fine}%`;

        inizio = fine;

        return pezzo;

    });

    const legenda = dati.map((voce, index) => {

        const colore = COLORI_GRAFICO[index % COLORI_GRAFICO.length];
        const percentuale = Math.round((voce.valore / totale) * 100);

        return `
            <li>
                <span class="legend-dot" style="background:${colore};"></span>
                <div>
                    <strong>${voce.nome}</strong>
                    <small>${voce.valore} pratiche · ${percentuale}% · OK ${voce.ok} · KO ${voce.ko} · S ${voce.storni}</small>
                </div>
            </li>
        `;

    }).join("");

    container.innerHTML = `
        <div class="pie-layout">

            <div class="pie-circle" style="background:conic-gradient(${gradienti.join(",")});">
                <div class="pie-center">
                    <strong>${totale}</strong>
                    <span>pratiche</span>
                </div>
            </div>

            <div class="pie-info">
                <h4>${titolo}</h4>
                <p>${sottotitolo}</p>

                <ul class="pie-legend">
                    ${legenda}
                </ul>
            </div>

        </div>
    `;
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

    const container = document.getElementById("analysisChart");

    const dati = creaDatiMensili();

    const maxValore = Math.max(
        1,
        ...dati.map(d => d.ok + d.ko + d.storni)
    );

    let items = "";

    dati.forEach(dato => {

        const totale = dato.ok + dato.ko + dato.storni;
        const altezza = Math.max(8, Math.round((totale / maxValore) * 150));

        items += `
            <div class="chart-item">
                <div class="chart-bar" style="height:${altezza}px;">
                    <span>${totale}</span>
                </div>
                <strong>${dato.mese}</strong>
                <small>OK ${dato.ok} · KO ${dato.ko} · S ${dato.storni}</small>
            </div>
        `;

    });

    container.innerHTML = `
        <div class="monthly-chart">
            ${items}
        </div>
    `;
}

function renderAnalisi(){

    const lista = filtraContrattiPartner();

    const modalita = chartMode.value;

    if(modalita === "gestori"){

        const dati = raggruppa(lista, "gestore");

        renderGraficoTorta(
            dati,
            "Distribuzione per Gestore",
            "Mostra con quali gestori stai lavorando di più nel periodo selezionato."
        );

        return;
    }

    if(modalita === "venditori"){

        const dati = raggruppa(lista, "venditore");

        renderGraficoTorta(
            dati,
            "Distribuzione per Venditore",
            "Mostra quali venditori stanno lavorando di più con questo partner."
        );

        return;
    }

    renderGraficoMensile();
}

function aggiornaPagina(){

    const lista = filtraContrattiPartner();

    aggiornaCards(lista);

    renderContratti(lista);

    renderAnalisi();
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
            
