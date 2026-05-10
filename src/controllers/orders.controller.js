// src/controllers/orders.controller.js
const db = require("../config/db");
const { getProductFilter } = require("../middleware/roles");

// GET /api/orders
async function getAll(req, res) {
  try {
    const productFilter = getProductFilter(req.user);

    let sql = `
      SELECT o.*, c.name AS client_name, c.company AS client_company
      FROM orders o
      JOIN clients c ON c.id = o.client_id
    `;
    const params = [];

    // Responsable Production ne voit que les commandes de ses produits
    if (productFilter) {
      sql += `
        WHERE o.id IN (
          SELECT DISTINCT oi.order_id
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          WHERE p.name IN (${productFilter.map(() => "?").join(",")})
        )
      `;
      params.push(...productFilter);
    }

    sql += " ORDER BY o.date DESC";
    const [orders] = await db.query(sql, params);

    // Récupérer les items pour chaque commande
    for (const order of orders) {
      const [items] = await db.query(
        `SELECT oi.*, p.name AS product_name
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;

      const [partial] = await db.query(
        "SELECT product_id, quantity FROM order_partial_quantities WHERE order_id = ?",
        [order.id]
      );
      const partialMap = {};
      partial.forEach(p => partialMap[p.product_id] = p.quantity);
      order.partialQuantities = partialMap;
    }

    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/orders
async function create(req, res) {
  const { clientId, date, deliveryDate, items, notes } = req.body;
  if (!clientId || !items?.length)
    return res.status(400).json({ error: "Client et produits requis" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Générer le numéro de commande
    const [[{ count }]] = await conn.query("SELECT COUNT(*) AS count FROM orders");
    const number = `CMD-${new Date().getFullYear()}-${String(Number(count) + 1).padStart(4, "0")}`;

    const [result] = await conn.query(
      `INSERT INTO orders (number, client_id, date, delivery_date, status, notes)
       VALUES (?, ?, ?, ?, 'En attente', ?)`,
      [number, clientId, date || new Date(), deliveryDate || null, notes || ""]
    );
    const orderId = result.insertId;

    for (const item of items) {
      await conn.query(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
        [orderId, item.productId, item.quantity, item.unitPrice]
      );
    }

    await conn.commit();
    res.status(201).json({ id: orderId, number, message: "Commande créée" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

// PUT /api/orders/:id/status
async function updateStatus(req, res) {
  const { status, partialQuantities, refusalReason } = req.body;
  const { id } = req.params;

  // Responsable Production : vérifier qu'il gère bien ce produit
  const productFilter = getProductFilter(req.user);
  if (productFilter) {
    const [items] = await db.query(
      `SELECT p.name FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [id]
    );
    const names = items.map(i => i.name);
    const hasAccess = names.some(n => productFilter.includes(n));
    if (!hasAccess)
      return res.status(403).json({ error: "Accès non autorisé pour cette commande" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE orders SET status = ?, refusal_reason = ? WHERE id = ?`,
      [status, refusalReason || null, id]
    );

    // Mettre à jour les quantités partielles
    if (partialQuantities) {
      await conn.query("DELETE FROM order_partial_quantities WHERE order_id = ?", [id]);
      for (const [productId, quantity] of Object.entries(partialQuantities)) {
        await conn.query(
          "INSERT INTO order_partial_quantities (order_id, product_id, quantity) VALUES (?, ?, ?)",
          [id, productId, quantity]
        );
      }
    }

    // Si commande refusée → notification au Responsable Commercial
    if (status === "Refusé") {
      await conn.query(
        `INSERT INTO notifications (type, message, order_id, recipient_role)
         VALUES ('commande_refusée', ?, ?, 'Responsable Commercial')`,
        [`La commande a été refusée. Raison : ${refusalReason || "Non précisée"}`, id]
      );
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
