/**
 * App Shell Architecture - Основной JS файл (pr16).
 * Добавлен WebSocket (Socket.IO) и Push-уведомления.
 */

const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');

// Настройка Socket.IO (теперь через HTTPS соединение сервера)
const socket = io();

// VAPID для Push
const VAPID_PUBLIC_KEY = 'BFtP4JA9BaRGrm3HeAW_6L0tRyLyfyhjyywTbpYm4GjCzCI3B0X9KVM6ompXWKF9rduJxLQXSbJeLyYRAzBSevA';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        await fetch('/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });
        console.log('Подписка на push отправлена');
        alert('✅ Уведомления успешно включены!');
    } catch (err) {
        console.error('Ошибка подписки на push:', err);
        alert('❌ Ошибка при включении уведомлений: ' + err.message);
    }
}

async function unsubscribeFromPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
        await fetch('/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
        console.log('Отписка выполнена');
        alert('🔔 Уведомления отключены.');
    }
}

/**
 * Установка активной кнопки навигации (Pill-nav).
 */
function setActiveButton(activeId) {
    [homeBtn, aboutBtn].forEach(btn => btn.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
}

/**
 * Загрузка динамического контента страницы.
 */
async function loadContent(page) {
    try {
        const response = await fetch(`./content/${page}.html`);
        if (!response.ok) throw new Error('Ошибка загрузки страницы');
        
        const html = await response.text();
        contentDiv.innerHTML = html;
        
        if (page === 'home') {
            initNotes();
        }
    } catch (err) {
        contentDiv.innerHTML = `<p class="is-center text-error">Ошибка загрузки страницы: ${err.message}</p>`;
        console.error(err);
    }
}

/**
 * Логика управления заметками.
 */
function initNotes() {
    const form = document.getElementById('note-form');
    const input = document.getElementById('note-input');
    const reminderForm = document.getElementById('reminder-form');
    const reminderText = document.getElementById('reminder-text');
    const reminderTime = document.getElementById('reminder-time');
    const list = document.getElementById('notes-list');

    if (!form || !input || !list) return;

    // Автофокус при загрузке
    input.focus();

    function updateCounter(count) {
        const counter = document.getElementById('note-count');
        if (counter) counter.textContent = count;
    }

    function loadNotes() {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        updateCounter(notes.length);

        if (notes.length === 0) {
            list.innerHTML = `
                <li class="empty-state">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.15; margin-bottom: 12px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <br>
                    Заметок пока нет — добавьте первую выше
                </li>
            `;
            return;
        }

        list.innerHTML = notes
            .map(note => {
                const text = typeof note === 'string' ? note : note.text;
                const completed = note.completed || false;
                const id = note.id || Date.now();
                let reminderInfo = '';
                
                if (note.reminder) {
                    const date = new Date(note.reminder);
                    reminderInfo = `<div class="note-reminder">${date.toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</div>`;
                }
                
                return `
                    <li class="note-item">
                        <div class="note-content ${completed ? 'completed' : ''}" onclick="toggleNote(${id})">
                            <div class="note-text">${text}</div>
                            ${reminderInfo}
                        </div>
                        <button class="btn-close" onclick="deleteNote(${id})">&times;</button>
                    </li>
                `;
            }).join('');
    }

    function addNote(text, reminderTimestamp = null) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const newNote = { id: Date.now(), text, completed: false, reminder: reminderTimestamp };
        notes.push(newNote);
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
        
        if (reminderTimestamp) {
            socket.emit('newReminder', {
                id: newNote.id,
                text: text,
                reminderTime: reminderTimestamp
            });
        } else {
            socket.emit('newTask', { text, timestamp: Date.now() });
        }
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
            addNote(text);
            input.value = '';
        }
    });

    if (reminderForm) {
        reminderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = reminderText.value.trim();
            const datetime = reminderTime.value;
            if (text && datetime) {
                const timestamp = new Date(datetime).getTime();
                if (timestamp > Date.now()) {
                    addNote(text, timestamp);
                    reminderText.value = '';
                    reminderTime.value = '';
                } else {
                    alert('Дата напоминания должна быть в будущем.');
                }
            }
        });
    }

    window.toggleNote = (id) => {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const n = notes.find(x => x.id === id);
        if (n) { n.completed = !n.completed; localStorage.setItem('notes', JSON.stringify(notes)); loadNotes(); }
    };
    
    window.deleteNote = (id) => {
        let notes = JSON.parse(localStorage.getItem('notes') || '[]');
        notes = notes.filter(x => x.id !== id);
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
    };

    loadNotes();
}

// Обработка входящего события от сервера (Socket.IO)
socket.on('taskAdded', (task) => {
    console.log('Задача от другого клиента:', task);
    const notification = document.createElement('div');
    notification.className = 'toast-notif';
    notification.textContent = `Новая задача синхронизирована: ${task.text}`;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
});

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);


// Обработчики кликов по табам
homeBtn.addEventListener('click', () => {
    setActiveButton('home-btn');
    loadContent('home');
});

aboutBtn.addEventListener('click', () => {
    setActiveButton('about-btn');
    loadContent('about');
});

document.addEventListener('DOMContentLoaded', () => {
    loadContent('home');
});

// Регистрация Service Worker и Push кнопок
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const reg = await navigator.serviceWorker.register('./sw.js');
            console.log('✅ ServiceWorker registered:', reg.scope);
            
            const enableBtn = document.getElementById('enable-push');
            const disableBtn = document.getElementById('disable-push');
            
            if (enableBtn && disableBtn) {
                const subscription = await reg.pushManager.getSubscription();
                if (subscription) {
                    console.log('🔔 Активная подписка найдена');
                    enableBtn.style.display = 'none';
                    disableBtn.style.display = 'inline-block';
                }
                
                enableBtn.addEventListener('click', async () => {
                    if (Notification.permission === 'denied') {
                        alert('Уведомления запрещены. Разрешите их в настройках браузера.');
                        return;
                    }
                    if (Notification.permission === 'default' || Notification.permission === 'granted') {
                        const permission = await Notification.requestPermission();
                        if (permission !== 'granted') {
                            alert('Необходимо разрешить уведомления.');
                            return;
                        }
                    }
                    await subscribeToPush();
                    enableBtn.style.display = 'none';
                    disableBtn.style.display = 'inline-block';
                });
                
                disableBtn.addEventListener('click', async () => {
                    await unsubscribeFromPush();
                    disableBtn.style.display = 'none';
                    enableBtn.style.display = 'inline-block';
                });
            }
        } catch (err) {
            console.error('❌ ServiceWorker registration failed:', err);
            // Выводим алерт, чтобы пользователь увидел причину блокировки
            if (err.name === 'SecurityError') {
                alert('⚠️ Ошибка безопасности браузера: Сервис-воркер заблокирован из-за сертификата. Попробуйте зайти через http://localhost:3001 или включите флаг allow-insecure-localhost.');
            } else {
                alert('❌ Ошибка ServiceWorker: ' + err.message);
            }
        }
    });
}
