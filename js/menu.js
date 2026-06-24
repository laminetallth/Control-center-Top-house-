(function () {
    "use strict";

    const menuItems = [
        { label: "🏠 Dashboard", href: "index.html", matches: ["", "index.html"] },
        { label: "📄 Contratti", href: "contracts.html", matches: ["contracts.html"] },
        { label: "👥 Venditori", href: "vendors.html", matches: ["vendors.html", "vendor-detail.html"] },
        { label: "🤝 Partner", href: "partners.html", matches: ["partners.html", "partner-detail.html"] },
        { label: "🏪 Affiliati", href: "affiliates.html", matches: ["affiliates.html"] },
        { label: "💰 Provvigioni", href: "commissions.html", matches: ["commissions.html"] },
        { label: "📈 Investimenti", href: "investments.html", matches: ["investments.html"] },
        { label: "🏦 Cash Flow", href: "cashflow.html", matches: ["cashflow.html"] },
        { label: "📊 KPI", href: "kpi.html", matches: ["kpi.html"] },
        { label: "📑 Report", href: "reports.html", matches: ["reports.html"] },
        { label: "✅ Attività", href: "activities.html", matches: ["activities.html"] },
        { label: "📁 Documenti", href: "documents.html", matches: ["documents.html"] },
        { label: "⚙️ Impostazioni", href: "settings.html", matches: ["settings.html"] }
    ];

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

    function renderSidebar() {
        const container = document.getElementById("sidebarContainer");
        if (!container) {
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

        sidebar.appendChild(logoSection);
        sidebar.appendChild(menu);
        container.replaceWith(sidebar);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderSidebar);
    } else {
        renderSidebar();
    }
})();
