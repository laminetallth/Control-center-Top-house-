import { readCollection, addDocument, updateDocument, deleteDocument } from "./firebase-data.js";

(() => {
  "use strict";

  const COLLECTION = "vendorProfiles";
  const LOCAL_KEY = "vendorProfilesTopHouse";
  const SEED = [
    { nome: "Antonio Attardi", zona: "Lombardia", ruolo: "Venditore", foto: "assets/vendors/antonio-attardi.png" },
    { nome: "Davide Marino", zona: "Praia a Mare", ruolo: "Venditore", foto: "assets/vendors/davide-marino.png" },
    { nome: "Fabio Magnago", zona: "Empoli", ruolo: "Venditore", foto: "assets/vendors/fabio-magnago.png" },
    { nome: "Gabriele Straniero", zona: "Italia", ruolo: "Direttore zona Italia", foto: "assets/vendors/gabriele-straniero.png" },
    { nome: "Giuseppe Maresca", zona: "Empoli", ruolo: "Venditore", foto: "assets/vendors/giuseppe-maresca.png" },
    { nome: "Lamine Tall", zona: "Lombardia", ruolo: "Venditore Lombardia", foto: "assets/vendors/lamine-tall.png" },
    { nome: "Morena Caccavo", zona: "Lombardia", ruolo: "Venditore", foto: "assets/vendors/morena-caccavo.png" },
    { nome: "Studio Cian", zona: "Cassano Magnago", ruolo: "Venditore", foto: "assets/vendors/studio-cian.png" }
  ];

  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const slug = name => String(name || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `vendor-${Date.now()}`;
  const initials = name => String(name || "").trim().split(/\s+/).map(x => x[0]).join("").slice(0,2).toUpperCase();
  const readLocal = () => { try { const x = JSON.parse(localStorage.getItem(LOCAL_KEY)); return Array.isArray(x) ? x : []; } catch { return []; } };
  const writeLocal = list => localStorage.setItem(LOCAL_KEY, JSON.stringify(list));

  let vendors = [];

  async function load() {
    try {
      const remote = await readCollection(COLLECTION);
      vendors = Array.isArray(remote) && remote.length ? remote : [];
    } catch { vendors = []; }
    if (!vendors.length) {
      vendors = SEED.map(v => ({ ...v, id: slug(v.nome), localId: slug(v.nome), firestoreId: slug(v.nome), attivo: true }));
      for (const v of vendors) {
        try { await addDocument(COLLECTION, v); } catch (e) { console.warn("Seed venditore non salvato", v.nome, e); }
      }
    }
    vendors = vendors.map(v => ({ ...v, attivo: v.attivo !== false }));
    writeLocal(vendors);
    render();
  }

  function render() {
    const container = document.getElementById("registeredVendorsGrid");
    if (!container) return;
    container.innerHTML = "";
    const active = vendors.filter(v => v.attivo !== false);
    const inactive = vendors.filter(v => v.attivo === false);
    [...active, ...inactive].forEach(v => {
      const card = document.createElement("div");
      card.className = `vendor-card-small vendor-management-card ${v.attivo === false ? "vendor-inactive" : ""}`;
      card.innerHTML = `
        <div class="vendor-avatar-small ${v.foto ? "" : "no-photo"}">
          ${v.foto ? `<img src="${esc(v.foto)}" alt="${esc(v.nome)}" onerror="this.style.display='none';this.parentElement.classList.add('no-photo')">` : ""}
          <span class="vendor-initials">${esc(initials(v.nome))}</span>
        </div>
        <div class="vendor-management-info">
          <h4>${esc(v.nome)}</h4>
          <p>${esc(v.zona || "-")} · ${esc(v.ruolo || "Venditore")}</p>
          <span class="badge ${v.attivo === false ? "off" : "ok"}">${v.attivo === false ? "Non attivo" : "Attivo"}</span>
          <div class="vendor-management-actions">
            <button type="button" class="mini-btn" data-edit="${esc(v.firestoreId || v.id)}">✏️ Modifica</button>
            <button type="button" class="mini-btn danger" data-toggle="${esc(v.firestoreId || v.id)}">${v.attivo === false ? "↩️ Riattiva" : "🗑️ Rimuovi"}</button>
          </div>
        </div>`;
      container.appendChild(card);
    });
    container.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openModal(vendors.find(v => String(v.firestoreId || v.id) === String(b.dataset.edit)))));
    container.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", () => toggleVendor(vendors.find(v => String(v.firestoreId || v.id) === String(b.dataset.toggle)))));
    const count = document.getElementById("totaleVenditoriRegistrati");
    if (count) count.textContent = active.length;
  }

  function installUI() {
    if (document.getElementById("addVendorBtn")) return;
    const section = document.getElementById("registeredVendorsGrid")?.closest(".box");
    if (!section) return;
    const title = section.querySelector(".section-title");
    const btn = document.createElement("button");
    btn.type = "button"; btn.id = "addVendorBtn"; btn.className = "mini-btn vendor-add-btn"; btn.textContent = "＋ Aggiungi venditore";
    title?.appendChild(btn); btn.addEventListener("click", () => openModal(null));

    const style = document.createElement("style");
    style.textContent = `
      .vendor-management-card{display:flex;gap:16px;align-items:flex-start;position:relative}
      .vendor-management-info{flex:1;min-width:0}.vendor-management-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
      .vendor-management-actions .danger{border-color:#fecaca;color:#b91c1c}.vendor-inactive{opacity:.62}.vendor-initials{display:none}
      .vendor-add-btn{margin-left:auto}.vendor-management-modal{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999}
      .vendor-management-modal .modal-card{background:#fff;border-radius:18px;max-width:560px;width:100%;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.25)}
      .vendor-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.vendor-form-grid .full{grid-column:1/-1}.vendor-form-grid label{font-weight:700;font-size:13px;color:#374151;display:flex;flex-direction:column;gap:6px}.vendor-form-grid input{padding:11px;border:1px solid #d1d5db;border-radius:10px;font:inherit}.vendor-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
      @media(max-width:650px){.vendor-form-grid{grid-template-columns:1fr}.vendor-form-grid .full{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function openModal(vendor) {
    document.getElementById("vendorManagementModal")?.remove();
    const modal = document.createElement("div"); modal.id = "vendorManagementModal"; modal.className = "vendor-management-modal";
    const v = vendor || { nome:"", zona:"", ruolo:"Venditore", foto:"", attivo:true };
    modal.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true"><h2>${vendor ? "Modifica venditore" : "Aggiungi venditore"}</h2><p>${vendor ? "Aggiorna i dati senza toccare lo storico dei contratti." : "Il nuovo venditore verrà salvato nel profilo gestionale."}</p><form id="vendorManagementForm"><div class="vendor-form-grid"><label>Nome e cognome<input name="nome" required value="${esc(v.nome)}"></label><label>Zona<input name="zona" value="${esc(v.zona)}"></label><label>Ruolo<input name="ruolo" value="${esc(v.ruolo)}"></label><label>Foto (URL o percorso)<input name="foto" value="${esc(v.foto)}" placeholder="assets/vendors/nome.png"></label><label class="full">Stato<select name="attivo"><option value="true" ${v.attivo !== false ? "selected" : ""}>Attivo</option><option value="false" ${v.attivo === false ? "selected" : ""}>Non attivo</option></select></label></div><div class="vendor-modal-actions"><button type="button" class="mini-btn" id="vendorCancel">Annulla</button><button type="submit" class="mini-btn">Salva venditore</button></div></form></div>`;
    document.body.appendChild(modal);
    modal.querySelector("#vendorCancel").onclick = () => modal.remove();
    modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
    modal.querySelector("form").addEventListener("submit", async e => {
      e.preventDefault(); const fd = new FormData(e.currentTarget); const name = String(fd.get("nome") || "").trim();
      if (!name) return;
      const data = { nome:name, zona:String(fd.get("zona")||"").trim(), ruolo:String(fd.get("ruolo")||"Venditore").trim(), foto:String(fd.get("foto")||"").trim(), attivo:fd.get("attivo") === "true" };
      const submit = modal.querySelector("button[type=submit]"); submit.disabled=true; submit.textContent="Salvataggio...";
      try {
        if (vendor) { await updateDocument(COLLECTION, vendor.firestoreId || vendor.id, data); Object.assign(vendor, data); }
        else { const created = { ...data, id:slug(name), localId:slug(name) }; await addDocument(COLLECTION, created); vendors.push(created); }
        writeLocal(vendors); render(); modal.remove();
      } catch (err) { console.error(err); alert("Impossibile salvare il venditore. Riprova."); submit.disabled=false; submit.textContent="Salva venditore"; }
    });
  }

  async function toggleVendor(vendor) {
    if (!vendor) return;
    const removing = vendor.attivo !== false;
    const ok = confirm(removing ? `Rimuovere ${vendor.nome} dall'elenco dei venditori attivi? Lo storico dei contratti resterà intatto.` : `Riattivare ${vendor.nome}?`);
    if (!ok) return;
    try { await updateDocument(COLLECTION, vendor.firestoreId || vendor.id, { attivo: !removing }); vendor.attivo = !removing; writeLocal(vendors); render(); }
    catch (e) { console.error(e); alert("Impossibile aggiornare lo stato del venditore."); }
  }

  function start() { installUI(); load(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
