/* ================================================
   cart.js — Solo activo en index.html (tiene carrito)
   ================================================ */

// Guard: si no hay carrito en esta página, no hacer nada
function cartExists() {
  return !!document.getElementById('cart-panel');
}

/* ================================================
   cart.js — Carrito, cantidades y checkout
   ================================================ */

// ── Modificar carrito ─────────────────────────

function addToCart(id) {
  const product  = PRODUCTS.find(x => x.id === id);
  const existing = cart.find(x => x.id === id);

  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  // Actualizar tarjeta del catálogo (muestra controles − qty +)
  updateCardFooter(id);
  syncCartBadge();

  // Refrescar sidebar si está abierto
  if (document.getElementById('cart-panel').classList.contains('open')) {
    updateCartUI();
  }
}

function removeFromCart(id) {
  cart = cart.filter(x => x.id !== id);
  updateCardFooter(id);   // vuelve a mostrar solo el botón "+"
  updateCartUI();
  syncCartBadge();
}

function changeQty(id, delta) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(x => x.id !== id);
    updateCardFooter(id);
  } else {
    updateCardFooter(id);
  }
  updateCartUI();
  syncCartBadge();
}

// ── Badge del carrito ─────────────────────────

/** Actualiza solo el número del badge sin re-renderizar todo */
function syncCartBadge() {
  if (!cartExists()) return;
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cart-badge').textContent = total;
}

// ── Renderizar UI del carrito ─────────────────

function updateCartUI() {
  if (!cartExists()) return;
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cart-badge').textContent = totalItems;

  const list = document.getElementById('cart-items-list');

  if (cart.length === 0) {
    list.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <p>Tu pedido está vacío</p>
      </div>`;
  } else {
    list.innerHTML = cart.map(i => `
      <div class="cart-item">
        <div class="cart-item-icon">${i.icon}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${i.name}</div>
          <div class="cart-item-desc">${i.desc}</div>
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="changeQty(${i.id}, -1)">−</button>
            <span class="qty-num">${i.qty}</span>
            <button class="qty-btn" onclick="changeQty(${i.id}, +1)">+</button>
          </div>
        </div>
        <button class="remove-btn" onclick="removeFromCart(${i.id})">🗑</button>
      </div>
    `).join('');
  }

  document.getElementById('cart-sub').textContent  = 'A cotizar';
  document.getElementById('cart-iva').textContent   = '19%';
  document.getElementById('cart-total').textContent = `${totalItems} producto(s)`;
}

// ── Abrir / cerrar sidebar ────────────────────

function toggleCart() {
  if (!cartExists()) return;
  document.getElementById('cart-overlay').classList.toggle('open');
  document.getElementById('cart-panel').classList.toggle('open');
  updateCartUI();
}
