const express = require('express');
const app = express();
const port = 3000;

// Начальные данные
let users = [
    { id: 1, name: 'Петр', age: 16 },
    { id: 2, name: 'Иван', age: 18 },
    { id: 3, name: 'Дарья', age: 20 },
];

// Middleware для парсинга JSON
app.use(express.json());

// Главная страница
app.get('/', (req, res) => {
    res.send('Главная страница');
});

// 1. Получение всех пользователей
app.get('/users', (req, res) => {
    res.json(users);
});

// 2. Получение пользователя по ID
app.get('/users/:id', (req, res) => {
    let user = users.find(u => u.id == req.params.id);
    if (user) {
        res.json(user);
    } else {
        res.status(404).send('Пользователь не найден');
    }
});

// 3. Добавление пользователя
app.post('/users', (req, res) => {
    const { name, age } = req.body;
    const newUser = {
        id: Date.now(),
        name,
        age
    };
    users.push(newUser);
    res.status(201).json(newUser);
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});