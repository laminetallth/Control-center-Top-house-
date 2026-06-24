function testo(valore){
    return String(valore || "").trim();
}

function numero(valore){
    return Number(valore || 0);
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

function aggiornaCards(lista){

    const totale = sommaUnita(lista);

    const ok = sommaUnita(lista.filter(c => c.stato === "OK" || c.stato === "Pagato"));

    const ko = sommaUnita(lista.filter(c => c.stato === "KO"));

    const storni = sommaUnita(lista.filter(c => c.stato === "Storno"));

    const daIncassarePartner = lista
        .filter(c =>
            (c.stato === "OK" || c.stato === "Pagato") &&
            c.pagamentoPartner === "Da incassare"
        )
        .reduce((totale, c) => totale + numero(c.gettonePartner), 0);

    const incassatoPartner = lista
        .filter(c =>
            (c.stato === "OK" || c.stato === "Pagato") &&
            c.pagamentoPartner === "Incassato"
        )
        .reduce((totale, c) => totale + numero(c.gettonePartner), 0);

    const daPagareVenditori = lista
        .filter(c =>
            (c.stato === "OK" || c.stato === "Pagato") &&
            c.pagamentoVenditore === "Da pagare"
        )
        .reduce((totale, c) => totale + numero(c.gettoneVenditore), 0);

    const margineMaturato = lista
        .filter(c => c.stato === "OK" || c.stato === "Pagato")
        .reduce((totale, c) => totale + calcolaMargine(c), 0);

    document.getElementById("totaleContratti").innerText = totale;
    document.getElementById("totaleOk").innerText = ok;
    document.getElementById("totaleKo").innerText = ko;
    document.getElementById("totaleStorni").innerText = storni;
    document.getElementById("daIncassarePartner").innerText = daIncassarePartner + "€";
    document.getElementById("daPagareVenditori").innerText = daPagareVenditori + "€";
    document.getElementById("margineMaturato").innerText = margineMaturato + "€";
    document.getElementById("incassatoPartner").innerText = incassatoPartner + "€";

    document.getElementById("cashDaIncassare").innerText = daIncassarePartner + "€";
    document.getElementById("cashIncassato").innerText = incassatoPartner + "€";
    document.getElementById("cashDaPagare").innerText = daPagareVenditori + "€";
    document.getElementById("cashMargine").innerText = margineMaturato + "€";

    const percentualeOk = totale > 0 ? Math.round((ok / totale) * 100) : 0;

    document.getElementById("percentualeOk").innerText = percentualeOk + "%";
    document.getElementById("praticheNegative").innerText = ko + storni;

    const meseLabel = document.getElementById("monthFilter").options[
        document.getElementById("monthFilter").selectedIndex
    ].text;

    document.getElementById("meseSelezionatoLabel").innerText = meseLabel;
}

function creaStatisticheVenditori(lista){

    const statistiche = {};

    lista.forEach(contratto => {

        const venditore = testo(contratto.venditore);

        if(!venditore){
            return;
        }

        if(!statistiche[venditore]){

            statistiche[venditore] = {
                nome: venditore,
                ok: 0,
                provvigioni: 0,
                margine: 0
            };

        }

        if(contratto.stato === "OK" || contratto.stato === "Pagato"){

            statistiche[venditore].ok += getContractUnits(contratto);
            statistiche[venditore].provvigioni += numero(contratto.gettoneVenditore);
            statistiche[venditore].margine += calcolaMargine(contratto);

        }

    });

    return Object.values(statistiche).sort((a, b) => {

        if(b.ok !== a.ok){
            return b.ok - a.ok;
        }

        return b.provvigioni - a.provvigioni;

    });
}

function renderMiglioriVenditori(lista){

    const tbody = document.getElementById("topVendorsBody");

    tbody.innerHTML = "";

    const venditori = creaStatisticheVenditori(lista);

    const primiTre = venditori.slice(0, 3);

    if(primiTre.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; color:#6b7280; font-weight:bold;">
                    Nessun venditore con contratti OK nel mese selezionato.
                </td>
            </tr>
        `;

        document.getElementById("migliorVenditore").innerText = "-";

        return;
    }

    primiTre.forEach(venditore => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${venditore.nome}</td>
            <td>${venditore.ok}</td>
            <td>${venditore.provvigioni}€</td>
            <td>${venditore.margine}€</td>
        `;

        tbody.appendChild(row);

    });

    document.getElementById("migliorVenditore").innerText = primiTre[0].nome;
}

function creaStatistichePartner(lista){

    const statistiche = {};

    lista.forEach(contratto => {

        const partner = testo(contratto.partner);

        if(!partner){
            return;
        }

        if(!statistiche[partner]){

            statistiche[partner] = {
                nome: partner,
                ok: 0,
                daIncassare: 0,
                incassato: 0,
                margine: 0
            };

        }

        if(contratto.stato === "OK" || contratto.stato === "Pagato"){

            statistiche[partner].ok += getContractUnits(contratto);
            statistiche[partner].margine += calcolaMargine(contratto);

            if(contratto.pagamentoPartner === "Da incassare"){
                statistiche[partner].daIncassare += numero(contratto.gettonePartner);
            }

            if(contratto.pagamentoPartner === "Incassato"){
                statistiche[partner].incassato += numero(contratto.gettonePartner);
            }

        }

    });

    return Object.values(statistiche).sort((a, b) => {

        if(b.ok !== a.ok){
            return b.ok - a.ok;
        }

        return b.daIncassare - a.daIncassare;

    });
}

function aggiornaMigliorPartner(lista){

    const partners = creaStatistichePartner(lista);

    if(partners.length === 0){
        document.getElementById("migliorPartner").innerText = "-";
        return;
    }

    document.getElementById("migliorPartner").innerText = partners[0].nome;
}

function aggiornaAttivita(lista){

    const activityList = document.getElementById("activityList");

    activityList.innerHTML = "";

    const daPagareVenditori = lista.filter(c =>
        (c.stato === "OK" || c.stato === "Pagato") &&
        c.pagamentoVenditore === "Da pagare"
    );

    const daIncassarePartner = lista.filter(c =>
        (c.stato === "OK" || c.stato === "Pagato") &&
        c.pagamentoPartner === "Da incassare"
    );

    const ko = lista.filter(c => c.stato === "KO");

    const storni = lista.filter(c => c.stato === "Storno");

    if(daIncassarePartner.length > 0){
        const totale = daIncassarePartner.reduce((somma, c) => somma + numero(c.gettonePartner), 0);
        activityList.innerHTML += `<li>Incassare ${totale}€ dai partner.</li>`;
    }

    if(daPagareVenditori.length > 0){
        const totale = daPagareVenditori.reduce((somma, c) => somma + numero(c.gettoneVenditore), 0);
        activityList.innerHTML += `<li>Pagare ${totale}€ ai venditori.</li>`;
    }

    if(ko.length > 0){
        activityList.innerHTML += `<li>Controllare ${ko.length} pratiche KO.</li>`;
    }

    if(storni.length > 0){
        activityList.innerHTML += `<li>Verificare ${storni.length} storni.</li>`;
    }

    if(activityList.innerHTML === ""){
        activityList.innerHTML = `<li>Nessuna attività critica rilevata.</li>`;
    }
}

function aggiornaDashboard(){

    const contratti = caricaContratti();

    const listaFiltrata = filtraPerMese(contratti);

    aggiornaCards(listaFiltrata);

    renderMiglioriVenditori(listaFiltrata);

    aggiornaMigliorPartner(listaFiltrata);

    aggiornaAttivita(listaFiltrata);
}

document.getElementById("monthFilter").addEventListener("change", aggiornaDashboard);

aggiornaDashboard();
