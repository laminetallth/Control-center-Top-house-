const MESI = [
    ["2026-01", "Gennaio 2026"], ["2026-02", "Febbraio 2026"], ["2026-03", "Marzo 2026"],
    ["2026-04", "Aprile 2026"], ["2026-05", "Maggio 2026"], ["2026-06", "Giugno 2026"],
    ["2026-07", "Luglio 2026"], ["2026-08", "Agosto 2026"], ["2026-09", "Settembre 2026"],
    ["2026-10", "Ottobre 2026"], ["2026-11", "Novembre 2026"], ["2026-12", "Dicembre 2026"]
];

const KPI_COMPARISON_CONFIG = [
    { key:"totale", label:"Totale Contratti", type:"number", mood:"up" },
    { key:"ok", label:"Contratti OK", type:"number", mood:"up" },
    { key:"commodity", label:"Totale Commodity", type:"number", mood:"up" },
    { key:"extraCommodity", label:"Totale Extra Commodity", type:"number", mood:"up" },
    { key:"commodityPerc", label:"% Commodity", type:"percent", mood:"up" },
    { key:"extraCommodityPerc", label:"% Extra Commodity", type:"percent", mood:"up" },
    { key:"okRate", label:"OK Rate %", type:"percent", mood:"up" },
    { key:"ko", label:"KO", type:"number", mood:"down" },
    { key:"storni", label:"Storni", type:"number", mood:"down" },
    { key:"margine", label:"Margine Maturato", type:"currency", mood:"up" },
    { key:"daIncassare", label:"Da Incassare Partner", type:"currency", mood:"down" },
    { key:"daPagare", label:"Da Pagare Venditori", type:"currency", mood:"down" },
    { key:"investimenti", label:"Investimenti", type:"currency", mood:"down" },
    { key:"roi", label:"ROI Investimenti", type:"percent", mood:"up" }
];

function testo(valore){ return String(valore || "").trim(); }
function numero(valore){ return Number(valore || 0) || 0; }
function praticaValida(c){ return testo(c.stato) === "OK" || testo(c.stato) === "Pagato"; }


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

function calcolaMargine(c){ return praticaValida(c) ? numero(c.gettonePartner) - numero(c.gettoneVenditore) : 0; }
function euro(v){ return Math.round(numero(v)).toLocaleString("it-IT") + "€"; }
function percent(v){ return Math.round(numero(v) * 10) / 10 + "%"; }
function format(v, type){ return type === "currency" ? euro(v) : type === "percent" ? percent(v) : String(Math.round(numero(v))); }
function escapeHtml(v){ return testo(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function leggiStorage(chiave){ try{ const dati = JSON.parse(localStorage.getItem(chiave)); return Array.isArray(dati) ? dati : []; }catch(e){ return []; } }
function meseDaData(data){ return testo(data).slice(0, 7); }
function filtraContrattiMese(contratti, mese){ return contratti.filter(c => meseDaData(c.dataInserimento) === mese); }
function filtraInvestimentiMese(investimenti, mese){ return investimenti.filter(i => meseDaData(i.data || i.dataInserimento) === mese); }
function mesePrecedente(mese){ const i = MESI.findIndex(m => m[0] === mese); return i > 0 ? MESI[i - 1][0] : ""; }

function popolaMesi(){
    const select = document.getElementById("monthFilter");
    select.innerHTML = MESI.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
    const corrente = new Date().toISOString().slice(0, 7);
    select.value = MESI.some(m => m[0] === corrente) ? corrente : "2026-06";
}

function calcolaMetriche(contratti, investimenti){
    const okList = contratti.filter(praticaValida);
    const totale = sommaUnita(contratti);
    const ok = sommaUnita(okList);
    const ko = sommaUnita(contratti.filter(c => testo(c.stato) === "KO"));
    const storni = sommaUnita(contratti.filter(c => testo(c.stato) === "Storno"));
    const margine = okList.reduce((t, c) => t + calcolaMargine(c), 0);
    const daIncassare = okList.filter(c => testo(c.pagamentoPartner) === "Da incassare").reduce((t, c) => t + numero(c.gettonePartner), 0);
    const daPagare = okList.filter(c => testo(c.pagamentoVenditore) === "Da pagare").reduce((t, c) => t + numero(c.gettoneVenditore), 0);
    const investimentiTot = investimenti.reduce((t, i) => t + numero(i.importo), 0);
    const commodity = sommaCategoria(contratti, "Commodity");
    const extraCommodity = sommaCategoria(contratti, "Extra Commodity");
    const commodityOk = sommaCategoria(okList, "Commodity");
    const extraCommodityOk = sommaCategoria(okList, "Extra Commodity");
    const commodityPerc = totale > 0 ? (commodity / totale) * 100 : 0;
    const extraCommodityPerc = totale > 0 ? (extraCommodity / totale) * 100 : 0;
    const okRate = totale > 0 ? (ok / totale) * 100 : 0;
    const roi = investimentiTot > 0 ? ((margine - investimentiTot) / investimentiTot) * 100 : 0;
    const saldo = margine - investimentiTot;
    const cashPressure = daIncassare + daPagare;
    return { totale, ok, commodity, extraCommodity, commodityOk, extraCommodityOk, commodityPerc, extraCommodityPerc, okRate, ko, storni, margine, daIncassare, daPagare, investimenti: investimentiTot, roi, saldo, cashPressure };
}

function renderCards(m){
    const cards = KPI_COMPARISON_CONFIG.concat([
        { key:"saldo", label:"Saldo Operativo", type:"currency" },
        { key:"cashPressure", label:"Cash pressure", type:"currency" }
    ]);
    document.getElementById("mainKpiCards").innerHTML = cards.map(k => `
        <div class="card kpi-card"><h4>${k.label}</h4><p>${format(m[k.key], k.type)}</p><small>Mese selezionato</small></div>
    `).join("");
}

function variazione(attuale, precedente){ if(precedente === 0) return attuale === 0 ? "N/D" : "Nuovo"; return `${Math.round(((attuale - precedente) / Math.abs(precedente)) * 100)}%`; }
function classeTrend(k, attuale, precedente){
    if(precedente === 0 || attuale === precedente) return "trend-neutral";
    const cresce = attuale > precedente;
    if(k.mood === "up") return cresce ? "trend-positive" : "trend-negative";
    if(k.mood === "down") return cresce ? "trend-negative" : "trend-positive";
    return cresce ? "trend-warning" : "trend-positive";
}

function renderComparison(attuale, precedente){
    document.getElementById("comparisonGrid").innerHTML = KPI_COMPARISON_CONFIG.map(k => `
        <div class="comparison-card"><h4>${k.label}</h4><div class="comparison-values"><div><span>Selezionato</span><strong>${format(attuale[k.key], k.type)}</strong></div><div><span>Precedente</span><strong>${format(precedente[k.key], k.type)}</strong></div></div><span class="trend-badge ${classeTrend(k, attuale[k.key], precedente[k.key])}">${variazione(attuale[k.key], precedente[k.key])}</span></div>
    `).join("");
}

function aggregaMesi(contratti, investimenti){
    return MESI.map(([mese, label]) => {
        const c = filtraContrattiMese(contratti, mese);
        const inv = filtraInvestimentiMese(investimenti, mese);
        const m = calcolaMetriche(c, inv);
        return { mese, label: label.slice(0,3), ...m };
    });
}
function renderBarChart(id, dati, key, type){
    const max = Math.max(...dati.map(d => Math.abs(numero(d[key]))), 1);
    document.getElementById(id).innerHTML = dati.map(d => `<div class="bar-wrap" title="${d.mese}: ${format(d[key], type)}"><div class="bar" style="height:${Math.max(4, (Math.abs(numero(d[key])) / max) * 130)}px"></div><div class="bar-label">${d.label}</div></div>`).join("");
}
function renderServiceMix(lista){
    const counts = {};
    lista.filter(praticaValida).forEach(c => { const s = testo(c.servizio) || "Non indicato"; counts[s] = (counts[s] || 0) + getContractUnits(c); });
    const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    const tot = entries.reduce((t, e) => t + e[1], 0);
    document.getElementById("serviceMix").innerHTML = entries.length ? entries.map(([nome, val]) => { const p = tot ? Math.round((val/tot)*100) : 0; return `<div class="service-row"><div class="service-row-head"><span>${escapeHtml(nome)}</span><span>${p}% (${val})</span></div><div class="service-track"><div class="service-fill" style="width:${p}%"></div></div></div>`; }).join("") : `<p class="empty-note">Nessun servizio venduto nel mese selezionato.</p>`;
}

function statistiche(lista, campo){
    const map = {};
    lista.forEach(c => { const nome = testo(c[campo]) || "Non indicato"; if(!map[nome]) map[nome] = { nome, ok:0, totali:0, provvigioni:0, daIncassare:0, margine:0 }; map[nome].totali += getContractUnits(c); if(praticaValida(c)){ map[nome].ok += getContractUnits(c); map[nome].provvigioni += numero(c.gettoneVenditore); map[nome].daIncassare += testo(c.pagamentoPartner) === "Da incassare" ? numero(c.gettonePartner) : 0; map[nome].margine += calcolaMargine(c); } });
    return Object.values(map).sort((a,b) => b.ok - a.ok || b.margine - a.margine);
}
function renderTables(lista){
    const venditori = statistiche(lista, "venditore");
    const partner = statistiche(lista, "partner");
    document.getElementById("topVendorsBody").innerHTML = venditori.length ? venditori.map(v => `<tr><td>${escapeHtml(v.nome)}</td><td>${v.ok}</td><td>${v.totali}</td><td>${euro(v.provvigioni)}</td><td>${euro(v.margine)}</td><td><a class="link-open" href="vendor-detail.html?vendor=${encodeURIComponent(v.nome)}">Apri</a></td></tr>`).join("") : `<tr><td colspan="6" class="empty-note">Nessun venditore nel mese selezionato.</td></tr>`;
    document.getElementById("topPartnersBody").innerHTML = partner.length ? partner.map(p => `<tr><td>${escapeHtml(p.nome)}</td><td>${p.ok}</td><td>${p.totali}</td><td>${euro(p.daIncassare)}</td><td>${euro(p.margine)}</td><td><a class="link-open" href="partner-detail.html?partner=${encodeURIComponent(p.nome)}">Apri</a></td></tr>`).join("") : `<tr><td colspan="6" class="empty-note">Nessun partner nel mese selezionato.</td></tr>`;
    return { venditori, partner };
}
function renderInsights(lista, metriche, rankings){
    const servizi = statistiche(lista, "servizio");
    const margineMedio = metriche.ok > 0 ? metriche.margine / metriche.ok : 0;
    const saldo = metriche.margine - metriche.investimenti;
    const pressure = metriche.daIncassare + metriche.daPagare;
    const cards = [["Miglior venditore", rankings.venditori[0]?.nome || "-"], ["Miglior partner", rankings.partner[0]?.nome || "-"], ["Servizio più venduto", servizi[0]?.nome || "-"], ["Margine medio per OK", euro(margineMedio)], ["Saldo operativo stimato", euro(saldo)], ["Cash pressure", euro(pressure)]];
    document.getElementById("insightGrid").innerHTML = cards.map(c => `<div class="insight-card"><h4>${c[0]}</h4><strong>${escapeHtml(c[1])}</strong></div>`).join("");
}
function aggiornaPagina(){
    const mese = document.getElementById("monthFilter").value;
    const contratti = leggiStorage("contrattiTopHouse");
    const investimenti = leggiStorage("investimentiTopHouse");
    const lista = filtraContrattiMese(contratti, mese);
    const invMese = filtraInvestimentiMese(investimenti, mese);
    const attuale = calcolaMetriche(lista, invMese);
    const prev = mesePrecedente(mese);
    const precedente = calcolaMetriche(prev ? filtraContrattiMese(contratti, prev) : [], prev ? filtraInvestimentiMese(investimenti, prev) : []);
    renderCards(attuale); renderComparison(attuale, precedente);
    const serie = aggregaMesi(contratti, investimenti);
    renderBarChart("contractsTrend", serie, "totale", "number"); renderBarChart("marginTrend", serie, "margine", "currency"); renderBarChart("okRateTrend", serie, "okRate", "percent"); renderBarChart("investmentsTrend", serie, "investimenti", "currency");
    renderServiceMix(lista);
    const rankings = renderTables(lista);
    renderInsights(lista, attuale, rankings);
}

document.addEventListener("DOMContentLoaded", () => { popolaMesi(); document.getElementById("monthFilter").addEventListener("change", aggiornaPagina); document.getElementById("printBtn").addEventListener("click", () => window.print()); aggiornaPagina(); });
