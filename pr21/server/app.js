require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const Redis = require("ioredis");

const app = express();
const PORT = process.env.PORT || 3021;

app.use(cors({ origin: "http://localhost:3003", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ─────────────────────────────────────────
// Подключение к Redis
// ─────────────────────────────────────────
const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  lazyConnect: true,
});

redis.on("connect", () => console.log("✅ Redis подключён"));
redis.on("error", (err) => console.error("❌ Redis ошибка:", err.message));

const USERS_CACHE_TTL    = 60;  // 1 минута
const PRODUCTS_CACHE_TTL = 600; // 10 минут

// ─────────────────────────────────────────
// JWT
// ─────────────────────────────────────────
const JWT_SECRET     = process.env.JWT_SECRET     || "access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";
const ACCESS_EXPIRES_IN  = "15m";
const REFRESH_EXPIRES_IN = "7d";

const refreshTokens = new Set();

// ─────────────────────────────────────────
// Пользователи и продукты (in-memory)
// ─────────────────────────────────────────
let users = [];
let products = [
  { id: nanoid(6), name: "COSRX Snail Essence",  category: "Сыворотки",   description: "Эссенция с муцином улитки.",    price: 1590, stock: 12, rating: 4.8, image: "/images/cosrx.jpg" },
  { id: nanoid(6), name: "Laneige Sleeping Mask", category: "Маски",       description: "Ночная увлажняющая маска.",     price: 1890, stock: 7,  rating: 4.6, image: "/images/laneige.jpg" },
  { id: nanoid(6), name: "Innisfree Foam",         category: "Очищение",    description: "Пенка для умывания.",          price: 990,  stock: 20, rating: 4.7, image: "/images/innisfree.jpg" },
  { id: nanoid(6), name: "Etude Toner",            category: "Тонеры",      description: "Увлажняющий тонер.",           price: 1190, stock: 14, rating: 4.5, image: "/images/etude.jpg" },
  { id: nanoid(6), name: "Missha BB Cream",        category: "Тональные",   description: "BB крем с SPF.",               price: 1390, stock: 10, rating: 4.4, image: "/images/missha.jpg" },
  { id: nanoid(6), name: "Dr.Jart Cream",          category: "Кремы",       description: "Питательный крем.",            price: 2490, stock: 5,  rating: 4.9, image: "/images/drjart.jpg" },
  { id: nanoid(6), name: "Holika Aloe Gel",        category: "Увлажнение",  description: "Гель алоэ 99%.",               price: 790,  stock: 18, rating: 4.6, image: "/images/holika.jpg" },
  { id: nanoid(6), name: "Some By Mi Toner",       category: "Тонеры",      description: "Тонер с кислотами.",           price: 1490, stock: 9,  rating: 4.3, image: "/images/somebymi.jpg" },
  { id: nanoid(6), name: "Joseon Sunscreen",       category: "SPF",         description: "Солнцезащитный крем SPF50+.", price: 1290, stock: 16, rating: 4.8, image: "/images/joseon.jpg" },
  { id: nanoid(6), name: "Tony Moly Eye Stick",    category: "Глаза",       description: "Стик против отеков.",          price: 890,  stock: 11, rating: 4.2, image: "/images/tonymoly.jpg" }
];

// ─────────────────────────────────────────
// Helpers: JWT / bcrypt
// ─────────────────────────────────────────
async function hashPassword(password) { return bcrypt.hash(password, 10); }
async function verifyPassword(password, hash) { return bcrypt.compare(password, hash); }

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

// ─────────────────────────────────────────
// Middleware: Auth
// ─────────────────────────────────────────
function authMiddleware(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = users.find((u) => u.id === payload.sub);
    if (user?.isBlocked) return res.status(403).json({ error: "Your account has been blocked" });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
}

// ─────────────────────────────────────────
// Redis Cache Middleware
// ─────────────────────────────────────────

/**
 * cacheMiddleware(keyFn)
 * keyFn(req) → строка ключа Redis
 *
 * При GET: проверяет кэш → если есть, возвращает 200 из кэша (заголовок X-Cache: HIT).
 *           Если нет — выполняет запрос, перехватывает ответ, кладёт в кэш (X-Cache: MISS).
 */
function cacheMiddleware(keyFn, ttl) {
  return async (req, res, next) => {
    const cacheKey = keyFn(req);

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`[CACHE HIT] ${cacheKey}`);
        res.setHeader("X-Cache", "HIT");
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      console.error("[CACHE ERROR] Чтение:", err.message);
    }

    // Перехватываем res.json, чтобы сохранить ответ в кэш
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      if (res.statusCode === 200) {
        try {
          await redis.setex(cacheKey, ttl, JSON.stringify(data));
          console.log(`[CACHE SET] ${cacheKey} (TTL: ${ttl}s)`);
        } catch (err) {
          console.error("[CACHE ERROR] Запись:", err.message);
        }
      }
      res.setHeader("X-Cache", "MISS");
      return originalJson(data);
    };

    next();
  };
}

/**
 * Инвалидирует ключи по паттерну
 */
async function invalidateCache(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[CACHE INVALIDATE] Удалено ключей: ${keys.length} по паттерну "${pattern}"`);
    }
  } catch (err) {
    console.error("[CACHE ERROR] Инвалидация:", err.message);
  }
}

// Логирование
app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode}`);
  });
  next();
});

// ─────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────

app.post("/api/auth/register", async (req, res) => {
  const { email, password, first_name, last_name, role } = req.body;
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: "email, password, first_name и last_name обязательны" });
  }
  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ error: "Пользователь с таким email уже существует" });
  }
  const allowedRoles = ["user", "seller", "admin"];
  const assignedRole = allowedRoles.includes(role) ? role : "user";

  const newUser = {
    id: nanoid(6),
    email,
    first_name,
    last_name,
    password: await hashPassword(password),
    role: assignedRole,
    isBlocked: false,
  };
  users.push(newUser);

  // Инвалидируем кэш списка пользователей
  await invalidateCache("users:*");

  res.status(201).json({ id: newUser.id, email, first_name, last_name, role: assignedRole });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email и password обязательны" });

  const user = users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: "Пользователь не найден" });
  if (user.isBlocked) return res.status(403).json({ error: "Аккаунт заблокирован" });

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) return res.status(401).json({ error: "Неверные учётные данные" });

  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);

  const secure = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", refreshToken, { httpOnly: true, secure, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ accessToken, refreshToken });
});

app.post("/api/auth/refresh", (req, res) => {
  const cookieToken = req.cookies?.refreshToken;
  const [scheme, headerToken] = (req.headers.authorization || "").split(" ");
  const refreshToken = cookieToken || (scheme === "Bearer" ? headerToken : null);

  if (!refreshToken) return res.status(400).json({ error: "Refresh token не найден" });
  if (!refreshTokens.has(refreshToken)) return res.status(401).json({ error: "Недействительный refresh token" });

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: "Пользователь не найден" });

    refreshTokens.delete(refreshToken);
    const newAccessToken  = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);

    const secure = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", newRefreshToken, { httpOnly: true, secure, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    return res.status(401).json({ error: "Недействительный или просроченный refresh token" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const cookieToken = req.cookies?.refreshToken;
  if (cookieToken) refreshTokens.delete(cookieToken);
  res.clearCookie("refreshToken");
  res.json({ message: "Выход выполнен" });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: "Пользователь не найден" });
  res.json({ id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role, isBlocked: user.isBlocked });
});

// ─────────────────────────────────────────
// USER ROUTES (admin)
// ─────────────────────────────────────────

// GET /api/users — с кэшированием
app.get(
  "/api/users",
  authMiddleware,
  roleMiddleware(["admin"]),
  cacheMiddleware(() => "users:all", USERS_CACHE_TTL),
  (req, res) => {
    const safeUsers = users.map(({ id, email, first_name, last_name, role, isBlocked }) => ({
      id, email, first_name, last_name, role, isBlocked,
    }));
    res.json(safeUsers);
  }
);

// GET /api/users/:id — с кэшированием
app.get(
  "/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  cacheMiddleware((req) => `users:${req.params.id}`, USERS_CACHE_TTL),
  (req, res) => {
    const user = users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    res.json({ id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role, isBlocked: user.isBlocked });
  }
);

// PUT /api/users/:id — инвалидация кэша
app.put("/api/users/:id", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Пользователь не найден" });

  const { first_name, last_name, email, role } = req.body;
  const user = users[idx];

  if (first_name !== undefined) user.first_name = first_name;
  if (last_name  !== undefined) user.last_name  = last_name;
  if (email !== undefined) {
    if (users.find((u) => u.email === email && u.id !== user.id)) {
      return res.status(400).json({ error: "Email уже занят" });
    }
    user.email = email;
  }
  if (role !== undefined) {
    if (!["user", "seller", "admin"].includes(role)) return res.status(400).json({ error: "Недопустимая роль" });
    user.role = role;
  }

  // Инвалидируем кэш конкретного пользователя и общего списка
  await invalidateCache(`users:${req.params.id}`);
  await invalidateCache("users:all");

  res.json({ id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role, isBlocked: user.isBlocked });
});

// DELETE /api/users/:id (блокировка) — инвалидация кэша
app.delete("/api/users/:id", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Пользователь не найден" });
  if (users[idx].id === req.user.sub) return res.status(400).json({ error: "Нельзя заблокировать самого себя" });

  users[idx].isBlocked = true;

  await invalidateCache(`users:${req.params.id}`);
  await invalidateCache("users:all");

  res.json({ message: "Пользователь заблокирован", id: req.params.id });
});

app.patch("/api/users/:id/unblock", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Пользователь не найден" });
  users[idx].isBlocked = false;

  await invalidateCache(`users:${req.params.id}`);
  await invalidateCache("users:all");

  res.json({ message: "Пользователь разблокирован", id: req.params.id });
});

// ─────────────────────────────────────────
// PRODUCT ROUTES
// ─────────────────────────────────────────

// GET /api/products — с кэшированием
app.get(
  "/api/products",
  authMiddleware,
  cacheMiddleware(() => "products:all", PRODUCTS_CACHE_TTL),
  (req, res) => {
    res.json(products);
  }
);

// GET /api/products/:id — с кэшированием
app.get(
  "/api/products/:id",
  authMiddleware,
  cacheMiddleware((req) => `products:${req.params.id}`, PRODUCTS_CACHE_TTL),
  (req, res) => {
    const product = products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Товар не найден" });
    res.json(product);
  }
);

// POST /api/products — инвалидация products:all
app.post("/api/products", authMiddleware, roleMiddleware(["seller", "admin"]), async (req, res) => {
  const { name, category, description, price, stock, rating, image } = req.body;
  const newProduct = {
    id: nanoid(6),
    name:        name?.trim()        || "Новый товар",
    category:    category?.trim()    || "Без категории",
    description: description?.trim() || "",
    price:       Number(price)       || 0,
    stock:       Number(stock)       || 0,
    rating:      Number(rating)      || 5.0,
    image:       image?.trim()       || "/images/placeholder.jpg",
  };
  products.push(newProduct);

  await invalidateCache("products:all");

  res.status(201).json(newProduct);
});

// PUT /api/products/:id — инвалидация
app.put("/api/products/:id", authMiddleware, roleMiddleware(["seller", "admin"]), async (req, res) => {
  const idx = products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Товар не найден" });
  if (Object.keys(req.body).length === 0) return res.status(400).json({ error: "Нечего обновлять" });

  const p = products[idx];
  const { name, category, description, price, stock, rating, image } = req.body;
  if (name        !== undefined) p.name        = name.trim();
  if (category    !== undefined) p.category    = category.trim();
  if (description !== undefined) p.description = description.trim();
  if (price       !== undefined) p.price       = Number(price);
  if (stock       !== undefined) p.stock       = Number(stock);
  if (rating      !== undefined) p.rating      = Number(rating);
  if (image       !== undefined) p.image       = image.trim();

  await invalidateCache(`products:${req.params.id}`);
  await invalidateCache("products:all");

  res.json(products[idx]);
});

// DELETE /api/products/:id — инвалидация
app.delete("/api/products/:id", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
  const idx = products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Товар не найден" });

  const id = products[idx].id;
  products = products.filter((p) => p.id !== id);

  await invalidateCache(`products:${id}`);
  await invalidateCache("products:all");

  res.status(204).send();
});

// ─────────────────────────────────────────
// DEBUG: посмотреть текущие ключи кэша
// ─────────────────────────────────────────
app.get("/api/cache/keys", async (req, res) => {
  try {
    const keys = await redis.keys("*");
    res.json({ keys, count: keys.length });
  } catch (err) {
    res.status(500).json({ error: "Redis недоступен" });
  }
});

// 404 / ошибки
app.use((req, res) => res.status(404).json({ error: "Маршрут не найден" }));
app.use((err, req, res, next) => {
  console.error("Необработанная ошибка:", err);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

// ─────────────────────────────────────────
// Запуск
// ─────────────────────────────────────────
redis
  .connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 PR21 RBAC + Redis Server запущен: http://localhost:${PORT}`);
      console.log(`📦 Redis TTL: users=${USERS_CACHE_TTL}s, products=${PRODUCTS_CACHE_TTL}s`);
      console.log("GET /api/cache/keys — просмотр ключей кэша");
    });
  })
  .catch((err) => {
    console.error("⚠️  Redis недоступен, запуск без кэша:", err.message);
    app.listen(PORT, () => {
      console.log(`🚀 PR21 Server (без кэша) запущен: http://localhost:${PORT}`);
    });
  });
