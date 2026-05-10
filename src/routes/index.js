// src/routes/index.js — Point d'entrée de toutes les routes
const express = require("express");
const router  = express.Router();

const auth      = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");

const authCtrl    = require("../controllers/auth.controller");
const usersCtrl   = require("../controllers/users.controller");
const productsCtrl= require("../controllers/products.controller");
const productionCtrl = require("../controllers/production.controller");
const stockCtrl   = require("../controllers/stock.controller");
const ordersCtrl  = require("../controllers/orders.controller");
const clientsCtrl = require("../controllers/clients.controller");
const bonsCtrl    = require("../controllers/bons.controller");
const notifsCtrl  = require("../controllers/notifications.controller");

// ── AUTH ────────────────────────────────────────────────────
router.post("/auth/login", authCtrl.login);
router.get ("/auth/me",    auth, authCtrl.me);
router.put ("/auth/me",    auth, authCtrl.updateMe);

// ── USERS (Admin only) ───────────────────────────────────────
router.get   ("/users",     auth, allowRoles("Admin"), usersCtrl.getAll);
router.post  ("/users",     auth, allowRoles("Admin"), usersCtrl.create);
router.put   ("/users/:id", auth, allowRoles("Admin"), usersCtrl.update);
router.delete("/users/:id", auth, allowRoles("Admin"), usersCtrl.remove);

// ── PRODUCTS ─────────────────────────────────────────────────
router.get   ("/products",     auth, productsCtrl.getAll);
router.post  ("/products",     auth, allowRoles("Admin"), productsCtrl.create);
router.put   ("/products/:id", auth, allowRoles("Admin"), productsCtrl.update);
router.delete("/products/:id", auth, allowRoles("Admin"), productsCtrl.remove);

// ── PRODUCTION ───────────────────────────────────────────────
// Admin et Responsable Production
router.get   ("/production",     auth, allowRoles("Admin","Responsable Production"), productionCtrl.getAll);
router.post  ("/production",     auth, allowRoles("Admin","Responsable Production"), productionCtrl.create);
router.delete("/production/:id", auth, allowRoles("Admin","Responsable Production"), productionCtrl.remove);

// ── STOCK ────────────────────────────────────────────────────
router.get ("/stock/movements", auth, allowRoles("Admin","Responsable Commercial"), stockCtrl.getMovements);
router.post("/stock/movements", auth, allowRoles("Admin"), stockCtrl.addMovement);

// ── ORDERS ───────────────────────────────────────────────────
router.get ("/orders",             auth, ordersCtrl.getAll);
router.post("/orders",             auth, allowRoles("Admin","Responsable Commercial"), ordersCtrl.create);
router.put ("/orders/:id/status",  auth, allowRoles("Admin","Responsable Commercial","Responsable Production"), ordersCtrl.updateStatus);

// ── CLIENTS ──────────────────────────────────────────────────
router.get ("/clients",     auth, allowRoles("Admin","Responsable Commercial"), clientsCtrl.getAll);
router.post("/clients",     auth, allowRoles("Admin","Responsable Commercial"), clientsCtrl.create);
router.put ("/clients/:id", auth, allowRoles("Admin","Responsable Commercial"), clientsCtrl.update);

// ── BONS DE LIVRAISON ────────────────────────────────────────
router.get ("/bons",              auth, allowRoles("Admin","Responsable Commercial"), bonsCtrl.getAll);
router.post("/bons",              auth, allowRoles("Admin","Responsable Commercial"), bonsCtrl.create);
router.put ("/bons/:id/status",   auth, allowRoles("Admin","Responsable Commercial"), bonsCtrl.updateStatus);

// ── NOTIFICATIONS ────────────────────────────────────────────
router.get("/notifications",          auth, notifsCtrl.getAll);
router.put("/notifications/read-all", auth, notifsCtrl.markAllRead);
router.put("/notifications/:id/read", auth, notifsCtrl.markRead);

// ── INCIDENTS ────────────────────────────────────────────────
router.get ("/incidents", auth, allowRoles("Admin","Responsable Commercial"), notifsCtrl.getIncidents);
router.post("/incidents", auth, allowRoles("Admin","Responsable Production"),  notifsCtrl.createIncident);

module.exports = router;
