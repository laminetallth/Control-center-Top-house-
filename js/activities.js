const STORAGE_KEY = "attivitaTopHouse";
const STATI = ["Da fare", "In corso", "Completata", "Rimandata"];
function testo(v){ return String(v || "").trim(); }
function leggi(){ try{ const d = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(d) ? d : []; }catch(e){ return []; } }
function salva(lista){ localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)); }
function esc(v){ return testo(v).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function badgeClass(v){ return testo(v).toLowerCase().replaceAll(" ", "-"); }
function badge(v){ return `<span class="badge ${badgeClass(v)}">${esc(v || "-")}</span>`; }
function aggiornaKpi(lista){
    document.getElementById("kpiTotale").innerText = lista.length;
    document.getElementById("kpiDaFare").innerText = lista.filter(a => a.stato === "Da fare").length;
    document.getElementById("kpiInCorso").innerText = lista.filter(a => a.stato === "In corso").length;
    document.getElementById("kpiCompletate").innerText = lista.filter(a => a.stato === "Completata").length;
    document.getElementById("kpiUrgenti").innerText = lista.filter(a => a.priorita === "Urgente").length;
}
function filtra(lista){
    const q = testo(document.getElementById("searchText").value).toLowerCase();
    const stato = document.getElementById("filterStatus").value;
    const priorita = document.getElementById("filterPriority").value;
    const assegnato = testo(document.getElementById("filterAssignee").value).toLowerCase();
    return lista.filter(a => {
        const testoCompleto = `${a.titolo || ""} ${a.descrizione || ""} ${a.note || ""} ${a.assegnatoA || ""}`.toLowerCase();
        return (!q || testoCompleto.includes(q)) && (!stato || a.stato === stato) && (!priorita || a.priorita === priorita) && (!assegnato || testo(a.assegnatoA).toLowerCase().includes(assegnato));
    });
}
function render(){
    const lista = leggi(); aggiornaKpi(lista);
    const tbody = document.getElementById("activitiesBody"); tbody.innerHTML = "";
    const filtrate = filtra(lista);
    if(filtrate.length === 0){ tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#6b7280; font-weight:bold;">Nessuna attività trovata.</td></tr>`; return; }
    filtrate.forEach(a => {
        const row = document.createElement("tr");
        if(a.stato === "Completata"){ row.className = "completed-row"; }
        const prossimoStato = STATI[(STATI.indexOf(a.stato) + 1 + STATI.length) % STATI.length] || "Da fare";
        row.innerHTML = `<td><strong>${esc(a.titolo)}</strong><br><small>${esc(a.descrizione)}</small></td><td>${badge(a.priorita)}</td><td>${esc(a.scadenza)}</td><td>${badge(a.stato)}</td><td>${esc(a.assegnatoA)}</td><td>${esc(a.note)}</td><td><div class="action-buttons"><button class="edit-btn" onclick="cambiaStato(${a.id})">${esc(prossimoStato)}</button><button class="edit-btn" onclick="modifica(${a.id})">Modifica</button><button class="delete-btn" onclick="elimina(${a.id})">Elimina</button></div></td>`;
        tbody.appendChild(row);
    });
}
function resetForm(){ document.getElementById("activityForm").reset(); document.getElementById("activityId").value = ""; document.getElementById("saveActivityBtn").innerText = "Salva attività"; }
function modifica(id){ const a = leggi().find(x => Number(x.id) === Number(id)); if(!a){ return; } ["activityId","titolo","descrizione","priorita","scadenza","assegnatoA","stato","note"].forEach(k => { const el = document.getElementById(k); if(el){ el.value = k === "activityId" ? a.id : (a[k] || ""); } }); document.getElementById("saveActivityBtn").innerText = "Aggiorna attività"; window.scrollTo({top:0, behavior:"smooth"}); }
function cambiaStato(id){ const lista = leggi(); const a = lista.find(x => Number(x.id) === Number(id)); if(a){ a.stato = STATI[(STATI.indexOf(a.stato) + 1 + STATI.length) % STATI.length] || "Da fare"; salva(lista); render(); } }
function elimina(id){ if(!confirm("Eliminare questa attività?")){ return; } salva(leggi().filter(a => Number(a.id) !== Number(id))); render(); }
document.getElementById("activityForm").addEventListener("submit", e => { e.preventDefault(); const lista = leggi(); const id = document.getElementById("activityId").value; const dati = { id: id ? Number(id) : Date.now(), titolo: testo(titolo.value), descrizione: testo(descrizione.value), priorita: priorita.value, scadenza: scadenza.value, stato: stato.value || "Da fare", assegnatoA: testo(assegnatoA.value), note: testo(note.value), dataCreazione: id ? (lista.find(a => Number(a.id) === Number(id)) || {}).dataCreazione || new Date().toISOString() : new Date().toISOString() }; const i = lista.findIndex(a => Number(a.id) === Number(id)); if(i >= 0){ lista[i] = dati; }else{ lista.push(dati); } salva(lista); resetForm(); render(); });
document.getElementById("cancelEditBtn").addEventListener("click", resetForm);
["searchText","filterStatus","filterPriority","filterAssignee"].forEach(id => document.getElementById(id).addEventListener("input", render));
render();
