import React, { useEffect, useState } from "react";
import "./UserModal.css";

export default function UserModal({ open, mode, initialUser, onClose, onSubmit }) {
    const [name, setName] = useState("");
    const [age, setAge] = useState("");

    useEffect(() => {
        if (!open) return;
        setName(initialUser?.name ?? "");
        setAge(initialUser?.age != null ? String(initialUser.age) : "");
    }, [open, initialUser]);

    if (!open) return null;

    const title = mode === "edit" ? "Редактирование пользователя" : "Создание пользователя";

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedName = name.trim();
        const parsedAge = Number(age);

        if (!trimmedName) {
            alert("Введите имя");
            return;
        }

        if (!Number.isFinite(parsedAge) || parsedAge <= 0) {
            alert("Введите корректный возраст");
            return;
        }

        onSubmit({
            id: initialUser?.id,
            name: trimmedName,
            age: parsedAge,
        });
    };

    return (
        <div className="backdrop" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="modal__header">
                    <div className="modal__title">{title}</div>
                    <button type="button" className="iconBtn" onClick={onClose} aria-label="Закрыть">
                        ✕
                    </button>
                </div>
                <form className="form" onSubmit={handleSubmit}>
                    <label className="label">
                        Имя
                        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                    </label>
                    <label className="label">
                        Возраст
                        <input className="input" value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" />
                    </label>

                    <div className="modal__footer">
                        <button type="button" className="btn" onClick={onClose}>
                            Отмена
                        </button>
                        <button type="submit" className="btn btn--primary">
                            {mode === "edit" ? "Сохранить" : "Создать"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
