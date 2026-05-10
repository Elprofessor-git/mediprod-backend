// src/config/db.js
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "localhost",
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME     || "mediprod",
  waitForConnections: true,
  connectionLimit:    10,
  charset: "utf8mb4",
});

// Test de connexion au démarrage
pool.getConnection()
  .then(conn => {
    console.log("✅ MySQL connecté — base:", process.env.DB_NAME || "mediprod");
    conn.release();
  })
  .catch(err => {
    console.error("❌ Erreur connexion MySQL:", err.message);
    process.exit(1);
  });

module.exports = pool;
