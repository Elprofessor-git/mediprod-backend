// src/controllers/products.controller.js
const db = require("../config/db");

const toClient = (p) => ({
  id: String(p.id),
  name: p.name,
  unit: p.unit,
  minStock: p.min_stock,
  maxCapacity: p.max_capacity,
  currentStock: p.current_stock,
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
    const [result] = await db.query(
      "INSERT INTO products (name, unit, min_stock, max_capacity, current_stock) VALUES (?, 'kg', ?, ?, ?)",
      [name, minStock, maxCapacity, currentStock ?? 0]
    );
    res.status(201).json({ id: result.insertId, message: "Produit créé" });
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
    res.json({ message: "Produit mis à jour" });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function remove(req, res) {
  try {
    await db.query("DELETE FROM products WHERE id = ?", [req.params.id]);
    res.json({ message: "Produit supprimé" });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

module.exports = { getAll, create, update, remove };
