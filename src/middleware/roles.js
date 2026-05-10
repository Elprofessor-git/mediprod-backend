// src/middleware/roles.js

/**
 * Vérifie que l'utilisateur connecté possède un des rôles autorisés.
 * Usage: router.get("/route", auth, allowRoles("Admin","Responsable Commercial"), handler)
 */
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Accès non autorisé pour ce rôle" });
    }
    next();
  };
}

/**
 * Filtre les données de production selon le produit assigné au Responsable Production.
 * À utiliser côté contrôleur pour filtrer les requêtes SQL.
 */
function getProductFilter(user) {
  if (user.role === "Responsable Production" && user.assignedProducts?.length) {
    return user.assignedProducts; // ex: ["Amandes"]
  }
  return null; // null = pas de filtre (Admin ou Commercial voient tout)
}

module.exports = { allowRoles, getProductFilter };
