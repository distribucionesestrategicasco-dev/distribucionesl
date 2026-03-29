/* ================================================
   catalog.js — Catálogo público 100% Supabase
   HTML compatible con catalog.css v5 + cart.js
   ================================================ */

const SUPA_URL_CAT  = 'https://jnxsofraqshxjboukiab.supabase.co';
const SUPA_ANON_CAT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';

var _currentCatFilter = 'Todos';
var _currentSearch    = '';

// ── Cargar productos de Supabase ──────────────────
async function loadProductsFromSupa() {
  try {
    const r = await fetch(
      SUPA_URL_CAT + '/rest/v1/productos?select=*&activo=eq.true&order=nombre.asc',
      { headers: { 'apikey': SUPA_ANON_CAT, 'Authorization': 'Bearer ' + SUPA_ANON_CAT } }
    );
    const prods = await r.json();
    window.PRODUCTS = prods.map(function(p) {
      return {
        id:     p.id,
        name:   p.nombre,
        cat:    p.categoria  || '',
        icon:   p.icono      || '📦',
        price:  p.precio_ref || 0,
        img:    p.imagen_url || null,
        activo: p.activo,
        desc:   p.categoria  || '',
      };
    });
    return window.PRODUCTS;
  } catch(e) {
    console.warn('catalog: error cargando de Supabase:', e);
    window.PRODUCTS = window.PRODUCTS || [];
    return window.PRODUCTS;
  }
}

// ── Footer de tarjeta: botón + o controles qty ────
// Llamado por cart.js (addToCart, removeFromCart, changeQty)
function updateCardFooter(id) {
  var footer = document.querySelector('[data-product-id="' + id + '"] .product-footer');
  if (!footer) return;

  var inCart = cart ? cart.find(function(x) { return x.id === id; }) : null;

  if (!inCart) {
    // Mostrar botón +
    footer.querySelector('.add-btn-wrap').innerHTML =
      '<button class="add-btn" onclick="addToCart(\'' + id + '\')" title="Agregar al carrito">+</button>';
  } else {
    // Mostrar controles − qty +
    footer.querySelector('.add-btn-wrap').innerHTML =
      '<div class="card-qty-ctrl">'
      + '<button class="card-qty-btn card-qty-minus" onclick="changeQty(\'' + id + '\',-1)">−</button>'
      + '<span class="card-qty-num">' + inCart.qty + '</span>'
      + '<button class="card-qty-btn card-qty-plus" onclick="changeQty(\'' + id + '\',+1)">+</button>'
      + '</div>';
  }
}

// ── Generar HTML de una tarjeta ───────────────────
function buildProductCard(p) {
  var imgSection = p.img
    ? '<div class="product-img">'
        + '<span class="product-cat-badge">' + p.cat + '</span>'
        + '<img class="product-photo" src="' + p.img + '" alt="' + p.name + '">'
      + '</div>'
    : '<div class="product-img">'
        + '<span class="product-cat-badge">' + p.cat + '</span>'
        + '<span class="product-emoji">' + (p.icon || '📦') + '</span>'
      + '</div>';

  var precioTxt = p.price > 0
    ? '$' + Math.round(p.price).toLocaleString('es-CO')
    : 'Precio a consultar';

  // Escapar comillas simples en el ID por si acaso
  var safeId = (p.id + '').replace(/'/g, "\\'");

  return '<div class="product-card" data-product-id="' + p.id + '">'
    + imgSection
    + '<div class="product-info">'
      + '<h3 class="product-name">' + p.name + '</h3>'
      + '<div class="product-footer">'
        + '<span class="product-price">' + precioTxt + '</span>'
        + '<div class="add-btn-wrap">'
          + '<button class="add-btn" onclick="addToCart(\'' + safeId + '\')" title="Agregar al carrito">+</button>'
        + '</div>'
      + '</div>'
    + '</div>'
    + '</div>';
}

// ── Renderizar grilla ─────────────────────────────
function renderCatalog() {
  var grid = document.getElementById('catalog-grid');
  if (!grid) return;

  var cat    = _currentCatFilter;
  var search = _currentSearch.toLowerCase().trim();

  if (!window.PRODUCTS || window.PRODUCTS.length === 0) {
    grid.innerHTML = '<div class="catalog-empty">'
      + '<div class="catalog-empty-icon">📦</div>'
      + '<h3>Cargando productos...</h3>'
      + '</div>';
    return;
  }

  var filtered = window.PRODUCTS.filter(function(p) {
    if (p.activo === false) return false;
    if (cat !== 'Todos' && p.cat !== cat) return false;
    if (search) {
      if ((p.name + ' ' + p.cat).toLowerCase().indexOf(search) === -1) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="catalog-empty">'
      + '<div class="catalog-empty-icon">🔍</div>'
      + '<h3>Sin resultados</h3>'
      + '<p>No hay productos en esta categoría.</p>'
      + '</div>';
    return;
  }

  grid.innerHTML = filtered.map(buildProductCard).join('');

  // Restaurar estado del carrito en las tarjetas visibles
  if (window.cart && window.cart.length > 0) {
    window.cart.forEach(function(item) { updateCardFooter(item.id); });
  }
}

// ── applyFilter — HTML usa onclick="applyFilter(this,'Oficina')" ──
function applyFilter(btn, cat) {
  _currentCatFilter = cat || 'Todos';
  document.querySelectorAll('.filter-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');
  renderCatalog();
}

// ── catalogSearch — HTML usa oninput="catalogSearch(this.value)" ──
function catalogSearch(val) {
  _currentSearch = val || '';
  renderCatalog();
}

// ── Init ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  loadProductsFromSupa().then(function() {
    renderCatalog();
  });
});
