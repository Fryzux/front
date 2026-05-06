const express = require('express');
const https = require('https'); 
const fs = require('fs');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// --- ЛОГИРОВАНИЕ В ФАЙЛ ---
const LOG_FILE = path.join(__dirname, 'push-debug.log');
const SUBS_FILE = path.join(__dirname, 'subscriptions.json');

function logToFile(message) {
    const timestamp = new Date().toLocaleString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logEntry);
    console.log(message);
}

logToFile('🚀 Сервер запускается в режиме HTTPS...');

process.on('uncaughtException', (err) => {
    logToFile(`💥 КРИТИЧЕСКАЯ ОШИБКА: ${err.message}\n${err.stack}`);
});

// --- VAPID КЛЮЧИ ---
const vapidKeys = {
    publicKey: 'BFtP4JA9BaRGrm3HeAW_6L0tRyLyfyhjyywTbpYm4GjCzCI3B0X9KVM6ompXWKF9rduJxLQXSbJeLyYRAzBSevA',
    privateKey: 'GEKrzaiBO8zcwXtDJW-z1U2X6-VZqt8koCZlrim34oY'
};

webpush.setVapidDetails(
    'mailto:test@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, './'))); 

// --- УПРАВЛЕНИЕ ПОДПИСКАМИ ---
let subscriptions = [];
try {
    if (fs.existsSync(SUBS_FILE)) {
        subscriptions = JSON.parse(fs.readFileSync(SUBS_FILE));
        logToFile(`✅ Загружено подписок из файла: ${subscriptions.length}`);
    }
} catch (e) {
    logToFile('⚠️ Не удалось загрузить subscriptions.json, начинаем с пустого списка.');
}

function saveSubscriptions() {
    try {
        fs.writeFileSync(SUBS_FILE, JSON.stringify(subscriptions, null, 2));
    } catch (e) {
        logToFile('❌ Ошибка при сохранении подписок в файл!');
    }
}

// Хранилище активных напоминаний
const reminders = new Map();

// Настройка HTTPS
const options = {
    key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'localhost.pem'))
};

// Создаем HTTPS сервер
const server = https.createServer(options, app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- ФУНКЦИЯ РАССЫЛКИ PUSH ---
async function sendPushToAll(payloadObj) {
    const payload = JSON.stringify(payloadObj);
    logToFile(`📡 Начинаю рассылку push: "${payloadObj.title}" для ${subscriptions.length} устройств`);

    const results = await Promise.all(subscriptions.map(async (sub, index) => {
        try {
            await webpush.sendNotification(sub, payload);
            logToFile(`   ✅ [${index}] Успешно отправлено на ${sub.endpoint.substring(0, 40)}...`);
            return { success: true };
        } catch (err) {
            logToFile(`   ❌ [${index}] ОШИБКА отправки: Код ${err.statusCode}`);
            if (err.statusCode === 410 || err.statusCode === 404) {
                logToFile(`     (Удаляю невалидную подписку)`);
                return { success: false, remove: true, index };
            }
            return { success: false };
        }
    }));

    // Удаляем "протухшие" подписки
    const toRemove = results.filter(r => r.remove).map(r => r.index).sort((a, b) => b - a);
    if (toRemove.length > 0) {
        toRemove.forEach(idx => subscriptions.splice(idx, 1));
        saveSubscriptions();
        logToFile(`🧹 Удалено устаревших подписок: ${toRemove.length}`);
    }
}

io.on('connection', (socket) => {
    logToFile(`🔌 Клиент подключён (HTTPS): ${socket.id}`);

    socket.on('newTask', (task) => {
        io.emit('taskAdded', task);
        sendPushToAll({
            title: 'Новая задача',
            body: task.text
        });
    });

    socket.on('newReminder', (reminder) => {
        const { id, text, reminderTime } = reminder;
        const delay = reminderTime - Date.now();
        logToFile(`⏰ Напоминание запланировано: "${text}" через ${Math.round(delay/1000)} сек`);
        
        if (delay <= 0) return;

        const timeoutId = setTimeout(() => {
            logToFile(`🔔 СРАБОТАЛО: ${text}`);
            sendPushToAll({
                title: '!!! Напоминание',
                body: text,
                reminderId: id
            });
        }, delay);

        reminders.set(id, { timeoutId, text, reminderTime });
    });

    socket.on('disconnect', () => {
        logToFile(`🔌 Клиент отключён: ${socket.id}`);
    });
});

app.post('/subscribe', (req, res) => {
    const newSub = req.body;
    if (!subscriptions.find(s => s.endpoint === newSub.endpoint)) {
        subscriptions.push(newSub);
        saveSubscriptions();
        logToFile('📥 Новая подписка добавлена.');
    }
    res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
    saveSubscriptions();
    logToFile('📤 Клиент отписался.');
    res.status(200).json({ message: 'Подписка удалена' });
});

app.post('/snooze', (req, res) => {
    const reminderId = parseInt(req.query.reminderId, 10);
    logToFile(`⏰ Запрос на SNOOZE (Отложить) для ID: ${reminderId}`);
    
    if (!reminderId || !reminders.has(reminderId)) {
        logToFile('❌ Ошибка SNOOZE: Напоминание не найдено в памяти сервера.');
        return res.status(404).json({ error: 'Reminder not found' });
    }

    const reminder = reminders.get(reminderId);
    clearTimeout(reminder.timeoutId);

    // Новое напоминание через 5 минут (300 000 мс)
    const snoozeDelay = 5 * 60 * 1000; 
    logToFile(`⏳ Напоминание "${reminder.text}" отложено на 5 минут.`);

    const newTimeoutId = setTimeout(() => {
        logToFile(`🔔 ПОВТОРНО СРАБОТАЛО: ${reminder.text}`);
        sendPushToAll({
            title: '⏰ Отложенное напоминание',
            body: `Вы просили напомнить: ${reminder.text}`,
            reminderId: reminderId
        });
        reminders.delete(reminderId);
    }, snoozeDelay);

    reminders.set(reminderId, { timeoutId: newTimeoutId, text: reminder.text, reminderTime: Date.now() + snoozeDelay });
    res.status(200).json({ message: 'Snoozed for 5 minutes' });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
    logToFile(`🚀 СЕРВЕР ЗАПУЩЕН (HTTPS): https://localhost:${PORT}`);
    logToFile(`📖 Код соответствует требованиям ПЗ №17 (с HTTPS)!`);
});
