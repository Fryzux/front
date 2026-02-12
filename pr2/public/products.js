
const idInput = document.getElementById("product-id");
const nameInput = document.getElementById("product-name");
const priceInput = document.getElementById("product-price");
const listEl = document.getElementById("products-list");

const createBtn = document.getElementById("create-btn");
const updateBtn = document.getElementById("update-btn");
const deleteBtn = document.getElementById("delete-btn");

async function loadProducts() {
  const res = await fetch("/products");
  const products = await res.json();

  listEl.innerHTML = "";

  products.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="product-id">id: ${p.id}</span>
      ${p.name} — 
      <span class="product-price">${p.price} ₽</span>
    `;
    listEl.appendChild(li);
  });
}

createBtn.addEventListener("click", async () => {
  await fetch("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: nameInput.value,
      price: Number(priceInput.value)
    })
  });
  loadProducts();
});

updateBtn.addEventListener("click", async () => {
  await fetch(`/products/${idInput.value}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: nameInput.value,
      price: Number(priceInput.value)
    })
  });
  loadProducts();
});

deleteBtn.addEventListener("click", async () => {
  await fetch(`/products/${idInput.value}`, {
    method: "DELETE"
  });
  loadProducts();
});

loadProducts();
