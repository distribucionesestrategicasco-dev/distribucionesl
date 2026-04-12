/* ================================================
   admin-extras.js — Mejoras adicionales del panel
   Se carga DESPUÉS de admin.js y app.js.
   No modifica funciones existentes — solo agrega.
   ================================================ */

(function () {
  'use strict';

  var EXTRAS_URL  = 'https://jnxsofraqshxjboukiab.supabase.co';
  var EXTRAS_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';

  /* ══════════════════════════════════════════════════
     1. RATE LIMITING EN LOGIN
     Bloquea el botón 30 s tras 3 intentos fallidos.
     El HTML llama a doLoginSafe() en lugar de doLogin().
     ══════════════════════════════════════════════════ */
  window.doLoginSafe = function () {
    var lockData = {};
    try { lockData = JSON.parse(localStorage.getItem('dlc_login_lock') || '{}'); } catch (e) {}

    var now = Date.now();

    // Si está bloqueado, mostrar error con cuenta regresiva
    if (lockData.until && now < lockData.until) {
      var remaining = Math.ceil((lockData.until - now) / 1000);
      var err = document.getElementById('login-error');
      if (err) {
        err.textContent = '⛔ Demasiados intentos. Espera ' + remaining + 's para intentar de nuevo.';
        err.classList.add('show');
      }
      return;
    }

    // Incrementar contador
    var attempts = (lockData.attempts || 0) + 1;

    if (attempts >= 3) {
      // Bloquear 30 segundos
      var until = now + 30000;
      try { localStorage.setItem('dlc_login_lock', JSON.stringify({ until: until, attempts: attempts })); } catch (e) {}

      var err2 = document.getElementById('login-error');
      if (err2) {
        err2.textContent = '⛔ Demasiados intentos fallidos. Espera 30 segundos.';
        err2.classList.add('show');
      }

      // Deshabilitar botón con cuenta regresiva visual
      var btn = document.querySelector('#page-admin-login .btn-full');
      if (btn) {
        btn.disabled = true;
        var countdown = 30;
        var interval = setInterval(function () {
          countdown--;
          if (btn) btn.textContent = 'Bloqueado (' + countdown + 's)';
          if (countdown <= 0) {
            clearInterval(interval);
            try { localStorage.removeItem('dlc_login_lock'); } catch (e) {}
            if (btn) { btn.disabled = false; btn.textContent = 'Ingresar →'; }
          }
        }, 1000);
      }
      return;
    }

    try { localStorage.setItem('dlc_login_lock', JSON.stringify({ attempts: attempts })); } catch (e) {}

    // Llamar login original
    doLogin();

    // Si el login fue exitoso (dlc_session se guarda), limpiar el lock
    setTimeout(function () {
      if (localStorage.getItem('dlc_session')) {
        try { localStorage.removeItem('dlc_login_lock'); } catch (e) {}
      }
    }, 2500);
  };


  /* ══════════════════════════════════════════════════
     1b. TOGGLE CONTRASEÑA EN LOGIN
     ══════════════════════════════════════════════════ */
  window.toggleAdminPass = function () {
    var inp  = document.getElementById('admin-pass');
    var icon = document.getElementById('admin-pass-icon');
    if (!inp) return;
    var isHidden = inp.type === 'password';
    inp.type = isHidden ? 'text' : 'password';
    if (icon) icon.textContent = isHidden ? 'visibility_off' : 'visibility';
  };


  /* ══════════════════════════════════════════════════
     2. CIERRE DE SESIÓN POR INACTIVIDAD (30 min)
     Avisa a los 25 min, cierra a los 30 min.
     ══════════════════════════════════════════════════ */
  var _inactivityTimer = null;
  var _warningTimer    = null;
  var _warningEl       = null;
  var SESSION_TIMEOUT  = 30 * 60 * 1000;
  var SESSION_WARNING  = 25 * 60 * 1000;

  window.resetInactivityTimer = function () {
    if (!window.currentUser) return;
    clearTimeout(_inactivityTimer);
    clearTimeout(_warningTimer);
    if (_warningEl) { _warningEl.remove(); _warningEl = null; }

    // Aviso a los 25 min
    _warningTimer = setTimeout(function () {
      if (!window.currentUser) return;
      _warningEl = document.createElement('div');
      _warningEl.id = 'dlc-session-warning';
      _warningEl.style.cssText = [
        'position:fixed', 'bottom:80px', 'left:50%',
        'transform:translateX(-50%)',
        'background:#F59E0B', 'color:#fff',
        'padding:14px 24px', 'border-radius:12px',
        'font-size:14px', 'font-weight:600',
        'font-family:inherit', 'z-index:9998',
        'box-shadow:0 4px 20px rgba(0,0,0,0.25)',
        'white-space:nowrap', 'display:flex',
        'align-items:center', 'gap:12px',
      ].join(';');
      _warningEl.innerHTML = '⏰ La sesión cerrará en 5 min por inactividad'
        + ' <button onclick="resetInactivityTimer()" style="background:#fff;color:#D97706;border:none;'
        + 'padding:6px 14px;border-radius:6px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px">'
        + 'Continuar</button>';
      document.body.appendChild(_warningEl);
    }, SESSION_WARNING);

    // Cerrar sesión a los 30 min
    _inactivityTimer = setTimeout(function () {
      if (!window.currentUser) return;
      showAdminToast('🔒 Sesión cerrada por inactividad');
      setTimeout(function () {
        if (typeof cerrarSesion === 'function') cerrarSesion();
      }, 1500);
    }, SESSION_TIMEOUT);
  };

  // Eventos que reinician el timer de inactividad
  ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(function (ev) {
    document.addEventListener(ev, function () {
      if (window.currentUser) resetInactivityTimer();
    }, { passive: true });
  });


  /* ══════════════════════════════════════════════════
     3. POLLING DE NUEVOS PEDIDOS (cada 30 s)
     Muestra toast + badge rojo en el sidebar cuando
     llega un nuevo pedido con status 'pending'.
     ══════════════════════════════════════════════════ */
  var _lastSeenId    = null;
  var _pollInterval  = null;
  var _badgeCount    = 0;

  function _pollNewOrders() {
    if (!window.currentUser) return;
    fetch(EXTRAS_URL + '/rest/v1/pedidos?select=id,client,status&order=created_at.desc&limit=1', {
      headers: { 'apikey': EXTRAS_ANON, 'Authorization': 'Bearer ' + EXTRAS_ANON },
    })
    .then(function (r) { return r.json(); })
    .then(function (rows) {
      if (!rows || !rows.length) return;
      var latest = rows[0];

      // Primera ejecución: solo marcar punto de partida
      if (_lastSeenId === null) { _lastSeenId = latest.id; return; }

      if (latest.id !== _lastSeenId && latest.status === 'pending') {
        _lastSeenId = latest.id;
        _badgeCount++;
        _setPedidosBadge(_badgeCount);
        showAdminToast('🔔 Nuevo pedido: ' + latest.id + (latest.client ? ' — ' + latest.client : ''));

        // Recargar sección activa si corresponde
        if (currentAdminSection === 'dashboard' || currentAdminSection === 'pedidos') {
          setTimeout(function () {
            if (typeof adminSection === 'function') adminSection(currentAdminSection);
          }, 2000);
        }
      }
    })
    .catch(function () { /* silenciar errores de red */ });
  }

  function _setPedidosBadge(count) {
    var link = document.querySelector('.admin-sidebar a[onclick*="\'pedidos\'"]');
    if (!link) return;
    var existing = document.getElementById('extras-pedidos-badge');
    if (existing) existing.remove();
    if (count > 0) {
      var badge = document.createElement('span');
      badge.id = 'extras-pedidos-badge';
      badge.textContent = count;
      badge.style.cssText = 'background:#EF4444;color:#fff;border-radius:99px;'
        + 'padding:1px 7px;font-size:10px;font-weight:700;margin-left:auto;line-height:1.8;flex-shrink:0';
      link.appendChild(badge);
    }
  }

  function _startPolling() {
    if (_pollInterval) return;
    _pollNewOrders();
    _pollInterval = setInterval(_pollNewOrders, 30000);
    resetInactivityTimer();
  }


  /* ══════════════════════════════════════════════════
     4. EXPORTAR EXCEL (.xls)
     Solo cotizaciones enviadas y órdenes aprobadas.
     Sin dependencias externas — blob HTML puro que
     Excel abre nativamente en todas las versiones.
     ══════════════════════════════════════════════════ */
  window.exportarExcel = function () {
    try {
      var allOrders = orders || [];
      console.log('[exportarExcel] total orders:', allOrders.length,
        '| statuses:', allOrders.map(function(o){return o.status;}).join(','));

      // Solo cotizados y aprobados
      var data = allOrders.filter(function (o) {
        return o.status === 'quoted' || o.status === 'approved';
      });

      if (!data.length) {
        var statuses = [...new Set(allOrders.map(function(o){return o.status || 'sin-estado';}))];
        showAdminToast(allOrders.length === 0
          ? '⚠️ No hay pedidos cargados aún. Espera un momento e intenta de nuevo.'
          : '⚠️ No hay cotizaciones ni órdenes aprobadas. Estados encontrados: ' + statuses.join(', '));
        return;
      }

      var esc = function (v) {
        return String(v == null ? '' : v)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      };

      var th = function (t) { return '<th>' + esc(t) + '</th>'; };
      var td = function (v, num) {
        return num
          ? '<td style="mso-number-format:\'#\\,##0\'">' + esc(v) + '</td>'
          : '<td>' + esc(v) + '</td>';
      };

      var headerCols = [
        'ID Pedido','Fecha','Cliente','Empresa','NIT / CC',
        'Email','Teléfono','Ciudad','Estado',
        'Productos','Subtotal','IVA 19%','Total',
      ];

      var bodyRows = data.map(function (o) {
        var t         = calcOrderTotals(o);
        var productos = (o.items || []).map(function (i) {
          return i.name + ' x' + i.qty + (i.price ? ' ($' + fmt(i.price) + '/u)' : '');
        }).join(', ');
        return '<tr>'
          + td(o.id)
          + td(fmtFecha(o.date))
          + td(o.client  || '')
          + td(o.company || '')
          + td(o.nit     || '')
          + td(o.email   || '')
          + td(o.phone   || '')
          + td(o.city    || '')
          + td(statusLabel(o.status))
          + td(productos)
          + td(Math.round(t.sub   || 0), true)
          + td(Math.round(t.iva   || 0), true)
          + td(Math.round(t.total || 0), true)
          + '</tr>';
      }).join('');

      var html = '<?xml version="1.0" encoding="UTF-8"?>'
        + '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">'
        + '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/1999/xhtml">'
        + '<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>'
        + '<style>'
        + 'table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt}'
        + 'th{background:#1D6F42;color:#fff;font-weight:bold;padding:8px 10px;border:1px solid #155a32;white-space:nowrap}'
        + 'td{padding:6px 10px;border:1px solid #D0D0D0;vertical-align:top}'
        + 'tr:nth-child(even) td{background:#F2F9F2}'
        + '</style></head>'
        + '<body>'
        + '<table>'
        + '<thead><tr>' + headerCols.map(th).join('') + '</tr></thead>'
        + '<tbody>' + bodyRows + '</tbody>'
        + '</table>'
        + '</body></html>';

      var blob     = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      var url      = URL.createObjectURL(blob);
      var a        = document.createElement('a');
      var filename = 'cotizaciones_' + new Date().toISOString().slice(0, 10) + '.xls';
      a.href       = url;
      a.download   = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showAdminToast('✅ Descargado: ' + filename + ' (' + data.length + ' registros)');

    } catch (err) {
      console.error('exportarExcel error:', err);
      showAdminToast('❌ Error al generar el Excel: ' + (err.message || err));
    }
  };


  /* ══════════════════════════════════════════════════
     5. SECCIÓN CLIENTES (CRM básico)
     Agrupa pedidos por cliente y muestra totales.
     ══════════════════════════════════════════════════ */
  window.renderClientesSection = function () {
    var data = orders || [];
    var map  = {};

    data.forEach(function (o) {
      var key = ((o.email || '') + '|' + (o.client || '')).toLowerCase();
      if (!map[key]) {
        map[key] = {
          name:      o.client  || '—',
          company:   o.company || '',
          email:     o.email   || '',
          phone:     o.phone   || '',
          city:      o.city    || '',
          orders:    [],
          totalFact: 0,
        };
      }
      map[key].orders.push(o);
      map[key].totalFact += (calcOrderTotals(o).total || 0);
    });

    var clients = Object.values(map).sort(function (a, b) {
      return b.orders.length - a.orders.length;
    });

    var rows = clients.length === 0
      ? '<tr><td colspan="7" style="text-align:center;padding:40px;color:#9CA3AF">Sin clientes registrados</td></tr>'
      : clients.map(function (c) {
          var last = c.orders[c.orders.length - 1];
          return '<tr>'
            + '<td><strong>' + c.name + '</strong></td>'
            + '<td>' + (c.company || '—') + '</td>'
            + '<td>' + (c.email || '—') + (c.phone ? '<small>' + c.phone + '</small>' : '') + '</td>'
            + '<td>' + (c.city || '—') + '</td>'
            + '<td style="text-align:center;font-weight:700">' + c.orders.length + '</td>'
            + '<td style="text-align:right">' + (c.totalFact > 0 ? '$' + fmt(Math.round(c.totalFact)) : '—') + '</td>'
            + '<td style="font-size:12px">' + (last ? fmtFecha(last.date) : '—') + '</td>'
            + '</tr>';
        }).join('');

    return '<div class="admin-content">'
      + '<div class="admin-header"><div>'
      + '<h1>Clientes</h1>'
      + '<p>' + clients.length + ' cliente(s) encontrado(s)</p>'
      + '</div></div>'
      + '<div class="section-card"><table>'
      + '<thead><tr>'
      + '<th>Cliente</th><th>Empresa</th><th>Contacto</th><th>Ciudad</th>'
      + '<th style="text-align:center">Pedidos</th>'
      + '<th style="text-align:right">Facturado</th>'
      + '<th>Último Pedido</th>'
      + '</tr></thead>'
      + '<tbody>' + rows + '</tbody>'
      + '</table></div></div>';
  };


  /* ══════════════════════════════════════════════════
     6a. AVATAR EN EL CHIP DE USUARIO
     ══════════════════════════════════════════════════ */
  function _enhanceUserChip() {
    var chip = document.getElementById('sidebar-user-info');
    if (!chip || !window.currentUser) return;
    var name    = currentUser.nombre || currentUser.username || '';
    var initial = name.charAt(0).toUpperCase();
    var rol     = (typeof ROLE_LABELS !== 'undefined' ? ROLE_LABELS[currentUser.rol] : null) || currentUser.rol || '';
    chip.style.cssText = 'margin:12px 14px 4px;padding:8px 10px;background:#F5F6FA;'
      + 'border-radius:10px;display:flex;align-items:center;gap:9px;flex-shrink:0';
    chip.innerHTML = '<div style="width:30px;height:30px;border-radius:50%;flex-shrink:0;'
      + 'background:linear-gradient(135deg,#1A3C5E 0%,#49C9F4 100%);'
      + 'color:#fff;display:flex;align-items:center;justify-content:center;'
      + 'font-size:13px;font-weight:800">' + initial + '</div>'
      + '<div style="min-width:0">'
      + '<div style="font-size:12px;font-weight:700;color:#1A1A2E;'
      + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + name + '</div>'
      + '<div style="font-size:10px;color:#9CA3AF;margin-top:1px">' + rol + '</div>'
      + '</div>';
  }

  /* ══════════════════════════════════════════════════
     6b. INYECCIÓN SIDEBAR — enlace Clientes
     ══════════════════════════════════════════════════ */
  function _injectClientesLink() {
    if (document.getElementById('sidebar-clientes')) return;

    // Insertar antes de Catálogo o antes de Usuarios
    var anchor = document.getElementById('sidebar-catalogo')
               || document.getElementById('sidebar-usuarios')
               || document.querySelector('.admin-sidebar h4[class*="section-title"]:last-of-type');
    if (!anchor) return;

    var rol     = window.currentUser ? window.currentUser.rol : '';
    var visible = (rol === 'administrador' || rol === 'gestor');

    var link = document.createElement('a');
    link.id   = 'sidebar-clientes';
    link.setAttribute('onclick', "adminSection('clientes')");
    link.style.display = visible ? '' : 'none';
    link.innerHTML = '<span class="material-icons">people</span> Clientes';
    anchor.parentNode.insertBefore(link, anchor);
  }


  /* ══════════════════════════════════════════════════
     7. WRAP DE renderAdminSection
     Intercepta 'clientes' para la nueva sección.
     ══════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {

    // ── Wrap renderAdminSection ─────────────────────
    var _origRender = window.renderAdminSection;
    window.renderAdminSection = function (sec) {

      // Sección Clientes (nueva — manejada aquí)
      if (sec === 'clientes') {
        var cont = document.getElementById('admin-content');
        if (!cont) return;

        // Spinner mientras carga
        cont.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;'
          + 'justify-content:center;height:60vh;gap:16px;color:#9CA3AF">'
          + '<div style="width:40px;height:40px;border:3px solid #E8EAF0;'
          + 'border-top-color:#49C9F4;border-radius:50%;animation:dlcSpin 0.8s linear infinite"></div>'
          + '<p style="font-size:15px">Cargando clientes...</p>'
          + '<style>@keyframes dlcSpin{to{transform:rotate(360deg)}}</style>'
          + '</div>';

        // Active state en sidebar
        document.querySelectorAll('.admin-sidebar a').forEach(function (a) { a.classList.remove('active'); });
        var cLink = document.getElementById('sidebar-clientes');
        if (cLink) cLink.classList.add('active');
        currentAdminSection = 'clientes';

        // Cargar pedidos y renderizar
        var doRender = function () { cont.innerHTML = renderClientesSection(); };
        if (typeof loadOrdersFromSheet === 'function') {
          loadOrdersFromSheet().then(doRender).catch(doRender);
        } else {
          doRender();
        }
        return;
      }

      // Resto de secciones: comportamiento original
      if (typeof _origRender === 'function') _origRender(sec);

      // Limpiar badge de nuevos pedidos al visitar Pedidos
      if (sec === 'pedidos') { _badgeCount = 0; _setPedidosBadge(0); }
    };

    // ── Wrap initAdminSidebar ───────────────────────
    var _origInitSidebar = window.initAdminSidebar;
    window.initAdminSidebar = function () {
      if (typeof _origInitSidebar === 'function') _origInitSidebar();
      _enhanceUserChip();
      _injectClientesLink();
    };

    // ── Arrancar si ya hay sesión (reload) ──────────
    if (window.currentUser) {
      _enhanceUserChip();
      _injectClientesLink();
      _startPolling();
    }

    // ── Observar cuando el panel se hace visible ────
    // (post-login: el div #page-admin pasa de display:none a display:block)
    var adminEl = document.getElementById('page-admin');
    if (adminEl) {
      var _observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.attributeName === 'style' && adminEl.style.display !== 'none') {
            if (window.currentUser && !_pollInterval) {
              _enhanceUserChip();
              _injectClientesLink();
              _startPolling();
            }
          }
        });
      });
      _observer.observe(adminEl, { attributes: true, attributeFilter: ['style'] });
    }

  }); // DOMContentLoaded

})();
