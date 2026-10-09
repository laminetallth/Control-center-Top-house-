const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const Brevo = require("@getbrevo/brevo");

initializeApp();
const db = getFirestore();
const BREVO_API_KEY = defineSecret("BREVO_API_KEY");
const MAIL_FROM = defineSecret("MAIL_FROM");
const MAIL_FROM_NAME = defineSecret("MAIL_FROM_NAME");

function brevoClient() {
  const api = new Brevo.TransactionalEmailsApi();
  api.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY.value());
  return api;
}
function safe(v) { return String(v || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
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
function expiryFor(contract, service) {
  const direct = service === "luce" ? contract.offerExpiryLight : contract.offerExpiryGas;
  if (direct) return dateOnly(direct);
  const duration = String(service === "luce" ? (contract.durationLight || "") : (contract.durationGas || ""));
  const months = ({ "6 mesi":6, "1 anno":12, "2 anni":24, "3 anni":36, "4 anni":48, "5 anni":60, "10 anni":120 })[duration];
  const signed = dateOnly(contract.date);
  return signed && months ? addMonths(signed, months) : null;
}
function servicesFor(contract) {
  const s = String(contract.service || "").toLowerCase();
  if (s.includes("luce + gas")) return ["luce", "gas"];
  if (s === "luce") return ["luce"];
  if (s === "gas") return ["gas"];
  return [];
}
async function profileForSeller(name) {
  const snap = await db.collection("users").where("name", "==", name).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}
async function sendEmail({ to, subject, html, text }) {
  if (!to) throw new Error("Destinatario email mancante");
  const api = brevoClient();
  return api.sendTransacEmail({
    sender: { email: MAIL_FROM.value(), name: MAIL_FROM_NAME.value() || "TOP HOUSE" },
    to: [{ email: to }],
    subject, htmlContent: html, textContent: text
  });
}
async function writeLog(id, data) {
  await db.collection("automationLogs").doc(id).set({
    ...data, updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
}
async function requireProfile(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Accedi al CRM per usare le automazioni.");
  const snap = await db.collection("users").doc(request.auth.uid).get();
  if (!snap.exists || snap.data().active === false) throw new HttpsError("permission-denied", "Profilo CRM non autorizzato.");
  return { uid: request.auth.uid, ...snap.data() };
}
exports.sendWelcomeEmail = onCall({ secrets: [BREVO_API_KEY, MAIL_FROM, MAIL_FROM_NAME], region: "europe-west1" }, async request => {
  const profile = await requireProfile(request);
  const contractId = String(request.data && request.data.contractId || "");
  if (!contractId) throw new HttpsError("invalid-argument", "Cliente non valido.");
  const main = await db.collection("crmData").doc("main").get();
  const contracts = (main.exists && main.data().contracts) || [];
  const client = contracts.find(c => String(c.id) === contractId);
  if (!client) throw new HttpsError("not-found", "Cliente non trovato nel CRM.");
  const isAdmin = profile.role === "admin";
  const isManager = profile.role === "manager";
  if (!isAdmin && client.seller !== profile.name && !isManager) throw new HttpsError("permission-denied", "Non puoi inviare email per questo cliente.");
  if (!client.email) throw new HttpsError("failed-precondition", "Il cliente non ha un indirizzo email.");
  const logId = "welcome-" + contractId;
  const logRef = db.collection("automationLogs").doc(logId);
  const old = await logRef.get();
  if (old.exists && old.data().status === "sent") throw new HttpsError("already-exists", "La mail di benvenuto risulta già inviata.");
  await writeLog(logId, { type: "welcome", contractId, clientName: client.name || "", clientEmail: client.email, seller: client.seller || "", status: "sending", recipient: client.email, createdAt: FieldValue.serverTimestamp() });
  try {
    await sendEmail({
      to: client.email, subject: "Benvenuto in TOP HOUSE",
      html: "<div style=\"font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#222\"><h2 style=\"color:#f47b20\">Benvenuto in TOP HOUSE</h2><p>Buongiorno " + safe(client.name) + ",</p><p>grazie per aver scelto TOP HOUSE. Siamo a disposizione per accompagnarti e aiutarti a gestire al meglio le tue forniture e i servizi attivati.</p><p>Per informazioni o assistenza puoi contattare il tuo Green Family Manager, " + safe(client.seller || "referente TOP HOUSE") + ".</p><p>Un cordiale saluto,<br><b>TOP HOUSE</b><br><i>casa, energia, fiducia.</i></p></div>",
      text: "Benvenuto in TOP HOUSE, " + (client.name || "") + ". Grazie per averci scelto. Per assistenza contatta il tuo Green Family Manager: " + (client.seller || "referente TOP HOUSE") + ". TOP HOUSE – casa, energia, fiducia."
    });
    await writeLog(logId, { status: "sent", sentAt: FieldValue.serverTimestamp(), error: null });
    return { ok: true };
  } catch (err) {
    await writeLog(logId, { status: "failed", error: String(err.message || err), failedAt: FieldValue.serverTimestamp() });
    throw new HttpsError("internal", "Invio non riuscito. Controlla il registro Automazioni.");
  }
});
exports.listAutomationLogs = onCall({ region: "europe-west1" }, async request => {
  await requireProfile(request);
  const snap = await db.collection("automationLogs").limit(200).get();
  const logs = snap.docs.map(doc => {
    const x = doc.data();
    const iso = value => value && typeof value.toDate === "function" ? value.toDate().toISOString() : (value || null);
    return {
      id: doc.id, type: x.type || "", contractId: x.contractId || "",
      clientName: x.clientName || "", clientEmail: x.clientEmail || "",
      recipient: x.recipient || "", seller: x.seller || "", service: x.service || "",
      expiryDate: x.expiryDate || "", scheduledFor: x.scheduledFor || "",
      status: x.status || "", error: x.error || "",
      createdAt: iso(x.createdAt), updatedAt: iso(x.updatedAt), sentAt: iso(x.sentAt),
      failedAt: iso(x.failedAt)
    };
  });
  logs.sort((a,b) => String(b.updatedAt || b.sentAt || b.scheduledFor || "").localeCompare(String(a.updatedAt || a.sentAt || a.scheduledFor || "")));
  return { logs };
});
exports.processCustomerAutomations = onSchedule({ schedule: "every day 08:00", timeZone: "Europe/Rome", region: "europe-west1", secrets: [BREVO_API_KEY, MAIL_FROM, MAIL_FROM_NAME] }, async () => {
  const snap = await db.collection("crmData").doc("main").get();
  if (!snap.exists) return;
  const contracts = snap.data().contracts || [];
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  for (const c of contracts) {
    if (!c || ["KO", "Storno"].includes(c.status)) continue;
    const id = String(c.id || "");
    if (!id) continue;
    const dob = dateOnly(c.birthday);
    if (dob && dob.getUTCMonth() === today.getUTCMonth() && dob.getUTCDate() === today.getUTCDate()) {
      const emailKey = String(c.email || ("no-email-" + id)).trim().toLowerCase();
      const logId = "birthday-" + encodeURIComponent(emailKey) + "-" + today.getUTCFullYear();
      const ref = db.collection("automationLogs").doc(logId);
      const old = await ref.get();
      if (!old.exists || old.data().status !== "sent") {
        try {
          await writeLog(logId, { type: "birthday", contractId: id, clientName: c.name || "", clientEmail: c.email || "", seller: c.seller || "", status: "sending", scheduledFor: todayKey });
          await sendEmail({ to: c.email, subject: "Buon compleanno da TOP HOUSE!", html: "<div style=\"font-family:Arial,sans-serif;color:#222\"><h2 style=\"color:#f47b20\">Tanti auguri, " + safe(c.name) + "!</h2><p>Da tutto il team TOP HOUSE, i migliori auguri per una splendida giornata.</p><p>Il tuo Green Family Manager e il team TOP HOUSE</p></div>", text: "Tanti auguri, " + (c.name || "") + "! Da tutto il team TOP HOUSE, i migliori auguri per una splendida giornata." });
          await writeLog(logId, { status: "sent", sentAt: FieldValue.serverTimestamp(), error: null });
        } catch (err) { await writeLog(logId, { status: "failed", error: String(err.message || err), failedAt: FieldValue.serverTimestamp() }); }
      }
    }
    for (const service of servicesFor(c)) {
      const expiry = expiryFor(c, service);
      if (!expiry) continue;
      const reminder = addMonths(expiry, -3);
      if (reminder.toISOString().slice(0, 10) !== todayKey) continue;
      const logId = "expiry-" + id + "-" + service + "-" + expiry.toISOString().slice(0, 10);
      const ref = db.collection("automationLogs").doc(logId);
      const old = await ref.get();
      if (old.exists && old.data().status === "sent") continue;
      const manager = await profileForSeller(c.seller);
      const serviceLabel = service === "luce" ? "luce" : "gas";
      try {
        await writeLog(logId, { type: "expiry", contractId: id, clientName: c.name || "", clientEmail: c.email || "", seller: c.seller || "", service: serviceLabel, expiryDate: expiry.toISOString().slice(0,10), status: "sending", scheduledFor: todayKey });
        await sendEmail({ to: c.email, subject: "La tua offerta " + serviceLabel + " si avvicina alla scadenza", html: "<div style=\"font-family:Arial,sans-serif;color:#222\"><h2 style=\"color:#f47b20\">La tua offerta sta per scadere</h2><p>Buongiorno " + safe(c.name) + ",</p><p>ti ricordiamo che l'offerta della tua fornitura <b>" + serviceLabel + "</b> risulta in scadenza il <b>" + expiry.toLocaleDateString("it-IT", { timeZone: "UTC" }) + "</b>.</p><p>Per verificare le condizioni e valutare le opzioni disponibili, contatta il tuo Green Family Manager: <b>" + safe(c.seller || "referente TOP HOUSE") + "</b>.</p><p>Un cordiale saluto,<br><b>TOP HOUSE</b></p></div>", text: "Buongiorno " + (c.name || "") + ", l'offerta della tua fornitura " + serviceLabel + " risulta in scadenza il " + expiry.toLocaleDateString("it-IT", { timeZone: "UTC" }) + ". Per verificare le condizioni, contatta il tuo Green Family Manager: " + (c.seller || "referente TOP HOUSE") + ". TOP HOUSE." });
        await writeLog(logId, { status: "sent", sentAt: FieldValue.serverTimestamp(), error: null });
      } catch (err) {
        await writeLog(logId, { status: "failed", error: String(err.message || err), failedAt: FieldValue.serverTimestamp() });
      }
      if (manager && manager.email) {
        try {
          await sendEmail({ to: manager.email, subject: "Scadenza offerta " + serviceLabel + " · " + (c.name || ""), html: "<div style=\"font-family:Arial,sans-serif;color:#222\"><h2 style=\"color:#f47b20\">Promemoria scadenza offerta</h2><p>La fornitura " + serviceLabel + " del cliente <b>" + safe(c.name) + "</b> scadrà il <b>" + expiry.toLocaleDateString("it-IT", { timeZone: "UTC" }) + "</b>.</p><ul><li>Email cliente: " + safe(c.email) + "</li><li>Telefono: " + safe(c.phone) + "</li><li>Venditore: " + safe(c.seller) + "</li><li>Gestore: " + safe(service === "luce" ? (c.managerLight || c.manager) : (c.managerGas || c.manager)) + "</li></ul><p>Contatta il cliente per tempo.</p></div>", text: "Promemoria: offerta " + serviceLabel + " del cliente " + (c.name || "") + " scade il " + expiry.toLocaleDateString("it-IT", { timeZone: "UTC" }) + ". Email: " + (c.email || "") + "; telefono: " + (c.phone || "") + "; venditore: " + (c.seller || "") + "." });
          await writeLog(logId + "-seller", { type: "expiry-seller", contractId: id, clientName: c.name || "", seller: c.seller || "", recipient: manager.email, service: serviceLabel, expiryDate: expiry.toISOString().slice(0,10), status: "sent", sentAt: FieldValue.serverTimestamp() });
        } catch (err) {
          await writeLog(logId + "-seller", { type: "expiry-seller", contractId: id, clientName: c.name || "", seller: c.seller || "", recipient: manager.email, service: serviceLabel, expiryDate: expiry.toISOString().slice(0,10), status: "failed", error: String(err.message || err), failedAt: FieldValue.serverTimestamp() });
        }
      } else {
        await writeLog(logId + "-seller", { type: "expiry-seller", contractId: id, clientName: c.name || "", seller: c.seller || "", service: serviceLabel, expiryDate: expiry.toISOString().slice(0,10), status: "failed", error: "Email venditore non disponibile nel profilo Firebase." });
      }
    }
  }
});
