# Практика 22 — Балансировка нагрузки: Nginx + HAProxy

## Задание
Поднять **3 Node.js-сервера** и настроить перед ними два балансировщика:
- **Nginx** — принимает запросы на порту `8080`, раздаёт по round-robin
- **HAProxy** — принимает запросы на порту `9090`, раздаёт по round-robin с healthcheck

---

## Схема архитектуры

```
Клиент
  │
  ├─── :8080 ──► Nginx (round-robin)
  │                 ├── :3031 → server-1
  │                 ├── :3032 → server-2
  │                 └── :3033 → server-3
  │
  └─── :9090 ──► HAProxy (round-robin + healthcheck)
                    ├── :3031 → server-1
                    ├── :3032 → server-2
                    └── :3033 → server-3
```

---

## Запуск

### 1. Установить зависимости и запустить серверы

```bash
# Сервер 1
cd server1 && npm install && node app.js
# или: PORT=3031 SERVER_ID=server-1 node app.js

# Сервер 2
cd server2 && npm install && node app.js

# Сервер 3
cd server3 && npm install && node app.js
```

### 2. Запустить Nginx

```bash
# Указать путь к нашему конфигу
nginx -c /полный/путь/до/pr22/nginx/nginx.conf

# Или через Docker
docker run -d -p 8080:8080 \
  -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  nginx:alpine
```

### 3. Запустить HAProxy

```bash
haproxy -f /полный/путь/до/pr22/haproxy/haproxy.cfg

# Или через Docker
docker run -d -p 9090:9090 -p 9091:9091 \
  -v $(pwd)/haproxy/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro \
  haproxy:alpine
```

---

## Все три через Docker Compose (рекомендуется)

Создайте `docker-compose.yml` рядом с папками server1/server2/server3:

```yaml
version: "3.8"
services:
  server1:
    build: ./server1
    environment:
      PORT: 3031
      SERVER_ID: server-1
    ports: ["3031:3031"]

  server2:
    build: ./server2
    environment:
      PORT: 3032
      SERVER_ID: server-2
    ports: ["3032:3032"]

  server3:
    build: ./server3
    environment:
      PORT: 3033
      SERVER_ID: server-3
    ports: ["3033:3033"]

  nginx:
    image: nginx:alpine
    ports: ["8080:8080"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on: [server1, server2, server3]

  haproxy:
    image: haproxy:alpine
    ports: ["9090:9090", "9091:9091"]
    volumes:
      - ./haproxy/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
    depends_on: [server1, server2, server3]
```

```bash
docker-compose up
```

---

## Тестирование балансировки

```bash
# Через Nginx — видно что каждый раз отвечает другой сервер
for i in 1 2 3 4 5 6; do
  curl -s http://localhost:8080/api/info | python -m json.tool | grep server
done

# Через HAProxy
for i in 1 2 3 4 5 6; do
  curl -s http://localhost:9090/api/info | python -m json.tool | grep server
done
```

Ожидаемый вывод:
```
"server": "server-1"
"server": "server-2"
"server": "server-3"
"server": "server-1"
"server": "server-2"
"server": "server-3"
```

---

## Тестирование отказоустойчивости

```bash
# 1. Остановить server-2 (Ctrl+C в его терминале)
# 2. Продолжать слать запросы — HAProxy/Nginx пропустит server-2
for i in $(seq 1 10); do
  curl -s http://localhost:9090/api/info | grep server
done
# Ответы будут только от server-1 и server-3
```

---

## Мониторинг HAProxy

Открыть в браузере: **http://localhost:9091/stats**  
Логин/пароль: `admin / admin123`

Видно: статус каждого сервера (UP/DOWN), количество запросов, время ответа.

---

## Эндпоинты каждого сервера

| URL           | Описание                              |
|---------------|---------------------------------------|
| GET /api/info | Имя сервера, PID, счётчик запросов    |
| GET /api/health | Healthcheck для балансировщиков     |
| GET /api/items | Демо-список товаров                  |
| GET /api/slow?ms=2000 | Медленный ответ (тест таймаутов) |

---

## Структура проекта

```
pr22/
├── server1/
│   ├── app.js
│   └── package.json
├── server2/
│   ├── app.js
│   └── package.json
├── server3/
│   ├── app.js
│   └── package.json
├── nginx/
│   └── nginx.conf      # Конфиг Nginx (порт 8080)
├── haproxy/
│   └── haproxy.cfg     # Конфиг HAProxy (порт 9090, stats 9091)
└── README.md
```
