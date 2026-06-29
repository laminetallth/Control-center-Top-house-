import { addDocument, deleteDocument, readCollection } from "./firebase-data.js";
import { storage, ref, uploadBytes, getDownloadURL, deleteObject } from "./firebase-config.js";

const EKO_STORAGE_FOLDER = "documents/partners/eko";
const EKO_LOGO = "assets/partners/logo-eko.png";
const DOCUMENTS_COLLECTION = "documents";

function text(value){ return String(value || "").trim(); }
function esc(value){ return text(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function cleanFileName(fileName){ return text(fileName).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-"); }
function isEkoDocument(doc){
    return text(doc.partner).toLowerCase() === "eko" && text(doc.categoria).toLowerCase() === "documenti";
}
function formatDate(value){
    if(!value){ return "-"; }
    if(typeof value?.toDate === "function"){ return value.toDate().toLocaleDateString("it-IT"); }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}
function setStatus(root, message, type = ""){
    const el = root.querySelector("[data-eko-status]");
    if(el){ el.textContent = message; el.className = `eko-documents-status ${type}`.trim(); }
}

export function createEkoDocumentsCard({ href = "documents.html#documenti-eko" } = {}){
    return `
        <a class="eko-folder-card" href="${esc(href)}" aria-label="Apri Documenti EKO">
            <div class="eko-folder-icon" aria-hidden="true">📁</div>
            <div class="eko-folder-logo"><img src="${EKO_LOGO}" alt="Logo EKO" onerror="this.style.display='none'; this.parentElement.classList.add('missing-logo'); this.parentElement.dataset.placeholder='EKO';"></div>
            <div>
                <h3>Documenti EKO</h3>
                <p>PDF, accordi e documentazione partner</p>
            </div>
        </a>
    `;
}

export async function initEkoDocumentsWidget(containerId, options = {}){
    const root = document.getElementById(containerId);
    if(!root){ return; }

    root.innerHTML = `
        <div class="eko-documents-header">
            <div>
                <h3>📁 Documenti EKO</h3>
                <p>PDF, accordi e documentazione partner condivisi tra Documenti e Partner - EKO.</p>
            </div>
            <div class="eko-documents-logo"><img src="${EKO_LOGO}" alt="Logo EKO" onerror="this.style.display='none'; this.parentElement.classList.add('missing-logo'); this.parentElement.dataset.placeholder='EKO';"></div>
        </div>
        <form class="eko-upload-form" data-eko-upload-form>
            <label>Carica PDF EKO</label>
            <div class="eko-upload-row">
                <input type="file" accept="application/pdf,.pdf" data-eko-file required>
                <button type="submit">Carica PDF</button>
            </div>
            <small>I file vengono salvati in <strong>${EKO_STORAGE_FOLDER}/</strong>.</small>
        </form>
        <p class="eko-documents-status" data-eko-status>Caricamento documenti...</p>
        <div class="eko-documents-list" data-eko-list></div>
    `;

    const form = root.querySelector("[data-eko-upload-form]");
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const fileInput = root.querySelector("[data-eko-file]");
        const file = fileInput.files?.[0];
        if(!file){ return; }
        if(file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")){
            setStatus(root, "Carica solo file PDF.", "error");
            return;
        }
        setStatus(root, "Upload PDF in corso...", "loading");
        try{
            const safeName = cleanFileName(file.name) || `documento-${Date.now()}.pdf`;
            const storagePath = `${EKO_STORAGE_FOLDER}/${Date.now()}-${safeName}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file, { contentType: "application/pdf" });
            const url = await getDownloadURL(storageRef);
            await addDocument(DOCUMENTS_COLLECTION, {
                id: Date.now(),
                partner: "EKO",
                categoria: "documenti",
                titolo: file.name,
                fileName: file.name,
                url,
                linkDocumento: url,
                storagePath,
                createdAt: new Date().toISOString(),
                stato: "Attivo",
                collegatoA: "EKO",
                note: "Documento partner EKO"
            });
            fileInput.value = "";
            await renderEkoDocuments(root);
            setStatus(root, "PDF EKO caricato e sincronizzato.", "online");
        }catch(error){
            console.error(error);
            setStatus(root, "Errore durante il caricamento del PDF EKO.", "error");
        }
    });

    await renderEkoDocuments(root, options);
}

async function renderEkoDocuments(root){
    const list = root.querySelector("[data-eko-list]");
    try{
        const docs = (await readCollection(DOCUMENTS_COLLECTION)).filter(isEkoDocument);
        if(!docs.length){
            list.innerHTML = `<div class="eko-empty">Nessun PDF EKO caricato.</div>`;
            setStatus(root, "Cartella Documenti EKO pronta.", "online");
            return;
        }
        list.innerHTML = docs.map(doc => `
            <article class="eko-document-item">
                <div><strong>${esc(doc.titolo || doc.fileName)}</strong><span>${esc(formatDate(doc.createdAt || doc.updatedAt))}</span></div>
                <div class="eko-document-actions">
                    <a class="mini-btn" href="${esc(doc.url || doc.linkDocumento)}" target="_blank" rel="noopener">Apri / scarica</a>
                    <button class="delete-btn" type="button" data-eko-delete="${esc(doc.firestoreId || doc.localId || doc.id)}" data-storage-path="${esc(doc.storagePath)}">Elimina</button>
                </div>
            </article>
        `).join("");
        list.querySelectorAll("[data-eko-delete]").forEach(button => {
            button.addEventListener("click", async () => {
                if(!confirm("Eliminare questo PDF EKO?")){ return; }
                try{
                    if(button.dataset.storagePath){ await deleteObject(ref(storage, button.dataset.storagePath)); }
                    await deleteDocument(DOCUMENTS_COLLECTION, button.dataset.ekoDelete);
                    await renderEkoDocuments(root);
                }catch(error){
                    console.error(error);
                    setStatus(root, "Errore durante l'eliminazione del PDF EKO.", "error");
                }
            });
        });
        setStatus(root, `${docs.length} PDF EKO in cartella.`, "online");
    }catch(error){
        console.error(error);
        list.innerHTML = `<div class="eko-empty">Impossibile caricare i PDF EKO.</div>`;
        setStatus(root, "Errore Firebase documenti EKO.", "error");
    }
}
