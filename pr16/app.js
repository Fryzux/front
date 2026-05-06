/**
 * App Shell Architecture - Основной JS файл (pr16).
 * Добавлен WebSocket (Socket.IO) и Push-уведомления.
 */

const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');

// Настройка Socket.IO
const socket = io('http://localhost:3001');

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
        await fetch('http://localhost:3001/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });
        console.log('Подписка на push отправлена');
    } catch (err) {
        console.error('Ошибка подписки на push:', err);
    }
}

async function unsubscribeFromPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
        await fetch('http://localhost:3001/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
        console.log('Отписка выполнена');
    }
}

/**
 * Установка активной кнопки навигации.
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
 * Логика управления заметками (LocalStorage + CRUD + Sockets).
 */
function initNotes() {
    const form = document.getElementById('note-form');
    const input = document.getElementById('note-input');
    const list = document.getElementById('notes-list');

    if (!form || !input || !list) return;

    function loadNotes() {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        list.innerHTML = notes
            .map(note => {
                const text = typeof note === 'string' ? note : note.text;
                const completed = note.completed || false;
                const id = note.id || Date.now();
                
                return `
                    <li class="card ${completed ? 'completed' : ''}" style="margin-bottom: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 15px;">
                        <span style="cursor:pointer; text-decoration: ${completed ? 'line-through' : 'none'}; opacity: ${completed ? 0.6 : 1};" onclick="toggleNote(${id})">${text}</span>
                        <div style="float: right; opacity: 0.5;">
                            <button class="btn-icon" onclick="deleteNote(${id})">🗑️</button>
                        </div>
                    </li>
                `;
            }).join('');
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');
            notes.push({ id: Date.now(), text, completed: false });
            localStorage.setItem('notes', JSON.stringify(notes));
            
            // Отправляем событие на сервер
            socket.emit('newTask', { text, timestamp: Date.now() });
            
            input.value = '';
            loadNotes();
        }
    });

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
    notification.textContent = `🔔 Новая задача синхронизирована: ${task.text}`;
    notification.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: #4285f4; color: white; padding: 1rem;
        border-radius: 10px; z-index: 1000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out forwards;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in forwards';
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
        }
    });
}
