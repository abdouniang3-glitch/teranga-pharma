// ============================================================
//  TERANGA PHARMA — wolof.js
//  Interface bilingue Français / Wolof
//  Différenciateur unique sur le marché africain
// ============================================================

const Lang = {
  current: 'fr',

  translations: {
    // Navigation
    'nav.dashboard':      { fr: 'Tableau de bord',     wo: 'Dëkk bi' },
    'nav.medicaments':    { fr: 'Médicaments',          wo: 'Yaram ak dawa' },
    'nav.stocks':         { fr: 'Stocks & Lots',        wo: 'Jëf bu stok' },
    'nav.ventes':         { fr: 'Ventes',               wo: 'Jaay' },
    'nav.ordonnances':    { fr: 'Ordonnances',          wo: 'Papiye-bu-daktar' },
    'nav.clients':        { fr: 'Clients',              wo: 'Jëkker yi' },
    'nav.rapports':       { fr: 'Rapports',             wo: 'Rapport' },
    'nav.alertes':        { fr: 'Alertes',              wo: 'Xam-xam ak alerte' },
    'nav.parametres':     { fr: 'Paramètres',           wo: 'Jëfandikoo' },
    'nav.fournisseurs':   { fr: 'Fournisseurs',         wo: 'Jox-jox yi' },
    'nav.commandes':      { fr: 'Commandes',            wo: 'Comande yi' },
    'nav.deconnexion':    { fr: 'Déconnexion',          wo: 'Génn' },

    // Actions communes
    'btn.save':           { fr: 'Enregistrer',          wo: 'Bind' },
    'btn.cancel':         { fr: 'Annuler',              wo: 'Dëgg-dëgg amul' },
    'btn.add':            { fr: 'Ajouter',              wo: 'Yokk' },
    'btn.delete':         { fr: 'Supprimer',            wo: 'Samp' },
    'btn.edit':           { fr: 'Modifier',             wo: 'Soppi' },
    'btn.search':         { fr: 'Rechercher',           wo: 'Seet' },
    'btn.print':          { fr: 'Imprimer',             wo: 'Fepp' },
    'btn.close':          { fr: 'Fermer',               wo: 'Tëj' },
    'btn.confirm':        { fr: 'Confirmer',            wo: 'Dëgg na' },
    'btn.validate':       { fr: 'Valider',              wo: 'Dëgg' },
    'btn.export':         { fr: 'Exporter',             wo: 'Dem dëkk' },
    'btn.import':         { fr: 'Importer',             wo: 'Ñëw' },
    'btn.backup':         { fr: 'Sauvegarder',          wo: 'Planqué' },
    'btn.new_sale':       { fr: 'Nouvelle vente',       wo: 'Jaay bës bi' },
    'btn.new_client':     { fr: 'Nouveau client',       wo: 'Jëkker bu bees' },
    'btn.scan':           { fr: 'Scanner',              wo: 'Xool code bi' },

    // Tableau de bord
    'dash.welcome':       { fr: 'Bonjour',              wo: 'Bonjour' },
    'dash.ca_today':      { fr: 'CA aujourd\'hui',      wo: 'Jaay bës bi' },
    'dash.alerts':        { fr: 'Alertes actives',      wo: 'Alerte yi' },
    'dash.sales_today':   { fr: 'Ventes du jour',       wo: 'Jaay yi bës bi' },
    'dash.low_stock':     { fr: 'Stocks critiques',     wo: 'Dawa buy wééwu' },
    'dash.expiry':        { fr: 'Péremptions proches',  wo: 'Dawa bu mag' },
    'dash.credit':        { fr: 'Crédits en cours',     wo: 'Krédi yi' },

    // Médicaments
    'med.name':           { fr: 'Nom commercial',       wo: 'Tur bi' },
    'med.dci':            { fr: 'DCI',                  wo: 'Tur bu dawa' },
    'med.form':           { fr: 'Forme galénique',      wo: 'Jëfandikoo' },
    'med.dosage':         { fr: 'Dosage',               wo: 'Aloom' },
    'med.price':          { fr: 'Prix de vente',        wo: 'Prix jaay' },
    'med.stock':          { fr: 'Stock',                wo: 'Stok' },
    'med.prescription':   { fr: 'Sur ordonnance',       wo: 'Daktar papiye' },
    'med.free':           { fr: 'Vente libre',          wo: 'Jaay xam-xam' },
    'med.class':          { fr: 'Classe',               wo: 'Wàll' },
    'med.threshold':      { fr: 'Seuil minimum',        wo: 'Dëkk bu toll' },

    // Ventes
    'sale.cart':          { fr: 'Panier',               wo: 'Panier' },
    'sale.total':         { fr: 'Total',                wo: 'Total' },
    'sale.discount':      { fr: 'Remise',               wo: 'Sàpp' },
    'sale.cash':          { fr: 'Espèces',              wo: 'Xaalis' },
    'sale.wave':          { fr: 'Wave',                 wo: 'Wave' },
    'sale.orange':        { fr: 'Orange Money',         wo: 'Orange Money' },
    'sale.credit':        { fr: 'Crédit',               wo: 'Krédi' },
    'sale.receipt':       { fr: 'Reçu',                 wo: 'Papiye-jaay' },
    'sale.customer':      { fr: 'Client',               wo: 'Jëkker' },
    'sale.anonymous':     { fr: 'Passage anonyme',      wo: 'Ku ñu xamul' },
    'sale.finalize':      { fr: 'Finaliser la vente',   wo: 'Samp jaay bi' },
    'sale.add_to_cart':   { fr: 'Ajouter au panier',    wo: 'Yokk ci panier' },
    'sale.fefo':          { fr: 'Lot FEFO',             wo: 'Lot FEFO' },

    // Alertes
    'alert.low_stock':    { fr: 'Stock faible',         wo: 'Dawa wééwu' },
    'alert.expiry':       { fr: 'Péremption proche',    wo: 'Dawa mag na' },
    'alert.credit':       { fr: 'Crédit en retard',     wo: 'Krédi yu mën a' },
    'alert.mark_read':    { fr: 'Marquer lu',           wo: 'Xam na' },
    'alert.all_read':     { fr: 'Tout marquer lu',      wo: 'Xam leen yépp' },
    'alert.none':         { fr: 'Aucune alerte active', wo: 'Alerte amul' },

    // Statuts
    'status.active':      { fr: 'Actif',                wo: 'Dafa ca' },
    'status.expired':     { fr: 'Périmé',               wo: 'Mag na' },
    'status.completed':   { fr: 'Complétée',            wo: 'Jeex na' },
    'status.pending':     { fr: 'En attente',           wo: 'Xaar' },
    'status.delivered':   { fr: 'Délivrée',             wo: 'Jox na' },
    'status.cancelled':   { fr: 'Annulée',              wo: 'Dëgg-dëgg amul' },

    // Tiers payant
    'tp.label':           { fr: 'Tiers payant',         wo: 'Assirance' },
    'tp.organisme':       { fr: 'Organisme',            wo: 'Ci kanam' },
    'tp.adherent':        { fr: 'N° adhérent',          wo: 'Nimero bi' },
    'tp.coverage':        { fr: 'Prise en charge',      wo: 'Dëgg-dëgg' },
    'tp.patient_part':    { fr: 'Part patient',         wo: 'Moroom bi dëff' },
    'tp.tp_part':         { fr: 'Part organisme',       wo: 'Assirance bi dëff' },

    // Messages
    'msg.success_sale':   { fr: 'Vente enregistrée !',  wo: 'Jaay bi dafa bind !' },
    'msg.error_stock':    { fr: 'Stock insuffisant',    wo: 'Dawa wééwu' },
    'msg.confirm_delete': { fr: 'Confirmer la suppression ?', wo: 'Dëgg na fu samp ?' },
    'msg.loading':        { fr: 'Chargement...',        wo: 'Attends...' },
    'msg.no_data':        { fr: 'Aucune donnée',        wo: 'Dara amul' },
    'msg.saved':          { fr: 'Enregistré !',         wo: 'Bind na !' },
    'msg.error':          { fr: 'Erreur',               wo: 'Askan' },

    // Login
    'login.title':        { fr: 'Connexion PHARMA',     wo: 'Dugg ci PHARMA' },
    'login.username':     { fr: 'Identifiant',          wo: 'Tur' },
    'login.password':     { fr: 'Mot de passe',         wo: 'Xamxam bu sëkk' },
    'login.btn':          { fr: 'Se connecter',         wo: 'Dugg' },
    'login.demo':         { fr: 'Démo rapide',          wo: 'Essai' },

    // Roles
    'role.pharmacien':    { fr: 'Pharmacien Titulaire', wo: 'Farmasi bu mag' },
    'role.assistant':     { fr: 'Pharmacien Assistant', wo: 'Farmasi bu ndaw' },
    'role.preparateur':   { fr: 'Préparateur',          wo: 'Ku dawa jëf' },
    'role.caissier':      { fr: 'Caissier',             wo: 'Xaalis bu dëkk' },
    'role.resp_stock':    { fr: 'Responsable Stock',    wo: 'Stok' },
    'role.client':        { fr: 'Client',               wo: 'Jëkker' },
    'role.fournisseur':   { fr: 'Fournisseur',          wo: 'Jox-jox' },
  },

  // ── Obtenir traduction ───────────────────────────────────
  t(key) {
    const entry = this.translations[key];
    if (!entry) return key;
    return entry[this.current] || entry['fr'] || key;
  },

  // ── Changer de langue ────────────────────────────────────
  set(lang) {
    if (!['fr', 'wo'].includes(lang)) return;
    this.current = lang;
    localStorage.setItem('pharma_lang', lang);
    this._applyToDOM();
  },

  // ── Charger la langue sauvegardée ────────────────────────
  load() {
    this.current = localStorage.getItem('pharma_lang') || 'fr';
  },

  // ── Appliquer au DOM (éléments avec data-i18n) ──────────
  _applyToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = this.t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translation;
      } else {
        el.textContent = translation;
      }
    });
    // Mettre à jour l'attribut lang du html
    document.documentElement.lang = this.current === 'wo' ? 'wo' : 'fr';
    // Mettre à jour le bouton toggle
    const btn = document.getElementById('langToggle');
    if (btn) btn.textContent = this.current === 'fr' ? '🇸🇳 Wolof' : '🇫🇷 Français';
  },

  // ── Injecter le bouton toggle dans le sidebar ────────────
  injectToggle() {
    const target = document.querySelector('.sidebar-footer');
    if (!target || document.getElementById('langToggle')) return;
    const div = document.createElement('div');
    div.style.cssText = 'padding:6px 11px;';
    div.innerHTML = `<button id="langToggle" onclick="Lang.toggle()"
      style="width:100%;padding:7px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);
             border-radius:7px;color:rgba(255,255,255,.6);font-size:12px;cursor:pointer;transition:all .2s"
      onmouseover="this.style.background='rgba(255,255,255,.12)'"
      onmouseout="this.style.background='rgba(255,255,255,.06)'">
      🇸🇳 Wolof
    </button>`;
    target.insertBefore(div, target.firstChild);
    this._applyToDOM();
  },

  // ── Toggle rapide FR ↔ WO ────────────────────────────────
  toggle() {
    this.set(this.current === 'fr' ? 'wo' : 'fr');
  },

  // ── Traduire une chaîne dynamique ────────────────────────
  translate(frText, woText) {
    return this.current === 'wo' ? woText : frText;
  }
};

// Auto-init
Lang.load();
document.addEventListener('DOMContentLoaded', () => {
  Lang._applyToDOM();
  // Injecter le toggle après que le sidebar soit rendu
  setTimeout(() => Lang.injectToggle(), 200);
});
