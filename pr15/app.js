/**
 * App Shell Architecture - Основной JS файл (pr15).
 * Обрабатывает динамическую навигацию и инициализацию логики страниц.
 */

const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');

/**
 * Установка активной кнопки навигации.
 */
function setActiveButton(activeId) {
    [homeBtn, aboutBtn].forEach(btn => btn.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
}

/**
 * Загрузка динамического контента страницы.
 * @param {string} page - имя страницы (home|about).
 */
async function loadContent(page) {
    try {
        // Загружаем HTML фрагмент
        const response = await fetch(`./content/${page}.html`);
        if (!response.ok) throw new Error('Ошибка загрузки страницы');
        
        const html = await response.text();
        contentDiv.innerHTML = html;
        
        // Если загружена главная, инициализируем заметки
        if (page === 'home') {
            initNotes();
        }
    } catch (err) {
        contentDiv.innerHTML = `<p class="is-center text-error">Ошибка загрузки страницы: ${err.message}</p>`;
        console.error(err);
    }
}

/**
 * Логика управления заметками (LocalStorage + CRUD).
 * Вызывается при загрузке home.html.
 */
function initNotes() {
    const form = document.getElementById('note-form');
    const input = document.getElementById('note-input');
    const list = document.getElementById('notes-list');

    if (!form || !input || !list) return;

    /**
     * Загрузка и рендеринг заметок.
     */
    function loadNotes() {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        list.innerHTML = notes
            .map(note => {
                // Поддержка старого и нового форматов
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

    /**
     * Сохранение новой заметки.
     */
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');
            notes.push({ id: Date.now(), text, completed: false });
            localStorage.setItem('notes', JSON.stringify(notes));
            input.value = '';
            loadNotes();
        }
    });

    // Экспонируем функции для инлайнового вызова в HTML
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

// Обработчики кликов по табам
homeBtn.addEventListener('click', () => {
    setActiveButton('home-btn');
    loadContent('home');
});

aboutBtn.addEventListener('click', () => {
    setActiveButton('about-btn');
    loadContent('about');
});

// Загружаем главную страницу при старте
document.addEventListener('DOMContentLoaded', () => {
    loadContent('home');
});

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const reg = await navigator.serviceWorker.register('./sw.js');
            console.log('✅ ServiceWorker registered:', reg.scope);
        } catch (err) {
            console.error('❌ ServiceWorker registration failed:', err);
        }
    });
}
