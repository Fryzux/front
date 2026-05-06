require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3019;

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────
// Подключение к PostgreSQL
// ─────────────────────────────────────────
const pool = new Pool({
  host: process.env.PG_HOST || "localhost",
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || "pr19_db",
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "postgres",
});

// ─────────────────────────────────────────
// Инициализация таблицы users
// ─────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name  VARCHAR(100) NOT NULL,
      email      VARCHAR(255) UNIQUE NOT NULL,
      age        INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ Таблица users готова");
}

// Middleware для логирования
app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode}`);
  });
  next();
});

// ─────────────────────────────────────────
// CRUD — /api/users
// ─────────────────────────────────────────

// GET /api/users — список всех пользователей
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET /api/users/:id — один пользователь
app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/users — создать пользователя
app.post("/api/users", async (req, res) => {
  try {
    const { first_name, last_name, email, age } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: "first_name, last_name и email обязательны" });
    }

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, age)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [first_name, last_name, email, age || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Пользователь с таким email уже существует" });
    }
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// PATCH /api/users/:id — обновить пользователя
app.patch("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, age } = req.body;

    if (!first_name && !last_name && !email && age === undefined) {
      return res.status(400).json({ error: "Нечего обновлять" });
    }

    // Получаем текущего пользователя
    const current = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const user = current.rows[0];

    const result = await pool.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, email = $3, age = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        first_name ?? user.first_name,
        last_name  ?? user.last_name,
        email      ?? user.email,
        age        ?? user.age,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email уже используется" });
    }
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /api/users/:id — удалить пользователя
app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Маршрут не найден" });
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
  console.error("Необработанная ошибка:", err);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

// ─────────────────────────────────────────
// Запуск
// ─────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 PR19 PostgreSQL Server запущен: http://localhost:${PORT}`);
      console.log("Эндпоинты:");
      console.log("  GET    /api/users");
      console.log("  GET    /api/users/:id");
      console.log("  POST   /api/users");
      console.log("  PUT    /api/users/:id");
      console.log("  DELETE /api/users/:id");
    });
  })
  .catch((err) => {
    console.error("❌ Ошибка подключения к БД:", err.message);
    process.exit(1);
  });
