// src/controllers/clients.controller.js
const db = require("../config/db");

async function getAll(req, res) {
  try {
    const [rows] = await db.query("SELECT * FROM clients ORDER BY name");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function create(req, res) {
  const { name, company, phone, email, address, city, postalCode, matriculeFiscale, notes } = req.body;
  if (!name) return res.status(400).json({ error: "Le nom est requis" });

  try {
    // Générer le numéro client auto
    const [[{ count }]] = await db.query("SELECT COUNT(*) AS count FROM clients");
    const clientNumber = String(Number(count) + 1).padStart(4, "0");

    const [result] = await db.query(
      `INSERT INTO clients (client_number, name, company, phone, email, address, city, postal_code, matricule_fiscale, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clientNumber, name, company, phone, email, address, city, postalCode, matriculeFiscale, notes]
    );
    res.status(201).json({ id: result.insertId, clientNumber, message: "Client créé" });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function update(req, res) {
  const { name, company, phone, email, address, city, postalCode, matriculeFiscale, notes, active } = req.body;
  try {
    await db.query(
      `UPDATE clients SET name=?, company=?, phone=?, email=?, address=?, city=?,
       postal_code=?, matricule_fiscale=?, notes=?, active=? WHERE id=?`,
      [name, company, phone, email, address, city, postalCode, matriculeFiscale, notes, active, req.params.id]
    );
    res.json({ message: "Client mis à jour" });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

module.exports = { getAll, create, update };
