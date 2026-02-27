const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

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

app.get("/api/products", (req, res) => res.json(products));

app.post("/api/products", (req, res) => {
  const { name, category, description, price, stock, rating, image } = req.body;
  const newProduct = {
    id: nanoid(6),
    name: name?.trim() || "Новый товар",
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

app.patch("/api/products/:id", (req, res) => {
  const id = req.params.id;
  const product = findProductOr404(id, res);
  if (!product) return;

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const { name, category, description, price, stock, rating, image } = req.body;

  if (name !== undefined) product.name = name.trim();
  if (category !== undefined) product.category = category.trim();
  if (description !== undefined) product.description = description.trim();
  if (price !== undefined) product.price = Number(price);
  if (stock !== undefined) product.stock = Number(stock);
  if (rating !== undefined) product.rating = Number(rating);
  if (image !== undefined) product.image = image.trim();

  res.json(product);
});

app.delete("/api/products/:id", (req, res) => {
  const id = req.params.id;
  const exists = products.some((p) => p.id === id);
  
  if (!exists) {
      return res.status(404).json({ error: "Product not found" });
  }

  products = products.filter((p) => p.id !== id);
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