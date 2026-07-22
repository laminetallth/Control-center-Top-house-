import {
    db,
    doc,
    setDoc,
    serverTimestamp
} from "./firebase-config.js";

const STATI = ["Inserito", "In lavorazione", "OK", "KO", "Storno", "Pagato"];
const PAGAMENTI_PARTNER = ["Da incassare", "Incassato", "Non dovuto"];
const PAGAMENTI_VENDITORE = ["Da pagare", "Pagato", "Non dovuto"];
const modifichePendenti = new Map();
let salvataggioInCorso = false;

function testo(valore) {
    return String(valore ?? "").trim();
}

function leggiContratti() {
    try {
        const dati = JSON.parse(localStorage.getItem("contrattiTopHouse"));
        return Array.isArray(dati) ? dati : [];
    } catch (error) {
        return [];
    }
}

function trovaContratto(id) {
    return leggiContratti().find((contratto) => Number(contratto.id) === Number(id));
}

function salvaModificheLocali(modificheSalvate) {
    const contratti = leggiContratti();
    const perId = new Map(modificheSalvate.map((voce) => [Number(voce.id), voce.modifiche]));

    const aggiornati = contratti.map((contratto) => {
        const modifiche = perId.get(Number(contratto.id));
        return modifiche ? { ...contratto, ...modifiche } : contratto;
    });

    localStorage.setItem("contrattiTopHouse", JSON.stringify(aggiornati));
}

function tonoPerValore(valore) {
    const normalizzato = testo(valore).toLowerCase();

    if (["ok", "pagato", "incassato"].includes(normalizzato)) {
        return "positive";
    }

    if (["ko", "storno"].includes(normalizzato)) {
        return "negative";
    }

    if (["inserito", "in lavorazione", "da incassare", "da pagare"].includes(normalizzato)) {
        return "warning";
    }

    return "neutral";
}

function aggiornaTono(select) {
    select.classList.remove("tone-positive", "tone-negative", "tone-warning", "tone-neutral");
    select.classList.add(`tone-${tonoPerValore(select.value)}`);
}

function mostraToast(messaggio, tipo = "success") {
    let toast = document.getElementById("contractQuickUpdateToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "contractQuickUpdateToast";
        toast.className = "contract-quick-toast";
        document.body.appendChild(toast);
    }

    toast.className = `contract-quick-toast ${tipo}`;
    toast.textContent = messaggio;
    toast.classList.add("visible");

    window.clearTimeout(Number(toast.dataset.timer || 0));
    const timer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
    toast.dataset.timer = String(timer);
}

function aggiornaPulsanteGlobale() {
    const button = document.getElementById("saveAllContractStatuses");
    if (!button) return;

    const totale = modifichePendenti.size;
    button.disabled = totale === 0 || salvataggioInCorso;
    button.classList.toggle("has-changes", totale > 0);

    if (salvataggioInCorso) {
        button.textContent = `Salvataggio di ${totale} contratti...`;
        return;
    }

    button.textContent = totale > 0
        ? `Salva tutte le modifiche (${totale})`
        : "Salva tutte le modifiche";
}

function aggiornaAspettoRiga(row, id) {
    row.classList.toggle("quick-row-changed", modifichePendenti.has(Number(id)));
}

function creaSelect(valori, valoreCorrente, etichetta, tipo, id) {
    const select = document.createElement("select");
    select.className = "quick-edit-select";
    select.dataset.quickField = tipo;
    select.setAttribute("aria-label", etichetta);

    valori.forEach((valore) => {
        const option = document.createElement("option");
        option.value = valore;
        option.textContent = valore;
        option.selected = valore === valoreCorrente;
        select.appendChild(option);
    });

    if (![...select.options].some((option) => option.selected) && valoreCorrente) {
        const option = document.createElement("option");
        option.value = valoreCorrente;
        option.textContent = valoreCorrente;
        option.selected = true;
        select.appendChild(option);
    }

    aggiornaTono(select);
    select.addEventListener("change", () => {
        aggiornaTono(select);
        const row = select.closest("tr");
        if (row) aggiornaModificheRiga(row, id);
    });

    return select;
}

function leggiValoriRiga(row) {
    const stato = row.querySelector('[data-quick-field="stato"]')?.value;
    const pagamentoPartner = row.querySelector('[data-quick-field="pagamentoPartner"]')?.value;
    const pagamentoVenditore = row.querySelector('[data-quick-field="pagamentoVenditore"]')?.value;

    return { stato, pagamentoPartner, pagamentoVenditore };
}

function aggiornaModificheRiga(row, id) {
    const contratto = trovaContratto(id);
    if (!contratto) {
        mostraToast("Contratto non trovato. Aggiorna la pagina e riprova.", "error");
        return;
    }

    const modifiche = leggiValoriRiga(row);
    const invariato =
        testo(contratto.stato) === testo(modifiche.stato) &&
        testo(contratto.pagamentoPartner) === testo(modifiche.pagamentoPartner) &&
        testo(contratto.pagamentoVenditore) === testo(modifiche.pagamentoVenditore);

    if (invariato) {
        modifichePendenti.delete(Number(id));
    } else {
        modifichePendenti.set(Number(id), modifiche);
    }

    aggiornaAspettoRiga(row, id);
    aggiornaPulsanteGlobale();
}

async function salvaTutteLeModifiche() {
    if (salvataggioInCorso || modifichePendenti.size === 0) {
        return;
    }

    const richieste = [...modifichePendenti.entries()].map(([id, modifiche]) => ({
        id,
        modifiche,
        contratto: trovaContratto(id)
    }));

    const mancanti = richieste.filter((voce) => !voce.contratto);
    if (mancanti.length) {
        mostraToast("Alcuni contratti non sono più disponibili. Aggiorna la pagina.", "error");
        return;
    }

    salvataggioInCorso = true;
    aggiornaPulsanteGlobale();
    document.querySelectorAll(".quick-edit-select").forEach((select) => {
        select.disabled = true;
    });

    const risultati = await Promise.allSettled(richieste.map(async (voce) => {
        const firestoreId = testo(
            voce.contratto.firestoreId ||
            voce.contratto.localId ||
            voce.contratto.id ||
            voce.id
        );

        await setDoc(doc(db, "contracts", firestoreId), {
            ...voce.modifiche,
            updatedAt: serverTimestamp()
        }, { merge: true });

        return voce;
    }));

    const salvate = [];
    let errori = 0;

    risultati.forEach((risultato, index) => {
        const voce = richieste[index];
        if (risultato.status === "fulfilled") {
            salvate.push(voce);
            modifichePendenti.delete(Number(voce.id));
        } else {
            errori += 1;
            console.error(risultato.reason);
        }
    });

    if (salvate.length) {
        salvaModificheLocali(salvate);
    }

    salvataggioInCorso = false;
    document.querySelectorAll(".quick-edit-select").forEach((select) => {
        select.disabled = false;
    });
    document.querySelectorAll("#contractsBody tr").forEach((row) => {
        const id = Number(row.dataset.quickContractId);
        if (Number.isFinite(id)) aggiornaAspettoRiga(row, id);
    });
    aggiornaPulsanteGlobale();

    if (errori === 0) {
        mostraToast(`${salvate.length} contratti aggiornati correttamente.`);
        window.setTimeout(() => window.location.reload(), 850);
        return;
    }

    mostraToast(`${salvate.length} salvati, ${errori} non riusciti. Riprova.`, "error");
}

function miglioraRiga(row) {
    if (!row || row.dataset.quickUpdateReady === "true") {
        return;
    }

    const celle = row.cells;
    if (!celle || celle.length < 18) {
        return;
    }

    const id = Number(testo(celle[1]?.textContent));
    if (!Number.isFinite(id)) {
        return;
    }

    const contratto = trovaContratto(id);
    if (!contratto) {
        return;
    }

    row.dataset.quickUpdateReady = "true";
    row.dataset.quickContractId = String(id);

    const pendenti = modifichePendenti.get(id) || {};
    const stato = testo(pendenti.stato || contratto.stato) || "Inserito";
    const pagamentoPartner = testo(pendenti.pagamentoPartner || contratto.pagamentoPartner) || "Da incassare";
    const pagamentoVenditore = testo(pendenti.pagamentoVenditore || contratto.pagamentoVenditore) || "Da pagare";

    celle[11].replaceChildren(creaSelect(STATI, stato, `Stato contratto ${id}`, "stato", id));
    celle[15].replaceChildren(creaSelect(
        PAGAMENTI_PARTNER,
        pagamentoPartner,
        `Pagamento partner contratto ${id}`,
        "pagamentoPartner",
        id
    ));
    celle[16].replaceChildren(creaSelect(
        PAGAMENTI_VENDITORE,
        pagamentoVenditore,
        `Pagamento venditore contratto ${id}`,
        "pagamentoVenditore",
        id
    ));

    aggiornaAspettoRiga(row, id);
}

function miglioraTabella() {
    document.querySelectorAll("#contractsBody tr").forEach(miglioraRiga);
    aggiornaPulsanteGlobale();
}

function creaPulsanteGlobale() {
    if (document.getElementById("saveAllContractStatuses")) {
        return;
    }

    const area = document.querySelector(".table-actions.filters-area");
    if (!area) {
        return;
    }

    const button = document.createElement("button");
    button.id = "saveAllContractStatuses";
    button.type = "button";
    button.className = "save-all-contract-statuses";
    button.textContent = "Salva tutte le modifiche";
    button.disabled = true;
    button.title = "Salva insieme tutte le modifiche a stato e pagamenti";
    button.addEventListener("click", salvaTutteLeModifiche);

    const exportButton = [...area.querySelectorAll("button")]
        .find((elemento) => testo(elemento.textContent).includes("Esporta Report"));
    area.insertBefore(button, exportButton || null);
    aggiornaPulsanteGlobale();
}

function aggiungiStili() {
    if (document.getElementById("contractQuickUpdateStyles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "contractQuickUpdateStyles";
    style.textContent = `
        .quick-edit-select {
            min-width: 132px;
            max-width: 170px;
            padding: 9px 30px 9px 11px;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 800;
            cursor: pointer;
            outline: none;
            transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .quick-edit-select:focus {
            border-color: #ff7b00;
            box-shadow: 0 0 0 3px rgba(255, 123, 0, .15);
        }
        .quick-edit-select:disabled { opacity: .65; cursor: wait; }
        .quick-edit-select.tone-positive { background: #ecfdf5; border-color: #86efac; color: #166534; }
        .quick-edit-select.tone-warning { background: #fff7ed; border-color: #fdba74; color: #9a3412; }
        .quick-edit-select.tone-negative { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }
        .quick-edit-select.tone-neutral { background: #f8fafc; border-color: #cbd5e1; color: #475569; }
        #contractsBody tr.quick-row-changed td {
            background-color: rgba(255, 123, 0, .055);
        }
        .save-all-contract-statuses {
            background: #111827;
            color: #fff;
            border: 0;
            border-radius: 11px;
            padding: 11px 16px;
            font-size: 13px;
            font-weight: 900;
            white-space: nowrap;
            cursor: pointer;
            opacity: .45;
            transition: transform .2s, opacity .2s, box-shadow .2s;
        }
        .save-all-contract-statuses.has-changes {
            background: linear-gradient(135deg, #d90429, #ff7b00);
            opacity: 1;
            box-shadow: 0 7px 16px rgba(217, 4, 41, .22);
        }
        .save-all-contract-statuses.has-changes:hover { transform: translateY(-1px); }
        .save-all-contract-statuses:disabled { cursor: default; }
        .contract-quick-toast {
            position: fixed;
            right: 24px;
            bottom: 24px;
            z-index: 99999;
            max-width: 360px;
            padding: 14px 18px;
            border-radius: 13px;
            background: #166534;
            color: #fff;
            font-weight: 800;
            box-shadow: 0 14px 32px rgba(0, 0, 0, .22);
            opacity: 0;
            transform: translateY(18px);
            pointer-events: none;
            transition: opacity .2s, transform .2s;
        }
        .contract-quick-toast.visible { opacity: 1; transform: translateY(0); }
        .contract-quick-toast.error { background: #991b1b; }
        .contract-quick-toast.info { background: #334155; }
        @media (max-width: 900px) {
            .quick-edit-select { min-width: 120px; }
            .save-all-contract-statuses { width: 100%; }
            .contract-quick-toast { left: 16px; right: 16px; bottom: 16px; max-width: none; }
        }
    `;
    document.head.appendChild(style);
}

function avvia() {
    aggiungiStili();
    creaPulsanteGlobale();
    miglioraTabella();

    const tbody = document.getElementById("contractsBody");
    if (!tbody) {
        window.setTimeout(avvia, 250);
        return;
    }

    const observer = new MutationObserver(() => {
        creaPulsanteGlobale();
        miglioraTabella();
    });
    observer.observe(tbody, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", avvia, { once: true });
} else {
    avvia();
}
