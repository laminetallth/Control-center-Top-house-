window.__crmBooted=true;
let db=null;
let firestoreApi={};
let firebaseApp=null, authInstance=null, authApi=null, firebaseAuthUser=null;
let automationLogs=[];
let statsSelectedSeller="";

const KEY="topHouseCRM";
const SERVICES=["Luce","Gas","Luce + Gas","Fibra","Telefonia Mobile","Telefonia Fissa","Luce + Gas + Fibra","Fotovoltaico","Fotovoltaico + Accumulo","Caldaia","Climatizzatore","Pompa di calore","Infissi","Depuratore","Allarme","Wall Box","Altro"];
const MANAGERS=["A2A","ACEA","Alperia","Cogeme","Duferco","Enel","Enel Digital","Engie","GDE","Hera","Iren","Onova","S4","Simecom","Sorgenia","Stream","Unoenergy","Vivienergia","Plenitude","Union Energia","TIM","Fastweb","WindTre","Vodafone","Sky Wifi","WINDTRE","Altro"];
let SELLERS=["Lamine Tall","Gabriele Straniero","Francesco Cecchini","Hajar Sadiq","Sarah Cavedo","Dardan Gashi","Andrea Cerminare","Benedetto Cavallo"];
const STATUSES=["Inserito","In lavorazione","OK","KO","Storno"];
const SOURCES=["Affiliato","Venditore","Referenze","Sito","Social","Passaparola","Centro commerciale","Negozio","Altro"];
const defaultData={contracts:[],affiliates:[],leads:[],events:[],plans:[{id:1,name:"Piano Compensi STD",description:"Piano compensi personale",updated:"Ottobre 2026"}]};
let data=structuredClone(defaultData),currentPage="dashboard",currentUser=null,cloudUnsubscribe=null,cloudReady=false,currentProfile=null,userProfiles=[];
const ROLE_LABELS={admin:"Amministratore",manager:"Capo venditore",seller:"Venditore"};
const ROLE_NAMES={admin:"Admin",manager:"Capo venditore",seller:"Venditore"};
let secondaryAuth=null,configProblem="",localMode=false,baseData=null;
const fsCall=name=>(...args)=>firestoreApi[name](...args);
const getDocs=fsCall("getDocs"),getDoc=fsCall("getDoc"),setDoc=fsCall("setDoc"),doc=fsCall("doc"),collection=fsCall("collection"),serverTimestamp=fsCall("serverTimestamp");
async function createUserWithEmailAndPassword(auth,email,password){
  if(!auth)throw Object.assign(new Error("Servizio account non pronto"),{code:"crm/auth-not-ready"});
  const cred=await authApi.createUserWithEmailAndPassword(auth,email,password);
  try{await authApi.signOut(auth)}catch(e){}
  return cred;
}
function authErrorMessage(err){
  const code=String(err?.code||err?.message||"");
  if(code.includes("api-key-not-valid")||code.includes("invalid-api-key"))return "La chiave Firebase del CRM non è valida: va corretta in crm/js/firebase.js.";
  if(/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(code))return "Email o password non corretti.";
  if(code.includes("too-many-requests"))return "Troppi tentativi: riprova tra qualche minuto.";
  if(code.includes("network-request-failed"))return "Connessione assente: controlla internet e riprova.";
  if(code.includes("email-already-in-use"))return "Esiste già un account con questa email.";
  if(code.includes("weak-password"))return "Password troppo corta: servono almeno 6 caratteri.";
  if(code.includes("user-disabled"))return "Questo account è stato disattivato.";
  if(code.includes("crm/no-profile"))return "Questo account non è abilitato al CRM: chiedi all'amministratore di crearti l'accesso.";
  if(code.includes("permission-denied"))return "Permessi Firebase insufficienti: vanno pubblicate le regole del CRM.";
  return "Operazione non riuscita"+(code?" ("+code+")":"")+".";
}
function isAdmin(){return currentProfile?.role==="admin"}
function isManager(){return currentProfile?.role==="manager"}
function visibleSellerNames(){if(isAdmin())return SELLERS;if(isManager())return [currentProfile.name,...userProfiles.filter(u=>u.managerUid===currentUser.uid&&u.active!==false).map(u=>u.name)].filter(Boolean);return [currentProfile?.name||currentProfile?.sellerName||""];}
function visibleData(){const names=new Set(visibleSellerNames());return {...data,contracts:data.contracts.filter(c=>names.has(c.seller)),leads:data.leads.filter(x=>names.has(x.seller)),events:data.events.filter(x=>!x.seller||names.has(x.seller))}}
function canManageSeller(name){return isAdmin()||isManager()&&visibleSellerNames().includes(name)}
async function loadProfiles(){const snap=await getDocs(collection(db,"users"));userProfiles=snap.docs.map(d=>({uid:d.id,...d.data()}));const names=userProfiles.filter(u=>u.active!==false&&u.name).map(u=>u.name);SELLERS=[...new Set([...SELLERS,...names])]}
async function ensureProfile(user){
  const ref=doc(db,"users",user.uid),snap=await getDoc(ref);
  if(snap.exists()){currentProfile={uid:user.uid,...snap.data()};return}
  // Senza profilo si entra solo al primissimo accesso (diventa Admin). Tutti gli altri li crea l'Admin da "Utenti e ruoli".
  let empty=true;
  try{empty=(await getDocs(collection(db,"users"))).empty}catch(e){empty=true}
  const denied=()=>Object.assign(new Error("Profilo non autorizzato"),{code:"crm/no-profile"});
  if(!empty)throw denied();
  const name=user.email?.split("@")[0]||"Amministratore";
  const profile={email:user.email||"",name,sellerName:name,role:"admin",managerUid:null,managerName:"",active:true,createdAt:serverTimestamp()};
  try{await setDoc(ref,profile)}catch(e){throw denied()}
  currentProfile={uid:user.uid,...profile};toast("Primo account impostato come Admin");
}
const COLLECTIONS=["contracts","affiliates","leads","events","plans"];
function itemKey(x,i){return String(x&&x.id!=null?x.id:"idx-"+i)}
function diffData(base,cur){
  const ops=[];
  for(const k of COLLECTIONS){
    const before=new Map((base?.[k]||[]).map((x,i)=>[itemKey(x,i),JSON.stringify(x)]));
    const now=new Map((cur[k]||[]).map((x,i)=>[itemKey(x,i),x]));
    for(const [id,x] of now)if(before.get(id)!==JSON.stringify(x))ops.push({k,id,x});
    for(const id of before.keys())if(!now.has(id))ops.push({k,id,del:true});
  }
  return ops;
}
function applyOps(server,ops){
  const out={...defaultData,...server};
  for(const k of COLLECTIONS)out[k]=(out[k]||[]).slice();
  for(const op of ops){const list=out[op.k],i=list.findIndex((x,j)=>itemKey(x,j)===op.id);if(op.del){if(i>=0)list.splice(i,1)}else if(i>=0)list[i]=op.x;else list.push(op.x)}
  return out;
}
function onlyCollections(d){return JSON.parse(JSON.stringify(Object.fromEntries(COLLECTIONS.map(k=>[k,d[k]||[]]))))}
function upsert(list,obj){const i=list.findIndex(x=>String(x.id)===String(obj.id));if(i>=0)list[i]={...list[i],...obj};else list.push(obj)}
async function save(){
  if(!localMode&&!currentUser)return;
  localStorage.setItem(KEY,JSON.stringify(data));
  if(localMode||!cloudReady||!db||!firestoreApi.runTransaction)return;
  const ops=diffData(baseData,data);
  if(!ops.length)return;
  const fs=firestoreApi,ref=fs.doc(db,"crmData","main");
  try{
    // Si rilegge il documento aggiornato e si applicano solo le pratiche toccate: nessuno sovrascrive il lavoro degli altri.
    const merged=await fs.runTransaction(db,async tx=>{
      const snap=await tx.get(ref);
      const next=onlyCollections(applyOps(snap.exists()?snap.data():{},ops));
      tx.set(ref,{...next,updatedAt:fs.serverTimestamp(),updatedBy:currentUser?.uid||""},{merge:true});
      return next;
    });
    baseData=merged;
  }catch(err){console.error("Firebase save error",err);toast(err?.code==="permission-denied"?"Non salvato: permessi Firebase insufficienti":"Non salvato sul cloud: controlla la connessione e riprova")}
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function money(n){return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(n)||0)}
function toast(t){const x=document.querySelector("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2200)}
function options(arr,selected="",first=""){return (first?'<option value="">'+first+"</option>":"")+arr.map(x=>'<option '+(x===selected?"selected":"")+'>'+esc(x)+"</option>").join("")}
function setPage(p){if(p==="users"&&!isAdmin()&&!isManager())return toast("Area riservata ai responsabili");currentPage=p;document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===p));document.querySelector("#page-title").textContent={dashboard:"Dashboard",contracts:"Contratti",clients:"I miei clienti",leads:"Lead",calendar:"Calendario",stats:"Statistiche",affiliates:"Affiliati",plans:"Piano compensi",status:"Stato contratti",users:"Utenti e ruoli",automations:"Automazioni email"}[p];render()}
function render(){const e=document.querySelector("#page-content"),fullData=data;data=visibleData();e.innerHTML=currentPage==="dashboard"?dashboard():currentPage==="contracts"?contracts():currentPage==="clients"?clients():currentPage==="leads"?leads():currentPage==="calendar"?calendar():currentPage==="stats"?statsPage():currentPage==="affiliates"?affiliates():currentPage==="plans"?plans():currentPage==="users"?usersPage():currentPage==="automations"?automationsPage():statusPage();data=fullData;bindPage()}
function dashboard(){const cs=data.contracts,total=cs.reduce((n,c)=>n+(c.service==="Luce + Gas"?2:1),0),ok=cs.filter(c=>c.status==="OK").length,pending=cs.filter(c=>!["OK","KO","Storno"].includes(c.status)).length,value=cs.reduce((s,c)=>s+Number(c.price||0),0),exp=cs.filter(c=>c.offerExpiry&&new Date(c.offerExpiry)>=new Date()&&new Date(c.offerExpiry)<=new Date(Date.now()+30*864e5)).length;return '<section class="stats"><div class="stat"><div class="stat-label">Contratti</div><div class="stat-value">'+total+'</div><div class="stat-note">Luce + Gas vale 2 contratti</div></div><div class="stat"><div class="stat-label">Contratti OK</div><div class="stat-value">'+ok+'</div><div class="stat-note">Pratiche valide</div></div><div class="stat"><div class="stat-label">In lavorazione</div><div class="stat-value">'+pending+'</div><div class="stat-note">Da verificare</div></div><div class="stat"><div class="stat-label">Valore offerte</div><div class="stat-value small-value">'+money(value)+'</div><div class="stat-note">'+exp+' in scadenza entro 30 giorni</div></div></section><div class="quick-grid"><button class="quick-card" id="quick-contract"><b>＋ Nuovo contratto</b><span>Inserisci una nuova pratica</span></button><button class="quick-card" id="quick-status"><b>◷ Controlla stati</b><span>Segui OK, KO e storni</span></button><button class="quick-card" id="quick-affiliate"><b>♧ Nuovo affiliato</b><span>Aggiungi un partner commerciale</span></button></div><div class="grid-2"><section class="panel"><div class="panel-head"><div><h2>Ultimi contratti</h2><div class="panel-sub">Le pratiche più recenti</div></div><button class="link-btn" data-go="contracts">Vedi tutti →</button></div>'+contractTable(cs.slice(-8).reverse())+'</section><section class="panel"><div class="panel-head"><div><h2>Attenzione</h2><div class="panel-sub">Attività da non dimenticare</div></div></div>'+alerts(cs)+'</section></div>'}
function alerts(cs){const today=new Date(), soon=cs.filter(c=>c.offerExpiry&&new Date(c.offerExpiry)>=today&&new Date(c.offerExpiry)<=new Date(Date.now()+30*864e5));if(!soon.length)return '<div class="empty compact">Nessuna scadenza nei prossimi 30 giorni.</div>';return '<div class="alert-list">'+soon.slice(0,6).map(c=>'<div class="alert-row"><div><b>'+esc(c.name)+'</b><span>'+esc(c.service)+' · '+esc(c.manager)+'</span></div><strong>'+esc(c.offerExpiry)+'</strong></div>').join("")+'</div>'}
function contractTable(list){if(!list.length)return '<div class="empty">Nessun contratto ancora. Inserisci il primo.</div>';return '<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Firma</th><th>Servizio</th><th>Gestore</th><th>Venditore</th><th>Prezzo</th><th>Stato</th><th></th></tr></thead><tbody>'+list.map(c=>'<tr><td><b>'+esc(c.name)+'</b><span class="subcell">'+esc(c.phone||"")+'</span></td><td>'+esc(c.date)+'</td><td>'+esc(c.service)+'</td><td>'+esc(c.manager)+'</td><td>'+esc(c.seller)+'</td><td>'+money(c.price)+'</td><td><span class="badge '+badge(c.status)+'">'+esc(c.status)+'</span></td><td><button class="icon-btn edit-contract" data-id="'+c.id+'">✎</button><button class="icon-btn delete-contract" data-id="'+c.id+'">×</button></td></tr>').join("")+'</tbody></table></div>'}
function badge(s){return s==="OK"?"ok":s==="KO"||s==="Storno"?"ko":"pending"}
function contracts(){return '<section class="panel"><div class="panel-head"><div><h2>Gestione contratti</h2><div class="panel-sub">Clienti, servizi, gestori, condizioni commerciali e stato pratica.</div></div><button class="primary" id="new-contract">+ Nuovo contratto</button></div><div class="filters"><input class="input grow" id="contract-search" placeholder="Cerca cliente, telefono, email..."><select class="select" id="contract-service">'+options(SERVICES,"","Tutti i servizi")+'</select><select class="select" id="contract-manager">'+options(MANAGERS,"","Tutti i gestori")+'</select><select class="select" id="contract-status">'+options(STATUSES,"","Tutti gli stati")+'</select></div><div id="contracts-table">'+contractTable(data.contracts.slice().reverse())+'</div></section>'}
function clients(){let list=data.contracts.slice();return '<section class="panel"><div class="panel-head"><div><h2>I miei clienti</h2><div class="panel-sub">Tutti i clienti associati alle tue pratiche.</div></div><div class="client-count"><b>'+list.length+'</b> clienti</div></div><div class="filters"><input class="input grow" id="client-search" placeholder="Cerca nome, email, telefono, città..."><select class="select" id="client-sort"><option value="new">Più recenti</option><option value="old">Più vecchi</option><option value="az">Nome A → Z</option><option value="za">Nome Z → A</option><option value="price-high">Prezzo più alto</option><option value="price-low">Prezzo più basso</option></select><select class="select" id="client-service">'+options(SERVICES,"","Tutti i servizi")+'</select><select class="select" id="client-manager">'+options(MANAGERS,"","Tutti i gestori")+'</select><select class="select" id="client-seller">'+options(visibleSellerNames(),"","Tutti i venditori")+'</select><select class="select" id="client-status">'+options(STATUSES,"","Tutti gli stati")+'</select></div><div id="clients-table">'+clientTable(list)+'</div></section>'}
function clientTable(list){if(!list.length)return '<div class="empty">Nessun cliente trovato.</div>';return '<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Email</th><th>Telefono</th><th>Città</th><th>Prezzo</th><th>Gestore</th><th>Data stipula</th><th>Servizio</th><th>Venditore</th><th>Stato</th><th>Email</th></tr></thead><tbody>'+list.map(c=>'<tr><td><b>'+esc(c.name)+'</b><span class="subcell">'+(c.birthday?("Compleanno: "+esc(c.birthday)):"")+'</span></td><td>'+esc(c.email||"—")+'</td><td>'+esc(c.phone||"—")+'</td><td>'+esc(c.city||"—")+'</td><td>'+money(c.price)+'</td><td>'+esc(c.manager)+'</td><td>'+esc(c.date)+'</td><td>'+esc(c.service)+'</td><td>'+esc(c.seller)+'</td><td><span class="badge '+badge(c.status)+'">'+esc(c.status)+'</span></td><td><button class="secondary send-welcome" data-id="'+esc(c.id)+'">Invia benvenuto</button></td></tr>').join("")+'</tbody></table></div>'}

function leads(){let l=data.leads.slice().sort((a,b)=>String(b.created||"").localeCompare(String(a.created||"")));return '<section class="panel"><div class="panel-head"><div><h2>Lead e opportunità</h2><div class="panel-sub">Clienti potenziali e possibili vendite da seguire fino alla chiusura.</div></div><button class="primary" id="new-lead">+ Nuovo lead</button></div><div class="lead-summary"><div><b>'+l.length+'</b><span>Lead totali</span></div><div><b>'+money(l.filter(x=>x.stage==="Caldo").reduce((s,x)=>s+Number(x.value||0),0))+'</b><span>Opportunità calde</span></div><div><b>'+l.filter(x=>x.stage==="Chiuso").length+'</b><span>Vendite chiuse</span></div></div><div class="filters"><input class="input grow" id="lead-search" placeholder="Cerca nome, telefono, email, città..."><select class="select" id="lead-stage"><option value="">Tutti gli stati</option><option>Nuovo</option><option>Contattato</option><option>Interessato</option><option>Caldo</option><option>Chiuso</option><option>Perso</option></select><select class="select" id="lead-service">'+options(SERVICES,"","Tutti i servizi")+'</select><select class="select" id="lead-seller">'+options(SELLERS,"","Tutti i venditori")+'</select></div><div id="leads-table">'+leadTable(l)+'</div></section>'}
function leadTable(list){if(!list.length)return '<div class="empty">Nessun lead. Inserisci la prima possibile vendita.</div>';return '<div class="table-wrap"><table><thead><tr><th>Cliente potenziale</th><th>Contatti</th><th>Servizio</th><th>Valore</th><th>Stato</th><th>Prossimo contatto</th><th>Venditore</th><th></th></tr></thead><tbody>'+list.map(x=>'<tr><td><b>'+esc(x.name)+'</b><span class="subcell">'+esc(x.city||"")+'</span></td><td>'+esc(x.phone||"—")+'<span class="subcell">'+esc(x.email||"")+'</span></td><td>'+esc(x.service||"—")+(x.manager?'<span class="subcell">'+esc(x.manager)+'</span>':"")+'</td><td>'+money(x.value)+'</td><td><span class="lead-stage '+(x.stage==="Caldo"?"hot":x.stage==="Chiuso"?"closed":x.stage==="Perso"?"lost":"open")+'">'+esc(x.stage)+'</span></td><td>'+esc(x.nextContact||"—")+'</td><td>'+esc(x.seller||"—")+'</td><td><button class="icon-btn edit-lead" data-id="'+x.id+'">✎</button><button class="icon-btn delete-lead" data-id="'+x.id+'">×</button></td></tr>').join("")+'</tbody></table></div>'}
function calendar(){let ev=data.events.slice().sort((a,b)=>(a.date+" "+a.time).localeCompare(b.date+" "+b.time));return '<section class="calendar-layout"><section class="panel"><div class="panel-head"><div><h2>Agenda Top House</h2><div class="panel-sub">Appuntamenti, richiami e note commerciali.</div></div><button class="primary" id="new-event">+ Nuovo appuntamento</button></div><div class="calendar-list">'+(ev.length?ev.map(x=>'<article class="event-card"><div class="event-date"><b>'+new Date(x.date+"T12:00").getDate()+'</b><span>'+new Date(x.date+"T12:00").toLocaleDateString("it-IT",{weekday:"short",month:"short"})+'</span></div><div class="event-main"><div><span class="event-type">'+esc(x.type)+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.notes||"Nessuna nota")+'</p></div><div class="event-meta"><b>'+esc(x.time||"")+'</b><span>'+esc(x.client||"")+'</span></div></div><div class="event-actions"><button class="icon-btn edit-event" data-id="'+x.id+'">✎</button><button class="icon-btn delete-event" data-id="'+x.id+'">×</button></div></article>').join(""):'<div class="empty">Nessun appuntamento. Crea il primo dalla tua agenda.</div>')+'</div></section><aside class="panel agenda-tips"><h2>Da ricordare</h2><div class="tip"><b>📅 Appuntamenti</b><span>Segna ora, cliente e motivo dell’incontro.</span></div><div class="tip"><b>📝 Note</b><span>Salva le informazioni utili per il prossimo contatto.</span></div><div class="tip"><b>🔥 Lead</b><span>Trasforma i contatti interessati in opportunità.</span></div></aside></section>'}
function statsPage(){const now=new Date(),seller=statsSelectedSeller||data.contracts[0]?.seller||"Lamine Tall",months=[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1),key=d.toISOString().slice(0,7),label=d.toLocaleDateString("it-IT",{month:"short",year:"numeric"}),n=data.contracts.filter(c=>String(c.date||"").slice(0,7)===key&&(c.seller||"")===seller).reduce((a,c)=>a+(c.service==="Luce + Gas"?2:1),0);months.push({label,n})}const mine=data.contracts.filter(c=>(c.seller||"")===seller),total=mine.reduce((a,c)=>a+(c.service==="Luce + Gas"?2:1),0),value=mine.reduce((a,c)=>a+Number(c.price||0),0),last=months[5]?.n||0,prev=months[4]?.n||0,diff=last-prev;return '<section class="stats"><div class="stat"><div class="stat-label">I miei contratti</div><div class="stat-value">'+total+'</div><div class="stat-note">Luce + Gas vale 2</div></div><div class="stat"><div class="stat-label">Questo mese</div><div class="stat-value">'+last+'</div><div class="stat-note">'+(diff>=0?"+":"")+diff+' rispetto al mese scorso</div></div><div class="stat"><div class="stat-label">Mese scorso</div><div class="stat-value">'+prev+'</div><div class="stat-note">Contratti acquisiti</div></div><div class="stat"><div class="stat-label">Valore totale</div><div class="stat-value small-value">'+money(value)+'</div><div class="stat-note">Delle pratiche di '+esc(seller)+'</div></div></section><section class="panel"><div class="panel-head"><div><h2>Andamento vendite</h2><div class="panel-sub">Ultimi 6 mesi · venditore: '+esc(seller)+'</div></div><select class="select" id="stats-seller">'+options(visibleSellerNames(),seller)+'</select></div><div class="bars">'+months.map(x=>'<div class="bar-col"><b>'+x.n+'</b><div class="bar" style="height:'+Math.max(8,x.n*28)+'px"></div><span>'+x.label+'</span></div>').join("")+'</div></section>'}
function usersPage(){
const manageable=userProfiles.filter(u=>u.active!==false&&((isAdmin())||(isManager()&&(u.uid===currentUser.uid||u.managerUid===currentUser.uid))));
 return '<section class="panel"><div class="panel-head"><div><h2>Utenti e ruoli</h2><div class="panel-sub">Crea credenziali, assegna ruoli e collega i venditori ai loro responsabili.</div></div>'+(isAdmin()?'<button class="primary" id="new-user">+ Crea credenziali</button>':'<span class="role-pill">Gestione sub-venditori</span>')+'</div><div class="role-grid">'+(manageable.map(u=>'<article class="user-card"><div><div class="user-name">'+esc(u.name||u.email)+'</div><div class="user-email">'+esc(u.email)+'</div></div><span class="role-tag role-'+esc(u.role)+'">'+esc(ROLE_LABELS[u.role]||u.role)+'</span><div class="user-meta"><span>Responsabile: <b>'+esc(u.managerName||"Nessuno")+'</b></span><span>'+((data.contracts||[]).filter(c=>c.seller===u.name).length)+' pratiche</span></div>'+(u.uid!==currentUser.uid&&isAdmin()?'<div class="user-actions"><button class="secondary edit-user" data-uid="'+u.uid+'">Modifica</button><button class="icon-btn delete-user" data-uid="'+u.uid+'">×</button></div>':'')+'</article>').join("")||'<div class="empty">Nessun utente configurato.</div>')+'</div></section>';
}
function openUser(existing){const u=existing||{},allowedRoles=isAdmin()?["admin","manager","seller"]:["seller"],managers=userProfiles.filter(x=>x.role==="manager"&&x.active!==false&&x.uid!==u.uid);const m=modal('<div class="modal-head"><div><div class="eyebrow">TOP HOUSE · RETE</div><h2>'+(existing?"Modifica utente":"Crea nuove credenziali")+'</h2></div><button class="close">×</button></div><form><div class="form-grid"><div class="field"><label>Nome e cognome *</label><input class="input" name="name" value="'+esc(u.name)+'" required></div><div class="field"><label>Email *</label><input class="input" name="email" type="email" value="'+esc(u.email)+'" '+(existing?'readonly':'required')+'></div>'+(existing?'':'<div class="field"><label>Password temporanea *</label><input class="input" name="password" type="password" minlength="6" required></div>')+'<div class="field"><label>Ruolo *</label><select class="select" name="role">'+options(allowedRoles,u.role||"seller")+'</select></div><div class="field"><label>Responsabile / capo venditore</label><select class="select" name="managerUid"><option value="">Nessuno</option>'+managers.map(x=>'<option value="'+x.uid+'" '+(x.uid===u.managerUid?'selected':'')+'>'+esc(x.name)+'</option>').join("")+'</select></div><div class="field"><label>Stato</label><select class="select" name="active"><option value="true" '+(u.active!==false?'selected':'')+'>Attivo</option><option value="false" '+(u.active===false?'selected':'')+'>Disattivato</option></select></div></div><div class="form-actions"><button type="button" class="secondary cancel">Annulla</button><button class="primary">'+(existing?"Salva modifiche":"Crea account")+'</button></div></form>');m.querySelector(".close").onclick=()=>closeModal(m);m.querySelector(".cancel").onclick=()=>closeModal(m);m.querySelector("form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);if(isManager())f.set("managerUid",currentUser.uid);const manager=userProfiles.find(x=>x.uid===f.get("managerUid"));try{if(existing){await setDoc(doc(db,"users",existing.uid),{name:f.get("name"),role:f.get("role"),managerUid:f.get("managerUid")||null,managerName:manager?.name||"",active:f.get("active")==="true"},{merge:true});toast("Utente aggiornato")}else{const cred=await createUserWithEmailAndPassword(secondaryAuth,f.get("email").trim(),f.get("password"));await setDoc(doc(db,"users",cred.user.uid),{email:f.get("email").trim(),name:f.get("name"),sellerName:f.get("name"),role:f.get("role"),managerUid:f.get("managerUid")||null,managerName:manager?.name||"",active:true,createdAt:serverTimestamp()});toast("Credenziali create")}await loadProfiles();closeModal(m);render()}catch(err){console.error(err);toast(authErrorMessage(err))}}}
function affiliates(){return '<section class="panel"><div class="panel-head"><div><h2>Affiliati e partner</h2><div class="panel-sub">CAF, agenzie, venditori e partner che generano produzione.</div></div><button class="primary" id="new-affiliate">+ Nuovo affiliato</button></div><div class="section-grid">'+(data.affiliates.map(a=>'<article class="affiliate-card"><div class="affiliate-top"><div><div class="affiliate-name">'+esc(a.name)+'</div><div class="affiliate-type">'+esc(a.type)+' · '+esc(a.status)+'</div></div><div class="percent">'+esc(a.percent)+'%</div></div><div class="panel-sub affiliate-note">'+esc(a.phone||"")+' '+esc(a.email||"")+'</div></article>').join("")||'<div class="empty">Nessun affiliato.</div>')+'</div></section>'}
function plans(){return '<section class="panel"><div class="panel-head"><div><h2>Piani compensi</h2><div class="panel-sub">Area dedicata ai piani della rete vendita.</div></div></div><div class="section-grid">'+data.plans.map(p=>'<article class="affiliate-card"><div class="affiliate-name">'+esc(p.name)+'</div><div class="affiliate-type">'+esc(p.description)+'</div><div class="plan-date">Ultimo aggiornamento: <b>'+esc(p.updated)+'</b></div><button class="secondary">Apri piano</button></article>').join("")+'</div></section>'}
function automationsPage(){return '<section class="panel"><div class="panel-head"><div><h2>Registro automazioni email</h2><div class="panel-sub">Invii di benvenuto, auguri e promemoria scadenza.</div></div><button class="secondary" id="refresh-automations">↻ Aggiorna registro</button></div><div class="filters"><select class="select" id="automation-type"><option value="">Tutte le automazioni</option><option value="welcome">Benvenuto</option><option value="birthday">Compleanno</option><option value="expiry">Scadenza offerta · cliente</option><option value="expiry-seller">Scadenza offerta · venditore</option></select><select class="select" id="automation-status"><option value="">Tutti gli stati</option><option value="sent">Inviata</option><option value="sending">In corso</option><option value="failed">Errore</option></select></div><div id="automation-table">'+automationTable(automationLogs)+'</div></section>'}
function automationTable(list){if(!list.length)return '<div class="empty">Nessun invio registrato. Gli invii effettuati dal sistema compariranno qui.</div>';return '<div class="table-wrap"><table><thead><tr><th>Data</th><th>Automazione</th><th>Cliente</th><th>Destinatario</th><th>Servizio</th><th>Stato</th><th>Dettaglio</th></tr></thead><tbody>'+list.map(x=>'<tr><td>'+esc(x.updatedAt||x.createdAt||x.scheduledFor||"—")+'</td><td>'+esc(({welcome:"Benvenuto",birthday:"Compleanno",expiry:"Scadenza · cliente","expiry-seller":"Scadenza · venditore"})[x.type]||x.type||"—")+'</td><td>'+esc(x.clientName||"—")+'</td><td>'+esc(x.recipient||x.clientEmail||"—")+'</td><td>'+esc(x.service||"—")+'</td><td><span class="badge '+(x.status==="sent"?"ok":x.status==="failed"?"ko":"pending")+'">'+esc(({sent:"Inviata",sending:"In corso",failed:"Errore"})[x.status]||x.status||"—")+'</span></td><td>'+esc(x.error||x.expiryDate||"—")+'</td></tr>').join("")+'</tbody></table></div>'}
function statusPage(){const all=data.contracts.slice().reverse(),counts=Object.fromEntries(STATUSES.map(s=>[s,all.filter(c=>c.status===s).length]));return '<section class="stats"><div class="stat"><div class="stat-label">Totale</div><div class="stat-value">'+all.length+'</div></div><div class="stat"><div class="stat-label">In lavorazione</div><div class="stat-value">'+(counts.Inserito+counts["In lavorazione"])+'</div></div><div class="stat"><div class="stat-label">OK</div><div class="stat-value">'+counts.OK+'</div></div><div class="stat"><div class="stat-label">KO / Storno</div><div class="stat-value">'+(counts.KO+counts.Storno)+'</div></div></section><section class="panel"><div class="panel-head"><div><h2>Stato delle pratiche</h2><div class="panel-sub">Filtra e aggiorna rapidamente le tue pratiche.</div></div><select class="select" id="status-filter">'+options(STATUSES,"","Tutti gli stati")+'</select></div><div id="status-table">'+statusTable(all)+'</div></section>'}
function statusTable(list){if(!list.length)return '<div class="empty">Nessun contratto trovato.</div>';return '<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Servizio</th><th>Gestore</th><th>Venditore</th><th>Scadenza</th><th>Stato</th></tr></thead><tbody>'+list.map(c=>'<tr><td><b>'+esc(c.name)+'</b></td><td>'+esc(c.service)+'</td><td>'+esc(c.manager)+'</td><td>'+esc(c.seller)+'</td><td>'+esc(c.offerExpiry||"—")+'</td><td><select class="status-select" data-id="'+c.id+'">'+options(STATUSES,c.status)+'</select></td></tr>').join("")+'</tbody></table></div>'}
async function loadAutomationLogs(){
  if(!db||!firestoreApi.getDocs){automationLogs=[];return}
  try{
    const fs=firestoreApi;
    const snap=await fs.getDocs(fs.query(fs.collection(db,"automationLogs"),fs.orderBy("updatedAt","desc"),fs.limit(200)));
    const iso=value=>value&&typeof value.toDate==="function"?value.toDate().toISOString():value||"";
    automationLogs=snap.docs.map(d=>{const x=d.data();return {id:d.id,...x,createdAt:iso(x.createdAt),updatedAt:iso(x.updatedAt),sentAt:iso(x.sentAt),failedAt:iso(x.failedAt)}});
    const target=document.querySelector("#automation-table");if(target)target.innerHTML=automationTable(automationLogs);
  }catch(err){console.error(err);const target=document.querySelector("#automation-table");if(target)target.innerHTML='<div class="empty">Registro non disponibile: controlla i permessi Firestore della raccolta automationLogs.</div>'}
}
async function authenticateForAutomations(){
  if(firebaseAuthUser)return true;
  if(!authApi||!authInstance){toast("Servizio di autenticazione non ancora caricato");return false}
  const m=modal('<div class="modal-head"><div><div class="eyebrow">TOP HOUSE</div><h2>Accedi per inviare email</h2></div><button class="close">×</button></div><form><div class="field"><label>Email aziendale</label><input class="input" type="email" name="email" required autocomplete="username"></div><div class="field"><label>Password Firebase</label><input class="input" type="password" name="password" required autocomplete="current-password"></div><p class="panel-sub">Usa un account già creato in Firebase Authentication e associato a un profilo CRM autorizzato.</p><div class="form-actions"><button type="button" class="secondary cancel">Annulla</button><button class="primary">Accedi</button></div></form>');
  m.querySelector(".close").onclick=m.querySelector(".cancel").onclick=()=>closeModal(m);
  return await new Promise(resolve=>{m.querySelector("form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const cred=await authApi.signInWithEmailAndPassword(authInstance,f.get("email"),f.get("password"));firebaseAuthUser=cred.user;closeModal(m);toast("Accesso autorizzato");resolve(true)}catch(err){toast("Accesso non riuscito: verifica email e password");resolve(false)}}});
}
async function sendWelcomeEmail(contractId){
  if(!await authenticateForAutomations())return;
  try{
    const fs=firestoreApi;
    const profileSnap=await fs.getDoc(fs.doc(db,"users",firebaseAuthUser.uid));
    if(!profileSnap.exists()||profileSnap.data().active===false){toast("Profilo CRM non autorizzato");return}
    const profile=profileSnap.data();
    const client=data.contracts.find(c=>String(c.id)===String(contractId));
    if(!client||!client.email){toast("Cliente non trovato o email mancante");return}
    if(profile.role!=="admin"&&client.seller!==profile.name){
      if(profile.role!=="manager"){toast("Non puoi inviare email per questo cliente");return}
      const assigned=await fs.getDocs(fs.query(fs.collection(db,"users"),fs.where("name","==",client.seller),fs.limit(1)));
      if(assigned.empty||assigned.docs[0].data().managerUid!==firebaseAuthUser.uid){toast("Cliente fuori dal tuo gruppo");return}
    }
    const queueRef=fs.doc(db,"emailQueue","welcome-"+String(contractId));
    const existing=await fs.getDoc(queueRef);
    if(existing.exists()&&existing.data().status==="sent"){toast("Email di benvenuto già inviata");return}
    await fs.setDoc(queueRef,{type:"welcome",contractId:String(contractId),requestedBy:firebaseAuthUser.uid,status:"pending",createdAt:fs.serverTimestamp(),error:null},{merge:true});
    toast("Richiesta accodata: invio entro circa un'ora");
    await loadAutomationLogs();
    if(currentPage==="automations")render();
  }catch(err){console.error(err);toast("Richiesta non accodata: controlla i permessi Firestore")}
}
function bindPage(){
const byId=id=>document.querySelector("#"+id);
byId("new-user")?.addEventListener("click",()=>openUser());
document.querySelectorAll(".edit-user").forEach(button=>button.onclick=()=>openUser(userProfiles.find(user=>user.uid===button.dataset.uid)));
document.querySelectorAll(".delete-user").forEach(button=>button.onclick=async()=>{if(!confirm("Disattivare questo utente?"))return;try{await firestoreApi.setDoc(firestoreApi.doc(db,"users",button.dataset.uid),{active:false},{merge:true});await loadProfiles();render();toast("Utente disattivato")}catch(error){console.error(error);toast("Impossibile aggiornare l'utente")}});
document.querySelectorAll("[data-go]").forEach(button=>button.onclick=()=>setPage(button.dataset.go));
const top=byId("new-contract-top"),contract=byId("new-contract"),affiliate=byId("new-affiliate"),lead=byId("new-lead"),event=byId("new-event");
if(top)top.onclick=openContract;if(contract)contract.onclick=openContract;if(affiliate)affiliate.onclick=openAffiliate;if(lead)lead.onclick=openLead;if(event)event.onclick=openEvent;
byId("quick-contract")?.addEventListener("click",openContract);
document.querySelectorAll(".send-welcome").forEach(button=>button.onclick=()=>sendWelcomeEmail(button.dataset.id));byId("quick-status")?.addEventListener("click",()=>setPage("status"));byId("quick-affiliate")?.addEventListener("click",openAffiliate);
const search=byId("contract-search");
if(search){const filter=()=>{let list=data.contracts.slice().reverse(),q=search.value.toLowerCase(),service=byId("contract-service").value,manager=byId("contract-manager").value,status=byId("contract-status").value;if(q)list=list.filter(c=>(c.name+" "+c.phone+" "+c.email).toLowerCase().includes(q));if(service)list=list.filter(c=>c.service===service);if(manager)list=list.filter(c=>c.manager===manager);if(status)list=list.filter(c=>c.status===status);byId("contracts-table").innerHTML=contractTable(list);bindContractActions()};["contract-search","contract-service","contract-manager","contract-status"].forEach(id=>byId(id).addEventListener("input",filter));bindContractActions();}
const clientSearch=byId("client-search");
if(clientSearch){const filter=()=>{let list=data.contracts.slice(),q=clientSearch.value.toLowerCase(),sort=byId("client-sort").value,service=byId("client-service").value,manager=byId("client-manager").value,seller=byId("client-seller").value,status=byId("client-status").value;if(q)list=list.filter(c=>(c.name+" "+c.email+" "+c.phone+" "+c.city).toLowerCase().includes(q));if(service)list=list.filter(c=>c.service===service);if(manager)list=list.filter(c=>c.manager===manager);if(seller)list=list.filter(c=>c.seller===seller);if(status)list=list.filter(c=>c.status===status);if(sort==="new")list.sort((a,b)=>String(b.date).localeCompare(String(a.date)));if(sort==="old")list.sort((a,b)=>String(a.date).localeCompare(String(b.date)));if(sort==="az")list.sort((a,b)=>a.name.localeCompare(b.name,"it"));if(sort==="za")list.sort((a,b)=>b.name.localeCompare(a.name,"it"));if(sort==="price-high")list.sort((a,b)=>Number(b.price||0)-Number(a.price||0));if(sort==="price-low")list.sort((a,b)=>Number(a.price||0)-Number(b.price||0));byId("clients-table").innerHTML=clientTable(list);document.querySelectorAll(".send-welcome").forEach(button=>button.onclick=()=>sendWelcomeEmail(button.dataset.id))};["client-search","client-sort","client-service","client-manager","client-seller","client-status"].forEach(id=>byId(id).addEventListener("input",filter));}
const statusFilter=byId("status-filter");if(statusFilter)statusFilter.onchange=()=>{let list=data.contracts.slice().reverse();if(statusFilter.value)list=list.filter(c=>c.status===statusFilter.value);byId("status-table").innerHTML=statusTable(list);bindStatusActions()};
const statsSeller=byId("stats-seller");if(statsSeller)statsSeller.onchange=()=>{statsSelectedSeller=statsSeller.value;setPage("stats")};
const refreshAuto=byId("refresh-automations");if(refreshAuto)refreshAuto.onclick=async()=>{if(await authenticateForAutomations())await loadAutomationLogs()};
const autoType=byId("automation-type"),autoStatus=byId("automation-status");if(autoType&&autoStatus){const filterAuto=()=>{let list=automationLogs.slice();if(autoType.value)list=list.filter(x=>x.type===autoType.value);if(autoStatus.value)list=list.filter(x=>x.status===autoStatus.value);byId("automation-table").innerHTML=automationTable(list)};autoType.onchange=filterAuto;autoStatus.onchange=filterAuto;loadAutomationLogs()}
bindLeadActions();bindEventActions();bindStatusActions();
}
function bindContractActions(){document.querySelectorAll(".edit-contract").forEach(b=>b.onclick=()=>{const c=data.contracts.find(c=>c.id==b.dataset.id);if(c&&!canManageSeller(c.seller))return toast("Non hai i permessi per questa pratica");openContract(c)});document.querySelectorAll(".delete-contract").forEach(b=>b.onclick=()=>{const c=data.contracts.find(c=>c.id==b.dataset.id);if(c&&!canManageSeller(c.seller))return toast("Non hai i permessi per questa pratica");if(confirm("Eliminare questo contratto?")){data.contracts=data.contracts.filter(c=>c.id!=b.dataset.id);save();render();toast("Contratto eliminato")}})}
function bindStatusActions(){document.querySelectorAll(".status-select").forEach(s=>s.onchange=()=>{const c=data.contracts.find(x=>x.id==s.dataset.id);if(c){c.status=s.value;save();toast("Stato aggiornato");render()}})}
function modal(html){const w=document.createElement("div");w.className="modal-backdrop open";w.innerHTML='<div class="modal">'+html+"</div>";document.body.appendChild(w);return w}function closeModal(m){m.remove()}
function contractExtra(service,c){
const both=service==="Luce + Gas",luce=service==="Luce",gas=service==="Gas";
const mgr=(l,n,v)=>'<div class="field"><label>'+l+'</label><select class="select" name="'+n+'" required>'+options(MANAGERS,v,"Seleziona gestore")+'</select></div>';
const pr=(l,n,v)=>'<div class="field"><label>'+l+'</label><input class="input" name="'+n+'" type="number" min="0" step=".01" value="'+esc(v||"")+'" placeholder="Es. 49,90"></div>';
const dur=(l,n,v)=>'<div class="field"><label>'+l+'</label><select class="select" name="'+n+'">'+options(["6 mesi","1 anno","2 anni","3 anni","4 anni","5 anni","10 anni"],v,"Seleziona durata")+'</select></div>';
const offer=(l,n,v)=>'<div class="field"><label>'+l+'</label><select class="select" name="'+n+'" required>'+options(["Fisso","Variabile"],v,"Seleziona tipo offerta")+'</select></div>';
if(both)return mgr("Gestore luce","managerLight",c.managerLight||c.manager||"")+offer("Tipo offerta luce","offerTypeLight",c.offerTypeLight||c.offerType||"")+pr("Prezzo luce (€)","priceLight",c.priceLight)+dur("Durata offerta luce","durationLight",c.durationLight)+mgr("Gestore gas","managerGas",c.managerGas||c.manager||"")+offer("Tipo offerta gas","offerTypeGas",c.offerTypeGas||c.offerType||"")+pr("Prezzo gas (€)","priceGas",c.priceGas)+dur("Durata offerta gas","durationGas",c.durationGas);
if(luce)return mgr("Gestore luce","managerLight",c.managerLight||c.manager||"")+offer("Tipo offerta","offerTypeLight",c.offerTypeLight||c.offerType||"")+pr("Prezzo luce (€)","priceLight",c.priceLight||c.price)+dur("Durata offerta","durationLight",c.durationLight||c.duration);
if(gas)return mgr("Gestore gas","managerGas",c.managerGas||c.manager||"")+offer("Tipo offerta","offerTypeGas",c.offerTypeGas||c.offerType||"")+pr("Prezzo gas (€)","priceGas",c.priceGas||c.price)+dur("Durata offerta","durationGas",c.durationGas||c.duration);
return pr("Prezzo servizio (€)","priceService",c.priceService||c.price);
}
function openContract(existing){
const c=existing||{};

const m=modal('<div class="modal-head"><div><div class="eyebrow">TOP HOUSE</div><h2>'+(existing?"Modifica contratto":"Nuovo contratto")+'</h2></div><button class="close">×</button></div><form><div class="form-section"><h3>1 · Cliente</h3><div class="form-grid"><div class="field"><label>Nome e cognome *</label><input class="input" name="name" value="'+esc(c.name)+'" required></div><div class="field"><label>Telefono *</label><input class="input" name="phone" value="'+esc(c.phone)+'" type="tel" required></div><div class="field"><label>Email *</label><input class="input" name="email" value="'+esc(c.email)+'" type="email" required></div><div class="field"><label>Città *</label><input class="input" name="city" value="'+esc(c.city)+'" required></div><div class="field"><label>Data di nascita</label><input class="input" type="date" name="birthday" value="'+esc(c.birthday)+'"></div></div></div><div class="form-section"><h3>2 · Servizio principale</h3><div class="field"><label>Seleziona servizio *</label><select class="select" id="contract-service-choice" name="service" required>'+options(SERVICES,c.service,"Seleziona servizio")+'</select></div></div><div id="dynamic-contract"></div><div class="form-section"><h3>Pratica</h3><div class="form-grid"><div class="field"><label>Data firma *</label><input class="input" type="date" name="date" value="'+esc(c.date||new Date().toISOString().slice(0,10))+'" required></div><div class="field"><label>Data prossimo contatto</label><input class="input" type="date" name="nextContact" value="'+esc(c.nextContact)+'"></div><div class="field"><label>RID</label><select class="select" name="rid">'+options(["RID","No RID"],c.rid||"RID")+'</select></div><div class="field"><label>Stato</label><select class="select" name="status">'+options(STATUSES,c.status||"In lavorazione")+'</select></div><div class="field full"><label>Note</label><textarea class="input textarea" name="notes">'+esc(c.notes)+'</textarea></div></div></div><div class="form-actions"><button type="button" class="secondary cancel">Annulla</button><button class="primary">'+(existing?"Salva modifiche":"Salva contratto")+'</button></div></form>');
const service=m.querySelector("#contract-service-choice"),dynamic=m.querySelector("#dynamic-contract");
const draw=()=>{
const v=service.value;
if(!v){dynamic.innerHTML="";return}
dynamic.innerHTML='<div class="form-section"><h3>3 · Tipologia e condizioni</h3><div class="form-grid"><div class="field"><label>Tipologia cliente *</label><select class="select" name="segment" required>'+options(["Residenziale","Business"],c.segment,"Seleziona tipologia")+'</select></div>'+contractExtra(v,c)+'</div></div><div class="form-section"><h3>Fonte contratto</h3><div class="form-grid"><div class="field"><label>Fonte</label><select class="select" id="contract-source" name="source">'+options(SOURCES,c.source,"Seleziona fonte")+'</select></div><div class="field" id="affiliate-comp-wrap" style="display:none"><label>Compenso affiliato (€)</label><input class="input" name="affiliateComp" type="number" min="0" step=".01" value="'+esc(c.affiliateComp)+'"></div><div class="field"><label>Venditore *</label><select class="select" name="seller" required>'+options(visibleSellerNames(),canManageSeller(c.seller)?c.seller:(c.seller||visibleSellerNames()[0]))+'</select></div></div></div>';
const src=m.querySelector("#contract-source"),wrap=m.querySelector("#affiliate-comp-wrap");
const toggle=()=>wrap.style.display=(src.value==="Affiliato"||src.value==="Venditore")?"":"none";src.onchange=toggle;toggle();
};
service.onchange=draw;
draw();
m.querySelector(".close").onclick=()=>closeModal(m);m.querySelector(".cancel").onclick=()=>closeModal(m);
m.querySelector("form").onsubmit=e=>{
e.preventDefault();const f=new FormData(e.target),v=f.get("service");
const price=v==="Luce + Gas"?Number(f.get("priceLight")||0)+Number(f.get("priceGas")||0):(["Luce","Gas"].includes(v)?Number(f.get("priceLight")||f.get("priceGas")||0):Number(f.get("priceService")||0));
const obj={id:c.id||Date.now(),name:f.get("name"),phone:f.get("phone"),email:f.get("email"),city:f.get("city"),birthday:f.get("birthday")||"",date:f.get("date"),nextContact:f.get("nextContact"),service:v,segment:f.get("segment"),managerLight:f.get("managerLight"),managerGas:f.get("managerGas"),manager:f.get("managerLight")||f.get("managerGas"),offerTypeLight:f.get("offerTypeLight"),offerTypeGas:f.get("offerTypeGas"),offerType:v==="Luce + Gas"?"Fisso/Variabile":(f.get("offerTypeLight")||f.get("offerTypeGas")||""),priceLight:f.get("priceLight"),priceGas:f.get("priceGas"),price,priceService:f.get("priceService")||"",additionalServices:[],additionalPrices:{},durationLight:f.get("durationLight"),durationGas:f.get("durationGas"),duration:f.get("durationLight")||f.get("durationGas"),rid:f.get("rid"),status:f.get("status"),seller:f.get("seller")||currentProfile?.name,source:f.get("source"),affiliateComp:f.get("affiliateComp"),notes:f.get("notes")};
upsert(data.contracts,obj);save();closeModal(m);render();toast(existing?"Contratto aggiornato":"Contratto inserito correttamente")
}}

function bindLeadActions(){document.querySelectorAll(".edit-lead").forEach(b=>b.onclick=()=>{const x=data.leads.find(x=>x.id==b.dataset.id);if(x&&!canManageSeller(x.seller))return toast("Non hai i permessi per questo lead");openLead(x)});document.querySelectorAll(".delete-lead").forEach(b=>b.onclick=()=>{const x=data.leads.find(x=>x.id==b.dataset.id);if(x&&!canManageSeller(x.seller))return toast("Non hai i permessi per questo lead");if(confirm("Eliminare questo lead?")){data.leads=data.leads.filter(x=>x.id!=b.dataset.id);save();render();toast("Lead eliminato")}});const q=document.querySelector("#lead-search");if(q){const f=()=>{let l=data.leads.slice(),qv=q.value.toLowerCase(),st=document.querySelector("#lead-stage").value,sv=document.querySelector("#lead-service").value,se=document.querySelector("#lead-seller").value;if(qv)l=l.filter(x=>(x.name+" "+x.phone+" "+x.email+" "+x.city).toLowerCase().includes(qv));if(st)l=l.filter(x=>x.stage===st);if(sv)l=l.filter(x=>x.service===sv);if(se)l=l.filter(x=>x.seller===se);document.querySelector("#leads-table").innerHTML=leadTable(l);bindLeadActions()};["lead-search","lead-stage","lead-service","lead-seller"].forEach(id=>document.querySelector("#"+id)?.addEventListener("input",f))}}
function bindEventActions(){document.querySelectorAll(".edit-event").forEach(b=>b.onclick=()=>openEvent(data.events.find(x=>x.id==b.dataset.id)));document.querySelectorAll(".delete-event").forEach(b=>b.onclick=()=>{if(confirm("Eliminare appuntamento?")){data.events=data.events.filter(x=>x.id!=b.dataset.id);save();render();toast("Appuntamento eliminato")}})}
function openLead(existing){const x=existing||{};const m=modal('<div class="modal-head"><div><div class="eyebrow">TOP HOUSE · OPPORTUNITÀ</div><h2>'+(existing?"Modifica lead":"Nuovo lead")+'</h2></div><button class="close">×</button></div><form><div class="form-section"><h3>Cliente potenziale</h3><div class="form-grid"><div class="field"><label>Nome e cognome *</label><input class="input" name="name" value="'+esc(x.name)+'" required></div><div class="field"><label>Telefono</label><input class="input" name="phone" value="'+esc(x.phone)+'" type="tel"></div><div class="field"><label>Email</label><input class="input" name="email" value="'+esc(x.email)+'" type="email"></div><div class="field"><label>Città</label><input class="input" name="city" value="'+esc(x.city)+'"></div></div></div><div class="form-section"><h3>Possibile vendita</h3><div class="form-grid"><div class="field"><label>Servizio *</label><select class="select" name="service" required>'+options(SERVICES,x.service)+'</select></div><div class="field"><label>Gestore</label><select class="select" name="manager">'+options(MANAGERS,x.manager,"Nessun gestore")+'</select></div><div class="field"><label>Valore stimato (€)</label><input class="input" name="value" type="number" min="0" step=".01" value="'+esc(x.value)+'"></div><div class="field"><label>Stato</label><select class="select" name="stage">'+options(["Nuovo","Contattato","Interessato","Caldo","Chiuso","Perso"],x.stage||"Nuovo")+'</select></div><div class="field"><label>Venditore</label><select class="select" name="seller">'+options(visibleSellerNames(),canManageSeller(x.seller)?x.seller:(x.seller||visibleSellerNames()[0]))+'</select></div><div class="field"><label>Prossimo contatto</label><input class="input" type="date" name="nextContact" value="'+esc(x.nextContact)+'"></div><div class="field full"><label>Note</label><textarea class="input textarea" name="notes" placeholder="Esigenze, offerta da proporre, obiezioni...">'+esc(x.notes)+'</textarea></div></div></div><div class="form-actions"><button type="button" class="secondary cancel">Annulla</button><button class="primary">'+(existing?"Salva modifiche":"Salva lead")+'</button></div></form>');m.querySelector(".close").onclick=()=>closeModal(m);m.querySelector(".cancel").onclick=()=>closeModal(m);m.querySelector("form").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),obj={id:x.id||Date.now(),created:x.created||new Date().toISOString(),name:f.get("name"),phone:f.get("phone"),email:f.get("email"),city:f.get("city"),service:f.get("service"),manager:f.get("manager"),value:f.get("value"),stage:f.get("stage"),seller:f.get("seller"),nextContact:f.get("nextContact"),notes:f.get("notes")};upsert(data.leads,obj);save();closeModal(m);render();toast(existing?"Lead aggiornato":"Lead inserito")}}
function openEvent(existing){const x=existing||{},today=new Date().toISOString().slice(0,10);const m=modal('<div class="modal-head"><div><div class="eyebrow">TOP HOUSE · AGENDA</div><h2>'+(existing?"Modifica appuntamento":"Nuovo appuntamento")+'</h2></div><button class="close">×</button></div><form><div class="form-grid"><div class="field full"><label>Titolo *</label><input class="input" name="title" value="'+esc(x.title)+'" placeholder="Es. Appuntamento cliente Rossi" required></div><div class="field"><label>Data *</label><input class="input" type="date" name="date" value="'+esc(x.date||today)+'" required></div><div class="field"><label>Ora</label><input class="input" type="time" name="time" value="'+esc(x.time||"09:00")+'"></div><div class="field"><label>Tipo</label><select class="select" name="type">'+options(["Appuntamento","Richiamo","Riunione","Nota","Altro"],x.type||"Appuntamento")+'</select></div><div class="field"><label>Cliente / Lead</label><input class="input" name="client" value="'+esc(x.client)+'" placeholder="Nome cliente"></div><div class="field full"><label>Note</label><textarea class="input textarea" name="notes" placeholder="Cosa devo ricordarmi?">'+esc(x.notes)+'</textarea></div></div><div class="form-actions"><button type="button" class="secondary cancel">Annulla</button><button class="primary">'+(existing?"Salva modifiche":"Salva appuntamento")+'</button></div></form>');m.querySelector(".close").onclick=()=>closeModal(m);m.querySelector(".cancel").onclick=()=>closeModal(m);m.querySelector("form").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),obj={id:x.id||Date.now(),title:f.get("title"),date:f.get("date"),time:f.get("time"),type:f.get("type"),client:f.get("client"),notes:f.get("notes")};upsert(data.events,obj);save();closeModal(m);render();toast(existing?"Appuntamento aggiornato":"Appuntamento salvato")}}

function openAffiliate(){const m=modal('<div class="modal-head"><h2>Nuovo affiliato</h2><button class="close">×</button></div><form id="affiliate-form"><div class="form-grid"><div class="field"><label>Nome / Ragione sociale *</label><input class="input" name="name" required></div><div class="field"><label>Tipo</label><select class="select" name="type">'+options(["CAF","Agenzia","Venditore","Partner","Altro"])+'</select></div><div class="field"><label>Percentuale</label><input class="input" name="percent" type="number" min="0" max="100" step=".1"></div><div class="field"><label>Telefono</label><input class="input" name="phone" type="tel"></div><div class="field full"><label>Email</label><input class="input" name="email" type="email"></div><div class="field"><label>Stato</label><select class="select" name="status"><option>Attivo</option><option>Inattivo</option></select></div></div><div class="form-actions"><button type="button" class="secondary cancel">Annulla</button><button class="primary">Salva affiliato</button></div></form>');m.querySelector(".close").onclick=()=>closeModal(m);m.querySelector(".cancel").onclick=()=>closeModal(m);m.querySelector("form").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);data.affiliates.push({id:Date.now(),name:f.get("name"),type:f.get("type"),percent:f.get("percent"),phone:f.get("phone"),email:f.get("email"),status:f.get("status")});save();closeModal(m);render();toast("Affiliato aggiunto")}}
function initials(name){return String(name||"").trim().split(/\s+/).map(x=>x[0]||"").join("").slice(0,2).toUpperCase()||"TH"}
function updateUserBox(){
  const p=currentProfile||{},box=document.querySelector(".user-mini");
  if(box)box.innerHTML='<div class="avatar">'+esc(initials(p.name))+'</div><div><b>'+esc(p.name||p.email||"")+'</b><span>'+esc(localMode?"Solo questo dispositivo":(ROLE_LABELS[p.role]||p.role||""))+'</span></div>';
  const pill=document.querySelector(".role-pill");if(pill)pill.textContent=localMode?"Locale":(ROLE_NAMES[p.role]||"");
  const bottom=document.querySelector(".sidebar-bottom");
  if(bottom&&!bottom.querySelector("#logout-btn"))bottom.insertAdjacentHTML("beforeend",'<button class="secondary logout-btn" id="logout-btn" type="button">Esci</button>');
  const out=document.querySelector("#logout-btn");if(out)out.onclick=logout;
  const nav=document.querySelector(".sidebar nav"),usersBtn=nav?.querySelector("[data-page=users]");
  if(nav&&!usersBtn&&(isAdmin()||isManager()))nav.insertAdjacentHTML("beforeend",'<button class="nav-item" data-page="users">⚙ <span>Utenti e ruoli</span></button>');
  if(usersBtn&&!isAdmin()&&!isManager())usersBtn.remove();
  document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>setPage(b.dataset.page));
}
function authScreen(){
  let el=document.querySelector("#auth-screen");
  if(el)return el;
  document.body.insertAdjacentHTML("beforeend",'<div class="auth-screen" id="auth-screen"><div class="auth-card"><img src="../assets/logo-casa.png" alt="Top House"><div class="eyebrow">TOP HOUSE</div><h1>Accedi al CRM</h1><p class="panel-sub">Usa le credenziali che ti ha dato l\'amministratore.</p><form id="login-form"><div class="field"><label>Email</label><input class="input" type="email" name="email" required autocomplete="username"></div><div class="field"><label>Password</label><input class="input" type="password" name="password" required autocomplete="current-password"></div><div class="auth-error" id="auth-error" role="alert"></div><button class="primary" type="submit">Accedi</button><button class="link-btn" type="button" id="forgot-btn">Password dimenticata?</button></form><div class="auth-local" id="auth-local" hidden><p></p><button class="secondary" type="button" id="local-mode-btn">Continua solo su questo dispositivo</button></div></div></div>');
  el=document.querySelector("#auth-screen");
  const form=el.querySelector("#login-form"),err=el.querySelector("#auth-error");
  form.onsubmit=async e=>{
    e.preventDefault();err.textContent="";
    if(!authApi||!authInstance){err.textContent=configProblem||"Servizio di accesso non raggiungibile.";return}
    const f=new FormData(form),btn=form.querySelector("[type=submit]");btn.disabled=true;btn.textContent="Accesso in corso...";
    try{await authApi.signInWithEmailAndPassword(authInstance,String(f.get("email")).trim(),f.get("password"))}
    catch(error){console.error(error);err.textContent=authErrorMessage(error);if(String(error?.code).includes("api-key"))showLocalOption(authErrorMessage(error))}
    finally{btn.disabled=false;btn.textContent="Accedi"}
  };
  el.querySelector("#forgot-btn").onclick=async()=>{
    const email=String(new FormData(form).get("email")||"").trim();
    if(!email){err.textContent="Scrivi la tua email e poi tocca di nuovo «Password dimenticata?».";return}
    try{await authApi.sendPasswordResetEmail(authInstance,email);err.textContent="Ti abbiamo inviato un'email per reimpostare la password."}catch(error){err.textContent=authErrorMessage(error)}
  };
  el.querySelector("#local-mode-btn").onclick=startLocalMode;
  return el;
}
function showLogin(message){
  const el=authScreen();el.hidden=false;
  document.querySelector("#page-content").innerHTML="";
  if(message)el.querySelector("#auth-error").textContent=message;
}
function showLocalOption(reason){
  const el=authScreen(),box=el.querySelector("#auth-local");
  box.hidden=false;box.querySelector("p").textContent=reason+" Puoi continuare a lavorare: i dati restano solo in questo browser finché il cloud non torna attivo.";
}
function startLocalMode(){
  localMode=true;cloudReady=false;
  currentUser={uid:"local-admin",email:""};
  currentProfile={uid:"local-admin",email:"",name:"Lamine Tall",sellerName:"Lamine Tall",role:"admin",managerUid:null,managerName:"",active:true};
  userProfiles=[currentProfile];
  try{const local=JSON.parse(localStorage.getItem(KEY)||"null");if(local)data={...defaultData,...local}}catch(err){console.warn("Local data unavailable",err)}
  const el=document.querySelector("#auth-screen");if(el)el.hidden=true;
  updateUserBox();render();toast("Modalità locale: i dati non vengono sincronizzati");
}
async function logout(){
  try{cloudUnsubscribe?.()}catch(e){}
  cloudUnsubscribe=null;
  localStorage.removeItem(KEY);
  if(authInstance&&authApi&&!localMode)await authApi.signOut(authInstance);
  location.reload();
}
async function connectCloud(){
  const fs=firestoreApi,ref=fs.doc(db,"crmData","main");
  const apply=snap=>{
    const server=snap.exists()?snap.data():{};
    baseData=onlyCollections({...defaultData,...server});
    data={...defaultData,...server};
    localStorage.setItem(KEY,JSON.stringify(data));
    if(!document.querySelector(".modal-backdrop"))render();
  };
  apply(await fs.getDoc(ref));
  cloudReady=true;
  cloudUnsubscribe?.();
  cloudUnsubscribe=fs.onSnapshot(ref,snap=>{if(snap.metadata.hasPendingWrites)return;apply(snap)},err=>{console.warn("Firebase listener unavailable",err);cloudReady=false;toast("Sincronizzazione interrotta: ricarica la pagina")});
}
async function onSignedIn(user){
  currentUser=user;firebaseAuthUser=user;
  try{
    await ensureProfile(user);
    if(currentProfile.active===false)throw Object.assign(new Error("disattivato"),{code:"auth/user-disabled"});
    await loadProfiles().catch(err=>console.warn("Profili non caricati",err));
    document.querySelector("#auth-screen")?.setAttribute("hidden","");
    updateUserBox();
    render();
    await connectCloud();
  }catch(err){
    console.error("CRM login error",err);
    currentUser=null;currentProfile=null;
    await authApi.signOut(authInstance).catch(()=>{});
    showLogin(authErrorMessage(err));
  }
}
async function startCRM(){
  document.querySelector(".app-shell").style.display="";
  document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>setPage(b.dataset.page));
  authScreen();
  try{
    const firebase=await import("./firebase.js?v=20261025");
    configProblem=firebase.configProblem||"";
    const appApi=await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js");
    firestoreApi=await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");
    authApi=await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js");
    db=firebase.db;firebaseApp=firebase.app;
    authInstance=authApi.getAuth(firebaseApp);
    const secondary=appApi.getApps().find(a=>a.name==="crm-secondary")||appApi.initializeApp(firebaseApp.options,"crm-secondary");
    secondaryAuth=authApi.getAuth(secondary);
  }catch(err){
    console.warn("CRM cloud unavailable",err);
    showLogin();showLocalOption("Il servizio cloud non si è caricato.");
    return;
  }
  if(configProblem)showLocalOption(configProblem);
  authInstance.onAuthStateChanged(user=>{
    if(user){if(!currentUser||currentUser.uid!==user.uid)onSignedIn(user)}
    else if(!localMode){currentUser=null;currentProfile=null;showLogin()}
  });
}
startCRM().catch(err=>{
  console.error("CRM startup error",err);
  showLogin();showLocalOption("Errore di avvio del CRM.");
});
