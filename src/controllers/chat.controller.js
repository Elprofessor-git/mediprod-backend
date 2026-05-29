// src/controllers/chat.controller.js
const Groq = require("groq-sdk");
const { pool: db } = require("../config/db");

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SCHEMA = `
Tables MySQL de MediProd :
roles(id VARCHAR(36), nom VARCHAR(50), description TEXT)
users(id VARCHAR(36), email VARCHAR(100), password_hash VARCHAR(255), name VARCHAR(100),
  role_id VARCHAR(36) → roles.id, assigned_products JSON,
  production_role ENUM('cuisson','emballage','mixte'), active BOOLEAN, created_at DATETIME)
products(id VARCHAR(36), name VARCHAR(100), unit VARCHAR(10), min_stock DECIMAL(10,3),
  max_capacity DECIMAL(10,3), current_stock DECIMAL(10,3), created_at DATETIME)
clients(id VARCHAR(36), client_number VARCHAR(10), name VARCHAR(100), company VARCHAR(150),
  phone VARCHAR(30), email VARCHAR(100), address TEXT, city VARCHAR(80),
  postal_code VARCHAR(10), matricule_fiscale VARCHAR(50), notes TEXT,
  active BOOLEAN, created_at DATETIME)
production_entries(id VARCHAR(36), date DATETIME, product_id VARCHAR(36) → products.id,
  produced DECIMAL(10,3), packaged DECIMAL(10,3), lot VARCHAR(50),
  operator VARCHAR(100), notes TEXT, created_at DATETIME)
stock_movements(id VARCHAR(36), date DATETIME, product_id VARCHAR(36) → products.id,
  type ENUM('Entree','Sortie','Ajustement'), quantity DECIMAL(10,3),
  reason VARCHAR(255), user_name VARCHAR(100), created_at DATETIME)
orders(id VARCHAR(36), number VARCHAR(30), client_id VARCHAR(36) → clients.id,
  date DATETIME, delivery_date DATETIME,
  status ENUM('En attente','En cuisson','Cuit','En emballage','Termine','Refuse'),
  notes TEXT, refusal_reason TEXT, created_at DATETIME)
order_items(id VARCHAR(36), order_id VARCHAR(36) → orders.id ON DELETE CASCADE,
  product_id VARCHAR(36) → products.id, quantity DECIMAL(10,3), unit_price DECIMAL(10,3))
bons_livraison(id VARCHAR(36), number VARCHAR(30), client_id VARCHAR(36) → clients.id,
  order_id VARCHAR(36) → orders.id, date DATETIME, delivery_date DATETIME,
  status ENUM('Brouillon','Emis','Livre'), notes TEXT, chauffeur VARCHAR(150),
  prepared_by VARCHAR(100), created_at DATETIME)
notifications(id VARCHAR(36), date DATETIME,
  type ENUM('stock_insuffisant','panne_machine','commande_refusee','manque_ouvriers','autre'),
  message TEXT, read_status BOOLEAN,
  recipient_role ENUM('Responsable Commercial','Admin'), created_at DATETIME)
incidents(id VARCHAR(36), date DATETIME,
  type ENUM('panne_machine','stock_insuffisant','manque_ouvriers','autre'),
  description TEXT, reported_by VARCHAR(100), created_at DATETIME)
`.trim();

const TOOLS = [
  {
    type: "function",
    function: {
      name: "execute_sql",
      description:
        "Execute a SELECT query on the MediProd MySQL database. " +
        "Use this to answer questions about stock, orders, clients, production, etc. " +
        "Only SELECT statements are allowed.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "A valid MySQL SELECT query. No INSERT, UPDATE, DELETE, DROP, ALTER, CREATE or TRUNCATE.",
          },
        },
        required: ["query"],
      },
    },
  },
];

const FORBIDDEN = /^\s*(insert|update|delete|drop|alter|create|truncate)\b/i;

async function executeSql(query) {
  if (FORBIDDEN.test(query.trim())) {
    return { error: "Seules les requêtes SELECT sont autorisées." };
  }
  if (!/^\s*select\b/i.test(query.trim())) {
    return { error: "Seules les requêtes SELECT sont autorisées." };
  }
  const limited = query.replace(/;?\s*$/, "") + " LIMIT 50";
  try {
    const [rows] = await db.query(limited);
    return { rows };
  } catch (err) {
    return { error: err.message };
  }
}

async function chat(req, res) {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array requis" });
  }

  const systemPrompt = `Tu es un assistant intelligent intégré dans MediProd, un système de gestion de production alimentaire (fruits secs et enrobés) pour MEDIFOOD Tunisie.
Utilisateur connecté : ${req.user.name}
Rôle : ${req.user.role}
Tu as accès à la base de données via l'outil execute_sql.
Utilise-le pour répondre aux questions sur les stocks, commandes, clients, production, bons de livraison, etc.
Réponds toujours en français. Sois concis et professionnel.
Schéma complet :
${SCHEMA}`;

  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    let response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      tools: TOOLS,
      tool_choice: "auto",
      messages: apiMessages,
    });

    // Tool use loop
    while (response.choices[0].finish_reason === "tool_calls") {
      const toolCall = response.choices[0].message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      const sqlResult = await executeSql(args.query);

      apiMessages.push(response.choices[0].message);
      apiMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(sqlResult),
      });

      response = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
        tools: TOOLS,
        tool_choice: "auto",
        messages: apiMessages,
      });
    }

    const reply = response.choices[0].message.content ?? "Je n'ai pas pu générer de réponse.";
    res.json({ reply });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Erreur lors de la communication avec l'IA" });
  }
}

module.exports = { chat };
