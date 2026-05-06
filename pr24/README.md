# Практические занятия 19-23: Фронтенд и бэкенд разработка

## 📚 Общий обзор курса

Этот набор практических занятий охватывает **полный цикл разработки и развёртывания микросервисных приложений** — от создания базового REST API до контейнеризации в Docker Compose.

**Кафедра:** Индустриального программирования  
**Преподаватели:** Загородних Николай Анатольевич, Краснослободцева Дарья Борисовна  
**Семестр:** 4 семестр, 2025/2026 уч. год

---

## 🎯 Карта практик

| # | Название | Тема | Ключевые технологии |
|---|----------|------|-------------------|
| 19 | REST API и Express | Создание backend сервера | Node.js, Express, HTTP |
| 20 | Микросервисная архитектура | Несколько независимых сервисов | Express, маршрутизация, паттерны |
| 21 | Nginx как прокси-сервер | Маршрутизация и реверс-прокси | Nginx, конфиги, виртуальные хосты |
| 22 | Балансировка нагрузки | Распределение запросов между серверами | Nginx, HAProxy, round-robin, healthcheck |
| 23 | Контейнеризация с Docker | Упаковка приложений в контейнеры | Docker, Dockerfile, Docker Compose |

---

## 🔗 Прогрессирующая сложность

```
Практика 19          Практика 20          Практика 21
┌─────────┐          ┌─────────┐          ┌─────────┐
│ REST    │          │ Micro   │          │ Nginx   │
│ API     │ ─────► │ services│ ─────► │ Proxy   │
│ Express │          │         │          │         │
└─────────┘          └─────────┘          └─────────┘
                                                │
                                                │
                                    Практика 22 ▼
                                  ┌─────────────┐
                                  │ Load Bal.   │
                                  │ Nginx+HAProxy
                                  │ Health check│
                                  └─────────────┘
                                                │
                                                │
                                    Практика 23 ▼
                                  ┌─────────────┐
                                  │ Docker      │
                                  │ Compose     │
                                  │ Containers  │
                                  └─────────────┘
```

---

## 📖 Подробное описание каждой практики

### Практика 19: REST API и Express

**Цель:** Создать базовый backend сервер на Node.js с REST API.

**Что изучаем:**
- Основы Express.js
- Методы HTTP (GET, POST, PUT, DELETE)
- Маршрутизация
- Middleware
- JSON ответы
- Коды статусов HTTP

**Структура:**
```
pr19/
├── app.js          # Express приложение
├── package.json    # Зависимости
└── README.md       # Инструкции
```

**Пример маршрутов:**
```javascript
GET /api/users        → Получить всех пользователей
GET /api/users/1      → Получить пользователя по ID
POST /api/users       → Создать нового пользователя
PUT /api/users/1      → Обновить пользователя
DELETE /api/users/1   → Удалить пользователя
```

**Команды:**
```bash
cd pr19
npm install
node app.js
# Server running on port 3000
```

---

### Практика 20: Микросервисная архитектура

**Цель:** Разделить приложение на несколько независимых микросервисов.

**Что изучаем:**
- Принципы микросервисной архитектуры
- Несколько независимых сервисов
- Маршрутизация между сервисами
- API Gateway паттерн
- Inter-service communication

**Архитектура:**
```
API Gateway (8000)
├── Users Service (8001)
├── Orders Service (8002)
└── Products Service (8003)
```

**Структура:**
```
pr20/
├── api-gateway/
│   └── app.js       # Точка входа, маршрутизирует запросы
├── users-service/
│   └── app.js       # Сервис управления пользователями
├── orders-service/
│   └── app.js       # Сервис управления заказами
├── products-service/
│   └── app.js       # Сервис управления товарами
└── README.md
```

**Примеры запросов:**
```bash
# Через gateway
curl http://localhost:8000/users/1
curl http://localhost:8000/orders

# Gateway делает внутренние запросы к сервисам
GET /users/1 → http://localhost:8001/api/users/1
GET /orders → http://localhost:8002/api/orders
```

**Ключевые концепции:**
- **API Gateway** — единая точка входа
- **Service Discovery** — как сервисы находят друг друга
- **Load Balancing** — распределение нагрузки
- **Isolation** — независимость сервисов

---

### Практика 21: Nginx как прокси-сервер

**Цель:** Использовать Nginx для маршрутизации и реверс-прокси.

**Что изучаем:**
- Конфигурация Nginx
- Виртуальные хосты
- Реверс-прокси
- Маршрутизация по пути и домену
- Переадресация (rewrite rules)

**Структура:**
```
pr21/
├── nginx/
│   └── nginx.conf          # Конфигурация Nginx
├── backend1/
│   └── app.js             # Backend на порту 3001
├── backend2/
│   └── app.js             # Backend на порту 3002
└── README.md
```

**Конфиг nginx.conf:**
```nginx
# Виртуальный хост с реверс-прокси
server {
    listen 80;
    server_name localhost;
    
    location /api/users {
        proxy_pass http://localhost:8001;
    }
    
    location /api/orders {
        proxy_pass http://localhost:8002;
    }
}
```

**Типичные настройки:**
```
Запрос: http://localhost/api/users
   ↓
Nginx слушает 80 порт
   ↓
Проксирует на http://localhost:8001/api/users
   ↓
Backend обрабатывает, возвращает ответ
   ↓
Nginx отправляет клиенту
```

---

### Практика 22: Балансировка нагрузки

**Цель:** Распределить нагрузку между несколькими идентичными backend-серверами.

**Что изучаем:**
- Upstream блоки в Nginx
- Алгоритмы балансировки (round-robin, least_conn, ip_hash)
- Healthcheck и отказоустойчивость
- Max fails и fail timeout
- HAProxy как альтернатива

**Архитектура:**
```
Клиент
  │
  └─── Nginx (8080) ◄─── Балансировщик
         ├─► Backend1 (3031)
         ├─► Backend2 (3032)
         └─► Backend3 (3033)

или

Клиент
  │
  └─── HAProxy (9090) ◄─── Балансировщик + healthcheck
         ├─► Backend1 (3031)
         ├─► Backend2 (3032)
         └─► Backend3 (3033)
```

**Структура:**
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
│   └── nginx.conf          # Round-robin балансировка
├── haproxy/
│   └── haproxy.cfg         # С healthcheck
└── README.md
```

**Nginx конфиг:**
```nginx
upstream nodejs_cluster {
    server 127.0.0.1:3031 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3032 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3033 max_fails=3 fail_timeout=30s;
}

server {
    listen 8080;
    location /api/ {
        proxy_pass http://nodejs_cluster;
    }
}
```

**Тестирование:**
```bash
for i in 1 2 3 4 5 6; do
  curl http://localhost:8080/api/info | grep server
done
# Видно чередование: server-1, server-2, server-3, server-1...
```

**Ключевые концепции:**
- **Round-robin** — по очереди
- **Least connections** — на сервер с меньше соединений
- **IP Hash** — по IP клиента для sticky sessions
- **Healthcheck** — проверка живости серверов
- **Failover** — автоматический переход на другой сервер

---

### Практика 23: Контейнеризация с Docker

**Цель:** Упаковать приложение в Docker контейнеры и оркестрировать через Docker Compose.

**Что изучаем:**
- Docker образы и контейнеры
- Dockerfile для сборки образов
- Docker Compose для оркестрации
- Docker сети
- Переменные окружения в контейнерах
- Healthcheck в Docker

**Архитектура:**
```
┌─────────────────────────────┐
│     Docker Compose          │
├─────────────────────────────┤
│                             │
│  ┌──────────────────────┐   │
│  │ Nginx контейнер      │   │
│  │ (localhost:80)       │   │
│  └──────────────────────┘   │
│         ▲                   │
│         │ (в сети)          │
│    ┌────┴────┐              │
│    ▼         ▼              │
│  ┌─────┐  ┌─────┐           │
│  │ B1  │  │ B2  │           │
│  │ (3k)│  │ (3k)│           │
│  └─────┘  └─────┘           │
│  Backend контейнеры         │
│                             │
└─────────────────────────────┘
   app-network (bridge)
```

**Структура:**
```
pr23/
├── docker-compose.yml          # Оркестрация контейнеров
├── nginx/
│   └── nginx.conf
├── backend1/
│   ├── Dockerfile             # Инструкции сборки
│   ├── package.json
│   └── app.js
├── backend2/
│   ├── Dockerfile
│   ├── package.json
│   └── app.js
└── README.md
```

**docker-compose.yml:**
```yaml
version: "3.8"

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - app-network
    depends_on:
      - backend1
      - backend2

  backend1:
    build: ./backend1
    environment:
      SERVER_ID: backend-1
      PORT: 3000
    networks:
      - app-network

  backend2:
    build: ./backend2
    environment:
      SERVER_ID: backend-2
      PORT: 3000
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

**Dockerfile для backend:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

**Команды:**
```bash
cd pr23

# Сборка и запуск
docker compose up --build

# В фоне
docker compose up -d

# Просмотр контейнеров
docker compose ps

# Логи
docker compose logs -f

# Остановка
docker compose down
```

**Ключевые концепции:**
- **Образ** — неизменяемый шаблон (как blueprint)
- **Контейнер** — запущенный экземпляр образа (как объект)
- **Dockerfile** — инструкции для сборки образа
- **Docker Compose** — оркестрация нескольких контейнеров
- **Сети** — связь между контейнерами
- **Тома** — сохранение данных

---

## 🚀 Полный путь разработки

### Шаг 1: Написать REST API (Практика 19)
```
npm init
npm install express
# Написать app.js с маршрутами
node app.js
```

### Шаг 2: Разделить на микросервисы (Практика 20)
```
Создать папки для каждого сервиса
Каждый сервис — отдельное Express приложение
API Gateway маршрутизирует запросы
```

### Шаг 3: Добавить Nginx для маршрутизации (Практика 21)
```
Создать nginx.conf
Настроить виртуальные хосты
Проксировать запросы на сервисы
```

### Шаг 4: Добавить балансировку (Практика 22)
```
Запустить несколько идентичных backend'ов
Использовать Nginx upstream для балансировки
Добавить healthcheck через HAProxy
```

### Шаг 5: Контейнеризировать (Практика 23)
```
Написать Dockerfile для каждого сервиса
Создать docker-compose.yml
docker compose up
```

---

## 📊 Сравнение подходов

| Аспект | Практика 19 | Практика 20 | Практика 21 | Практика 22 | Практика 23 |
|--------|-----------|-----------|-----------|-----------|-----------|
| Серверов | 1 | 3-4 | 2-3 | 3+ | 2-3 |
| Балансировка | ✗ | ✗ | ✗ | ✅ | ✅ |
| Маршрутизация | ✓ | ✓ | ✅ | ✅ | ✅ |
| Healthcheck | ✗ | ✗ | ✗ | ✅ | ✅ |
| Контейнеры | ✗ | ✗ | ✗ | ✗ | ✅ |
| Управление | Ручное | Ручное | Ручное | Ручное | Docker Compose |

---

## 🔄 Цикл разработки в production

```
┌──────────────────────────────────────┐
│  1. Разработка (Практика 19-21)      │
│     └─ Написание кода, локальное     │
│        тестирование, Nginx конфиги   │
└─────────────┬────────────────────────┘
              │
┌─────────────▼────────────────────────┐
│  2. Балансировка (Практика 22)       │
│     └─ Несколько инстансов, failover,│
│        health checks                  │
└─────────────┬────────────────────────┘
              │
┌─────────────▼────────────────────────┐
│  3. Контейнеризация (Практика 23)    │
│     └─ Docker образы, Compose,       │
│        воспроизводимость              │
└─────────────┬────────────────────────┘
              │
┌─────────────▼────────────────────────┐
│  4. Production Deployment            │
│     └─ Kubernetes, облако, масштаб   │
└──────────────────────────────────────┘
```

---

## 📚 Технологический стек

### Backend
- **Node.js** — runtime
- **Express** — фреймворк
- **npm** — package manager

### Балансировка
- **Nginx** — веб-сервер и балансировщик
- **HAProxy** — специализированный балансировщик

### Контейнеризация
- **Docker** — контейнерная платформа
- **Docker Compose** — оркестрация контейнеров

### Инструменты
- **curl** — тестирование API
- **WSL 2** — Linux на Windows
- **Git** — контроль версий

---

## ✅ Итоговый чек-лист

После прохождения всех практик вы сможете:

- [x] Создавать REST API на Node.js с Express
- [x] Разделять приложение на микросервисы
- [x] Конфигурировать Nginx как прокси-сервер
- [x] Настраивать балансировку нагрузки
- [x] Реализовывать healthcheck и failover
- [x] Писать Dockerfile для приложений
- [x] Использовать Docker Compose
- [x] Запускать многоконтейнерные приложения
- [x] Тестировать распределение нагрузки
- [x] Обрабатывать отказы компонентов

---

## 🎓 Дальнейшее обучение

После этого курса рекомендуется изучить:

1. **Kubernetes** — оркестрация контейнеров в production
2. **CI/CD** — автоматизация deployment (GitHub Actions, GitLab CI)
3. **Мониторинг** — Prometheus, Grafana для наблюдения
4. **Безопасность** — SSL/TLS, аутентификация, авторизация
5. **Базы данных** — PostgreSQL, MongoDB в контейнерах
6. **Message queues** — RabbitMQ, Kafka для асинхронности
7. **Кеширование** — Redis для оптимизации

---

## 📞 Контактная информация

**Кафедра:** Индустриального программирования  
**Преподаватели:**
- Загородних Николай Анатольевич
- Краснослободцева Дарья Борисовна

**Семестр:** 4 семестр, 2025/2026 уч. год

---

## 📁 Структура всех практик

```
FRONT/
├── pr19/
│   ├── app.js
│   ├── package.json
│   └── README.md
├── pr20/
│   ├── api-gateway/
│   ├── users-service/
│   ├── orders-service/
│   └── README.md
├── pr21/
│   ├── nginx/
│   ├── backend1/
│   ├── backend2/
│   └── README.md
├── pr22/
│   ├── server1/
│   ├── server2/
│   ├── server3/
│   ├── nginx/
│   ├── haproxy/
│   └── README.md
├── pr23/
│   ├── backend1/
│   ├── backend2/
│   ├── nginx/
│   ├── docker-compose.yml
│   └── README.md
└── pr24/
    └── README.md (этот файл)
```

---

**Успехов в обучении! 🚀**
