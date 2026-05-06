/**
 * Enhanced Note-taking Application logic and Service Worker registration.
 * Supports CRUD (Create, Read, Update, Delete) and inline editing.
 */

const form = document.getElementById('note-form');
const input = document.getElementById('note-input');
const list = document.getElementById('notes-list');

/**
 * Migrate old data structure (array of strings) to the new object format.
 */
function migrateNotes(notes) {
    return notes.map(note => {
        if (typeof note === 'string') {
            return { id: Date.now() + Math.random(), text: note, completed: false };
        }
        return note;
    });
}

/**
 * Load notes from LocalStorage and render them in the UI.
 */
function loadNotes() {
    const notesJson = localStorage.getItem('notes');
    let notes = JSON.parse(notesJson || '[]');
    
    // Migration check
    if (notes.length > 0 && typeof notes[0] === 'string') {
        notes = migrateNotes(notes);
        localStorage.setItem('notes', JSON.stringify(notes));
    }
    
    list.innerHTML = notes
        .map(note => `
            <li class="${note.completed ? 'completed' : ''}" data-id="${note.id}">
                <div class="note-view">
                    <span class="note-text" onclick="toggleNote(${note.id})">${note.text}</span>
                    <div class="note-actions">
                        <button class="btn-icon edit" onclick="startEdit(${note.id})" title="Изменить">✏️</button>
                        <button class="btn-icon delete" onclick="deleteNote(${note.id})" title="Удалить">🗑️</button>
                    </div>
                </div>
                <div class="note-edit hidden">
                    <input type="text" class="edit-input" value="${note.text}">
                    <div class="note-actions">
                        <button class="btn-icon save" onclick="saveEdit(${note.id})" title="Сохранить">💾</button>
                        <button class="btn-icon cancel" onclick="cancelEdit(${note.id})" title="Отмена">❌</button>
                    </div>
                </div>
            </li>
        `)
        .join('');
}

/**
 * Add a new note.
 */
function addNote(text) {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const newNote = {
        id: Date.now(),
        text: text,
        completed: false
    };
    
    notes.push(newNote);
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();
}

/**
 * Delete a note.
 */
function deleteNote(id) {
    let notes = JSON.parse(localStorage.getItem('notes') || '[]');
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();
}

/**
 * Toggle mark (completed).
 */
function toggleNote(id) {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const note = notes.find(n => n.id === id);
    if (note) {
        note.completed = !note.completed;
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
    }
}

/**
 * Inline Editing: Start
 */
function startEdit(id) {
    const li = document.querySelector(`li[data-id="${id}"]`);
    li.querySelector('.note-view').classList.add('hidden');
    li.querySelector('.note-edit').classList.remove('hidden');
    li.querySelector('.edit-input').focus();
}

/**
 * Inline Editing: Save
 */
function saveEdit(id) {
    const li = document.querySelector(`li[data-id="${id}"]`);
    const newText = li.querySelector('.edit-input').value.trim();
    
    if (newText) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const note = notes.find(n => n.id === id);
        if (note) {
            note.text = newText;
            localStorage.setItem('notes', JSON.stringify(notes));
            loadNotes();
        }
    } else {
        cancelEdit(id);
    }
}

/**
 * Inline Editing: Cancel
 */
function cancelEdit(id) {
    const li = document.querySelector(`li[data-id="${id}"]`);
    li.querySelector('.note-view').classList.remove('hidden');
    li.querySelector('.note-edit').classList.add('hidden');
}

// Global scope expose for inline event handlers
window.toggleNote = toggleNote;
window.deleteNote = deleteNote;
window.startEdit = startEdit;
window.saveEdit = saveEdit;
window.cancelEdit = cancelEdit;

/**
 * Event listener for form submission.
 */
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) {
        addNote(text);
        input.value = '';
        input.focus();
    }
});

// Handle Enter key for editing
list.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('edit-input') && e.key === 'Enter') {
        const id = parseInt(e.target.closest('li').dataset.id);
        saveEdit(id);
    } else if (e.target.classList.contains('edit-input') && e.key === 'Escape') {
        const id = parseInt(e.target.closest('li').dataset.id);
        cancelEdit(id);
    }
});

// Initial load
document.addEventListener('DOMContentLoaded', loadNotes);

// --- Service Worker Registration ---

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('✅ ServiceWorker registered:', registration.scope);
        } catch (err) {
            console.error('❌ ServiceWorker failed:', err);
        }
    });
}
