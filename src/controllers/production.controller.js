// src/controllers/production.controller.js
const { pool: db } = require("../config/db");
const { getProductFilter } = require("../middleware/roles");
const { checkAndNotifyStock } = require("../utils/stockAlert");
const newId = require("../utils/uuid");

// GET /api/production
async function getAll(req, res) {
  try {
    const productFilter = getProductFilter(req.user);

    let sql = `
      SELECT pe.*, p.name AS product_name
      FROM production_entries pe
      JOIN products p ON p.id = pe.product_id
    `;
    const params = [];

    // Filtre produit pour Responsable Production
    if (productFilter) {
      const placeholders = productFilter.map(() => "?").join(",");
      sql += ` WHERE p.name IN (${placeholders})`;
      params.push(...productFilter);
    }

    sql += " ORDER BY pe.date DESC";
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/production
async function create(req, res) {
  const { date, productId, produced, packaged, lot, operator, notes } = req.body;

  // Vérifier que le Responsable Production ne saisit que son produit assigné
  const productFilter = getProductFilter(req.user);
  if (productFilter) {
    const [p] = await db.query("SELECT name FROM products WHERE id = ?", [productId]);
    if (!p.length || !productFilter.includes(p[0].name)) {
      return res.status(403).json({ error: "Vous ne pouvez enregistrer que pour votre produit assigné" });
    }
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const entryId = newId();
    await conn.query(
      `INSERT INTO production_entries (id, date, product_id, produced, packaged, lot, operator, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [entryId, date || new Date(), productId, produced, packaged, lot, operator, notes || ""]
    );

    // Mettre à jour le stock courant
    await conn.query(
      "UPDATE products SET current_stock = current_stock + ? WHERE id = ?",
      [packaged, productId]
    );

    await checkAndNotifyStock(conn, productId);

    await conn.commit();
    res.status(201).json({ id: entryId, message: "Production enregistrée" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

// DELETE /api/production/:id
async function remove(req, res) {
  try {
    // Récupérer la quantité avant suppression pour décrémenter le stock
    const [rows] = await db.query("SELECT * FROM production_entries WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Entrée non trouvée" });

    const entry = rows[0];
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      await conn.query("DELETE FROM production_entries WHERE id = ?", [req.params.id]);
      await conn.query(
        "UPDATE products SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ?",
        [entry.packaged, entry.product_id]
      );
      await checkAndNotifyStock(conn, entry.product_id);
      await conn.commit();
      res.json({ message: "Entrée supprimée" });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, create, remove };
