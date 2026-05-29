const mysql = require("mysql2/promise");

const DB_NAME = process.env.DB_NAME || "mediprod";

const adminPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});

async function initDatabase() {
  const conn = await adminPool.getConnection();
  try {
    await conn.query(
      "CREATE DATABASE IF NOT EXISTS " + DB_NAME +
      " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );
    await conn.query("USE " + DB_NAME);
    console.log("Base de donnees " + DB_NAME + " prete");

    // 1. ROLES
    await conn.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id          VARCHAR(36)  PRIMARY KEY,
        nom         VARCHAR(50)  NOT NULL UNIQUE,
        description TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 2. USERS
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id               VARCHAR(36)  PRIMARY KEY,
        email            VARCHAR(100) NOT NULL UNIQUE,
        password_hash    VARCHAR(255) NOT NULL,
        name             VARCHAR(100) NOT NULL,
        role_id          VARCHAR(36)  NOT NULL,
        assigned_products JSON,
        production_role  ENUM('cuisson','emballage','mixte') DEFAULT NULL,
        active           BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 3. PRODUCTS
    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id            VARCHAR(36)   PRIMARY KEY,
        name          VARCHAR(100)  NOT NULL UNIQUE,
        unit          VARCHAR(10)   NOT NULL DEFAULT 'kg',
        min_stock     DECIMAL(10,3) NOT NULL DEFAULT 0,
        max_capacity  DECIMAL(10,3) NOT NULL DEFAULT 1000,
        current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
        qte_produit   DECIMAL(10,3) NOT NULL DEFAULT 0,
        qte_emballe   DECIMAL(10,3) NOT NULL DEFAULT 0,
        created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 4. CLIENTS
    await conn.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id                VARCHAR(36)  PRIMARY KEY,
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
        active            BOOLEAN  NOT NULL DEFAULT TRUE,
        created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 5. PRODUCTION ENTRIES
    await conn.query(`
      CREATE TABLE IF NOT EXISTS production_entries (
        id         VARCHAR(36)   PRIMARY KEY,
        date       DATETIME      NOT NULL,
        product_id VARCHAR(36)   NOT NULL,
        produced   DECIMAL(10,3) NOT NULL,
        packaged   DECIMAL(10,3) NOT NULL,
        lot        VARCHAR(50)   NOT NULL,
        operator   VARCHAR(100)  NOT NULL,
        notes      TEXT,
        created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 6. STOCK MOVEMENTS
    await conn.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id         VARCHAR(36)   PRIMARY KEY,
        date       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        product_id VARCHAR(36)   NOT NULL,
        type       ENUM('Entree','Sortie','Ajustement') NOT NULL,
        quantity   DECIMAL(10,3) NOT NULL,
        reason     VARCHAR(255),
        user_name  VARCHAR(100)  NOT NULL,
        created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 7. ORDERS
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id             VARCHAR(36) PRIMARY KEY,
        number         VARCHAR(30) NOT NULL UNIQUE,
        client_id      VARCHAR(36) NOT NULL,
        date           DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        delivery_date  DATETIME,
        status         ENUM('En attente','En cuisson','Cuit','En emballage','Terminé','Refusé') NOT NULL DEFAULT 'En attente',
        notes          TEXT,
        refusal_reason TEXT,
        created_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 8. ORDER ITEMS
    await conn.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id         VARCHAR(36)   PRIMARY KEY,
        order_id   VARCHAR(36)   NOT NULL,
        product_id VARCHAR(36)   NOT NULL,
        quantity   DECIMAL(10,3) NOT NULL,
        unit_price DECIMAL(10,3) NOT NULL,
        FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 9. ORDER PARTIAL QUANTITIES
    await conn.query(`
      CREATE TABLE IF NOT EXISTS order_partial_quantities (
        id         VARCHAR(36)   PRIMARY KEY,
        order_id   VARCHAR(36)   NOT NULL,
        product_id VARCHAR(36)   NOT NULL,
        quantity   DECIMAL(10,3) NOT NULL,
        UNIQUE KEY uq_order_product (order_id, product_id),
        FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 10. BONS DE LIVRAISON
    await conn.query(`
      CREATE TABLE IF NOT EXISTS bons_livraison (
        id                VARCHAR(36) PRIMARY KEY,
        number            VARCHAR(30) NOT NULL UNIQUE,
        client_id         VARCHAR(36) NOT NULL,
        order_id          VARCHAR(36),
        date              DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        delivery_date     DATETIME,
        status            ENUM('Brouillon','Émis','Livré') NOT NULL DEFAULT 'Brouillon',
        notes             TEXT,
        chauffeur         VARCHAR(150),
        matricule_fiscale VARCHAR(50),
        prepared_by       VARCHAR(100),
        created_at        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (order_id)  REFERENCES orders(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 11. BON ITEMS
    await conn.query(`
      CREATE TABLE IF NOT EXISTS bon_items (
        id              VARCHAR(36)   PRIMARY KEY,
        bon_id          VARCHAR(36)   NOT NULL,
        product_id      VARCHAR(36)   NULL,
        designation     VARCHAR(255)  NOT NULL,
        quantity        DECIMAL(10,3) NOT NULL,
        unit            ENUM('Kg','1P') NOT NULL,
        unit_price      DECIMAL(10,3) NOT NULL,
        conditionnement VARCHAR(100),
        observations    TEXT,
        FOREIGN KEY (bon_id)     REFERENCES bons_livraison(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 12. NOTIFICATIONS
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id             VARCHAR(36) PRIMARY KEY,
        date           DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        type           ENUM('stock_insuffisant','panne_machine','commande_refusee','manque_ouvriers','autre') NOT NULL,
        message        TEXT        NOT NULL,
        order_id       VARCHAR(36),
        read_status    BOOLEAN     NOT NULL DEFAULT FALSE,
        recipient_role ENUM('Responsable Commercial','Admin') NOT NULL,
        created_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 13. INCIDENTS
    await conn.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id          VARCHAR(36) PRIMARY KEY,
        date        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        type        ENUM('panne_machine','stock_insuffisant','manque_ouvriers','autre') NOT NULL,
        description TEXT        NOT NULL,
        order_id    VARCHAR(36),
        product_id  VARCHAR(36),
        reported_by VARCHAR(100) NOT NULL,
        created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log("Toutes les tables sont pretes");
  } finally {
    conn.release();
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});

module.exports = { pool, initDatabase };
