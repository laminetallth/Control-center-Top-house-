import { readCollection } from "./firebase-data.js";
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

function numero(valore){
    return Number(valore || 0);
}

function caricaContratti(){
    const dati = JSON.parse(localStorage.getItem("contrattiTopHouse"));

    if(Array.isArray(dati)){
        return dati;
    }

    return [];
}

function slugPartner(nome){
    return encodeURIComponent(nome);
}

function iniziale(nome){
    return testo(nome).charAt(0).toUpperCase();
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

    if(contratto.stato !== "OK" && contratto.stato !== "Pagato"){
        return 0;
    }

    return numero(contratto.gettonePartner) - numero(contratto.gettoneVenditore);
}

function filtraPerMese(contratti){

    const meseSelezionato = document.getElementById("monthFilter").value;

    if(meseSelezionato === ""){
        return contratti;
    }

    return contratti.filter(contratto => {
        const meseContratto = testo(contratto.dataInserimento).slice(0, 7);
        return meseContratto === meseSelezionato;
    });
}

function trovaPartnerRegistrato(nome){
    return PARTNER_REGISTRATI.find(p => p.nome === nome) || {
        nome: nome,
        categoria: "Altri Partner",
        descrizione: "Partner non registrato",
        servizi: ["Altro"],
        logo: ""
    };
}

function creaStatistichePartner(contratti){

    const statistiche = {};

    PARTNER_REGISTRATI.forEach(partner => {

        statistiche[partner.nome] = {
            nome: partner.nome,
            categoria: partner.categoria,
            descrizione: partner.descrizione,
            servizi: partner.servizi,
            logo: partner.logo,
            totale: 0,
            ok: 0,
            ko: 0,
            storni: 0,
            daIncassare: 0,
            incassato: 0,
            margine: 0
        };

    });

    contratti.forEach(contratto => {

        const nomePartner = testo(contratto.partner);

        if(!nomePartner){
            return;
        }

        const registrato = trovaPartnerRegistrato(nomePartner);

        if(!statistiche[nomePartner]){

            statistiche[nomePartner] = {
                nome: nomePartner,
                categoria: registrato.categoria,
                descrizione: registrato.descrizione,
                servizi: registrato.servizi,
                logo: registrato.logo,
                totale: 0,
                ok: 0,
                ko: 0,
                storni: 0,
                daIncassare: 0,
                incassato: 0,
                margine: 0
            };

        }

        statistiche[nomePartner].totale += getContractUnits(contratto);

        if(contratto.stato === "OK" || contratto.stato === "Pagato"){

            statistiche[nomePartner].ok += getContractUnits(contratto);

            statistiche[nomePartner].margine += calcolaMargine(contratto);

            if(contratto.pagamentoPartner === "Da incassare"){
                statistiche[nomePartner].daIncassare += numero(contratto.gettonePartner);
            }

            if(contratto.pagamentoPartner === "Incassato"){
                statistiche[nomePartner].incassato += numero(contratto.gettonePartner);
            }

        }

        if(contratto.stato === "KO"){
            statistiche[nomePartner].ko += getContractUnits(contratto);
        }

        if(contratto.stato === "Storno"){
            statistiche[nomePartner].storni += getContractUnits(contratto);
        }

    });

    return Object.values(statistiche);
}

function aggiornaCards(partner){

    const totalePartner = PARTNER_REGISTRATI.length;

    const totaleOk = partner.reduce((totale, p) => totale + p.ok, 0);

    const totaleKo = partner.reduce((totale, p) => totale + p.ko, 0);

    const totaleStorni = partner.reduce((totale, p) => totale + p.storni, 0);

    const daIncassarePartner = partner.reduce((totale, p) => totale + p.daIncassare, 0);

    const incassatoPartner = partner.reduce((totale, p) => totale + p.incassato, 0);

    const margineMaturato = partner.reduce((totale, p) => totale + p.margine, 0);

    document.getElementById("totalePartnerRegistrati").innerText = totalePartner;
    document.getElementById("totaleOk").innerText = totaleOk;
    document.getElementById("totaleKo").innerText = totaleKo;
    document.getElementById("totaleStorni").innerText = totaleStorni;
    document.getElementById("daIncassarePartner").innerText = daIncassarePartner + "€";
    document.getElementById("incassatoPartner").innerText = incassatoPartner + "€";
    document.getElementById("margineMaturato").innerText = margineMaturato + "€";
}

function renderPartnerCategorie(partner){

    const container = document.getElementById("partnerCategories");

    container.innerHTML = "";

    const categorie = [...new Set(PARTNER_REGISTRATI.map(p => p.categoria))];

    categorie.forEach(categoria => {

        const partnerCategoria = partner.filter(p => p.categoria === categoria);

        const blocco = document.createElement("div");

        blocco.className = "partner-category";

        blocco.innerHTML = `
            <h2>${categoria}</h2>
            <p>${partnerCategoria.length} partner collegati a questa categoria</p>
            <div class="partner-grid"></div>
        `;

        const grid = blocco.querySelector(".partner-grid");

        partnerCategoria.forEach(p => {

            const card = document.createElement("a");

            card.className = "partner-card";
            card.href = `partner-detail.html?partner=${slugPartner(p.nome)}`;

            card.innerHTML = `
                <div class="partner-logo-box">
                    <img src="${p.logo}" alt="${p.nome}" onerror="this.style.display='none'; this.parentElement.classList.add('no-logo');">
                    <span>${iniziale(p.nome)}</span>
                </div>

                <div class="partner-card-content">
                    <div class="partner-card-header">
                        <h4>${p.nome}</h4>
                        <span class="badge ok">${p.ok} OK</span>
                    </div>

                    <p>${p.descrizione}</p>

                    <div class="partner-services">
                        ${p.servizi.join(" · ")}
                    </div>

                    <div class="partner-stats">
                        <span><strong>${p.totale}</strong> pratiche</span>
                        <span><strong>${p.daIncassare}€</strong> da incassare</span>
                        <span><strong>${p.margine}€</strong> margine</span>
                    </div>
                </div>
            `;

            grid.appendChild(card);

        });

        container.appendChild(blocco);

    });
}

function renderClassificaPartner(partner){

    const tbody = document.getElementById("partnersBody");

    tbody.innerHTML = "";

    const ordinati = [...partner].sort((a, b) => {

        if(b.ok !== a.ok){
            return b.ok - a.ok;
        }

        return b.daIncassare - a.daIncassare;

    });

    ordinati.forEach(p => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${p.nome}</td>
            <td>${p.categoria}</td>
            <td>${p.totale}</td>
            <td>${p.ok}</td>
            <td>${p.ko}</td>
            <td>${p.storni}</td>
            <td>${p.daIncassare}€</td>
            <td>${p.incassato}€</td>
            <td>${p.margine}€</td>
            <td>
                <a class="mini-btn" href="partner-detail.html?partner=${slugPartner(p.nome)}">
                    Apri Scheda
                </a>
            </td>
        `;

        tbody.appendChild(row);

    });
}

function aggiornaMigliorPartner(partner){

    const migliori = [...partner]
        .filter(p => p.ok > 0)
        .sort((a, b) => {

            if(b.ok !== a.ok){
                return b.ok - a.ok;
            }

            return b.daIncassare - a.daIncassare;

        });

    if(migliori.length === 0){

        document.getElementById("bestPartnerName").innerText = "-";
        document.getElementById("bestPartnerCategory").innerText = "-";
        document.getElementById("bestPartnerOk").innerText = "0";
        document.getElementById("bestPartnerReceivable").innerText = "0€";
        document.getElementById("bestPartnerMargin").innerText = "0€";

        return;
    }

    const migliore = migliori[0];

    document.getElementById("bestPartnerName").innerText = migliore.nome;
    document.getElementById("bestPartnerCategory").innerText = migliore.categoria;
    document.getElementById("bestPartnerOk").innerText = migliore.ok;
    document.getElementById("bestPartnerReceivable").innerText = migliore.daIncassare + "€";
    document.getElementById("bestPartnerMargin").innerText = migliore.margine + "€";
}

function aggiornaPaginaPartner(){

    const contratti = caricaContratti();

    const contrattiFiltrati = filtraPerMese(contratti);

    const statistichePartner = creaStatistichePartner(contrattiFiltrati);

    aggiornaCards(statistichePartner);

    renderPartnerCategorie(statistichePartner);

    renderClassificaPartner(statistichePartner);

    aggiornaMigliorPartner(statistichePartner);
}

document.getElementById("monthFilter").addEventListener("change", aggiornaPaginaPartner);

async function inizializzaFirebase(){ try{ await readCollection("contracts"); }catch(error){ console.error(error); } aggiornaPaginaPartner(); }
inizializzaFirebase();
