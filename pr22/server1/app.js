const express = require("express");
const cors = require("cors");

const app = express();
const SERVER_ID = process.env.SERVER_ID || "server-1";
const PORT = process.env.PORT || 3031;

app.use(cors());
app.use(express.json());

// Счётчик запросов
let requestCount = 0;

app.use((req, res, next) => {
  requestCount++;
  res.on("finish", () => {
    console.log(`[${SERVER_ID}] #${requestCount} ${req.method} ${req.path} → ${res.statusCode}`);
  });
  next();
});

// ─── Эндпоинты ───────────────────────────

// GET /api/info — информация о сервере
app.get("/api/info", (req, res) => {
  res.json({
    server:       SERVER_ID,
    port:         PORT,
    pid:          process.pid,
    requests:     requestCount,
    uptime:       Math.floor(process.uptime()),
    timestamp:    new Date().toISOString(),
    message:      `Привет от ${SERVER_ID}! 🚀`,
  });
});

// GET /api/health — healthcheck (используется HAProxy/Nginx)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", server: SERVER_ID, pid: process.pid });
});

// GET /api/items — список товаров (демо)
const items = [
  { id: 1, name: "Товар А", price: 100 },
  { id: 2, name: "Товар Б", price: 200 },
  { id: 3, name: "Товар В", price: 300 },
];

app.get("/api/items", (req, res) => {
  res.json({ server: SERVER_ID, items });
});

// POST /api/slow — эндпоинт с задержкой (для теста отказоустойчивости)
app.get("/api/slow", (req, res) => {
  const delay = Math.min(parseInt(req.query.ms) || 2000, 10000);
  setTimeout(() => {
    res.json({ server: SERVER_ID, delay, message: "Медленный ответ" });
  }, delay);
});

// 404
app.use((req, res) => res.status(404).json({ error: "Not found", server: SERVER_ID }));

app.listen(PORT, () => {
  console.log(`✅ ${SERVER_ID} (PID: ${process.pid}) запущен на порту ${PORT}`);
});
