const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

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

// Регистрация сертификатов для HTTPS
let options;
try {
    options = {
        key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'localhost.pem'))
    };
} catch (e) {
    console.error('❌ Ошибка загрузки сертификатов! Убедитесь, что файлы .pem в папке pr17.');
    process.exit(1);
}

// Хранилище подписок
let subscriptions = [];

// Хранилище активных напоминаний
const reminders = new Map();

const server = https.createServer(options, app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    console.log('✅ Клиент подключён (Secure):', socket.id);

    socket.on('newTask', (task) => {
        io.emit('taskAdded', task);
        const payload = JSON.stringify({
            title: 'Новая задача',
            body: task.text
        });
        
        console.log(`📡 Рассылка push (${subscriptions.length} подписчиков)...`);
        subscriptions.forEach((sub, index) => {
            webpush.sendNotification(sub, payload)
                .then(() => console.log(`   - Push [${index}] отправлен`))
                .catch(err => {
                    console.error(`   - Push [${index}] ошибка:`, err.statusCode);
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        subscriptions.splice(index, 1);
                        console.log('     (Старая подписка удалена)');
                    }
                });
        });
    });

    socket.on('newReminder', (reminder) => {
        const { id, text, reminderTime } = reminder;
        const delay = reminderTime - Date.now();
        console.log(`⏰ Запланировано напоминание через ${Math.round(delay/1000)} сек (ID: ${id})`);
        
        if (delay <= 0) return;

        const timeoutId = setTimeout(() => {
            console.log(`🔔 Сработало напоминание: ${text}`);
            const payload = JSON.stringify({
                title: '!!! Напоминание',
                body: text,
                reminderId: id
            });

            subscriptions.forEach(sub => {
                webpush.sendNotification(sub, payload).catch(() => {});
            });

            if (reminders.has(id)) {
                reminders.get(id).fired = true;
                setTimeout(() => reminders.delete(id), 15 * 60 * 1000);
            }
        }, delay);

        reminders.set(id, { timeoutId, text, reminderTime });
    });

    socket.on('disconnect', () => {
        console.log('❌ Клиент отключён:', socket.id);
    });
});


app.post('/subscribe', (req, res) => {
    console.log('📥 Получена новая подписка от клиента');
    subscriptions.push(req.body);
    res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
    console.log('📤 Клиент отписался');
    const { endpoint } = req.body;
    subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
    res.status(200).json({ message: 'Подписка удалена' });
});

app.post('/snooze', (req, res) => {
    const reminderId = parseInt(req.query.reminderId, 10);
    console.log(`⏰ Запрос на Snooze для ID: ${reminderId}`);
    if (!reminderId || !reminders.has(reminderId)) {
        console.error('❌ Ошибка: Reminder не найден');
        return res.status(404).json({ error: 'Reminder not found' });
    }

    const reminder = reminders.get(reminderId);
    clearTimeout(reminder.timeoutId);

    // Новое напоминание через 10 секунд для теста (в проде можно 5 минут)
    const snoozeDelay = 10000; 
    const newTimeoutId = setTimeout(() => {
        const payload = JSON.stringify({
            title: '⏰ Отложенное напоминание',
            body: `Вы просили напомнить: ${reminder.text}`,
            reminderId: reminderId
        });
        
        subscriptions.forEach(sub => {
            webpush.sendNotification(sub, payload).catch(err => console.error('Push error:', err));
        });
        reminders.delete(reminderId);
    }, snoozeDelay);

    reminders.set(reminderId, { timeoutId: newTimeoutId, text: reminder.text, reminderTime: Date.now() + snoozeDelay });
    res.status(200).json({ message: 'Snoozed for 10s' });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`🚀 Secure Server running at https://localhost:${PORT}`);
});

