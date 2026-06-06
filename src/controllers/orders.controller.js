// src/controllers/orders.controller.js
const { pool: db } = require("../config/db");
const { getProductFilter } = require("../middleware/roles");
const newId = require("../utils/uuid");

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

    const mapped = orders.map(o => ({
      ...o,
      clientId: o.client_id,
      deliveryDate: o.delivery_date,
      items: (o.items || []).map(it => ({
        ...it,
        productId: it.product_id,
        unitPrice: it.unit_price,
        productName: it.product_name,
      }))
    }));

    res.json(mapped);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/orders
async function create(req, res) {
  const { clientId, date, deliveryDate, items, notes } = req.body;
  if (!clientId || !items?.length)
    return res.status(400).json({ error: "Client et produits requis" });

  const toSQL = (d) => d ? new Date(d).toISOString().slice(0, 19).replace("T", " ") : null;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Générer le numéro de commande
    const [[{ count }]] = await conn.query("SELECT COUNT(*) AS count FROM orders");
    const number = `CMD-${new Date().getFullYear()}-${String(Number(count) + 1).padStart(4, "0")}`;

    const orderId = newId();
    await conn.query(
      `INSERT INTO orders (id, number, client_id, date, delivery_date, status, notes)
       VALUES (?, ?, ?, ?, ?, 'En attente', ?)`,
      [orderId, number, clientId, toSQL(date) || toSQL(new Date()), toSQL(deliveryDate), notes || ""]
    );

    for (const item of items) {
      await conn.query(
        "INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)",
        [newId(), orderId, item.productId, item.quantity, item.unitPrice]
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
          "INSERT INTO order_partial_quantities (id, order_id, product_id, quantity) VALUES (?, ?, ?, ?)",
          [newId(), id, productId, quantity]
        );
      }
    }

    // Si commande refusée → notification au Responsable Commercial
    if (status === "Refusé") {
      await conn.query(
        `INSERT INTO notifications (id, type, message, order_id, recipient_role)
         VALUES (?, 'commande_refusee', ?, ?, 'Responsable Commercial')`,
        [newId(), `La commande a été refusée. Raison : ${refusalReason || "Non précisée"}`, id]
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
