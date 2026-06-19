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

function slugPartner(nome){
    return encodeURIComponent(nome);
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
        categoria: "Partner",
        zona: "-",
        foto: ""
    };
}

function creaStatistichePartner(contratti){

    const statistiche = {};

    PARTNER_REGISTRATI.forEach(partner => {

        statistiche[partner.nome] = {
            nome: partner.nome,
            categoria: partner.categoria,
            zona: partner.zona,
            foto: partner.foto,
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
                zona: registrato.zona,
                foto: registrato.foto,
                totale: 0,
                ok: 0,
                ko: 0,
                storni: 0,
                daIncassare: 0,
                incassato: 0,
                margine: 0
            };

        }

        statistiche[nomePartner].totale += 1;

        if(contratto.stato === "OK" || contratto.stato === "Pagato"){

            statistiche[nomePartner].ok += 1;

            statistiche[nomePartner].margine += calcolaMargine(contratto);

            if(contratto.pagamentoPartner === "Da incassare"){
                statistiche[nomePartner].daIncassare += numero(contratto.gettonePartner);
            }

            if(contratto.pagamentoPartner === "Incassato"){
                statistiche[nomePartner].incassato += numero(contratto.gettonePartner);
            }

        }

        if(contratto.stato === "KO"){
            statistiche[nomePartner].ko += 1;
        }

        if(contratto.stato === "Storno"){
            statistiche[nomePartner].storni += 1;
        }

    });

    return Object.values(statistiche);
}

function aggiornaCards(partners){

    const totalePartner = PARTNER_REGISTRATI.length;

    const totaleOk = partners.reduce((totale, partner) => totale + partner.ok, 0);

    const totaleKo = partners.reduce((totale, partner) => totale + partner.ko, 0);

    const totaleStorni = partners.reduce((totale, partner) => totale + partner.storni, 0);

    const daIncassare = partners.reduce((totale, partner) => {
        return totale + partner.daIncassare;
    }, 0);

    const incassato = partners.reduce((totale, partner) => {
        return totale + partner.incassato;
    }, 0);

    const margine = partners.reduce((totale, partner) => {
        return totale + partner.margine;
    }, 0);

    document.getElementById("totalePartnerRegistrati").innerText = totalePartner;
    document.getElementById("totaleOk").innerText = totaleOk;
    document.getElementById("totaleKo").innerText = totaleKo;
    document.getElementById("totaleStorni").innerText = totaleStorni;
    document.getElementById("daIncassarePartner").innerText = daIncassare + "€";
    document.getElementById("incassatoPartner").innerText = incassato + "€";
    document.getElementById("margineMaturato").innerText = margine + "€";
}

function renderClassificaPartner(partners){

    const tbody = document.getElementById("partnersBody");

    tbody.innerHTML = "";

    const ordinati = [...partners].sort((a, b) => {

        if(b.ok !== a.ok){
            return b.ok - a.ok;
        }

        return b.daIncassare - a.daIncassare;

    });

    ordinati.forEach(partner => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${partner.nome}</td>
            <td>${partner.categoria}</td>
            <td>${partner.totale}</td>
            <td>${partner.ok}</td>
            <td>${partner.ko}</td>
            <td>${partner.storni}</td>
            <td>${partner.daIncassare}€</td>
            <td>${partner.incassato}€</td>
            <td>${partner.margine}€</td>
            <td>
                <a class="mini-btn" href="partner-detail.html?partner=${slugPartner(partner.nome)}">
                    Apri Scheda
                </a>
            </td>
        `;

        tbody.appendChild(row);

    });

}

function aggiornaMigliorPartner(partners){

    const migliori = [...partners]
        .filter(partner => partner.ok > 0)
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

function renderPartnerRegistrati(){

    const container = document.getElementById("registeredPartnersGrid");

    container.innerHTML = "";

    PARTNER_REGISTRATI.forEach(partner => {

        const card = document.createElement("a");

        card.className = "vendor-card-small";
        card.href = `partner-detail.html?partner=${slugPartner(partner.nome)}`;

        card.innerHTML = `
            <div class="vendor-avatar-small" data-initials="${iniziali(partner.nome)}">
                <img src="${partner.foto}" alt="${partner.nome}" onerror="this.style.display='none'; this.parentElement.classList.add('no-photo');">
            </div>

            <div>
                <h4>${partner.nome}</h4>
                <p>${partner.zona} · ${partner.categoria}</p>
                <span>Apri scheda partner</span>
            </div>
        `;

        container.appendChild(card);

    });

}

function aggiornaPaginaPartner(){

    const contratti = caricaContratti();

    const contrattiFiltrati = filtraPerMese(contratti);

    const statistichePartner = creaStatistichePartner(contrattiFiltrati);

    aggiornaCards(statistichePartner);

    renderClassificaPartner(statistichePartner);

    aggiornaMigliorPartner(statistichePartner);

    renderPartnerRegistrati();
}

document.getElementById("monthFilter").addEventListener("change", aggiornaPaginaPartner);

aggiornaPaginaPartner();
