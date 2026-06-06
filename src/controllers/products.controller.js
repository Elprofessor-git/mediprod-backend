// src/controllers/products.controller.js
const { pool: db } = require("../config/db");
const { checkAndNotifyStock } = require("../utils/stockAlert");
const newId = require("../utils/uuid");

const toClient = (p) => ({
  id: String(p.id),
  name: p.name,
  unit: p.unit,
  minStock: parseFloat(p.min_stock),
  maxCapacity: parseFloat(p.max_capacity),
  currentStock: parseFloat(p.current_stock),
});

async function getAll(req, res) {
  try {
    const [rows] = await db.query("SELECT * FROM products ORDER BY name");
    res.json(rows.map(toClient));
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function create(req, res) {
  const { name, minStock, maxCapacity, currentStock } = req.body;
  if (!name || minStock == null || maxCapacity == null)
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  try {
    const id = newId();
    await db.query(
      "INSERT INTO products (id, name, unit, min_stock, max_capacity, current_stock) VALUES (?, ?, 'kg', ?, ?, ?)",
      [id, name, minStock, maxCapacity, currentStock ?? 0]
    );
    res.status(201).json({ id, message: "Produit créé" });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function update(req, res) {
  const { name, minStock, maxCapacity, currentStock } = req.body;
  try {
    const fields = [];
    const values = [];
    if (name !== undefined)        { fields.push("name = ?");          values.push(name); }
    if (minStock !== undefined)    { fields.push("min_stock = ?");      values.push(minStock); }
    if (maxCapacity !== undefined) { fields.push("max_capacity = ?");   values.push(maxCapacity); }
    if (currentStock !== undefined){ fields.push("current_stock = ?");  values.push(currentStock); }
    if (!fields.length) return res.status(400).json({ error: "Aucun champ à modifier" });
    values.push(req.params.id);
    await db.query(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`, values);
    if (currentStock !== undefined || minStock !== undefined) {
      await checkAndNotifyStock(db, req.params.id);
    }
    res.json({ message: "Produit mis à jour" });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function remove(req, res) {
  try {
    const [[{ count }]] = await db.query(
      `SELECT (
        (SELECT COUNT(*) FROM production_entries WHERE product_id = ?) +
        (SELECT COUNT(*) FROM stock_movements      WHERE product_id = ?) +
        (SELECT COUNT(*) FROM order_items          WHERE product_id = ?)
      ) AS count`,
      [req.params.id, req.params.id, req.params.id]
    );
    if (count > 0)
      return res.status(409).json({
        error: "Impossible de supprimer : ce produit est lié à des enregistrements de production, de stock ou de commandes existants.",
      });
    await db.query("DELETE FROM products WHERE id = ?", [req.params.id]);
    res.json({ message: "Produit supprimé" });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

module.exports = { getAll, create, update, remove };
