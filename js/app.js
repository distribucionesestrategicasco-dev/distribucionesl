/* ================================================
   app.js — Navegación, modales, tracking, dark mode
   v5 — Multi-página: cada sección es su propio HTML
   ================================================ */

// ── Navegación entre páginas ──────────────────
function showPage(page) {
  // Si estamos en acceso-interno.html, admin y admin-login se manejan localmente
  const isAdminPage = location.pathname.includes('acceso-interno');

  if (isAdminPage && (page === 'admin' || page === 'admin-login')) {
    ['page-admin-login', 'page-admin'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.classList.remove('active'); }
    });
    var targetId = page === 'admin' ? 'page-admin' : 'page-admin-login';
    var target = document.getElementById(targetId);
    if (target) {
      target.style.display = 'block';
      target.classList.add('active');
    }
    if (page === 'admin') initAdminSidebar();
    window.scrollTo(0, 0);
    return;
  }

  // Para el resto, redirigir al HTML correspondiente
  const map = {
    'home':     'index.html',
    'catalog':  'catalogo.html',
    'about':    'nosotros.html',
    'tracking': 'seguimiento.html',
    'admin':    'acceso-interno.html',
    'admin-login': 'acceso-interno.html',
  };
  if (map[page]) location.href = map[page];
}

// Filtrar catálogo desde otra página (ej: inicio → catalogo.html?cat=Oficina)
function filterCatalog(cat) {
  location.href = 'catalogo.html?cat=' + encodeURIComponent(cat);
}

// ── Admin sidebar ─────────────────────────────
// Solo activo en acceso-interno.html
function initAdminSidebar() {
  if (!window.currentUser) return;
  const info = document.getElementById('sidebar-user-info');
  if (info) {
    info.textContent = (currentUser.nombre || currentUser.username) +
      ' · ' + (ROLE_LABELS[currentUser.rol] || currentUser.rol);
  }
  const usersLink = document.getElementById('sidebar-usuarios');
  if (usersLink) {
    usersLink.style.display = currentUser.rol === 'administrador' ? 'flex' : 'none';
  }
  const catLink = document.getElementById('sidebar-catalogo');
  if (catLink) {
    catLink.style.display = currentUser.rol === 'administrador' ? 'flex' : 'none';
  }
}

function adminSection(section) {
  if (typeof renderAdminSection === 'function') renderAdminSection(section);
}

function cerrarSesion() {
  try { localStorage.removeItem('dlc_session'); } catch(e) {}
  window.currentUser = null;
  location.href = 'acceso-interno.html';
}

// ── Modales ───────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
});

// ── Atajos de teclado ─────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('admin-user')) {
    if (typeof doLogin === 'function') doLogin();
  }
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(function(m) {
      m.classList.remove('open');
    });
    const co = document.getElementById('cart-overlay');
    const cp = document.getElementById('cart-panel');
    if (co) co.classList.remove('open');
    if (cp) cp.classList.remove('open');
  }
});


// ── Arranque ──────────────────────────────────
window.addEventListener('DOMContentLoaded', function() {
  

  // Catálogo: renderizar si estamos en catalogo.html
  if (document.getElementById('catalog-grid')) {
    if (typeof renderCatalog === 'function') renderCatalog();
    if (typeof updateCartUI === 'function') updateCartUI();
    if (typeof syncCartBadge === 'function') syncCartBadge();

    // Aplicar filtro de categoría desde URL (?cat=Oficina)
    var params = new URLSearchParams(location.search);
    var cat = params.get('cat');
    if (cat) {
      var btns = document.querySelectorAll('.filter-btn');
      btns.forEach(function(b) { b.classList.remove('active'); });
      var target = Array.from(btns).find(function(b) {
        return b.textContent.trim() === cat;
      });
      if (target) {
        target.classList.add('active');
        if (typeof applyFilter === 'function') applyFilter(target, cat);
      }
    }
  }

  // Admin: verificar sesión si estamos en acceso-interno.html
  if (document.getElementById('page-admin-login')) {
    try {
      var saved = localStorage.getItem('dlc_session');
      if (saved) {
        var savedUser = JSON.parse(saved);
        if (savedUser && savedUser.username && savedUser.rol) {
          window.currentUser = savedUser;
          if (typeof showPageAdmin === 'function') {
            showPageAdmin('admin');
          } else {
            var login = document.getElementById('page-admin-login');
            var admin = document.getElementById('page-admin');
            if (login) login.style.display = 'none';
            if (admin) { admin.style.display = 'block'; admin.classList.add('active'); }
          }
          initAdminSidebar();
          if (typeof renderAdminSection === 'function') renderAdminSection('dashboard');
        } else {
          showPageAdmin('admin-login');
        }
      } else {
        showPageAdmin('admin-login');
      }
    } catch(e) {
      showPageAdmin('admin-login');
    }
  }
});

// Navegación interna del panel admin (login ↔ panel)
function showPageAdmin(page) {
  ['page-admin-login', 'page-admin'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.classList.remove('active'); }
  });
  var target = document.getElementById('page-' + page.replace('admin-login', 'admin-login'));
  if (!target) target = document.getElementById('page-' + page);
  if (target) { target.style.display = 'block'; target.classList.add('active'); }
}

// ── Tracking de pedidos ────────────────────────
(function() {
  var TRACKING_URL = 'https://script.google.com/macros/s/AKfycbxY_h2cYlBppEseH0xaVWwdaPyOnqGIL6qM0rxepg-JtckId87FrZpHwvil4Pykl3M4/exec';

  var TRACKING_STEPS = [
    { key: 'pending',    label: 'Pedido Recibido',    icon: '📋' },
    { key: 'quoted',     label: 'Cotización Enviada',  icon: '💰' },
    { key: 'approved',   label: 'Orden Aprobada',      icon: '✅' },
    { key: 'dispatched', label: 'Pedido Despachado',   icon: '🚚' },
  ];

  var TRACKING_STATUS_MAP = {
    'Pendiente': 'pending', 'Cotizado': 'quoted',
    'Aprobado': 'approved', 'Despachado': 'dispatched',
  };

  var TRACKING_BADGE = {
    pending: 'badge-pending', quoted: 'badge-quoted',
    approved: 'badge-approved', dispatched: 'badge-dispatched',
  };

  var TRACKING_LABEL = {
    pending: 'Nuevo', quoted: 'Cotizado',
    approved: 'Aprobado', dispatched: 'Despachado',
  };

  window.buscar = function() {
    var inp = document.getElementById('order-input');
    if (!inp) return;
    var id  = inp.value.trim();
    if (!id) return;
    var res = document.getElementById('result');
    var q   = id.toLowerCase();

    res.innerHTML = '<div class="loading"><div class="spinner"></div><p>Buscando...</p></div>';

    fetch(TRACKING_URL + '?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(data) {
        window._trackingData = data;
        var matches = data.orders.filter(function(o) {
          return o.id.toUpperCase() === id.toUpperCase() ||
                 (o.client  || '').toLowerCase().includes(q) ||
                 (o.company || '').toLowerCase().includes(q) ||
                 (o.nit     || '').toLowerCase().includes(q);
        });
        if (matches.length === 0) {
          res.innerHTML = '<div class="error"><div class="icon">🔍</div><p>No encontramos un pedido con ese dato.<br>Verifica el número o nombre e intenta de nuevo.</p></div>';
          return;
        }
        if (matches.length > 1) {
          res.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px;">'
            + matches.map(function(o) {
                var st = TRACKING_STATUS_MAP[o.status] || o.status;
                return '<div onclick="renderOrder(window._trackingData.orders.find(function(x){return x.id===\'' + o.id + '\'})) "'
                  + ' style="padding:14px 16px;border:1.5px solid var(--border-mid);border-radius:12px;cursor:pointer;background:var(--card-bg);transition:border-color 0.2s;"'
                  + ' onmouseover="this.style.borderColor=\'var(--brand-cyan)\'" onmouseout="this.style.borderColor=\'var(--border-mid)\'">'
                  + '<div style="font-weight:800;font-size:15px;color:var(--text);">' + o.id + '</div>'
                  + '<div style="font-size:13px;color:var(--text-soft);margin-top:3px;">' + (o.client || '') + (o.company ? ' · ' + o.company : '') + '</div>'
                  + '<span class="badge ' + (TRACKING_BADGE[st] || 'badge-pending') + '" style="margin-top:8px;display:inline-block;">'
                  + (TRACKING_LABEL[st] || st) + '</span>'
                  + '</div>';
              }).join('')
            + '</div>';
          return;
        }
        window.renderOrder(matches[0]);
      })
      .catch(function() {
        res.innerHTML = '<div class="error"><div class="icon">⚠️</div><p>Error de conexión. Inténtalo de nuevo.</p></div>';
      });
  };

  window.renderOrder = function(order) {
    if (!order) return;
    var res = document.getElementById('result');
    var st = TRACKING_STATUS_MAP[order.status] || order.status;
    var badgeClass = TRACKING_BADGE[st] || 'badge-pending';
    var badgeLabel = TRACKING_LABEL[st] || st;
    var currentIdx = TRACKING_STEPS.findIndex(function(s) { return s.key === st; });

    var stepsHTML = TRACKING_STEPS.map(function(s, i) {
      var done    = i <= currentIdx;
      var current = i === currentIdx;
      return '<div class="step">'
        + '<div class="step-icon' + (current ? ' current' : done ? ' done' : '') + '">'
        + (done && !current ? '✓' : s.icon) + '</div>'
        + '<div>'
        + '<div class="step-label' + (current ? ' current' : done ? ' done' : '') + '">' + s.label + '</div>'
        + (current ? '<div class="step-current-tag">● Estado actual</div>' : '')
        + '</div></div>';
    }).join('');

    res.innerHTML =
      '<div class="order-header">'
      + '<div><div class="order-id">' + order.id + '</div>'
      + '<div class="order-sub">' + (order.client || order.cliente || '') + (order.company || order.empresa ? ' · ' + (order.company || order.empresa) : '') + '</div></div>'
      + '<span class="badge ' + badgeClass + '">' + badgeLabel + '</span>'
      + '</div>'
      + '<div class="info-box">'
      + '<div class="info-row"><span class="lbl">Fecha del pedido</span><span class="val">' + (order.date || order.fecha || '—').slice(0,10) + '</span></div>'
      + '<div class="info-row"><span class="lbl">Ciudad</span><span class="val">' + (order.city || order.ciudad || '—') + '</span></div>'
      + '</div>'
      + stepsHTML;
  };

  // Auto-buscar si hay ID en URL (?id=DIST-xxxx)
  document.addEventListener('DOMContentLoaded', function() {
    var params = new URLSearchParams(location.search);
    var id = params.get('id');
    if (id && document.getElementById('order-input')) {
      document.getElementById('order-input').value = id;
      window.buscar();
    }
  });
})();
