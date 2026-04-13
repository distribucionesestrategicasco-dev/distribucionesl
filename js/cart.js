/* ================================================
   cart.js — Carrito, cantidades y checkout
   ================================================ */

function cartExists() {
  return !!document.getElementById('cart-panel');
}

// ── Modificar carrito ────────────────────────────
function addToCart(id) {
  const product  = (window.PRODUCTS || PRODUCTS).find(x => x.id === id);
  if (!product) return;
  const existing = cart.find(x => x.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push(Object.assign({}, product, { qty: 1 }));
  }
  updateCardFooter(id);
  syncCartBadge();
  if (document.getElementById('cart-panel').classList.contains('open')) {
    updateCartUI();
  }
}

function removeFromCart(id) {
  cart = cart.filter(x => x.id !== id);
  updateCardFooter(id);
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

// ── Badge del carrito ────────────────────────────
function syncCartBadge() {
  if (!cartExists()) return;
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cart-badge').textContent = total;
}

// ── Renderizar UI del carrito ────────────────────
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
          ${i.cat ? `<span class="cart-item-cat">${i.cat}</span>` : ''}
          <div class="cart-item-bottom">
            <div class="qty-ctrl">
              <button class="qty-btn" onclick="changeQty('${i.id}', -1)">−</button>
              <span class="qty-num">${i.qty}</span>
              <button class="qty-btn" onclick="changeQty('${i.id}', +1)">+</button>
            </div>
            <span class="cart-item-badge">Por cotizar</span>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${i.id}')" title="Eliminar">
          <span class="material-icons">close</span>
        </button>
      </div>
    `).join('');
  }

  document.getElementById('cart-sub').textContent   = 'A cotizar';
  document.getElementById('cart-iva').textContent   = '19%';
  document.getElementById('cart-total').textContent = `${totalItems} producto(s)`;
}

// ── Abrir / cerrar sidebar ───────────────────────
function toggleCart() {
  if (!cartExists()) return;
  document.getElementById('cart-overlay').classList.toggle('open');
  document.getElementById('cart-panel').classList.toggle('open');
  updateCartUI();
}
