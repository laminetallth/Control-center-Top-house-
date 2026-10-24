import {
  db,
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "./firebase-config.js";

export const FIREBASE_COLLECTIONS = {
  contrattiTopHouse: "contracts",
  investimentiTopHouse: "investments",
  attivitaTopHouse: "activities",
  documentiTopHouse: "documents",
  affiliatiTopHouse: "affiliates",
  statiVenditoriTopHouse: "vendorStatuses"
};

export const LOCAL_STORAGE_KEYS = Object.fromEntries(Object.entries(FIREBASE_COLLECTIONS).map(([k, v]) => [v, k]));

function readLocal(key, fallback){
  try{ const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }catch(e){ return fallback; }
}
function writeLocal(collectionName, data){
  const key = LOCAL_STORAGE_KEYS[collectionName] || collectionName;
  localStorage.setItem(key, JSON.stringify(data));
}
function normalizeItem(item, index = 0){
  if(!item || typeof item !== "object"){ return item; }
  const id = String(item.firestoreId || item.localId || item.id || Date.now() + index);
  return { ...item, id: item.id || id, localId: item.localId || String(item.id || id), firestoreId: item.firestoreId || id };
}
function asFirestorePayload(data, index = 0){
  if(data && typeof data === "object" && !Array.isArray(data)){
    const normalized = normalizeItem(data, index);
    return { ...normalized, updatedAt: serverTimestamp() };
  }
  return { value: data, updatedAt: serverTimestamp() };
}
function docIdFor(data, index = 0){
  return String((data && (data.firestoreId || data.localId || data.id || data.key)) || Date.now() + index).replaceAll("/", "-");
}

function sortValue(value){
  if(value && typeof value.toMillis === "function"){ return value.toMillis(); }
  if(value && typeof value === "object" && "seconds" in value){ return Number(value.seconds) * 1000; }
  return value ?? "";
}

export async function readCollection(collectionName, options = {}){
  // Nessun orderBy lato Firestore: escluderebbe in silenzio i documenti senza il campo "updatedAt".
  const snap = await getDocs(collection(db, collectionName));
  const field = options.orderBy || "updatedAt";
  const data = snap.docs
    .map((d, index) => normalizeItem({ firestoreId: d.id, ...d.data() }, index))
    .sort((x, y) => {
      const a = sortValue(x[field]), b = sortValue(y[field]);
      return a < b ? 1 : a > b ? -1 : 0;
    });
  if(collectionName === "vendorStatuses"){
    const statuses = {};
    data.forEach(item => { const vendor = item.venditore || item.localId || item.id || item.firestoreId; if(vendor){ statuses[vendor] = item.stato || item.status || "Attivo"; } });
    localStorage.setItem("statiVenditoriTopHouse", JSON.stringify(statuses));
    return data;
  }
  writeLocal(collectionName, data);
  return data;
}

export async function addDocument(collectionName, data){
  const payload = asFirestorePayload(data);
  const id = docIdFor(payload);
  await setDoc(doc(db, collectionName, id), payload, { merge: true });
  await syncFirestoreToLocalStorage(collectionName);
  return { ...payload, firestoreId: id };
}
export async function updateDocument(collectionName, id, data){
  const firestoreId = String(id || docIdFor(data));
  await setDoc(doc(db, collectionName, firestoreId), asFirestorePayload({ ...data, firestoreId }), { merge: true });
  await syncFirestoreToLocalStorage(collectionName);
}
export async function deleteDocument(collectionName, id){
  await deleteDoc(doc(db, collectionName, String(id)));
  await syncFirestoreToLocalStorage(collectionName);
}
export async function syncFirestoreToLocalStorage(collectionName){
  return readCollection(collectionName);
}
export async function syncAllFromFirestore(){
  const result = {};
  for(const collectionName of Object.values(FIREBASE_COLLECTIONS)){
    result[collectionName] = await syncFirestoreToLocalStorage(collectionName);
  }
  return result;
}
export async function migrateLocalStorageToFirestore(localStorageKey, collectionName = FIREBASE_COLLECTIONS[localStorageKey]){
  const localData = readLocal(localStorageKey, localStorageKey === "statiVenditoriTopHouse" ? {} : []);
  const existing = await readCollection(collectionName);
  const existingKeys = new Set(existing.map((item, index) => docIdFor(item, index)));
  let migrated = 0;
  const items = Array.isArray(localData) ? localData : Object.entries(localData || {}).map(([key, value]) => ({ id: key, localId: key, venditore: key, stato: value }));
  for(let i = 0; i < items.length; i++){
    const item = normalizeItem(items[i], i);
    const id = docIdFor(item, i);
    if(existingKeys.has(id)){ continue; }
    await setDoc(doc(db, collectionName, id), asFirestorePayload({ ...item, firestoreId: id }, i), { merge: true });
    migrated++;
  }
  await syncFirestoreToLocalStorage(collectionName);
  return { migrated, total: items.length };
}
export async function saveVendorStatuses(statuses){
  const entries = Object.entries(statuses || {});
  for(const [vendor, status] of entries){
    await setDoc(doc(db, "vendorStatuses", vendor.replaceAll("/", "-")), { id: vendor, localId: vendor, venditore: vendor, stato: status, updatedAt: serverTimestamp() }, { merge: true });
  }
  localStorage.setItem("statiVenditoriTopHouse", JSON.stringify(statuses || {}));
}

// Elenco venditori: quelli storici passati dalla pagina + quelli aggiunti da "Venditori" (raccolta vendorProfiles).
export async function readVendorNames(baseNames = []){
  let profili = [];
  try{ profili = await readCollection("vendorProfiles"); }
  catch(e){ profili = readLocal("vendorProfilesTopHouse", []); }
  const pulisci = v => String(v || "").trim();
  const inattivi = new Set(profili.filter(v => v.attivo === false).map(v => pulisci(v.nome)));
  const tutti = [...new Set([...baseNames.map(pulisci), ...profili.map(v => pulisci(v.nome))].filter(Boolean))];
  return {
    tutti: tutti.sort((a, b) => a.localeCompare(b, "it")),
    attivi: tutti.filter(nome => !inattivi.has(nome)).sort((a, b) => a.localeCompare(b, "it"))
  };
}
