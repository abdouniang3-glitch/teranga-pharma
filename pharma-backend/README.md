# 💊 TERANGA PHARMA — Guide de Déploiement Complet

## Architecture Phase 3

```
teranga-pharma/
├── pharma/                  ← Frontend (HTML/CSS/JS)
│   ├── index.html           ← Login avec PWA
│   ├── landing.html         ← Page commerciale / tarifs
│   ├── manifest.json        ← PWA manifest
│   ├── sw.js                ← Service Worker offline
│   ├── css/style.css        ← Thème complet
│   ├── js/
│   │   ├── app.js           ← Moteur + base DPML 116 médicaments
│   │   ├── sidebar.js       ← Navigation dynamique
│   │   ├── backup.js        ← Export/import JSON
│   │   ├── pdf.js           ← Reçus/rapports PDF
│   │   ├── scanner.js       ← Scanner code-barres
│   │   ├── tiers-payant.js  ← IPRES/CSS/Mutuelles
│   │   ├── wolof.js         ← Interface bilingue 🇸🇳
│   │   ├── sms.js           ← SMS Wave/Orange/Infobip
│   │   └── api.js           ← Client API REST + sync cloud
│   └── pages/               ← 41 pages HTML (7 rôles)
│
└── pharma-backend/          ← Backend Node.js
    ├── server.js            ← Serveur Express
    ├── routes.js            ← Routes API REST
    ├── auth.js              ← JWT + bcrypt + rôles
    ├── db.js                ← Pool PostgreSQL
    ├── schema.sql           ← Base de données complète
    └── .env.example         ← Variables d'environnement
```

---

## 🚀 Déploiement Frontend (Netlify — Gratuit)

### Option 1 : Glisser-déposer
1. Aller sur [netlify.com](https://netlify.com)
2. Faire glisser le dossier `pharma/` dans l'interface
3. L'URL est générée automatiquement (ex: `teranga-pharma.netlify.app`)

### Option 2 : GitHub + Netlify (recommandé)
```bash
# 1. Créer un repo GitHub
git init && git add . && git commit -m "TERANGA PHARMA v2.0"
git remote add origin https://github.com/votre-user/teranga-pharma.git
git push -u origin main

# 2. Sur Netlify : New site → Import from GitHub → Sélectionner le repo
# Base directory: pharma/
# Build command: (vide)
# Publish directory: pharma/
```

---

## 🗄️ Déploiement Base de Données (Supabase — Gratuit)

### 1. Créer le projet Supabase
1. Aller sur [supabase.com](https://supabase.com)
2. New Project → Nom: `teranga-pharma`
3. Région : `West EU` (le plus proche de l'Afrique de l'Ouest)
4. Copier l'URL et la clé API

### 2. Créer les tables
```bash
# Dans l'éditeur SQL de Supabase, copier-coller schema.sql
# Ou via psql :
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < schema.sql
```

---

## 🖥️ Déploiement Backend (Railway — 5$/mois ou gratuit)

### Option 1 : Railway (recommandé)
```bash
# 1. Installer Railway CLI
npm install -g @railway/cli
railway login

# 2. Déployer
cd pharma-backend
railway init
railway add --plugin postgresql
railway up

# 3. Variables d'environnement dans Railway Dashboard :
# DATABASE_URL = (auto-rempli par Railway)
# JWT_SECRET = votre_secret_long_et_aleatoire
# CORS_ORIGIN = https://teranga-pharma.netlify.app
```

### Option 2 : Render (gratuit, dormance après 15min)
```bash
# render.yaml (à créer dans pharma-backend/)
services:
  - type: web
    name: teranga-pharma-api
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: teranga-pharma-db
          property: connectionString
```

### Option 3 : VPS Ubuntu (contrôle total)
```bash
# Sur le serveur :
sudo apt update && sudo apt install nodejs npm postgresql nginx -y

# PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE teranga_pharma;"
sudo -u postgres psql teranga_pharma < schema.sql

# Backend avec PM2
npm install -g pm2
cd /var/www/pharma-backend
npm install
cp .env.example .env && nano .env  # remplir les variables
pm2 start server.js --name teranga-pharma
pm2 save && pm2 startup

# Nginx reverse proxy
cat > /etc/nginx/sites-available/teranga-pharma << 'EOF'
server {
    listen 80;
    server_name api.teranga-pharma.sn;
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/teranga-pharma /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.teranga-pharma.sn  # SSL gratuit
sudo nginx -t && sudo systemctl restart nginx
```

---

## 🔗 Connecter Frontend → Backend

Dans les paramètres de l'application (⚙️), saisir l'URL du backend :
```
https://api.teranga-pharma.sn/api/v1
ou
https://your-app.railway.app/api/v1
```

Ou directement en modifiant `js/api.js` :
```javascript
BASE_URL: 'https://votre-api.railway.app/api/v1'
```

---

## 💰 Modèle SaaS — Gestion des Licences

### Prix recommandés (FCFA)
| Formule | Mensuel | Annuel | Économie |
|---------|---------|--------|---------|
| Trial   | Gratuit | —      | 30 jours |
| Basic   | 25 000  | 250 000 | 2 mois offerts |
| Pro     | 50 000  | 480 000 | 2 mois offerts |
| Enterprise | Sur devis | — | Négociable |

### Créer une licence en base
```sql
-- Créer une pharmacie
INSERT INTO pharmacies (nom, agrement, adresse, telephone)
VALUES ('Pharmacie de la Paix', 'AUTH-2024-001', 'Thiès, Sénégal', '+221 77 000 00 00');

-- Créer une licence Pro 1 an
INSERT INTO licences (pharmacie_id, type, date_debut, date_fin, montant_fcfa, paye)
SELECT id, 'pro', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 480000, true
FROM pharmacies WHERE nom = 'Pharmacie de la Paix';

-- Créer le compte pharmacien titulaire
INSERT INTO utilisateurs (pharmacie_id, login, password_hash, nom, role)
SELECT p.id, 'pharmacien', '$2b$12$...', 'Dr Aminata Sow', 'pharmacien'
FROM pharmacies p WHERE p.nom = 'Pharmacie de la Paix';
```

---

## 📱 Activer la PWA

1. Ouvrir l'application dans Chrome ou Edge
2. Un bouton "📲 Installer l'application" apparaît sur la page de login
3. Cliquer → confirmer → l'app s'installe sur le bureau/téléphone
4. Elle fonctionne ensuite comme une vraie application

---

## 🔒 Sécurité en Production

```bash
# Générer un JWT_SECRET fort
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Variables obligatoires en production
NODE_ENV=production
JWT_SECRET=[64 caractères aléatoires]
CORS_ORIGIN=https://votre-domaine.netlify.app
DB_SSL=true
```

---

## 🧪 Test de l'API

```bash
# Health check
curl https://votre-api.railway.app/api/v1/health

# Login
curl -X POST https://votre-api.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"pharmacien","password":"PHARMA2025"}'

# Médicaments (avec token)
curl https://votre-api.railway.app/api/v1/medicaments \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

---

## 📞 Support

- **WhatsApp** : +221 77 000 00 00
- **Email** : support@teranga-pharma.sn
- **Docs** : [teranga-pharma.netlify.app/docs](https://teranga-pharma.netlify.app)

---

*TERANGA PHARMA v2.0 — Fait au Sénégal 🇸🇳 avec ❤️*
