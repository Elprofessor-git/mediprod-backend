// src/controllers/stock.controller.js
const { pool: db } = require("../config/db");
const { checkAndNotifyStock } = require("../utils/stockAlert");
const newId = require("../utils/uuid");

// GET /api/stock/movements
async function getMovements(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT sm.*, p.name AS product_name
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       ORDER BY sm.date DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/stock/movements  — Entrée / Sortie / Ajustement
async function addMovement(req, res) {
  const { productId, type, quantity, reason } = req.body;
  if (!productId || !type || !quantity)
    return res.status(400).json({ error: "Champs obligatoires manquants" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO stock_movements (id, product_id, type, quantity, reason, user_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newId(), productId, type, quantity, reason || "", req.user.name]
    );

    // Mise à jour du stock selon le type
    let delta;
    if (type === "Entrée")      delta = quantity;
    else if (type === "Sortie") delta = -quantity;
    else                         delta = quantity; // Ajustement = valeur absolue

    if (type === "Ajustement") {
      await conn.query(
        "UPDATE products SET current_stock = ? WHERE id = ?",
        [quantity, productId]
      );
    } else {
      await conn.query(
        "UPDATE products SET current_stock = GREATEST(0, current_stock + ?) WHERE id = ?",
        [delta, productId]
      );
    }

    await checkAndNotifyStock(conn, productId);

    await conn.commit();
    res.status(201).json({ message: "Mouvement enregistré" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

module.exports = { getMovements, addMovement };
