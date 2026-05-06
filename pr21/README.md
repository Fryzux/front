# Практика 21 — Redis кэширование поверх RBAC (пр. 11)

## Задание
Взять готовый RBAC-проект из **практики №11** и добавить слой кэширования через **Redis**:
- middleware читает данные из кэша (`ioredis`)
- при промахе (cache miss) — идёт к серверу и сохраняет результат
- при изменении данных — инвалидирует соответствующие ключи

---

## Архитектура кэша

```
Клиент
  │
  ▼
authMiddleware (JWT)
  │
  ▼
cacheMiddleware          ←── [CACHE HIT] X-Cache: HIT
  │   если промах ──────────── [CACHE MISS] X-Cache: MISS
  ▼                               │
Handler (бизнес-логика)           │
  │ res.json(data)                │
  └──────────────────── SET в Redis (TTL: 60s)
```

### Ключи кэша

| Ключ              | Описание                     | Инвалидируется при       |
|-------------------|------------------------------|--------------------------|
| `users:all`       | Список всех пользователей    | PUT/DELETE/PATCH /users  |
| `users:<id>`      | Один пользователь            | PUT/DELETE /users/:id    |
| `products:all`    | Список всех товаров          | POST/PUT/DELETE /products|
| `products:<id>`   | Один товар                   | PUT/DELETE /products/:id |

---

## Кэшируемые эндпоинты

| Метод | URL                    | Кэш          |
|-------|------------------------|--------------|
| GET   | /api/users             | `users:all`  |
| GET   | /api/users/:id         | `users:<id>` |
| GET   | /api/products          | `products:all` |
| GET   | /api/products/:id      | `products:<id>` |
| GET   | /api/cache/keys        | Debug: ключи кэша |

---

## Установка и запуск

### 1. Запустить Redis
```bash
# Windows (через WSL или Docker)
docker run -d -p 6379:6379 redis:alpine

# macOS
brew services start redis

# Linux
sudo systemctl start redis
```

### 2. Установить зависимости
```bash
cd server
npm install
npm start
```

---

## Проверка кэша

```bash
# 1. Первый запрос — MISS (заголовок X-Cache: MISS)
curl -v http://localhost:3021/api/products \
  -H "Authorization: Bearer <token>"

# 2. Второй запрос — HIT (заголовок X-Cache: HIT)
curl -v http://localhost:3021/api/products \
  -H "Authorization: Bearer <token>"

# 3. Посмотреть ключи в кэше
curl http://localhost:3021/api/cache/keys

# 4. Изменить данные — кэш инвалидируется
curl -X POST http://localhost:3021/api/products \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Новый товар","price":999}'

# 5. Снова GET — снова MISS (кэш сброшен)
curl -v http://localhost:3021/api/products \
  -H "Authorization: Bearer <token>"
```

---

## Ключевые части кода

### cacheMiddleware
```js
function cacheMiddleware(keyFn) {
  return async (req, res, next) => {
    const cacheKey = keyFn(req);
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(JSON.parse(cached));
    }
    // Перехватываем res.json для сохранения в кэш
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      if (res.statusCode === 200) {
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };
    next();
  };
}
```

### invalidateCache
```js
async function invalidateCache(pattern) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
}
```

---

## Структура проекта

```
pr21/
└── server/
    ├── app.js       # RBAC сервер + Redis middleware
    └── package.json
```
