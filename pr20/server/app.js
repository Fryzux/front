require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3020;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/pr20_db";

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────
// Схема и модель Mongoose
// ─────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true, trim: true },
    last_name:  { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    age:        { type: Number, min: 0, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const User = mongoose.model("User", userSchema);

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

// GET /api/users — список всех
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET /api/users/:id — один пользователь
app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    res.json(user);
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Некорректный ID" });
    }
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/users — создать
app.post("/api/users", async (req, res) => {
  try {
    const { first_name, last_name, email, age } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: "first_name, last_name и email обязательны" });
    }

    const user = new User({ first_name, last_name, email, age: age ?? null });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Пользователь с таким email уже существует" });
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join("; ") });
    }
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// PATCH /api/users/:id — обновить
app.patch("/api/users/:id", async (req, res) => {
  try {
    const { first_name, last_name, email, age } = req.body;

    if (!first_name && !last_name && !email && age === undefined) {
      return res.status(400).json({ error: "Нечего обновлять" });
    }

    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name  !== undefined) updates.last_name  = last_name;
    if (email      !== undefined) updates.email      = email;
    if (age        !== undefined) updates.age        = age;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    res.json(user);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Email уже используется" });
    }
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Некорректный ID" });
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join("; ") });
    }
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /api/users/:id — удалить
app.delete("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    res.status(204).send();
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Некорректный ID" });
    }
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
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Подключено к MongoDB:", MONGO_URI);
    app.listen(PORT, () => {
      console.log(`🚀 PR20 MongoDB Server запущен: http://localhost:${PORT}`);
      console.log("Эндпоинты:");
      console.log("  GET    /api/users");
      console.log("  GET    /api/users/:id");
      console.log("  POST   /api/users");
      console.log("  PUT    /api/users/:id");
      console.log("  DELETE /api/users/:id");
    });
  })
  .catch((err) => {
    console.error("❌ Ошибка подключения к MongoDB:", err.message);
    process.exit(1);
  });
