// seed.js — Lance avec: node src/db/seed.js
// Crée les utilisateurs avec mots de passe hashés bcrypt
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../config/db");

const users = [
  { id: "u1", email: "admin@medifood.tn",             password: "admin123", name: "Admin MEDIFOOD",    role: "Admin",                    assigned: null,                     prodRole: null },
  { id: "u2", email: "commercial@medifood.tn",         password: "comm123",  name: "Sarra Ben Ali",     role: "Responsable Commercial",   assigned: null,                     prodRole: null },
  { id: "u3", email: "prod.amandes@medifood.tn",       password: "prod123",  name: "Khalil Trabelsi",   role: "Responsable Production",   assigned: ["Amandes"],              prodRole: "mixte" },
  { id: "u4", email: "prod.pistaches@medifood.tn",     password: "prod123",  name: "Youssef Ghribi",    role: "Responsable Production",   assigned: ["Pistaches"],            prodRole: "mixte" },
  { id: "u5", email: "cuisson.amandes@medifood.tn",    password: "prod123",  name: "Ali Chaouachi",     role: "Responsable Production",   assigned: ["Amandes"],              prodRole: "cuisson" },
  { id: "u6", email: "emballage.amandes@medifood.tn",  password: "prod123",  name: "Rim Belhaj",        role: "Responsable Production",   assigned: ["Amandes"],              prodRole: "emballage" },
];

async function seed() {
  const conn = await db.getConnection();
  try {
    // Récupérer les IDs de rôles
    const [roles] = await conn.query("SELECT id, nom FROM roles");
    const roleMap = {};
    roles.forEach(r => roleMap[r.nom] = r.id);

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      await conn.query(
        `INSERT INTO users (id, email, password_hash, name, role_id, assigned_products, production_role, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE email = email`,
        [u.id, u.email, hash, u.name, roleMap[u.role], JSON.stringify(u.assigned), u.prodRole]
      );
      console.log(`✅ Utilisateur créé : ${u.email}`);
    }
    console.log("\n🎉 Seed terminé avec succès !");
  } catch (err) {
    console.error("❌ Erreur seed :", err.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed();
