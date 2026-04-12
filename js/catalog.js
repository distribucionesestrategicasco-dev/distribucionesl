/* ================================================
   catalog.js — Catálogo público 100% Supabase
   HTML compatible con catalog.css v5 + cart.js
================================================ */

const SUPA_URL_CAT  = 'https://jnxsofraqshxjboukiab.supabase.co';
const SUPA_ANON_CAT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';

var _currentCatFilter = 'Todos';
var _currentSearch    = '';

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
        id:    p.id,
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
  var footer = document.querySelector('[data-product-id="' + id + '"] .product-footer');
  if (!footer) return;
  var inCart = cart ? cart.find(function(x) { return x.id === id; }) : null;
  if (!inCart) {
    footer.querySelector('.add-btn-wrap').innerHTML =
      '<button class="add-btn" onclick="addToCart(\'' + id + '\')" title="Agregar al carrito">+</button>';
  } else {
    footer.querySelector('.add-btn-wrap').innerHTML =
      '<div class="card-qty-ctrl">' +
        '<button class="card-qty-btn card-qty-minus" onclick="changeQty(\'' + id + '\',-1)">−</button>' +
        '<span class="card-qty-num">' + inCart.qty + '</span>' +
        '<button class="card-qty-btn card-qty-plus" onclick="changeQty(\'' + id + '\',+1)">+</button>' +
      '</div>';
  }
}

// ── Hover zoom inline en la tarjeta ─────────────
// Se activa al pasar el mouse sobre la imagen (sin clic)
function _attachCardHoverZoom(card, mainImg) {
  var imgEl = card.querySelector('.product-photo');
  if (!imgEl) return;

  // Panel de zoom flotante
  var panel = document.createElement('div');
  panel.className = 'card-hover-zoom-panel';
  panel.style.cssText = [
    'position:fixed',
    'width:280px',
    'height:280px',
    'border:1px solid #ddd',
    'box-shadow:0 8px 32px rgba(0,0,0,0.22)',
    'border-radius:10px',
    'overflow:hidden',
    'background:#fff',
    'display:none',
    'z-index:8888',
    'pointer-events:none'
  ].join(';');

  var zoomImg = document.createElement('img');
  zoomImg.src = mainImg;
  zoomImg.style.cssText = 'position:absolute;transform-origin:top left;max-width:none;max-height:none';
  panel.appendChild(zoomImg);
  document.body.appendChild(panel);

  var lensW = 60, lensH = 60;

  function onMove(e) {
    var rect = imgEl.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;

    // Limitar lente dentro de la imagen
    x = Math.max(lensW / 2, Math.min(x, rect.width  - lensW / 2));
    y = Math.max(lensH / 2, Math.min(y, rect.height - lensH / 2));

    var lx = x - lensW / 2;
    var ly = y - lensH / 2;

    // Escala del zoom
    var rx = panel.offsetWidth  / lensW;
    var ry = panel.offsetHeight / lensH;

    zoomImg.style.width  = rect.width  * rx + 'px';
    zoomImg.style.height = rect.height * ry + 'px';
    zoomImg.style.left   = (-lx * rx) + 'px';
    zoomImg.style.top    = (-ly * ry) + 'px';

    // Posicionar panel siempre dentro del viewport
    var panW = 280, panH = 280, gap = 12;
    var posLeft, posTop;

    if (e.clientX + panW + gap < window.innerWidth) {
      posLeft = e.clientX + gap;
    } else {
      posLeft = e.clientX - panW - gap;
    }
    posTop = Math.max(8, Math.min(e.clientY - panH / 2, window.innerHeight - panH - 8));

    panel.style.left = posLeft + 'px';
    panel.style.top  = posTop  + 'px';
  }

  imgEl.addEventListener('mouseenter', function() {
    panel.style.display = 'block';
  });
  imgEl.addEventListener('mousemove', onMove);
  imgEl.addEventListener('mouseleave', function() {
    panel.style.display = 'none';
  });

  // Limpiar panel cuando la tarjeta sea reemplazada en el DOM
  card._zoomPanelCleanup = function() { panel.remove(); };
}

// ── Generar HTML de una tarjeta ──────────────────
function buildProductCard(p) {
  var imgs = (p.imgs && p.imgs.length > 0) ? p.imgs : (p.img ? [p.img] : []);
  var mainImg = imgs[0] || null;

  var imgSection;
  if (mainImg) {
    imgSection =
      '<div class="product-img" onclick="openProductModal(\'' + p.id + '\', event)" style="cursor:zoom-in">' +
        '<span class="product-cat-badge">' + p.cat + '</span>' +
        '<img class="product-photo" src="' + mainImg + '" alt="' + p.name + '" data-main-img="' + mainImg + '">' +
        '<div class="product-img-zoom-hint">🔍</div>' +
      '</div>';
  } else {
    imgSection =
      '<div class="product-img">' +
        '<span class="product-cat-badge">' + p.cat + '</span>' +
        '<span class="product-emoji">' + (p.icon || '📦') + '</span>' +
      '</div>';
  }

  var precioTxt = p.price > 0
    ? '$' + Math.round(p.price).toLocaleString('es-CO')
    : 'Precio a consultar';

  var safeId = (p.id + '').replace(/'/g, "\\'");

  return (
    '<div class="product-card" data-product-id="' + p.id + '" data-main-img="' + (mainImg || '') + '">' +
      imgSection +
      '<div class="product-info">' +
        '<h3 class="product-name">' + p.name + '</h3>' +
        '<div class="product-footer">' +
          '<span class="product-price">' + precioTxt + '</span>' +
          '<div class="add-btn-wrap">' +
            '<button class="add-btn" onclick="addToCart(\'' + safeId + '\')" title="Agregar al carrito">+</button>' +
          '</div>' +
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

// ── Lightbox simple ──────────────────────────────
function openImgLightbox(src, name) {
  var existing = document.getElementById('img-lightbox');
  if (existing) existing.remove();

  var lb = document.createElement('div');
  lb.id = 'img-lightbox';
  lb.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.85);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;cursor:zoom-out';
  lb.innerHTML = '<img src="' + src + '" alt="' + name + '" style="max-width:90vw;max-height:80vh;border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,0.5);object-fit:contain">';
  lb.addEventListener('click', function() { lb.remove(); });
  document.body.appendChild(lb);
}

// ── Modal estilo Amazon ──────────────────────────
// FIX: el modal se centra en el viewport actual (no hace scroll)
function openProductModal(id, evt) {
  var existing = document.getElementById('product-modal-amazon');
  if (existing) existing.remove();

  var p = (window.PRODUCTS || []).find(function(x){ return x.id === id; });
  if (!p) return;

  var imgs = (p.imgs && p.imgs.length > 0) ? p.imgs : (p.img ? [p.img] : []);
  var mainImg = imgs[0] || '';

  var thumbsHtml = imgs.map(function(url, i) {
    return '<img class="pma-thumb' + (i === 0 ? ' active' : '') + '" src="' + url +
      '" onclick="pmaSetImg(this,\'' + url.replace(/'/g,"\\'") + '\')">';
  }).join('');

  var precioTxt = p.price > 0
    ? '$' + Math.round(p.price).toLocaleString('es-CO') + ' COP'
    : 'Precio a consultar';

  var modal = document.createElement('div');
  modal.id = 'product-modal-amazon';
  // FIX: position:fixed para que siempre aparezca en la ventana visible, sin scroll
  modal.style.cssText = [
    'position:fixed',
    'inset:0',
    'height:100vh',
    'background:rgba(0,0,0,0.6)',
    'z-index:9999',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'padding:16px',
    'overflow-y:auto'        // scroll DENTRO del overlay si la pantalla es muy pequeña
  ].join(';');

  modal.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:100%;max-width:780px;display:flex;overflow:hidden;max-height:92vh;position:relative;flex-shrink:0">' +
      '<button onclick="document.getElementById(\'product-modal-amazon\').remove()" ' +
        'style="position:absolute;top:10px;right:10px;background:#eee;border:none;border-radius:50%;width:30px;height:30px;font-size:18px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center">×</button>' +

      // Columna de miniaturas
      '<div style="width:72px;background:#f8f8f8;border-right:1px solid #eee;display:flex;flex-direction:column;gap:8px;padding:12px 8px;overflow-y:auto;flex-shrink:0">' +
        thumbsHtml +
      '</div>' +

      // Columna imagen principal + zoom hover
      '<div id="pma-main-col" style="flex:1;position:relative;background:#fafafa;display:flex;align-items:center;justify-content:center;min-height:360px;overflow:hidden">' +
        '<img id="pma-main-img" src="' + mainImg + '" ' +
          'style="max-width:100%;max-height:420px;object-fit:contain;cursor:crosshair;display:block" ' +
          'onmousemove="pmaZoom(event)" onmouseleave="pmaHideZoom()" onmouseenter="pmaShowZoom()">' +
        '<div id="pma-lens" style="position:absolute;width:130px;height:130px;border:1.5px solid #1A3C5E;background:rgba(26,60,94,0.08);pointer-events:none;display:none;border-radius:4px"></div>' +
        '<div id="pma-zoom-result" style="position:fixed;width:280px;height:340px;border:1px solid #ddd;box-shadow:0 4px 20px rgba(0,0,0,0.15);border-radius:6px;overflow:hidden;background:#fff;display:none;z-index:10000">' +
          '<img id="pma-zoom-img" src="' + mainImg + '" style="position:absolute;transform-origin:top left">' +
        '</div>' +
      '</div>' +

      // Columna info
      '<div style="width:210px;padding:20px 16px;border-left:1px solid #eee;display:flex;flex-direction:column;gap:14px;flex-shrink:0;overflow-y:auto">' +
        '<div>' +
          '<p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">' + (p.cat || '') + '</p>' +
          '<p style="font-size:16px;font-weight:700;color:#1A3C5E;line-height:1.3">' + (p.name || '') + '</p>' +
        '</div>' +
        '<p style="font-size:22px;font-weight:800;color:#1A3C5E">' + precioTxt + '</p>' +
        '<span style="display:inline-block;background:#e8f5e9;color:#2e7d32;font-size:11px;padding:3px 10px;border-radius:20px;font-weight:500">En stock</span>' +
        '<div style="border-top:1px solid #eee;padding-top:12px">' +
          '<p style="font-size:12px;color:#888;margin-bottom:6px">Cantidad</p>' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<button onclick="pmaQty(-1)" style="width:30px;height:30px;border:1px solid #ddd;border-radius:6px;background:#f5f5f5;cursor:pointer;font-size:18px;line-height:1">−</button>' +
            '<span id="pma-qty" style="font-size:16px;font-weight:600;min-width:20px;text-align:center">1</span>' +
            '<button onclick="pmaQty(1)" style="width:30px;height:30px;border:1px solid #ddd;border-radius:6px;background:#f5f5f5;cursor:pointer;font-size:18px;line-height:1">+</button>' +
          '</div>' +
        '</div>' +
        '<button onclick="pmaAddCart(\'' + (p.id+'').replace(/'/g,"\\'") + '\')" ' +
          'style="background:#1A3C5E;color:#fff;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;width:100%">+ Agregar al carrito</button>' +
        '<p style="font-size:11px;color:#bbb;text-align:center">Hover sobre imagen para zoom</p>' +
      '</div>' +
    '</div>';

  // Cerrar al hacer clic en el fondo oscuro
  modal.addEventListener('click', function(e) { if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; } });
  window._modalScrollY = window.scrollY; window.scrollTo(0,0); document.body.appendChild(modal);

  window._pmaQty = 1;
}

function pmaSetImg(el, url) {
  document.querySelectorAll('.pma-thumb').forEach(function(t){ t.classList.remove('active'); });
  el.classList.add('active');
  document.getElementById('pma-main-img').src  = url;
  document.getElementById('pma-zoom-img').src   = url;
}

function pmaQty(d) {
  window._pmaQty = Math.max(1, (window._pmaQty || 1) + d);
  var el = document.getElementById('pma-qty');
  if (el) el.textContent = window._pmaQty;
}

function pmaAddCart(id) {
  var qty = window._pmaQty || 1;
  for (var i = 0; i < qty; i++) addToCart(id);
  document.getElementById('product-modal-amazon').remove();
}

function pmaShowZoom() {
  var l = document.getElementById('pma-lens');
  var z = document.getElementById('pma-zoom-result');
  if (l) l.style.display = 'block';
  if (z) z.style.display = 'block';
}

function pmaHideZoom() {
  var l = document.getElementById('pma-lens');
  var z = document.getElementById('pma-zoom-result');
  if (l) l.style.display = 'none';
  if (z) z.style.display = 'none';
}

function pmaZoom(e) {
  var img  = document.getElementById('pma-main-img');
  var lens = document.getElementById('pma-lens');
  var zr   = document.getElementById('pma-zoom-result');
  var zi   = document.getElementById('pma-zoom-img');
  if (!img || !lens || !zr || !zi) return;

  var rect = img.getBoundingClientRect();
  var lw = lens.offsetWidth, lh = lens.offsetHeight;

  var x = e.clientX - rect.left  - lw / 2;
  var y = e.clientY - rect.top   - lh / 2;
  x = Math.max(0, Math.min(x, rect.width  - lw));
  y = Math.max(0, Math.min(y, rect.height - lh));

  lens.style.left = (img.offsetLeft + x) + 'px';
  lens.style.top  = (img.offsetTop  + y) + 'px';

  // Posicionar panel fixed dentro del viewport
  var panelW = zr.offsetWidth  || 280;
  var panelH = zr.offsetHeight || 340;
  var gap    = 12;
  var posLeft, posTop;

  if (e.clientX + panelW + gap < window.innerWidth) {
    posLeft = rect.right + gap;
  } else {
    posLeft = rect.left - panelW - gap;
  }
  posTop = Math.max(8, Math.min(e.clientY - panelH / 2, window.innerHeight - panelH - 8));

  zr.style.left  = posLeft + 'px';
  zr.style.top   = posTop  + 'px';
  zr.style.right = 'auto';

  var rx = panelW / lw;
  var ry = panelH / lh;
  zi.style.width  = rect.width  * rx + 'px';
  zi.style.height = rect.height * ry + 'px';
  zi.style.left   = (-x * rx) + 'px';
  zi.style.top    = (-y * ry) + 'px';
}

// ── Init ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  loadProductsFromSupa().then(function() {
    renderCatalog();
  });
});