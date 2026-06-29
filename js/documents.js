import { readCollection, addDocument, updateDocument, deleteDocument } from "./firebase-data.js";
const STORAGE_KEY = "documentiTopHouse";
function testo(v){ return String(v || "").trim(); }
function leggi(){ try{ const d = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(d) ? d : []; }catch(e){ return []; } }
function salva(lista){ localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)); }
function setFirebaseStatus(message, type){ const el = document.getElementById("firebaseStatus"); if(el){ el.textContent = message; el.className = `firebase-status ${type || ""}`.trim(); } }
async function caricaFirebase(){ try{ const data = await readCollection("documents"); salva(data); setFirebaseStatus("Dati sincronizzati", "online"); render(); }catch(e){ console.error(e); setFirebaseStatus("Errore Firebase", "error"); render(); } }
function esc(v){ return testo(v).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function badgeClass(v){ return testo(v).toLowerCase().replaceAll(" ", "-"); }
function badge(v){ return `<span class="badge ${badgeClass(v)}">${esc(v || "-")}</span>`; }
function aggiornaKpi(lista){
    docTotale.innerText = lista.length;
    docContratti.innerText = lista.filter(d => d.categoria === "Contratti").length;
    docPartner.innerText = lista.filter(d => d.categoria === "Partner").length;
    docVenditori.innerText = lista.filter(d => d.categoria === "Venditori").length;
    docAziendali.innerText = lista.filter(d => d.categoria === "Aziendale").length;
    docUrgenti.innerText = lista.filter(d => d.stato === "Da aggiornare" || (d.scadenza && d.scadenza <= new Date().toISOString().slice(0, 10) && d.stato !== "Archiviato")).length;
}
function filtra(lista){
    const q = testo(searchText.value).toLowerCase();
    const categoria = filterCategory.value;
    const stato = filterStatus.value;
    return lista.filter(d => {
        const hay = `${d.titolo || ""} ${d.categoria || ""} ${d.collegatoA || ""} ${d.note || ""}`.toLowerCase();
        return (!q || hay.includes(q)) && (!categoria || d.categoria === categoria) && (!stato || d.stato === stato);
    });
}
function render(){
    const lista = leggi(); aggiornaKpi(lista);
    const filtrate = filtra(lista);
    documentsBody.innerHTML = filtrate.length ? filtrate.map(d => `<tr><td><strong>${esc(d.titolo)}</strong></td><td>${badge(d.categoria)}</td><td>${esc(d.collegatoA)}</td><td>${d.linkDocumento ? `<a class="link-open" href="${esc(d.linkDocumento)}" target="_blank" rel="noopener">Apri</a>` : "-"}</td><td>${esc(d.scadenza)}</td><td>${badge(d.stato)}</td><td>${esc(d.note)}</td><td><div class="action-buttons"><button class="edit-btn" onclick="modifica(${d.id})">Modifica</button><button class="delete-btn" onclick="elimina(${d.id})">Elimina</button></div></td></tr>`).join("") : `<tr><td colspan="8" class="empty-note">Nessun documento trovato.</td></tr>`;
}
function resetForm(){ documentForm.reset(); documentId.value = ""; saveDocumentBtn.innerText = "Salva documento"; }
function modifica(id){ const d = leggi().find(x => Number(x.id) === Number(id)); if(!d){ return; } ["titolo","categoria","collegatoA","linkDocumento","scadenza","stato","note"].forEach(k => document.getElementById(k).value = d[k] || ""); documentId.value = d.id; saveDocumentBtn.innerText = "Aggiorna documento"; window.scrollTo({top:0, behavior:"smooth"}); }
async function elimina(id){ if(!confirm("Eliminare questo documento?")){ return; } const old = leggi().find(d => Number(d.id) === Number(id)); salva(leggi().filter(d => Number(d.id) !== Number(id))); render(); try{ await deleteDocument("documents", old?.firestoreId || old?.localId || id); setFirebaseStatus("Dati sincronizzati", "online"); }catch(e){ console.error(e); setFirebaseStatus("Errore Firebase", "error"); } }
documentForm.addEventListener("submit", async e => { e.preventDefault(); const lista = leggi(); const id = documentId.value; const dati = { id: id ? Number(id) : Date.now(), titolo: testo(titolo.value), categoria: categoria.value, collegatoA: testo(collegatoA.value), linkDocumento: testo(linkDocumento.value), scadenza: scadenza.value, stato: stato.value, note: testo(note.value), aggiornatoIl: new Date().toISOString() }; const i = lista.findIndex(d => Number(d.id) === Number(id)); if(i >= 0){ lista[i] = dati; }else{ lista.push(dati); } salva(lista); resetForm(); render(); try{ if(i >= 0){ await updateDocument("documents", dati.firestoreId || dati.localId || dati.id, dati); }else{ await addDocument("documents", dati); } setFirebaseStatus("Dati sincronizzati", "online"); }catch(e){ console.error(e); setFirebaseStatus("Errore Firebase", "error"); } });
cancelEditBtn.addEventListener("click", resetForm);
[searchText, filterCategory, filterStatus].forEach(el => el.addEventListener("input", render));
window.modifica = modifica; window.elimina = elimina; caricaFirebase();
