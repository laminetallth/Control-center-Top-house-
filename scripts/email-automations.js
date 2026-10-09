const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
admin.initializeApp({ credential: admin.credential.cert(credentials), projectId: "crm-top-house" });
const db = getFirestore();
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER = { email: "info@tophouseitalia.com", name: "TOP HOUSE" };

function safe(v) {
  return String(v || "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function dateOnly(value) {
  if (!value) return null;
  const d = new Date(String(value).slice(0, 10) + "T12:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}
function addMonths(date, months) {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}
function dateKey(d) { return d.toISOString().slice(0, 10); }
function todayRome() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const o = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return o.year + "-" + o.month + "-" + o.day;
}
function expiryFor(c, service) {
  const direct = service === "luce" ? c.offerExpiryLight : c.offerExpiryGas;
  if (direct) return dateOnly(direct);
  const duration = String(service === "luce" ? (c.durationLight || "") : (c.durationGas || ""));
  const months = ({ "6 mesi":6, "1 anno":12, "2 anni":24, "3 anni":36, "4 anni":48, "5 anni":60, "10 anni":120 })[duration];
  const signed = dateOnly(c.date);
  return signed && months ? addMonths(signed, months) : null;
}
function servicesFor(c) {
  const s = String(c.service || "").toLowerCase();
  if (s.includes("luce + gas")) return ["luce", "gas"];
  if (s === "luce") return ["luce"];
  if (s === "gas") return ["gas"];
  return [];
}
async function sendEmail(to, subject, html, text) {
  if (!to) throw new Error("Destinatario email mancante");
  if (!BREVO_API_KEY) throw new Error("Secret BREVO_API_KEY mancante");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "accept": "application/json", "content-type": "application/json" },
    body: JSON.stringify({ sender: SENDER, to: [{ email: to }], subject, htmlContent: html, textContent: text })
  });
  if (!response.ok) throw new Error("Brevo HTTP " + response.status + ": " + (await response.text()).slice(0, 500));
}
async function logEvent(id, values) {
  await db.collection("automationLogs").doc(id).set({ ...values, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}
async function sendOnce(id, meta, to, subject, html, text) {
  const ref = db.collection("automationLogs").doc(id);
  const old = await ref.get();
  if (old.exists && old.data().status === "sent") return;
  await logEvent(id, { ...meta, recipient: to || "", status: "sending", scheduledFor: todayRome(), createdAt: old.exists ? (old.data().createdAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(), error: null });
  try {
    await sendEmail(to, subject, html, text);
    await logEvent(id, { status: "sent", sentAt: FieldValue.serverTimestamp(), error: null });
  } catch (e) {
    await logEvent(id, { status: "failed", error: String(e.message || e).slice(0, 1000), failedAt: FieldValue.serverTimestamp() });
    console.error("Invio fallito", id, String(e.message || e));
  }
}
async function processWelcomeQueue() {
  const snap = await db.collection("emailQueue").where("status", "==", "pending").limit(50).get();
  for (const docSnap of snap.docs) {
    const item = docSnap.data();
    const contractId = String(item.contractId || "");
    const main = await db.collection("crmData").doc("main").get();
    const contracts = main.exists ? (main.data().contracts || []) : [];
    const client = contracts.find(c => String(c.id) === contractId);
    if (!client || !client.email) {
      await docSnap.ref.set({ status: "failed", error: !client ? "Cliente non trovato" : "Email cliente mancante", processedAt: FieldValue.serverTimestamp() }, { merge: true });
      continue;
    }
    const logId = "welcome-" + contractId;
    const old = await db.collection("automationLogs").doc(logId).get();
    if (old.exists && old.data().status === "sent") {
      await docSnap.ref.set({ status: "sent", processedAt: FieldValue.serverTimestamp(), error: null }, { merge: true });
      continue;
    }
    try {
      await sendOnce(logId, { type: "welcome", contractId, clientName: client.name || "", clientEmail: client.email, seller: client.seller || "" }, client.email,
        "Benvenuto in TOP HOUSE",
        '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#222"><h2 style="color:#f47b20">Benvenuto in TOP HOUSE</h2><p>Buongiorno ' + safe(client.name) + ',</p><p>grazie per aver scelto TOP HOUSE. Siamo a disposizione per accompagnarti e aiutarti a gestire al meglio le tue forniture e i servizi attivati.</p><p>Per informazioni o assistenza puoi contattare il tuo Green Family Manager, ' + safe(client.seller || "referente TOP HOUSE") + '.</p><p>Un cordiale saluto,<br><b>TOP HOUSE</b><br><i>casa, energia, fiducia.</i></p></div>',
        "Benvenuto in TOP HOUSE, " + (client.name || "") + ". Grazie per averci scelto. Per assistenza contatta il tuo Green Family Manager: " + (client.seller || "referente TOP HOUSE") + ". TOP HOUSE – casa, energia, fiducia.");
      const finalLog = await db.collection("automationLogs").doc(logId).get();
      await docSnap.ref.set({ status: finalLog.exists && finalLog.data().status === "sent" ? "sent" : "failed", processedAt: FieldValue.serverTimestamp(), error: finalLog.data()?.error || null }, { merge: true });
    } catch (e) {
      await docSnap.ref.set({ status: "failed", error: String(e.message || e), processedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  }
}
async function processBirthday(c, today) {
  const dob = dateOnly(c.birthday);
  if (!dob || dob.getUTCMonth() !== today.getUTCMonth() || dob.getUTCDate() !== today.getUTCDate() || !c.email) return;
  const emailKey = String(c.email).trim().toLowerCase();
  const id = "birthday-" + encodeURIComponent(emailKey) + "-" + today.getUTCFullYear();
  await sendOnce(id, { type: "birthday", contractId: String(c.id || ""), clientName: c.name || "", clientEmail: c.email, seller: c.seller || "" }, c.email,
    "Buon compleanno da TOP HOUSE!",
    '<div style="font-family:Arial,sans-serif;color:#222"><h2 style="color:#f47b20">Tanti auguri, ' + safe(c.name) + '!</h2><p>Da tutto il team TOP HOUSE, i migliori auguri per una splendida giornata.</p><p>Il tuo Green Family Manager e il team TOP HOUSE</p></div>',
    "Tanti auguri, " + (c.name || "") + "! Da tutto il team TOP HOUSE, i migliori auguri per una splendida giornata.");
}
async function processExpiry(c, service, expiry, today) {
  const expiryKey = dateKey(expiry);
  const reminderKey = dateKey(addMonths(expiry, -3));
  if (today < reminderKey || today >= expiryKey) return;
  const label = service;
  const expiryLabel = expiry.toLocaleDateString("it-IT", { timeZone: "UTC" });
  const id = "expiry-" + String(c.id) + "-" + service + "-" + expiryKey;
  await sendOnce(id, { type: "expiry", contractId: String(c.id), clientName: c.name || "", clientEmail: c.email || "", seller: c.seller || "", service: label, expiryDate: expiryKey }, c.email,
    "La tua offerta " + label + " si avvicina alla scadenza",
    '<div style="font-family:Arial,sans-serif;color:#222"><h2 style="color:#f47b20">La tua offerta sta per scadere</h2><p>Buongiorno ' + safe(c.name) + ',</p><p>ti ricordiamo che l’offerta della tua fornitura <b>' + label + '</b> risulta in scadenza il <b>' + expiryLabel + '</b>.</p><p>Per verificare le condizioni e valutare le opzioni disponibili, contatta il tuo Green Family Manager: <b>' + safe(c.seller || "referente TOP HOUSE") + '</b>.</p><p>Un cordiale saluto,<br><b>TOP HOUSE</b></p></div>',
    "Buongiorno " + (c.name || "") + ", l'offerta della tua fornitura " + label + " risulta in scadenza il " + expiryLabel + ". Per verificare le condizioni, contatta il tuo Green Family Manager: " + (c.seller || "referente TOP HOUSE") + ". TOP HOUSE.");
  const users = await db.collection("users").where("name", "==", String(c.seller || "")).limit(1).get();
  const seller = users.empty ? null : users.docs[0].data();
  if (seller && seller.active !== false && seller.email) {
    const sellerId = id + "-seller";
    await sendOnce(sellerId, { type: "expiry-seller", contractId: String(c.id), clientName: c.name || "", clientEmail: c.email || "", seller: c.seller || "", service: label, expiryDate: expiryKey }, seller.email,
      "Scadenza offerta " + label + " · " + (c.name || ""),
      '<div style="font-family:Arial,sans-serif;color:#222"><h2 style="color:#f47b20">Promemoria scadenza offerta</h2><p>La fornitura ' + label + ' del cliente <b>' + safe(c.name) + '</b> scadrà il <b>' + expiryLabel + '</b>.</p><ul><li>Email cliente: ' + safe(c.email) + '</li><li>Telefono: ' + safe(c.phone) + '</li><li>Venditore: ' + safe(c.seller) + '</li><li>Gestore: ' + safe(service === "luce" ? (c.managerLight || c.manager) : (c.managerGas || c.manager)) + '</li></ul><p>Contatta il cliente per tempo.</p></div>',
      "Promemoria: offerta " + label + " del cliente " + (c.name || "") + " scade il " + expiryLabel + ". Email: " + (c.email || "") + "; telefono: " + (c.phone || "") + "; venditore: " + (c.seller || "") + ".");
  } else {
    await logEvent(id + "-seller", { type: "expiry-seller", contractId: String(c.id), clientName: c.name || "", clientEmail: c.email || "", seller: c.seller || "", service: label, expiryDate: expiryKey, status: "failed", error: "Email del venditore non configurata nel documento users", scheduledFor: today });
  }
}
async function main() {
  const today = todayRome();
  await processWelcomeQueue();
  const snap = await db.collection("crmData").doc("main").get();
  if (!snap.exists) { console.log("Documento crmData/main assente; nessuna automazione clienti."); return; }
  const contracts = snap.data().contracts || [];
  const now = dateOnly(today);
  for (const c of contracts) {
    if (!c || ["KO", "Storno"].includes(c.status) || !c.id) continue;
    try {
      await processBirthday(c, now);
      for (const service of servicesFor(c)) {
        const expiry = expiryFor(c, service);
        if (expiry) await processExpiry(c, service, expiry, today);
      }
    } catch (e) { console.error("Errore automazione cliente", c.id, String(e.message || e)); }
  }
  console.log("Automazioni TOP HOUSE completate per", today);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
