(function () {
    "use strict";

    const menuItems = [
        { label: "🏠 Dashboard", href: "index.html", matches: ["", "index.html"] },
        { label: "📄 Contratti", href: "contracts.html", matches: ["contracts.html"] },
        { label: "👥 Venditori", href: "vendors.html", matches: ["vendors.html", "vendor-detail.html"] },
        { label: "🤝 Partner", href: "partners.html", matches: ["partners.html", "partner-detail.html"] },
        { label: "🏪 Affiliati", href: "affiliates.html", matches: ["affiliates.html"] },
        { label: "💰 Provvigioni", href: "commissions.html", matches: ["commissions.html"] },
        { label: "🧾 Inviti a fatturare", href: "invoice-invitations.html", matches: ["invoice-invitations.html"] },
        { label: "📈 Investimenti", href: "investments.html", matches: ["investments.html"] },
        { label: "🏦 Cash Flow", href: "cashflow.html", matches: ["cashflow.html"] },
        { label: "📊 KPI", href: "kpi.html", matches: ["kpi.html"] },
        { label: "📑 Report", href: "reports.html", matches: ["reports.html"] },
        { label: "✅ Attività", href: "activities.html", matches: ["activities.html"] },
        { label: "📁 Documenti", href: "documents.html", matches: ["documents.html"] },
        { label: "⚙️ Impostazioni", href: "settings.html", matches: ["settings.html"] }
    ];

    const NOMI_MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

    // Mesi da gennaio 2026 fino a dicembre dell'anno in corso (da novembre si aggiunge anche l'anno successivo).
    function elencoMesi() {
        const oggi = new Date();
        const ultimoAnno = oggi.getMonth() >= 10 ? oggi.getFullYear() + 1 : oggi.getFullYear();
        const mesi = [];
        for (let anno = 2026; anno <= Math.max(2026, ultimoAnno); anno += 1) {
            NOMI_MESI.forEach((nome, indice) => {
                mesi.push([`${anno}-${String(indice + 1).padStart(2, "0")}`, `${nome} ${anno}`]);
            });
        }
        return mesi;
    }
    window.TopHouseMesi = elencoMesi;

    function aggiornaFiltroMesi() {
        const select = document.getElementById("monthFilter");
        if (!select || !select.querySelector('option[value="2026-01"]')) return;
        const selezionato = select.value;
        const primaVoce = select.querySelector('option[value=""]');
        const etichetta = primaVoce ? primaVoce.textContent : "Tutte le mensilità";
        select.innerHTML = "";
        select.appendChild(new Option(etichetta, ""));
        elencoMesi().forEach(([valore, testo]) => select.appendChild(new Option(testo, valore)));
        select.value = selezionato;
    }

    function getCurrentPage() {
        const path = window.location.pathname || "";
        return decodeURIComponent(path.substring(path.lastIndexOf("/") + 1));
    }

    function createMenuItem(item, currentPage) {
        const li = document.createElement("li");
        if (item.matches.includes(currentPage)) {
            li.className = "active";
        }

        const link = document.createElement("a");
        link.href = item.href;
        link.textContent = item.label;
        li.appendChild(link);

        return li;
    }

    function loadEconomicOverview() {
        const currentPage = getCurrentPage();
        if (!["", "index.html", "contracts.html", "kpi.html"].includes(currentPage)) {
            return;
        }
        if (document.querySelector('script[data-economic-overview="true"]')) {
            return;
        }
        const script = document.createElement("script");
        script.src = "js/economic-overview.js?v=3600";
        script.defer = true;
        script.dataset.economicOverview = "true";
        document.head.appendChild(script);
    }

    function loadContractQuickUpdate() {
        if (getCurrentPage() !== "contracts.html") {
            return;
        }
        if (document.querySelector('script[data-contract-quick-update="true"]')) {
            return;
        }
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/contract-quick-update.js?v=3600";
        script.dataset.contractQuickUpdate = "true";
        document.head.appendChild(script);
    }

    function loadPageEnhancements() {
        loadEconomicOverview();
        loadContractQuickUpdate();
    }

    function renderSidebar() {
        aggiornaFiltroMesi();
        const container = document.getElementById("sidebarContainer");
        if (!container) {
            loadPageEnhancements();
            return;
        }

        const currentPage = getCurrentPage();
        const sidebar = document.createElement("aside");
        sidebar.className = "sidebar";

        const logoSection = document.createElement("div");
        logoSection.className = "logo-section";
        logoSection.innerHTML = `
            <div class="logo-mark">
                <img src="assets/logo-casa.png" alt="Top House Logo">
            </div>
            <h2>TOP HOUSE</h2>
            <p>GESTIONALE</p>
        `;

        const menu = document.createElement("ul");
        menu.className = "menu";
        menuItems.forEach((item) => menu.appendChild(createMenuItem(item, currentPage)));

        const authBox = document.createElement("div");
        authBox.className = "sidebar-auth";
        authBox.innerHTML = `
            <small>Accesso Firebase</small>
            <strong id="userEmail">${window.topHouseCurrentUser?.email || "Utente autenticato"}</strong>
            <button type="button" id="logoutButton">Esci</button>
        `;

        sidebar.appendChild(logoSection);
        sidebar.appendChild(menu);
        sidebar.appendChild(authBox);
        container.replaceWith(sidebar);

        const logoutButton = document.getElementById("logoutButton");
        if (logoutButton) {
            logoutButton.addEventListener("click", async () => {
                const { auth, signOut } = await import("./firebase-config.js");
                await signOut(auth);
                // Rimuove la copia locale dei dati: su un computer condiviso non resta nulla dopo l'uscita.
                Object.keys(localStorage)
                    .filter((chiave) => !chiave.includes("_archivio_") && /TopHouse|^vendorProfiles$|^contracts$|^affiliates$|^activities$|^documents$|^investments$/.test(chiave))
                    .forEach((chiave) => localStorage.removeItem(chiave));
                window.location.href = "login.html";
            });
        }

        window.addEventListener("topHouseAuthReady", (event) => {
            const email = event.detail?.user?.email;
            const userEmailSlot = document.getElementById("userEmail");
            if (email && userEmailSlot) {
                userEmailSlot.textContent = email;
            }
        });

        loadPageEnhancements();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderSidebar);
    } else {
        renderSidebar();
    }
})();
