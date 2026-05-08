/* ================================================
   catalog.js — Catálogo público 100% Supabase
   HTML compatible con catalog.css v5 + cart.js
================================================ */

const SUPA_URL_CAT  = 'https://jnxsofraqshxjboukiab.supabase.co';
const SUPA_ANON_CAT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';

var _currentCatFilter = 'Todos';
var _currentSearch    = '';
var _inlineQty        = 1;

// ── Cargar productos de Supabase ─────────────────
async function loadProductsFromSupa() {
  try {
    const r = await fetch(
      SUPA_URL_CAT + '/rest/v1/productos?select=*&activo=eq.true&order=nombre.asc',
      { headers: { 'apikey': SUPA_ANON_CAT, 'Authorization': 'Bearer ' + SUPA_ANON_CAT } }
    );
    const prods = await r.json();
    window.PRODUCTS = prods.map(function(p) {
      return {
        id:    String(p.id),
        name:  p.nombre,
        cat:   p.categoria || '',
        icon:  p.icono || '📦',
        price: p.precio_ref || 0,
        img:   p.imagen_url || null,
        imgs:  p.imagenes || [],
        activo: p.activo,
        desc:  p.categoria || '',
      };
    });
    return window.PRODUCTS;
  } catch(e) {
    console.warn('catalog: error cargando de Supabase:', e);
    window.PRODUCTS = window.PRODUCTS || [];
    return window.PRODUCTS;
  }
}

// ── Footer de tarjeta: botón + o controles qty ───
function updateCardFooter(id) {
  var wrap = document.querySelector('[data-product-id="' + id + '"] .add-btn-wrap');
  if (!wrap) return;
  var inCart = cart ? cart.find(function(x) { return x.id === id; }) : null;
  if (!inCart) {
    wrap.innerHTML =
      '<button class="add-btn" onclick="addToCart(\'' + id + '\')">Agregar al carrito</button>';
  } else {
    wrap.innerHTML =
      '<div class="card-qty-ctrl">' +
        '<button class="card-qty-btn card-qty-minus" onclick="changeQty(\'' + id + '\',-1)">−</button>' +
        '<span class="card-qty-num">' + inCart.qty + '</span>' +
        '<button class="card-qty-btn card-qty-plus" onclick="changeQty(\'' + id + '\',+1)">+</button>' +
      '</div>';
  }
}

// ── Generar HTML de una tarjeta ──────────────────
function buildProductCard(p) {
  var imgs    = (p.imgs && p.imgs.length > 0) ? p.imgs : (p.img ? [p.img] : []);
  var mainImg = imgs[0] || null;
  var safeId  = (p.id + '').replace(/'/g, "\\'");

  var precioTxt = p.price > 0
    ? '$\u00a0' + Math.round(p.price).toLocaleString('es-CO')
    : 'Precio a consultar';

  var imgHtml = mainImg
    ? '<img class="product-photo" src="' + mainImg + '" alt="' + p.name + '">'
    : '<span class="product-emoji">' + (p.icon || '📦') + '</span>';

  return (
    '<div class="product-card" data-product-id="' + p.id + '" data-main-img="' + (mainImg || '') + '">' +
      '<div class="product-img" onclick="openProductInline(\'' + safeId + '\')">' +
        imgHtml +
      '</div>' +
      '<div class="product-info">' +
        '<p class="product-cat">' + p.cat + '</p>' +
        '<h3 class="product-name">' + p.name + '</h3>' +
        '<p class="product-price">' + precioTxt + '</p>' +
        '<p class="product-shipping">' +
          '<span class="material-icons" style="font-size:13px;vertical-align:-2px">local_shipping</span>' +
          ' Envío a todo Colombia' +
        '</p>' +
        '<div class="add-btn-wrap">' +
          '<button class="add-btn" onclick="addToCart(\'' + safeId + '\')">Agregar al carrito</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

// ── Renderizar grilla ────────────────────────────
function renderCatalog() {
  var grid = document.getElementById('catalog-grid');
  if (!grid) return;

  var cat    = _currentCatFilter;
  var search = _currentSearch.toLowerCase().trim();

  if (!window.PRODUCTS || window.PRODUCTS.length === 0) {
    grid.innerHTML =
      '<div class="catalog-empty">' +
        '<div class="catalog-empty-icon">📦</div>' +
        '<h3>Cargando productos...</h3>' +
      '</div>';
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
    grid.innerHTML =
      '<div class="catalog-empty">' +
        '<div class="catalog-empty-icon">🔍</div>' +
        '<h3>Sin resultados</h3>' +
        '<p>No hay productos en esta categoría.</p>' +
      '</div>';
    return;
  }

  grid.innerHTML = filtered.map(buildProductCard).join('');

  // Restaurar estado del carrito en las tarjetas visibles
  if (window.cart && window.cart.length > 0) {
    window.cart.forEach(function(item) { updateCardFooter(item.id); });
  }
}

// ── applyFilter ──────────────────────────────────
function applyFilter(btn, cat) {
  _currentCatFilter = cat || 'Todos';
  document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderCatalog();
}

// ── catalogSearch ────────────────────────────────
function catalogSearch(val) {
  _currentSearch = val || '';
  renderCatalog();
}

// ── Cambiar imagen principal en tarjeta ──────────
function setMainImg(thumb, url) {
  var card = thumb.closest('.product-card');
  if (!card) return;
  card.querySelector('.product-photo').src = url;
  card.querySelectorAll('.product-thumb').forEach(function(t) { t.classList.remove('active'); });
  thumb.classList.add('active');
}

// ── Cerrar panel ─────────────────────────────────
function _closePilPanel() {
  var overlay = document.getElementById('pil-overlay');
  if (overlay) overlay.remove();
  document.documentElement.style.overflow = '';
  pmaHideZoom();
}

// ── Página de producto (overlay full-screen) ─────
function openProductInline(id) {
  _closePilPanel();

  var p = (window.PRODUCTS || []).find(function(x){ return x.id === id; });
  if (!p) return;

  var imgs = (p.imgs && p.imgs.length > 0) ? p.imgs : (p.img ? [p.img] : []);
  var mainImg = imgs[0] || '';

  var thumbsHtml = imgs.map(function(url, i) {
    return '<button class="pil-thumb' + (i === 0 ? ' active' : '') + '" onclick="pmaSetImg(this,\'' + url.replace(/'/g, "\\'") + '\')">' +
      '<img src="' + url + '">' +
    '</button>';
  }).join('');

  var precioTxt = p.price > 0
    ? '$' + Math.round(p.price).toLocaleString('es-CO') + ' COP'
    : 'Precio a consultar';

  var safeId = (p.id + '').replace(/'/g, "\\'");

  // Overlay de fondo
  var overlay = document.createElement('div');
  overlay.id   = 'pil-overlay';
  overlay.addEventListener('click', _closePilPanel);

  // Panel principal
  var panel = document.createElement('div');
  panel.id = 'product-inline-panel';
  panel.setAttribute('data-open-id', String(id));

  panel.innerHTML =
    // Botón cerrar
    '<button class="pil-close-btn" onclick="_closePilPanel()" aria-label="Cerrar">' +
      '<span class="material-icons">close</span>' +
    '</button>' +

    // Galería izquierda
    '<div class="pil-gallery">' +
      '<div class="pil-thumbs-col">' + thumbsHtml + '</div>' +
      '<div class="pil-main-img-wrap" id="pma-main-col">' +
        '<img id="pma-main-img" src="' + mainImg + '" alt="' + p.name + '"' +
          ' onmousemove="pmaZoom(event)" onmouseleave="pmaHideZoom()" onmouseenter="pmaShowZoom()">' +
        '<div id="pma-lens"></div>' +
      '</div>' +
    '</div>' +

    '<div id="pma-zoom-result"><img id="pma-zoom-img" src="' + mainImg + '"></div>' +

    // Info derecha
    '<div class="pil-info">' +
      '<p class="pil-cat">' + (p.cat || '') + '</p>' +
      '<h1 class="pil-name">' + (p.name || '') + '</h1>' +
      '<p class="pil-price">' + precioTxt + '</p>' +
      '<p class="pil-stock"><span class="pil-stock-dot"></span>En stock</p>' +
      '<div class="pil-sep"></div>' +
      '<p class="pil-qty-label">Cantidad</p>' +
      '<div class="pil-qty-row">' +
        '<button class="pil-qty-btn" onclick="pmaQty(-1)">−</button>' +
        '<span id="pma-qty">1</span>' +
        '<button class="pil-qty-btn" onclick="pmaQty(1)">+</button>' +
      '</div>' +
      '<div class="pil-sep"></div>' +
      '<button class="pil-add-btn" onclick="pmaAddCart(\'' + safeId + '\')">Agregar al carrito</button>' +
      '<button class="pil-quote-btn" onclick="openOrderForm();_closePilPanel()">Solicitar cotización</button>' +
      '<div class="pil-sep"></div>' +
      '<ul class="pil-features">' +
        '<li><span class="material-icons">local_shipping</span>Envío a toda Colombia</li>' +
        '<li><span class="material-icons">verified_user</span>Garantía de calidad</li>' +
        '<li><span class="material-icons">headset_mic</span>Soporte personalizado</li>' +
      '</ul>' +
    '</div>';

  panel.addEventListener('click', function(e) { e.stopPropagation(); });
  overlay.appendChild(panel);
  document.documentElement.appendChild(overlay);
  document.documentElement.style.overflow = 'hidden';

  _inlineQty = 1;
}

// ── Cambiar imagen en el panel ───────────────────
function pmaSetImg(el, url) {
  document.querySelectorAll('.pma-thumb').forEach(function(t){ t.classList.remove('active'); });
  el.classList.add('active');
  var mi = document.getElementById('pma-main-img');
  var zi = document.getElementById('pma-zoom-img');
  if (mi) mi.src = url;
  if (zi) zi.src = url;
}

// ── Cantidad en el panel ─────────────────────────
function pmaQty(d) {
  _inlineQty = Math.max(1, _inlineQty + d);
  var el = document.getElementById('pma-qty');
  if (el) el.textContent = _inlineQty;
}

// ── Agregar al carrito desde el panel ───────────
function pmaAddCart(id) {
  for (var i = 0; i < _inlineQty; i++) addToCart(id);
  _closePilPanel();
}

// ── Zoom ─────────────────────────────────────────
function pmaShowZoom() {
  var lens = document.getElementById('pma-lens');
  var zr   = document.getElementById('pma-zoom-result');
  if (lens) lens.style.display = 'block';
  if (zr)   zr.style.display   = 'block';
}

function pmaHideZoom() {
  var lens = document.getElementById('pma-lens');
  var zr   = document.getElementById('pma-zoom-result');
  if (lens) lens.style.display = 'none';
  if (zr)   zr.style.display   = 'none';
}

function pmaZoom(e) {
  var img  = document.getElementById('pma-main-img');
  var col  = document.getElementById('pma-main-col');
  var lens = document.getElementById('pma-lens');
  var zr   = document.getElementById('pma-zoom-result');
  var zi   = document.getElementById('pma-zoom-img');
  if (!img || !col || !lens || !zr || !zi) return;

  var imgR = img.getBoundingClientRect();
  var colR = col.getBoundingClientRect();
  var lw = lens.offsetWidth  || 100;
  var lh = lens.offsetHeight || 100;

  // Posición del mouse relativa a la imagen real (no el contenedor)
  var mx = e.clientX - imgR.left;
  var my = e.clientY - imgR.top;

  // Limitar la lente dentro de la imagen
  var lx = Math.max(0, Math.min(mx - lw / 2, imgR.width  - lw));
  var ly = Math.max(0, Math.min(my - lh / 2, imgR.height - lh));

  // Convertir a coordenadas del contenedor (col) para posicionar la lente (position:absolute en col)
  var lensLeft = (imgR.left - colR.left) + lx;
  var lensTop  = (imgR.top  - colR.top)  + ly;
  lens.style.left = lensLeft + 'px';
  lens.style.top  = lensTop  + 'px';

  // Panel de zoom — fixed, aparece al lado derecho del panel de imagen
  var zW = 300, zH = 360, gap = 14;
  var posLeft = (colR.right + gap + zW < window.innerWidth)
    ? colR.right + gap
    : colR.left - zW - gap;
  var posTop = Math.max(8, Math.min(e.clientY - zH / 2, window.innerHeight - zH - 8));

  zr.style.left = posLeft + 'px';
  zr.style.top  = posTop  + 'px';

  // Escalar la imagen de zoom
  var rx = zW / lw;
  var ry = zH / lh;
  zi.style.width  = imgR.width  * rx + 'px';
  zi.style.height = imgR.height * ry + 'px';
  zi.style.left   = -(lx * rx) + 'px';
  zi.style.top    = -(ly * ry) + 'px';
}

// ── Init ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  loadProductsFromSupa().then(function() {
    renderCatalog();
  });
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') _closePilPanel();
});