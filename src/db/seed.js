// seed.js — Lance avec: node src/db/seed.js
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool: db } = require("../config/db");

const users = [
  { id:"u1", email:"admin@medifood.tn",             password:"admin123", name:"Admin MEDIFOOD",    role:"Admin",                   assigned:null,          prodRole:null },
  { id:"u2", email:"commercial@medifood.tn",         password:"comm123",  name:"Sarra Ben Ali",     role:"Responsable Commercial",  assigned:null,          prodRole:null },
  { id:"u3", email:"prod.amandes@medifood.tn",       password:"prod123",  name:"Khalil Trabelsi",   role:"Responsable Production",  assigned:["Amandes"],   prodRole:"mixte" },
  { id:"u4", email:"prod.pistaches@medifood.tn",     password:"prod123",  name:"Youssef Ghribi",    role:"Responsable Production",  assigned:["Pistaches"], prodRole:"mixte" },
  { id:"u5", email:"cuisson.amandes@medifood.tn",    password:"prod123",  name:"Ali Chaouachi",     role:"Responsable Production",  assigned:["Amandes"],   prodRole:"cuisson" },
  { id:"u6", email:"emballage.amandes@medifood.tn",  password:"prod123",  name:"Rim Belhaj",        role:"Responsable Production",  assigned:["Amandes"],   prodRole:"emballage" },
];

// IDs fixes — correspond exactement aux INSERT roles ci-dessous
const roleMap = {
  "Admin":                  "r1",
  "Responsable Commercial": "r2",
  "Responsable Production": "r3",
};

async function seed() {
  const conn = await db.getConnection();
  try {
    console.log("Debut du seed...\n");

    // ── 1. ROLES ────────────────────────────────────────────
    await conn.query(`
      INSERT IGNORE INTO roles (id, nom) VALUES
        ('r1', 'Admin'),
        ('r2', 'Responsable Commercial'),
        ('r3', 'Responsable Production')
    `);
    console.log("Roles inseres");

    // ── 2. USERS ────────────────────────────────────────────
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      await conn.query(
        `INSERT INTO users (id, email, password_hash, name, role_id, assigned_products, production_role, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE email = email`,
        [u.id, u.email, hash, u.name, roleMap[u.role], JSON.stringify(u.assigned), u.prodRole]
      );
      console.log("  Utilisateur cree : " + u.email + " / " + u.password);
    }

    // ── 3. PRODUCTS ─────────────────────────────────────────
    await conn.query(`
      INSERT IGNORE INTO products (id, name, unit, min_stock, max_capacity, current_stock) VALUES
        ('p1', 'Amandes',                 'kg', 200, 1500,  820),
        ('p2', 'Pistaches',               'kg', 150, 1000,  145),
        ('p3', 'Graines de tournesol',    'kg', 300, 2000, 1340),
        ('p4', 'Cacahuetes nature',       'kg', 400, 2500, 1820),
        ('p5', 'Cacahuetes enrobees',     'kg', 250, 1500,  360),
        ('p6', 'Fruits enrobes chocolat', 'kg', 200, 1200,   95)
    `);
    console.log("Produits inseres");

    // ── 4. CLIENTS ──────────────────────────────────────────
    await conn.query(`
      INSERT IGNORE INTO clients (id, client_number, name, company, phone, email, address, city, postal_code, matricule_fiscale, active) VALUES
        ('c1','0001','Hichem Mansouri',  'Carrefour Sfax',             '74 123 456','achats@carrefour-sfax.tn',    'Avenue Habib Bourguiba','Sfax',    '3000','0123456A/A/M/000',TRUE),
        ('c2','0002','Leila Ben Salah',  'Monoprix Tunis',             '71 987 654','l.bensalah@monoprix.tn',      'Rue de Marseille',      'Tunis',   '1000','0234567B/A/M/000',TRUE),
        ('c3','0003','Anis Khelifi',     'MG Distribution Sousse',     '73 555 222','anis@mg-dist.tn',             'Zone Industrielle',     'Sousse',  '4000','0345678C/A/M/000',TRUE),
        ('c4','0004','Sonia Gharbi',     'Geant Tunisia',              '71 444 333','s.gharbi@geant.tn',           'Lac 2 Berges du Lac',   'Tunis',   '1053','0456789D/A/M/000',TRUE),
        ('c5','0005','Fares Jebali',     'Delice Patisserie',          '74 666 111','contact@delice-patisserie.tn','Rue Mongi Slim',        'Sfax',    '3002', NULL,             TRUE),
        ('c6','0006','Maher Boukadi',    'Aziza Supermarches Monastir','73 333 999','achats@aziza.tn',             'Avenue Environnement',  'Monastir','5000','0567890E/A/M/000',TRUE),
        ('c7','0007','Ines Lahmar',      'Marche Centrale Gabes',      '75 222 444','ines@centrale-gabes.tn',      'Rue 18 Janvier',        'Gabes',   '6000', NULL,             TRUE),
        ('c8','0008','Walid Cherif',     'Magasin General Tunis',      '71 888 222','w.cherif@mg.tn',              'Charguia 1',            'Tunis',   '2035','0678901F/A/M/000',FALSE)
    `);
    console.log("Clients inseres");

    // ── 5. NOTIFICATIONS ────────────────────────────────────
    await conn.query(`
      INSERT IGNORE INTO notifications (id, type, message, read_status, recipient_role) VALUES
        ('n1','stock_insuffisant','Stock Pistaches insuffisant (145 kg < seuil 150 kg). Reapprovisionnement requis.',FALSE,'Responsable Commercial'),
        ('n2','stock_insuffisant','Stock Fruits enrobes chocolat critique (95 kg < seuil 200 kg).',FALSE,'Responsable Commercial')
    `);
    console.log("Notifications inserees");

    console.log("\nSeed termine avec succes !");
    console.log("Comptes disponibles :");
    console.log("  admin@medifood.tn             / admin123");
    console.log("  commercial@medifood.tn        / comm123");
    console.log("  prod.amandes@medifood.tn      / prod123");
    console.log("  prod.pistaches@medifood.tn    / prod123");
    console.log("  cuisson.amandes@medifood.tn   / prod123");
    console.log("  emballage.amandes@medifood.tn / prod123");

  } catch (err) {
    console.error("Erreur seed :", err.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed();
