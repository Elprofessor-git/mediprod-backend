// src/controllers/bons.controller.js
const { pool: db } = require("../config/db");
const newId = require("../utils/uuid");

async function getAll(req, res) {
  try {
    const [bons] = await db.query(
      `SELECT bl.*, c.name AS client_name, c.company AS client_company,
              c.address AS client_address, c.city AS client_city,
              c.phone AS client_phone, c.client_number
       FROM bons_livraison bl
       JOIN clients c ON c.id = bl.client_id
       ORDER BY bl.date DESC`
    );

    for (const bon of bons) {
      const [items] = await db.query(
        "SELECT * FROM bon_items WHERE bon_id = ? ORDER BY id",
        [bon.id]
      );
      bon.items = items;
    }

    res.json(bons);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function create(req, res) {
  const { clientId, orderId, date, deliveryDate, items, notes, chauffeur, matriculeFiscale, number, status } = req.body;
  if (!clientId || !items?.length)
    return res.status(400).json({ error: "Client et articles requis" });

  const VALID_STATUSES = ["Brouillon", "Émis", "Livré"];
  const bonStatus = VALID_STATUSES.includes(status) ? status : "Brouillon";

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Numéro BL auto si non fourni
    const [[{ count }]] = await conn.query("SELECT COUNT(*) AS count FROM bons_livraison");
    const bonNumber = number || `${String(Number(count) + 1).padStart(4, "0")} / ${new Date().getFullYear()}`;

    const bonId = newId();
    await conn.query(
      `INSERT INTO bons_livraison (id, number, client_id, order_id, date, delivery_date, status, notes, chauffeur, matricule_fiscale, prepared_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bonId, bonNumber, clientId, orderId || null, date || new Date(),
       deliveryDate || null, bonStatus, notes || "", chauffeur || "", matriculeFiscale || "", req.user.name]
    );

    for (const item of items) {
      await conn.query(
        `INSERT INTO bon_items (id, bon_id, product_id, designation, quantity, unit, unit_price, conditionnement, observations)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId(), bonId, item.productId || null, item.designation, item.quantity,
         item.unit, item.unitPrice, item.conditionnement || "", item.observations || ""]
      );
    }

    await conn.commit();
    res.status(201).json({ id: bonId, number: bonNumber, message: "Bon de livraison créé" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

async function updateStatus(req, res) {
  const { status } = req.body;
  const { id } = req.params;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query("UPDATE bons_livraison SET status = ? WHERE id = ?", [status, id]);

    if (status === "Émis") {
      const [items] = await conn.query(
        `SELECT bi.product_id, bi.quantity
         FROM bon_items bi
         WHERE bi.bon_id = ? AND bi.product_id IS NOT NULL`,
        [id]
      );
      for (const item of items) {
        await conn.query(
          `UPDATE products SET qte_emballe = GREATEST(0, qte_emballe - ?) WHERE id = ?`,
          [item.quantity, item.product_id]
        );
      }
    }

    await conn.commit();
    res.json({ message: "Statut mis à jour" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

module.exports = { getAll, create, updateStatus };
