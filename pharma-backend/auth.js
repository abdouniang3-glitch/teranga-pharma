// ============================================================
//  TERANGA PHARMA BACKEND — auth.js
//  JWT Authentication + middleware rôles + licences SaaS
// ============================================================
const jwt       = require('jsonwebtoken');
const bcrypt    = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db        = require('./db');
require('dotenv').config();

const JWT_SECRET         = process.env.JWT_SECRET || 'teranga_secret_dev';
const JWT_EXPIRES_IN     = process.env.JWT_EXPIRES_IN || '8h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'teranga_refresh_dev';
const BCRYPT_ROUNDS      = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// ── Génération tokens ─────────────────────────────────────────
const genAccessToken  = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
const genRefreshToken = (payload) => jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '30d' });

// ── Hachage mot de passe ─────────────────────────────────────
const hashPassword    = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

// ── Middleware : vérifier JWT ─────────────────────────────────
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token manquant' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Vérifier que l'utilisateur est toujours actif en base
    const { rows } = await db.query(
      'SELECT id, nom, role, pharmacie_id, actif FROM utilisateurs WHERE id = $1',
      [payload.sub]
    );
    if (!rows.length || !rows[0].actif) {
      return res.status(401).json({ error: 'Compte désactivé ou introuvable' });
    }
    req.user = { ...payload, ...rows[0] };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Token expiré', code: 'TOKEN_EXPIRED' });
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// ── Middleware : vérifier rôle ────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
  if (req.user.role === 'super_admin') return next(); // super admin passe partout
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Accès refusé — rôle requis: ${roles.join(' ou ')}` });
  }
  next();
};

// ── Middleware : vérifier licence SaaS ───────────────────────
const requireLicence = (...types) => async (req, res, next) => {
  if (!req.user?.pharmacie_id) return next(); // super_admin
  try {
    const { rows } = await db.query(
      `SELECT type, date_fin, paye FROM licences WHERE pharmacie_id = $1`,
      [req.user.pharmacie_id]
    );
    if (!rows.length) {
      return res.status(403).json({ error: 'Aucune licence active — contactez TERANGA PHARMA' });
    }
    const lic = rows[0];
    if (lic.date_fin && new Date(lic.date_fin) < new Date()) {
      return res.status(403).json({ error: 'Licence expirée — renouvelez votre abonnement', code: 'LICENCE_EXPIRED' });
    }
    if (types.length && !types.includes(lic.type)) {
      return res.status(403).json({ error: `Cette fonctionnalité nécessite une licence ${types.join(' ou ')}` });
    }
    req.licence = lic;
    next();
  } catch (err) {
    next(err);
  }
};

// ── Middleware : isoler par pharmacie ────────────────────────
// Ajoute automatiquement pharmacie_id à toutes les requêtes
const requirePharmacie = (req, res, next) => {
  if (!req.user?.pharmacie_id && req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Pharmacie non définie' });
  }
  req.pharmacieId = req.user.pharmacie_id;
  next();
};

// ── Login ─────────────────────────────────────────────────────
const login = async (loginStr, password, pharmacieId = null) => {
  let query = 'SELECT u.*, p.nom as pharmacie_nom FROM utilisateurs u LEFT JOIN pharmacies p ON p.id = u.pharmacie_id WHERE LOWER(u.login) = LOWER($1) AND u.actif = true';
  const params = [loginStr];

  if (pharmacieId) {
    query += ' AND u.pharmacie_id = $2';
    params.push(pharmacieId);
  }

  const { rows } = await db.query(query, params);
  if (!rows.length) return null;

  const user = rows[0];
  const valid = await comparePassword(password, user.password_hash);
  if (!valid) return null;

  // Mettre à jour last_login
  await db.query('UPDATE utilisateurs SET last_login = NOW() WHERE id = $1', [user.id]);

  const payload = {
    sub:          user.id,
    nom:          user.nom,
    role:         user.role,
    pharmacie_id: user.pharmacie_id,
    pharmacie:    user.pharmacie_nom,
    login:        user.login,
  };

  const accessToken  = genAccessToken(payload);
  const refreshToken = genRefreshToken({ sub: user.id });

  // Sauvegarder le refresh token
  await db.query('UPDATE utilisateurs SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

  return { user: payload, accessToken, refreshToken };
};

// ── Refresh token ─────────────────────────────────────────────
const refreshAccessToken = async (refreshToken) => {
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const { rows } = await db.query(
      'SELECT id, nom, role, pharmacie_id, login, refresh_token FROM utilisateurs WHERE id = $1 AND actif = true',
      [payload.sub]
    );
    if (!rows.length || rows[0].refresh_token !== refreshToken) {
      throw new Error('Refresh token invalide ou révoqué');
    }
    const u = rows[0];
    const newPayload = { sub: u.id, nom: u.nom, role: u.role, pharmacie_id: u.pharmacie_id, login: u.login };
    return genAccessToken(newPayload);
  } catch (err) {
    throw new Error('Refresh token invalide: ' + err.message);
  }
};

// ── Audit log ─────────────────────────────────────────────────
const auditLog = async (req, action, entite, entiteId, details) => {
  try {
    await db.query(
      `INSERT INTO audit_logs (pharmacie_id, user_id, action, entite, entite_id, details, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.pharmacieId, req.user?.sub, action, entite, entiteId, details,
       req.ip || req.connection?.remoteAddress]
    );
  } catch (e) {
    console.error('[AUDIT] Erreur log:', e.message);
  }
};

module.exports = {
  requireAuth, requireRole, requireLicence, requirePharmacie,
  login, refreshAccessToken, hashPassword, comparePassword,
  genAccessToken, genRefreshToken, auditLog
};
