const express = require("express");
const app = express();
app.use(express.json());

// In-memory store — last 500 events per symbol
const store = new Map();

function push(symbol, payload) {
  if (!store.has(symbol)) store.set(symbol, []);
  const arr = store.get(symbol);
  arr.unshift({ ts: Date.now(), ...payload });
  if (arr.length > 500) arr.length = 500;
}

// TradingView sends POST with JSON body
app.post("/webhook", (req, res) => {
  const data = req.body;
  if (!data) return res.status(400).json({ error: "empty body" });

  const symbol = data.symbol || "UNKNOWN";
  push(symbol, data);

  console.log(`[${new Date().toISOString()}] ${symbol}`, data);
  res.json({ ok: true });
});

// MCP / Claude queries this
app.get("/latest", (req, res) => {
  const symbol = req.query.symbol;
  if (symbol) {
    return res.json(store.get(symbol) || []);
  }
  // Return all symbols, latest 1 each
  const out = {};
  for (const [k, v] of store) out[k] = v[0] ?? null;
  res.json(out);
});

app.get("/history", (req, res) => {
  const symbol = req.query.symbol;
  const limit  = Math.min(parseInt(req.query.limit) || 50, 500);
  const arr    = symbol ? (store.get(symbol) || []) : [];
  res.json(arr.slice(0, limit));
});

app.get("/health", (_req, res) => res.json({ ok: true, symbols: [...store.keys()] }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook server listening on ${PORT}`));
