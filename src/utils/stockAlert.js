const newId = require("./uuid");

// Vérifie si le stock d'un produit est sous le seuil et crée une notification si nécessaire.
// Évite les doublons : ne crée pas si une notification non lue pour ce produit existe déjà.
// conn : mysql2 connection ou pool (doit avoir une méthode .query())
async function checkAndNotifyStock(conn, productId) {
  const [rows] = await conn.query(
    "SELECT name, unit, current_stock, min_stock FROM products WHERE id = ?",
    [productId]
  );
  const p = rows[0];
  if (!p || parseFloat(p.current_stock) >= parseFloat(p.min_stock)) return;

  const [existing] = await conn.query(
    `SELECT id FROM notifications
     WHERE type = 'stock_insuffisant'
       AND recipient_role = 'Responsable Commercial'
       AND read_status = FALSE
       AND message LIKE ?
     LIMIT 1`,
    [`%${p.name}%`]
  );
  if (existing.length > 0) return;

  await conn.query(
    `INSERT INTO notifications (id, type, message, recipient_role)
     VALUES (?, 'stock_insuffisant', ?, 'Responsable Commercial')`,
    [newId(), `Stock ${p.name} insuffisant (${p.current_stock} ${p.unit} < seuil ${p.min_stock} ${p.unit})`]
  );
}

module.exports = { checkAndNotifyStock };
