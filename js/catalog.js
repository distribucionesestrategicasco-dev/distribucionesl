/* ================================================
   catalog.js — Catálogo público
   Lee de Supabase tabla `productos`
   ================================================ */

const SUPA_URL_CAT  = 'https://jnxsofraqshxjboukiab.supabase.co';
const SUPA_ANON_CAT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';

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
        id:     p.id,
        name:   p.nombre,
        cat:    p.categoria,
        icon:   p.icono    || '📦',
        price:  p.precio_ref || 0,
        img:    p.imagen_url || null,
        activo: p.activo,
      };
    });
    return window.PRODUCTS;
  } catch(e) {
    console.warn('catalog loadProducts falló:', e);
    window.PRODUCTS = window.PRODUCTS || [];
    return window.PRODUCTS;
  }
}

// ── Renderizar catálogo ──────────────────────────
function renderCatalog() {
  const grid   = document.getElementById('catalog-grid');
  const search = (document.getElementById('catalog-search-input')?.value || '').toLowerCase().trim();
  const cat    = window.currentCatFilter || 'Todos';

  if (!grid) return;
  if (!window.PRODUCTS || window.PRODUCTS.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-soft);padding:40px">Cargando productos...</p>';
    return;
  }

  const filtered = window.PRODUCTS.filter(function(p) {
    if (p.activo === false) return false;
    if (cat !== 'Todos' && p.cat !== cat) return false;
    if (search && !p.name.toLowerCase().includes(search) && !(p.cat||'').toLowerCase().includes(search)) return false;
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-soft);padding:40px">No hay productos en esta categoría.</p>';
    return;
  }

  grid.innerHTML = filtered.map(function(p) {
    const img = p.img
      ? '<img src="' + p.img + '" alt="' + p.name + '" style="width:100%;height:140px;object-fit:contain;border-radius:8px;margin-bottom:10px">'
      : '<div style="font-size:48px;text-align:center;padding:20px 0">' + (p.icon || '📦') + '</div>';
    return '<div class="product-card">'
      + img
      + '<div class="product-info">'
      + '<h3 class="product-name">' + p.name + '</h3>'
      + '<p class="product-cat">' + (p.cat || '') + '</p>'
      + '</div>'
      + '<button class="add-to-cart-btn" onclick="addToCart(' + JSON.stringify(p).replace(/"/g, '&quot;') + ')">'
      + '🛒 Agregar</button>'
      + '</div>';
  }).join('');
}

// ── Filtrar por categoría ────────────────────────
function filterCatalogCat(cat) {
  window.currentCatFilter = cat;
  // Actualizar botones activos
  document.querySelectorAll('.cat-filter-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });
  renderCatalog();
}

// ── Búsqueda ─────────────────────────────────────
function searchCatalog() {
  renderCatalog();
}

// ── Inicializar al cargar la página ──────────────
document.addEventListener('DOMContentLoaded', function() {
  // Leer filtro de URL (?cat=Papelería)
  const params = new URLSearchParams(window.location.search);
  window.currentCatFilter = params.get('cat') || 'Todos';

  // Marcar botón activo si viene con cat en URL
  setTimeout(function() {
    document.querySelectorAll('.cat-filter-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.cat === window.currentCatFilter);
    });
  }, 100);

  // Cargar productos y renderizar
  loadProductsFromSupa().then(function() {
    renderCatalog();
  });
});
