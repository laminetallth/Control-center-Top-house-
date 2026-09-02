(function () {
    "use strict";

    const TAX_CONFIG = {
        imponibile: 0.67,
        inps: 0.2607,
        tassa: 0.05
    };

    const text = (value) => String(value ?? "").trim();

    function parseEuro(value) {
        const cleaned = text(value)
            .replace(/€/g, "")
            .replace(/\s/g, "")
            .replace(/\./g, "")
            .replace(/,/g, ".");
        const number = Number.parseFloat(cleaned);
        return Number.isFinite(number) ? number : 0;
    }

    function euro(value) {
        return Number(value || 0).toLocaleString("it-IT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + "€";
    }

    function calculateFromGross(gross) {
        const base = gross * TAX_CONFIG.imponibile;
        const inps = base * TAX_CONFIG.inps;
        const residual = base - inps;
        const tax = residual * TAX_CONFIG.tassa;
        const net = gross - inps - tax;
        return { gross, base, inps, residual, tax, net };
    }

    function calculateGrossFromNet(net) {
        const factor = 1 - (TAX_CONFIG.imponibile * TAX_CONFIG.inps)
            - (TAX_CONFIG.imponibile * (1 - TAX_CONFIG.inps) * TAX_CONFIG.tassa);
        return factor > 0 ? net / factor : 0;
    }

    function selectedRows() {
        return [...document.querySelectorAll("#invoicePreviewBody tr")].filter(row => {
            const checkbox = row.querySelector(".invoice-check");
            return checkbox && checkbox.checked;
        });
    }

    function selectedContracts() {
        return selectedRows().map((row) => {
            const cells = row.querySelectorAll("td");
            return {
                numero: text(cells[1]?.textContent),
                cliente: text(cells[2]?.textContent),
                dataInserimento: text(cells[3]?.textContent),
                partner: text(cells[4]?.textContent),
                gestore: text(cells[5]?.textContent),
                servizio: text(cells[6]?.textContent),
                note: text(cells[7]?.textContent),
                stato: text(cells[8]?.textContent),
                dataEsito: text(cells[9]?.textContent),
                importo: parseEuro(cells[10]?.textContent)
            };
        });
    }

    function selectedGrossTotal() {
        return selectedContracts().reduce((sum, contract) => sum + contract.importo, 0);
    }

    function getMode() {
        return document.getElementById("invoiceAmountMode")?.value || "gross";
    }

    function installStyles() {
        if (document.getElementById("invoice-tax-style")) return;
        const style = document.createElement("style");
        style.id = "invoice-tax-style";
        style.textContent = `
            .invoice-tax-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px}
            .invoice-tax-controls label{font-weight:800;color:#081120}
            .invoice-tax-controls select{min-width:190px}
            .invoice-tax-box{margin-top:18px;border:1px solid #ffd7b3;background:#fffaf5;border-radius:16px;padding:18px}
            .invoice-tax-box h3{margin:0 0 8px;color:#081120}
            .invoice-tax-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}
            .invoice-tax-item{background:#fff;border:1px solid #eceff3;border-radius:12px;padding:12px}
            .invoice-tax-item span{display:block;font-size:12px;color:#6b7280;margin-bottom:4px}
            .invoice-tax-item strong{font-size:17px;color:#081120}
            .invoice-tax-net{border:2px solid #d90429;background:#fff}
            .invoice-tax-note{font-size:12px;color:#6b7280;margin-top:12px}
            @media (max-width: 800px){.invoice-tax-grid{grid-template-columns:1fr 1fr}}
            @media (max-width: 560px){.invoice-tax-grid{grid-template-columns:1fr}}
        `;
        document.head.appendChild(style);
    }

    function installControls() {
        const exportPdf = document.getElementById("exportPdf");
        const exportExcel = document.getElementById("exportExcel");
        if (!exportPdf || document.getElementById("invoiceTaxControls")) return;

        const wrapper = document.createElement("div");
        wrapper.id = "invoiceTaxControls";
        wrapper.className = "invoice-tax-controls";
        wrapper.innerHTML = `
            <label for="invoiceAmountMode">Modalità invito:</label>
            <select id="invoiceAmountMode" aria-label="Modalità importo invito">
                <option value="gross">Importo lordo</option>
                <option value="net">Importo al netto di INPS e tassa</option>
            </select>
            <button type="button" class="mini-btn dark" id="calculateInvoiceTax">Calcola lordo / netto</button>
        `;

        const filterArea = exportPdf.closest(".invoice-filters") || exportPdf.parentElement;
        filterArea.appendChild(wrapper);

        const box = document.createElement("div");
        box.id = "invoiceTaxBox";
        box.className = "invoice-tax-box";
        box.hidden = true;
        box.innerHTML = `
            <h3>Calcolo fiscale dell'invito</h3>
            <div id="invoiceTaxSummary"></div>
        `;
        const hero = document.querySelector(".invoice-hero");
        hero?.after(box);

        document.getElementById("calculateInvoiceTax")?.addEventListener("click", () => {
            renderTaxSummary(true);
        });

        document.getElementById("invoiceAmountMode")?.addEventListener("change", () => {
            renderTaxSummary(false);
        });
    }

    function renderTaxSummary(showAlert) {
        const contracts = selectedContracts();
        if (!contracts.length) {
            if (showAlert) alert("Seleziona almeno un contratto da includere nell'invito a fatturare.");
            return null;
        }

        const gross = selectedGrossTotal();
        const calculation = calculateFromGross(gross);
        const mode = getMode();
        const box = document.getElementById("invoiceTaxBox");
        const summary = document.getElementById("invoiceTaxSummary");
        if (!box || !summary) return calculation;

        const amountLabel = mode === "net" ? "Importo netto da indicare" : "Importo lordo da indicare";
        const amountValue = mode === "net" ? calculation.net : calculation.gross;
        box.hidden = false;
        summary.innerHTML = `
            <div class="invoice-tax-grid">
                <div class="invoice-tax-item"><span>Importo lordo</span><strong>${euro(calculation.gross)}</strong></div>
                <div class="invoice-tax-item"><span>Base imponibile (67%)</span><strong>${euro(calculation.base)}</strong></div>
                <div class="invoice-tax-item"><span>INPS (26,07% sulla base)</span><strong>-${euro(calculation.inps)}</strong></div>
                <div class="invoice-tax-item"><span>Base residua</span><strong>${euro(calculation.residual)}</strong></div>
                <div class="invoice-tax-item"><span>Tassa (5% sulla base residua)</span><strong>-${euro(calculation.tax)}</strong></div>
                <div class="invoice-tax-item invoice-tax-net"><span>${amountLabel}</span><strong>${euro(amountValue)}</strong></div>
            </div>
            <p class="invoice-tax-note">Parametri configurati nel gestionale: base imponibile 67%, INPS 26,07%, tassa 5%. Calcolo simulativo secondo questi parametri.</p>
        `;
        return calculation;
    }

    function buildPdf() {
        const contracts = selectedContracts();
        if (!contracts.length || !window.jspdf) return;

        const mode = getMode();
        const gross = selectedGrossTotal();
        const calculation = calculateFromGross(gross);
        const amount = mode === "net" ? calculation.net : calculation.gross;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const vendor = text(document.getElementById("vendorFilter")?.value) || "Venditore";
        const period = text(document.getElementById("selectedPeriodLabel")?.textContent) || "Tutte le mensilità";

        doc.setTextColor(217, 4, 41);
        doc.setFontSize(20);
        doc.text("TOP HOUSE S.R.L.S.", 14, 15);
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(9);
        doc.text("Viale Lombardia 30, Busto Arsizio · P.IVA 03949040129 · informazioni.th@gmail.com", 14, 21);
        doc.setTextColor(217, 4, 41);
        doc.setFontSize(17);
        doc.text("INVITO A FATTURARE", 14, 31);
        doc.setTextColor(20, 20, 20);
        doc.setFontSize(10);
        doc.text(`Venditore: ${vendor}`, 14, 38);
        doc.text(`Periodo: ${period}`, 14, 44);
        doc.text(`Contratti inclusi: ${contracts.length}`, 14, 50);
        doc.text(`Modalità: ${mode === "net" ? "AL NETTO" : "AL LORDO"}`, 14, 56);

        const body = contracts.map(c => [
            c.numero,
            c.cliente,
            c.dataInserimento,
            c.partner,
            c.gestore,
            c.servizio,
            c.stato,
            c.dataEsito,
            euro(c.importo)
        ]);

        if (typeof doc.autoTable === "function") {
            doc.autoTable({
                startY: 62,
                head: [["N.", "Cliente", "Data", "Partner", "Gestore", "Servizio", "Stato", "Esito", "Lordo"]],
                body,
                styles: { fontSize: 7.5, cellPadding: 2 },
                headStyles: { fillColor: [217, 4, 41], textColor: 255 },
                alternateRowStyles: { fillColor: [255, 248, 240] },
                margin: { left: 10, right: 10 }
            });
        }

        let y = (doc.lastAutoTable?.finalY || 62) + 8;
        doc.setFillColor(255, 242, 230);
        doc.roundedRect(10, y, 277, mode === "net" ? 48 : 22, 4, 4, "F");
        doc.setTextColor(8, 17, 32);
        doc.setFontSize(10);
        doc.text("RIEPILOGO IMPORTI", 15, y + 7);
        doc.setFontSize(9);
        doc.text(`Importo lordo: ${euro(calculation.gross)}`, 15, y + 14);

        if (mode === "net") {
            doc.text(`Base imponibile 67%: ${euro(calculation.base)}`, 15, y + 21);
            doc.text(`INPS 26,07% sulla base: -${euro(calculation.inps)}`, 15, y + 28);
            doc.text(`Base residua: ${euro(calculation.residual)}`, 105, y + 21);
            doc.text(`Tassa 5% sulla base residua: -${euro(calculation.tax)}`, 105, y + 28);
            doc.setTextColor(217, 4, 41);
            doc.setFontSize(12);
            doc.text(`IMPORTO NETTO: ${euro(calculation.net)}`, 15, y + 39);
        } else {
            doc.setTextColor(217, 4, 41);
            doc.setFontSize(12);
            doc.text(`IMPORTO DA FATTURARE: ${euro(calculation.gross)}`, 15, y + 17);
        }

        doc.setTextColor(90, 90, 90);
        doc.setFontSize(7.5);
        const noteY = y + (mode === "net" ? 53 : 27);
        doc.text("Calcolo simulativo secondo i parametri configurati nel gestionale: base 67%, INPS 26,07%, tassa 5%.", 10, noteY);
        doc.text("TOP HOUSE S.R.L.S. · Firma e timbro", 10, noteY + 7);
        doc.save(`Invito_fatturare_${vendor.replace(/[^a-z0-9]+/gi, "_")}_${mode === "net" ? "netto" : "lordo"}.pdf`);
    }

    function buildExcel() {
        const contracts = selectedContracts();
        if (!contracts.length || !window.XLSX) return;
        const mode = getMode();
        const gross = selectedGrossTotal();
        const calculation = calculateFromGross(gross);
        const amount = mode === "net" ? calculation.net : calculation.gross;
        const rows = [
            ["TOP HOUSE S.R.L.S."],
            ["INVITO A FATTURARE"],
            [`Venditore: ${text(document.getElementById("vendorFilter")?.value)}`],
            [`Periodo: ${text(document.getElementById("selectedPeriodLabel")?.textContent)}`],
            [`Modalità: ${mode === "net" ? "AL NETTO" : "AL LORDO"}`],
            [],
            ["N.", "Cliente", "Data", "Partner", "Gestore", "Servizio", "Stato", "Esito", "Lordo"],
            ...contracts.map(c => [c.numero, c.cliente, c.dataInserimento, c.partner, c.gestore, c.servizio, c.stato, c.dataEsito, euro(c.importo)]),
            [],
            ["Importo lordo", euro(calculation.gross)],
            ["Base imponibile 67%", euro(calculation.base)],
            ["INPS 26,07%", `-${euro(calculation.inps)}`],
            ["Base residua", euro(calculation.residual)],
            ["Tassa 5%", `-${euro(calculation.tax)}`],
            [mode === "net" ? "IMPORTO NETTO" : "IMPORTO DA FATTURARE", euro(amount)]
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [{ wch: 8 }, { wch: 30 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Invito a fatturare");
        XLSX.writeFile(wb, `Invito_fatturare_${mode === "net" ? "netto" : "lordo"}.xlsx`);
    }

    function interceptButton(button, handler) {
        if (!button || button.dataset.invoiceTaxIntercepted === "1") return;
        button.dataset.invoiceTaxIntercepted = "1";
        button.addEventListener("click", (event) => {
            const contracts = selectedContracts();
            if (!contracts.length) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            renderTaxSummary(false);
            handler();
        }, true);
    }

    function init() {
        installStyles();
        installControls();
        interceptButton(document.getElementById("exportPdf"), buildPdf);
        interceptButton(document.getElementById("exportExcel"), buildExcel);
        document.getElementById("vendorFilter")?.addEventListener("change", () => setTimeout(() => renderTaxSummary(false), 50));
        document.getElementById("monthFilter")?.addEventListener("change", () => setTimeout(() => renderTaxSummary(false), 50));
        document.getElementById("dateFrom")?.addEventListener("change", () => setTimeout(() => renderTaxSummary(false), 50));
        document.getElementById("dateTo")?.addEventListener("change", () => setTimeout(() => renderTaxSummary(false), 50));
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();

    setTimeout(init, 700);
    setTimeout(init, 1600);
})();
