// src/middleware/auth.js
const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant ou invalide" });
  }
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, name, role, assignedProducts, productionRole }
    next();
  } catch {
    return res.status(401).json({ error: "Token expiré ou invalide" });
  }
}

module.exports = authMiddleware;
