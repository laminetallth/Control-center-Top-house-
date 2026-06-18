let contratti = JSON.parse(localStorage.getItem("contrattiTopHouse")) || [
    {
        id: 1,
        data: "2026-06-01",
        nome: "Mario",
        cognome: "Rossi",
        venditore: "Marco Rossi",
        partner: "Partner Energia",
        gestore: "Enel",
        servizio: "Luce",
        stato: "OK",
        gettone: 80,
        pagamento: "Da pagare",
        note: "Pratica completa"
    },
    {
        id: 2,
        data: "2026-06-03",
        nome: "Giulia",
        cognome: "Bianchi",
        venditore: "Luca Verdi",
        partner: "Partner Casa",
        gestore: "Engie",
        servizio: "Gas",
        stato: "KO",
        gettone: 0,
        pagamento: "Non dovuto",
        note: "Documento mancante"
    },
    {
        id: 3,
        data: "2026-06-05",
        nome: "Paolo",
        cognome: "Neri",
        venditore: "Marco Rossi",
        partner: "Partner Energia",
        gestore: "A2A",
        servizio: "Luce + Gas",
        stato: "Storno",
        gettone: 0,
        pagamento: "Non dovuto",
        note: "Cliente ha annullato"
    }
];

const form = document.getElementById("contractForm");
const tbody = document.getElementById("contractsBody");
const searchInput = document.getElementById("searchInput");

function salvaStorage(){
    localStorage.setItem("contrattiTopHouse", JSON.stringify(contratti));
}

function statoBadge(stato){
    if(stato === "OK"){
        return `<span class="badge ok">OK</span>`;
    }

    if(stato === "KO"){
        return `<span class="badge ko">KO</span>`;
    }

    if(stato === "Storno"){
        return `<span class="badge storno">Storno</span>`;
    }

    if(stato === "Pagato"){
        return `<span class="badge paid">Pagato</span>`;
    }

    return `<span class="badge pending">${stato}</span>`;
}

function renderContratti(lista = contratti){

    tbody.innerHTML = "";

    lista.forEach(contratto => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${contratto.id}</td>
            <td>${contratto.data}</td>
            <td>${contratto.nome}</td>
            <td>${contratto.cognome}</td>
            <td>${contratto.venditore}</td>
            <td>${contratto.partner}</td>
            <td>${contratto.gestore}</td>
            <td>${contratto.servizio}</td>
            <td>${statoBadge(contratto.stato)}</td>
            <td>${contratto.gettone}€</td>
            <td>${contratto.pagamento}</td>
            <td>${contratto.note}</td>
        `;

        tbody.appendChild(row);

    });

    aggiornaStatistiche();
}

function aggiornaStatistiche(){

    const totale = contratti.length;

    const ok = contratti.filter(c => c.stato === "OK" || c.stato === "Pagato").length;

    const koStorni = contratti.filter(c => c.stato === "KO" || c.stato === "Storno").length;

    const gettoni = contratti
        .filter(c => c.stato === "OK" || c.stato === "Pagato")
        .reduce((totale, c) => totale + Number(c.gettone || 0), 0);

    document.getElementById("totaleContratti").innerText = totale;
    document.getElementById("totaleOk").innerText = ok;
    document.getElementById("totaleKo").innerText = koStorni;
    document.getElementById("totaleGettoni").innerText = gettoni + "€";
}

form.addEventListener("submit", function(e){

    e.preventDefault();

    const nuovoContratto = {
        id: contratti.length + 1,
        data: document.getElementById("data").value,
        nome: document.getElementById("nome").value,
        cognome: document.getElementById("cognome").value,
        venditore: document.getElementById("venditore").value,
        partner: document.getElementById("partner").value,
        gestore: document.getElementById("gestore").value,
        servizio: document.getElementById("servizio").value,
        stato: document.getElementById("stato").value,
        gettone: Number(document.getElementById("gettone").value || 0),
        pagamento: document.getElementById("pagamento").value,
        note: document.getElementById("note").value
    };

    contratti.push(nuovoContratto);

    salvaStorage();

    renderContratti();

    form.reset();

});

searchInput.addEventListener("input", function(){

    const ricerca = searchInput.value.toLowerCase();

    const filtrati = contratti.filter(c =>
        c.nome.toLowerCase().includes(ricerca) ||
        c.cognome.toLowerCase().includes(ricerca) ||
        c.venditore.toLowerCase().includes(ricerca) ||
        c.partner.toLowerCase().includes(ricerca) ||
        c.gestore.toLowerCase().includes(ricerca) ||
        c.servizio.toLowerCase().includes(ricerca) ||
        c.stato.toLowerCase().includes(ricerca)
    );

    renderContratti(filtrati);

});

function exportCSV(){

    let csv = "ID,Data,Nome,Cognome,Venditore,Partner,Gestore,Servizio,Stato,Gettone,Pagamento,Note\n";

    contratti.forEach(c => {
        csv += `${c.id},${c.data},${c.nome},${c.cognome},${c.venditore},${c.partner},${c.gestore},${c.servizio},${c.stato},${c.gettone},${c.pagamento},${c.note}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = "contratti-top-house.csv";

    link.click();

}

function resetContratti(){

    if(confirm("Vuoi davvero svuotare i dati demo?")){

        contratti = [];

        salvaStorage();

        renderContratti();

    }

}

renderContratti();
