// src/controllers/auth.controller.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool: db } = require("../config/db");

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email et mot de passe requis" });

  try {
    const [rows] = await db.query(
      `SELECT u.*, r.nom AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.email = ? AND u.active = TRUE`,
      [email.toLowerCase()]
    );
    if (!rows.length)
      return res.status(401).json({ error: "Identifiants invalides" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: "Identifiants invalides" });

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role_name,
      // ✅ Parser le JSON string en vrai tableau
      assignedProducts: user.assigned_products
        ? JSON.parse(user.assigned_products)
        : null,
      productionRole: user.production_role || null,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });

    res.json({ token, user: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// GET /api/auth/me
async function me(req, res) {
  res.json({ user: req.user });
}

// PUT /api/auth/me
async function updateMe(req, res) {
  const { name, email, password } = req.body;
  const userId = req.user.id;

  try {
    const fields = [];
    const values = [];

    if (name)     { fields.push("name = ?");          values.push(name); }
    if (email)    { fields.push("email = ?");          values.push(email.toLowerCase()); }
    if (password) { fields.push("password_hash = ?");  values.push(await bcrypt.hash(password, 10)); }

    if (!fields.length)
      return res.status(400).json({ error: "Aucun champ à modifier" });

    values.push(userId);
    await db.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
    res.json({ message: "Profil mis à jour" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { login, me, updateMe };
