# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Сборник практических заданий по Web-разработке (пр. 1–22). Каждая папка `prN/` — самостоятельное задание со своими зависимостями. Общий `package.json` в корне содержит зависимости для экспериментов (Express, Socket.io, web-push).

## Assignment Progression

| Диапазон | Тема |
|----------|------|
| pr1–pr3  | Статическая вёрстка, чистый JS, DevTools / HTTP |
| pr4–pr6  | REST API (Express + nanoid), React-клиент, Swagger |
| pr7–pr8  | Аутентификация: bcrypt → JWT Access-токен |
| pr9–pr11 | Refresh-токены, React Router, RBAC (роли: user / seller / admin) |
| pr13–pr17 | PWA: Service Worker, App Shell, HTTPS, Web Push, Socket.io |
| pr19–pr22 | БД: PostgreSQL (pg), MongoDB (Mongoose), Redis-кэш, Nginx + HAProxy |

## Running Client-Server Assignments (pr4–pr11, pr19–pr22)

```bash
# Бэкенд
cd prN/server && npm install && node app.js   # или: npm start

# Фронтенд (отдельный терминал)
cd prN/client && npm install && npm start
```

## Port Conventions

| Практика | Server | Client |
|----------|--------|--------|
| pr4–pr8  | 3000   | 3001   |
| pr9–pr10 | 3000   | 3002   |
| pr11     | 3020   | 3003   |
| pr16–pr17 | HTTPS :3000 | — |
| pr19     | 3019   | —      |
| pr20     | 3020   | —      |
| pr21     | 3021   | —      |
| pr22     | 3031/3032/3033 (Node) · 8080 (Nginx) · 9090 (HAProxy) | — |

## PWA Assignments (pr13–pr17)

```bash
# Сгенерировать самоподписанный TLS-сертификат
cd pr16  # или pr17
node generate-certs.js

# Запустить HTTPS-сервер (pr16)
npm start   # http-server --ssl --cert localhost.pem --key localhost-key.pem -p 3000

# Запустить Node-сервер с Socket.io + Web Push (pr17)
node server.js
```

Service Worker регистрируется только по HTTPS или `localhost`. VAPID-ключи для Web Push хранятся в `vapid.json` (генерируются при первом запуске).

## Key Architecture Patterns

**Хранилище данных** — большинство серверов используют in-memory массивы (`let users = []`, `let products = []`). При перезапуске данные сбрасываются. Начиная с pr19 данные персистентны (PostgreSQL / MongoDB).

**Auth flow (pr8–pr21):**
- Access-токен: JWT, 15 мин, передаётся в заголовке `Authorization: Bearer <token>`
- Refresh-токен: JWT, 7 дней, хранится в `httpOnly` cookie + `Set<string>` в памяти сервера
- Middleware: `authMiddleware` → `roleMiddleware(["admin"])` — цепочка на защищённых маршрутах

**React-клиенты (pr5, pr9–pr11):** Create React App, порт задаётся через `set PORT=XXXX` в скрипте `start`, прокси к серверу через поле `"proxy"` в `package.json`.

**Redis-кэш (pr21):** `cacheMiddleware(keyFn)` перехватывает `res.json` и пишет в Redis с TTL 60 с. При мутирующих запросах (POST/PUT/DELETE) вызывается `invalidateCache(pattern)`. Дебаг-эндпоинт: `GET /api/cache/keys`.

**Балансировка (pr22):** три идентичных Express-сервера (SERVER_ID через env), отвечают на `GET /api/health` — используется как healthcheck. Nginx (`:8080`) и HAProxy (`:9090`) настроены на round-robin. Статистика HAProxy: `http://localhost:9091/stats` (admin/admin123).

## External Services Required

| Практика | Сервис | Что нужно |
|----------|--------|-----------|
| pr19 | PostgreSQL | БД `pr19_db`, настройки в `.env` |
| pr20 | MongoDB | запущенный `mongod`, URI в `.env` |
| pr21 | Redis | `redis-server` на `127.0.0.1:6379` |
| pr22 | Nginx / HAProxy | установлены локально или через Docker |
