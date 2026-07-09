// ============================================================
//  TERANGA PHARMA — tiers-payant.js
//  Module Tiers Payant : IPRES, CSS, mutuelles, assurances
//  Phase 2 commerciale — différenciateur clé au Sénégal
// ============================================================

const TiersPayant = {

  // ── Organismes préchargés (Sénégal) ─────────────────────
  ORGANISMES: [
    { id:'TP001', code:'IPRES',    nom:'IPRES',                      type:'retraite',  taux_prise_en_charge:80, plafond_mensuel:50000,  actif:true },
    { id:'TP002', code:'CSS',      nom:'CSS (Caisse Séc. Sociale)',   type:'securite',  taux_prise_en_charge:80, plafond_mensuel:75000,  actif:true },
    { id:'TP003', code:'MSFP',     nom:'Mut. Fonctionnaires',         type:'mutuelle',  taux_prise_en_charge:70, plafond_mensuel:60000,  actif:true },
    { id:'TP004', code:'SALAMA',   nom:'Salama Assurances',           type:'assurance', taux_prise_en_charge:75, plafond_mensuel:100000, actif:true },
    { id:'TP005', code:'NSIA',     nom:'NSIA Assurances Sénégal',     type:'assurance', taux_prise_en_charge:75, plafond_mensuel:100000, actif:true },
    { id:'TP006', code:'AXA',      nom:'AXA Assurances Sénégal',      type:'assurance', taux_prise_en_charge:80, plafond_mensuel:120000, actif:true },
    { id:'TP007', code:'PM',       nom:'Prévoyance Maladie',          type:'mutuelle',  taux_prise_en_charge:60, plafond_mensuel:40000,  actif:true },
    { id:'TP008', code:'MUTAS',    nom:'Mut. des Agents de Santé',    type:'mutuelle',  taux_prise_en_charge:75, plafond_mensuel:55000,  actif:true },
    { id:'TP009', code:'CMU',      nom:'CMU (Couv. Maladie Univ.)',   type:'etat',      taux_prise_en_charge:50, plafond_mensuel:30000,  actif:true },
    { id:'TP010', code:'AUTRES',   nom:'Autre organisme',             type:'autre',     taux_prise_en_charge:70, plafond_mensuel:50000,  actif:true },
  ],

  // ── Initialiser la base tiers payant ─────────────────────
  init() {
    if (!DB.get('organismes_tp').length) {
      DB.set('organismes_tp', this.ORGANISMES);
    }
    if (!DB.get('dossiers_tp').length) {
      DB.set('dossiers_tp', []);
    }
    if (!DB.get('factures_tp').length) {
      DB.set('factures_tp', []);
    }
  },

  getOrganismes() { return DB.get('organismes_tp'); },

  getOrganisme(id) { return DB.get('organismes_tp').find(o => o.id === id) || null; },

  // ── Calculer la part tiers payant pour une vente ─────────
  calculer(montantTotal, organismeId, clientId) {
    const org = this.getOrganisme(organismeId);
    if (!org) return { part_tp: 0, part_patient: montantTotal, taux: 0 };

    // Vérifier plafond mensuel du client pour cet organisme
    const consomme = this.getConsommationMensuelle(clientId, organismeId);
    const dispoCouverture = Math.max(0, org.plafond_mensuel - consomme);

    const montantCouvert  = Math.min(montantTotal, dispoCouverture);
    const part_tp         = Math.round(montantCouvert * org.taux_prise_en_charge / 100);
    const part_patient    = montantTotal - part_tp;

    return {
      organisme: org,
      montant_total:   montantTotal,
      montant_couvert: montantCouvert,
      taux:            org.taux_prise_en_charge,
      part_tp,
      part_patient,
      plafond_restant: dispoCouverture - montantCouvert,
      depassement:     montantTotal > dispoCouverture
    };
  },

  // ── Consommation mensuelle du client chez un organisme ───
  getConsommationMensuelle(clientId, organismeId) {
    if (!clientId) return 0;
    const now   = new Date();
    const mois  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    return DB.get('factures_tp')
      .filter(f => f.client_id === clientId && f.organisme_id === organismeId &&
                   f.date && f.date.startsWith(mois) && f.statut !== 'rejete')
      .reduce((s, f) => s + (f.part_tp || 0), 0);
  },

  // ── Créer un dossier tiers payant ────────────────────────
  creerDossier(clientId, organismeId, numeroAdherent, dateExpiration) {
    const existing = DB.get('dossiers_tp').find(d =>
      d.client_id === clientId && d.organisme_id === organismeId && d.actif
    );
    if (existing) { Toast.warning('Ce client a déjà un dossier actif pour cet organisme'); return null; }

    const dossier = DB.push('dossiers_tp', {
      client_id:       clientId,
      organisme_id:    organismeId,
      numero_adherent: numeroAdherent,
      date_expiration: dateExpiration,
      actif:           true,
      created_by:      Auth.getUser()?.id
    });
    DB.push('audit_logs', {
      user_id: Auth.getUser()?.id,
      action: 'creation_dossier_tp',
      entite: 'dossiers_tp',
      entite_id: dossier.id,
      details: `Dossier TP créé — Client: ${clientId} — Organisme: ${organismeId}`
    });
    return dossier;
  },

  // ── Enregistrer une facturation tiers payant ─────────────
  enregistrerFacture(venteId, clientId, organismeId, montantTotal, partTP, partPatient) {
    const ref = 'FTP-' + new Date().getFullYear() + '-' + String(DB.get('factures_tp').length + 1).padStart(4, '0');
    const facture = DB.push('factures_tp', {
      ref_facture:  ref,
      vente_id:     venteId,
      client_id:    clientId,
      organisme_id: organismeId,
      montant_total: montantTotal,
      part_tp:      partTP,
      part_patient: partPatient,
      date:         new Date().toISOString(),
      statut:       'soumise', // soumise → acceptee → payee | rejete
      created_by:   Auth.getUser()?.id
    });
    DB.push('audit_logs', {
      user_id: Auth.getUser()?.id,
      action: 'facture_tp',
      entite: 'factures_tp',
      entite_id: facture.id,
      details: `Facture TP ${ref} — Part TP: ${Fmt.currency(partTP)} — Part patient: ${Fmt.currency(partPatient)}`
    });
    return facture;
  },

  // ── Dossier actif d'un client ────────────────────────────
  getDossierClient(clientId) {
    return DB.get('dossiers_tp').find(d => d.client_id === clientId && d.actif) || null;
  },

  // ── Stats globales tiers payant ──────────────────────────
  getStats() {
    const factures   = DB.get('factures_tp');
    const totalTP    = factures.filter(f => f.statut !== 'rejete').reduce((s,f) => s + (f.part_tp||0), 0);
    const totalPat   = factures.reduce((s,f) => s + (f.part_patient||0), 0);
    const enAttente  = factures.filter(f => f.statut === 'soumise').reduce((s,f) => s + (f.part_tp||0), 0);
    const paye       = factures.filter(f => f.statut === 'payee').reduce((s,f) => s + (f.part_tp||0), 0);
    return { totalTP, totalPat, enAttente, paye, nbFactures: factures.length };
  }
};
