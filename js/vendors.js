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

function slugVenditore(nome){
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
    const dati = JSON.parse(localStorage.getItem("contrattiTopHouse"));

    if(Array.isArray(dati)){
        return dati;
    }

    return [];
}

function caricaStatiVenditori(){
    const stati = JSON.parse(localStorage.getItem("statiVenditoriTopHouse"));

    if(stati && typeof stati === "object"){
        return stati;
    }

    return {};
}

function statoVenditore(nome){
    const stati = caricaStatiVenditori();

    return stati[nome] || "Attivo";
}

function badgeStatoVenditore(nome){

    const stato = statoVenditore(nome);

    if(stato === "Attivo"){
        return `<span class="badge ok">Attivo</span>`;
    }

    return `<span class="badge off">Non attivo</span>`;
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

function trovaVenditoreRegistrato(nome){
    return VENDITORI_REGISTRATI.find(v => v.nome === nome) || {
        nome: nome,
        zona: "-",
        ruolo: "Venditore",
        foto: ""
    };
}

function creaStatisticheVenditori(contratti){

    const statistiche = {};

    VENDITORI_REGISTRATI.forEach(venditore => {

        statistiche[venditore.nome] = {
            nome: venditore.nome,
            zona: venditore.zona,
            ruolo: venditore.ruolo,
            foto: venditore.foto,
            stato: statoVenditore(venditore.nome),
            totale: 0,
            ok: 0,
            ko: 0,
            storni: 0,
            provvigioniMaturate: 0,
            daPagare: 0,
            pagato: 0,
            margine: 0
        };

    });

    contratti.forEach(contratto => {

        const nomeVenditore = testo(contratto.venditore);

        if(!nomeVenditore){
            return;
        }

        const registrato = trovaVenditoreRegistrato(nomeVenditore);

        if(!statistiche[nomeVenditore]){

            statistiche[nomeVenditore] = {
                nome: nomeVenditore,
                zona: registrato.zona,
                ruolo: registrato.ruolo,
                foto: registrato.foto,
                stato: statoVenditore(nomeVenditore),
                totale: 0,
                ok: 0,
                ko: 0,
                storni: 0,
                provvigioniMaturate: 0,
                daPagare: 0,
                pagato: 0,
                margine: 0
            };

        }

        statistiche[nomeVenditore].totale += 1;

        if(contratto.stato === "OK" || contratto.stato === "Pagato"){

            statistiche[nomeVenditore].ok += 1;

            statistiche[nomeVenditore].provvigioniMaturate += numero(contratto.gettoneVenditore);

            statistiche[nomeVenditore].margine += calcolaMargine(contratto);

            if(contratto.pagamentoVenditore === "Da pagare"){
                statistiche[nomeVenditore].daPagare += numero(contratto.gettoneVenditore);
            }

            if(contratto.pagamentoVenditore === "Pagato"){
                statistiche[nomeVenditore].pagato += numero(contratto.gettoneVenditore);
            }

        }

        if(contratto.stato === "KO"){
            statistiche[nomeVenditore].ko += 1;
        }

        if(contratto.stato === "Storno"){
            statistiche[nomeVenditore].storni += 1;
        }

    });

    return Object.values(statistiche);
}

function aggiornaCards(venditori){

    const totaleVenditori = VENDITORI_REGISTRATI.filter(v => v.ruolo === "Venditore").length;

    const totaleOk = venditori.reduce((totale, venditore) => totale + venditore.ok, 0);

    const totaleKo = venditori.reduce((totale, venditore) => totale + venditore.ko, 0);

    const totaleStorni = venditori.reduce((totale, venditore) => totale + venditore.storni, 0);

    const provvigioniMaturate = venditori.reduce((totale, venditore) => {
        return totale + venditore.provvigioniMaturate;
    }, 0);

    const daPagareVenditori = venditori.reduce((totale, venditore) => {
        return totale + venditore.daPagare;
    }, 0);

    const margineGenerato = venditori.reduce((totale, venditore) => {
        return totale + venditore.margine;
    }, 0);

    document.getElementById("totaleVenditoriRegistrati").innerText = totaleVenditori;
    document.getElementById("totaleOk").innerText = totaleOk;
    document.getElementById("totaleKo").innerText = totaleKo;
    document.getElementById("totaleStorni").innerText = totaleStorni;
    document.getElementById("provvigioniMaturate").innerText = provvigioniMaturate + "€";
    document.getElementById("daPagareVenditori").innerText = daPagareVenditori + "€";
    document.getElementById("margineGenerato").innerText = margineGenerato + "€";
}

function renderClassificaVenditori(venditori){

    const tbody = document.getElementById("vendorsBody");

    tbody.innerHTML = "";

    const ordinati = [...venditori].sort((a, b) => {

        if(a.ruolo !== b.ruolo){
            return a.ruolo === "Venditore" ? -1 : 1;
        }

        if(a.stato !== b.stato){
            return a.stato === "Attivo" ? -1 : 1;
        }

        if(b.ok !== a.ok){
            return b.ok - a.ok;
        }

        return b.provvigioniMaturate - a.provvigioniMaturate;

    });

    ordinati.forEach(venditore => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>${venditore.nome}</strong><br>
                <small>${venditore.ruolo}</small>
            </td>
            <td>${badgeStatoVenditore(venditore.nome)}</td>
            <td>${venditore.zona}</td>
            <td>${venditore.totale}</td>
            <td>${venditore.ok}</td>
            <td>${venditore.ko}</td>
            <td>${venditore.storni}</td>
            <td>${venditore.provvigioniMaturate}€</td>
            <td>${venditore.daPagare}€</td>
            <td>${venditore.pagato}€</td>
            <td>${venditore.margine}€</td>
            <td>
                <a class="mini-btn" href="vendor-detail.html?vendor=${slugVenditore(venditore.nome)}">
                    Apri Scheda
                </a>
            </td>
        `;

        tbody.appendChild(row);

    });

}

function aggiornaMigliorVenditore(venditori){

    const migliori = [...venditori]
        .filter(venditore =>
            venditore.ok > 0 &&
            venditore.stato === "Attivo" &&
            venditore.ruolo === "Venditore"
        )
        .sort((a, b) => {

            if(b.ok !== a.ok){
                return b.ok - a.ok;
            }

            return b.provvigioniMaturate - a.provvigioniMaturate;

        });

    if(migliori.length === 0){

        document.getElementById("bestVendorName").innerText = "-";
        document.getElementById("bestVendorArea").innerText = "-";
        document.getElementById("bestVendorOk").innerText = "0";
        document.getElementById("bestVendorCommission").innerText = "0€";
        document.getElementById("bestVendorMargin").innerText = "0€";

        return;
    }

    const migliore = migliori[0];

    document.getElementById("bestVendorName").innerText = migliore.nome;
    document.getElementById("bestVendorArea").innerText = migliore.zona;
    document.getElementById("bestVendorOk").innerText = migliore.ok;
    document.getElementById("bestVendorCommission").innerText = migliore.provvigioniMaturate + "€";
    document.getElementById("bestVendorMargin").innerText = migliore.margine + "€";

}

function renderVenditoriRegistrati(){

    const container = document.getElementById("registeredVendorsGrid");

    container.innerHTML = "";

    VENDITORI_REGISTRATI.forEach(venditore => {

        const card = document.createElement("a");

        card.className = "vendor-card-small";
        card.href = `vendor-detail.html?vendor=${slugVenditore(venditore.nome)}`;

        card.innerHTML = `
            <div class="vendor-avatar-small" data-initials="${iniziali(venditore.nome)}">
                <img src="${venditore.foto}" alt="${venditore.nome}" onerror="this.style.display='none'; this.parentElement.classList.add('no-photo');">
            </div>

            <div>
                <h4>${venditore.nome}</h4>
                <p>${venditore.zona} · ${venditore.ruolo}</p>
                ${badgeStatoVenditore(venditore.nome)}
                <br><br>
                <span>Apri scheda venditore</span>
            </div>
        `;

        container.appendChild(card);

    });

}

function aggiornaPaginaVenditori(){

    const contratti = caricaContratti();

    const contrattiFiltrati = filtraPerMese(contratti);

    const statisticheVenditori = creaStatisticheVenditori(contrattiFiltrati);

    aggiornaCards(statisticheVenditori);

    renderClassificaVenditori(statisticheVenditori);

    aggiornaMigliorVenditore(statisticheVenditori);

    renderVenditoriRegistrati();

}

document.getElementById("monthFilter").addEventListener("change", aggiornaPaginaVenditori);

aggiornaPaginaVenditori();
