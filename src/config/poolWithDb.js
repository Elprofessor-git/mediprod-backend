const mysql = require("mysql2/promise");

// Ce pool est utilisé APRÈS initDatabase()
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "mediprod",  // ← base déjà créée
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
});

module.exports = pool;