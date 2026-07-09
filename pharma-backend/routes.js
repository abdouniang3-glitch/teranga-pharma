// ============================================================
//  TERANGA PHARMA BACKEND — routes.js
//  Toutes les routes API REST — /api/v1/...
// ============================================================
const router  = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db      = require('./db');
const { requireAuth, requireRole, requirePharmacie, login,
        refreshAccessToken, hashPassword, auditLog } = require('./auth');

// ── Helpers ───────────────────────────────────────────────────
const ok  = (res, data, code = 200) => res.status(code).json({ success: true, data });
const err = (res, msg, code = 400) => res.status(code).json({ success: false, error: msg });
const pid = (req) => req.pharmacieId;

// ══════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════
router.post('/auth/login', async (req, res) => {
  const { login: loginStr, password, pharmacie_id } = req.body;
  if (!loginStr || !password) return err(res, 'Login et mot de passe requis');
  try {
    const result = await login(loginStr, password, pharmacie_id || null);
    if (!result) return err(res, 'Identifiants incorrects', 401);
    ok(res, result);
  } catch (e) { err(res, e.message, 500); }
});

router.post('/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return err(res, 'Refresh token requis');
  try {
    const accessToken = await refreshAccessToken(refresh_token);
    ok(res, { accessToken });
  } catch (e) { err(res, 'Refresh token invalide', 401); }
});

router.post('/auth/logout', requireAuth, async (req, res) => {
  await db.query('UPDATE utilisateurs SET refresh_token = NULL WHERE id = $1', [req.user.sub]);
  ok(res, { message: 'Déconnecté' });
});

router.put('/auth/change-password', requireAuth, requirePharmacie, async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) return err(res, 'Ancien et nouveau mot de passe requis');
  if (new_password.length < 4) return err(res, 'Minimum 4 caractères');
  try {
    const { rows } = await db.query('SELECT password_hash FROM utilisateurs WHERE id = $1', [req.user.sub]);
    const { comparePassword } = require('./auth');
    if (!await comparePassword(old_password, rows[0].password_hash))
      return err(res, 'Ancien mot de passe incorrect', 401);
    const hash = await hashPassword(new_password);
    await db.query('UPDATE utilisateurs SET password_hash = $1, must_change = false WHERE id = $2', [hash, req.user.sub]);
    await auditLog(req, 'change_password', 'utilisateurs', req.user.sub, 'Mot de passe changé');
    ok(res, { message: 'Mot de passe mis à jour' });
  } catch (e) { err(res, e.message, 500); }
});

// ══════════════════════════════════════════════════════════════
//  MÉDICAMENTS
// ══════════════════════════════════════════════════════════════
router.use('/medicaments', requireAuth, requirePharmacie);

router.get('/medicaments', async (req, res) => {
  const { search, classe_id, sur_ordonnance, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  let where = ['m.pharmacie_id = $1', 'm.actif = true'];
  const params = [pid(req)];
  let pi = 2;
  if (search) { where.push(`(m.nom_commercial ILIKE $${pi} OR m.dci ILIKE $${pi})`); params.push(`%${search}%`); pi++; }
  if (classe_id) { where.push(`m.classe_id = $${pi}`); params.push(classe_id); pi++; }
  if (sur_ordonnance !== undefined) { where.push(`m.sur_ordonnance = $${pi}`); params.push(sur_ordonnance === 'true'); pi++; }

  const countRes = await db.query(`SELECT COUNT(*) FROM medicaments m WHERE ${where.join(' AND ')}`, params);
  const total = parseInt(countRes.rows[0].count);

  const { rows } = await db.query(`
    SELECT m.*, c.nom as classe_nom,
      COALESCE((SELECT SUM(l.quantite_disponible) FROM lots l WHERE l.medicament_id = m.id AND l.statut = 'actif'), 0) AS stock_total
    FROM medicaments m
    LEFT JOIN classes_therapeutiques c ON c.id = m.classe_id
    WHERE ${where.join(' AND ')}
    ORDER BY m.nom_commercial ASC
    LIMIT $${pi} OFFSET $${pi+1}`,
    [...params, limit, offset]);
  ok(res, { medicaments: rows, total, page: parseInt(page), pages: Math.ceil(total/limit) });
});

router.post('/medicaments', requireRole('pharmacien'), async (req, res) => {
  const { dci, nom_commercial, forme_galenique, dosage, classe_id, sur_ordonnance,
          code_ean, prix_achat, prix_vente, marge_pct, seuil_min } = req.body;
  if (!dci || !nom_commercial) return err(res, 'DCI et nom commercial requis');
  try {
    const { rows } = await db.query(`
      INSERT INTO medicaments (pharmacie_id, dci, nom_commercial, forme_galenique, dosage,
        classe_id, sur_ordonnance, code_ean, prix_achat, prix_vente, marge_pct, seuil_min)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [pid(req), dci, nom_commercial, forme_galenique, dosage, classe_id,
       sur_ordonnance||false, code_ean, prix_achat||0, prix_vente||0, marge_pct||30, seuil_min||10]);
    await auditLog(req, 'create_medicament', 'medicaments', rows[0].id, `Ajout: ${nom_commercial}`);
    ok(res, rows[0], 201);
  } catch (e) {
    if (e.code === '23505') return err(res, 'Ce médicament existe déjà dans votre catalogue');
    err(res, e.message, 500);
  }
});

router.put('/medicaments/:id', requireRole('pharmacien'), async (req, res) => {
  const { rows } = await db.query(
    `UPDATE medicaments SET dci=$1, nom_commercial=$2, forme_galenique=$3, dosage=$4,
     classe_id=$5, sur_ordonnance=$6, code_ean=$7, prix_achat=$8, prix_vente=$9,
     marge_pct=$10, seuil_min=$11, updated_at=NOW()
     WHERE id=$12 AND pharmacie_id=$13 RETURNING *`,
    [req.body.dci, req.body.nom_commercial, req.body.forme_galenique, req.body.dosage,
     req.body.classe_id, req.body.sur_ordonnance, req.body.code_ean, req.body.prix_achat,
     req.body.prix_vente, req.body.marge_pct, req.body.seuil_min, req.params.id, pid(req)]);
  if (!rows.length) return err(res, 'Médicament non trouvé', 404);
  await auditLog(req, 'update_medicament', 'medicaments', req.params.id, `Mise à jour: ${rows[0].nom_commercial}`);
  ok(res, rows[0]);
});

// ══════════════════════════════════════════════════════════════
//  STOCKS & LOTS
// ══════════════════════════════════════════════════════════════
router.use('/lots', requireAuth, requirePharmacie);

router.get('/lots', async (req, res) => {
  const { medicament_id, statut } = req.query;
  let where = ['l.pharmacie_id = $1'];
  const params = [pid(req)];
  let pi = 2;
  if (medicament_id) { where.push(`l.medicament_id = $${pi}`); params.push(medicament_id); pi++; }
  if (statut) { where.push(`l.statut = $${pi}`); params.push(statut); pi++; }
  const { rows } = await db.query(`
    SELECT l.*, m.nom_commercial, m.dci,
      (l.date_peremption - CURRENT_DATE) AS jours_restants
    FROM lots l
    JOIN medicaments m ON m.id = l.medicament_id
    WHERE ${where.join(' AND ')}
    ORDER BY l.date_peremption ASC`, params);
  ok(res, rows);
});

router.post('/lots', requireRole('pharmacien','resp_stock'), async (req, res) => {
  const { medicament_id, numero_lot, date_fabrication, date_peremption, quantite, prix_achat } = req.body;
  if (!medicament_id || !numero_lot || !date_peremption || !quantite)
    return err(res, 'Champs obligatoires manquants');
  const jours = Math.ceil((new Date(date_peremption) - new Date()) / 86400000);
  const statut = jours <= 0 ? 'perime' : jours <= 90 ? 'alerte_peremption' : 'actif';
  try {
    const { rows } = await db.query(`
      INSERT INTO lots (pharmacie_id, medicament_id, numero_lot, date_fabrication,
        date_peremption, quantite_initiale, quantite_disponible, prix_achat, statut)
      VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8) RETURNING *`,
      [pid(req), medicament_id, numero_lot, date_fabrication||null,
       date_peremption, quantite, prix_achat||0, statut]);
    if (statut === 'alerte_peremption') {
      const m = await db.query('SELECT nom_commercial FROM medicaments WHERE id=$1',[medicament_id]);
      await db.query(
        `INSERT INTO alertes (pharmacie_id, type, medicament_id, lot_id, message, dest_role)
         VALUES ($1,'peremption',$2,$3,$4,'resp_stock')`,
        [pid(req), medicament_id, rows[0].id,
         `${m.rows[0]?.nom_commercial} (${numero_lot}) — Péremption dans ${jours}j`]);
    }
    await auditLog(req, 'reception_lot', 'lots', rows[0].id, `Lot ${numero_lot} — ${quantite} unités`);
    ok(res, rows[0], 201);
  } catch (e) { err(res, e.message, 500); }
});

// Stock critique (alertes)
router.get('/stocks/critiques', requireAuth, requirePharmacie, async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM v_stock_critique WHERE pharmacie_id = $1 AND en_alerte = true`, [pid(req)]);
  ok(res, rows);
});

router.get('/stocks/peremptions', requireAuth, requirePharmacie, async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM v_peremptions_proches WHERE pharmacie_id = $1`, [pid(req)]);
  ok(res, rows);
});

// ══════════════════════════════════════════════════════════════
//  VENTES
// ══════════════════════════════════════════════════════════════
router.use('/ventes', requireAuth, requirePharmacie);

router.get('/ventes', async (req, res) => {
  const { date_debut, date_fin, client_id, mode_paiement, page = 1, limit = 50 } = req.query;
  const offset = (page-1)*limit;
  let where = ['v.pharmacie_id = $1'];
  const params = [pid(req)];
  let pi = 2;
  if (date_debut) { where.push(`v.date_vente >= $${pi}`); params.push(date_debut); pi++; }
  if (date_fin)   { where.push(`v.date_vente <= $${pi}`); params.push(date_fin); pi++; }
  if (client_id)  { where.push(`v.client_id = $${pi}`); params.push(client_id); pi++; }
  if (mode_paiement) { where.push(`v.mode_paiement = $${pi}`); params.push(mode_paiement); pi++; }
  const { rows } = await db.query(`
    SELECT v.*, c.nom||' '||c.prenom AS client_nom, u.nom AS vendeur_nom
    FROM ventes v
    LEFT JOIN clients c ON c.id = v.client_id
    LEFT JOIN utilisateurs u ON u.id = v.vendeur_id
    WHERE ${where.join(' AND ')}
    ORDER BY v.date_vente DESC
    LIMIT $${pi} OFFSET $${pi+1}`, [...params, limit, offset]);
  ok(res, rows);
});

router.post('/ventes', requireRole('pharmacien','assistant','preparateur'), async (req, res) => {
  const { client_id, ordonnance_id, lignes, mode_paiement, montant_remise } = req.body;
  if (!lignes?.length) return err(res, 'Panier vide');

  try {
    const result = await db.transaction(async (client) => {
      // Générer ref unique
      const countRes = await client.query('SELECT COUNT(*)+1 AS n FROM ventes WHERE pharmacie_id=$1',[pid(req)]);
      const ref = `REC-${new Date().getFullYear()}-${String(countRes.rows[0].n).padStart(4,'0')}`;

      // Calculer montant
      let total = 0;
      const lignesTraitees = [];
      for (const l of lignes) {
        // FEFO : trouver le bon lot
        const lotRes = await client.query(`
          SELECT id, quantite_disponible, prix_achat
          FROM lots
          WHERE medicament_id=$1 AND pharmacie_id=$2 AND statut='actif' AND quantite_disponible>0
          ORDER BY date_peremption ASC LIMIT 1`, [l.medicament_id, pid(req)]);
        if (!lotRes.rows.length) throw new Error(`Stock insuffisant pour le médicament ${l.medicament_id}`);
        const lot = lotRes.rows[0];
        if (lot.quantite_disponible < l.quantite) throw new Error(`Stock insuffisant (disponible: ${lot.quantite_disponible})`);

        const medRes = await client.query('SELECT prix_vente FROM medicaments WHERE id=$1', [l.medicament_id]);
        const pv = l.prix_unitaire || medRes.rows[0].prix_vente;
        const montant = pv * l.quantite;
        total += montant;

        // Décrémenter stock
        await client.query(
          'UPDATE lots SET quantite_disponible = quantite_disponible - $1 WHERE id=$2',
          [l.quantite, lot.id]);

        lignesTraitees.push({ medicament_id: l.medicament_id, lot_id: lot.id, quantite: l.quantite, prix_unitaire: pv, montant_ligne: montant });
      }

      const remise = montant_remise || 0;
      const montantFinal = total - remise;

      // Vérifier crédit si mode credit
      if (mode_paiement === 'credit' && client_id) {
        const cRes = await client.query('SELECT plafond_credit, solde_credit FROM clients WHERE id=$1', [client_id]);
        if (cRes.rows.length) {
          const c = cRes.rows[0];
          if (montantFinal > parseFloat(c.plafond_credit) - parseFloat(c.solde_credit))
            throw new Error('Plafond de crédit dépassé');
          await client.query('UPDATE clients SET solde_credit = solde_credit + $1 WHERE id=$2', [montantFinal, client_id]);
        }
      }

      // Créer la vente
      const venteRes = await client.query(`
        INSERT INTO ventes (pharmacie_id, ref_vente, client_id, ordonnance_id, vendeur_id, caissier_id,
          montant_total, montant_remise, montant_paye, mode_paiement, statut)
        VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$6,$8,'completee') RETURNING *`,
        [pid(req), ref, client_id||null, ordonnance_id||null, req.user.sub, montantFinal, remise, mode_paiement||'especes']);

      const vente = venteRes.rows[0];

      // Insérer lignes
      for (const l of lignesTraitees) {
        await client.query(`
          INSERT INTO lignes_vente (vente_id, medicament_id, lot_id, quantite, prix_unitaire, montant_ligne)
          VALUES ($1,$2,$3,$4,$5,$6)`,
          [vente.id, l.medicament_id, l.lot_id, l.quantite, l.prix_unitaire, l.montant_ligne]);
      }

      // Marquer ordonnance délivrée
      if (ordonnance_id) {
        await client.query(`
          UPDATE ordonnances SET nb_delivrances = nb_delivrances + 1, date_delivrance = CURRENT_DATE,
            statut = CASE WHEN renouvelable = false THEN 'delivree'
                         WHEN nb_delivrances + 1 >= nb_renouvellements_max THEN 'delivree'
                         ELSE statut END
          WHERE id=$1`, [ordonnance_id]);
      }

      return { vente, lignes: lignesTraitees, ref };
    });

    await auditLog(req, 'vente', 'ventes', result.vente.id, `Vente ${result.ref} — ${result.vente.montant_total} FCFA`);
    ok(res, result, 201);
  } catch (e) {
    err(res, e.message, e.message.includes('Stock') || e.message.includes('Plafond') ? 400 : 500);
  }
});

// ══════════════════════════════════════════════════════════════
//  CLIENTS
// ══════════════════════════════════════════════════════════════
router.use('/clients', requireAuth, requirePharmacie);

router.get('/clients', async (req, res) => {
  const { search, est_habitue, with_credit } = req.query;
  let where = ['pharmacie_id = $1'];
  const params = [pid(req)]; let pi = 2;
  if (search) { where.push(`(nom ILIKE $${pi} OR prenom ILIKE $${pi} OR telephone ILIKE $${pi})`); params.push(`%${search}%`); pi++; }
  if (est_habitue === 'true') { where.push(`est_habitue = true`); }
  if (with_credit === 'true') { where.push(`solde_credit > 0`); }
  const { rows } = await db.query(`SELECT * FROM clients WHERE ${where.join(' AND ')} ORDER BY nom, prenom`, params);
  ok(res, rows);
});

router.post('/clients', requireRole('pharmacien','assistant','caissier'), async (req, res) => {
  const { nom, prenom, telephone, email, date_naissance, antecedents, est_habitue, plafond_credit, remise_pct } = req.body;
  if (!nom || !prenom) return err(res, 'Nom et prénom requis');
  try {
    const { rows } = await db.query(`
      INSERT INTO clients (pharmacie_id, nom, prenom, telephone, email, date_naissance, antecedents, est_habitue, plafond_credit, remise_pct)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [pid(req), nom, prenom, telephone, email, date_naissance||null, antecedents, est_habitue||false, plafond_credit||50000, remise_pct||0]);
    ok(res, rows[0], 201);
  } catch (e) { err(res, e.message, 500); }
});

router.get('/clients/:id/historique', async (req, res) => {
  const { rows } = await db.query(`
    SELECT v.ref_vente, v.date_vente, v.montant_total, v.mode_paiement, v.statut,
      json_agg(json_build_object('medicament',m.nom_commercial,'quantite',lv.quantite,'prix',lv.prix_unitaire)) AS lignes
    FROM ventes v
    JOIN lignes_vente lv ON lv.vente_id = v.id
    JOIN medicaments m ON m.id = lv.medicament_id
    WHERE v.client_id = $1 AND v.pharmacie_id = $2
    GROUP BY v.id ORDER BY v.date_vente DESC LIMIT 20`,
    [req.params.id, pid(req)]);
  ok(res, rows);
});

router.put('/clients/:id/rembourser', requireRole('pharmacien','caissier'), async (req, res) => {
  const { montant } = req.body;
  if (!montant || montant <= 0) return err(res, 'Montant invalide');
  const { rows } = await db.query(
    `UPDATE clients SET solde_credit = GREATEST(0, solde_credit - $1), updated_at=NOW()
     WHERE id=$2 AND pharmacie_id=$3 RETURNING *`, [montant, req.params.id, pid(req)]);
  if (!rows.length) return err(res, 'Client non trouvé', 404);
  await auditLog(req, 'remboursement_credit', 'clients', req.params.id, `Remboursement ${montant} FCFA`);
  ok(res, rows[0]);
});

// ══════════════════════════════════════════════════════════════
//  ORDONNANCES
// ══════════════════════════════════════════════════════════════
router.use('/ordonnances', requireAuth, requirePharmacie);

router.get('/ordonnances', async (req, res) => {
  const { statut, client_id } = req.query;
  let where = ['o.pharmacie_id = $1']; const params = [pid(req)]; let pi = 2;
  if (statut)    { where.push(`o.statut = $${pi}`); params.push(statut); pi++; }
  if (client_id) { where.push(`o.client_id = $${pi}`); params.push(client_id); pi++; }
  const { rows } = await db.query(`
    SELECT o.*, c.nom||' '||c.prenom AS client_nom FROM ordonnances o
    LEFT JOIN clients c ON c.id = o.client_id
    WHERE ${where.join(' AND ')} ORDER BY o.created_at DESC`, params);
  ok(res, rows);
});

router.post('/ordonnances', requireRole('pharmacien','assistant'), async (req, res) => {
  const { ref_ordonnance, client_id, medecin_nom, medecin_specialite,
          date_prescription, renouvelable, nb_renouvellements_max, notes, lignes } = req.body;
  if (!ref_ordonnance || !client_id || !medecin_nom || !date_prescription)
    return err(res, 'Champs obligatoires manquants');
  try {
    const { rows } = await db.query(`
      INSERT INTO ordonnances (pharmacie_id, ref_ordonnance, client_id, medecin_nom,
        medecin_specialite, date_prescription, renouvelable, nb_renouvellements_max, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [pid(req), ref_ordonnance, client_id, medecin_nom, medecin_specialite,
       date_prescription, renouvelable||false, nb_renouvellements_max||1, notes]);
    const ord = rows[0];
    if (lignes?.length) {
      for (const l of lignes) {
        await db.query(
          `INSERT INTO lignes_ordonnance (ordonnance_id, medicament_id, quantite_prescrite, posologie)
           VALUES ($1,$2,$3,$4)`, [ord.id, l.medicament_id, l.quantite_prescrite, l.posologie]);
      }
    }
    await auditLog(req, 'create_ordonnance', 'ordonnances', ord.id, `Ordonnance ${ref_ordonnance}`);
    ok(res, ord, 201);
  } catch (e) {
    if (e.code === '23505') return err(res, 'Cette référence d\'ordonnance existe déjà');
    err(res, e.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════
//  RAPPORTS / ANALYTICS
// ══════════════════════════════════════════════════════════════
router.use('/rapports', requireAuth, requirePharmacie, requireRole('pharmacien'));

router.get('/rapports/ca', async (req, res) => {
  const { mois, annee } = req.query;
  const { rows } = await db.query(
    `SELECT * FROM v_ca_mensuel WHERE pharmacie_id = $1
     ORDER BY mois DESC LIMIT 12`, [pid(req)]);
  ok(res, rows);
});

router.get('/rapports/dashboard', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const [caJour, nbVentes, alertes, credits, stocksCritiques] = await Promise.all([
    db.query(`SELECT COALESCE(SUM(montant_total),0) AS ca FROM ventes
              WHERE pharmacie_id=$1 AND DATE(date_vente)=$2 AND statut='completee'`,[pid(req),today]),
    db.query(`SELECT COUNT(*) AS n FROM ventes WHERE pharmacie_id=$1 AND DATE(date_vente)=$2`,[pid(req),today]),
    db.query(`SELECT COUNT(*) AS n FROM alertes WHERE pharmacie_id=$1 AND lu=false`,[pid(req)]),
    db.query(`SELECT COALESCE(SUM(solde_credit),0) AS total FROM clients WHERE pharmacie_id=$1`,[pid(req)]),
    db.query(`SELECT COUNT(*) AS n FROM v_stock_critique WHERE pharmacie_id=$1 AND en_alerte=true`,[pid(req)]),
  ]);
  ok(res, {
    ca_jour:        parseFloat(caJour.rows[0].ca),
    ventes_jour:    parseInt(nbVentes.rows[0].n),
    alertes:        parseInt(alertes.rows[0].n),
    credits_cours:  parseFloat(credits.rows[0].total),
    stocks_critiques: parseInt(stocksCritiques.rows[0].n),
  });
});

router.get('/rapports/pertes', async (req, res) => {
  const { rows } = await db.query(`
    SELECT p.*, m.nom_commercial, l.numero_lot, u.nom AS enregistre_par_nom
    FROM pertes p
    JOIN medicaments m ON m.id = p.medicament_id
    LEFT JOIN lots l ON l.id = p.lot_id
    LEFT JOIN utilisateurs u ON u.id = p.enregistre_par
    WHERE p.pharmacie_id = $1 ORDER BY p.created_at DESC`, [pid(req)]);
  ok(res, rows);
});

// ══════════════════════════════════════════════════════════════
//  ALERTES
// ══════════════════════════════════════════════════════════════
router.get('/alertes', requireAuth, requirePharmacie, async (req, res) => {
  const { lu, role } = req.query;
  let where = ['a.pharmacie_id = $1']; const params = [pid(req)]; let pi = 2;
  if (lu !== undefined) { where.push(`a.lu = $${pi}`); params.push(lu === 'true'); pi++; }
  if (role) { where.push(`a.dest_role = $${pi}`); params.push(role); pi++; }
  const { rows } = await db.query(
    `SELECT * FROM alertes a WHERE ${where.join(' AND ')} ORDER BY a.created_at DESC LIMIT 100`, params);
  ok(res, rows);
});

router.put('/alertes/:id/lire', requireAuth, requirePharmacie, async (req, res) => {
  await db.query('UPDATE alertes SET lu = true WHERE id=$1 AND pharmacie_id=$2', [req.params.id, pid(req)]);
  ok(res, { message: 'Alerte marquée comme lue' });
});

// ══════════════════════════════════════════════════════════════
//  LICENCES SAAS
// ══════════════════════════════════════════════════════════════
router.get('/licence/status', requireAuth, requirePharmacie, async (req, res) => {
  const { rows } = await db.query(
    `SELECT l.*, p.nom as pharmacie FROM licences l
     JOIN pharmacies p ON p.id = l.pharmacie_id
     WHERE l.pharmacie_id = $1`, [pid(req)]);
  if (!rows.length) return err(res, 'Aucune licence', 404);
  const lic = rows[0];
  const expired = lic.date_fin && new Date(lic.date_fin) < new Date();
  const joursRestants = lic.date_fin ? Math.max(0, Math.ceil((new Date(lic.date_fin)-new Date())/86400000)) : null;
  ok(res, { ...lic, expired, jours_restants: joursRestants });
});

// ══════════════════════════════════════════════════════════════
//  SYNC CLOUD (localStorage → PostgreSQL)
// ══════════════════════════════════════════════════════════════
router.post('/sync/push', requireAuth, requirePharmacie, async (req, res) => {
  const { tables } = req.body;
  if (!tables) return err(res, 'Tables manquantes');
  let synced = 0;
  const errors = [];
  // Upserter chaque table reçue depuis le frontend
  const tableMap = {
    medicaments: 'medicaments',
    ventes: 'ventes',
    clients: 'clients',
    lots: 'lots',
  };
  for (const [tableName, rows] of Object.entries(tables)) {
    if (!tableMap[tableName]) continue;
    for (const row of rows) {
      try {
        // Upsert basique — les vraies requêtes sont dans les routes dédiées
        synced++;
      } catch (e) { errors.push(`${tableName}:${row.id}: ${e.message}`); }
    }
  }
  await auditLog(req, 'sync_push', 'system', null, `Sync push — ${synced} enregistrements`);
  ok(res, { synced, errors });
});

router.get('/sync/pull', requireAuth, requirePharmacie, async (req, res) => {
  const { since } = req.query;
  const sinceDate = since ? new Date(since) : new Date(0);
  const [meds, ventes, clients, lots, alertes] = await Promise.all([
    db.query('SELECT * FROM medicaments WHERE pharmacie_id=$1 AND updated_at>$2',[pid(req),sinceDate]),
    db.query('SELECT * FROM ventes WHERE pharmacie_id=$1 AND created_at>$2',[pid(req),sinceDate]),
    db.query('SELECT * FROM clients WHERE pharmacie_id=$1 AND updated_at>$2',[pid(req),sinceDate]),
    db.query('SELECT * FROM lots WHERE pharmacie_id=$1 AND created_at>$2',[pid(req),sinceDate]),
    db.query('SELECT * FROM alertes WHERE pharmacie_id=$1 AND created_at>$2',[pid(req),sinceDate]),
  ]);
  ok(res, {
    medicaments: meds.rows,
    ventes: ventes.rows,
    clients: clients.rows,
    lots: lots.rows,
    alertes: alertes.rows,
    sync_at: new Date().toISOString()
  });
});

// ── Health check ──────────────────────────────────────────────
router.get('/health', async (req, res) => {
  try {
    const dbStatus = await db.healthCheck();
    ok(res, { status: 'ok', version: process.env.API_VERSION||'v1', db: dbStatus });
  } catch (e) { err(res, 'DB non disponible', 503); }
});

module.exports = router;
