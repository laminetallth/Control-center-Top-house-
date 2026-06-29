export function parseMoney(value){
    if(value === null || value === undefined){ return 0; }
    if(typeof value === "number"){
        return Number.isFinite(value) ? value : 0;
    }
    const cleaned = String(value)
        .trim()
        .replace(/\s/g, "")
        .replace(/€/g, "");
    const normalized = cleaned.includes(",")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned;
    if(normalized === "" || normalized === "." || normalized === "-"){
        return 0;
    }
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function formatEuro(value){
    return parseMoney(value).toLocaleString("it-IT", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

export function formatMoneyInput(value){
    const parsed = parseMoney(value);
    return parsed ? String(parsed).replace(".", ",") : "";
}
