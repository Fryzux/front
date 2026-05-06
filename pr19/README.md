# Практика 19 — CRUD с PostgreSQL (библиотека `pg`)

## Задание
Реализовать REST API для управления пользователями с хранением данных в PostgreSQL.  
Использовать **нативный драйвер `pg`** (не ORM).

---

## Эндпоинты

| Метод  | URL               | Описание                   |
|--------|-------------------|----------------------------|
| GET    | /api/users        | Список всех пользователей  |
| GET    | /api/users/:id    | Один пользователь по ID    |
| POST   | /api/users        | Создать пользователя        |
| PUT    | /api/users/:id    | Обновить пользователя       |
| DELETE | /api/users/:id    | Удалить пользователя        |

## Поля пользователя

```json
{
  "id":         1,
  "first_name": "Иван",
  "last_name":  "Иванов",
  "email":      "ivan@example.com",
  "age":        25,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

## Установка и запуск

### 1. Создать базу данных PostgreSQL
```sql
CREATE DATABASE pr19_db;
```

### 2. Настроить `.env`
```bash
cp .env.example .env
# Заполнить данные подключения
```

### 3. Установить зависимости и запустить
```bash
cd server
npm install
npm start
```

Таблица `users` создаётся автоматически при первом запуске.

---

## Примеры запросов (curl)

```bash
# Создать пользователя
curl -X POST http://localhost:3019/api/users \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Иван","last_name":"Иванов","email":"ivan@test.com","age":25}'

# Получить список
curl http://localhost:3019/api/users

# Обновить
curl -X PUT http://localhost:3019/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"age":26}'

# Удалить
curl -X DELETE http://localhost:3019/api/users/1
```

---

## Структура проекта

```
pr19/
└── server/
    ├── app.js          # Основной файл сервера
    ├── package.json
    └── .env.example    # Пример переменных окружения
```
