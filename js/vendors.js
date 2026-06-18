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

function caricaContratti(){
    const dati = JSON.parse(localStorage.getItem("contrattiTopHouse"));

    if(Array.isArray(dati)){
        return dati;
    }

    return [];
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

function creaStatisticheVenditori(contratti){

    const statistiche = {};

    VENDITORI_REGISTRATI.forEach(venditore => {

        statistiche[venditore] = {
            nome: venditore,
            totale: 0,
            ok: 0,
            koStorni: 0,
            provvigioniMaturate: 0,
            daPagare: 0,
            pagato: 0,
            margine: 0
        };

    });

    contratti.forEach(contratto => {

        const venditore = testo(contratto.venditore);

        if(!statistiche[venditore]){

            statistiche[venditore] = {
                nome: venditore,
                totale: 0,
                ok: 0,
                koStorni: 0,
                provvigioniMaturate: 0,
                daPagare: 0,
                pagato: 0,
                margine: 0
            };

        }

        statistiche[venditore].totale += 1;

        if(contratto.stato === "OK" || contratto.stato === "Pagato"){

            statistiche[venditore].ok += 1;

            statistiche[venditore].provvigioniMaturate += numero(contratto.gettoneVenditore);

            statistiche[venditore].margine += calcolaMargine(contratto);

            if(contratto.pagamentoVenditore === "Da pagare"){
                statistiche[venditore].daPagare += numero(contratto.gettoneVenditore);
            }

            if(contratto.pagamentoVenditore === "Pagato"){
                statistiche[venditore].pagato += numero(contratto.gettoneVenditore);
            }

        }

        if(contratto.stato === "KO" || contratto.stato === "Storno"){
            statistiche[venditore].koStorni += 1;
        }

    });

    return Object.values(statistiche);
}

function aggiornaCards(venditori){

    const totaleVenditori = VENDITORI_REGISTRATI.length;

    const totaleOk = venditori.reduce((totale, venditore) => totale + venditore.ok, 0);

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
    document.getElementById("provvigioniMaturate").innerText = provvigioniMaturate + "€";
    document.getElementById("daPagareVenditori").innerText = daPagareVenditori + "€";
    document.getElementById("margineGenerato").innerText = margineGenerato + "€";
}

function renderClassificaVenditori(venditori){

    const tbody = document.getElementById("vendorsBody");

    tbody.innerHTML = "";

    const ordinati = [...venditori].sort((a, b) => {

        if(b.ok !== a.ok){
            return b.ok - a.ok;
        }

        return b.provvigioniMaturate - a.provvigioniMaturate;

    });

    ordinati.forEach(venditore => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${venditore.nome}</td>
            <td>${venditore.totale}</td>
            <td>${venditore.ok}</td>
            <td>${venditore.koStorni}</td>
            <td>${venditore.provvigioniMaturate}€</td>
            <td>${venditore.daPagare}€</td>
            <td>${venditore.pagato}€</td>
            <td>${venditore.margine}€</td>
        `;

        tbody.appendChild(row);

    });

}

function aggiornaMigliorVenditore(venditori){

    const migliori = [...venditori]
        .filter(venditore => venditore.ok > 0)
        .sort((a, b) => {

            if(b.ok !== a.ok){
                return b.ok - a.ok;
            }

            return b.provvigioniMaturate - a.provvigioniMaturate;

        });

    if(migliori.length === 0){

        document.getElementById("bestVendorName").innerText = "-";
        document.getElementById("bestVendorOk").innerText = "0";
        document.getElementById("bestVendorCommission").innerText = "0€";
        document.getElementById("bestVendorMargin").innerText = "0€";

        return;
    }

    const migliore = migliori[0];

    document.getElementById("bestVendorName").innerText = migliore.nome;
    document.getElementById("bestVendorOk").innerText = migliore.ok;
    document.getElementById("bestVendorCommission").innerText = migliore.provvigioniMaturate + "€";
    document.getElementById("bestVendorMargin").innerText = migliore.margine + "€";

}

function renderVenditoriRegistrati(){

    const tbody = document.getElementById("registeredVendorsBody");

    tbody.innerHTML = "";

    VENDITORI_REGISTRATI.forEach(venditore => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${venditore}</td>
            <td><span class="badge ok">Attivo</span></td>
            <td>Venditore</td>
        `;

        tbody.appendChild(row);

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
