(function () {
    "use strict";

    const STATI_ECONOMICI = new Set(["inserito", "in lavorazione", "ok", "pagato"]);
    const PAGINE_SUPPORTATE = new Set(["", "index.html", "contracts.html", "kpi.html"]);
    let aggiornamentoInCorso = false;

    function testo(valore) {
        return String(valore ?? "").trim();
    }

    function numero(valore) {
        if (typeof valore === "number") {
            return Number.isFinite(valore) ? valore : 0;
        }
        const normalizzato = testo(valore).replace(/\./g, "").replace(",", ".");
        const risultato = Number.parseFloat(normalizzato);
        return Number.isFinite(risultato) ? risultato : 0;
    }

    function formatEuro(valore) {
        return numero(valore).toLocaleString("it-IT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + "€";
    }

    function statoNormalizzato(contratto) {
        return testo(contratto?.stato).toLowerCase();
    }

    function praticaEconomicamenteValida(contratto) {
        return STATI_ECONOMICI.has(statoNormalizzato(contratto));
    }

    function getContractUnits(contratto) {
        const servizio = testo(contratto?.servizio).toLowerCase().replaceAll(" ", "");
        return ["luce+gas", "luce-gas", "lucegas"].includes(servizio) ? 2 : 1;
    }

    function getContractCategory(contratto) {
        const servizio = testo(contratto?.servizio)
            .toLowerCase()
            .replaceAll(" ", "")
            .replaceAll("_", "-");
        return ["luce", "gas", "luce+gas", "luce-gas", "lucegas"].includes(servizio)
            ? "Commodity"
            : "Extra Commodity";
    }

    function leggiContratti() {
        try {
            const dati = JSON.parse(localStorage.getItem("contrattiTopHouse"));
            return Array.isArray(dati) ? dati : [];
        } catch (error) {
            return [];
        }
    }

    function paginaCorrente() {
        const path = window.location.pathname || "";
        return decodeURIComponent(path.substring(path.lastIndexOf("/") + 1));
    }

    function valoreFiltro(id) {
        return testo(document.getElementById(id)?.value);
    }

    function filtraContratti(contratti, pagina) {
        const mese = valoreFiltro("monthFilter");
        let lista = contratti.filter((contratto) => {
            if (!mese) return true;
            return testo(contratto.dataInserimento).slice(0, 7) === mese;
        });

        if (pagina !== "contracts.html") {
            return lista;
        }

        const ricerca = valoreFiltro("searchInput").toLowerCase();
        const venditore = valoreFiltro("vendorFilter");
        const partner = valoreFiltro("partnerFilter");
        const gestore = valoreFiltro("managerFilter");
        const stato = valoreFiltro("statusFilter");
        const pagamentoVenditore = valoreFiltro("paymentVendorFilter");
        const categoria = valoreFiltro("categoryFilter");

        return lista.filter((contratto) => {
            const contenuto = [
                contratto.id,
                contratto.nome,
                contratto.cognome,
                contratto.venditore,
                contratto.partner,
                contratto.gestore,
                contratto.servizio,
                contratto.stato,
                contratto.pagamentoPartner,
                contratto.pagamentoVenditore,
                contratto.note
            ].map(testo).join(" ").toLowerCase();

            return (!ricerca || contenuto.includes(ricerca)) &&
                (!venditore || testo(contratto.venditore) === venditore) &&
                (!partner || testo(contratto.partner) === partner) &&
                (!gestore || testo(contratto.gestore) === gestore) &&
                (!stato || testo(contratto.stato) === stato) &&
                (!pagamentoVenditore || testo(contratto.pagamentoVenditore) === pagamentoVenditore) &&
                (!categoria || getContractCategory(contratto) === categoria);
        });
    }

    function calcolaMetriche(lista) {
        const valide = lista.filter(praticaEconomicamenteValida);
        const fatturato = valide.reduce((totale, contratto) => totale + numero(contratto.gettonePartner), 0);
        const daIncassare = valide
            .filter((contratto) => testo(contratto.pagamentoPartner) === "Da incassare")
            .reduce((totale, contratto) => totale + numero(contratto.gettonePartner), 0);
        const daPagare = valide
            .filter((contratto) => testo(contratto.pagamentoVenditore) === "Da pagare")
            .reduce((totale, contratto) => totale + numero(contratto.gettoneVenditore), 0);
        const margine = valide.reduce(
            (totale, contratto) => totale + numero(contratto.gettonePartner) - numero(contratto.gettoneVenditore),
            0
        );
        const unitaValide = valide.reduce((totale, contratto) => totale + getContractUnits(contratto), 0);

        return {
            valide,
            unitaValide,
            fatturato,
            daIncassare,
            daPagare,
            margine,
            margineMedio: unitaValide > 0 ? margine / unitaValide : 0
        };
    }

    function impostaTesto(id, valore) {
        const elemento = document.getElementById(id);
        if (elemento && elemento.textContent !== String(valore)) {
            elemento.textContent = valore;
        }
    }

    function creaCardFatturato(container, id, href) {
        if (!container || document.getElementById(id)) return;

        const elemento = href ? document.createElement("a") : document.createElement("div");
        elemento.className = href ? "card card-link" : "card";
        if (href) elemento.href = href;
        elemento.innerHTML = `<h4>Fatturato totale</h4><p id="${id}">0,00€</p>`;
        container.insertBefore(elemento, container.firstChild);
    }

    function aggiornaDashboard(metriche) {
        const cards = document.querySelector("main .cards");
        creaCardFatturato(cards, "dashFatturatoTotale", "kpi.html");

        impostaTesto("dashFatturatoTotale", formatEuro(metriche.fatturato));
        impostaTesto("dashContrattiOk", metriche.unitaValide);
        impostaTesto("dashDaIncassare", formatEuro(metriche.daIncassare));
        impostaTesto("dashDaPagare", formatEuro(metriche.daPagare));
        impostaTesto("dashMargine", formatEuro(metriche.margine));

        const label = document.getElementById("dashContrattiOk")?.previousElementSibling;
        if (label) label.textContent = "Contratti validi";
    }

    function aggiornaContratti(metriche) {
        const cards = document.querySelector("main .cards");
        creaCardFatturato(cards, "fatturatoTotaleContratti");

        impostaTesto("fatturatoTotaleContratti", formatEuro(metriche.fatturato));
        impostaTesto("totaleOk", metriche.unitaValide);
        impostaTesto("daIncassarePartner", formatEuro(metriche.daIncassare));
        impostaTesto("totaleVenditori", formatEuro(metriche.daPagare));
        impostaTesto("margineTopHouse", formatEuro(metriche.margine));

        const label = document.getElementById("totaleOk")?.previousElementSibling;
        if (label) label.textContent = "Contratti validi";
    }

    function trovaCardPerEtichetta(etichetta) {
        return [...document.querySelectorAll("#mainKpiCards .card")]
            .find((card) => testo(card.querySelector("h4")?.textContent).toLowerCase() === etichetta.toLowerCase());
    }

    function aggiornaCardKpi(etichetta, valore, nuovaEtichetta) {
        const card = trovaCardPerEtichetta(etichetta);
        if (!card) return;
        const titolo = card.querySelector("h4");
        const valoreEl = card.querySelector("p");
        if (titolo && nuovaEtichetta) titolo.textContent = nuovaEtichetta;
        if (valoreEl) valoreEl.textContent = valore;
    }

    function aggiungiCardFatturatoKpi(metriche) {
        const container = document.getElementById("mainKpiCards");
        if (!container) return;
        let card = document.getElementById("kpiFatturatoTotaleCard");
        if (!card) {
            card = document.createElement("div");
            card.id = "kpiFatturatoTotaleCard";
            card.className = "card kpi-card";
            card.innerHTML = `<span class="kpi-corner-delta neutral">Totale</span><h4>Fatturato totale</h4><p>0,00€</p><small>Periodo selezionato</small>`;
            container.insertBefore(card, container.firstChild);
        }
        card.querySelector("p").textContent = formatEuro(metriche.fatturato);
    }

    function aggregaPerCampo(lista, campoNome, campoImporto) {
        const risultati = new Map();
        lista.filter(praticaEconomicamenteValida).forEach((contratto) => {
            const nome = testo(contratto[campoNome]) || "Non indicato";
            risultati.set(nome, (risultati.get(nome) || 0) + numero(contratto[campoImporto]));
        });
        return [...risultati.entries()]
            .map(([nome, valore]) => ({ nome, valore }))
            .sort((a, b) => b.valore - a.valore)
            .slice(0, 6);
    }

    function escapeHtml(valore) {
        return testo(valore)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function renderRevenueChart(id, dati, messaggioVuoto) {
        const container = document.getElementById(id);
        if (!container) return;
        if (!dati.length) {
            container.innerHTML = `<p class="empty-note">${messaggioVuoto}</p>`;
            return;
        }
        const massimo = Math.max(...dati.map((dato) => Math.abs(dato.valore)), 1);
        container.innerHTML = dati.map((dato) => `
            <div class="revenue-row" title="${escapeHtml(dato.nome)}: ${formatEuro(dato.valore)}">
                <span class="revenue-name">${escapeHtml(dato.nome)}</span>
                <span class="revenue-track"><span class="revenue-fill" style="width:${Math.max(4, (Math.abs(dato.valore) / massimo) * 100)}%"></span></span>
                <span class="revenue-value">${formatEuro(dato.valore)}</span>
            </div>
        `).join("");
    }

    function aggiornaKpi(lista, metriche) {
        aggiungiCardFatturatoKpi(metriche);
        aggiornaCardKpi("Contratti OK", String(metriche.unitaValide), "Contratti validi");
        aggiornaCardKpi("Margine Maturato", formatEuro(metriche.margine), "Margine totale");
        aggiornaCardKpi("Margine medio per contratto", formatEuro(metriche.margineMedio));
        aggiornaCardKpi("Da Incassare Partner", formatEuro(metriche.daIncassare));
        aggiornaCardKpi("Da Pagare Venditori", formatEuro(metriche.daPagare));

        renderRevenueChart(
            "partnerRevenueChart",
            aggregaPerCampo(lista, "partner", "gettonePartner"),
            "Nessun fatturato partner nel periodo selezionato."
        );
        renderRevenueChart(
            "vendorRevenueChart",
            aggregaPerCampo(lista, "venditore", "gettoneVenditore"),
            "Nessun fatturato venditore nel periodo selezionato."
        );
    }

    function aggiorna() {
        if (aggiornamentoInCorso) return;
        const pagina = paginaCorrente();
        if (!PAGINE_SUPPORTATE.has(pagina)) return;

        aggiornamentoInCorso = true;
        try {
            const lista = filtraContratti(leggiContratti(), pagina);
            const metriche = calcolaMetriche(lista);
            if (pagina === "" || pagina === "index.html") aggiornaDashboard(metriche);
            if (pagina === "contracts.html") aggiornaContratti(metriche);
            if (pagina === "kpi.html") aggiornaKpi(lista, metriche);
        } finally {
            aggiornamentoInCorso = false;
        }
    }

    function collegaEventi() {
        [
            "monthFilter", "searchInput", "vendorFilter", "partnerFilter", "managerFilter",
            "statusFilter", "paymentVendorFilter", "categoryFilter"
        ].forEach((id) => {
            const elemento = document.getElementById(id);
            if (!elemento || elemento.dataset.economicOverviewBound) return;
            elemento.dataset.economicOverviewBound = "true";
            elemento.addEventListener("change", () => setTimeout(aggiorna, 0));
            elemento.addEventListener("input", () => setTimeout(aggiorna, 0));
        });
    }

    function avvia() {
        collegaEventi();
        aggiorna();
        const observer = new MutationObserver(() => {
            collegaEventi();
            setTimeout(aggiorna, 0);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener("storage", aggiorna);
        setInterval(aggiorna, 1500);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", avvia, { once: true });
    } else {
        avvia();
    }
})();
