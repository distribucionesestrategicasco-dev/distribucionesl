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

  // El chip de usuario lo maneja admin-extras.js (avatar + nombre + rol)
  // Solo inicializar visibilidad de los links del sidebar

  var isAdmin = currentUser.rol === 'administrador';
  var perms   = currentUser.permisos || [];

  function canSee(mod) {
    return isAdmin || perms.includes(mod);
  }

  // Links con ID propio
  var usersLink = document.getElementById('sidebar-usuarios');
  if (usersLink) usersLink.style.display = canSee('usuarios') ? '' : 'none';

  var catLink = document.getElementById('sidebar-catalogo');
  if (catLink) catLink.style.display = canSee('catalogo') ? '' : 'none';

  // Links por selector de onclick (no tienen ID)
  [
    { sel: "a[onclick*=\"'pedidos'\"]",      mod: 'pedidos' },
    { sel: "a[onclick*=\"'cotizaciones'\"]", mod: 'cotizaciones' },
    { sel: "a[onclick*=\"'ordenes'\"]",      mod: 'ordenes' },
    { sel: "a[onclick*=\"'remisiones'\"]",   mod: 'remisiones' },
    { sel: "a[onclick*=\"'entregados'\"]",   mod: 'entregados' },
  ].forEach(function(item) {
    var el = document.querySelector('.admin-sidebar ' + item.sel);
    if (el) el.style.display = canSee(item.mod) ? '' : 'none';
  });
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

// ── Dark mode ────────────────────────────────
function initTheme() {
  // Detectar si es mobile
  var isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    // En mobile: forzar siempre modo claro
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('dlc-theme', 'light');
  } else {
    // En desktop: usar preferencia guardada o light por defecto
    var saved = localStorage.getItem('dlc-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
  }
}

function toggleDarkMode() {
  // No permitir cambio de tema en mobile
  var isMobile = window.innerWidth <= 768;
  if (isMobile) return;
  
  var current = document.documentElement.getAttribute('data-theme');
  var next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('dlc-theme', next);
}

// ── Arranque ──────────────────────────────────
window.addEventListener('DOMContentLoaded', function() {
  initTheme();
  // Restaurar sesion admin
  if (document.getElementById('page-admin-login')) {
    var saved = localStorage.getItem('dlc_session');
    if (saved) {
      try {
        var u = JSON.parse(saved);
        if (u && u.username) {
          window.currentUser = u;
          var lg = document.getElementById('page-admin-login');
          var pa = document.getElementById('page-admin');
          if (lg) { lg.style.display = 'none'; lg.classList.remove('active'); }
          if (pa) { pa.style.display = 'block'; pa.classList.add('active'); }
          if (typeof initAdminSidebar === 'function') initAdminSidebar();
          if (typeof renderAdminSection === 'function') renderAdminSection('dashboard');
          window.scrollTo(0, 0);
        }
      } catch(e) {}
    }
  }

  // Re-aplicar tema si cambia el tamaño de ventana (rotación, etc)
  window.addEventListener('resize', function() {
    var isMobile = window.innerWidth <= 768;
    if (isMobile) {
      // Si cambió a mobile, forzar light
      document.documentElement.setAttribute('data-theme', 'light');
    }
  });

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
  var SUPA_URL_TRACK  = 'https://jnxsofraqshxjboukiab.supabase.co';
  var SUPA_ANON_TRACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';

  var TRACKING_STEPS = [
    { key: 'pending',    label: 'Pedido Recibido',    icon: '\u{1F4CB}' },
    { key: 'quoted',     label: 'Cotizaci\xf3n Enviada', icon: '\u{1F4B0}' },
    { key: 'approved',   label: 'Orden Aprobada',     icon: '\u2705' },
    { key: 'dispatched', label: 'Pedido Despachado',  icon: '\u{1F69A}' },
    { key: 'delivered',  label: 'Entregado',          icon: '\u{1F4E6}' },
  ];

  var TRACKING_BADGE = {
    pending:    'badge-new',
    quoted:     'badge-quoted',
    approved:   'badge-approved',
    dispatched: 'badge-dispatched',
    delivered:  'badge-delivered',
  };

  var TRACKING_LABEL = {
    pending:    'Nuevo',
    quoted:     'Cotizado',
    approved:   'Aprobado',
    dispatched: 'Despachado',
    delivered:  'Entregado',
  };

  function _supaFetch(path, opts) {
    var h = Object.assign({
      'apikey': SUPA_ANON_TRACK,
      'Authorization': 'Bearer ' + SUPA_ANON_TRACK,
      'Content-Type': 'application/json',
    }, (opts || {}).extraHeaders || {});
    return fetch(SUPA_URL_TRACK + path, Object.assign({}, opts || {}, { headers: h }));
  }

  // ── Buscar pedido ────────────────────────────
  window.buscar = function() {
    var inp = document.getElementById('order-input');
    if (!inp) return;
    var val = inp.value.trim();
    if (!val) return;
    var res = document.getElementById('result');
    res.innerHTML = '<div class="loading"><div class="spinner"></div><p>Buscando...</p></div>';

    var id = val.toUpperCase();

    // Primero buscar por ID exacto
    _supaFetch('/rest/v1/pedidos?id=eq.' + encodeURIComponent(id) + '&select=*')
      .then(function(r) { return r.json(); })
      .then(function(rows) {
        if (rows && rows.length > 0) return rows;
        // Si no hay, buscar por cliente/empresa/nit
        return _supaFetch('/rest/v1/pedidos?select=*&order=created_at.desc')
          .then(function(r) { return r.json(); })
          .then(function(all) {
            var q = val.toLowerCase();
            return (all || []).filter(function(o) {
              return (o.client  || '').toLowerCase().includes(q) ||
                     (o.company || '').toLowerCase().includes(q) ||
                     (o.nit     || '').toLowerCase().includes(q);
            });
          });
      })
      .then(function(matches) {
        if (!matches || matches.length === 0) {
          res.innerHTML = '<div class="error"><div class="icon">\uD83D\uDD0D</div><p>No encontramos un pedido con ese dato.<br>Verifica el n\xfamero o nombre e intenta de nuevo.</p></div>';
          return;
        }
        // Mostrar lista si hay varios
        if (matches.length > 1) {
          res.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px">' +
            matches.map(function(o) {
              var safeO = encodeURIComponent(JSON.stringify(o));
              return '<div onclick="window._selectOrder(\'' + o.id + '\')"' +
                ' style="padding:14px 16px;border:1.5px solid var(--border-mid);border-radius:12px;cursor:pointer;background:var(--card-bg)">' +
                '<div style="font-weight:800;font-size:15px">' + o.id + '</div>' +
                '<div style="font-size:13px;color:var(--text-soft);margin-top:3px">' + (o.client || '') + (o.company ? ' \xb7 ' + o.company : '') + '</div>' +
                '<span class="badge ' + (TRACKING_BADGE[o.status] || 'badge-new') + '" style="margin-top:8px;display:inline-block">' + (TRACKING_LABEL[o.status] || o.status) + '</span>' +
                '</div>';
            }).join('') + '</div>';
          window._trackMatches = matches;
          return;
        }
        _loadAndRender(matches[0]);
      })
      .catch(function(e) {
        console.error(e);
        res.innerHTML = '<div class="error"><div class="icon">\u26A0\uFE0F</div><p>Error de conexi\xf3n. Int\xe9ntalo de nuevo.</p></div>';
      });
  };

  window._selectOrder = function(id) {
    var o = (window._trackMatches || []).find(function(x) { return x.id === id; });
    if (o) _loadAndRender(o);
  };

  function _loadAndRender(order) {
    // Cargar items
    _supaFetch('/rest/v1/pedido_items?pedido_id=eq.' + encodeURIComponent(order.id))
      .then(function(r) { return r.json(); })
      .then(function(items) {
        order._items = items || [];
        window.renderOrder(order);
      })
      .catch(function() {
        order._items = [];
        window.renderOrder(order);
      });
  }

  // ── Renderizar pedido ────────────────────────
  window.renderOrder = function(order) {
    if (!order) return;
    var res = document.getElementById('result');
    var st = order.status || 'pending';
    var badgeClass = TRACKING_BADGE[st] || 'badge-new';
    var badgeLabel = TRACKING_LABEL[st] || st;
    var currentIdx = TRACKING_STEPS.findIndex(function(s) { return s.key === st; });

    var stepsHTML = TRACKING_STEPS.map(function(s, i) {
      var done    = i <= currentIdx;
      var current = i === currentIdx;
      return '<div class="step">' +
        '<div class="step-icon' + (current ? ' current' : done ? ' done' : '') + '">' +
          (done && !current ? '\u2713' : s.icon) +
        '</div>' +
        '<div>' +
          '<div class="step-label' + (current ? ' current' : done ? ' done' : '') + '">' + s.label + '</div>' +
          (current ? '<div class="step-current-tag">\u25CF Estado actual</div>' : '') +
        '</div></div>';
    }).join('');

    // Items
    var itemsHTML = '';
    if (order._items && order._items.length > 0) {
      var hasPrice = order.total > 0;
      itemsHTML = '<div class="info-box" style="margin-top:12px">' +
        '<div class="info-row"><span class="lbl" style="font-weight:800">Productos solicitados</span></div>' +
        order._items.map(function(i) {
          return '<div class="info-row">' +
            '<span class="lbl">' + (i.icon || '\u{1F4E6}') + ' ' + i.name + '</span>' +
            '<span class="val">\xd7' + i.qty + (i.price > 0 ? ' \u2014 $' + Math.round(i.price * i.qty).toLocaleString('es-CO') : '') + '</span>' +
          '</div>';
        }).join('') +
        (hasPrice ?
          '<div class="info-row" style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px">' +
            '<span class="lbl">Subtotal</span><span class="val">$' + Math.round(order.subtotal || 0).toLocaleString('es-CO') + '</span></div>' +
          '<div class="info-row"><span class="lbl">IVA (19%)</span><span class="val">$' + Math.round(order.iva || 0).toLocaleString('es-CO') + '</span></div>' +
          '<div class="info-row"><span class="lbl" style="font-weight:800">Total</span>' +
            '<span class="val" style="font-weight:800;color:var(--brand-blue)">$' + Math.round(order.total).toLocaleString('es-CO') + '</span></div>'
        : '') +
      '</div>';
    }

    // Bot\xf3n aprobar — solo si est\xe1 cotizado
    var aprobarHTML = '';
    if (st === 'quoted') {
      aprobarHTML = '<div style="margin-top:20px;padding:20px;background:rgba(0,196,167,0.08);border:1.5px solid rgba(0,196,167,0.35);border-radius:14px;text-align:center">' +
        '<p style="font-size:14px;color:var(--text);margin-bottom:14px;font-weight:600">\u00bfApruebas esta cotizaci\xf3n?</p>' +
        '<button onclick="window.aprobarCotizacion(\'' + order.id + '\')"' +
          ' style="background:#00C4A7;color:#fff;border:none;padding:13px 32px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;width:100%;max-width:300px;transition:background 0.2s"' +
          ' onmouseover="this.style.background=\'#00A891\'" onmouseout="this.style.background=\'#00C4A7\'">' +
          '\u2705 Aprobar Cotizaci\xf3n' +
        '</button>' +
        '</div>';
    }

    res.innerHTML =
      '<div class="order-header">' +
        '<div>' +
          '<div class="order-id">' + order.id + '</div>' +
          '<div class="order-sub">' + (order.client || '') + (order.company ? ' \xb7 ' + order.company : '') + '</div>' +
        '</div>' +
        '<span class="badge ' + badgeClass + '">' + badgeLabel + '</span>' +
      '</div>' +
      '<div class="info-box">' +
        '<div class="info-row"><span class="lbl">Fecha del pedido</span><span class="val">' + (order.date || '\u2014').slice(0,10) + '</span></div>' +
        '<div class="info-row"><span class="lbl">Ciudad</span><span class="val">' + (order.city || '\u2014') + '</span></div>' +
      '</div>' +
      stepsHTML + itemsHTML + aprobarHTML;
  };

  // ── Aprobar cotizaci\xf3n ──────────────────────
  window.aprobarCotizacion = function(orderId) {
    if (!confirm('\u00bfConfirmas que apruebas la cotizaci\xf3n del pedido ' + orderId + '?')) return;
    var btn = document.querySelector('[onclick*="aprobarCotizacion"]');
    if (btn) { btn.disabled = true; btn.textContent = '\u23F3 Procesando...'; }

    _supaFetch('/rest/v1/pedidos?id=eq.' + encodeURIComponent(orderId), {
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved' }),
    })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return _supaFetch('/rest/v1/pedido_historial', {
        method: 'POST',
        body: JSON.stringify({
          pedido_id: orderId,
          estado:    'Aprobado',
          fecha:     new Date().toLocaleDateString('es-CO'),
          usuario:   'Cliente',
        }),
      });
    })
    .then(function() {
      document.getElementById('result').innerHTML =
        '<div style="text-align:center;padding:48px 20px">' +
          '<div style="font-size:60px;margin-bottom:20px">\u2705</div>' +
          '<h3 style="font-size:22px;font-weight:800;margin-bottom:10px">\u00a1Cotizaci\xf3n Aprobada!</h3>' +
          '<p style="color:var(--text-soft);font-size:15px;line-height:1.6">Tu pedido <strong>' + orderId + '</strong> ha sido aprobado.<br>Pronto procederemos con el despacho.</p>' +
          '<p style="color:var(--text-soft);font-size:13px;margin-top:20px">\uD83D\uDCDE \xbfTienes dudas? <strong>(57) 321 896 5745</strong></p>' +
        '</div>';
    })
    .catch(function(e) {
      console.error(e);
      if (btn) { btn.disabled = false; btn.textContent = '\u2705 Aprobar Cotizaci\xf3n'; }
      alert('Error al aprobar. Int\xe9ntalo de nuevo o cont\xe1ctanos por WhatsApp.');
    });
  };


  // Función para toggle del menú móvil
  window.toggleNav = function() {
  const menu = document.getElementById('nav-mobile-menu');
  const overlay = document.getElementById('nav-overlay');
  const btn = document.querySelector('.nav-hamburger');
  
  if (menu && overlay && btn) {
    menu.classList.toggle('open');     // ← cambiar de 'active' a 'open'
    overlay.classList.toggle('open');  // ← cambiar de 'active' a 'open'
    btn.classList.toggle('open');      // ← cambiar de 'active' a 'open'
  }
};



  // ── Auto-buscar si viene ?id=DIST-xxxx en URL ─
  document.addEventListener('DOMContentLoaded', function() {
    var id = new URLSearchParams(location.search).get('id');
    if (id && document.getElementById('order-input')) {
      document.getElementById('order-input').value = id;
      window.buscar();
    }
  });

})();