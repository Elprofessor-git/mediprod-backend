// src/controllers/users.controller.js
const bcrypt = require("bcryptjs");
const { pool: db } = require("../config/db");
const newId = require("../utils/uuid");

// GET /api/users  (Admin uniquement)
async function getAll(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.email, u.name, r.nom AS role,
              u.assigned_products, u.production_role, u.active, u.created_at
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ORDER BY u.created_at DESC`
    );
    res.json(rows.map(u => ({
      ...u,
      role: u.role,
      // ✅ Parser le JSON string en vrai tableau
      assignedProducts: u.assigned_products
        ? (typeof u.assigned_products === "string"
          ? JSON.parse(u.assigned_products)
          : u.assigned_products)
        : [],
      productionRole: u.production_role || null,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/users  (Admin uniquement)
async function create(req, res) {
  const { email, password, name, role, assignedProducts, productionRole } = req.body;
  if (!email || !password || !name || !role)
    return res.status(400).json({ error: "Champs obligatoires manquants" });

  try {
    const [roles] = await db.query("SELECT id FROM roles WHERE nom = ?", [role]);
    if (!roles.length) return res.status(400).json({ error: "Rôle invalide" });

    const hash = await bcrypt.hash(password, 10);
    const userId = newId();
    await db.query(
      `INSERT INTO users (id, email, password_hash, name, role_id, assigned_products, production_role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, email.toLowerCase(), hash, name, roles[0].id,
      JSON.stringify(assignedProducts || null), productionRole || null]
    );
    res.status(201).json({ id: userId, message: "Utilisateur créé" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Cet email existe déjà" });
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/users/:id  (Admin uniquement)
async function update(req, res) {
  const { name, role, assignedProducts, productionRole, active, password } = req.body;
  const { id } = req.params;

  try {
    const fields = [];
    const values = [];

    if (name) { fields.push("name = ?"); values.push(name); }
    if (active !== undefined) { fields.push("active = ?"); values.push(active); }
    if (productionRole !== undefined) { fields.push("production_role = ?"); values.push(productionRole || null); }
    if (assignedProducts !== undefined) { fields.push("assigned_products = ?"); values.push(JSON.stringify(assignedProducts)); }
    if (password) { fields.push("password_hash = ?"); values.push(await bcrypt.hash(password, 10)); }

    if (role) {
      const [roles] = await db.query("SELECT id FROM roles WHERE nom = ?", [role]);
      if (!roles.length) return res.status(400).json({ error: "Rôle invalide" });
      fields.push("role_id = ?");
      values.push(roles[0].id);
    }

    if (!fields.length) return res.status(400).json({ error: "Aucun champ à modifier" });

    values.push(id);
    await db.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
    res.json({ message: "Utilisateur mis à jour" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/users/:id  (Admin uniquement)
async function remove(req, res) {
  if (req.params.id === req.user.id) {
    return res.status(403).json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
  }
  try {
    const [[{ count }]] = await db.query(
      "SELECT COUNT(*) AS count FROM production_entries WHERE user_id = ?",
      [req.params.id]
    );
    if (count > 0) {
      return res.status(409).json({
        error: "Impossible de supprimer : cet utilisateur a des enregistrements de production associés. Désactivez-le plutôt."
      });
    }
    await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "Utilisateur supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, create, update, remove };
