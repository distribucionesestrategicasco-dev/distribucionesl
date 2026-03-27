/* ================================================
   catalog.js — Catálogo público 100% Supabase
   HTML compatible con catalog.css v5
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
      };
    });
    return window.PRODUCTS;
  } catch(e) {
    console.warn('catalog: error cargando de Supabase:', e);
    window.PRODUCTS = window.PRODUCTS || [];
    return window.PRODUCTS;
  }
}

// ── Generar HTML de una tarjeta ───────────────────
function buildProductCard(p) {
  // Sección imagen
  var imgSection = p.img
    ? '<div class="product-img">'
        + '<span class="product-cat-badge">' + p.cat + '</span>'
        + '<img class="product-photo" src="' + p.img + '" alt="' + p.name + '">'
      + '</div>'
    : '<div class="product-img">'
        + '<span class="product-cat-badge">' + p.cat + '</span>'
        + '<span class="product-emoji">' + (p.icon || '📦') + '</span>'
      + '</div>';

  // Precio
  var precioTxt = p.price > 0
    ? '$' + Math.round(p.price).toLocaleString('es-CO')
    : 'Precio a consultar';

  // Serializar objeto para onclick — escapar comillas simples
  var safeName = (p.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  var safeCat  = (p.cat  || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  var safeIcon = (p.icon || '📦').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  var safeImg  = (p.img  || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  var onclickData = "{"
    + "id:'" + p.id + "',"
    + "name:'" + safeName + "',"
    + "cat:'" + safeCat + "',"
    + "icon:'" + safeIcon + "',"
    + "price:" + (p.price || 0) + ","
    + "img:'" + safeImg + "'"
    + "}";

  return '<div class="product-card">'
    + imgSection
    + '<div class="product-info">'
      + '<h3 class="product-name">' + p.name + '</h3>'
      + '<div class="product-footer">'
        + '<span class="product-price">' + precioTxt + '</span>'
        + '<button class="add-btn" onclick="addToCart(' + onclickData + ')" title="Agregar al carrito">+</button>'
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
      var hay = (p.name + ' ' + p.cat).toLowerCase();
      if (hay.indexOf(search) === -1) return false;
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
