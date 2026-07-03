import { formatEuro, parseNumero } from "./formatters.js";
import { readCollection } from "./firebase-data.js";

const AZIENDA = {
    ragioneSociale: "TOP HOUSE S.R.L.S.",
    sede: "Viale Lombardia 30, Busto Arsizio",
    partitaIva: "03949040129",
    email: "informazioni.th@gmail.com",
    logo: "assets/logo-casa.png"
};

const VENDITORI_REGISTRATI = [
    "Antonio Attardi",
    "Davide Marino",
    "Fabio Magnago",
    "Gabriele Straniero",
    "Giuseppe Maresca",
    "Lamine Tall",
    "Morena Caccavo",
    "Studio Cian"
];

let contratti = [];
let logoDataUrl = "";

const vendorFilter = document.getElementById("vendorFilter");
const monthFilter = document.getElementById("monthFilter");
const dateFrom = document.getElementById("dateFrom");
const dateTo = document.getElementById("dateTo");
const previewBody = document.getElementById("invoicePreviewBody");
const selectedVendorLabel = document.getElementById("selectedVendorLabel");
const selectedPeriodLabel = document.getElementById("selectedPeriodLabel");
const totalContracts = document.getElementById("totalContracts");
const totalAmount = document.getElementById("totalAmount");
const tableTotalAmount = document.getElementById("tableTotalAmount");

function testo(valore){
    return String(valore || "").trim();
}

function escapeHtml(valore){
    return testo(valore)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function praticaValidaPerCompensi(contratto){
    return contratto.stato === "OK" || contratto.stato === "Pagato";
}

function getContrattiLocali(){
    try{
        const dati = JSON.parse(localStorage.getItem("contrattiTopHouse"));
        return Array.isArray(dati) ? dati : [];
    }catch(error){
        return [];
    }
}

function normalizzaContratto(contratto, index){
    return {
        id: testo(contratto.id || index + 1),
        dataInserimento: testo(contratto.dataInserimento),
        dataEsito: testo(contratto.dataEsito),
        nome: testo(contratto.nome),
        cognome: testo(contratto.cognome),
        venditore: testo(contratto.venditore),
        partner: testo(contratto.partner),
        gestore: testo(contratto.gestore),
        servizio: testo(contratto.servizio),
        stato: testo(contratto.stato),
        note: testo(contratto.note),
        gettoneVenditore: parseNumero(contratto.gettoneVenditore)
    };
}

function popolaVenditori(){
    const venditoriDaContratti = [...new Set(contratti.map(c => testo(c.venditore)).filter(Boolean))];
    const venditori = [...new Set([...VENDITORI_REGISTRATI, ...venditoriDaContratti])].sort((a, b) => a.localeCompare(b, "it"));
    vendorFilter.innerHTML = `<option value="">Seleziona venditore</option>`;
    venditori.forEach(venditore => {
        vendorFilter.innerHTML += `<option value="${escapeHtml(venditore)}">${escapeHtml(venditore)}</option>`;
    });
}

function formatDateIt(data){
    if(!data){ return "-"; }
    const [anno, mese, giorno] = data.split("-");
    return giorno && mese && anno ? `${giorno}/${mese}/${anno}` : data;
}

function getPeriodoLabel(){
    if(dateFrom.value || dateTo.value){
        return `${formatDateIt(dateFrom.value) } - ${formatDateIt(dateTo.value)}`;
    }
    if(monthFilter.value){
        return monthFilter.options[monthFilter.selectedIndex].text;
    }
    return "Seleziona periodo";
}

function getPeriodoFile(){
    if(monthFilter.value){
        return monthFilter.options[monthFilter.selectedIndex].text.replaceAll(" ", "_");
    }
    if(dateFrom.value || dateTo.value){
        return `${dateFrom.value || "inizio"}_${dateTo.value || "fine"}`;
    }
    return "periodo";
}

function getContrattiFatturabili(){
    const venditore = testo(vendorFilter.value);
    const inizio = dateFrom.value || (monthFilter.value ? `${monthFilter.value}-01` : "");
    const fine = dateTo.value || (monthFilter.value ? `${monthFilter.value}-31` : "");

    if(!venditore){ return []; }

    return contratti
        .filter(contratto => {
            const data = testo(contratto.dataInserimento);
            return testo(contratto.venditore) === venditore &&
                praticaValidaPerCompensi(contratto) &&
                (!inizio || data >= inizio) &&
                (!fine || data <= fine);
        })
        .sort((a, b) => testo(a.dataInserimento).localeCompare(testo(b.dataInserimento)) || testo(a.cognome).localeCompare(testo(b.cognome)));
}

function calcolaTotale(lista){
    return lista.reduce((totale, contratto) => totale + parseNumero(contratto.gettoneVenditore), 0);
}

function renderAnteprima(){
    const lista = getContrattiFatturabili();
    const totale = calcolaTotale(lista);

    selectedVendorLabel.textContent = vendorFilter.value || "Seleziona venditore";
    selectedPeriodLabel.textContent = getPeriodoLabel();
    totalContracts.textContent = lista.length;
    totalAmount.textContent = formatEuro(totale);
    tableTotalAmount.textContent = formatEuro(totale);
    previewBody.innerHTML = "";

    if(lista.length === 0){
        previewBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center; padding:30px; color:#6b7280; font-weight:bold;">
                    Nessun contratto fatturabile per il venditore e periodo selezionati.
                </td>
            </tr>
        `;
        return;
    }

    lista.forEach((contratto, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHtml(`${contratto.nome} ${contratto.cognome}`)}</td>
            <td>${escapeHtml(formatDateIt(contratto.dataInserimento))}</td>
            <td>${escapeHtml(contratto.partner)}</td>
            <td>${escapeHtml(contratto.gestore)}</td>
            <td>${escapeHtml(contratto.servizio)}</td>
            <td>${escapeHtml(contratto.note)}</td>
            <td><span class="badge ${contratto.stato === "Pagato" ? "paid" : "ok"}">${escapeHtml(contratto.stato)}</span></td>
            <td>${escapeHtml(formatDateIt(contratto.dataEsito))}</td>
            <td>${formatEuro(contratto.gettoneVenditore)}</td>
        `;
        previewBody.appendChild(row);
    });
}

function applicaMeseRapido(){
    if(monthFilter.value){
        dateFrom.value = `${monthFilter.value}-01`;
        const [anno, mese] = monthFilter.value.split("-").map(Number);
        const ultimoGiorno = new Date(anno, mese, 0).getDate();
        dateTo.value = `${monthFilter.value}-${String(ultimoGiorno).padStart(2, "0")}`;
    }
    renderAnteprima();
}

function resetFiltri(){
    vendorFilter.value = "";
    monthFilter.value = "";
    dateFrom.value = "";
    dateTo.value = "";
    renderAnteprima();
}

async function caricaLogo(){
    try{
        const response = await fetch(AZIENDA.logo);
        const blob = await response.blob();
        logoDataUrl = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }catch(error){
        logoDataUrl = "";
    }
}

function nomeFile(estensione){
    const venditore = testo(vendorFilter.value).replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Venditore";
    return `Invito_fatturare_${venditore}_${getPeriodoFile()}.${estensione}`;
}

function assertExportPronto(lista){
    if(!vendorFilter.value){
        alert("Seleziona un venditore prima di esportare.");
        return false;
    }
    if(lista.length === 0){
        alert("Nessun contratto fatturabile per il venditore e periodo selezionati.");
        return false;
    }
    return true;
}

function righeExport(lista){
    return lista.map((contratto, index) => [
        index + 1,
        `${contratto.nome} ${contratto.cognome}`.trim(),
        formatDateIt(contratto.dataInserimento),
        contratto.partner,
        contratto.gestore,
        contratto.servizio,
        contratto.note,
        contratto.stato,
        formatDateIt(contratto.dataEsito),
        formatEuro(contratto.gettoneVenditore)
    ]);
}

function applicaStileCella(worksheet, cella, stile){
    if(!worksheet[cella]){ worksheet[cella] = { t: "s", v: "" }; }
    worksheet[cella].s = stile;
}

function applicaStileRange(worksheet, range, stile){
    for(let row = range.s.r; row <= range.e.r; row += 1){
        for(let col = range.s.c; col <= range.e.c; col += 1){
            const cella = XLSX.utils.encode_cell({ r: row, c: col });
            applicaStileCella(worksheet, cella, stile);
        }
    }
}

function esportaExcel(){
    const lista = getContrattiFatturabili();
    if(!assertExportPronto(lista)){ return; }

    const intestazioni = [["N.", "Nome e Cognome Cliente", "Data Inserimento", "Partner", "Gestore", "Servizio", "Note", "Stato", "Data Esito", "Importo da fatturare"]];
    const totale = calcolaTotale(lista);
    const dataExport = new Date().toLocaleDateString("it-IT");
    const worksheet = XLSX.utils.aoa_to_sheet([
        ["TOP HOUSE S.R.L.S."],
        [AZIENDA.sede],
        [`P.IVA ${AZIENDA.partitaIva} · ${AZIENDA.email}`],
        [],
        ["INVITO A FATTURARE"],
        [`Riepilogo contratti del venditore: ${vendorFilter.value}`],
        [`Periodo: ${getPeriodoLabel()}`],
        [`Totale contratti: ${lista.length}`],
        [`Totale da fatturare: ${formatEuro(totale)}`],
        [`Documento generato il: ${dataExport}`],
        [],
        ...intestazioni,
        ...righeExport(lista),
        [],
        ["", "", "", "", "", "", "", "", "Totale finale", formatEuro(totale)],
        [],
        ["Grazie per la collaborazione"],
        ["TOP HOUSE S.R.L.S."],
        ["Firma e timbro"]
    ]);

    const headerRow = 11;
    const firstDataRow = 12;
    const totalRow = firstDataRow + lista.length + 1;
    const footerStartRow = totalRow + 2;
    const border = { style: "thin", color: { rgb: "D9DEE8" } };
    const styles = {
        brand: { font: { bold: true, sz: 26, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "081120" } }, alignment: { horizontal: "center", vertical: "center" } },
        company: { font: { bold: true, sz: 11, color: { rgb: "D90429" } }, alignment: { horizontal: "center" } },
        title: { font: { bold: true, sz: 22, color: { rgb: "D90429" } }, alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "FFF2E6" } } },
        subtitle: { font: { bold: true, sz: 13, color: { rgb: "081120" } }, alignment: { horizontal: "center" } },
        summary: { font: { bold: true, color: { rgb: "081120" } }, fill: { fgColor: { rgb: "FFE4CC" } }, border: { top: border, bottom: border, left: border, right: border } },
        tableHead: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "D90429" } }, alignment: { horizontal: "center" }, border: { top: border, bottom: border, left: border, right: border } },
        even: { fill: { fgColor: { rgb: "FFF8F0" } }, border: { top: border, bottom: border, left: border, right: border } },
        odd: { fill: { fgColor: { rgb: "FFFFFF" } }, border: { top: border, bottom: border, left: border, right: border } },
        total: { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "FF7B00" } }, border: { top: border, bottom: border, left: border, right: border } },
        footer: { font: { bold: true, color: { rgb: "081120" } }, alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "F3F4F6" } } }
    };

    worksheet["!cols"] = [{ wch: 6 }, { wch: 32 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 42 }, { wch: 12 }, { wch: 14 }, { wch: 22 }];
    worksheet["!rows"] = [{ hpt: 32 }, { hpt: 20 }, { hpt: 20 }, { hpt: 8 }, { hpt: 30 }, { hpt: 22 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 8 }, { hpt: 26 }];
    worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: 9 } },
        { s: { r: 5, c: 0 }, e: { r: 5, c: 9 } },
        { s: { r: footerStartRow, c: 0 }, e: { r: footerStartRow, c: 9 } },
        { s: { r: footerStartRow + 1, c: 0 }, e: { r: footerStartRow + 1, c: 9 } },
        { s: { r: footerStartRow + 2, c: 0 }, e: { r: footerStartRow + 2, c: 9 } }
    ];
    applicaStileRange(worksheet, { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, styles.brand);
    applicaStileRange(worksheet, { s: { r: 1, c: 0 }, e: { r: 2, c: 9 } }, styles.company);
    applicaStileRange(worksheet, { s: { r: 4, c: 0 }, e: { r: 4, c: 9 } }, styles.title);
    applicaStileRange(worksheet, { s: { r: 5, c: 0 }, e: { r: 9, c: 9 } }, styles.subtitle);
    applicaStileRange(worksheet, { s: { r: 6, c: 0 }, e: { r: 9, c: 9 } }, styles.summary);
    applicaStileRange(worksheet, { s: { r: headerRow, c: 0 }, e: { r: headerRow, c: 9 } }, styles.tableHead);
    lista.forEach((_, index) => applicaStileRange(worksheet, { s: { r: firstDataRow + index, c: 0 }, e: { r: firstDataRow + index, c: 9 } }, index % 2 === 0 ? styles.even : styles.odd));
    applicaStileRange(worksheet, { s: { r: totalRow, c: 8 }, e: { r: totalRow, c: 9 } }, styles.total);
    applicaStileRange(worksheet, { s: { r: footerStartRow, c: 0 }, e: { r: footerStartRow + 2, c: 9 } }, styles.footer);
    if(logoDataUrl){ worksheet["A1"].c = [{ a: "TOP HOUSE", t: "Logo reale mantenuto nell'export PDF; Excel usa una testata brandizzata per compatibilità SheetJS." }]; }

    const workbook = XLSX.utils.book_new();
    workbook.Props = { Title: "INVITO A FATTURARE", Company: AZIENDA.ragioneSociale };
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invito a fatturare");
    XLSX.writeFile(workbook, nomeFile("xlsx"));
}

function esportaPdf(){
    const lista = getContrattiFatturabili();
    if(!assertExportPronto(lista)){ return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const totale = calcolaTotale(lista);

    if(logoDataUrl){ doc.addImage(logoDataUrl, "PNG", 14, 10, 24, 24); }
    doc.setTextColor(8, 17, 32);
    doc.setFontSize(18);
    doc.text("INVITO A FATTURARE", 44, 18);
    doc.setFontSize(10);
    doc.text(AZIENDA.ragioneSociale, 44, 25);
    doc.text(`${AZIENDA.sede} · P.IVA ${AZIENDA.partitaIva} · ${AZIENDA.email}`, 44, 30);

    doc.setFillColor(255, 123, 0);
    doc.roundedRect(14, 40, 269, 18, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(`Venditore: ${vendorFilter.value}`, 19, 47);
    doc.text(`Periodo: ${getPeriodoLabel()}`, 19, 53);
    doc.text(`Totale contratti: ${lista.length}`, 155, 47);
    doc.text(`Totale da fatturare: ${formatEuro(totale)}`, 155, 53);

    doc.autoTable({
        startY: 66,
        head: [["N.", "Cliente", "Data Inserimento", "Partner", "Gestore", "Servizio", "Note", "Stato", "Data Esito", "Importo"]],
        body: righeExport(lista),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [8, 17, 32], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 6: { cellWidth: 45 }, 9: { halign: "right" } }
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setTextColor(8, 17, 32);
    doc.setFontSize(12);
    doc.text(`Totale contratti: ${lista.length}`, 14, finalY);
    doc.text(`Totale da fatturare: ${formatEuro(totale)}`, 220, finalY);
    doc.line(14, finalY + 20, 88, finalY + 20);
    doc.text("Firma e timbro", 14, finalY + 26);
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("TOP HOUSE S.R.L.S. - Documento generato dal gestionale TOP HOUSE", 14, 198);
    doc.save(nomeFile("pdf"));
}

async function inizializza(){
    contratti = getContrattiLocali().map(normalizzaContratto);
    popolaVenditori();
    renderAnteprima();
    await Promise.all([
        readCollection("contracts").then(dati => { contratti = dati.map(normalizzaContratto); popolaVenditori(); renderAnteprima(); }).catch(() => {}),
        caricaLogo()
    ]);
}

vendorFilter.addEventListener("change", renderAnteprima);
monthFilter.addEventListener("change", applicaMeseRapido);
dateFrom.addEventListener("change", renderAnteprima);
dateTo.addEventListener("change", renderAnteprima);
document.getElementById("resetFilters").addEventListener("click", resetFiltri);
document.getElementById("exportExcel").addEventListener("click", esportaExcel);
document.getElementById("exportPdf").addEventListener("click", esportaPdf);

inizializza();
