import { formatEuro, parseNumero } from "./formatters.js";

const MESI = [
    ["2026-01", "Gennaio 2026"], ["2026-02", "Febbraio 2026"], ["2026-03", "Marzo 2026"],
    ["2026-04", "Aprile 2026"], ["2026-05", "Maggio 2026"], ["2026-06", "Giugno 2026"],
    ["2026-07", "Luglio 2026"], ["2026-08", "Agosto 2026"], ["2026-09", "Settembre 2026"],
    ["2026-10", "Ottobre 2026"], ["2026-11", "Novembre 2026"], ["2026-12", "Dicembre 2026"]
];
const ALL_MONTHS = "all";
const COLORS = ["#d90429", "#ff7b00", "#081120", "#f59e0b", "#ef4444", "#10b981", "#6366f1", "#14b8a6"];
const KPI_CARDS = [
    { key:"fatturatoPartner", label:"Fatturato totale partner", icon:"🤝", type:"currency", hint:"Somma gettonePartner OK/Pagato" },
    { key:"margine", label:"Margine totale TOP HOUSE", icon:"🏠", type:"currency", hint:"gettonePartner - gettoneVenditore" },
    { key:"margineMedio", label:"Margine medio per contratto", icon:"📊", type:"currency", hint:"Media su contratti validi" },
    { key:"contrattiTotali", label:"Contratti totali", icon:"📄", type:"number", hint:"Tutte le pratiche filtrate" },
    { key:"okRate", label:"Tasso OK", icon:"✅", type:"percent", hint:"OK/Pagato su totali" },
    { key:"ticketMedio", label:"Ticket medio", icon:"🎯", type:"currency", hint:"Fatturato partner medio" },
    { key:"daPagare", label:"Da pagare venditori", icon:"💸", type:"currency", hint:"Pratiche valide da pagare" },
    { key:"daIncassare", label:"Da incassare partner", icon:"📥", type:"currency", hint:"Pratiche valide da incassare" }
];
function testo(v){ return String(v ?? "").trim(); }
function numero(v){ return parseNumero(v); }
function euro(v){ return formatEuro(v); }
function praticaValida(c){ return ["OK", "Pagato"].includes(testo(c.stato)); }
function escapeHtml(v){ return testo(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function leggiStorage(chiave){ try{ const dati = JSON.parse(localStorage.getItem(chiave)); return Array.isArray(dati) ? dati : []; }catch(e){ return []; } }
function meseDaData(data){ return testo(data).slice(0, 7); }
function meseLabel(mese){ return MESI.find(m => m[0] === mese)?.[1] || mese; }
function getContractUnits(c){ const s = testo(c.servizio).toLowerCase().replaceAll(" ", ""); return ["luce+gas", "luce-gas", "lucegas"].includes(s) ? 2 : 1; }
function calcolaMargine(c){ return numero(c.gettonePartner) - numero(c.gettoneVenditore); }
function formatValue(v, type){ return type === "currency" ? euro(v) : type === "percent" ? `${(Math.round(numero(v) * 10) / 10).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%` : String(Math.round(numero(v))); }
function uniqueOptions(contratti, campo){ return [...new Set(contratti.map(c => testo(c[campo])).filter(Boolean))].sort((a,b) => a.localeCompare(b)); }
function applyFilters(contratti){
    const mese = document.getElementById("monthFilter").value;
    const venditore = document.getElementById("vendorFilter").value;
    const partner = document.getElementById("partnerFilter").value;
    return contratti.filter(c => (mese === ALL_MONTHS || meseDaData(c.dataInserimento) === mese) && (!venditore || testo(c.venditore) === venditore) && (!partner || testo(c.partner) === partner));
}
function calcolaMetriche(lista){
    const validi = lista.filter(praticaValida);
    const contrattiTotali = lista.reduce((t,c) => t + getContractUnits(c), 0);
    const contrattiValidi = validi.reduce((t,c) => t + getContractUnits(c), 0);
    const fatturatoPartner = validi.reduce((t,c) => t + numero(c.gettonePartner), 0);
    const gettoneVenditori = validi.reduce((t,c) => t + numero(c.gettoneVenditore), 0);
    const margine = validi.reduce((t,c) => t + calcolaMargine(c), 0);
    const daPagare = validi.filter(c => testo(c.pagamentoVenditore) === "Da pagare").reduce((t,c) => t + numero(c.gettoneVenditore), 0);
    const daIncassare = validi.filter(c => testo(c.pagamentoPartner) === "Da incassare").reduce((t,c) => t + numero(c.gettonePartner), 0);
    const koStorni = lista.filter(c => ["KO", "Storno"].includes(testo(c.stato))).reduce((t,c) => t + getContractUnits(c), 0);
    return { contrattiTotali, contrattiValidi, fatturatoPartner, gettoneVenditori, margine, margineMedio: contrattiValidi ? margine / contrattiValidi : 0, okRate: contrattiTotali ? (contrattiValidi / contrattiTotali) * 100 : 0, ticketMedio: contrattiValidi ? fatturatoPartner / contrattiValidi : 0, daPagare, daIncassare, koStorni, koStorniRate: contrattiTotali ? (koStorni / contrattiTotali) * 100 : 0 };
}
function aggregateBy(lista, campo, amountField){
    const map = {};
    lista.filter(praticaValida).forEach(c => { const nome = testo(c[campo]) || "Non indicato"; map[nome] = (map[nome] || 0) + numero(c[amountField]); });
    return Object.entries(map).map(([nome, valore]) => ({ nome, valore })).sort((a,b) => b.valore - a.valore);
}
function statistiche(lista, campo){
    const map = {};
    lista.forEach(c => { const nome = testo(c[campo]) || "Non indicato"; if(!map[nome]) map[nome] = { nome, validi:0, totali:0, fatturatoPartner:0, gettoneVenditori:0, margine:0 }; map[nome].totali += getContractUnits(c); if(praticaValida(c)){ map[nome].validi += getContractUnits(c); map[nome].fatturatoPartner += numero(c.gettonePartner); map[nome].gettoneVenditori += numero(c.gettoneVenditore); map[nome].margine += calcolaMargine(c); } });
    return Object.values(map).sort((a,b) => (b.fatturatoPartner + b.gettoneVenditori) - (a.fatturatoPartner + a.gettoneVenditori));
}
function popolaFiltri(contratti){
    document.getElementById("monthFilter").innerHTML = `<option value="${ALL_MONTHS}">Tutte le mensilità</option>` + MESI.map(([v,l]) => `<option value="${v}">${l}</option>`).join("");
    document.getElementById("monthFilter").value = ALL_MONTHS;
    document.getElementById("vendorFilter").innerHTML = `<option value="">Tutti i venditori</option>` + uniqueOptions(contratti, "venditore").map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
    document.getElementById("partnerFilter").innerHTML = `<option value="">Tutti i partner</option>` + uniqueOptions(contratti, "partner").map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
}
function renderCards(m){ document.getElementById("mainKpiCards").innerHTML = KPI_CARDS.map(k => `<div class="card kpi-card"><div class="kpi-icon">${k.icon}</div><h4>${k.label}</h4><p>${formatValue(m[k.key], k.type)}</p><small>${k.hint}</small></div>`).join(""); }
function ultimiSeiMesi(){ const now = new Date(); return Array.from({length:6}, (_, i) => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1)); return d.toISOString().slice(0,7); }); }
function serieUltimiSeiMesi(contratti){ return ultimiSeiMesi().map(mese => { const metriche = calcolaMetriche(contratti.filter(c => meseDaData(c.dataInserimento) === mese)); return { mese, label:meseLabel(mese).slice(0,3), ...metriche }; }); }
function renderTrend(dati){
    const max = Math.max(...dati.map(d => Math.max(d.fatturatoPartner, d.margine)), 1); const points = dati.map((d,i) => `${40 + i*58},${190 - (d.margine / max) * 150}`).join(" ");
    document.getElementById("sixMonthTrend").innerHTML = `<svg class="svg-chart" viewBox="0 0 360 230"><defs><linearGradient id="partnerGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff7b00"/><stop offset="1" stop-color="#d90429"/></linearGradient></defs>${dati.map((d,i) => { const h = Math.max(3, (d.fatturatoPartner / max) * 150); const x = 28 + i*58; return `<rect class="bar-partner" x="${x}" y="${190-h}" width="24" height="${h}" rx="8"><title>${d.label}: ${euro(d.fatturatoPartner)}</title></rect><text class="axis-label" x="${x+12}" y="214" text-anchor="middle">${d.label}</text>`; }).join("")}<polyline class="line-margin" points="${points}"/>${dati.map((d,i) => `<circle class="point" cx="${40+i*58}" cy="${190 - (d.margine / max) * 150}" r="4" stroke="#d90429"><title>Margine: ${euro(d.margine)}</title></circle>`).join("")}<text class="axis-label" x="8" y="18">Barre: fatturato · Linea: margine</text></svg>`;
}
function renderAverageLine(dati){ const max = Math.max(...dati.map(d => d.margineMedio), 1); const points = dati.map((d,i) => `${40 + i*58},${190 - (d.margineMedio / max) * 150}`).join(" "); document.getElementById("averageMarginTrend").innerHTML = `<svg class="svg-chart" viewBox="0 0 360 230"><polyline class="line-average" points="${points}"/>${dati.map((d,i) => `<circle class="point" cx="${40+i*58}" cy="${190 - (d.margineMedio / max) * 150}" r="5" stroke="#ff7b00"><title>${d.label}: ${euro(d.margineMedio)}</title></circle><text class="axis-label" x="${40+i*58}" y="214" text-anchor="middle">${d.label}</text>`).join("")}<text class="axis-label" x="8" y="18">Margine medio per contratto valido</text></svg>`; }
function renderDonut(id, entries, emptyText, valueLabel){
    const totale = entries.reduce((t,e) => t + e.valore, 0);
    if(!entries.length || totale <= 0){ document.getElementById(id).innerHTML = `<p class="empty-note">${emptyText}</p>`; return; }
    let start = 0; const gradient = entries.map((e,i) => { const p = (e.valore / totale) * 100; const seg = `${COLORS[i % COLORS.length]} ${start}% ${start + p}%`; start += p; return seg; }).join(",");
    document.getElementById(id).innerHTML = `<div class="donut-layout"><div class="donut" style="background:conic-gradient(${gradient})"></div><div class="legend-list">${entries.map((e,i) => { const p = totale ? (e.valore / totale) * 100 : 0; return `<div class="legend-row"><span class="legend-dot" style="background:${COLORS[i % COLORS.length]}"></span><span>${escapeHtml(e.nome)}</span><strong>${euro(e.valore)}</strong><small>${valueLabel} · ${formatValue(p, "percent")}</small></div>`; }).join("")}</div></div>`;
}
function renderTables(lista){
    const venditori = statistiche(lista, "venditore"); const partner = statistiche(lista, "partner");
    document.getElementById("topVendorsBody").innerHTML = venditori.length ? venditori.map(v => `<tr><td>${escapeHtml(v.nome)}</td><td>${v.validi}</td><td>${v.totali}</td><td>${euro(v.gettoneVenditori)}</td><td>${euro(v.margine)}</td><td><a class="link-open" href="vendor-detail.html?vendor=${encodeURIComponent(v.nome)}">Apri</a></td></tr>`).join("") : `<tr><td colspan="6" class="empty-note">Nessun venditore nel periodo selezionato.</td></tr>`;
    document.getElementById("topPartnersBody").innerHTML = partner.length ? partner.map(p => `<tr><td>${escapeHtml(p.nome)}</td><td>${p.validi}</td><td>${p.totali}</td><td>${euro(p.fatturatoPartner)}</td><td>${euro(p.margine)}</td><td><a class="link-open" href="partner-detail.html?partner=${encodeURIComponent(p.nome)}">Apri</a></td></tr>`).join("") : `<tr><td colspan="6" class="empty-note">Nessun partner nel periodo selezionato.</td></tr>`;
}
function renderInsights(metriche, partnerEntries, vendorEntries, serie){
    const last = serie.at(-1)?.margineMedio || 0; const prev = serie.at(-2)?.margineMedio || 0; const trend = last > prev ? "in crescita" : last < prev ? "in calo" : "stabile";
    const suggerimento = metriche.daIncassare > metriche.daPagare ? "Priorità: sollecitare incassi partner aperti." : metriche.koStorniRate > 20 ? "Verificare cause KO/Storni e qualità pratiche." : "Situazione equilibrata: mantenere monitoraggio settimanale.";
    document.getElementById("quickInsights").innerHTML = [
        ["Partner top del periodo", partnerEntries[0] ? `${partnerEntries[0].nome} · ${euro(partnerEntries[0].valore)}` : "Nessun dato", "Calcolato su gettonePartner delle pratiche OK/Pagato."],
        ["Venditore top del periodo", vendorEntries[0] ? `${vendorEntries[0].nome} · ${euro(vendorEntries[0].valore)}` : "Nessun dato", "Calcolato su gettoneVenditore delle pratiche OK/Pagato."],
        ["Margine medio", `${euro(metriche.margineMedio)} · ${trend}`, `Ultimo mese ${euro(last)}, mese precedente ${euro(prev)}.`],
        ["Incidenza KO/Storni", formatValue(metriche.koStorniRate, "percent"), `${metriche.koStorni} unità su ${metriche.contrattiTotali} totali filtrati.`],
        ["Suggerimento operativo", suggerimento, "Insight automatico basato sui dati del periodo."]
    ].map(i => `<div class="insight-item"><span>${i[0]}</span><strong>${escapeHtml(i[1])}</strong><p>${escapeHtml(i[2])}</p></div>`).join("");
}
function aggiornaPagina(){
    const contratti = leggiStorage("contrattiTopHouse"); const lista = applyFilters(contratti); const metriche = calcolaMetriche(lista); const serie = serieUltimiSeiMesi(contratti.filter(c => (!document.getElementById("vendorFilter").value || testo(c.venditore) === document.getElementById("vendorFilter").value) && (!document.getElementById("partnerFilter").value || testo(c.partner) === document.getElementById("partnerFilter").value)));
    const partnerEntries = aggregateBy(lista, "partner", "gettonePartner"); const vendorEntries = aggregateBy(lista, "venditore", "gettoneVenditore");
    renderCards(metriche); renderTrend(serie); renderAverageLine(serie); renderDonut("partnerRevenueChart", partnerEntries, "Nessun fatturato partner nel periodo selezionato.", "fatturato partner"); renderDonut("vendorRevenueChart", vendorEntries, "Nessun gettone venditore nel periodo selezionato.", "totale da pagare"); renderInsights(metriche, partnerEntries, vendorEntries, serie); renderTables(lista);
}
document.addEventListener("DOMContentLoaded", () => { const contratti = leggiStorage("contrattiTopHouse"); popolaFiltri(contratti); ["monthFilter", "vendorFilter", "partnerFilter"].forEach(id => document.getElementById(id).addEventListener("change", aggiornaPagina)); document.getElementById("printBtn").addEventListener("click", () => window.print()); aggiornaPagina(); });
