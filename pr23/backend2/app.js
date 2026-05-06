const express = require("express");
const cors = require("cors");

const app = express();
const SERVER_ID = process.env.SERVER_ID || "backend-2";
const PORT = process.env.PORT || 3000;

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

// GET / — основной эндпоинт
app.get("/", (req, res) => {
  res.json({
    server: SERVER_ID,
    port: PORT,
    pid: process.pid,
    requests: requestCount,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    message: `Привет от ${SERVER_ID}! 🚀`
  });
});

// GET /health — для healthcheck
app.get("/health", (req, res) => {
  res.json({ status: "ok", server: SERVER_ID });
});

// GET /info — подробная информация
app.get("/info", (req, res) => {
  res.json({
    server: SERVER_ID,
    port: PORT,
    pid: process.pid,
    requests: requestCount,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// GET /data — тестовые данные
app.get("/data", (req, res) => {
  res.json({
    server: SERVER_ID,
    data: {
      items: [
        { id: 1, name: "Item 1", price: 100 },
        { id: 2, name: "Item 2", price: 200 },
        { id: 3, name: "Item 3", price: 300 }
      ]
    }
  });
});

// 404
app.use((req, res) => res.status(404).json({ error: "Not found", server: SERVER_ID }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ ${SERVER_ID} запущен на порту ${PORT} (PID: ${process.pid})`);
});
