# Практика 20 — CRUD с MongoDB (Mongoose)

## Задание
Реализовать REST API для управления пользователями с хранением данных в MongoDB.  
Использовать **Mongoose** (ODM).

---

## Эндпоинты

| Метод  | URL               | Описание                   |
|--------|-------------------|----------------------------|
| GET    | /api/users        | Список всех пользователей  |
| GET    | /api/users/:id    | Один пользователь по ID    |
| POST   | /api/users        | Создать пользователя        |
| PUT    | /api/users/:id    | Обновить пользователя       |
| DELETE | /api/users/:id    | Удалить пользователя        |

## Поля пользователя (Mongoose Schema)

```json
{
  "_id":        "507f1f77bcf86cd799439011",
  "first_name": "Иван",
  "last_name":  "Иванов",
  "email":      "ivan@example.com",
  "age":        25,
  "createdAt":  "2024-01-01T00:00:00.000Z",
  "updatedAt":  "2024-01-01T00:00:00.000Z"
}
```

---

## Установка и запуск

### 1. Убедиться, что MongoDB запущен
```bash
# macOS / Linux
mongod --dbpath /data/db

# Windows (если установлен как сервис)
net start MongoDB
```

### 2. Настроить `.env`
```bash
cp .env.example .env
```

### 3. Установить зависимости и запустить
```bash
cd server
npm install
npm start
```

---

## Примеры запросов (curl)

```bash
# Создать
curl -X POST http://localhost:3020/api/users \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Иван","last_name":"Иванов","email":"ivan@test.com","age":25}'

# Список
curl http://localhost:3020/api/users

# Один
curl http://localhost:3020/api/users/<_id>

# Обновить
curl -X PUT http://localhost:3020/api/users/<_id> \
  -H "Content-Type: application/json" \
  -d '{"age":26}'

# Удалить
curl -X DELETE http://localhost:3020/api/users/<_id>
```

---

## Отличия от пр. 19 (PostgreSQL/pg)

| Характеристика | пр. 19 (pg)           | пр. 20 (Mongoose)     |
|----------------|-----------------------|-----------------------|
| БД             | PostgreSQL            | MongoDB               |
| Подход         | SQL-запросы вручную   | Schema + Model ORM    |
| ID             | INTEGER SERIAL        | ObjectId (_id)        |
| Уникальность   | UNIQUE constraint     | `unique: true` schema |
| Валидация      | Вручную в коде        | В схеме Mongoose      |

---

## Структура проекта

```
pr20/
└── server/
    ├── app.js          # Сервер с Mongoose
    ├── package.json
    └── .env.example
```
