(function () {
    "use strict";

    const CONFIG = { base: 0.67, inps: 0.2607, tax: 0.05 };
    const text = (v) => String(v ?? "").trim();
    const num = (v) => {
        if (typeof v === "number") return Number.isFinite(v) ? v : 0;
        const n = Number.parseFloat(text(v).replace(/€/g, "").replace(/\s/g, "").replace(/\./g, "").replace(/,/g, "."));
        return Number.isFinite(n) ? n : 0;
    };
    const euro = (v) => num(v).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "€";

    function isLuceGas(service) {
        const value = text(service).toLowerCase().replace(/\s+/g, " ");
        return value === "luce + gas" || value === "luce+gas" || value.includes("luce + gas");
    }

    function contractCount(contracts) {
        return contracts.reduce((sum, c) => sum + (isLuceGas(c.servizio) ? 2 : 1), 0);
    }

    function calculate(gross) {
        const base = gross * CONFIG.base;
        const inps = base * CONFIG.inps;
        const residual = base - inps;
        const tax = residual * CONFIG.tax;
        return { gross, base, inps, residual, tax, net: gross - inps - tax };
    }

    function selectedContracts() {
        return [...document.querySelectorAll("#invoicePreviewBody tr")].map((row) => {
            const cells = row.querySelectorAll("td");
            const checkbox = row.querySelector(".invoice-check");
            if (!checkbox || !checkbox.checked) return null;
            return {
                numero: text(cells[1]?.textContent),
                cliente: text(cells[2]?.textContent),
                data: text(cells[3]?.textContent),
                partner: text(cells[4]?.textContent),
                gestore: text(cells[5]?.textContent),
                servizio: text(cells[6]?.textContent),
                stato: text(cells[8]?.textContent),
                esito: text(cells[9]?.textContent),
                importo: num(cells[10]?.textContent)
            };
        }).filter(Boolean);
    }

    function mode() {
        return document.getElementById("invoiceAmountMode")?.value || "gross";
    }

    function weightedCountFromRows() {
        return contractCount(selectedContracts());
    }

    function updateContractCount() {
        const count = document.getElementById("totalContracts");
        const selected = selectedContracts();
        const totalRows = [...document.querySelectorAll("#invoicePreviewBody tr .invoice-check")].length;
        const allContracts = [...document.querySelectorAll("#invoicePreviewBody tr")].map((row) => {
            const cells = row.querySelectorAll("td");
            return { servizio: text(cells[6]?.textContent) };
        }).filter(c => c.servizio);
        if (count) count.textContent = `${weightedCountFromRows()}/${contractCount(allContracts)}`;
        const taxBox = document.getElementById("invoiceTaxBox");
        if (taxBox && !taxBox.hidden) {
            const title = taxBox.querySelector("h3");
            if (title) title.textContent = "Calcolo fiscale dell'invito";
        }
        return totalRows;
    }

    function exportPdfFixed(event) {
        const contracts = selectedContracts();
        if (!contracts.length || !window.jspdf) return;
        event.preventDefault();
        event.stopImmediatePropagation();

        const calculation = calculate(contracts.reduce((sum, c) => sum + c.importo, 0));
        const currentMode = mode();
        const amount = currentMode === "net" ? calculation.net : calculation.gross;
        const vendor = text(document.getElementById("vendorFilter")?.value) || "Venditore";
        const period = text(document.getElementById("selectedPeriodLabel")?.textContent) || "Tutte le mensilità";
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const countedContracts = contractCount(contracts);

        doc.setTextColor(217, 4, 41); doc.setFontSize(20); doc.text("TOP HOUSE S.R.L.S.", 14, 15);
        doc.setTextColor(50, 50, 50); doc.setFontSize(9); doc.text("Viale Lombardia 30, Busto Arsizio · P.IVA 03949040129 · informazioni.th@gmail.com", 14, 21);
        doc.setTextColor(217, 4, 41); doc.setFontSize(17); doc.text("INVITO A FATTURARE", 14, 31);
        doc.setTextColor(20, 20, 20); doc.setFontSize(10);
        doc.text(`Venditore: ${vendor}`, 14, 38);
        doc.text(`Periodo: ${period}`, 14, 44);
        doc.text(`Contratti inclusi: ${countedContracts}`, 14, 50);
        doc.text(`Righe contratto: ${contracts.length}`, 14, 55);
        doc.text(`Modalità: ${currentMode === "net" ? "AL NETTO" : "AL LORDO"}`, 14, 60);

        const body = contracts.map(c => [c.numero, c.cliente, c.data, c.partner, c.gestore, c.servizio, c.stato, c.esito, euro(c.importo)]);
        if (typeof doc.autoTable === "function") {
            doc.autoTable({
                startY: 66, head: [["N.", "Cliente", "Data", "Partner", "Gestore", "Servizio", "Stato", "Esito", "Lordo"]], body,
                styles: { fontSize: 7.5, cellPadding: 2 }, headStyles: { fillColor: [217, 4, 41], textColor: 255 }, alternateRowStyles: { fillColor: [255, 248, 240] }, margin: { left: 10, right: 10 }
            });
        }

        let y = (doc.lastAutoTable?.finalY || 66) + 8;
        if (y > 175) { doc.addPage(); y = 18; }
        const boxHeight = currentMode === "net" ? 57 : 30;
        doc.setFillColor(255, 242, 230); doc.roundedRect(10, y, 277, boxHeight, 4, 4, "F");
        doc.setTextColor(8, 17, 32); doc.setFontSize(10); doc.text("RIEPILOGO IMPORTI", 15, y + 7);
        doc.setFontSize(9); doc.text(`Importo lordo: ${euro(calculation.gross)}`, 15, y + 15);
        if (currentMode === "net") {
            doc.text(`Base imponibile 67%: ${euro(calculation.base)}`, 15, y + 23);
            doc.text(`INPS 26,07% sulla base: -${euro(calculation.inps)}`, 15, y + 31);
            doc.text(`Base residua: ${euro(calculation.residual)}`, 105, y + 23);
            doc.text(`Tassa 5% sulla base residua: -${euro(calculation.tax)}`, 105, y + 31);
            doc.setTextColor(217, 4, 41); doc.setFontSize(12); doc.text(`IMPORTO NETTO: ${euro(calculation.net)}`, 15, y + 43);
            doc.setTextColor(90, 90, 90); doc.setFontSize(7.5); doc.text("Formula: lordo − INPS − tassa. Base imponibile 67%; INPS 26,07%; tassa 5%.", 15, y + 51);
        } else {
            doc.setTextColor(217, 4, 41); doc.setFontSize(12); doc.text(`IMPORTO DA FATTURARE: ${euro(amount)}`, 15, y + 22);
        }

        const noteY = y + boxHeight + 7;
        if (noteY > 195) { doc.addPage(); }
        const footerY = noteY > 195 ? 18 : noteY;
        doc.setTextColor(90, 90, 90); doc.setFontSize(7.5);
        doc.text("Calcolo simulativo secondo i parametri configurati nel gestionale: base 67%, INPS 26,07%, tassa 5%.", 10, footerY);
        doc.text("TOP HOUSE S.R.L.S. · Firma e timbro", 10, footerY + 7);
        doc.save(`Invito_fatturare_${vendor.replace(/[^a-z0-9]+/gi, "_")}_${currentMode === "net" ? "netto" : "lordo"}.pdf`);
    }

    function init() {
        const pdfButton = document.getElementById("exportPdf");
        if (pdfButton && pdfButton.dataset.invoicePdfTaxFix !== "1") {
            pdfButton.dataset.invoicePdfTaxFix = "1";
            pdfButton.addEventListener("click", exportPdfFixed, true);
        }
        const body = document.getElementById("invoicePreviewBody");
        if (body) {
            const observer = new MutationObserver(() => setTimeout(updateContractCount, 0));
            observer.observe(body, { childList: true, subtree: true });
        }
        document.addEventListener("change", (event) => {
            if (event.target.matches(".invoice-check")) setTimeout(updateContractCount, 0);
        });
        setTimeout(updateContractCount, 250);
        setTimeout(updateContractCount, 1000);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
