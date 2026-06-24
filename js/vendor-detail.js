const VENDITORI_REGISTRATI = [
    {
        nome: "Antonio Attardi",
        zona: "Lombardia",
        ruolo: "Venditore",
        foto: "assets/vendors/antonio-attardi.png"
    },
    {
        nome: "Davide Marino",
        zona: "Praia a Mare",
        ruolo: "Venditore",
        foto: "assets/vendors/davide-marino.png"
    },
    {
        nome: "Fabio Magnago",
        zona: "Empoli",
        ruolo: "Venditore",
        foto: "assets/vendors/fabio-magnago.png"
    },
    {
        nome: "Gabriele Straniero",
        zona: "Italia",
        ruolo: "Direttore Commerciale e Vendite",
        foto: "assets/vendors/gabriele-straniero.png"
    },
    {
        nome: "Giuseppe Maresca",
        zona: "Empoli",
        ruolo: "Venditore",
        foto: "assets/vendors/giuseppe-maresca.png"
    },
    {
        nome: "Lamine Tall",
        zona: "Lombardia",
        ruolo: "Responsabile Amministrativo Procedure e BO",
        foto: "assets/vendors/lamine-tall.png"
    },
    {
        nome: "Morena Caccavo",
        zona: "Lombardia",
        ruolo: "Venditore",
        foto: "assets/vendors/morena-caccavo.png"
    },
    {
        nome: "Studio Cian",
        zona: "Cassano Magnago",
        ruolo: "Venditore",
        foto: "assets/vendors/studio-cian.png"
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
    }catch(error){}

    return [];
}

function caricaAffiliati(){
    try{
        const dati = JSON.parse(localStorage.getItem("affiliatiTopHouse"));
        return Array.isArray(dati) ? dati : [];
    }catch(error){
        return [];
    }
}

function escapeHtml(valore){
    return testo(valore).replace(/[&<>'\"]/g, carattere => ({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        "'":"&#39;",
        '\"':"&quot;"
    }[carattere]));
}

function badgeAffiliato(stato){
    const classe = testo(stato).toLowerCase().replaceAll(" ", "-");
    return `<span class="badge ${classe}">${escapeHtml(stato || "-")}</span>`;
}

function caricaStatiVenditori(){
    const stati = JSON.parse(localStorage.getItem("statiVenditoriTopHouse"));

    if(stati && typeof stati === "object"){
        return stati;
    }

    return {};
}

function salvaStatoVenditore(nome, stato){

    const stati = caricaStatiVenditori();

    stati[nome] = stato;

    localStorage.setItem("statiVenditoriTopHouse", JSON.stringify(stati));
}

function statoVenditore(nome){

    const stati = caricaStatiVenditori();

    return stati[nome] || "Attivo";
}

function calcolaMargine(contratto){

    if(contratto.stato !== "OK" && contratto.stato !== "Pagato"){
        return 0;
    }

    return numero(contratto.gettonePartner) - numero(contratto.gettoneVenditore);
}

function trovaVenditore(nome){
    return VENDITORI_REGISTRATI.find(v => v.nome === nome) || {
        nome: nome,
        zona: "-",
        ruolo: "Venditore",
        foto: ""
    };
}

const nomeVenditore = decodeURIComponent(getParametro("vendor"));
const venditore = trovaVenditore(nomeVenditore);

const monthFilter = document.getElementById("monthFilter");

function filtraContrattiVenditore(){

    const tuttiContratti = caricaContratti();

    const meseSelezionato = monthFilter.value;

    return tuttiContratti.filter(contratto => {

        const matchVenditore = testo(contratto.venditore) === nomeVenditore;

        const meseContratto = testo(contratto.dataInserimento).slice(0, 7);

        const matchMese =
            meseSelezionato === "" ||
            meseContratto === meseSelezionato;

        return matchVenditore && matchMese;

    });
}

function filtraContrattiVenditoreSenzaMese(){

    const tuttiContratti = caricaContratti();

    return tuttiContratti.filter(contratto => {
        return testo(contratto.venditore) === nomeVenditore;
    });
}

function aggiornaProfilo(){

    document.getElementById("vendorName").innerText = venditore.nome || "-";
    document.getElementById("vendorRole").innerText = venditore.ruolo || "Venditore";
    document.getElementById("vendorArea").innerText = venditore.zona || "-";
    document.getElementById("vendorInitials").innerText = iniziali(venditore.nome);

    const photo = document.getElementById("vendorPhoto");
    const photoBox = document.getElementById("vendorPhotoBox");

    if(venditore.foto){
        photo.src = venditore.foto;
        photo.alt = venditore.nome;

        photo.onerror = function(){
            photo.style.display = "none";
            photoBox.classList.add("no-photo");
        };
    }else{
        photo.style.display = "none";
        photoBox.classList.add("no-photo");
    }

    const statoAttuale = statoVenditore(venditore.nome);

    const vendorInfoList = document.querySelector(".vendor-info-list");

    vendorInfoList.innerHTML = `
        <div>
            <strong>Regione / Zona</strong>
            <span>${venditore.zona || "-"}</span>
        </div>

        <div>
            <strong>Ruolo</strong>
            <span>${venditore.ruolo || "Venditore"}</span>
        </div>

        <div>
            <strong>Stato collaboratore</strong>
            <select id="vendorStatusSelect" style="padding:8px 12px; border-radius:12px; border:1px solid #ddd; font-weight:bold;">
                <option value="Attivo">Attivo</option>
                <option value="Non attivo">Non attivo</option>
            </select>
        </div>
    `;

    const statusSelect = document.getElementById("vendorStatusSelect");

    statusSelect.value = statoAttuale;

    statusSelect.addEventListener("change", function(){
        salvaStatoVenditore(venditore.nome, statusSelect.value);
        alert("Stato aggiornato: " + statusSelect.value);
    });
}

function filtraAffiliatiVenditore(){
    return caricaAffiliati().filter(affiliato => testo(affiliato.venditore) === nomeVenditore);
}

function renderAffiliatiVenditore(){
    const affiliati = filtraAffiliatiVenditore();
    const tbody = document.getElementById("vendorAffiliatesBody");

    document.getElementById("totaleAffiliati").innerText = affiliati.length;
    document.getElementById("affiliatiAttivi").innerText = affiliati.filter(a => a.stato === "Attivo").length;

    tbody.innerHTML = "";

    if(affiliati.length === 0){
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:30px; color:#6b7280; font-weight:bold;">
                    Nessun affiliato collegato a questo venditore.
                </td>
            </tr>
        `;
        return;
    }

    affiliati.forEach(affiliato => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(affiliato.nomeAttivita)}</td>
            <td>${escapeHtml(affiliato.citta)}</td>
            <td>${numero(affiliato.gettoneStipulato)}€</td>
            <td>${badgeAffiliato(affiliato.stato)}</td>
            <td>${escapeHtml(affiliato.note)}</td>
        `;
        tbody.appendChild(row);
    });
}

function aggiornaCards(lista){

    const totale = lista.length;

    const ok = lista.filter(c => c.stato === "OK" || c.stato === "Pagato").length;

    const ko = lista.filter(c => c.stato === "KO").length;

    const storni = lista.filter(c => c.stato === "Storno").length;

    const provvigioniMaturate = lista
        .filter(c => c.stato === "OK" || c.stato === "Pagato")
        .reduce((totale, c) => totale + numero(c.gettoneVenditore), 0);

    const daPagare = lista
        .filter(c =>
            (c.stato === "OK" || c.stato === "Pagato") &&
            c.pagamentoVenditore === "Da pagare"
        )
        .reduce((totale, c) => totale + numero(c.gettoneVenditore), 0);

    const margine = lista
        .filter(c => c.stato === "OK" || c.stato === "Pagato")
        .reduce((totale, c) => totale + calcolaMargine(c), 0);

    const okRate = totale > 0 ? Math.round((ok / totale) * 100) : 0;

    document.getElementById("totaleContratti").innerText = totale;
    document.getElementById("totaleOk").innerText = ok;
    document.getElementById("totaleKo").innerText = ko;
    document.getElementById("totaleStorni").innerText = storni;
    document.getElementById("provvigioniMaturate").innerText = provvigioniMaturate + "€";
    document.getElementById("daPagare").innerText = daPagare + "€";
    document.getElementById("margineGenerato").innerText = margine + "€";

    document.getElementById("okRate").innerText = okRate + "%";
    document.getElementById("negativeCount").innerText = ko + storni;

    const selectedText = monthFilter.options[monthFilter.selectedIndex].text;
    document.getElementById("selectedMonthLabel").innerText = selectedText;
}

function renderContratti(lista){

    const tbody = document.getElementById("vendorContractsBody");

    tbody.innerHTML = "";

    if(lista.length === 0){

        const row = document.createElement("tr");

        row.innerHTML = `
            <td colspan="14" style="text-align:center; padding:30px; color:#6b7280; font-weight:bold;">
                Nessun contratto trovato per questo collaboratore.
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
            <td>${contratto.partner || ""}</td>
            <td>${contratto.gestore || ""}</td>
            <td>${contratto.servizio || ""}</td>
            <td>${contratto.stato || ""}</td>
            <td>${contratto.gettonePartner || 0}€</td>
            <td>${contratto.gettoneVenditore || 0}€</td>
            <td>${margine}€</td>
            <td>${contratto.pagamentoVenditore || ""}</td>
            <td>${contratto.note || ""}</td>
        `;

        tbody.appendChild(row);

    });
}

function creaDatiMensili(){

    const contratti = filtraContrattiVenditoreSenzaMese();

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
            storni: contrattiMese.filter(c => c.stato === "Storno").length,
            provvigioni: contrattiMese
                .filter(c => c.stato === "OK" || c.stato === "Pagato")
                .reduce((totale, c) => totale + numero(c.gettoneVenditore), 0)
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

    const lista = filtraContrattiVenditore();

    aggiornaCards(lista);

    renderContratti(lista);

    renderGraficoMensile();

    renderAffiliatiVenditore();
}

async function exportVendorExcel(){

    const lista = filtraContrattiVenditore();

    const meseSelezionato = monthFilter.options[monthFilter.selectedIndex].text;
    const dataExport = new Date().toLocaleDateString("it-IT");

    const totale = lista.length;
    const ok = lista.filter(c => c.stato === "OK" || c.stato === "Pagato").length;
    const ko = lista.filter(c => c.stato === "KO").length;
    const storni = lista.filter(c => c.stato === "Storno").length;

    const provvigioni = lista
        .filter(c => c.stato === "OK" || c.stato === "Pagato")
        .reduce((totale, c) => totale + numero(c.gettoneVenditore), 0);

    const daPagare = lista
        .filter(c =>
            (c.stato === "OK" || c.stato === "Pagato") &&
            c.pagamentoVenditore === "Da pagare"
        )
        .reduce((totale, c) => totale + numero(c.gettoneVenditore), 0);

    const margine = lista
        .filter(c => c.stato === "OK" || c.stato === "Pagato")
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
                    <td>${c.id || ""}</td>
                    <td>${c.dataInserimento || ""}</td>
                    <td>${c.dataEsito || ""}</td>
                    <td>${c.nome || ""}</td>
                    <td>${c.cognome || ""}</td>
                    <td>${c.partner || ""}</td>
                    <td>${c.gestore || ""}</td>
                    <td>${c.servizio || ""}</td>
                    <td>${c.stato || ""}</td>
                    <td>${c.gettonePartner || 0}€</td>
                    <td>${c.gettoneVenditore || 0}€</td>
                    <td>${margineContratto}€</td>
                    <td>${c.pagamentoVenditore || ""}</td>
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
                <div class="title">TOP HOUSE - Report Collaboratore</div>
                <div class="subtitle">
                    Nome: ${venditore.nome} | Ruolo: ${venditore.ruolo} | Zona: ${venditore.zona} | Mensilità: ${meseSelezionato} | Esportato il: ${dataExport}
                </div>
            </div>

            <table class="summary">
                <tr>
                    <td>Contratti Totali<br><span class="value">${totale}</span></td>
                    <td>Contratti OK<br><span class="value">${ok}</span></td>
                    <td>KO<br><span class="value">${ko}</span></td>
                    <td>Storni<br><span class="value">${storni}</span></td>
                    <td>Provvigioni<br><span class="value">${provvigioni}€</span></td>
                    <td>Da Pagare<br><span class="value">${daPagare}€</span></td>
                    <td>Margine Top House<br><span class="value">${margine}€</span></td>
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
                        <th>Partner</th>
                        <th>Gestore</th>
                        <th>Servizio</th>
                        <th>Stato</th>
                        <th>Gettone Partner</th>
                        <th>Gettone Venditore</th>
                        <th>Margine Top House</th>
                        <th>Pagamento Venditore</th>
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
    const nomeFile = venditore.nome.toLowerCase().replaceAll(" ", "-");

    link.href = URL.createObjectURL(blob);
    link.download = `report-collaboratore-${nomeFile}-${meseFile}.xls`;

    link.click();
}

function printVendorReport(){
    window.print();
}

monthFilter.addEventListener("change", aggiornaPagina);

aggiornaProfilo();

aggiornaPagina();
