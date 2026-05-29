-- ============================================================
-- MEDIFOOD MediProd — Schéma MySQL complet
-- Généré depuis src/store/data.ts + src/store/auth.ts
-- ============================================================

CREATE DATABASE IF NOT EXISTS mediprod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mediprod;

-- ------------------------------------------------------------
-- 1. ROLES
-- ------------------------------------------------------------
CREATE TABLE roles (
  id        VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  nom       VARCHAR(50)  NOT NULL UNIQUE,
  description TEXT
);

INSERT INTO roles (id, nom) VALUES
  ('r1', 'Admin'),
  ('r2', 'Responsable Commercial'),
  ('r3', 'Responsable Production');

-- ------------------------------------------------------------
-- 2. UTILISATEURS
-- ------------------------------------------------------------
CREATE TABLE users (
  id               VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  email            VARCHAR(100) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  name             VARCHAR(100) NOT NULL,
  role_id          VARCHAR(36)  NOT NULL,
  assigned_products JSON,           -- ex: ["Amandes","Pistaches"]
  production_role  ENUM('cuisson','emballage','mixte') DEFAULT NULL,
  active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ------------------------------------------------------------
-- 3. PRODUITS
-- ------------------------------------------------------------
CREATE TABLE products (
  id           VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  name         VARCHAR(100) NOT NULL UNIQUE,
  unit         VARCHAR(10)  NOT NULL DEFAULT 'kg',
  min_stock    DECIMAL(10,3) NOT NULL DEFAULT 0,
  max_capacity DECIMAL(10,3) NOT NULL DEFAULT 1000,
  current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
  qte_produit   DECIMAL(10,3) NOT NULL DEFAULT 0,
  qte_emballe   DECIMAL(10,3) NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (id, name, unit, min_stock, max_capacity, current_stock) VALUES
  ('p1', 'Amandes',               'kg', 200, 1500, 820),
  ('p2', 'Pistaches',             'kg', 150, 1000, 145),
  ('p3', 'Graines de tournesol',  'kg', 300, 2000, 1340),
  ('p4', 'Cacahuètes nature',     'kg', 400, 2500, 1820),
  ('p5', 'Cacahuètes enrobées',   'kg', 250, 1500, 360),
  ('p6', 'Fruits enrobés chocolat','kg', 200, 1200, 95);

-- ------------------------------------------------------------
-- 4. CLIENTS
-- ------------------------------------------------------------
CREATE TABLE clients (
  id                VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  client_number     VARCHAR(10)  UNIQUE,
  name              VARCHAR(100) NOT NULL,
  company           VARCHAR(150),
  phone             VARCHAR(30),
  email             VARCHAR(100),
  address           TEXT,
  city              VARCHAR(80),
  postal_code       VARCHAR(10),
  matricule_fiscale VARCHAR(50),
  notes             TEXT,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 5. PRODUCTION
-- ------------------------------------------------------------
CREATE TABLE production_entries (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  date        DATETIME     NOT NULL,
  product_id  VARCHAR(36)  NOT NULL,
  user_id     VARCHAR(36)  NULL,
  produced    DECIMAL(10,3) NOT NULL,
  packaged    DECIMAL(10,3) NOT NULL,
  lot         VARCHAR(50)  NOT NULL,
  operator    VARCHAR(100) NOT NULL,
  notes       TEXT,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 6. MOUVEMENTS DE STOCK
-- ------------------------------------------------------------
CREATE TABLE stock_movements (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  date        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  product_id  VARCHAR(36)  NOT NULL,
  type        ENUM('Entrée','Sortie','Ajustement') NOT NULL,
  quantity    DECIMAL(10,3) NOT NULL,
  reason      VARCHAR(255),
  user_name   VARCHAR(100) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ------------------------------------------------------------
-- 7. COMMANDES
-- ------------------------------------------------------------
CREATE TABLE orders (
  id              VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  number          VARCHAR(30)  NOT NULL UNIQUE,
  client_id       VARCHAR(36)  NOT NULL,
  date            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivery_date   DATETIME,
  status          ENUM('En attente','En cuisson','Cuit','En emballage','Terminé','Refusé') NOT NULL DEFAULT 'En attente',
  notes           TEXT,
  refusal_reason  TEXT,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE order_items (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  order_id    VARCHAR(36)  NOT NULL,
  product_id  VARCHAR(36)  NOT NULL,
  quantity    DECIMAL(10,3) NOT NULL,
  unit_price  DECIMAL(10,3) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Quantités partielles par produit lors du changement de statut
CREATE TABLE order_partial_quantities (
  id         VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  order_id   VARCHAR(36)  NOT NULL,
  product_id VARCHAR(36)  NOT NULL,
  quantity   DECIMAL(10,3) NOT NULL,
  UNIQUE KEY uq_order_product (order_id, product_id),
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ------------------------------------------------------------
-- 8. BONS DE LIVRAISON
-- ------------------------------------------------------------
CREATE TABLE bons_livraison (
  id                VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  number            VARCHAR(30)  NOT NULL UNIQUE,
  client_id         VARCHAR(36)  NOT NULL,
  order_id          VARCHAR(36),
  date              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivery_date     DATETIME,
  status            ENUM('Brouillon','Émis','Livré') NOT NULL DEFAULT 'Brouillon',
  notes             TEXT,
  chauffeur         VARCHAR(150),
  matricule_fiscale VARCHAR(50),
  prepared_by       VARCHAR(100),
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (order_id)  REFERENCES orders(id)
);

CREATE TABLE bon_items (
  id              VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  bon_id          VARCHAR(36)  NOT NULL,
  designation     VARCHAR(255) NOT NULL,
  quantity        DECIMAL(10,3) NOT NULL,
  unit            ENUM('Kg','1P') NOT NULL,
  unit_price      DECIMAL(10,3) NOT NULL,
  conditionnement VARCHAR(100),
  observations    TEXT,
  FOREIGN KEY (bon_id) REFERENCES bons_livraison(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 9. NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE notifications (
  id             VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  date           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  type           ENUM('stock_insuffisant','panne_machine','commande_refusée','manque_ouvriers','autre') NOT NULL,
  message        TEXT         NOT NULL,
  order_id       VARCHAR(36),
  read_status    BOOLEAN      NOT NULL DEFAULT FALSE,
  recipient_role ENUM('Responsable Commercial','Admin') NOT NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 10. INCIDENTS
-- ------------------------------------------------------------
CREATE TABLE incidents (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  date        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  type        ENUM('panne_machine','stock_insuffisant','manque_ouvriers','autre') NOT NULL,
  description TEXT         NOT NULL,
  order_id    VARCHAR(36),
  product_id  VARCHAR(36),
  reported_by VARCHAR(100) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
