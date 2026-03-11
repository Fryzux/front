import React, { useEffect, useState } from "react";
import "./ProductModal.css";

export default function ProductModal({ open, mode, initialProduct, onClose, onSubmit }) {
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [stock, setStock] = useState("");
    const [image, setImage] = useState("");

    useEffect(() => {
        if (!open) return;
        setName(initialProduct?.name ?? "");
        setCategory(initialProduct?.category ?? "");
        setDescription(initialProduct?.description ?? "");
        setPrice(initialProduct?.price != null ? String(initialProduct.price) : "");
        setStock(initialProduct?.stock != null ? String(initialProduct.stock) : "");
        setImage(initialProduct?.image ?? "");
    }, [open, initialProduct]);

    if (!open) return null;

    const title = mode === "edit" ? "Редактирование товара" : "Создание товара";

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedName = name.trim();
        const parsedPrice = Number(price);
        const parsedStock = Number(stock);

        if (!trimmedName) {
            alert("Введите название");
            return;
        }

        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
            alert("Введите корректную цену");
            return;
        }

        if (!Number.isFinite(parsedStock) || parsedStock < 0) {
            alert("Введите корректное количество");
            return;
        }

        onSubmit({
            id: initialProduct?.id,
            name: trimmedName,
            category: category.trim(),
            description: description.trim(),
            price: parsedPrice,
            stock: parsedStock,
            image: image.trim(),
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
                        Название
                        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                    </label>
                    <label className="label">
                        Категория
                        <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
                    </label>
                    <label className="label">
                        Описание
                        <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" />
                    </label>
                    <label className="label">
                        Цена
                        <input className="input" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
                    </label>
                    <label className="label">
                        В наличии
                        <input className="input" value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" />
                    </label>
                    <label className="label">
                        Картинка (URL)
                        <input className="input" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
                    </label>
                    {image && <img src={image} alt="Preview" className="image-preview" onError={(e) => e.target.style.display = 'none'} onLoad={(e) => e.target.style.display = 'block'} />}

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
