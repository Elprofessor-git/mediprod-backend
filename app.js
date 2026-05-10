// app.js — Serveur Express MediProd
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { initDatabase } = require("./src/config/db");
const routes = require("./src/routes");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middlewares globaux ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:8080",
  credentials: true,
}));
app.use(morgan("dev"));
app.use(express.json());

// ── Routes API ───────────────────────────────────────────────
app.use("/api", routes);

// ── Sanity check ─────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", app: "MediProd API" }));

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Route non trouvée" }));

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erreur interne du serveur" });
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 MediProd API démarrée sur http://localhost:${PORT}`);
      console.log(`📋 Routes disponibles : http://localhost:${PORT}/api`);
      console.log(`🔍 Health check      : http://localhost:${PORT}/health\n`);
    });
  })
  .catch((err) => {
    console.error("❌ Échec initialisation DB:", err.message);
    process.exit(1);
  });
