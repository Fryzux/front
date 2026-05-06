const express = require("express");
const cors = require("cors");

const app = express();
const SERVER_ID = process.env.SERVER_ID || "server-3";
const PORT = process.env.PORT || 3033;

app.use(cors());
app.use(express.json());

let requestCount = 0;

app.use((req, res, next) => {
  requestCount++;
  res.on("finish", () => {
    console.log(`[${SERVER_ID}] #${requestCount} ${req.method} ${req.path} → ${res.statusCode}`);
  });
  next();
});

app.get("/api/info", (req, res) => {
  res.json({
    server:    SERVER_ID,
    port:      PORT,
    pid:       process.pid,
    requests:  requestCount,
    uptime:    Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    message:   `Привет от ${SERVER_ID}! 🚀`,
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", server: SERVER_ID, pid: process.pid });
});

const items = [
  { id: 1, name: "Товар А", price: 100 },
  { id: 2, name: "Товар Б", price: 200 },
  { id: 3, name: "Товар В", price: 300 },
];

app.get("/api/items", (req, res) => {
  res.json({ server: SERVER_ID, items });
});

app.get("/api/slow", (req, res) => {
  const delay = Math.min(parseInt(req.query.ms) || 2000, 10000);
  setTimeout(() => {
    res.json({ server: SERVER_ID, delay, message: "Медленный ответ" });
  }, delay);
});

app.use((req, res) => res.status(404).json({ error: "Not found", server: SERVER_ID }));

app.listen(PORT, () => {
  console.log(`✅ ${SERVER_ID} (PID: ${process.pid}) запущен на порту ${PORT}`);
});
