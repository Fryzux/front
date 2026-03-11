const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const JWT_SECRET = "access_secret";
const REFRESH_SECRET = "refresh_secret";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

// Хранилище refresh-токенов в памяти
const refreshTokens = new Set();

// Middleware для логирования запросов
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      console.log('Body:', req.body);
    }
  });
  next();
});

// Helper function
function findProductOr404(id, res) {
  const product = products.find(p => p.id === id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return null;
  }
  return product;
}

let users = [];

async function hashPassword(password) {
  const rounds = 10;
  return bcrypt.hash(password, rounds);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function findUserOr404(email, res) {
  const user = users.find(u => u.email === email);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return null;
  }
  return user;
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name
    },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

// --- Middleware для проверки JWT ---
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // сохраняем данные в req.user
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
// -----------------------------------

let products = [
  { id: nanoid(6), name: "COSRX Snail Essence", category: "Сыворотки", description: "Эссенция с муцином улитки.", price: 1590, stock: 12, rating: 4.8, image: "/images/cosrx.jpg" },
  { id: nanoid(6), name: "Laneige Sleeping Mask", category: "Маски", description: "Ночная увлажняющая маска.", price: 1890, stock: 7, rating: 4.6, image: "/images/laneige.jpg" },
  { id: nanoid(6), name: "Innisfree Foam", category: "Очищение", description: "Пенка для умывания.", price: 990, stock: 20, rating: 4.7, image: "/images/innisfree.jpg" },
  { id: nanoid(6), name: "Etude Toner", category: "Тонеры", description: "Увлажняющий тонер.", price: 1190, stock: 14, rating: 4.5, image: "/images/etude.jpg" },
  { id: nanoid(6), name: "Missha BB Cream", category: "Тональные", description: "BB крем с SPF.", price: 1390, stock: 10, rating: 4.4, image: "/images/missha.jpg" },
  { id: nanoid(6), name: "Dr.Jart Cream", category: "Кремы", description: "Питательный крем.", price: 2490, stock: 5, rating: 4.9, image: "/images/drjart.jpg" },
  { id: nanoid(6), name: "Holika Aloe Gel", category: "Увлажнение", description: "Гель алоэ 99%.", price: 790, stock: 18, rating: 4.6, image: "/images/holika.jpg" },
  { id: nanoid(6), name: "Some By Mi Toner", category: "Тонеры", description: "Тонер с кислотами.", price: 1490, stock: 9, rating: 4.3, image: "/images/somebymi.jpg" },
  { id: nanoid(6), name: "Joseon Sunscreen", category: "SPF", description: "Солнцезащитный крем SPF50+.", price: 1290, stock: 16, rating: 4.8, image: "/images/joseon.jpg" },
  { id: nanoid(6), name: "Tony Moly Eye Stick", category: "Глаза", description: "Стик против отеков.", price: 890, stock: 11, rating: 4.2, image: "/images/tonymoly.jpg" }
];

// --- AUTH ROUTES ---
app.post("/api/auth/register", async (req, res) => {
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: "email, password, first_name and last_name are required" });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: "user with this email already exists" });
  }

  const newUser = {
    id: nanoid(6),
    email: email,
    first_name: first_name,
    last_name: last_name,
    password: await hashPassword(password)
  };

  users.push(newUser);
  res.status(201).json({
    id: newUser.id,
    email: newUser.email,
    first_name: newUser.first_name,
    last_name: newUser.last_name
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  try {
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.add(refreshToken);

    res.json({ accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find((u) => u.id === payload.sub);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    refreshTokens.delete(refreshToken);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const userId = req.user.sub;
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name
  });
});
// -------------------

app.get("/api/products", (req, res) => {
  res.status(200).json(products);
});

app.get("/api/products/:id", authMiddleware, (req, res) => {
  const productId = req.params.id; // Keep as string for nanoid compatibility
  const product = products.find((p) => p.id === productId);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(product);
});

app.post("/api/products", authMiddleware, (req, res) => {
  const { name, title, category, description, price, stock, rating, image } = req.body;
  const newProduct = {
    id: nanoid(6),
    name: name?.trim() || title?.trim() || "Новый товар",
    title: title?.trim() || name?.trim() || "Новый товар",
    category: category?.trim() || "Без категории",
    description: description?.trim() || "",
    price: Number(price) || 0,
    stock: Number(stock) || 0,
    rating: Number(rating) || 5.0,
    image: image?.trim() || "/images/placeholder.jpg"
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.put("/api/products/:id", authMiddleware, (req, res) => {
  const id = req.params.id;
  const productIndex = products.findIndex((p) => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const product = products[productIndex];
  const { name, category, description, price, stock, rating, image } = req.body;

  if (name !== undefined) product.name = name.trim();
  if (category !== undefined) product.category = category.trim();
  if (description !== undefined) product.description = description.trim();
  if (price !== undefined) product.price = Number(price);
  if (stock !== undefined) product.stock = Number(stock);
  if (rating !== undefined) product.rating = Number(rating);
  if (image !== undefined) product.image = image.trim();

  res.status(200).json(products[productIndex]);
});

app.delete("/api/products/:id", authMiddleware, (req, res) => {
  const productId = req.params.id;
  const productIndex = products.findIndex((p) => p.id === productId);

  if (productIndex === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  products = products.filter((p) => p.id !== productId);
  res.status(204).send();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log("SERVER WITH IMAGES RUNNING");
});