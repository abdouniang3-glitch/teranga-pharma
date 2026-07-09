-- ============================================================
--  TERANGA PHARMA — schema.sql (PostgreSQL)
--  Base de données relationnelle complète
--  Compatible Supabase, Railway, Neon, Render
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- recherche floue

-- ── Pharmacies (multi-tenant SaaS) ──────────────────────────
CREATE TABLE IF NOT EXISTS pharmacies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom           VARCHAR(100) NOT NULL,
  agrement      VARCHAR(50),
  adresse       TEXT,
  telephone     VARCHAR(20),
  email         VARCHAR(100),
  titulaire     VARCHAR(100),
  logo_url      TEXT,
  licence_type  VARCHAR(20) DEFAULT 'trial',  -- trial, basic, pro, enterprise
  licence_expiry TIMESTAMP,
  actif         BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ── Utilisateurs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS utilisateurs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id    UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  login           VARCHAR(50) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  nom             VARCHAR(100) NOT NULL,
  role            VARCHAR(30) NOT NULL
    CHECK (role IN ('pharmacien','assistant','preparateur','caissier','resp_stock','client','fournisseur','super_admin')),
  email           VARCHAR(100),
  telephone       VARCHAR(20),
  actif           BOOLEAN DEFAULT true,
  must_change     BOOLEAN DEFAULT false,
  last_login      TIMESTAMP,
  refresh_token   TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (pharmacie_id, login)
);

-- ── Classes thérapeutiques ───────────────────────────────────
CREATE TABLE IF NOT EXISTS classes_therapeutiques (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id  UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  code          VARCHAR(10) NOT NULL,
  nom           VARCHAR(100) NOT NULL,
  description   TEXT,
  UNIQUE (pharmacie_id, code)
);

-- ── Médicaments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicaments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id    UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  dci             VARCHAR(200) NOT NULL,
  nom_commercial  VARCHAR(200) NOT NULL,
  forme_galenique VARCHAR(50),
  dosage          VARCHAR(50),
  classe_id       UUID REFERENCES classes_therapeutiques(id),
  sur_ordonnance  BOOLEAN DEFAULT false,
  code_ean        VARCHAR(20),
  prix_achat      NUMERIC(12,2) DEFAULT 0,
  prix_vente      NUMERIC(12,2) DEFAULT 0,
  marge_pct       NUMERIC(5,2) DEFAULT 30,
  seuil_min       INTEGER DEFAULT 10,
  actif           BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (pharmacie_id, nom_commercial)
);
CREATE INDEX idx_med_pharmacie ON medicaments(pharmacie_id);
CREATE INDEX idx_med_dci ON medicaments USING gin(dci gin_trgm_ops);

-- ── Fournisseurs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fournisseurs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id    UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  raison_sociale  VARCHAR(200) NOT NULL,
  telephone       VARCHAR(20),
  email           VARCHAR(100),
  adresse         TEXT,
  numero_agrement VARCHAR(50),
  conditions      TEXT,
  actif           BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ── Clients ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id      UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  nom               VARCHAR(100) NOT NULL,
  prenom            VARCHAR(100) NOT NULL,
  telephone         VARCHAR(20),
  email             VARCHAR(100),
  date_naissance    DATE,
  antecedents       TEXT,
  est_habitue       BOOLEAN DEFAULT false,
  plafond_credit    NUMERIC(12,2) DEFAULT 50000,
  solde_credit      NUMERIC(12,2) DEFAULT 0,
  remise_pct        NUMERIC(5,2) DEFAULT 0,
  user_id           UUID REFERENCES utilisateurs(id),
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- ── Lots (stocks) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lots (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id        UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  medicament_id       UUID REFERENCES medicaments(id),
  numero_lot          VARCHAR(50) NOT NULL,
  date_fabrication    DATE,
  date_peremption     DATE NOT NULL,
  quantite_initiale   INTEGER DEFAULT 0,
  quantite_disponible INTEGER DEFAULT 0,
  prix_achat          NUMERIC(12,2) DEFAULT 0,
  statut              VARCHAR(30) DEFAULT 'actif'
    CHECK (statut IN ('actif','alerte_peremption','perime','quarantaine')),
  commande_id         UUID,
  created_at          TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_lots_med ON lots(medicament_id);
CREATE INDEX idx_lots_perem ON lots(date_peremption);
CREATE INDEX idx_lots_statut ON lots(statut);

-- ── Commandes fournisseurs ────────────────────────────────────
CREATE TABLE IF NOT EXISTS commandes_fournisseurs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id          UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  fournisseur_id        UUID REFERENCES fournisseurs(id),
  ref_commande          VARCHAR(50) NOT NULL,
  statut                VARCHAR(30) DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon','envoyee','partiellement_livree','livree','annulee')),
  date_commande         DATE DEFAULT CURRENT_DATE,
  date_livraison_prevue DATE,
  generee_auto          BOOLEAN DEFAULT false,
  creee_par             UUID REFERENCES utilisateurs(id),
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE (pharmacie_id, ref_commande)
);

CREATE TABLE IF NOT EXISTS lignes_commande (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commande_id           UUID REFERENCES commandes_fournisseurs(id) ON DELETE CASCADE,
  medicament_id         UUID REFERENCES medicaments(id),
  quantite_commandee    INTEGER NOT NULL,
  prix_unitaire_negocie NUMERIC(12,2),
  quantite_recue        INTEGER DEFAULT 0
);

-- ── Ordonnances ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ordonnances (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id          UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  ref_ordonnance        VARCHAR(50) NOT NULL,
  client_id             UUID REFERENCES clients(id),
  medecin_nom           VARCHAR(100),
  medecin_specialite    VARCHAR(100),
  date_prescription     DATE NOT NULL,
  date_delivrance       DATE,
  renouvelable          BOOLEAN DEFAULT false,
  nb_renouvellements_max INTEGER DEFAULT 1,
  nb_delivrances        INTEGER DEFAULT 0,
  statut                VARCHAR(20) DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente','delivree','expiree','annulee')),
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE (pharmacie_id, ref_ordonnance)
);

CREATE TABLE IF NOT EXISTS lignes_ordonnance (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ordonnance_id    UUID REFERENCES ordonnances(id) ON DELETE CASCADE,
  medicament_id    UUID REFERENCES medicaments(id),
  quantite_prescrite INTEGER NOT NULL,
  posologie        TEXT,
  duree_traitement TEXT
);

-- ── Ventes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id    UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  ref_vente       VARCHAR(50) NOT NULL,
  client_id       UUID REFERENCES clients(id),
  ordonnance_id   UUID REFERENCES ordonnances(id),
  vendeur_id      UUID REFERENCES utilisateurs(id),
  caissier_id     UUID REFERENCES utilisateurs(id),
  date_vente      TIMESTAMP DEFAULT NOW(),
  montant_total   NUMERIC(12,2) DEFAULT 0,
  montant_remise  NUMERIC(12,2) DEFAULT 0,
  montant_paye    NUMERIC(12,2) DEFAULT 0,
  mode_paiement   VARCHAR(20) DEFAULT 'especes'
    CHECK (mode_paiement IN ('especes','wave','orange_money','credit','tiers_payant')),
  organisme_tp_id UUID,
  part_tp         NUMERIC(12,2) DEFAULT 0,
  statut          VARCHAR(20) DEFAULT 'completee'
    CHECK (statut IN ('completee','annulee','credit')),
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (pharmacie_id, ref_vente)
);
CREATE INDEX idx_ventes_date ON ventes(date_vente);
CREATE INDEX idx_ventes_pharmacie ON ventes(pharmacie_id);

CREATE TABLE IF NOT EXISTS lignes_vente (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vente_id      UUID REFERENCES ventes(id) ON DELETE CASCADE,
  medicament_id UUID REFERENCES medicaments(id),
  lot_id        UUID REFERENCES lots(id),
  quantite      INTEGER NOT NULL,
  prix_unitaire NUMERIC(12,2) NOT NULL,
  montant_ligne NUMERIC(12,2) NOT NULL
);

-- ── Tiers Payant ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organismes_tp (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id          UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  code                  VARCHAR(20) NOT NULL,
  nom                   VARCHAR(100) NOT NULL,
  type                  VARCHAR(20),
  taux_prise_en_charge  NUMERIC(5,2) DEFAULT 80,
  plafond_mensuel       NUMERIC(12,2) DEFAULT 50000,
  actif                 BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS dossiers_tp (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id     UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  client_id        UUID REFERENCES clients(id),
  organisme_id     UUID REFERENCES organismes_tp(id),
  numero_adherent  VARCHAR(50),
  date_expiration  DATE,
  actif            BOOLEAN DEFAULT true,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS factures_tp (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id  UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  ref_facture   VARCHAR(50) NOT NULL,
  vente_id      UUID REFERENCES ventes(id),
  client_id     UUID REFERENCES clients(id),
  organisme_id  UUID REFERENCES organismes_tp(id),
  montant_total NUMERIC(12,2),
  part_tp       NUMERIC(12,2),
  part_patient  NUMERIC(12,2),
  date          TIMESTAMP DEFAULT NOW(),
  statut        VARCHAR(20) DEFAULT 'soumise'
    CHECK (statut IN ('soumise','acceptee','payee','rejete'))
);

-- ── Pertes & Alertes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pertes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id  UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  lot_id        UUID REFERENCES lots(id),
  medicament_id UUID REFERENCES medicaments(id),
  quantite      INTEGER NOT NULL,
  valeur_perdue NUMERIC(12,2) DEFAULT 0,
  motif         VARCHAR(50),
  enregistre_par UUID REFERENCES utilisateurs(id),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alertes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id  UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  type          VARCHAR(30),
  medicament_id UUID,
  lot_id        UUID,
  client_id     UUID,
  message       TEXT NOT NULL,
  lu            BOOLEAN DEFAULT false,
  dest_role     VARCHAR(30),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ── Audit & SMS logs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES utilisateurs(id),
  action      VARCHAR(50) NOT NULL,
  entite      VARCHAR(50),
  entite_id   UUID,
  details     TEXT,
  ip          VARCHAR(45),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  telephone   VARCHAR(20),
  message     TEXT,
  statut      VARCHAR(20),
  type        VARCHAR(30),
  user_id     UUID REFERENCES utilisateurs(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── Licences SaaS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licences (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacie_id  UUID REFERENCES pharmacies(id) UNIQUE,
  type          VARCHAR(20) DEFAULT 'trial'
    CHECK (type IN ('trial','basic','pro','enterprise')),
  date_debut    DATE DEFAULT CURRENT_DATE,
  date_fin      DATE,
  montant_fcfa  NUMERIC(12,2),
  paye          BOOLEAN DEFAULT false,
  wave_ref      VARCHAR(100),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ── Vues analytiques ──────────────────────────────────────────
CREATE OR REPLACE VIEW v_stock_critique AS
SELECT
  p.id AS pharmacie_id, p.nom AS pharmacie,
  m.id, m.nom_commercial, m.dci,
  COALESCE(SUM(l.quantite_disponible) FILTER (WHERE l.statut='actif'), 0) AS stock_total,
  m.seuil_min,
  CASE WHEN COALESCE(SUM(l.quantite_disponible) FILTER (WHERE l.statut='actif'),0) <= m.seuil_min
       THEN true ELSE false END AS en_alerte
FROM pharmacies p
JOIN medicaments m ON m.pharmacie_id = p.id
LEFT JOIN lots l ON l.medicament_id = m.id
GROUP BY p.id, p.nom, m.id, m.nom_commercial, m.dci, m.seuil_min;

CREATE OR REPLACE VIEW v_ca_mensuel AS
SELECT
  pharmacie_id,
  DATE_TRUNC('month', date_vente) AS mois,
  COUNT(*) AS nb_ventes,
  SUM(montant_total) AS ca,
  SUM(montant_remise) AS remises
FROM ventes
WHERE statut = 'completee'
GROUP BY pharmacie_id, DATE_TRUNC('month', date_vente)
ORDER BY mois DESC;

CREATE OR REPLACE VIEW v_peremptions_proches AS
SELECT
  l.pharmacie_id,
  m.nom_commercial,
  m.dci,
  l.numero_lot,
  l.date_peremption,
  l.quantite_disponible,
  (l.date_peremption - CURRENT_DATE) AS jours_restants
FROM lots l
JOIN medicaments m ON m.id = l.medicament_id
WHERE l.statut = 'actif'
  AND l.quantite_disponible > 0
  AND (l.date_peremption - CURRENT_DATE) <= 90
ORDER BY jours_restants ASC;
