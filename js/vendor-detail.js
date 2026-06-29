import { formatEuro } from "./formatters.js";
import { readCollection, saveVendorStatuses } from "./firebase-data.js";
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
        ruolo: "Direttore zona Italia",
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
        ruolo: "Venditore Lombardia",
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

async function salvaStatoVenditore(nome, stato){

    const stati = caricaStatiVenditori();

    stati[nome] = stato;

    localStorage.setItem("statiVenditoriTopHouse", JSON.stringify(stati));
    try{ await saveVendorStatuses(stati); }catch(error){ console.error(error); }
}

function statoVenditore(nome){

    const stati = caricaStatiVenditori();

    return stati[nome] || "Attivo";
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

function sommaUnita(lista){
    return lista.reduce((totale, contratto) => totale + getContractUnits(contratto), 0);
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
    return caricaAffiliati().filter(affiliato => testo(affiliato.venditoreCollegato || affiliato.venditore) === nomeVenditore);
}

function renderAffiliatiVenditore(){
    const affiliati = filtraAffiliatiVenditore();
    const tbody = document.getElementById("vendorAffiliatesBody");

    document.getElementById("totaleAffiliati").innerText = affiliati.length;
    document.getElementById("affiliatiAttivi").innerText = affiliati.filter(a => a.stato === "Attivo").length;
    document.getElementById("affiliatiNonAttivi").innerText = affiliati.filter(a => a.stato === "Non attivo").length;
    document.getElementById("affiliatiInValutazione").innerText = affiliati.filter(a => a.stato === "In valutazione" || a.stato === "Da contattare").length;

    tbody.innerHTML = "";

    if(affiliati.length === 0){
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:30px; color:#6b7280; font-weight:bold;">
                    Nessun affiliato collegato a questo venditore.
                </td>
            </tr>
        `;
        return;
    }

    affiliati.forEach(affiliato => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml([affiliato.nomeAffiliato || affiliato.nomeAttivita, affiliato.cognomeRagioneSociale].filter(Boolean).join(" "))}</td>
            <td>${escapeHtml(affiliato.telefono)}</td>
            <td>${escapeHtml(affiliato.email)}</td>
            <td>${escapeHtml(affiliato.zona || affiliato.citta)}</td>
            <td>${badgeAffiliato(affiliato.stato)}</td>
            <td>${escapeHtml(affiliato.note)}</td>
        `;
        tbody.appendChild(row);
    });
}

function aggiornaCards(lista){

    const totale = sommaUnita(lista);

    const ok = sommaUnita(lista.filter(c => c.stato === "OK" || c.stato === "Pagato"));

    const ko = sommaUnita(lista.filter(c => c.stato === "KO"));

    const storni = sommaUnita(lista.filter(c => c.stato === "Storno"));

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
    document.getElementById("totaleCommodity").innerText = sommaCategoria(lista, "Commodity");
    document.getElementById("totaleExtraCommodity").innerText = sommaCategoria(lista, "Extra Commodity");
    document.getElementById("totaleOk").innerText = ok;
    document.getElementById("totaleKo").innerText = ko;
    document.getElementById("totaleStorni").innerText = storni;
    document.getElementById("provvigioniMaturate").innerText = formatEuro(provvigioniMaturate);
    document.getElementById("daPagare").innerText = formatEuro(daPagare);
    document.getElementById("margineGenerato").innerText = formatEuro(margine);

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
            <td>${getContractCategory(contratto)}</td>
            <td>${contratto.stato || ""}</td>
            <td>${formatEuro(contratto.gettonePartner || 0)}</td>
            <td>${formatEuro(contratto.gettoneVenditore || 0)}</td>
            <td>${formatEuro(margine)}</td>
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
            ok: sommaUnita(contrattiMese.filter(c => c.stato === "OK" || c.stato === "Pagato")),
            ko: sommaUnita(contrattiMese.filter(c => c.stato === "KO")),
            storni: sommaUnita(contrattiMese.filter(c => c.stato === "Storno")),
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
    const totale = sommaUnita(lista);
    const commodity = sommaCategoria(lista, "Commodity");
    const extraCommodity = sommaCategoria(lista, "Extra Commodity");
    const ok = sommaUnita(lista.filter(c => c.stato === "OK" || c.stato === "Pagato"));
    const ko = sommaUnita(lista.filter(c => c.stato === "KO"));
    const storni = sommaUnita(lista.filter(c => c.stato === "Storno"));
    const lavorazione = sommaUnita(lista.filter(c => c.stato !== "OK" && c.stato !== "Pagato" && c.stato !== "KO" && c.stato !== "Storno"));
    const totaleDaPagare = lista.filter(c => (c.stato === "OK" || c.stato === "Pagato") && c.pagamentoVenditore === "Da pagare").reduce((t,c)=>t+numero(c.gettoneVenditore),0);
    const totalePagato = lista.filter(c => (c.stato === "OK" || c.stato === "Pagato") && c.pagamentoVenditore === "Pagato").reduce((t,c)=>t+numero(c.gettoneVenditore),0);
    const righe = lista.map(c => `<tr><td>${escapeHtml(c.dataInserimento)}</td><td>${escapeHtml([c.nome,c.cognome].filter(Boolean).join(" "))}</td><td>${escapeHtml(c.servizio)}</td><td>${getContractCategory(c)}</td><td>${escapeHtml(c.gestore)}</td><td>${escapeHtml(c.stato)}</td><td>${formatEuro(numero(c.gettoneVenditore))}</td><td>${escapeHtml(c.pagamentoVenditore)}</td><td>${escapeHtml(c.note)}</td></tr>`).join("") || `<tr><td colspan="9" class="empty">Nessun contratto trovato.</td></tr>`;
    const html = `<html><head><meta charset="UTF-8"><style>body{font-family:Arial;color:#081120}.header-report{border-bottom:4px solid #ff7b00;padding:18px 0;margin-bottom:18px}.logo{height:70px}.title{font-size:28px;font-weight:800;color:#d90429}.summary td{background:#f8fafc;border:1px solid #e5e7eb;padding:12px;font-weight:bold}.value{color:#ff7b00;font-size:20px}table{width:100%;border-collapse:collapse}th{background:#081120;color:white;padding:10px;text-align:left}td{border:1px solid #e5e7eb;padding:9px}</style></head><body><div class="header-report"><img class="logo" src="assets/logo-tophouse.png"><div class="title">Report Venditore - TOP HOUSE</div><div>Venditore: ${escapeHtml(venditore.nome)} | Periodo: ${escapeHtml(meseSelezionato)} | Generato: ${escapeHtml(dataExport)}</div></div><table class="summary"><tr><td>Contratti<br><span class="value">${totale}</span></td><td>Commodity<br><span class="value">${commodity}</span></td><td>Extra Commodity<br><span class="value">${extraCommodity}</span></td><td>OK<br><span class="value">${ok}</span></td><td>KO<br><span class="value">${ko}</span></td><td>Storni<br><span class="value">${storni}</span></td><td>In lavorazione<br><span class="value">${lavorazione}</span></td><td>Da pagare<br><span class="value">${formatEuro(totaleDaPagare)}</span></td><td>Pagato<br><span class="value">${formatEuro(totalePagato)}</span></td></tr></table><h2>Lista pratiche</h2><table><thead><tr><th>Data</th><th>Cliente</th><th>Servizio</th><th>Categoria</th><th>Gestore</th><th>Stato pratica</th><th>Gettone venditore</th><th>Stato pagamento venditore</th><th>Note</th></tr></thead><tbody>${righe}</tbody></table></body></html>`;
    const blob = new Blob([html], { type:"application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `report-venditore-${venditore.nome.toLowerCase().replaceAll(" ", "-")}-${monthFilter.value || new Date().toISOString().slice(0,7)}.xls`;
    link.click();
}

function printVendorReport(){
    window.print();
}

monthFilter.addEventListener("change", aggiornaPagina);

async function inizializzaFirebase(){ try{ await readCollection("contracts"); await readCollection("affiliates"); await readCollection("vendorStatuses"); }catch(error){ console.error(error); } aggiornaProfilo(); aggiornaPagina(); }
inizializzaFirebase();
