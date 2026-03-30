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
          <div class="cart-item-desc">${i.cat || ''}</div>
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="changeQty('${i.id}', -1)">−</button>
            <span class="qty-num">${i.qty}</span>
            <button class="qty-btn" onclick="changeQty('${i.id}', +1)">+</button>
          </div>
        </div>
        <button onclick="removeFromCart('${i.id}')" title="Eliminar" style="background:none;border:none;cursor:pointer;padding:4px;color:#9CA3AF;display:flex;align-items:flex-start;flex-shrink:0;transition:color 0.2s" onmouseover="this.style.color='#EF4444'" onmouseout="this.style.color='#9CA3AF'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"></path>
            <path d="M10 11v6M14 11v6"></path>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"></path>
          </svg>
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
