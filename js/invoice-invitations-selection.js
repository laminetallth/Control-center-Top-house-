(function () {
    "use strict";

    const STORAGE_KEY = "contrattiTopHouse";
    const SELECTED_KEY = "invoiceInvitationSelectedTopHouse";
    let selectedIds = new Set();
    let lastSignature = "";

    const text = (v) => String(v ?? "").trim();
    const num = (v) => {
        if (typeof v === "number") return Number.isFinite(v) ? v : 0;
        const n = Number.parseFloat(text(v).replace(/\./g, "").replace(",", "."));
        return Number.isFinite(n) ? n : 0;
    };
    const euro = (v) => num(v).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "€";
    const signed = (contratto, campo) => (text(contratto.stato).toLowerCase() === "storno" ? -1 : 1) * num(contratto[campo]);
    const esc = (v) => text(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

    function readContracts() {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(data) ? data : [];
        } catch (_) { return []; }
    }

    function loadSelection() {
        try {
            const data = JSON.parse(localStorage.getItem(SELECTED_KEY));
            if (Array.isArray(data)) selectedIds = new Set(data.map(String));
        } catch (_) {}
    }

    function saveSelection() {
        localStorage.setItem(SELECTED_KEY, JSON.stringify([...selectedIds]));
    }

    function dateIt(value) {
        const [y, m, d] = text(value).split("-");
        return y && m && d ? `${d}/${m}/${y}` : (text(value) || "-");
    }

    function periodContracts() {
        const vendor = text(document.getElementById("vendorFilter")?.value);
        const month = text(document.getElementById("monthFilter")?.value);
        const from = text(document.getElementById("dateFrom")?.value);
        const to = text(document.getElementById("dateTo")?.value);
        if (!vendor) return [];
        const start = from || (month ? `${month}-01` : "");
        let end = to;
        if (!end && month) {
            const [y, m] = month.split("-").map(Number);
            end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
        }
        return readContracts().filter((c, i) => {
            const date = text(c.dataInserimento);
            return text(c.venditore) === vendor && (!start || date >= start) && (!end || date <= end);
        }).map((c, i) => ({ ...c, __invoiceId: text(c.id) || `${text(c.dataInserimento)}-${text(c.nome)}-${text(c.cognome)}-${i}` }))
          .sort((a, b) => text(a.dataInserimento).localeCompare(text(b.dataInserimento)) || text(a.cognome).localeCompare(text(b.cognome)));
    }

    function selectedList() {
        return periodContracts().filter(c => selectedIds.has(String(c.__invoiceId)));
    }

    function total(lista) {
        return lista.reduce((sum, c) => sum + signed(c, "gettoneVenditore"), 0);
    }

    function installStyles() {
        if (document.getElementById("invoice-selection-style")) return;
        const style = document.createElement("style");
        style.id = "invoice-selection-style";
        style.textContent = `
            .invoice-selection-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 14px}
            .invoice-selection-tools .mini-btn{cursor:pointer}
            .invoice-selection-count{font-weight:800;color:#111827;margin-left:auto}
            .invoice-check-cell{width:44px;text-align:center}
            .invoice-check{width:18px;height:18px;cursor:pointer;accent-color:#d90429}
            .invoice-storno-amount{color:#d90429!important;font-weight:800}
            .invoice-storno-row{background:#fff3f3!important}
            .invoice-storno-badge{background:#fee2e2!important;color:#b91c1c!important}
            .invoice-selected-row{outline:2px solid rgba(217,4,41,.12);outline-offset:-2px}
            .invoice-selection-empty{padding:30px;text-align:center;color:#6b7280;font-weight:700}
        `;
        document.head.appendChild(style);
    }

    function ensureTools() {
        const table = document.querySelector(".invoice-preview-table");
        if (!table || document.getElementById("invoiceSelectionTools")) return;
        const section = table.closest(".box") || table.parentElement;
        const tools = document.createElement("div");
        tools.id = "invoiceSelectionTools";
        tools.className = "invoice-selection-tools";
        tools.innerHTML = `
            <button type="button" class="mini-btn dark" id="invoiceSelectAll">Seleziona tutti</button>
            <button type="button" class="mini-btn dark" id="invoiceDeselectAll">Deseleziona tutti</button>
            <button type="button" class="mini-btn" id="invoiceSaveSelection">Salva selezione</button>
            <span class="invoice-selection-count" id="invoiceSelectionCount">0 selezionati</span>
        `;
        section.querySelector(".section-title")?.after(tools);
        document.getElementById("invoiceSelectAll")?.addEventListener("click", () => {
            periodContracts().forEach(c => selectedIds.add(String(c.__invoiceId)));
            saveSelection(); render();
        });
        document.getElementById("invoiceDeselectAll")?.addEventListener("click", () => {
            periodContracts().forEach(c => selectedIds.delete(String(c.__invoiceId)));
            saveSelection(); render();
        });
        document.getElementById("invoiceSaveSelection")?.addEventListener("click", () => {
            saveSelection();
            const button = document.getElementById("invoiceSaveSelection");
            if (button) { const old = button.textContent; button.textContent = "✓ Selezione salvata"; setTimeout(() => button.textContent = old, 1200); }
        });
    }

    function updateSummary(lista) {
        const chosen = lista.filter(c => selectedIds.has(String(c.__invoiceId)));
        const amount = total(chosen);
        const count = document.getElementById("totalContracts");
        const amountEl = document.getElementById("totalAmount");
        const tableAmount = document.getElementById("tableTotalAmount");
        if (count) count.textContent = `${chosen.length}/${lista.length}`;
        if (amountEl) amountEl.textContent = euro(amount);
        if (tableAmount) tableAmount.textContent = euro(amount);
        const countEl = document.getElementById("invoiceSelectionCount");
        if (countEl) countEl.textContent = `${chosen.length} selezionati · Totale ${euro(amount)}`;
    }

    function render() {
        installStyles();
        ensureTools();
        const body = document.getElementById("invoicePreviewBody");
        if (!body) return;
        const lista = periodContracts();
        const signature = JSON.stringify([document.getElementById("vendorFilter")?.value, document.getElementById("monthFilter")?.value, document.getElementById("dateFrom")?.value, document.getElementById("dateTo")?.value, lista.map(c => [c.__invoiceId, c.stato, c.gettoneVenditore])]);
        if (signature === lastSignature && body.dataset.invoiceSelectionRendered === "1") { updateSummary(lista); return; }
        lastSignature = signature;
        body.dataset.invoiceSelectionRendered = "1";
        if (!lista.length) {
            body.innerHTML = `<tr><td colspan="11" class="invoice-selection-empty">Nessun contratto presente per il venditore e periodo selezionati.</td></tr>`;
            updateSummary(lista); return;
        }
        body.innerHTML = "";
        lista.forEach((c, index) => {
            const checked = selectedIds.has(String(c.__invoiceId));
            const storno = text(c.stato).toLowerCase() === "storno";
            const row = document.createElement("tr");
            row.className = `${checked ? "invoice-selected-row " : ""}${storno ? "invoice-storno-row" : ""}`;
            row.innerHTML = `
                <td class="invoice-check-cell"><input class="invoice-check" type="checkbox" ${checked ? "checked" : ""} aria-label="Includi contratto ${index + 1}"></td>
                <td>${index + 1}</td>
                <td>${esc(`${text(c.nome)} ${text(c.cognome)}`)}</td>
                <td>${esc(dateIt(c.dataInserimento))}</td>
                <td>${esc(c.partner)}</td>
                <td>${esc(c.gestore)}</td>
                <td>${esc(c.servizio)}</td>
                <td>${esc(c.note)}</td>
                <td><span class="badge ${storno ? "invoice-storno-badge" : text(c.stato).toLowerCase() === "pagato" ? "paid" : "ok"}">${esc(c.stato || "-")}</span></td>
                <td>${esc(dateIt(c.dataEsito))}</td>
                <td class="${storno ? "invoice-storno-amount" : ""}">${euro(signed(c, "gettoneVenditore"))}</td>
            `;
            row.querySelector(".invoice-check").addEventListener("change", (event) => {
                if (event.target.checked) selectedIds.add(String(c.__invoiceId));
                else selectedIds.delete(String(c.__invoiceId));
                saveSelection();
                row.classList.toggle("invoice-selected-row", event.target.checked);
                updateSummary(lista);
            });
            body.appendChild(row);
        });
        updateSummary(lista);
    }

    function exportData(lista) {
        const chosen = lista.filter(c => selectedIds.has(String(c.__invoiceId)));
        return { chosen, amount: total(chosen) };
    }

    function assertChosen(chosen) {
        if (!text(document.getElementById("vendorFilter")?.value)) { alert("Seleziona un venditore prima di esportare."); return false; }
        if (!chosen.length) { alert("Seleziona almeno un contratto da includere nell'invito a fatturare."); return false; }
        return true;
    }

    function periodLabel() {
        const month = document.getElementById("monthFilter");
        const from = text(document.getElementById("dateFrom")?.value);
        const to = text(document.getElementById("dateTo")?.value);
        if (from || to) return `${dateIt(from)} - ${dateIt(to)}`;
        return month?.value ? month.options[month.selectedIndex].text : "Tutte le mensilità";
    }

    function filePeriod() { return periodLabel().replaceAll(" ", "_").replaceAll("/", "-"); }
    function vendorName() { return text(document.getElementById("vendorFilter")?.value) || "Venditore"; }
    function fileName(ext) { return `Invito_fatturare_${vendorName().replace(/[^a-z0-9]+/gi, "_")}_${filePeriod()}.${ext}`; }

    function rowsForExport(chosen) {
        return chosen.map((c, i) => [i + 1, `${text(c.nome)} ${text(c.cognome)}`.trim(), dateIt(c.dataInserimento), text(c.partner), text(c.gestore), text(c.servizio), text(c.note), text(c.stato), dateIt(c.dataEsito), euro(signed(c, "gettoneVenditore"))]);
    }

    function exportExcel() {
        const { chosen, amount } = exportData(periodContracts());
        if (!assertChosen(chosen) || !window.XLSX) return;
        const rows = [["TOP HOUSE S.R.L.S."], ["Viale Lombardia 30, Busto Arsizio"], ["P.IVA 03949040129 · informazioni.th@gmail.com"], [], ["INVITO A FATTURARE"], [`Riepilogo contratti del venditore: ${vendorName()}`], [`Periodo: ${periodLabel()}`], [`Contratti inclusi: ${chosen.length}`], [`Totale da fatturare: ${euro(amount)}`], [], ["N.", "Nome e Cognome Cliente", "Data Inserimento", "Partner", "Gestore", "Servizio", "Note", "Stato", "Data Esito", "Importo da fatturare"], ...rowsForExport(chosen), [], ["", "", "", "", "", "", "", "", "Totale finale", euro(amount)], [], ["Grazie per la collaborazione"], ["TOP HOUSE S.R.L.S."], ["Firma e timbro"]];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [{wch:6},{wch:30},{wch:16},{wch:20},{wch:20},{wch:18},{wch:40},{wch:14},{wch:14},{wch:22}];
        ws["!merges"] = [{s:{r:0,c:0},e:{r:0,c:9}},{s:{r:1,c:0},e:{r:1,c:9}},{s:{r:2,c:0},e:{r:2,c:9}},{s:{r:4,c:0},e:{r:4,c:9}},{s:{r:5,c:0},e:{r:5,c:9}}];
        const head = {font:{bold:true,color:{rgb:"FFFFFF"}},fill:{fgColor:{rgb:"D90429"}},alignment:{horizontal:"center"}};
        const title = {font:{bold:true,sz:22,color:{rgb:"D90429"}},fill:{fgColor:{rgb:"FFF2E6"}},alignment:{horizontal:"center"}};
        const brand = {font:{bold:true,sz:22,color:{rgb:"FFFFFF"}},fill:{fgColor:{rgb:"081120"}},alignment:{horizontal:"center"}};
        [0,1,2].forEach(r => { const cell = XLSX.utils.encode_cell({r,c:0}); ws[cell].s = r===0 ? brand : {font:{bold:true,color:{rgb:"D90429"}},alignment:{horizontal:"center"}}; });
        ws["A4"].s = title; ws["A5"].s = {font:{bold:true,sz:13},alignment:{horizontal:"center"}};
        for(let c=0;c<10;c++){ ws[XLSX.utils.encode_cell({r:10,c})].s=head; }
        const first=11;
        chosen.forEach((c,i)=>{ for(let col=0;col<10;col++){ const cell=XLSX.utils.encode_cell({r:first+i,c:col}); ws[cell].s={fill:{fgColor:{rgb:i%2?"FFFFFF":"FFF8F0"}}}; } if(text(c.stato).toLowerCase()==="storno"){ const cell=XLSX.utils.encode_cell({r:first+i,c:9}); ws[cell].s={font:{bold:true,color:{rgb:"D90429"}},fill:{fgColor:{rgb:"FEE2E2"}}}; }});
        const totalRow=first+chosen.length+1; ws[XLSX.utils.encode_cell({r:totalRow,c:8})].s={font:{bold:true,color:{rgb:"FFFFFF"}},fill:{fgColor:{rgb:"FF7B00"}}}; ws[XLSX.utils.encode_cell({r:totalRow,c:9})].s={font:{bold:true,color:{rgb:"FFFFFF"}},fill:{fgColor:{rgb:"FF7B00"}}};
        XLSX.writeFile(XLSX.utils.book_new(), fileName("xlsx"));
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Invito a fatturare"); XLSX.writeFile(wb, fileName("xlsx"));
    }

    function exportPdf() {
        const { chosen, amount } = exportData(periodContracts());
        if (!assertChosen(chosen) || !window.jspdf) return;
        const { jsPDF } = window.jspdf; const doc = new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
        doc.setFontSize(20); doc.setTextColor(217,4,41); doc.text("TOP HOUSE S.R.L.S.", 14, 16);
        doc.setFontSize(9); doc.setTextColor(60,60,60); doc.text("Viale Lombardia 30, Busto Arsizio · P.IVA 03949040129 · informazioni.th@gmail.com", 14, 22);
        doc.setFontSize(16); doc.setTextColor(217,4,41); doc.text("INVITO A FATTURARE", 14, 32);
        doc.setFontSize(10); doc.setTextColor(30,30,30); doc.text(`Venditore: ${vendorName()}`, 14, 39); doc.text(`Periodo: ${periodLabel()}`, 14, 45); doc.text(`Contratti inclusi: ${chosen.length} · Totale: ${euro(amount)}`, 14, 51);
        const body = rowsForExport(chosen);
        if (typeof doc.autoTable === "function") {
            doc.autoTable({startY:56,head:[["N.","Cliente","Data","Partner","Gestore","Servizio","Note","Stato","Data Esito","Importo"]],body,styles:{fontSize:7,cellPadding:2},headStyles:{fillColor:[217,4,41],textColor:255},didParseCell:data=>{if(data.section==="body" && String(data.row.raw?.[7]).toLowerCase()==="storno") data.cell.styles.textColor=[185,28,28];}});
            const y = (doc.lastAutoTable?.finalY || 56) + 10; doc.setFontSize(11); doc.setTextColor(217,4,41); doc.text(`TOTALE DA FATTURARE: ${euro(amount)}`, 14, y); doc.setTextColor(30,30,30); doc.setFontSize(9); doc.text("Firma e timbro", 230, y+12);
        }
        doc.save(fileName("pdf"));
    }

    function intercept(id, handler) {
        const el = document.getElementById(id); if (!el || el.dataset.invoiceSelectionIntercepted) return;
        el.dataset.invoiceSelectionIntercepted = "1";
        el.addEventListener("click", (event) => { event.preventDefault(); event.stopImmediatePropagation(); handler(); }, true);
    }

    function bind() {
        installStyles(); ensureTools(); loadSelection();
        ["vendorFilter","monthFilter","dateFrom","dateTo"].forEach(id => {
            const el=document.getElementById(id); if(!el || el.dataset.invoiceSelectionFilter) return;
            el.dataset.invoiceSelectionFilter="1"; el.addEventListener("change",()=>setTimeout(render,0),true); el.addEventListener("input",()=>setTimeout(render,0),true);
        });
        intercept("exportExcel", exportExcel); intercept("exportPdf", exportPdf);
        render();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, {once:true}); else bind();
    setInterval(() => { if(document.getElementById("invoicePreviewBody")) { ensureTools(); intercept("exportExcel", exportExcel); intercept("exportPdf", exportPdf); render(); } }, 1000);
})();
