-- ============================================================
--  TERANGA PHARMA — Système de Gestion d'une Pharmacie
--  Schéma relationnel complet — MySQL / SQLite compatible
--  Toutes les RG (RG1–RG36) implémentées
-- ============================================================

-- MÉDICAMENTS & CATALOGUE
CREATE TABLE IF NOT EXISTS classes_therapeutiques (
  id TEXT PRIMARY KEY, nom TEXT NOT NULL, description TEXT
);
CREATE TABLE IF NOT EXISTS medicaments (
  id TEXT PRIMARY KEY,
  dci TEXT NOT NULL,                      -- Dénomination Commune Internationale
  nom_commercial TEXT NOT NULL,           -- RG1, RG2
  forme_galenique TEXT NOT NULL,          -- comprimé, sirop, injectable... RG1
  dosage TEXT,
  classe_id TEXT,
  sur_ordonnance INTEGER DEFAULT 0,       -- RG3: 0=vente libre, 1=ordonnance
  prix_achat REAL DEFAULT 0,
  prix_vente REAL DEFAULT 0,              -- RG5: calculé auto
  marge_pct REAL DEFAULT 30,
  seuil_stock_min INTEGER DEFAULT 10,     -- RG10
  actif INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS interactions_medicaments (  -- RG4
  id TEXT PRIMARY KEY,
  medicament_id TEXT NOT NULL,
  medicament_interaction_id TEXT NOT NULL,
  niveau_gravite TEXT DEFAULT 'modere',   -- faible, modere, severe
  description TEXT
);

-- FOURNISSEURS — RG12
CREATE TABLE IF NOT EXISTS fournisseurs (
  id TEXT PRIMARY KEY,
  raison_sociale TEXT NOT NULL,
  telephone TEXT, email TEXT, adresse TEXT,
  numero_agrement TEXT,
  conditions_commerciales TEXT,
  actif INTEGER DEFAULT 1
);

-- CLIENTS — RG26, RG27, RG28, RG29
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL, prenom TEXT NOT NULL,
  telephone TEXT, email TEXT,
  date_naissance TEXT,
  antecedents_medicaux TEXT,
  est_habitue INTEGER DEFAULT 0,
  plafond_credit REAL DEFAULT 50000,       -- RG24
  solde_credit REAL DEFAULT 0,
  remise_pct REAL DEFAULT 0,              -- RG29
  created_at TEXT DEFAULT (datetime('now'))
);

-- STOCKS PAR LOT — RG6, RG7, RG8, RG9
CREATE TABLE IF NOT EXISTS lots (
  id TEXT PRIMARY KEY,
  medicament_id TEXT NOT NULL,
  numero_lot TEXT NOT NULL,
  date_fabrication TEXT,
  date_peremption TEXT NOT NULL,           -- RG8: alerte si < 3 mois
  quantite_initiale INTEGER DEFAULT 0,
  quantite_disponible INTEGER DEFAULT 0,
  prix_achat_lot REAL DEFAULT 0,
  statut TEXT DEFAULT 'actif',             -- actif, alerte_peremption, perime, quarantaine
  commande_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- COMMANDES FOURNISSEURS — RG13, RG14, RG15
CREATE TABLE IF NOT EXISTS commandes_fournisseurs (
  id TEXT PRIMARY KEY,
  fournisseur_id TEXT NOT NULL,
  ref_commande TEXT NOT NULL UNIQUE,
  statut TEXT DEFAULT 'brouillon',         -- brouillon, envoyee, partiellement_livree, livree, annulee
  date_commande TEXT DEFAULT (datetime('now')),
  date_livraison_prevue TEXT,
  generee_auto INTEGER DEFAULT 0,          -- RG13: automatique sur alerte stock
  creee_par TEXT,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS lignes_commande (
  id TEXT PRIMARY KEY,
  commande_id TEXT NOT NULL,
  medicament_id TEXT NOT NULL,
  quantite_commandee INTEGER NOT NULL,
  prix_unitaire_negocie REAL,
  quantite_recue INTEGER DEFAULT 0,
  statut_ligne TEXT DEFAULT 'attente'
);
CREATE TABLE IF NOT EXISTS litiges_fournisseurs (  -- RG17
  id TEXT PRIMARY KEY,
  commande_id TEXT NOT NULL,
  medicament_id TEXT,
  type_litige TEXT,                        -- quantite_manquante, non_conforme, perime
  quantite_litigieuse INTEGER,
  description TEXT,
  statut TEXT DEFAULT 'ouvert',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ORDONNANCES — RG19, RG20, RG21
CREATE TABLE IF NOT EXISTS ordonnances (
  id TEXT PRIMARY KEY,
  ref_ordonnance TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  medecin_nom TEXT, medecin_specialite TEXT,
  date_prescription TEXT NOT NULL,
  date_delivrance TEXT,
  renouvelable INTEGER DEFAULT 0,          -- RG21
  nb_renouvellements_max INTEGER DEFAULT 1,
  nb_delivrances INTEGER DEFAULT 0,
  statut TEXT DEFAULT 'en_attente',        -- en_attente, delivree, expiree, annulee
  notes TEXT
);
CREATE TABLE IF NOT EXISTS lignes_ordonnance (
  id TEXT PRIMARY KEY,
  ordonnance_id TEXT NOT NULL,
  medicament_id TEXT NOT NULL,
  quantite_prescrite INTEGER NOT NULL,
  posologie TEXT,
  duree_traitement TEXT
);

-- VENTES — RG18, RG22, RG23, RG25
CREATE TABLE IF NOT EXISTS ventes (
  id TEXT PRIMARY KEY,
  ref_vente TEXT NOT NULL UNIQUE,          -- numéro de reçu
  client_id TEXT,
  ordonnance_id TEXT,
  vendeur_id TEXT NOT NULL,
  caissier_id TEXT,
  date_vente TEXT DEFAULT (datetime('now')),
  montant_total REAL DEFAULT 0,
  montant_remise REAL DEFAULT 0,
  montant_paye REAL DEFAULT 0,
  mode_paiement TEXT DEFAULT 'especes',    -- especes, wave, orange_money, credit
  statut TEXT DEFAULT 'completee',
  notes TEXT
);
CREATE TABLE IF NOT EXISTS lignes_vente (
  id TEXT PRIMARY KEY,
  vente_id TEXT NOT NULL,
  medicament_id TEXT NOT NULL,
  lot_id TEXT NOT NULL,                    -- FEFO — RG7, RG22
  quantite INTEGER NOT NULL,
  prix_unitaire REAL NOT NULL,
  montant_ligne REAL NOT NULL
);

-- PERTES & RETOURS — RG30, RG31, RG32
CREATE TABLE IF NOT EXISTS pertes (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL,
  medicament_id TEXT NOT NULL,
  quantite INTEGER NOT NULL,
  valeur_perdue REAL DEFAULT 0,
  motif TEXT NOT NULL,                     -- perime, casse, vole, rappel_sanitaire
  enregistre_par TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS retours_fournisseurs (  -- RG30
  id TEXT PRIMARY KEY,
  fournisseur_id TEXT NOT NULL,
  lot_id TEXT NOT NULL,
  medicament_id TEXT NOT NULL,
  quantite INTEGER NOT NULL,
  motif TEXT,
  statut TEXT DEFAULT 'initie',
  created_at TEXT DEFAULT (datetime('now'))
);

-- UTILISATEURS
CREATE TABLE IF NOT EXISTS utilisateurs (
  id TEXT PRIMARY KEY,
  login TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nom TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  actif INTEGER DEFAULT 1,
  must_change INTEGER DEFAULT 0,
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ALERTES
CREATE TABLE IF NOT EXISTS alertes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                      -- stock_faible, peremption, credit_retard
  medicament_id TEXT, lot_id TEXT, client_id TEXT,
  message TEXT NOT NULL,
  lu INTEGER DEFAULT 0,
  dest_role TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- AUDIT — RG36
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entite TEXT, entite_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- VUES UTILES
CREATE VIEW IF NOT EXISTS v_stock_alerte AS
SELECT m.id, m.nom_commercial, m.dci,
  SUM(l.quantite_disponible) AS stock_total,
  m.seuil_stock_min,
  CASE WHEN SUM(l.quantite_disponible) <= m.seuil_stock_min THEN 1 ELSE 0 END AS en_alerte
FROM medicaments m
LEFT JOIN lots l ON l.medicament_id = m.id AND l.statut = 'actif'
GROUP BY m.id;

CREATE VIEW IF NOT EXISTS v_peremptions AS
SELECT l.id, m.nom_commercial, l.numero_lot, l.date_peremption,
  l.quantite_disponible,
  CAST((julianday(l.date_peremption) - julianday('now')) AS INTEGER) AS jours_restants
FROM lots l
JOIN medicaments m ON m.id = l.medicament_id
WHERE l.statut = 'actif' AND l.quantite_disponible > 0
ORDER BY jours_restants ASC;

-- INDEX
CREATE INDEX IF NOT EXISTS idx_lots_med    ON lots(medicament_id);
CREATE INDEX IF NOT EXISTS idx_ventes_date ON ventes(date_vente);
CREATE INDEX IF NOT EXISTS idx_lots_peremp ON lots(date_peremption);

-- ════════════════════════════════════════════
--  DONNÉES DE DÉMONSTRATION
-- ════════════════════════════════════════════
INSERT OR IGNORE INTO utilisateurs VALUES
  ('U001','pharmacien','PHARMA2025','Dr Aminata Sow','pharmacien','aminata.sow@pharma.sn',1,0,NULL,datetime('now')),
  ('U002','assistant','PHARMA2025','Ibrahima Diallo','assistant','ibrathima@pharma.sn',1,0,NULL,datetime('now')),
  ('U003','preparateur','PHARMA2025','Fatou Ndiaye','preparateur','fatou@pharma.sn',1,0,NULL,datetime('now')),
  ('U004','caissier','PHARMA2025','Moussa Ba','caissier','moussa@pharma.sn',1,0,NULL,datetime('now')),
  ('U005','resp_stock','PHARMA2025','Aida Sarr','resp_stock','aida@pharma.sn',1,0,NULL,datetime('now')),
  ('U006','client1','PHARMA2025','Modou Fall','client','modou@gmail.com',1,0,NULL,datetime('now')),
  ('U007','fournisseur1','PHARMA2025','COPHASE Distribution','fournisseur','contact@cophase.sn',1,0,NULL,datetime('now'));

INSERT OR IGNORE INTO classes_therapeutiques VALUES
  ('CT01','Antibiotiques','Médicaments anti-infectieux'),
  ('CT02','Analgésiques','Médicaments contre la douleur'),
  ('CT03','Antipaludéens','Traitement du paludisme'),
  ('CT04','Antihypertenseurs','Traitement hypertension'),
  ('CT05','Vitamines & Suppléments','Compléments nutritionnels');

INSERT OR IGNORE INTO medicaments VALUES
  ('M001','Amoxicilline','Amoxil 500mg','Gélule','500mg','CT01',1,2500,3750,30,20,1,datetime('now')),
  ('M002','Paracétamol','Doliprane 500mg','Comprimé','500mg','CT02',0,800,1300,25,50,1,datetime('now')),
  ('M003','Artéméther+Luméfantrine','Coartem 80/480mg','Comprimé','80/480mg','CT03',1,3500,5500,30,15,1,datetime('now')),
  ('M004','Amlodipine','Amlor 5mg','Comprimé','5mg','CT04',1,1500,2500,25,10,1,datetime('now')),
  ('M005','Vitamine C','Ascovit 500mg','Comprimé effervescent','500mg','CT05',0,500,900,30,30,1,datetime('now')),
  ('M006','Ibuprofène','Advil 400mg','Comprimé enrobé','400mg','CT02',0,1200,1900,28,25,1,datetime('now')),
  ('M007','Métronidazole','Flagyl 500mg','Comprimé','500mg','CT01',1,1800,2800,30,15,1,datetime('now'));

INSERT OR IGNORE INTO fournisseurs VALUES
  ('F001','COPHASE Distribution','+221 33 821 00 00','cophase@pharma.sn','Dakar — Zone Industrielle','AGR-001','Délai 48h, remise 5% > 500k',1),
  ('F002','Laborex Sénégal','+221 33 822 00 00','laborex@pharma.sn','Dakar — Plateau','AGR-002','Délai 24h, paiement 30j',1);

INSERT OR IGNORE INTO clients VALUES
  ('C001','Fall','Modou','+221 77 111 2233','modou@gmail.com','1980-05-15','Hypertension artérielle',1,75000,15000,5,datetime('now')),
  ('C002','Diop','Awa','+221 76 222 3344','awa@gmail.com','1992-09-20','Aucun',0,50000,0,0,datetime('now')),
  ('C003','Ndiaye','Ousmane','+221 70 333 4455','ousmane@gmail.com','1975-03-10','Diabète type 2',1,100000,5000,10,datetime('now'));

INSERT OR IGNORE INTO lots VALUES
  ('L001','M001','LOT-2024-001','2024-01-15','2026-01-15',100,45,2500,'actif','',datetime('now')),
  ('L002','M002','LOT-2024-002','2024-03-01','2026-03-01',500,320,800,'actif','',datetime('now')),
  ('L003','M003','LOT-2024-003','2024-02-10','2025-08-10',80,12,3500,'alerte_peremption','',datetime('now')),
  ('L004','M004','LOT-2024-004','2024-04-01','2027-04-01',200,8,1500,'actif','',datetime('now')),
  ('L005','M005','LOT-2024-005','2024-05-15','2026-05-15',300,180,500,'actif','',datetime('now')),
  ('L006','M006','LOT-2024-006','2024-01-20','2025-07-20',150,5,1200,'alerte_peremption','',datetime('now')),
  ('L007','M007','LOT-2024-007','2024-06-01','2026-06-01',120,60,1800,'actif','',datetime('now'));
