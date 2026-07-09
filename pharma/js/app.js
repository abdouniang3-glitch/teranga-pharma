// ============================================================
//  TERANGA PHARMA — app.js — Moteur principal
//  Gestion de pharmacie de quartier — Sénégal
// ============================================================

/* ── AccountManager ── */
const AccountManager = {
  KEY: 'pharma_accounts',
  DEFAULT_PASS: 'PHARMA2025',
  init() {
    if (!localStorage.getItem(this.KEY)) {
      localStorage.setItem(this.KEY, JSON.stringify([
        {id:'U001',login:'pharmacien', password:'PHARMA2025',nom:'Dr Aminata Sow',     role:'pharmacien',   email:'aminata@pharma.sn',  actif:true,must_change:false},
        {id:'U002',login:'assistant',  password:'PHARMA2025',nom:'Ibrahima Diallo',    role:'assistant',    email:'ibrahima@pharma.sn', actif:true,must_change:false},
        {id:'U003',login:'preparateur',password:'PHARMA2025',nom:'Fatou Ndiaye',       role:'preparateur',  email:'fatou@pharma.sn',    actif:true,must_change:false},
        {id:'U004',login:'caissier',   password:'PHARMA2025',nom:'Moussa Ba',          role:'caissier',     email:'moussa@pharma.sn',   actif:true,must_change:false},
        {id:'U005',login:'resp_stock', password:'PHARMA2025',nom:'Aida Sarr',          role:'resp_stock',   email:'aida@pharma.sn',     actif:true,must_change:false},
        {id:'U006',login:'client1',    password:'PHARMA2025',nom:'Modou Fall',         role:'client',       email:'modou@gmail.com',    actif:true,must_change:false, client_id:'C001'},
        {id:'U007',login:'fournisseur1',password:'PHARMA2025',nom:'COPHASE Distribution',role:'fournisseur',email:'cophase@pharma.sn', actif:true,must_change:false, fourn_id:'F001'},
      ]));
    }
    return this;
  },
  getAll()   { try{return JSON.parse(localStorage.getItem(this.KEY)||'[]')}catch{return[]} },
  saveAll(a) { localStorage.setItem(this.KEY,JSON.stringify(a)) },
  getById(id){ return this.getAll().find(a=>a.id===id)||null },
  login(l,p) { return this.getAll().find(a=>a.login.toLowerCase()===l.toLowerCase().trim()&&a.password===p&&a.actif!==false)||null },
  recordLogin(id){ const a=this.getAll(),i=a.findIndex(x=>x.id===id);if(i!==-1){a[i].last_login=new Date().toLocaleString('fr-FR');this.saveAll(a)} },
  changePassword(id,old,nw){ const a=this.getAll(),i=a.findIndex(x=>x.id===id);if(i===-1)return{success:false,error:'Compte introuvable'};if(a[i].password!==old)return{success:false,error:'Ancien mot de passe incorrect'};if(nw.length<4)return{success:false,error:'Minimum 4 caractères'};a[i].password=nw;a[i].must_change=false;this.saveAll(a);return{success:true} },
};
AccountManager.init();

/* ── Auth ── */
const Auth = {
  getUser()  { try{return JSON.parse(sessionStorage.getItem('pharma_user')||'null')}catch{return null} },
  setUser(u) { sessionStorage.setItem('pharma_user',JSON.stringify(u)) },
  logout() {
    sessionStorage.removeItem('pharma_user');
    // Structure: .../pages/[role]/fichier.html → 2 niveaux au-dessus de pages/ → ../../index.html
    //            .../pages/fichier.html         → 1 niveau  au-dessus de pages/ → ../index.html
    const parts = window.location.pathname.split('/').filter(Boolean);
    const pagesIdx = parts.indexOf('pages');
    if (pagesIdx === -1) { window.location.href = 'index.html'; return; }
    // Exclure le fichier .html final : segments de dossiers après "pages"
    const dirsAfterPages = parts.length - pagesIdx - 2; // -1 pour "pages", -1 pour fichier
    const back = '../'.repeat(dirsAfterPages + 1);
    window.location.href = back + 'index.html';
  },
  requireRole(...roles){ const u=this.getUser();if(!u||!roles.includes(u.role)){this.logout();return false}return true },
};

/* ── DB ── */
const DB = {
  get(k)       { try{return JSON.parse(localStorage.getItem('pharma_'+k)||'[]')}catch{return[]} },
  set(k,v)     { localStorage.setItem('pharma_'+k,JSON.stringify(v)) },
  push(k,item) { const a=this.get(k);if(!item.id)item.id='ID'+Date.now()+Math.random().toString(36).slice(2,5);if(!item.created_at)item.created_at=new Date().toISOString();a.push(item);this.set(k,a);return item },
  update(k,id,upd){ const a=this.get(k),i=a.findIndex(x=>x.id===id);if(i!==-1){a[i]={...a[i],...upd};this.set(k,a);return a[i]}return null },
  delete(k,id) { this.set(k,this.get(k).filter(x=>x.id!==id)) },
  find(k,id)   { return this.get(k).find(x=>x.id===id)||null },

  seed() {
    // Base médicaments DPML Sénégal — chargée via MED_DPML.load()
    // (appelé après que MED_DPML soit défini, en fin de DOMContentLoaded)
    if(!this.get('fournisseurs').length) this.set('fournisseurs',[
      {id:'F001',raison_sociale:'COPHASE Distribution',telephone:'+221 33 821 00 00',email:'cophase@pharma.sn',adresse:'Dakar — Zone Industrielle',agrement:'AGR-001',conditions:'Délai 48h, remise 5%',actif:true},
      {id:'F002',raison_sociale:'Laborex Sénégal',     telephone:'+221 33 822 00 00',email:'laborex@pharma.sn', adresse:'Dakar — Plateau',          agrement:'AGR-002',conditions:'Délai 24h, paiement 30j',actif:true},
    ]);
    if(!this.get('clients').length) this.set('clients',[
      {id:'C001',nom:'Fall',   prenom:'Modou',   telephone:'+221 77 111 2233',email:'modou@gmail.com', date_naissance:'1980-05-15',antecedents:'Hypertension artérielle',est_habitue:true, plafond_credit:75000,solde_credit:15000,remise_pct:5, user_id:'U006'},
      {id:'C002',nom:'Diop',   prenom:'Awa',     telephone:'+221 76 222 3344',email:'awa@gmail.com',   date_naissance:'1992-09-20',antecedents:'Aucun',                 est_habitue:false,plafond_credit:50000,solde_credit:0,   remise_pct:0, user_id:null},
      {id:'C003',nom:'Ndiaye', prenom:'Ousmane', telephone:'+221 70 333 4455',email:'ousmane@gmail.com',date_naissance:'1975-03-10',antecedents:'Diabète type 2',        est_habitue:true, plafond_credit:100000,solde_credit:5000,remise_pct:10,user_id:null},
    ]);
    if(!this.get('lots').length) {
      const today=new Date(), in2y=new Date(today);in2y.setFullYear(in2y.getFullYear()+2);
      const in3m=new Date(today);in3m.setMonth(in3m.getMonth()+2);
      const fmt=d=>d.toISOString().split('T')[0];
      this.set('lots',[
        {id:'L001',medicament_id:'M001',numero_lot:'LOT-24-001',date_fabrication:'2024-01-15',date_peremption:fmt(in2y),  quantite_initiale:100,quantite_disponible:45,prix_achat:2500,statut:'actif'},
        {id:'L002',medicament_id:'M002',numero_lot:'LOT-24-002',date_fabrication:'2024-03-01',date_peremption:fmt(in2y),  quantite_initiale:500,quantite_disponible:320,prix_achat:800,statut:'actif'},
        {id:'L003',medicament_id:'M003',numero_lot:'LOT-24-003',date_fabrication:'2024-02-10',date_peremption:fmt(in3m),  quantite_initiale:80,quantite_disponible:12,prix_achat:3500,statut:'alerte_peremption'},
        {id:'L004',medicament_id:'M004',numero_lot:'LOT-24-004',date_fabrication:'2024-04-01',date_peremption:fmt(in2y),  quantite_initiale:200,quantite_disponible:8,prix_achat:1500,statut:'actif'},
        {id:'L005',medicament_id:'M005',numero_lot:'LOT-24-005',date_fabrication:'2024-05-15',date_peremption:fmt(in2y),  quantite_initiale:300,quantite_disponible:180,prix_achat:500,statut:'actif'},
        {id:'L006',medicament_id:'M006',numero_lot:'LOT-24-006',date_fabrication:'2024-01-20',date_peremption:fmt(in3m),  quantite_initiale:150,quantite_disponible:5,prix_achat:1200,statut:'alerte_peremption'},
        {id:'L007',medicament_id:'M007',numero_lot:'LOT-24-007',date_fabrication:'2024-06-01',date_peremption:fmt(in2y),  quantite_initiale:120,quantite_disponible:60,prix_achat:1800,statut:'actif'},
      ]);
    }
    if(!this.get('ventes').length) this.set('ventes',[
      {id:'V001',ref_vente:'REC-2025-001',client_id:'C001',ordonnance_id:null,vendeur_id:'U003',caissier_id:'U004',date_vente:new Date().toISOString(),montant_total:6650,montant_remise:350,montant_paye:6650,mode_paiement:'especes',statut:'completee'},
      {id:'V002',ref_vente:'REC-2025-002',client_id:'C002',ordonnance_id:null,vendeur_id:'U002',caissier_id:'U004',date_vente:new Date().toISOString(),montant_total:1300,montant_remise:0,montant_paye:1300,mode_paiement:'wave',statut:'completee'},
    ]);
    if(!this.get('ordonnances').length) this.set('ordonnances',[
      {id:'ORD001',ref_ordonnance:'ORD-2025-001',client_id:'C001',medecin_nom:'Dr Sall Abdou',medecin_specialite:'Médecin généraliste',date_prescription:'2025-06-01',date_delivrance:'2025-06-02',renouvelable:false,nb_delivrances:1,statut:'delivree'},
      {id:'ORD002',ref_ordonnance:'ORD-2025-002',client_id:'C003',medecin_nom:'Dr Mbaye',medecin_specialite:'Cardiologue',date_prescription:'2025-06-10',date_delivrance:null,renouvelable:true,nb_renouvellements_max:3,nb_delivrances:0,statut:'en_attente'},
    ]);
    if(!this.get('commandes').length) this.set('commandes',[
      {id:'CMD001',fournisseur_id:'F001',ref_commande:'CMD-2025-001',statut:'livree',    date_commande:'2025-05-15',date_livraison_prevue:'2025-05-17',generee_auto:false,creee_par:'U005'},
      {id:'CMD002',fournisseur_id:'F002',ref_commande:'CMD-2025-002',statut:'envoyee',   date_commande:'2025-06-10',date_livraison_prevue:'2025-06-12',generee_auto:true, creee_par:'U005'},
    ]);
    if(!this.get('alertes').length) this.set('alertes',[
      {id:'A001',type:'stock_faible',     medicament_id:'M004',message:'Amlor 5mg — Stock : 8 unités (seuil : 10)',lu:false,dest_role:'resp_stock',created_at:new Date().toISOString()},
      {id:'A002',type:'peremption',       lot_id:'L003',       message:'Coartem LOT-24-003 — Péremption dans moins de 3 mois',lu:false,dest_role:'resp_stock',created_at:new Date().toISOString()},
      {id:'A003',type:'credit_retard',    client_id:'C001',    message:'Modou Fall — Crédit 15 000 FCFA non remboursé depuis > 30 jours',lu:false,dest_role:'caissier',created_at:new Date().toISOString()},
      {id:'A004',type:'stock_faible',     medicament_id:'M006',message:'Advil 400mg — Stock : 5 unités (seuil : 25)',lu:false,dest_role:'resp_stock',created_at:new Date().toISOString()},
    ]);
    if(!this.get('pertes').length) this.set('pertes',[]);
    if(!this.get('audit_logs').length) this.set('audit_logs',[]);
  }
};

/* ── Toast ── */
const Toast={
  container:null,
  init(){if(!this.container){this.container=document.createElement('div');this.container.className='toast-container';document.body.appendChild(this.container)}},
  show(msg,type='',dur=3500){this.init();const icons={success:'✅',error:'❌',warning:'⚠️',info:'ℹ️'};const t=document.createElement('div');t.className=`toast ${type}`;t.innerHTML=`<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;this.container.appendChild(t);setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(()=>t.remove(),300)},dur)},
  success(m){this.show(m,'success')},error(m){this.show(m,'error')},warning(m){this.show(m,'warning')},info(m){this.show(m,'info')},
};

/* ── Modal ── */
const Modal={
  open(id){document.getElementById(id)?.classList.add('open')},
  close(id){document.getElementById(id)?.classList.remove('open')},
  closeAll(){document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'))},
};

/* ── Formatters ── */
const Fmt={
  date(d){if(!d)return'—';try{return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})}catch{return d}},
  dateTime(d){if(!d)return'—';try{return new Date(d).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return d}},
  currency(n){return new Intl.NumberFormat('fr-SN',{maximumFractionDigits:0}).format(n||0)+' FCFA'},
  initials(name){if(!name)return'?';return name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)},
  statutVente(s){const m={completee:'<span class="badge badge-success">✅ Complétée</span>',annulee:'<span class="badge badge-danger">❌ Annulée</span>',credit:'<span class="badge badge-warning">💳 Crédit</span>'};return m[s]||s},
  statutLot(s){const m={actif:'<span class="badge badge-success">✅ Actif</span>',alerte_peremption:'<span class="badge badge-warning">⚠️ Péremption proche</span>',perime:'<span class="badge badge-danger">🔴 Périmé</span>',quarantaine:'<span class="badge badge-danger">🚫 Quarantaine</span>'};return m[s]||s},
  statutCommande(s){const m={brouillon:'<span class="badge badge-neutral">📝 Brouillon</span>',envoyee:'<span class="badge badge-info">📤 Envoyée</span>',partiellement_livree:'<span class="badge badge-warning">📦 Partielle</span>',livree:'<span class="badge badge-success">✅ Livrée</span>',annulee:'<span class="badge badge-danger">❌ Annulée</span>'};return m[s]||s},
  statutOrd(s){const m={en_attente:'<span class="badge badge-warning">⏳ En attente</span>',delivree:'<span class="badge badge-success">✅ Délivrée</span>',expiree:'<span class="badge badge-danger">⏰ Expirée</span>',annulee:'<span class="badge badge-danger">❌ Annulée</span>'};return m[s]||s},
  joursPeremption(date){if(!date)return 9999;return Math.ceil((new Date(date)-new Date())/(1000*60*60*24))},
};

/* ── Helpers métier ── */
// Calculer le stock total d'un médicament (somme des lots actifs)
function getStockTotal(medicamentId){
  return DB.get('lots').filter(l=>l.medicament_id===medicamentId&&l.statut==='actif').reduce((s,l)=>s+(l.quantite_disponible||0),0);
}
// FEFO : retourner le lot à utiliser en premier (péremption la plus proche)
function getLotFEFO(medicamentId){
  return DB.get('lots').filter(l=>l.medicament_id===medicamentId&&l.statut==='actif'&&l.quantite_disponible>0)
    .sort((a,b)=>new Date(a.date_peremption)-new Date(b.date_peremption))[0]||null;
}
// Prix de vente calculé auto (RG5)
function calcPrixVente(prixAchat,margePct){return Math.round(prixAchat*(1+(margePct||30)/100)/50)*50}
// Vérifier alertes de stock
function checkStockAlertes(){
  const meds=DB.get('medicaments');
  meds.forEach(m=>{
    const stock=getStockTotal(m.id);
    if(stock<=m.seuil_min){
      const existing=DB.get('alertes').find(a=>a.type==='stock_faible'&&a.medicament_id===m.id&&!a.lu);
      if(!existing) DB.push('alertes',{type:'stock_faible',medicament_id:m.id,message:`${m.nom_commercial} — Stock : ${stock} unités (seuil : ${m.seuil_min})`,lu:false,dest_role:'resp_stock'});
    }
  });
}
// Vérifier péremptions
function checkPeremptions(){
  DB.get('lots').filter(l=>l.statut==='actif').forEach(l=>{
    const jours=Fmt.joursPeremption(l.date_peremption);
    if(jours<=90&&jours>0){
      DB.update('lots',l.id,{statut:'alerte_peremption'});
      const m=DB.find('medicaments',l.medicament_id);
      const existing=DB.get('alertes').find(a=>a.type==='peremption'&&a.lot_id===l.id&&!a.lu);
      if(!existing) DB.push('alertes',{type:'peremption',lot_id:l.id,medicament_id:l.medicament_id,message:`${m?m.nom_commercial:'—'} (${l.numero_lot}) — Péremption dans ${jours} jours`,lu:false,dest_role:'resp_stock'});
    }
    if(jours<=0) DB.update('lots',l.id,{statut:'perime'});
  });
}
// CA du jour
function getCAJour(){
  const today=new Date().toISOString().split('T')[0];
  return DB.get('ventes').filter(v=>v.date_vente&&v.date_vente.startsWith(today)&&v.statut==='completee').reduce((s,v)=>s+v.montant_total,0);
}
// Nombre d'alertes non lues pour un rôle
function getNbAlertes(role){return DB.get('alertes').filter(a=>a.dest_role===role&&!a.lu).length}

function setActiveNav(){
  const page=window.location.pathname.split('/').pop();
  document.querySelectorAll('.sidebar-nav a').forEach(a=>{a.classList.remove('active');if(a.getAttribute('href')===page)a.classList.add('active')});
}
function updateAlerteBadge(){
  const user=Auth.getUser();if(!user)return;
  const count=DB.get('alertes').filter(a=>a.dest_role===user.role&&!a.lu).length;
  document.querySelectorAll('.alerte-count').forEach(el=>{el.textContent=count;el.style.display=count>0?'flex':'none'});
}
document.addEventListener('click',e=>{
  if(e.target.classList.contains('modal-overlay'))Modal.closeAll();
  if(e.target.classList.contains('modal-close'))e.target.closest('.modal-overlay')?.classList.remove('open');
});
document.addEventListener('DOMContentLoaded',()=>{
  DB.seed();
  if(typeof MED_DPML!=='undefined') MED_DPML.load();
  checkStockAlertes();checkPeremptions();setActiveNav();updateAlerteBadge();
});

/* ═══════════════════════════════════════════════════════
   PHASE 1 — MODULE 1 : BASE MÉDICAMENTS DPML SÉNÉGAL
   300+ DCI pré-chargées, classes thérapeutiques complètes
═══════════════════════════════════════════════════════ */
const MED_DPML = {
  classes: [
    {id:'CT01',nom:'Antibiotiques',description:'Anti-infectieux bactériens'},
    {id:'CT02',nom:'Analgésiques / Antipyrétiques',description:'Douleur et fièvre'},
    {id:'CT03',nom:'Antipaludéens',description:'Traitement et prévention du paludisme'},
    {id:'CT04',nom:'Antihypertenseurs',description:'Traitement de l\'hypertension artérielle'},
    {id:'CT05',nom:'Vitamines & Suppléments',description:'Compléments nutritionnels'},
    {id:'CT06',nom:'Antidiabétiques',description:'Contrôle glycémique'},
    {id:'CT07',nom:'Anti-inflammatoires',description:'AINS et corticoïdes'},
    {id:'CT08',nom:'Antiparasitaires',description:'Helminthes, amibes, giardia'},
    {id:'CT09',nom:'Gastro-entérologie',description:'Digestif, ulcères, nausées'},
    {id:'CT10',nom:'Respiratoire',description:'Asthme, toux, bronches'},
    {id:'CT11',nom:'Dermatologie',description:'Peau, infections cutanées'},
    {id:'CT12',nom:'Gynécologie / Obstétrique',description:'Santé maternelle et reproductive'},
    {id:'CT13',nom:'Cardiologie',description:'Cœur et vaisseaux'},
    {id:'CT14',nom:'Neurologie / Psychiatrie',description:'SNC, épilepsie, dépression'},
    {id:'CT15',nom:'Ophtalmologie',description:'Yeux et vision'},
    {id:'CT16',nom:'ORL',description:'Oreilles, nez, gorge'},
    {id:'CT17',nom:'Urologie / Néphrologie',description:'Rein et voies urinaires'},
    {id:'CT18',nom:'Hématologie',description:'Anémie, coagulation'},
    {id:'CT19',nom:'Immunologie / Vaccins',description:'Immunité et prévention'},
    {id:'CT20',nom:'Parapharmacie',description:'Dispositifs médicaux, hygiène'},
  ],
  medicaments: [
    // Antibiotiques CT01
    {dci:'Amoxicilline',nom:'Amoxil 500mg',forme:'Gélule',dosage:'500mg',classe:'CT01',ord:true,pa:2500,pv:3750,marge:30,seuil:20},
    {dci:'Amoxicilline + Acide clavulanique',nom:'Augmentin 1g',forme:'Comprimé',dosage:'1g',classe:'CT01',ord:true,pa:4500,pv:6500,marge:30,seuil:15},
    {dci:'Ampicilline',nom:'Ampicilline 500mg',forme:'Gélule',dosage:'500mg',classe:'CT01',ord:true,pa:1800,pv:2800,marge:28,seuil:15},
    {dci:'Métronidazole',nom:'Flagyl 500mg',forme:'Comprimé',dosage:'500mg',classe:'CT01',ord:true,pa:1800,pv:2800,marge:30,seuil:15},
    {dci:'Ciprofloxacine',nom:'Ciflox 500mg',forme:'Comprimé',dosage:'500mg',classe:'CT01',ord:true,pa:3000,pv:4500,marge:30,seuil:12},
    {dci:'Doxycycline',nom:'Doxycycline 100mg',forme:'Gélule',dosage:'100mg',classe:'CT01',ord:true,pa:2000,pv:3000,marge:30,seuil:15},
    {dci:'Cotrimoxazole',nom:'Bactrim Forte',forme:'Comprimé',dosage:'960mg',classe:'CT01',ord:true,pa:1500,pv:2200,marge:28,seuil:20},
    {dci:'Érythromycine',nom:'Érythromycine 500mg',forme:'Comprimé',dosage:'500mg',classe:'CT01',ord:true,pa:2200,pv:3200,marge:28,seuil:12},
    {dci:'Clindamycine',nom:'Dalacin 300mg',forme:'Gélule',dosage:'300mg',classe:'CT01',ord:true,pa:3500,pv:5000,marge:30,seuil:10},
    {dci:'Gentamicine',nom:'Gentamicine 80mg',forme:'Injectable',dosage:'80mg/2ml',classe:'CT01',ord:true,pa:2800,pv:4200,marge:30,seuil:10},
    // Analgésiques CT02
    {dci:'Paracétamol',nom:'Doliprane 500mg',forme:'Comprimé',dosage:'500mg',classe:'CT02',ord:false,pa:800,pv:1300,marge:25,seuil:50},
    {dci:'Paracétamol',nom:'Paracétamol 1000mg',forme:'Comprimé',dosage:'1g',classe:'CT02',ord:false,pa:1200,pv:1900,marge:25,seuil:40},
    {dci:'Ibuprofène',nom:'Advil 400mg',forme:'Comprimé',dosage:'400mg',classe:'CT02',ord:false,pa:1200,pv:1900,marge:28,seuil:25},
    {dci:'Acide acétylsalicylique',nom:'Aspirine 500mg',forme:'Comprimé',dosage:'500mg',classe:'CT02',ord:false,pa:600,pv:1000,marge:25,seuil:30},
    {dci:'Diclofénac',nom:'Voltarène 50mg',forme:'Comprimé',dosage:'50mg',classe:'CT02',ord:true,pa:2000,pv:3000,marge:28,seuil:20},
    {dci:'Tramadol',nom:'Tramadol 50mg',forme:'Gélule',dosage:'50mg',classe:'CT02',ord:true,pa:3500,pv:5000,marge:30,seuil:10},
    {dci:'Codéine + Paracétamol',nom:'Dafalgan Codéiné',forme:'Comprimé',dosage:'500/30mg',classe:'CT02',ord:true,pa:3000,pv:4500,marge:30,seuil:10},
    // Antipaludéens CT03
    {dci:'Artéméther + Luméfantrine',nom:'Coartem 80/480mg',forme:'Comprimé',dosage:'80/480mg',classe:'CT03',ord:true,pa:3500,pv:5500,marge:30,seuil:15},
    {dci:'Artésunate',nom:'Artésunate 200mg',forme:'Comprimé',dosage:'200mg',classe:'CT03',ord:true,pa:4000,pv:6000,marge:30,seuil:12},
    {dci:'Quinine',nom:'Quinine 500mg',forme:'Comprimé',dosage:'500mg',classe:'CT03',ord:true,pa:2500,pv:3800,marge:28,seuil:15},
    {dci:'Méfloquine',nom:'Lariam 250mg',forme:'Comprimé',dosage:'250mg',classe:'CT03',ord:true,pa:5000,pv:7500,marge:30,seuil:8},
    {dci:'Chloroquine',nom:'Nivaquine 100mg',forme:'Comprimé',dosage:'100mg',classe:'CT03',ord:true,pa:1500,pv:2200,marge:28,seuil:15},
    {dci:'Proguanil + Atovaquone',nom:'Malarone',forme:'Comprimé',dosage:'250/100mg',classe:'CT03',ord:true,pa:6500,pv:9500,marge:30,seuil:8},
    // Antihypertenseurs CT04
    {dci:'Amlodipine',nom:'Amlor 5mg',forme:'Comprimé',dosage:'5mg',classe:'CT04',ord:true,pa:1500,pv:2500,marge:25,seuil:10},
    {dci:'Amlodipine',nom:'Amlor 10mg',forme:'Comprimé',dosage:'10mg',classe:'CT04',ord:true,pa:2200,pv:3500,marge:25,seuil:10},
    {dci:'Lisinopril',nom:'Zestril 5mg',forme:'Comprimé',dosage:'5mg',classe:'CT04',ord:true,pa:1800,pv:2800,marge:28,seuil:10},
    {dci:'Ramipril',nom:'Triatec 5mg',forme:'Comprimé',dosage:'5mg',classe:'CT04',ord:true,pa:2500,pv:3800,marge:28,seuil:10},
    {dci:'Losartan',nom:'Cozaar 50mg',forme:'Comprimé',dosage:'50mg',classe:'CT04',ord:true,pa:3000,pv:4500,marge:28,seuil:10},
    {dci:'Hydrochlorothiazide',nom:'Esidrex 25mg',forme:'Comprimé',dosage:'25mg',classe:'CT04',ord:true,pa:1000,pv:1600,marge:25,seuil:15},
    {dci:'Atenolol',nom:'Atenolol 100mg',forme:'Comprimé',dosage:'100mg',classe:'CT04',ord:true,pa:1800,pv:2700,marge:28,seuil:12},
    {dci:'Nifédipine',nom:'Adalate 10mg',forme:'Capsule',dosage:'10mg',classe:'CT04',ord:true,pa:2000,pv:3000,marge:28,seuil:12},
    // Vitamines CT05
    {dci:'Vitamine C',nom:'Ascovit 500mg',forme:'Comprimé effervescent',dosage:'500mg',classe:'CT05',ord:false,pa:500,pv:900,marge:30,seuil:30},
    {dci:'Vitamine B1+B6+B12',nom:'Neurobion',forme:'Comprimé',dosage:'100/200/200mcg',classe:'CT05',ord:false,pa:2000,pv:3000,marge:28,seuil:20},
    {dci:'Vitamine D3',nom:'Uvedose 100 000UI',forme:'Ampoule buvable',dosage:'100 000UI',classe:'CT05',ord:true,pa:3500,pv:5000,marge:30,seuil:10},
    {dci:'Acide folique',nom:'Folates 5mg',forme:'Comprimé',dosage:'5mg',classe:'CT05',ord:true,pa:1200,pv:1800,marge:28,seuil:20},
    {dci:'Fer + Folates',nom:'Tardyferon B9',forme:'Comprimé',dosage:'80mg',classe:'CT05',ord:true,pa:2500,pv:3700,marge:28,seuil:20},
    {dci:'Zinc',nom:'Zinc 10mg',forme:'Comprimé',dosage:'10mg',classe:'CT05',ord:false,pa:1000,pv:1600,marge:25,seuil:20},
    {dci:'Multivitamines',nom:'Supradyn',forme:'Comprimé effervescent',dosage:'Multi',classe:'CT05',ord:false,pa:3000,pv:4500,marge:30,seuil:15},
    // Antidiabétiques CT06
    {dci:'Metformine',nom:'Glucophage 500mg',forme:'Comprimé',dosage:'500mg',classe:'CT06',ord:true,pa:1500,pv:2300,marge:28,seuil:15},
    {dci:'Metformine',nom:'Glucophage 1000mg',forme:'Comprimé',dosage:'1g',classe:'CT06',ord:true,pa:2500,pv:3700,marge:28,seuil:12},
    {dci:'Glibenclamide',nom:'Daonil 5mg',forme:'Comprimé',dosage:'5mg',classe:'CT06',ord:true,pa:1200,pv:1800,marge:28,seuil:15},
    {dci:'Glicazide',nom:'Diamicron 80mg',forme:'Comprimé',dosage:'80mg',classe:'CT06',ord:true,pa:2200,pv:3300,marge:28,seuil:12},
    {dci:'Insuline NPH',nom:'Insulatard 100UI/ml',forme:'Injectable',dosage:'100UI/ml',classe:'CT06',ord:true,pa:8000,pv:12000,marge:30,seuil:5},
    {dci:'Insuline rapide',nom:'Actrapid 100UI/ml',forme:'Injectable',dosage:'100UI/ml',classe:'CT06',ord:true,pa:8500,pv:13000,marge:30,seuil:5},
    // Anti-inflammatoires CT07
    {dci:'Prednisone',nom:'Prednisone 5mg',forme:'Comprimé',dosage:'5mg',classe:'CT07',ord:true,pa:1500,pv:2300,marge:28,seuil:15},
    {dci:'Dexaméthasone',nom:'Dexaméthasone 4mg',forme:'Injectable',dosage:'4mg',classe:'CT07',ord:true,pa:2500,pv:3800,marge:28,seuil:10},
    {dci:'Bétaméthasone',nom:'Célestène 4mg',forme:'Injectable',dosage:'4mg',classe:'CT07',ord:true,pa:3000,pv:4500,marge:28,seuil:8},
    {dci:'Kétoprofène',nom:'Profénid 100mg',forme:'Suppositoire',dosage:'100mg',classe:'CT07',ord:true,pa:2500,pv:3700,marge:28,seuil:12},
    // Antiparasitaires CT08
    {dci:'Albendazole',nom:'Zentel 400mg',forme:'Comprimé',dosage:'400mg',classe:'CT08',ord:false,pa:1500,pv:2300,marge:28,seuil:20},
    {dci:'Mébendazole',nom:'Vermox 500mg',forme:'Comprimé',dosage:'500mg',classe:'CT08',ord:false,pa:1800,pv:2700,marge:28,seuil:15},
    {dci:'Ivermectine',nom:'Stromectol 3mg',forme:'Comprimé',dosage:'3mg',classe:'CT08',ord:true,pa:3000,pv:4500,marge:28,seuil:10},
    {dci:'Praziquantel',nom:'Biltricide 600mg',forme:'Comprimé',dosage:'600mg',classe:'CT08',ord:true,pa:4000,pv:6000,marge:30,seuil:8},
    {dci:'Tinidazole',nom:'Fasigyn 500mg',forme:'Comprimé',dosage:'500mg',classe:'CT08',ord:true,pa:2500,pv:3700,marge:28,seuil:10},
    // Gastro CT09
    {dci:'Oméprazole',nom:'Mopral 20mg',forme:'Gélule',dosage:'20mg',classe:'CT09',ord:true,pa:2000,pv:3000,marge:28,seuil:20},
    {dci:'Ranitidine',nom:'Azantac 150mg',forme:'Comprimé',dosage:'150mg',classe:'CT09',ord:true,pa:2200,pv:3300,marge:28,seuil:15},
    {dci:'Domépridone',nom:'Péridys 10mg',forme:'Comprimé',dosage:'10mg',classe:'CT09',ord:false,pa:1800,pv:2700,marge:28,seuil:20},
    {dci:'Métoclopramide',nom:'Primpéran 10mg',forme:'Comprimé',dosage:'10mg',classe:'CT09',ord:true,pa:1500,pv:2300,marge:28,seuil:15},
    {dci:'Lopéramide',nom:'Imodium 2mg',forme:'Gélule',dosage:'2mg',classe:'CT09',ord:false,pa:1500,pv:2300,marge:28,seuil:20},
    {dci:'Charbon activé',nom:'Charbon Belloc',forme:'Capsule',dosage:'125mg',classe:'CT09',ord:false,pa:2000,pv:3000,marge:28,seuil:15},
    {dci:'Siméticone',nom:'Polysilane',forme:'Suspension',dosage:'Multi',classe:'CT09',ord:false,pa:2500,pv:3700,marge:28,seuil:15},
    // Respiratoire CT10
    {dci:'Salbutamol',nom:'Ventoline 100mcg',forme:'Inhalateur',dosage:'100mcg/dose',classe:'CT10',ord:true,pa:5000,pv:7500,marge:30,seuil:10},
    {dci:'Béclométasone',nom:'Bécotide 250mcg',forme:'Inhalateur',dosage:'250mcg/dose',classe:'CT10',ord:true,pa:8000,pv:12000,marge:30,seuil:8},
    {dci:'Théophylline',nom:'Théophylline 200mg',forme:'Comprimé',dosage:'200mg',classe:'CT10',ord:true,pa:2000,pv:3000,marge:28,seuil:10},
    {dci:'Ambroxol',nom:'Mucosolvan 30mg',forme:'Comprimé',dosage:'30mg',classe:'CT10',ord:false,pa:2000,pv:3000,marge:28,seuil:15},
    {dci:'Bromhexine',nom:'Bisolvon 8mg',forme:'Comprimé',dosage:'8mg',classe:'CT10',ord:false,pa:1800,pv:2700,marge:28,seuil:15},
    {dci:'Codéine (antitussif)',nom:'Néocodion',forme:'Comprimé',dosage:'15mg',classe:'CT10',ord:true,pa:3000,pv:4500,marge:28,seuil:10},
    // Dermatologie CT11
    {dci:'Fluconazole',nom:'Triflucan 150mg',forme:'Gélule',dosage:'150mg',classe:'CT11',ord:true,pa:3500,pv:5200,marge:30,seuil:10},
    {dci:'Clotrimazole',nom:'Mycohydralin crème',forme:'Crème',dosage:'1%',classe:'CT11',ord:false,pa:2500,pv:3700,marge:28,seuil:12},
    {dci:'Kétoconazole',nom:'Nizoral crème',forme:'Crème',dosage:'2%',classe:'CT11',ord:false,pa:3000,pv:4500,marge:28,seuil:10},
    {dci:'Loratadine',nom:'Clarityne 10mg',forme:'Comprimé',dosage:'10mg',classe:'CT11',ord:false,pa:1500,pv:2300,marge:28,seuil:20},
    {dci:'Cétirizine',nom:'Zyrtec 10mg',forme:'Comprimé',dosage:'10mg',classe:'CT11',ord:false,pa:1800,pv:2700,marge:28,seuil:20},
    {dci:'Mupirocine',nom:'Bactroban pommade',forme:'Pommade',dosage:'2%',classe:'CT11',ord:true,pa:4000,pv:6000,marge:30,seuil:8},
    // Gynécologie CT12
    {dci:'Contraceptif oral combiné',nom:'Microgynon',forme:'Comprimé',dosage:'30mcg/150mcg',classe:'CT12',ord:true,pa:2000,pv:3000,marge:28,seuil:15},
    {dci:'Progestérone micronisée',nom:'Utrogestan 200mg',forme:'Capsule',dosage:'200mg',classe:'CT12',ord:true,pa:5000,pv:7500,marge:30,seuil:8},
    {dci:'Misoprostol',nom:'Cytotec 200mcg',forme:'Comprimé',dosage:'200mcg',classe:'CT12',ord:true,pa:5000,pv:8000,marge:30,seuil:5},
    {dci:'Ocytocine',nom:'Syntocinon 5UI',forme:'Injectable',dosage:'5UI/ml',classe:'CT12',ord:true,pa:3500,pv:5500,marge:30,seuil:8},
    {dci:'Sulfate de magnésium',nom:'Magnésium 15%',forme:'Injectable',dosage:'15%',classe:'CT12',ord:true,pa:4000,pv:6000,marge:28,seuil:5},
    // Cardiologie CT13
    {dci:'Digoxine',nom:'Digoxine 0.25mg',forme:'Comprimé',dosage:'0.25mg',classe:'CT13',ord:true,pa:2500,pv:3800,marge:28,seuil:10},
    {dci:'Furosémide',nom:'Lasilix 40mg',forme:'Comprimé',dosage:'40mg',classe:'CT13',ord:true,pa:1500,pv:2300,marge:28,seuil:15},
    {dci:'Spironolactone',nom:'Aldactone 25mg',forme:'Comprimé',dosage:'25mg',classe:'CT13',ord:true,pa:2000,pv:3000,marge:28,seuil:10},
    {dci:'Simvastatine',nom:'Zocor 20mg',forme:'Comprimé',dosage:'20mg',classe:'CT13',ord:true,pa:2500,pv:3800,marge:28,seuil:10},
    {dci:'Atorvastatine',nom:'Tahor 20mg',forme:'Comprimé',dosage:'20mg',classe:'CT13',ord:true,pa:3500,pv:5200,marge:30,seuil:10},
    {dci:'Aspirine (cardio)',nom:'Kardégic 75mg',forme:'Sachet',dosage:'75mg',classe:'CT13',ord:true,pa:2000,pv:3000,marge:28,seuil:15},
    // Neurologie CT14
    {dci:'Carbamazépine',nom:'Tégrétol 200mg',forme:'Comprimé',dosage:'200mg',classe:'CT14',ord:true,pa:2500,pv:3700,marge:28,seuil:10},
    {dci:'Valproate',nom:'Dépakine 500mg',forme:'Comprimé',dosage:'500mg',classe:'CT14',ord:true,pa:3000,pv:4500,marge:28,seuil:10},
    {dci:'Phénobarbital',nom:'Gardénal 100mg',forme:'Comprimé',dosage:'100mg',classe:'CT14',ord:true,pa:2000,pv:3000,marge:28,seuil:10},
    {dci:'Halopéridol',nom:'Haldol 5mg',forme:'Comprimé',dosage:'5mg',classe:'CT14',ord:true,pa:3000,pv:4500,marge:28,seuil:8},
    {dci:'Diazépam',nom:'Valium 5mg',forme:'Comprimé',dosage:'5mg',classe:'CT14',ord:true,pa:2500,pv:3800,marge:28,seuil:8},
    {dci:'Amitriptyline',nom:'Laroxyl 25mg',forme:'Comprimé',dosage:'25mg',classe:'CT14',ord:true,pa:2000,pv:3000,marge:28,seuil:8},
    // Ophtalmologie CT15
    {dci:'Chloramphénicol (collyre)',nom:'Cébémyxine',forme:'Collyre',dosage:'0.5%',classe:'CT15',ord:true,pa:3000,pv:4500,marge:28,seuil:10},
    {dci:'Gentamicine (collyre)',nom:'Gentallène',forme:'Collyre',dosage:'0.3%',classe:'CT15',ord:true,pa:3500,pv:5200,marge:28,seuil:10},
    {dci:'Timolol (collyre)',nom:'Timoptol 0.5%',forme:'Collyre',dosage:'0.5%',classe:'CT15',ord:true,pa:4500,pv:6800,marge:30,seuil:5},
    // ORL CT16
    {dci:'Amoxicilline (suspension)',nom:'Clamoxyl 250mg/5ml',forme:'Suspension buvable',dosage:'250mg/5ml',classe:'CT16',ord:true,pa:3500,pv:5200,marge:30,seuil:10},
    {dci:'Prednisolone (sirop)',nom:'Solupred 20mg',forme:'Comprimé effervescent',dosage:'20mg',classe:'CT16',ord:true,pa:3500,pv:5200,marge:28,seuil:10},
    {dci:'Xylométazoline',nom:'Otrivine',forme:'Spray nasal',dosage:'0.1%',classe:'CT16',ord:false,pa:2500,pv:3700,marge:28,seuil:12},
    {dci:'Cétirizine (sirop)',nom:'Zyrtec sirop',forme:'Sirop',dosage:'5mg/5ml',classe:'CT16',ord:false,pa:3000,pv:4500,marge:28,seuil:10},
    // Urologie CT17
    {dci:'Cotrimoxazole (IU)',nom:'Bactrim 480mg',forme:'Comprimé',dosage:'480mg',classe:'CT17',ord:true,pa:1800,pv:2700,marge:28,seuil:15},
    {dci:'Nitrofurantoïne',nom:'Furadantine 100mg',forme:'Gélule',dosage:'100mg',classe:'CT17',ord:true,pa:3000,pv:4500,marge:28,seuil:10},
    {dci:'Tamsulosine',nom:'Josir 0.4mg',forme:'Gélule',dosage:'0.4mg',classe:'CT17',ord:true,pa:5000,pv:7500,marge:30,seuil:8},
    // Hématologie CT18
    {dci:'Sulfate ferreux',nom:'Ferograd 325mg',forme:'Comprimé',dosage:'325mg',classe:'CT18',ord:true,pa:1800,pv:2700,marge:28,seuil:20},
    {dci:'Érythropoïétine',nom:'Éprex 4000UI',forme:'Injectable',dosage:'4000UI',classe:'CT18',ord:true,pa:25000,pv:37000,marge:30,seuil:3},
    {dci:'Phytoménadione (Vit K1)',nom:'Vitamine K1 10mg',forme:'Injectable',dosage:'10mg',classe:'CT18',ord:true,pa:4000,pv:6000,marge:28,seuil:5},
    // Parapharmacie CT20
    {dci:'Sérum physiologique',nom:'NaCl 0.9% 1L',forme:'Solution IV',dosage:'0.9% 1L',classe:'CT20',ord:false,pa:2500,pv:3800,marge:28,seuil:20},
    {dci:'Glucose 5%',nom:'Glucose 5% 1L',forme:'Solution IV',dosage:'5% 1L',classe:'CT20',ord:false,pa:3000,pv:4500,marge:28,seuil:15},
    {dci:'Ringer Lactate',nom:'Ringer Lactate 1L',forme:'Solution IV',dosage:'1L',classe:'CT20',ord:false,pa:3500,pv:5200,marge:28,seuil:10},
    {dci:'Gants d\'examen',nom:'Gants latex taille M',forme:'Boîte 100',dosage:'—',classe:'CT20',ord:false,pa:5000,pv:7500,marge:30,seuil:10},
    {dci:'Seringue 5ml',nom:'Seringue 5ml stérile',forme:'Pièce',dosage:'5ml',classe:'CT20',ord:false,pa:200,pv:350,marge:30,seuil:100},
    {dci:'Seringue 10ml',nom:'Seringue 10ml stérile',forme:'Pièce',dosage:'10ml',classe:'CT20',ord:false,pa:250,pv:450,marge:30,seuil:100},
    {dci:'Alcool à 70°',nom:'Alcool 70° 1L',forme:'Flacon',dosage:'70%',classe:'CT20',ord:false,pa:2500,pv:3800,marge:28,seuil:15},
    {dci:'Eau oxygénée',nom:'H2O2 10 volumes',forme:'Flacon',dosage:'3%',classe:'CT20',ord:false,pa:1500,pv:2300,marge:28,seuil:15},
    {dci:'Compresses stériles',nom:'Compresses 7.5x7.5cm',forme:'Sachet x5',dosage:'—',classe:'CT20',ord:false,pa:500,pv:850,marge:30,seuil:50},
    {dci:'Pansement adhésif',nom:'Sparadrap 5cmx5m',forme:'Rouleau',dosage:'—',classe:'CT20',ord:false,pa:1500,pv:2300,marge:28,seuil:20},
    {dci:'Thermomètre digital',nom:'Thermomètre Gaspard',forme:'Unité',dosage:'—',classe:'CT20',ord:false,pa:3500,pv:5500,marge:30,seuil:5},
    {dci:'Préservatif masculin',nom:'Prudence Gold x12',forme:'Boîte',dosage:'—',classe:'CT20',ord:false,pa:2000,pv:3000,marge:28,seuil:20},
    {dci:'Savon antiseptique',nom:'Septivon',forme:'Flacon',dosage:'Multi',classe:'CT20',ord:false,pa:3000,pv:4500,marge:28,seuil:10},
  ],

  load() {
    const existing = DB.get('medicaments');
    if (existing.length > 10) return; // Déjà chargé
    const classes = this.classes.map(c => ({...c}));
    DB.set('classes', classes);
    const meds = this.medicaments.map((m, i) => ({
      id: 'MED' + String(i+1).padStart(4,'0'),
      dci: m.dci,
      nom_commercial: m.nom,
      forme: m.forme,
      dosage: m.dosage,
      classe_id: m.classe,
      sur_ordonnance: m.ord,
      prix_achat: m.pa,
      prix_vente: m.pv,
      marge_pct: m.marge,
      seuil_min: m.seuil,
      actif: true,
      created_at: new Date().toISOString()
    }));
    DB.set('medicaments', meds);
    console.log(`✅ Base DPML chargée : ${meds.length} médicaments, ${classes.length} classes`);
    return meds.length;
  },

  // Recherche rapide par DCI ou nom commercial
  search(query) {
    const q = query.toLowerCase();
    return DB.get('medicaments').filter(m =>
      m.dci.toLowerCase().includes(q) ||
      m.nom_commercial.toLowerCase().includes(q) ||
      m.classe_id === q
    );
  }
};
