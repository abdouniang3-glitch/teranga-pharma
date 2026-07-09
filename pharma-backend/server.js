// ============================================================
//  TERANGA PHARMA BACKEND — server.js
//  Serveur Express principal — API REST sécurisée
//  Compatible Railway, Render, Heroku, VPS
// ============================================================
require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const routes      = require('./routes');

const app  = express();
const PORT = process.env.PORT || 3001;
const API  = `/api/${process.env.API_VERSION || 'v1'}`;

// ── Sécurité ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // désactivé pour l'API
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5500')
  .split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (Postman, mobile apps)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    callback(new Error(`CORS bloqué : ${origin} non autorisé`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Pharmacie-ID'],
}));

// ── Rate limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX) || 200,
  message:  { success: false, error: 'Trop de requêtes — réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders:   false,
});
app.use(limiter);

// Rate limiter plus strict pour le login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Trop de tentatives de connexion — attendez 15 minutes' },
});
app.use(`${API}/auth/login`, loginLimiter);

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Header de version ─────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-App', 'TERANGA-PHARMA');
  res.setHeader('X-Version', '2.0.0');
  next();
});

// ── Routes API ────────────────────────────────────────────────
app.use(API, routes);

// ── Route racine ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name:        'TERANGA PHARMA API',
    version:     '2.0.0',
    status:      'running',
    api:         API,
    environment: process.env.NODE_ENV || 'development',
    docs:        `${API}/health`,
    endpoints: {
      auth:        `${API}/auth`,
      medicaments: `${API}/medicaments`,
      stocks:      `${API}/lots`,
      ventes:      `${API}/ventes`,
      clients:     `${API}/clients`,
      ordonnances: `${API}/ordonnances`,
      rapports:    `${API}/rapports`,
      alertes:     `${API}/alertes`,
      sync:        `${API}/sync`,
      licence:     `${API}/licence`,
    }
  });
});

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route inconnue : ${req.method} ${req.path}` });
});

// ── Error handler global ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.stack);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Une erreur interne est survenue'
      : err.message || 'Erreur interne',
  });
});

// ── Démarrage ─────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  💊  TERANGA PHARMA API v2.0.0         ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Environnement : ${(process.env.NODE_ENV||'development').padEnd(22)}║`);
  console.log(`║  Port          : ${String(PORT).padEnd(22)}║`);
  console.log(`║  API Base      : ${API.padEnd(22)}║`);
  console.log('╚════════════════════════════════════════╝\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM reçu — arrêt gracieux...');
  server.close(() => {
    console.log('[SERVER] Serveur arrêté');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('[SERVER] Exception non catchée:', err);
  process.exit(1);
});

module.exports = app;
