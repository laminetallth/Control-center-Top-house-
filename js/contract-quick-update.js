import {
    db,
    doc,
    setDoc,
    serverTimestamp
} from "./firebase-config.js";

const STATI = ["Inserito", "In lavorazione", "OK", "KO", "Storno", "Pagato"];
const PAGAMENTI_PARTNER = ["Da incassare", "Incassato", "Non dovuto"];
const PAGAMENTI_VENDITORE = ["Da pagare", "Pagato", "Non dovuto"];

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

function salvaContrattoLocale(id, modifiche) {
    const contratti = leggiContratti();
    const indice = contratti.findIndex((contratto) => Number(contratto.id) === Number(id));

    if (indice < 0) {
        return false;
    }

    contratti[indice] = {
        ...contratti[indice],
        ...modifiche
    };

    localStorage.setItem("contrattiTopHouse", JSON.stringify(contratti));
    return true;
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

function creaSelect(valori, valoreCorrente, etichetta) {
    const select = document.createElement("select");
    select.className = "quick-edit-select";
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
        const button = row?.querySelector(".quick-save-row");
        if (button) {
            button.disabled = false;
            button.classList.add("has-changes");
            button.textContent = "Salva stati";
        }
    });

    return select;
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
    const timer = window.setTimeout(() => toast.classList.remove("visible"), 3000);
    toast.dataset.timer = String(timer);
}

async function salvaRiga(row, id) {
    const contratto = trovaContratto(id);
    const button = row.querySelector(".quick-save-row");
    const selects = [...row.querySelectorAll(".quick-edit-select")];

    if (!contratto || !button || selects.length !== 3) {
        mostraToast("Contratto non trovato. Aggiorna la pagina e riprova.", "error");
        return;
    }

    const [statoSelect, partnerSelect, venditoreSelect] = selects;
    const modifiche = {
        stato: statoSelect.value,
        pagamentoPartner: partnerSelect.value,
        pagamentoVenditore: venditoreSelect.value
    };

    const nessunaModifica =
        testo(contratto.stato) === modifiche.stato &&
        testo(contratto.pagamentoPartner) === modifiche.pagamentoPartner &&
        testo(contratto.pagamentoVenditore) === modifiche.pagamentoVenditore;

    if (nessunaModifica) {
        mostraToast("Nessuna modifica da salvare.", "info");
        button.classList.remove("has-changes");
        button.disabled = true;
        return;
    }

    button.disabled = true;
    button.textContent = "Salvataggio...";
    selects.forEach((select) => {
        select.disabled = true;
    });

    try {
        const firestoreId = testo(
            contratto.firestoreId ||
            contratto.localId ||
            contratto.id ||
            id
        );

        await setDoc(doc(db, "contracts", firestoreId), {
            ...modifiche,
            updatedAt: serverTimestamp()
        }, { merge: true });

        salvaContrattoLocale(id, modifiche);

        button.textContent = "Salvato ✓";
        button.classList.remove("has-changes");
        mostraToast("Stato e pagamenti aggiornati correttamente.");

        window.setTimeout(() => window.location.reload(), 850);
    } catch (error) {
        console.error(error);
        button.disabled = false;
        button.textContent = "Riprova";
        selects.forEach((select) => {
            select.disabled = false;
        });
        mostraToast("Errore durante il salvataggio. Riprova.", "error");
    }
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

    const statoSelect = creaSelect(STATI, testo(contratto.stato) || "Inserito", `Stato contratto ${id}`);
    const partnerSelect = creaSelect(
        PAGAMENTI_PARTNER,
        testo(contratto.pagamentoPartner) || "Da incassare",
        `Pagamento partner contratto ${id}`
    );
    const venditoreSelect = creaSelect(
        PAGAMENTI_VENDITORE,
        testo(contratto.pagamentoVenditore) || "Da pagare",
        `Pagamento venditore contratto ${id}`
    );

    celle[11].replaceChildren(statoSelect);
    celle[15].replaceChildren(partnerSelect);
    celle[16].replaceChildren(venditoreSelect);

    const actions = celle[0].querySelector(".action-buttons") || celle[0];
    const quickSaveButton = document.createElement("button");
    quickSaveButton.type = "button";
    quickSaveButton.className = "quick-save-row";
    quickSaveButton.textContent = "Salva stati";
    quickSaveButton.disabled = true;
    quickSaveButton.title = "Salva rapidamente stato e pagamenti";
    quickSaveButton.addEventListener("click", () => salvaRiga(row, id));
    actions.appendChild(quickSaveButton);
}

function miglioraTabella() {
    document.querySelectorAll("#contractsBody tr").forEach(miglioraRiga);
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
        .quick-save-row {
            background: #111827;
            color: #fff;
            border: 0;
            border-radius: 8px;
            padding: 7px 10px;
            font-size: 11px;
            font-weight: 800;
            white-space: nowrap;
            cursor: pointer;
            opacity: .45;
        }
        .quick-save-row.has-changes {
            background: linear-gradient(135deg, #d90429, #ff7b00);
            opacity: 1;
            box-shadow: 0 5px 12px rgba(217, 4, 41, .2);
        }
        .quick-save-row:disabled { cursor: default; }
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
            .contract-quick-toast { left: 16px; right: 16px; bottom: 16px; max-width: none; }
        }
    `;
    document.head.appendChild(style);
}

function avvia() {
    aggiungiStili();
    miglioraTabella();

    const tbody = document.getElementById("contractsBody");
    if (!tbody) {
        window.setTimeout(avvia, 250);
        return;
    }

    const observer = new MutationObserver(() => miglioraTabella());
    observer.observe(tbody, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", avvia, { once: true });
} else {
    avvia();
}
