// src/lib/api.ts
// ============================================================
// Client API centralisé — remplace les données mock de data.ts
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken(): string | null {
  // Zustand persiste le token dans localStorage sous "medifood-auth"
  try {
    const stored = localStorage.getItem("medifood-auth");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erreur réseau" }));
    throw new Error(err.error || `Erreur ${res.status}`);
  }

  return res.json();
}

// ── AUTH ────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: unknown }>("POST", "/auth/login", { email, password }),
    me: () => request<{ user: unknown }>("GET", "/auth/me"),
  },

  // ── USERS ────────────────────────────────────────────────
  users: {
    getAll:  ()          => request<unknown[]>("GET",    "/users"),
    create:  (data: unknown) => request<unknown>("POST", "/users", data),
    update:  (id: string, data: unknown) => request<unknown>("PUT", `/users/${id}`, data),
    delete:  (id: string) => request<unknown>("DELETE", `/users/${id}`),
  },

  // ── PRODUCTS ─────────────────────────────────────────────
  products: {
    getAll: () => request<unknown[]>("GET", "/products"),
    update: (id: string, data: unknown) => request<unknown>("PUT", `/products/${id}`, data),
  },

  // ── PRODUCTION ───────────────────────────────────────────
  production: {
    getAll:  () => request<unknown[]>("GET", "/production"),
    create:  (data: unknown) => request<unknown>("POST", "/production", data),
    delete:  (id: string)    => request<unknown>("DELETE", `/production/${id}`),
  },

  // ── STOCK ────────────────────────────────────────────────
  stock: {
    getMovements: () => request<unknown[]>("GET", "/stock/movements"),
    addMovement:  (data: unknown) => request<unknown>("POST", "/stock/movements", data),
  },

  // ── ORDERS ───────────────────────────────────────────────
  orders: {
    getAll:       () => request<unknown[]>("GET", "/orders"),
    create:       (data: unknown) => request<unknown>("POST", "/orders", data),
    updateStatus: (id: string, data: unknown) =>
      request<unknown>("PUT", `/orders/${id}/status`, data),
  },

  // ── CLIENTS ──────────────────────────────────────────────
  clients: {
    getAll:  () => request<unknown[]>("GET", "/clients"),
    create:  (data: unknown) => request<unknown>("POST", "/clients", data),
    update:  (id: string, data: unknown) => request<unknown>("PUT", `/clients/${id}`, data),
  },

  // ── BONS DE LIVRAISON ────────────────────────────────────
  bons: {
    getAll:       () => request<unknown[]>("GET", "/bons"),
    create:       (data: unknown) => request<unknown>("POST", "/bons", data),
    updateStatus: (id: string, status: string) =>
      request<unknown>("PUT", `/bons/${id}/status`, { status }),
  },

  // ── NOTIFICATIONS ────────────────────────────────────────
  notifications: {
    getAll:      () => request<unknown[]>("GET", "/notifications"),
    markRead:    (id: string) => request<unknown>("PUT", `/notifications/${id}/read`),
    markAllRead: () => request<unknown>("PUT", "/notifications/read-all"),
  },

  // ── INCIDENTS ────────────────────────────────────────────
  incidents: {
    getAll:  () => request<unknown[]>("GET", "/incidents"),
    create:  (data: unknown) => request<unknown>("POST", "/incidents", data),
  },
};
