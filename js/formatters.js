export function parseNumero(valore){
    if(typeof valore === "number"){
        return Number.isFinite(valore) ? valore : 0;
    }

    const testo = String(valore ?? "").trim();

    if(!testo){
        return 0;
    }

    const pulito = testo
        .replace(/\s/g, "")
        .replace(/€/g, "");

    let normalizzato = pulito;

    if(pulito.includes(",") && pulito.includes(".")){
        normalizzato = pulito.replace(/\./g, "").replace(",", ".");
    }else if(pulito.includes(",")){
        normalizzato = pulito.replace(",", ".");
    }

    const numero = Number.parseFloat(normalizzato);

    return Number.isFinite(numero) ? numero : 0;
}

export function formatEuro(valore){
    const importo = Math.round((parseNumero(valore) + Number.EPSILON) * 100) / 100;

    return importo.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true
    }) + "€";
}
