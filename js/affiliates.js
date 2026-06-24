const STORAGE_KEY = "affiliatiTopHouse";
const STATI = ["Attivo", "Non attivo", "Da contattare"];
function testo(v){ return String(v || "").trim(); }
function numero(v){ return Number(v || 0); }
function leggi(){ try{ const d = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(d) ? d : []; }catch(e){ return []; } }
function salva(lista){ localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)); }
function esc(v){ return testo(v).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function badgeClass(v){ return testo(v).toLowerCase().replaceAll(" ", "-"); }
function badge(v){ return `<span class="badge ${badgeClass(v)}">${esc(v || "-")}</span>`; }
function aggiornaKpi(lista){
    const media = lista.length ? Math.round(lista.reduce((t,a) => t + numero(a.gettoneStipulato), 0) / lista.length) : 0;
    kpiTotale.innerText = lista.length; kpiAttivi.innerText = lista.filter(a => a.stato === "Attivo").length; kpiNonAttivi.innerText = lista.filter(a => a.stato === "Non attivo").length; kpiDaContattare.innerText = lista.filter(a => a.stato === "Da contattare").length; kpiGettoneMedio.innerText = media + "€";
}
function filtra(lista){
    const nome = testo(searchName.value).toLowerCase(), city = testo(filterCity.value).toLowerCase(), vend = testo(filterVendor.value).toLowerCase(), statoFiltro = filterStatus.value;
    return lista.filter(a => (!nome || testo(a.nomeAttivita).toLowerCase().includes(nome)) && (!city || testo(a.citta).toLowerCase().includes(city)) && (!vend || testo(a.venditore).toLowerCase().includes(vend)) && (!statoFiltro || a.stato === statoFiltro));
}
function render(){
    const lista = leggi(); aggiornaKpi(lista); affiliatesBody.innerHTML = ""; const filtrati = filtra(lista);
    if(filtrati.length === 0){ affiliatesBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#6b7280; font-weight:bold;">Nessun affiliato trovato.</td></tr>`; return; }
    filtrati.forEach(a => { const row = document.createElement("tr"); const next = STATI[(STATI.indexOf(a.stato) + 1 + STATI.length) % STATI.length] || "Attivo"; row.innerHTML = `<td><strong>${esc(a.nomeAttivita)}</strong></td><td>${esc(a.citta)}</td><td>${numero(a.gettoneStipulato)}€</td><td>${esc(a.venditore)}</td><td>${badge(a.stato)}</td><td>${esc(a.note)}</td><td><div class="action-buttons"><button class="edit-btn" onclick="cambiaStato(${a.id})">${esc(next)}</button><button class="edit-btn" onclick="modifica(${a.id})">Modifica</button><button class="delete-btn" onclick="elimina(${a.id})">Elimina</button></div></td>`; affiliatesBody.appendChild(row); });
}
function resetForm(){ affiliateForm.reset(); affiliateId.value = ""; saveAffiliateBtn.innerText = "Salva affiliato"; }
function modifica(id){ const a = leggi().find(x => Number(x.id) === Number(id)); if(!a){ return; } ["affiliateId","nomeAttivita","citta","gettoneStipulato","venditore","stato","note"].forEach(k => document.getElementById(k).value = k === "affiliateId" ? a.id : (a[k] || "")); saveAffiliateBtn.innerText = "Aggiorna affiliato"; window.scrollTo({top:0, behavior:"smooth"}); }
function cambiaStato(id){ const lista = leggi(); const a = lista.find(x => Number(x.id) === Number(id)); if(a){ a.stato = STATI[(STATI.indexOf(a.stato) + 1 + STATI.length) % STATI.length] || "Attivo"; salva(lista); render(); } }
function elimina(id){ if(!confirm("Eliminare questo affiliato?")){ return; } salva(leggi().filter(a => Number(a.id) !== Number(id))); render(); }
function exportAffiliates(){ const lista = filtra(leggi()); const righe = lista.map(a => `<tr><td>${esc(a.nomeAttivita)}</td><td>${esc(a.citta)}</td><td>${numero(a.gettoneStipulato)}€</td><td>${esc(a.venditore)}</td><td>${esc(a.stato)}</td><td>${esc(a.note)}</td></tr>`).join("") || `<tr><td colspan="6">Nessun affiliato trovato.</td></tr>`; const html = `<html><head><meta charset="UTF-8"></head><body><h1>TOP HOUSE - Affiliati</h1><table border="1"><thead><tr><th>Nome attività</th><th>Città</th><th>Gettone stipulato</th><th>Venditore</th><th>Stato</th><th>Note</th></tr></thead><tbody>${righe}</tbody></table></body></html>`; const blob = new Blob([html], {type:"application/vnd.ms-excel;charset=utf-8;"}); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "affiliati-top-house.xls"; link.click(); }
affiliateForm.addEventListener("submit", e => { e.preventDefault(); const lista = leggi(); const id = affiliateId.value; const dati = { id: id ? Number(id) : Date.now(), nomeAttivita: testo(nomeAttivita.value), citta: testo(citta.value), gettoneStipulato: numero(gettoneStipulato.value), venditore: testo(venditore.value), note: testo(note.value), stato: stato.value, dataInserimento: id ? (lista.find(a => Number(a.id) === Number(id)) || {}).dataInserimento || new Date().toISOString() : new Date().toISOString() }; const i = lista.findIndex(a => Number(a.id) === Number(id)); if(i >= 0){ lista[i] = dati; }else{ lista.push(dati); } salva(lista); resetForm(); render(); });
cancelEditBtn.addEventListener("click", resetForm); exportAffiliatesBtn.addEventListener("click", exportAffiliates); ["searchName","filterCity","filterVendor","filterStatus"].forEach(id => document.getElementById(id).addEventListener("input", render)); render();
