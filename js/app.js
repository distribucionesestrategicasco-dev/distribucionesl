/* ================================================
   app.js — Navegación, modales, tracking, dark mode
   v5 — Multi-página: cada sección es su propio HTML
   ================================================ */

// ── URLs limpias ──────────────────────────────
// El sitio usa rutas sin .html (/catalogo, /nosotros...). Si alguien llega
// por un enlace antiguo con .html, se limpia la barra de direcciones sin
// recargar la página. El <link rel="canonical"> ya evita contenido duplicado.
(function limpiarUrl() {
  var p = location.pathname;
  if (!/\.html$/i.test(p) || !window.history || !history.replaceState) return;
  var limpia = /\/index\.html$/i.test(p)
    ? p.replace(/\/index\.html$/i, '/')
    : p.replace(/\.html$/i, '');
  try { history.replaceState(null, '', limpia + location.search + location.hash); } catch (e) {}
})();

// ── Navegación entre páginas ──────────────────
function showPage(page) {
  // Si estamos en /acceso-interno, admin y admin-login se manejan localmente
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

  // Para el resto, redirigir a la página correspondiente (URLs sin .html)
  const map = {
    'home':     '/',
    'catalog':  '/catalogo',
    'about':    '/nosotros',
    'tracking': '/seguimiento',
    'admin':    '/acceso-interno',
    'admin-login': '/acceso-interno',
  };
  if (map[page]) location.href = map[page];
}

// Filtrar catálogo desde otra página (ej: inicio → /catalogo?cat=Oficina)
function filterCatalog(cat) {
  location.href = '/catalogo?cat=' + encodeURIComponent(cat);
}

// ── Admin sidebar ─────────────────────────────
// Solo activo en /acceso-interno
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

  // Papelera y Auditoría son solo del administrador: recuperar remisiones
  // borradas y ver quién cambió qué no son módulos que se repartan.
  ['sidebar-papelera', 'sidebar-auditoria'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = isAdmin ? '' : 'none';
  });

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
  // Invalidar la sesión en el servidor antes de salir. Borrar solo
  // localStorage dejaba el token vivo en la tabla `sessions` durante sus 8
  // horas completas, así que cerrar sesión no revocaba el acceso.
  var token = '';
  try {
    var s = JSON.parse(localStorage.getItem('dlc_session') || '{}');
    token = s.token || '';
  } catch(e) {}

  function salir() {
    try { localStorage.removeItem('dlc_session'); } catch(e) {}
    window.currentUser = null;
    location.href = '/acceso-interno';
  }

  if (!token) { salir(); return; }

  var SUPA_URL  = 'https://jnxsofraqshxjboukiab.supabase.co';
  var SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';

  // Se sale igual si la petición falla: nunca dejar al usuario atrapado
  // en el panel porque la red no respondió.
  fetch(SUPA_URL + '/functions/v1/admin-usuarios', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + token,
      'apikey':        SUPA_ANON,
    },
    body: JSON.stringify({ action: 'logout', data: {} }),
    keepalive: true,
  }).then(salir).catch(salir);
}

// ── Modales ───────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
  // Las sugerencias del catálogo cuelgan de <body>, no del modal, así que no
  // se van con él: se quedarían flotando sobre la pantalla vacía.
  if (typeof _cerrarSugerencias === 'function') _cerrarSugerencias();
}

// Cerrar con un clic fuera o con Escape está bien para los modales que solo
// muestran algo (la remisión, la cotización ya hecha), pero sobre un
// formulario borraba el trabajo sin preguntar: una remisión manual con diez
// productos escritos a mano se perdía por un clic torpe en el borde.
//
// La regla es una sola y sin excepciones: si el modal tiene campos, es un
// formulario y estos dos gestos no lo cierran, esté lleno o recién abierto.
// Hubo una versión que sí dejaba cerrar el formulario vacío ("total, no hay
// nada que perder"), y resultó peor: abrir Nueva Cotización y verla
// desaparecer con el primer clic al borde desconcierta igual, y la regla
// dejaba de ser predecible. Para descartar a propósito están ✕ y Cancelar,
// que llaman a closeModal() y siempre cierran.
function _modalEsFormulario(overlay) {
  return !!(overlay && overlay.querySelector('input, textarea, select'));
}

function _avisarModalProtegido(overlay) {
  const caja = overlay.querySelector('.modal-box');
  // La sacudida es el único aviso que funciona igual en la tienda y en el
  // panel; el toast solo existe en el panel.
  if (caja && typeof caja.animate === 'function') {
    caja.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-7px)' },
      { transform: 'translateX(7px)' },
      { transform: 'translateX(0)' },
    ], { duration: 220, easing: 'ease-in-out' });
  }
  if (typeof showAdminToast === 'function') {
    showAdminToast('⚠️ Usa Cancelar o ✕ para cerrar sin guardar');
  }
}

function _cerrarModalPorGesto(overlay) {
  if (!overlay) return;
  if (_modalEsFormulario(overlay)) { _avisarModalProtegido(overlay); return; }
  overlay.classList.remove('open');
  if (typeof _cerrarSugerencias === 'function') _cerrarSugerencias();
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) _cerrarModalPorGesto(overlay);
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
      _cerrarModalPorGesto(m);
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

// ── Refresco de permisos desde DB ─────────────
// Llamado silenciosamente al restaurar sesión desde localStorage.
// Actualiza permisos, nombre y estado sin interrumpir la UI.
function _refrescarSesionDB() {
  if (!window.currentUser || typeof _edgeUsuarios !== 'function') return;
  _edgeUsuarios('refrescar-sesion', {}, function(data) {
    if (!data) return;
    var changed = false;

    // Actualizar permisos
    var freshPerms = (typeof parsePermisos === 'function') ? parsePermisos(data.permisos) : (data.permisos || []);
    if (JSON.stringify(window.currentUser.permisos) !== JSON.stringify(freshPerms)) {
      window.currentUser.permisos = freshPerms;
      changed = true;
    }

    // Actualizar nombre
    if (data.nombre && data.nombre !== window.currentUser.nombre) {
      window.currentUser.nombre = data.nombre;
      changed = true;
    }

    if (changed) {
      try { localStorage.setItem('dlc_session', JSON.stringify(window.currentUser)); } catch(e) {}
      // Re-iniciar sidebar con permisos actualizados
      if (typeof initAdminSidebar === 'function') initAdminSidebar();
      // Si la sección actual ya no tiene acceso, redirigir al dashboard
      var sec = window.currentAdminSection;
      if (sec && sec !== 'dashboard' && sec !== 'perfil') {
        var isAdmin = window.currentUser.rol === 'administrador';
        if (!isAdmin && !window.currentUser.permisos.includes(sec)) {
          if (typeof renderAdminSection === 'function') renderAdminSection('dashboard');
        }
      }
    }
  });
}

// ── Arranque ──────────────────────────────────
window.addEventListener('DOMContentLoaded', function() {
  initTheme();

  // Re-aplicar tema si cambia el tamaño de ventana (rotación, etc)
  window.addEventListener('resize', function() {
    var isMobile = window.innerWidth <= 768;
    if (isMobile) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  });

  // Catálogo: renderizar si estamos en /catalogo
  if (document.getElementById('catalog-grid')) {
    if (typeof renderCatalog === 'function') renderCatalog();
    if (typeof updateCartUI === 'function') updateCartUI();
    if (typeof syncCartBadge === 'function') syncCartBadge();

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

  // Admin: restaurar sesión y refrescar permisos desde DB
  if (document.getElementById('page-admin-login')) {
    try {
      var saved = localStorage.getItem('dlc_session');
      if (saved) {
        var savedUser = JSON.parse(saved);
        if (savedUser && savedUser.username && savedUser.rol && (!savedUser.expires || Date.now() < savedUser.expires)) {
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
          // Refrescar permisos en segundo plano
          setTimeout(_refrescarSesionDB, 500);
        } else {
          localStorage.removeItem('dlc_session');
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

    // Solo por número de pedido exacto. La búsqueda por nombre se eliminó:
    // descargaba la base de datos completa de clientes al navegador. El RPC
    // track_pedido devuelve solo datos no sensibles del pedido (sin email,
    // teléfono, NIT, dirección ni nombre del cliente).
    _supaFetch('/rest/v1/rpc/track_pedido', {
      method: 'POST',
      body: JSON.stringify({ p_id: id }),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) { return (data && data.id) ? [data] : []; })
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
                // La empresa solo se añade si de verdad aporta algo: se guarda
                // en espejo del cliente, así que si no, salía el nombre dos veces.
                '<div style="font-size:13px;color:var(--text-soft);margin-top:3px">' + _esc(o.client) + (o.company && o.company !== o.client ? ' · ' + _esc(o.company) : '') + '</div>' +
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
    // Los items vienen incluidos en el RPC track_pedido; ya no se lee la
    // tabla pedido_items directamente con la clave anon.
    order._items = order.items || [];
    window.renderOrder(order);
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
            '<span class="lbl">' + (i.icon || '\u{1F4E6}') + ' ' + _esc(i.name) + '</span>' +
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

    // Observaciones. Van justo debajo de los productos porque a menudo
    // contienen el destino real de la entrega: `city` es la ciudad donde se
    // tom\xf3 el pedido, no donde se entrega, y sin esto el cliente lee una
    // ciudad y le llega a otra.
    var observacionesHTML = '';
    var obs = (order.notes || '').trim();
    var dir = (order.address || '').trim();
    if (obs || dir) {
      observacionesHTML =
        '<div class="info-box" style="margin-top:12px;background:rgba(245,158,11,0.06);border-left:3px solid #F59E0B">' +
          '<div class="info-row"><span class="lbl" style="font-weight:800">Observaciones de la entrega</span></div>' +
          (dir ? '<div class="info-row"><span class="lbl">Direcci\xf3n</span><span class="val">' + _esc(dir) + '</span></div>' : '') +
          (obs ? '<div style="font-size:14px;color:var(--text);line-height:1.6;white-space:pre-wrap;padding:4px 0">' + _esc(obs) + '</div>' : '') +
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
          '<div class="order-sub">Seguimiento de pedido</div>' +
        '</div>' +
        '<span class="badge ' + badgeClass + '">' + badgeLabel + '</span>' +
      '</div>' +
      '<div class="info-box">' +
        '<div class="info-row"><span class="lbl">Fecha del pedido</span><span class="val">' + (order.date || '\u2014').slice(0,10) + '</span></div>' +
        '<div class="info-row"><span class="lbl">Ciudad</span><span class="val">' + (_esc(order.city) || '\u2014') + '</span></div>' +
      '</div>' +
      stepsHTML + itemsHTML + observacionesHTML + aprobarHTML;
  };

  // ── Aprobar cotización ──────────────────────
  // Verificación de propiedad: el cliente debe probar que el pedido es suyo
  // con un dato no enumerable (correo, NIT/CC o teléfono del pedido).
  window.aprobarCotizacion = function(orderId) {
    var previo = document.getElementById('aprobar-modal');
    if (previo) previo.remove();

    var triggerBtn = document.querySelector('[onclick*="aprobarCotizacion"]');

    var wrap = document.createElement('div');
    wrap.id = 'aprobar-modal';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(11,18,32,0.55);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)';
    wrap.innerHTML =
      '<div role="dialog" aria-modal="true" aria-labelledby="aprobar-title" style="background:var(--card-bg,#fff);border:1px solid var(--border-mid);border-radius:16px;box-shadow:0 28px 64px rgba(15,23,42,0.25);max-width:420px;width:100%;padding:26px">' +
        '<h3 id="aprobar-title" style="font-size:18px;font-weight:800;margin-bottom:6px;color:var(--text)">Aprobar cotización ' + orderId + '</h3>' +
        '<p style="font-size:14px;color:var(--text-soft);margin-bottom:16px">Para confirmar tu identidad, escribe el correo, NIT/CC o teléfono con el que registraste el pedido.</p>' +
        '<label for="aprobar-verifier" style="display:block;font-size:11px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Correo, NIT/CC o teléfono</label>' +
        '<input id="aprobar-verifier" type="text" autocomplete="off" style="width:100%;padding:12px 14px;border:1.5px solid var(--border-mid);border-radius:10px;font-size:15px;background:var(--input-bg,#F6F9FC);color:var(--text);box-sizing:border-box">' +
        '<div id="aprobar-error" role="alert" style="display:none;color:#B91C1C;font-size:13px;margin-top:8px"></div>' +
        '<div style="display:flex;gap:10px;margin-top:18px;justify-content:flex-end">' +
          '<button type="button" id="aprobar-cancel" style="background:none;border:1.5px solid var(--border-mid);border-radius:980px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;color:var(--text)">Cancelar</button>' +
          '<button type="button" id="aprobar-confirm" style="background:linear-gradient(135deg,#0369A1,#075985);color:#fff;border:none;border-radius:980px;padding:10px 22px;font-size:14px;font-weight:700;cursor:pointer">Aprobar cotización</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);

    var input      = document.getElementById('aprobar-verifier');
    var errorBox   = document.getElementById('aprobar-error');
    var confirmBtn = document.getElementById('aprobar-confirm');

    function cerrar() {
      wrap.remove();
      document.removeEventListener('keydown', onKey);
      if (triggerBtn) triggerBtn.focus();
    }
    function onKey(e) { if (e.key === 'Escape') cerrar(); }
    function mostrarError(msg) {
      errorBox.textContent = msg;
      errorBox.style.display = 'block';
    }

    wrap.addEventListener('click', function(e) { if (e.target === wrap) cerrar(); });
    document.getElementById('aprobar-cancel').addEventListener('click', cerrar);
    document.addEventListener('keydown', onKey);
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') confirmBtn.click(); });
    input.focus();

    confirmBtn.addEventListener('click', function() {
      var verifier = (input.value || '').trim();
      if (!verifier) { mostrarError('Escribe el dato de verificación para continuar.'); input.focus(); return; }

      errorBox.style.display = 'none';
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Procesando…';

      _supaFetch('/rest/v1/rpc/aprobar_cotizacion', {
        method: 'POST',
        body: JSON.stringify({ p_id: orderId, p_verifier: verifier }),
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (!res || !res.ok) throw new Error((res && res.message) || 'No se pudo aprobar');
      })
      .then(function() {
        cerrar();
        document.getElementById('result').innerHTML =
          '<div style="text-align:center;padding:48px 20px">' +
            '<h3 style="font-size:22px;font-weight:800;margin-bottom:10px">¡Cotización aprobada!</h3>' +
            '<p style="color:var(--text-soft);font-size:15px;line-height:1.6">Tu pedido <strong>' + orderId + '</strong> ha sido aprobado.<br>Pronto procederemos con el despacho.</p>' +
            '<p style="color:var(--text-soft);font-size:13px;margin-top:20px">¿Tienes dudas? <strong>(57) 302 354 8415</strong></p>' +
          '</div>';
      })
      .catch(function(e) {
        console.error(e);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Aprobar cotización';
        mostrarError('No pudimos aprobar la cotización. Verifica el dato ingresado o contáctanos por WhatsApp.');
      });
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