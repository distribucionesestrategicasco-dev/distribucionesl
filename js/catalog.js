/* ================================================
   catalog.js — Renderizado del catálogo y filtros
   ================================================ */

let catalogSearchQuery = '';

function catalogSearch(q) {
  catalogSearchQuery = q.toLowerCase().trim();
  renderCatalog();
}

function renderCatalog() {
  const grid     = document.getElementById('catalog-grid');
  let filtered = currentFilter === 'Todos'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.cat === currentFilter);

  if (catalogSearchQuery) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(catalogSearchQuery) ||
      p.cat.toLowerCase().includes(catalogSearchQuery)
    );
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card" id="card-${p.id}">
      <div class="product-img">
        <span class="product-cat-badge">${p.cat}</span>
        ${p.img
          ? `<img src="${p.img}" alt="${p.name}" class="product-photo" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''}
        <span class="product-emoji" ${p.img ? 'style="display:none"' : ''}>${p.icon}</span>
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="product-footer" id="card-footer-${p.id}">
          ${cardFooterHTML(p.id)}
        </div>
      </div>
    </div>
  `).join('');
}

/** Devuelve el HTML del footer de una tarjeta según si está en el carrito */
function cardFooterHTML(id) {
  const item = cart.find(x => x.id === id);

  if (!item) {
    // No está en el carrito → botón "+"
    return `
      <span class="product-price">Cotizar precio</span>
      <button class="add-btn" onclick="addToCart(${id})" title="Agregar al pedido">+</button>
    `;
  }

  // Ya está en el carrito → controles − cantidad +
  return `
    <span class="product-price">Cotizar precio</span>
    <div class="card-qty-ctrl">
      <button class="card-qty-btn card-qty-minus" onclick="cardChangeQty(${id}, -1)">−</button>
      <span class="card-qty-num">${item.qty}</span>
      <button class="card-qty-btn card-qty-plus" onclick="cardChangeQty(${id}, +1)">+</button>
    </div>
  `;
}

/** Actualiza solo el footer de una tarjeta (sin re-renderizar todo) */
function updateCardFooter(id) {
  const footer = document.getElementById('card-footer-' + id);
  if (footer) footer.innerHTML = cardFooterHTML(id);
}

function applyFilter(btn, cat) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = cat;
  renderCatalog();
}

function filterCatalog(cat) {
  showPage('catalog');
  currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.trim() === cat);
  });
  renderCatalog();
}

/** Cambia cantidad directamente desde la tarjeta del catálogo */
function cardChangeQty(id, delta) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(x => x.id !== id);
  }
  updateCardFooter(id);   // actualiza solo esa tarjeta
  syncCartBadge();        // actualiza el badge del carrito
  if (document.getElementById('cart-panel').classList.contains('open')) {
    updateCartUI();       // refresca sidebar si está abierto
  }
}
