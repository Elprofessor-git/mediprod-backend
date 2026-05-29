// src/controllers/notifications.controller.js
const { pool: db } = require("../config/db");
const newId = require("../utils/uuid");

// GET /api/notifications — filtrées par rôle
async function getAll(req, res) {
  const role = req.user.role;
  // Admin voit tout, Commercial voit les siennes
  let where = "";
  const params = [];
  if (role === "Responsable Commercial") {
    where = "WHERE recipient_role = 'Responsable Commercial'";
  } else if (role === "Admin") {
    where = "WHERE recipient_role IN ('Admin','Responsable Commercial')";
  } else {
    return res.json([]); // Responsable Production : pas de notifications
  }

  try {
    const [rows] = await db.query(
      `SELECT * FROM notifications ${where} ORDER BY date DESC LIMIT 50`
    );
    res.json(rows.map(n => ({ ...n, read: !!n.read_status })));
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// PUT /api/notifications/:id/read
async function markRead(req, res) {
  try {
    await db.query("UPDATE notifications SET read_status = TRUE WHERE id = ?", [req.params.id]);
    res.json({ message: "Notification marquée comme lue" });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// PUT /api/notifications/read-all
async function markAllRead(req, res) {
  const role = req.user.role;
  try {
    await db.query(
      "UPDATE notifications SET read_status = TRUE WHERE recipient_role = ?",
      [role]
    );
    res.json({ message: "Toutes les notifications marquées comme lues" });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/incidents
async function createIncident(req, res) {
  const { type, description, orderId, productId } = req.body;
  if (!type || !description)
    return res.status(400).json({ error: "Type et description requis" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO incidents (id, type, description, order_id, product_id, reported_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newId(), type, description, orderId || null, productId || null, req.user.name]
    );

    // Créer notification pour le Commercial et l'Admin
    const message = `Incident signalé par ${req.user.name} : ${description}`;
    for (const recipientRole of ["Responsable Commercial", "Admin"]) {
      await conn.query(
        `INSERT INTO notifications (id, type, message, order_id, recipient_role)
         VALUES (?, ?, ?, ?, ?)`,
        [newId(), type === "panne_machine" ? "panne_machine" : "autre", message, orderId || null, recipientRole]
      );
    }

    await conn.commit();
    res.status(201).json({ message: "Incident signalé" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

// GET /api/incidents
async function getIncidents(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT i.*, p.name AS product_name
       FROM incidents i
       LEFT JOIN products p ON p.id = i.product_id
       ORDER BY i.date DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

module.exports = { getAll, markRead, markAllRead, createIncident, getIncidents };
