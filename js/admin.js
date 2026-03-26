
// ── Modo oscuro ────────────────────────────────
function toggleDarkMode() {
  var dark = document.documentElement.getAttribute('data-theme') === 'dark';
  var next = dark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('dlc_theme', next); } catch(e){}
  var btn = document.getElementById('dark-toggle-btn') || document.getElementById('dark-toggle-admin');
  if (btn) btn.innerHTML = (next === 'dark') ? '☀️' : '🌙';
  var adminBtn = document.getElementById('dark-toggle-admin');
  if (adminBtn) adminBtn.innerHTML = '<span class="icon">' + (next === 'dark' ? '☀️' : '🌙') + '</span> ' + (next === 'dark' ? 'Modo Claro' : 'Modo Oscuro');
}

function initTheme() {
  try {
    var t = localStorage.getItem('dlc_theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
    setTimeout(function() {
      var btn = document.getElementById('dark-toggle-btn');
      if (btn) btn.innerHTML = t === 'dark' ? '☀️' : '🌙';
      var adminBtn = document.getElementById('dark-toggle-admin');
      if (adminBtn) adminBtn.innerHTML = '<span class="icon">' + (t === 'dark' ? '☀️' : '🌙') + '</span> ' + (t === 'dark' ? 'Modo Claro' : 'Modo Oscuro');
    }, 100);
  } catch(e) {}
}


// ── Historial de precios ───────────────────────
function verHistorialPrecios(id) {
  var p = catalogoLocal.find(function(x) { return x.id === id; });
  if (!p) return;
  var hist = p.priceHistory || [];
  var rows = hist.length === 0
    ? '<tr><td colspan="3" style="text-align:center;color:var(--text-soft);padding:20px">Sin historial de precios aún</td></tr>'
    : hist.slice().reverse().map(function(h) {
        return '<tr>'
          + '<td>' + h.fecha + '</td>'
          + '<td style="font-weight:700;color:var(--brand-blue)">$' + fmt(h.precio) + '</td>'
          + '<td style="color:var(--text-soft);font-size:12px">' + (h.usuario || 'Sistema') + '</td>'
          + '</tr>';
      }).join('');

  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = '<div style="background:var(--bg-white);border-radius:16px;padding:28px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">'
    + '<h3 style="font-size:17px;font-weight:800">' + p.name + ' — Historial de precios</h3>'
    + '<button onclick="this.parentNode.parentNode.parentNode.remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-soft)">✕</button>'
    + '</div>'
    + '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--bg)">'
    + '<th style="padding:10px;text-align:left;font-size:12px">Fecha</th>'
    + '<th style="padding:10px;text-align:left;font-size:12px">Precio</th>'
    + '<th style="padding:10px;text-align:left;font-size:12px">Usuario</th>'
    + '</tr></thead><tbody>' + rows + '</tbody></table>'
    + '<div style="margin-top:16px;font-size:12px;color:var(--text-soft)">Precio actual: '
    + (p.price ? '<strong style="color:var(--brand-blue)">$' + fmt(p.price) + '</strong>' : '<em>Sin precio</em>')
    + '</div>'
    + '</div>';
  modal.setAttribute('data-dlc-modal', '1'); modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
}

/* ================================================
   admin.js — Panel de administración
   ================================================ */

// Usuario activo en sesión
let currentUser = null;

// Permisos por rol
const ROLE_PERMS = {
  administrador: ['dashboard','pedidos','cotizaciones','ordenes','remisiones','entregados','usuarios','catalogo'],
  gestor:        ['dashboard','pedidos','cotizaciones','ordenes','remisiones','entregados'],
  vendedor:      ['dashboard','pedidos','cotizaciones'],
  despachador:   ['dashboard','ordenes','remisiones','entregados'],
  lectura:       ['dashboard','pedidos','cotizaciones','ordenes','remisiones','entregados'],
};

const ROLE_LABELS = {
  administrador: 'Administrador',
  gestor:        'Gestor',
  vendedor:      'Vendedor',
  despachador:   'Despachador',
  lectura:       'Solo Lectura',
};

function canDo(section) {
  if (!currentUser) return false;
  const perms = ROLE_PERMS[currentUser.rol] || [];
  return perms.includes(section);
}

function isReadOnly() {
  return currentUser && currentUser.rol === 'lectura';
}

// ── Login via Google Sheets ────────────────────

function doLogin() {
  var u = document.getElementById('admin-user').value.trim();
  var p = document.getElementById('admin-pass').value;
  var btn = document.querySelector('.btn-full');
  var err = document.getElementById('login-error');
  if (!u || !p) {
    if (err) { err.textContent = 'Completa todos los campos.'; err.classList.add('show'); }
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }
  if (err) err.classList.remove('show');
  var SUPA_URL  = 'https://jnxsofraqshxjboukiab.supabase.co';
  var SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';
  fetch(SUPA_URL + '/rest/v1/usuarios?username=eq.' + encodeURIComponent(u) + '&activo=eq.true&select=*', {
    headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON }
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar →'; }
    if (data && data.length > 0 && data[0].password === p) {
      var user = data[0];
      window.currentUser = { username: user.username, nombre: user.nombre || user.username, rol: user.rol || 'administrador' };
      try { localStorage.setItem('dlc_session', JSON.stringify(window.currentUser)); } catch(e) {}
      showPage('admin');
      renderAdminSection('dashboard');
    } else {
      if (err) { err.textContent = 'Usuario o contraseña incorrectos.'; err.classList.add('show'); }
    }
  })
  .catch(function() {
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar →'; }
    if (err) { err.textContent = 'Error de conexión. Intenta de nuevo.'; err.classList.add('show'); }
  });
}

function showLoginError(msg) {
  const err = document.getElementById('login-error');
  err.textContent = msg;
  err.classList.add('show');
  setTimeout(function() { err.classList.remove('show'); }, 3000);
}

// ── Navegación interna ─────────────────────────

function adminSection(sec) {
  if (!canDo(sec)) {
    showAdminToast('⛔ No tienes permiso para acceder a esta sección.');
    return;
  }
  document.querySelectorAll('.admin-sidebar a').forEach(function(a) {
    a.classList.toggle('active', a.getAttribute('onclick') === "adminSection('" + sec + "')");
  });
  renderAdminSection(sec);
}

function renderAdminSection(sec) {
  currentAdminSection = sec;
  const cont = document.getElementById('admin-content');

  cont.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;gap:16px;color:var(--text-soft)">
      <div style="width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--brand-cyan);border-radius:50%;animation:spin 0.8s linear infinite"></div>
      <p style="font-size:15px">Cargando...</p>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;

  // Usuarios y Catálogo no necesitan cargar pedidos
  if (sec === 'usuarios') {
    loadUsersSection(cont);
    return;
  }


  if (sec === 'catalogo') {
    loadCatalogoSection(cont);
    return;
  }

  // Entregados: carga pedidos si hace falta, luego renderiza siempre
  if (sec === 'entregados') {
    loadOrdersFromSheet()
      .then(function() { cont.innerHTML = renderEntregados(); })
      .catch(function() { cont.innerHTML = renderEntregados(); });
    return;
  }

  loadOrdersFromSheet()
    .then(function() {
      const map = {
        dashboard:    renderDashboard,
        pedidos:      renderPedidos,
        cotizaciones: renderCotizaciones,
        ordenes:      renderOrdenes,
        remisiones:   renderRemisiones,
        entregados:   renderEntregados,
        catalogo:     renderCatalogo,
      };
      if (map[sec]) { cont.innerHTML = map[sec](); if (sec === 'dashboard') setTimeout(initDashboardChart, 50); }
    })
    .catch(function(err) {
      console.error('Error cargando sección:', err);
      // Entregados puede renderizarse aunque falle Sheets (muestra tabla vacía + carga PDFs de Drive)
      if (sec === 'entregados') {
        cont.innerHTML = renderEntregados();
        return;
      }
      var msg = err && err.name === 'AbortError'
        ? 'La conexión tardó demasiado. Verifica tu internet.'
        : 'No se pudo conectar con Google Sheets. Verifica que el Apps Script esté publicado correctamente.';
      cont.innerHTML = `
        <div style="text-align:center;padding:60px;color:var(--text-soft)">
          <div style="font-size:48px;margin-bottom:16px">⚠️</div>
          <h3 style="font-size:20px;font-weight:700;margin-bottom:8px;color:var(--text-primary)">Error al cargar</h3>
          <p style="max-width:400px;margin:0 auto 8px">${msg}</p>
          <p style="font-size:12px;color:#B4B2A9;margin-bottom:20px">${err ? err.message || '' : ''}</p>
          <button onclick="adminSection('${sec}')" style="background:var(--brand-cyan);color:#fff;border:none;border-radius:12px;padding:12px 28px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">🔄 Reintentar</button>
        </div>`;
    });
}

// ── Dashboard ──────────────────────────────────

function renderDashboard() {
  const cnt   = s => orders.filter(o => o.status === s).length;
  const total = s => orders.filter(o => o.status === s)
    .reduce((sum, o) => sum + calcOrderTotals(o).total, 0);

  // Pedidos urgentes: pending > 2 días
  const hoy      = new Date();
  const urgentes = orders.filter(o => {
    if (o.status !== 'pending') return false;
    const diff = (hoy - new Date(o.date)) / 86400000;
    return diff >= 2;
  });

  // Últimos 5 movimientos
  const recientes = orders.slice().reverse().slice(0, 5);

  return `
    <div class="admin-header">
      <div>
        <h1>Dashboard</h1>
        <p>Hola ${currentUser ? (currentUser.nombre || currentUser.username) : ''} - ${fmtFechaLarga(new Date().toISOString().slice(0,10))}</p>
      </div>
      <button onclick="exportarReporte()" style="background:var(--brand-navy);color:#fff;border:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer" ${currentUser && currentUser.rol === 'administrador' ? '' : 'hidden'}>⬇️ Exportar Reporte</button>
    </div>

    <!-- KPIs -->
    <div class="stats-row">
      <div class="stat-card" onclick="adminSection('pedidos')" style="cursor:pointer">
        <div class="slbl">Nuevos Pedidos</div>
        <div class="sval" style="color:#854F0B">${cnt('pending')}</div>
        <div class="sdelta up">Requieren cotización →</div>
      </div>
      <div class="stat-card" onclick="adminSection('cotizaciones')" style="cursor:pointer">
        <div class="slbl">En Cotización</div>
        <div class="sval" style="color:#185FA5">${cnt('quoted')}</div>
        <div class="sdelta">Esperando aprobación →</div>
      </div>
      <div class="stat-card" onclick="adminSection('ordenes')" style="cursor:pointer">
        <div class="slbl">Por Despachar</div>
        <div class="sval" style="color:#3B6D11">${cnt('approved')}</div>
        <div class="sdelta up">Listas para despacho →</div>
      </div>
      <div class="stat-card" onclick="adminSection('remisiones')" style="cursor:pointer">
        <div class="slbl">Despachados</div>
        <div class="sval">${cnt('dispatched')}</div>
        <div class="sdelta">En camino →</div>
      </div>
      <div class="stat-card" onclick="adminSection('entregados')" style="cursor:pointer;border-left:3px solid #49C9F4">
        <div class="slbl">Entregados</div>
        <div class="sval" style="color:#49C9F4">${cnt('delivered')}</div>
        <div class="sdelta">Confirmado →</div>
      </div>
    </div>

    <!-- Alertas urgentes -->
    ${urgentes.length > 0 ? `
    <div style="background:#FFF4E5;border:1px solid #F59E0B;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
      <span style="font-size:24px">⚠️</span>
      <div>
        <div style="font-size:14px;font-weight:700;color:#92400E">
          ${urgentes.length} pedido(s) sin cotizar hace más de 2 días
        </div>
        <div style="font-size:13px;color:#B45309;margin-top:2px">
          ${urgentes.map(o => o.client).join(', ')}
          — <a onclick="adminSection('pedidos')" style="cursor:pointer;color:#B45309;font-weight:700">Cotizar ahora →</a>
        </div>
      </div>
    </div>` : ''}

    <!-- Gráfica de ventas mensuales -->
    <div class="section-card" style="margin-bottom:20px">
      <div class="section-card-head">
        <h3>📊 Pedidos por Mes</h3>
      </div>
      <canvas id="dashboard-chart" height="120" style="width:100%;padding:16px 20px"></canvas>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

      <!-- Últimos movimientos -->
      <div class="section-card" style="margin:0">
        <div class="section-card-head"><h3>Últimos Movimientos</h3></div>
        <table>
          <thead><tr><th>Cliente</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            ${recientes.map(o => `
              <tr>
                <td>${o.client}<small>${o.company||''}</small></td>
                <td><span class="badge ${statusBadgeClass(o.status)}">${statusLabel(o.status)}</span></td>
                <td style="font-size:12px">${fmtFecha(o.date)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- Embudo de ventas -->
      <div class="section-card" style="margin:0">
        <div class="section-card-head"><h3>Embudo de Ventas</h3></div>
        <div style="padding:8px 0">
          ${[
            ['Pedidos recibidos',    orders.length,                                                        '#49C9F4'],
            ['Cotizaciones enviadas', cnt('quoted') + cnt('approved') + cnt('dispatched') + cnt('delivered'), '#0872E6'],
            ['Órdenes aprobadas',    cnt('approved') + cnt('dispatched') + cnt('delivered'),               '#3B6D11'],
            ['Despachados',          cnt('dispatched') + cnt('delivered'),                                  '#639922'],
            ['Entregados', cnt('delivered'),                                                      '#49C9F4'],
          ].map(([lbl, n, color]) => {
            const pct = orders.length > 0 ? Math.round((n / orders.length) * 100) : 0;
            return `
              <div style="margin-bottom:14px">
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                  <span style="color:var(--text-soft)">${lbl}</span>
                  <span style="font-weight:700">${n} (${pct}%)</span>
                </div>
                <div style="background:var(--border);border-radius:4px;height:8px">
                  <div style="background:${color};width:${pct}%;height:8px;border-radius:4px;transition:width 0.6s"></div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function dashboardAction(o) {
  const isAdmin = currentUser && currentUser.rol === 'administrador';
  const adminBtns = isAdmin
    ? `<button class="action-link" style="color:var(--brand-blue);margin-left:8px" onclick="editarPedido('${o.id}')">✏️</button>
       <button class="action-link" style="color:#A32D2D;margin-left:4px" onclick="eliminarPedido('${o.id}')">🗑</button>`
    : '';
  if (o.status === 'pending')
    return `<button class="action-link" onclick="openQuotePanel('${o.id}')">Cotizar →</button>${adminBtns}`;
  if (o.status === 'approved')
    return `<button class="action-link" onclick="openRemision('${o.id}')">Remisión →</button>${adminBtns}`;
  return adminBtns || '—';
}

// ── Formateo de fechas en español ─────────────

function fmtFecha(str) {
  if (!str || str === '—' || str === 'undefined') return '—';
  var s = String(str).trim();
  var date;

  // Formato ISO: 2026-03-15 o 2026-03-15T...
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    var parts = s.slice(0,10).split('-');
    date = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  }
  // Formato MM/DD/YYYY o M/D/YYYY (Google Sheets en inglés)
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
    var p = s.split('/');
    date = new Date(parseInt(p[2]), parseInt(p[0])-1, parseInt(p[1]));
  }
  // Formato DD/MM/YYYY
  else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
    var p2 = s.split('/');
    var yr = parseInt(p2[2]); if (yr < 100) yr += 2000;
    date = new Date(yr, parseInt(p2[1])-1, parseInt(p2[0]));
  }
  else {
    // Intentar parseo genérico
    date = new Date(s);
  }

  if (!date || isNaN(date.getTime())) return s;

  return date.toLocaleDateString('es-CO', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}

function fmtFechaLarga(str) {
  if (!str || str === '—') return '—';
  var s = String(str).trim();
  var date;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    var parts = s.slice(0,10).split('-');
    date = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  } else {
    date = new Date(s);
  }
  if (!date || isNaN(date.getTime())) return s;
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });
}


let adminSearch = '';

function buildSearchBar(placeholder) {
  return `
    <div style="position:relative;margin-bottom:16px">
      <input
        id="admin-search-input"
        type="text"
        placeholder="${placeholder}"
        value="${adminSearch}"
        oninput="adminSearch=this.value;renderLocalSection()"
        style="width:100%;padding:10px 16px 10px 40px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;background:var(--bg);color:var(--text);outline:none"
      >
      <span style="position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--text-soft)">🔍</span>
      ${adminSearch ? `<button onclick="adminSearch='';document.getElementById('admin-search-input').value='';renderLocalSection()"
        style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-soft)">✕</button>` : ''}
    </div>
  `;
}

function filterOrders(list) {
  const q = adminSearch.toLowerCase().trim();
  return list.filter(o => {
    // Text filter
    if (q && !(
      (o.id       || '').toLowerCase().includes(q) ||
      (o.client   || '').toLowerCase().includes(q) ||
      (o.company  || '').toLowerCase().includes(q) ||
      (o.email    || '').toLowerCase().includes(q) ||
      (o.phone    || '').toLowerCase().includes(q) ||
      (o.city     || '').toLowerCase().includes(q) ||
      (o.nit      || '').toLowerCase().includes(q)
    )) return false;
    // Date filter
    if (adminDateFrom || adminDateTo) {
      var d = parseOrderDate(o);
      if (!d) return false;
      if (adminDateFrom && d < new Date(adminDateFrom)) return false;
      if (adminDateTo   && d > new Date(adminDateTo + 'T23:59:59')) return false;
    }
    return true;
  });
}

// ── Filtros de fecha ───────────────────────────
let adminDateFrom = '';
let adminDateTo   = '';

function buildDateFilter() {
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <span style="font-size:13px;font-weight:700;color:var(--text-soft)">📅 Período:</span>
      <input type="date" value="${adminDateFrom}"
        onchange="adminDateFrom=this.value;renderLocalSection()"
        style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit">
      <span style="color:var(--text-soft);font-size:13px">→</span>
      <input type="date" value="${adminDateTo}"
        onchange="adminDateTo=this.value;renderLocalSection()"
        style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit">
      ${(adminDateFrom || adminDateTo) ? '<button onclick="adminDateFrom=\'\';adminDateTo=\'\';renderLocalSection()" style="padding:6px 12px;border:none;background:var(--border);border-radius:8px;font-size:12px;cursor:pointer;color:var(--text-soft)">✕ Limpiar</button>' : ''}
    </div>
  `;
}

function parseOrderDate(o) {
  var s = String(o.date || '').trim();
  if (!s || s === '—') return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s.slice(0,10));
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
    var p = s.split('/');
    return new Date(parseInt(p[2]), parseInt(p[0])-1, parseInt(p[1]));
  }
  return new Date(s);
}



// ── Historial de estados ───────────────────────
function addHistorial(orderId, nuevoEstado) {
  const o = orders.find(x => x.id === orderId);
  if (!o) return;
  if (!o.historial) o.historial = [];
  o.historial.push({
    estado:  statusLabel(nuevoEstado),
    fecha:   new Date().toLocaleDateString('es-CO'),
    hora:    new Date().toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'}),
    usuario: currentUser ? (currentUser.nombre || currentUser.username) : 'Sistema',
  });
}


// ── Gráfica mensual del dashboard ─────────────
function initDashboardChart() {
  var canvas = document.getElementById('dashboard-chart');
  if (!canvas) return;

  // Agrupar pedidos por mes (últimos 6 meses)
  var months = {};
  var now = new Date();
  for (var i = 5; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    var label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
    months[key] = { label: label, count: 0, total: 0 };
  }

  orders.forEach(function(o) {
    var d = parseOrderDate(o);
    if (!d) return;
    var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (months[key]) {
      months[key].count++;
      var t = calcOrderTotals(o).total;
      months[key].total += t;
    }
  });

  var keys    = Object.keys(months);
  var labels  = keys.map(function(k) { return months[k].label; });
  var counts  = keys.map(function(k) { return months[k].count; });
  var totals  = keys.map(function(k) { return months[k].total; });
  var maxCount = Math.max.apply(null, counts) || 1;

  // Render SVG bar chart
  var w = canvas.offsetWidth || 600;
  var h = 120;
  var barW = Math.floor((w - 40) / keys.length) - 8;
  var chartH = h - 40;

  var bars = keys.map(function(k, i) {
    var x = 20 + i * ((w - 40) / keys.length) + 4;
    var bh = Math.round((counts[i] / maxCount) * chartH) || 2;
    var y = h - 30 - bh;
    var color = counts[i] === Math.max.apply(null, counts) ? '#49C9F4' : '#0872E6';
    return '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + bh + '" fill="' + color + '" rx="4"/>'
      + '<text x="' + (x + barW/2) + '" y="' + (y - 4) + '" text-anchor="middle" font-size="11" fill="currentColor" font-family="Outfit,sans-serif">'
      + (counts[i] || '') + '</text>'
      + '<text x="' + (x + barW/2) + '" y="' + (h - 8) + '" text-anchor="middle" font-size="10" fill="#6E6E73" font-family="Outfit,sans-serif">'
      + labels[i] + '</text>';
  }).join('');

  canvas.outerHTML = '<svg id="dashboard-chart" viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:' + h + 'px;display:block;padding:0 20px 0 20px">'
    + bars + '</svg>';
}


// ── PDF de cotización para cliente ─────────────
function generarPDFCotizacion(orderId) {
  var o = orders.find(function(x) { return x.id === orderId; });
  if (!o) return;
  var logoEl  = document.querySelector('.sidebar-brand-logo') || document.querySelector('.login-card-logo');
  var logoSrc = logoEl ? logoEl.src : '';
  var today   = new Date().toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' });
  var { sub, iva, total } = calcOrderTotals(o);

  var items = o.items.map(function(i, idx) {
    var prec  = i.price || 0;
    var subt  = prec * i.qty;
    var ivaI  = Math.round(subt * 0.19);
    return '<tr style="background:' + (idx % 2 === 0 ? '#fff' : '#F8F9FA') + '">'
      + '<td style="padding:10px 12px;font-size:13px;font-weight:600">' + i.name + '</td>'
      + '<td style="padding:10px 12px;font-size:13px;text-align:center">' + i.qty + '</td>'
      + '<td style="padding:10px 12px;font-size:13px;text-align:right">' + (prec ? '$' + fmt(prec) : '—') + '</td>'
      + '<td style="padding:10px 12px;font-size:13px;text-align:right;font-weight:700">' + (subt ? '$' + fmt(subt) : '—') + '</td>'
      + '</tr>';
  }).join('');

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    + '<title>Cotización ' + o.id + '</title>'
    + '<style>body{font-family:Segoe UI,Arial,sans-serif;padding:0;margin:0;color:#1D1D1F}@media print{.no-print{display:none}@page{margin:1.5cm}}'
    + '.header{background:#1C2B3A;padding:28px 36px;display:flex;justify-content:space-between;align-items:center}'
    + '.logo{height:56px}h1{color:#49C9F4;font-size:22px;margin:0}h2{color:#fff;font-size:13px;font-weight:400;margin:4px 0 0}'
    + '.meta{background:#F5F5F7;padding:20px 36px;display:grid;grid-template-columns:1fr 1fr;gap:12px 40px}'
    + '.meta-item label{font-size:10px;font-weight:700;text-transform:uppercase;color:#6E6E73;letter-spacing:1px}'
    + '.meta-item span{font-size:14px;font-weight:600;display:block;margin-top:2px}'
    + 'table{width:100%;border-collapse:collapse;margin:0 36px;width:calc(100% - 72px)}'
    + 'thead tr{background:#1C2B3A}th{padding:10px 12px;font-size:11px;color:#49C9F4;text-align:left;font-weight:700}'
    + '.totals{padding:20px 36px;text-align:right}.totals table{width:280px;margin-left:auto;margin-right:0}'
    + '.totals td{padding:6px 10px;font-size:14px}.total-row td{font-size:16px;font-weight:800;color:#0872E6;border-top:2px solid #1C2B3A}'
    + '.footer{background:#1C2B3A;color:#6D7B83;padding:16px 36px;font-size:11px;display:flex;justify-content:space-between;margin-top:32px}'
    + '</style></head><body>'
    + '<div class="no-print" style="padding:16px 36px;background:#F5F5F7;border-bottom:1px solid #ddd">'
    + '<button onclick="window.print()" style="background:#1C2B3A;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-right:8px">🖨️ Imprimir / Guardar PDF</button>'
    + '<button onclick="window.close()" style="background:none;border:1px solid #ddd;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer">Cerrar</button>'
    + '</div>'
    + '<div class="header">'
    + (logoSrc ? '<img class="logo" src="' + logoSrc + '" alt="DLC">' : '<div style="color:#49C9F4;font-size:24px;font-weight:900">DLC</div>')
    + '<div style="text-align:right"><h1>COTIZACIÓN</h1><h2>' + o.id + '</h2></div>'
    + '</div>'
    + '<div class="meta">'
    + '<div class="meta-item"><label>Cliente</label><span>' + (o.client || '—') + '</span></div>'
    + '<div class="meta-item"><label>Empresa</label><span>' + (o.company || '—') + '</span></div>'
    + '<div class="meta-item"><label>NIT / CC</label><span>' + (o.nit || '—') + '</span></div>'
    + '<div class="meta-item"><label>Ciudad</label><span>' + (o.city || '—') + '</span></div>'
    + '<div class="meta-item"><label>Email</label><span>' + (o.email || '—') + '</span></div>'
    + '<div class="meta-item"><label>Teléfono</label><span>' + (o.phone || '—') + '</span></div>'
    + '<div class="meta-item"><label>Fecha pedido</label><span>' + fmtFecha(o.date) + '</span></div>'
    + '<div class="meta-item"><label>Fecha cotización</label><span>' + today + '</span></div>'
    + '</div>'
    + '<div style="padding:20px 36px 8px"><table><thead><tr>'
    + '<th>Producto</th><th style="text-align:center">Cant.</th><th style="text-align:right">Precio Unit.</th><th style="text-align:right">Subtotal</th>'
    + '</tr></thead><tbody>' + items + '</tbody></table></div>'
    + '<div class="totals"><table>'
    + '<tr><td>Subtotal</td><td><strong>$' + fmt(sub) + '</strong></td></tr>'
    + '<tr><td>IVA (19%)</td><td><strong>$' + fmt(iva) + '</strong></td></tr>'
    + '<tr class="total-row"><td>TOTAL</td><td>$' + fmt(total) + '</td></tr>'
    + '</table></div>'
    + (o.notes ? '<div style="margin:0 36px;padding:14px 16px;background:#F5F5F7;border-radius:8px;border-left:3px solid #0872E6"><div style="font-size:11px;font-weight:700;color:#6E6E73;margin-bottom:4px">OBSERVACIONES</div><div style="font-size:13px">' + o.notes + '</div></div>' : '')
    + '<div class="footer"><span>Distribuciones Estratégicas de la Costa S.A.S · distribucionesestrategicasco@gmail.com · +57 321 896 5745</span><span>Cotización válida por 15 días</span></div>'
    + '</body></html>';

  var win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    showAdminToast('⚠️ Permite ventanas emergentes para generar el PDF');
  }
}

function renderHistorial(o) {
  if (!o.historial || o.historial.length === 0) return '';
  return `
    <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
      <div style="font-size:11px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Historial</div>
      ${o.historial.map(h => `
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-soft);margin-bottom:4px">
          <span style="width:6px;height:6px;border-radius:50%;background:var(--brand-cyan);flex-shrink:0"></span>
          <strong style="color:var(--text)">${h.estado}</strong>
          <span>${h.fecha} ${h.hora}</span>
          <span>· ${h.usuario}</span>
        </div>`).join('')}
    </div>
  `;
}

// ── Exportar reporte HTML con diseño de marca ──
function exportarReporte() {
  const logoEl  = document.querySelector('.login-card-logo') || document.querySelector('.sidebar-brand-logo');
  const logoSrc = logoEl ? logoEl.src : '';
  const today   = fmtFechaLarga(new Date().toISOString().slice(0,10));

  const filas = orders.map(function(o) {
    const { sub, iva, total } = calcOrderTotals(o);
    return '<tr>'
      + '<td>' + o.id + '</td>'
      + '<td>' + fmtFecha(o.date) + '</td>'
      + '<td><strong>' + o.client + '</strong><br><small>' + (o.company||'') + '</small></td>'
      + '<td>' + (o.email||'') + '</td>'
      + '<td style="text-align:center"><span class="badge-' + o.status + '">' + statusLabel(o.status) + '</span></td>'
      + '<td style="text-align:right">' + (total > 0 ? '$' + fmt(total) : '—') + '</td>'
      + '</tr>';
  }).join('');

  const cnt   = function(s) { return orders.filter(function(o){ return o.status===s; }).length; };
  const totalV = function(s) { return orders.filter(function(o){ return o.status===s; }).reduce(function(sum,o){ return sum + calcOrderTotals(o).total; }, 0); };

  const html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
    + '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">'
    + '<title>Reporte — Distribuciones Estratégicas de la Costa</title>'
    + '<style>'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:Outfit,Arial,sans-serif;background:#fff;color:#1D1D1F;padding:32px;font-size:13px}'
    + '.header{background:#1C2B3A;border-radius:12px;padding:24px 28px;display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}'
    + '.header img{height:72px;object-fit:contain}'
    + '.header-info{text-align:right;color:rgba(255,255,255,0.9)}'
    + '.header-title{font-size:18px;font-weight:800;color:#fff}'
    + '.header-sub{font-size:11px;color:#49C9F4;letter-spacing:1px;text-transform:uppercase;margin-top:2px}'
    + '.header-date{font-size:12px;color:rgba(255,255,255,0.6);margin-top:8px}'
    + '.line{height:3px;background:linear-gradient(90deg,#49C9F4,#0872E6);margin-bottom:24px;border-radius:0 0 4px 4px}'
    + '.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}'
    + '.kpi{background:#F8F9FA;border-radius:10px;padding:14px 16px;border-left:3px solid #49C9F4}'
    + '.kpi .lbl{font-size:11px;color:#6E6E73;text-transform:uppercase;letter-spacing:0.5px}'
    + '.kpi .val{font-size:22px;font-weight:800;color:#1C2B3A;margin-top:4px}'
    + '.kpi .sub{font-size:11px;color:#6E6E73;margin-top:2px}'
    + 'table{width:100%;border-collapse:collapse;margin-bottom:24px}'
    + 'thead tr{background:#1C2B3A}'
    + 'th{padding:10px 12px;font-size:11px;font-weight:700;color:#49C9F4;text-align:left;letter-spacing:0.5px}'
    + 'td{padding:10px 12px;border-bottom:1px solid #F0F0F0;vertical-align:middle}'
    + 'tr:nth-child(even) td{background:#F8F9FA}'
    + 'small{font-size:11px;color:#6E6E73;display:block}'
    + '.badge-pending{background:#FFF4E5;color:#854F0B;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700}'
    + '.badge-quoted{background:#E6F1FB;color:#185FA5;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700}'
    + '.badge-approved{background:#EAF3DE;color:#3B6D11;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700}'
    + '.badge-dispatched{background:#F0F0F0;color:#424245;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700}'
    + '.footer{border-top:1px solid #E8E8EA;padding-top:14px;display:flex;justify-content:space-between;color:#B4B2A9;font-size:11px}'
    + '@media print{body{padding:16px}.no-print{display:none}@page{margin:1cm}}'
    + '</style></head><body>'

    + '<div class="header">'
    + '<div>'
    + (logoSrc ? '<img src="' + logoSrc + '" alt="Logo">' : '<div style="font-size:20px;font-weight:800;color:#fff">Distribuciones Estratégicas</div>')
    + '</div>'
    + '<div class="header-info">'
    + '<div class="header-title">Reporte de Pedidos</div>'
    + '<div class="header-sub">Distribuciones Estratégicas de la Costa S.A.S</div>'
    + '<div class="header-date">Generado el ' + today + '</div>'
    + '</div></div>'
    + '<div class="line"></div>'

    + '<div class="kpis">'
    + '<div class="kpi"><div class="lbl">Total pedidos</div><div class="val">' + orders.length + '</div><div class="sub">En el sistema</div></div>'
    + '<div class="kpi"><div class="lbl">Nuevos</div><div class="val">' + cnt('pending') + '</div><div class="sub">Sin cotizar</div></div>'
    + '<div class="kpi"><div class="lbl">Aprobados</div><div class="val">' + cnt('approved') + '</div><div class="sub">$' + fmt(totalV('approved')) + '</div></div>'
    + '<div class="kpi"><div class="lbl">Despachados</div><div class="val">' + cnt('dispatched') + '</div><div class="sub">$' + fmt(totalV('dispatched')) + '</div></div>'
    + '</div>'

    + '<button class="no-print" onclick="window.print()" style="background:#1C2B3A;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:20px;font-family:Outfit,Arial,sans-serif">🖨️ Imprimir / Guardar PDF</button>'

    + '<table>'
    + '<thead><tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Email</th><th>Estado</th><th style="text-align:right">Total</th></tr></thead>'
    + '<tbody>' + filas + '</tbody>'
    + '</table>'

    + '<div class="footer">'
    + '<span>Distribuciones Estratégicas de la Costa S.A.S — distribucionesestrategicasco@gmail.com — (57) 321 896 5745</span>'
    + '<span>' + orders.length + ' registro(s) — ' + today + '</span>'
    + '</div>'
    + '</body></html>';

  const win = window.open('', '_blank', 'width=1000,height=800');
  win.document.write(html);
  win.document.close();
  showAdminToast('📊 Reporte generado — usa "Guardar como PDF" al imprimir');
}

// ── Pedidos nuevos ─────────────────────────────

function renderPedidos() {
  const all     = filterOrders(orders);
  const pending = all.filter(o => o.status === 'pending');
  return `
    <div class="admin-header">
      <div>
        <h1>Pedidos</h1>
        <p>${pending.length} pedido(s) sin cotizar · ${orders.length} total</p>
      </div>
      <button onclick="exportarReporte()" style="background:var(--brand-navy);color:#fff;border:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer" ${currentUser && currentUser.rol === 'administrador' ? '' : 'hidden'}>⬇️ Exportar</button>
    </div>
    <div class="section-card">
      <div class="section-card-head">
        <h3>Solicitudes de Cotización</h3>
        <span class="badge badge-new">${pending.length} nuevos</span>
      </div>
      ${buildSearchBar('Buscar por cliente, empresa, email...')}
      ${buildDateFilter()}
      ${pending.length === 0
        ? '<div class="section-empty">' + (adminSearch ? 'Sin resultados para "' + adminSearch + '"' : 'No hay pedidos pendientes ✓') + '</div>'
        : `<table>
            <thead>
              <tr><th>ID</th><th>Cliente</th><th>Contacto</th><th>Fecha</th><th>Productos</th><th>Acción</th></tr>
            </thead>
            <tbody>
              ${pending.map(o => `
                <tr>
                  <td><strong>${o.id}</strong></td>
                  <td>${o.client}<small>${o.company||''}</small></td>
                  <td>${o.email}<small>${o.phone||''}</small></td>
                  <td>${fmtFecha(o.date)}</td>
                  <td><ul>${o.items.map(i => '<li>' + i.name + ' ×' + i.qty + '</li>').join('')}</ul>
                    ${renderHistorial(o)}
                  </td>
                  <td>
                    <button class="action-link" onclick="openQuotePanel('${o.id}')">Cotizar →</button>
                    ${currentUser && currentUser.rol === 'administrador' ? `
                      <button class="action-link" style="color:var(--brand-blue);margin-left:8px" onclick="editarPedido('${o.id}')">✏️</button>
                      <button class="action-link" style="color:#A32D2D;margin-left:4px" onclick="eliminarPedido('${o.id}')">🗑</button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}
    </div>
  `;
}

// ── Cotizaciones ───────────────────────────────

function renderCotizaciones() {
  const all    = filterOrders(orders);
  const quoted = all.filter(o => o.status === 'quoted');
  return `
    <div class="admin-header">
      <div>
        <h1>Cotizaciones</h1>
        <p>${quoted.length} esperando aprobación del cliente</p>
      </div>
      <button onclick="exportarReporte()" style="background:var(--brand-navy);color:#fff;border:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer" ${currentUser && currentUser.rol === 'administrador' ? '' : 'hidden'}>⬇️ Exportar</button>
    </div>
    <div class="section-card">
      <div class="section-card-head"><h3>En Espera de Aprobación</h3></div>
      ${buildSearchBar('Buscar cotización...')}
      ${buildDateFilter()}
      ${quoted.length === 0
        ? '<div class="section-empty">' + (adminSearch ? 'Sin resultados para "' + adminSearch + '"' : 'No hay cotizaciones pendientes') + '</div>'
        : `<table>
            <thead>
              <tr><th>ID</th><th>Cliente</th><th>Total Cotizado</th><th>Fecha</th><th>Días espera</th><th>Acción</th></tr>
            </thead>
            <tbody>
              ${quoted.map(o => {
                const { total } = calcOrderTotals(o);
                const dias = Math.floor((new Date() - new Date(o.date)) / 86400000);
                const diasColor = dias >= 3 ? '#A32D2D' : dias >= 2 ? '#B45309' : 'var(--text-soft)';
                return `
                  <tr>
                    <td><strong>${o.id}</strong></td>
                    <td>${o.client}<small>${o.company||''}</small></td>
                    <td><strong>$${fmt(total)}</strong><small>IVA incluido</small></td>
                    <td>${fmtFecha(o.date)}</td>
                    <td style="font-weight:700;color:${diasColor}">${dias}d</td>
                    <td>
                      <button class="action-link muted" onclick="openQuotePanel('${o.id}')">Ver →</button>
                      <button class="action-link" style="color:#854F0B;margin-left:4px" onclick="enviarRecordatorio('${o.id}')">📧 Recordar</button>
                      ${currentUser && currentUser.rol === 'administrador' ? `
                        <button class="action-link" style="color:var(--brand-blue);margin-left:4px" onclick="editarPedido('${o.id}')">✏️</button>
                        <button class="action-link" style="color:#A32D2D;margin-left:4px" onclick="eliminarPedido('${o.id}')">🗑</button>
                      ` : ''}
                    </td>
                  </tr>
                  ${o.historial && o.historial.length ? '<tr><td colspan="6" style="padding:0 12px 8px;border:none">' + renderHistorial(o) + '</td></tr>' : ''}
                `;
              }).join('')}
            </tbody>
          </table>`}
    </div>
  `;
}

// ── Órdenes aprobadas ──────────────────────────

function renderOrdenes() {
  const all      = filterOrders(orders);
  const approved = all.filter(o => o.status === 'approved');
  return `
    <div class="admin-header">
      <div>
        <h1>Órdenes Aprobadas</h1>
        <p>${approved.length} orden(es) lista(s) para despacho</p>
      </div>
      <button onclick="exportarReporte()" style="background:var(--brand-navy);color:#fff;border:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer" ${currentUser && currentUser.rol === 'administrador' ? '' : 'hidden'}>⬇️ Exportar</button>
    </div>
    <div class="section-card">
      <div class="section-card-head"><h3>Órdenes de Compra Confirmadas</h3></div>
      ${buildSearchBar('Buscar orden...')}
      ${buildDateFilter()}
      ${approved.length === 0
        ? '<div class="section-empty">' + (adminSearch ? 'Sin resultados' : 'No hay órdenes aprobadas') + '</div>'
        : `<table>
            <thead>
              <tr><th>ID</th><th>Cliente</th><th>Total</th><th>Ciudad</th><th>Fecha req.</th><th>Acción</th></tr>
            </thead>
            <tbody>
              ${approved.map(o => {
                const { total } = calcOrderTotals(o);
                return `
                  <tr>
                    <td><strong>${o.id}</strong></td>
                    <td>${o.client}<small>${o.company||''}</small></td>
                    <td><strong>$${fmt(total)}</strong></td>
                    <td>${o.city||'—'}</td>
                    <td>${fmtFecha(o.fechaRequerida)}</td>
                    <td>
                      <button class="action-link" onclick="openRemision('${o.id}')">🚚 Remisión</button>
                      ${currentUser && currentUser.rol === 'administrador' ? `
                        <button class="action-link" style="color:var(--brand-blue);margin-left:4px" onclick="editarPedido('${o.id}')">✏️</button>
                        <button class="action-link" style="color:#A32D2D;margin-left:4px" onclick="eliminarPedido('${o.id}')">🗑</button>
                      ` : ''}
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>`}
    </div>
  `;
}

// ── Remisiones ─────────────────────────────────

function renderRemisiones() {
  const all        = filterOrders(orders);
  const dispatched = all.filter(o => o.status === 'dispatched' || o.status === 'delivered');
  const delivered  = all.filter(o => o.status === 'delivered');
  const totalVal   = dispatched.reduce((s, o) => s + calcOrderTotals(o).total, 0);

  return `
    <div class="admin-header">
      <div>
        <h1>Remisiones</h1>
        <p>${dispatched.length} despacho(s) · ${delivered.length} entregado(s)</p>
      </div>
      <button onclick="exportarReporte()" style="background:var(--brand-navy);color:#fff;border:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer" ${currentUser && currentUser.rol === 'administrador' ? '' : 'hidden'}>⬇️ Exportar</button>
    </div>
    <div class="section-card">
      <div class="section-card-head"><h3>Historial de Despachos</h3></div>
      ${buildSearchBar('Buscar remisión...')}
      ${buildDateFilter()}
      ${dispatched.length === 0
        ? '<div class="section-empty">' + (adminSearch ? 'Sin resultados' : 'No hay remisiones generadas') + '</div>'
        : `<table>
            <thead>
              <tr><th>ID</th><th>Cliente</th><th>Empresa</th><th>Total</th><th>Fecha</th><th>Estado</th><th>Acción</th></tr>
            </thead>
            <tbody>
              ${dispatched.map(o => {
                const { total } = calcOrderTotals(o);
                const isDelivered = o.status === 'delivered';
                                return `
                  <tr>
                    <td><strong>${o.id}</strong></td>
                    <td>${o.client}</td>
                    <td>${o.company||'—'}</td>
                    <td>$${fmt(total)}</td>
                    <td>${fmtFecha(o.date)}</td>
                    <td>
                      <span class="badge ${isDelivered ? 'badge-delivered' : 'badge-dispatched'}">${isDelivered ? 'Entregado' : 'Despachado'}</span>
                            </td>
                    <td>
                      <button class="action-link" onclick="openRemision('${o.id}')">Ver →</button>
                      ${!isDelivered ? `<button class="action-link" style="color:#3B6D11;margin-left:6px" onclick="marcarEntregado('${o.id}')">✅ Entregado</button>` : ''}
                      ${currentUser && currentUser.rol === 'administrador' ? `
                        <button class="action-link" style="color:#A32D2D;margin-left:6px" onclick="eliminarPedido('${o.id}')">🗑</button>
                      ` : ''}
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>`}
    </div>
  `;
}



// ── Entregados ─────────────────────────────────

// ── Soportes de entrega (Google Drive via Apps Script) ──────────────────────

// ── Entregados — Supabase Storage (persistente) ─────────────

var SUPA_URL    = 'https://jnxsofraqshxjboukiab.supabase.co';
var SUPA_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';
var SUPA_BUCKET = 'entregados';

// Cache local: { orderId: [{name, fileId, url, path, uploadedAt}] }
var deliveryDocs       = {};
var deliveryDocsLoaded = false;

// ── Cargar docs desde Supabase Storage (persistente, no depende del Sheet) ──
function loadAllDeliveryDocs(cb) {
  if (deliveryDocsLoaded) { if (cb) cb(); return; }

  var delivered = (orders || []).filter(function(o) { return o.status === 'delivered'; });
  if (delivered.length === 0) { deliveryDocsLoaded = true; if (cb) cb(); return; }

  var pending = delivered.length;
  var done    = 0;

  // La API de Supabase Storage list: POST /storage/v1/object/list/{bucket}
  // El prefix va en el body, NO en la URL
  var listUrl = SUPA_URL + '/storage/v1/object/list/' + SUPA_BUCKET;

  delivered.forEach(function(o) {
    fetch(listUrl, {
      method:  'POST',
      headers: {
        'Authorization': 'Bearer ' + SUPA_ANON,
        'apikey':        SUPA_ANON,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ limit: 100, offset: 0, prefix: o.id })
    })
    .then(function(r) { return r.json(); })
    .then(function(files) {
      console.log('Supabase list [' + o.id + ']:', JSON.stringify(files));
      if (!Array.isArray(files)) {
        console.error('❌ List no devolvió array:', files);
        return;
      }
      if (Array.isArray(files) && files.length > 0) {
        var existing = deliveryDocs[o.id] || [];
        files.forEach(function(file) {
          if (!file.name) return;
          var path      = o.id + '/' + file.name;
          // Usar el path como fileId estable (no depende de file.id que puede ser undefined)
          var fileId    = 'supa_' + path.replace(/[^a-zA-Z0-9]/g, '_');
          var publicUrl = SUPA_URL + '/storage/v1/object/public/' + SUPA_BUCKET + '/' + path;
          if (!existing.some(function(d) { return d.path === path; })) {
            existing.push({ name: file.name, fileId: fileId, url: publicUrl, path: path, uploadedAt: file.created_at || '' });
          }
        });
        deliveryDocs[o.id] = existing;
        refreshSoporteCell(o.id);
      }
    })
    .catch(function(e) { console.warn('loadDocs ' + o.id + ':', e); })
    .finally(function() {
      done++;
      if (done === pending) { deliveryDocsLoaded = true; if (cb) cb(); }
    });
  });
}

// ── Subir PDF a Supabase Storage ──────────────────────────────
function uploadDocToSupabase(orderId, file, onDone) {
  if (!deliveryDocs[orderId]) deliveryDocs[orderId] = [];
  var tempId = 'tmp_' + Date.now();
  deliveryDocs[orderId].push({ name: file.name, fileId: tempId, url: '#', uploading: true });
  refreshSoporteCell(orderId);

  var safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  var path      = orderId + '/' + Date.now() + '_' + safeName;
  var uploadUrl = SUPA_URL + '/storage/v1/object/' + SUPA_BUCKET + '/' + path;

  console.log('📤 Subiendo a Supabase:', uploadUrl);

  fetch(uploadUrl, {
    method:  'POST',
    headers: {
      'Authorization': 'Bearer ' + SUPA_ANON,
      'apikey':        SUPA_ANON,
      'Content-Type':  'application/octet-stream',
      'x-upsert':      'true'
    },
    body: file
  })
  .then(function(r) {
    console.log('📤 Supabase upload response status:', r.status);
    if (!r.ok) return r.text().then(function(t) {
      console.error('📤 Supabase upload error body:', t);
      throw new Error('HTTP ' + r.status + ' — ' + t.slice(0,200));
    });
    return r.json();
  })
  .then(function(data) {
    console.log('✅ Supabase upload OK:', data);
    var publicUrl = SUPA_URL + '/storage/v1/object/public/' + SUPA_BUCKET + '/' + path;
    var fileId    = 'doc_' + Date.now();
    deliveryDocs[orderId] = (deliveryDocs[orderId] || []).filter(function(d) { return d.fileId !== tempId; });
    deliveryDocs[orderId].push({ name: file.name, fileId: fileId, url: publicUrl, path: path, uploadedAt: new Date().toISOString() });
    refreshSoporteCell(orderId);
    if (onDone) onDone();
  })
  .catch(function(err) {
    console.error('❌ Supabase upload FALLÓ:', err.message);
    showAdminToast('❌ Error Supabase: ' + err.message);
    // NO fallback a memoria — queremos ver el error real
    deliveryDocs[orderId] = (deliveryDocs[orderId] || []).filter(function(d) { return d.fileId !== tempId; });
    refreshSoporteCell(orderId);
    if (onDone) onDone();
  });
}

// ── Eliminar PDF de Supabase ──────────────────────────────────
function deleteDeliveryDoc(orderId, fileId, filePath) {
  // Construir el path correcto si no viene
  var resolvedPath = filePath;
  if (!resolvedPath) {
    var docs = deliveryDocs[orderId] || [];
    var doc  = docs.find(function(d) { return d.fileId === fileId; });
    if (doc) resolvedPath = doc.path;
  }

  console.log('🗑 Eliminando de Supabase:', resolvedPath);

  if (resolvedPath) {
    fetch(SUPA_URL + '/storage/v1/object/' + SUPA_BUCKET + '/' + resolvedPath, {
      method:  'DELETE',
      headers: { 'Authorization': 'Bearer ' + SUPA_ANON, 'apikey': SUPA_ANON }
    })
    .then(function(r) {
      console.log('🗑 Supabase delete status:', r.status);
    })
    .catch(function(e) { console.warn('Supabase delete error:', e); });
  } else {
    console.warn('🗑 No se encontró path para fileId:', fileId);
  }

  if (deliveryDocs[orderId]) {
    deliveryDocs[orderId] = deliveryDocs[orderId].filter(function(d) { return d.fileId !== fileId; });
  }
  deliveryDocsLoaded = false;
}

// ── Celda de soportes ─────────────────────────────────────────
function renderSoporteCell(orderId) {
  var docs    = deliveryDocs[orderId] || [];
  var inputId = 'pdf-inp-' + orderId;
  var html = '<input type="file" id="' + inputId + '" accept="application/pdf" multiple style="display:none" onchange="handlePdfInput(\'' + orderId + '\',this)">';

  if (docs.length > 0) {
    html += '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:4px">';
    docs.forEach(function(doc, idx) {
      if (doc.uploading) {
        html += '<div style="background:#FFF8E1;border:1px solid #FFD54F;border-radius:6px;padding:4px 8px;font-size:11px;color:#795548">⏳ Subiendo: ' + doc.name + '</div>';
      } else {
        html += '<div style="display:flex;align-items:center;gap:5px;background:#F0FBF4;border:1px solid #C6EDD4;border-radius:6px;padding:3px 8px">'
          + '<span style="font-size:11px;color:#1D6B35;font-weight:600;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + doc.name + '">📄 ' + doc.name + '</span>'
          + '<button class="action-link" style="font-size:11px" onclick="previewDeliveryDoc(\'' + orderId + '\',' + idx + ')">👁 Ver</button>'
          + '<a href="' + doc.url + '" target="_blank" style="font-size:11px;color:var(--brand-blue);font-weight:700;text-decoration:none">⬇️</a>'
          + '<button class="action-link" style="color:#E53E3E;font-size:11px" onclick="removeDeliveryDoc(\'' + orderId + '\',\'' + doc.fileId + '\',\'' + (doc.path||'') + '\')">✕</button>'
          + '</div>';
      }
    });
    html += '</div>';
  }

  html += '<button onclick="document.getElementById(\'' + inputId + '\').click()" style="background:#F5F5F7;border:1.5px dashed #C0C0C5;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:600;color:#1D1D1F;cursor:pointer;font-family:inherit">'
    + (docs.length > 0 ? '➕ Agregar PDF' : '📎 Adjuntar PDF') + '</button>';
  return html;
}

function refreshSoporteCell(orderId) {
  var cell = document.getElementById('soporte-cell-' + orderId);
  if (cell) cell.innerHTML = renderSoporteCell(orderId);
}

function handlePdfInput(orderId, input) {
  var files = Array.from(input.files);
  if (!files.length) return;
  var errors = [];
  var toUpload = files.filter(function(f) {
    if (f.type !== 'application/pdf') { errors.push(f.name + ': no es PDF'); return false; }
    if (f.size > 5 * 1024 * 1024)    { errors.push(f.name + ': supera 5MB'); return false; }
    return true;
  });
  if (errors.length) showAdminToast('⚠️ ' + errors.join(' | '));
  if (!toUpload.length) return;
  showAdminToast('⏫ Subiendo ' + toUpload.length + ' PDF(s)...');
  var done = 0;
  toUpload.forEach(function(file) {
    uploadDocToSupabase(orderId, file, function() {
      done++;
      if (done === toUpload.length) showAdminToast('✅ ' + toUpload.length + ' soporte(s) guardado(s)');
    });
  });
  input.value = '';
}

function removeDeliveryDoc(orderId, fileId, filePath) {
  var docs = deliveryDocs[orderId] || [];
  var doc  = docs.find(function(d) { return d.fileId === fileId; });
  if (!confirm('¿Eliminar "' + (doc ? doc.name : fileId) + '"?')) return;

  var resolvedPath = filePath || (doc ? doc.path : null);
  console.log('🗑 Eliminando path:', resolvedPath);

  if (!resolvedPath) {
    showAdminToast('⚠️ No se encontró el path del archivo');
    return;
  }

  fetch(SUPA_URL + '/storage/v1/object/' + SUPA_BUCKET + '/' + resolvedPath, {
    method:  'DELETE',
    headers: { 'Authorization': 'Bearer ' + SUPA_ANON, 'apikey': SUPA_ANON }
  })
  .then(function(r) {
    console.log('🗑 DELETE status:', r.status);
    if (r.ok || r.status === 200 || r.status === 204) {
      // Éxito — borrar del cache
      if (deliveryDocs[orderId]) {
        deliveryDocs[orderId] = deliveryDocs[orderId].filter(function(d) { return d.fileId !== fileId; });
      }
      deliveryDocsLoaded = false;
      refreshSoporteCell(orderId);
      showAdminToast('🗑 Soporte eliminado correctamente');
    } else {
      return r.text().then(function(t) {
        console.error('❌ DELETE falló:', r.status, t);
        showAdminToast('❌ No se pudo eliminar (HTTP ' + r.status + '). Verifica políticas en Supabase.');
      });
    }
  })
  .catch(function(err) {
    console.error('❌ DELETE error:', err);
    showAdminToast('❌ Error de conexión al eliminar');
  });
}

function previewDeliveryDoc(orderId, idx) {
  var docs = deliveryDocs[orderId] || [];
  if (docs.length === 0) return showAdminToast('⚠️ Sin documentos');
  // Si hay varios, mostrar selector
  if (docs.length > 1 && idx === undefined) {
    var existing = document.getElementById('doc-select-modal');
    if (existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = 'doc-select-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;padding:16px';
    var card = document.createElement('div');
    card.style.cssText = 'background:#1C2B3A;border-radius:16px;padding:28px;min-width:320px;max-width:480px;width:90%';
    var h3 = document.createElement('h3');
    h3.style.cssText = 'color:#fff;font-size:16px;font-weight:700;margin:0 0 16px;font-family:Outfit,sans-serif';
    h3.textContent = '📄 Seleccionar soporte';
    card.appendChild(h3);
    docs.forEach(function(d, i) {
      var btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;background:rgba(255,255,255,0.07);border:1px solid rgba(73,201,244,0.3);border-radius:10px;padding:12px 14px;margin-bottom:8px;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:Outfit,sans-serif;text-align:left';
      btn.innerHTML = '<span style="font-size:18px">📄</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + d.name + '</span><span style="color:#49C9F4;font-size:12px">Abrir →</span>';
      btn.onclick = function() { modal.remove(); window.open(d.url, '_blank'); };
      card.appendChild(btn);
    });
    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'width:100%;margin-top:8px;background:transparent;border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:10px;color:#B4B2A9;font-size:13px;cursor:pointer;font-family:Outfit,sans-serif';
    closeBtn.textContent = 'Cancelar';
    closeBtn.onclick = function() { modal.remove(); };
    card.appendChild(closeBtn);
    modal.appendChild(card);
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
    return;
  }
  var doc = docs[idx !== undefined ? idx : 0];
  if (doc) window.open(doc.url, '_blank');
}

function renderEntregados() {
  var all       = filterOrders(orders || []);
  var delivered = all.filter(function(o) { return o.status === 'delivered'; });
  var totalVal  = delivered.reduce(function(s, o) { return s + calcOrderTotals(o).total; }, 0);

  loadAllDeliveryDocs();

  var html = '<div class="admin-header"><div>'
    + '<h1 class="admin-title">Entregados</h1>'
    + '<p class="admin-subtitle">' + delivered.length + ' pedido(s) entregado(s)</p>'
    + '</div></div>';

  if (delivered.length === 0) {
    html += '<div class="section-card"><div style="text-align:center;padding:48px;color:var(--text-soft)">'
      + '<div style="font-size:48px;margin-bottom:16px">📦</div>'
      + '<h3 style="font-size:18px;font-weight:700;margin-bottom:8px">No hay pedidos entregados aún</h3>'
      + '<p>Marca un pedido como entregado desde Remisiones.</p>'
      + '</div></div>';
    return html;
  }

  html += '<div class="section-card" style="overflow-x:auto"><table class="admin-table"><thead><tr>'
    + '<th>N° Pedido</th><th>Cliente</th><th>Empresa</th><th>Total</th>'
    + '<th>Fecha</th><th>Soportes PDF</th><th>Acciones</th>'
    + '</tr></thead><tbody>';

  delivered.forEach(function(o) {
    var t = calcOrderTotals(o);
    html += '<tr>'
      + '<td><strong>' + o.id + '</strong></td>'
      + '<td>' + (o.client || '—') + (o.email ? '<br><span style="font-size:11px;color:var(--text-soft)">' + o.email + '</span>' : '') + '</td>'
      + '<td>' + (o.company || '—') + '</td>'
      + '<td style="color:var(--brand-blue);font-weight:700">$' + fmt(t.total) + '</td>'
      + '<td>' + (o.date ? fmtFecha(o.date) : '—') + '</td>'
      + '<td id="soporte-cell-' + o.id + '">' + renderSoporteCell(o.id) + '</td>'
      + '<td>'
      + '<button onclick="notificarEntregaCliente(\'' + o.id + '\')" style="background:var(--brand-cyan);color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">📧 Notificar</button>'
      + (currentUser && currentUser.rol === 'administrador'
          ? '<br><button class="action-link" style="color:#E53E3E;font-size:11px;margin-top:4px" onclick="eliminarPedido(\'' + o.id + '\')">🗑 Eliminar</button>'
          : '')
      + '</td>'
      + '</tr>';
  });

  html += '</tbody></table></div>';
  html += '<div class="section-card" style="display:flex;justify-content:flex-end;align-items:center;gap:12px;padding:16px 20px">'
    + '<span style="font-size:14px;color:var(--text-soft)">Total entregado:</span>'
    + '<span style="font-size:20px;font-weight:800;color:var(--brand-blue)">$' + fmt(totalVal) + '</span>'
    + '</div>';
  return html;
}


// ── Notificar entrega al cliente ───────────────
function notificarEntregaCliente(orderId) {
  var o = orders.find(function(x) { return x.id === orderId; });
  if (!o) return;

  if (!o.email) {
    showAdminToast('⚠️ Este pedido no tiene email registrado.');
    return;
  }

  var docs = deliveryDocs[orderId] || [];

  showAdminToast('📧 Preparando notificación...');

  // Descargar PDFs de Supabase como base64
  var pdfPromises = docs.map(function(doc) {
    return fetch(doc.url, {
      headers: {
        'Authorization': 'Bearer ' + SUPA_ANON,
        'apikey': SUPA_ANON
      }
    })
    .then(function(r) { return r.arrayBuffer(); })
    .then(function(buf) {
      var bytes = new Uint8Array(buf);
      var binary = '';
      for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return { name: doc.name, base64: btoa(binary) };
    })
    .catch(function(e) {
      console.warn('No se pudo descargar PDF:', doc.name, e);
      return null;
    });
  });

  Promise.all(pdfPromises).then(function(pdfs) {
    var pdfsOk = pdfs.filter(function(p) { return p !== null; });

    // Campos que espera el Apps Script (to_email, to_name, etc.)
    var payload = {
      action:        'sendDeliveryEmail',
      order_id:      o.id,
      to_email:      o.email,
      to_name:       o.client  || 'Cliente',
      company:       o.company || '',
      products:      (o.items || []).map(function(i) {
                       return i.name + ' x' + i.qty + (i.price ? ' - $' + fmt(i.price * i.qty) : '');
                     }).join(', '),
      total:         '$' + fmt(calcOrderTotals(o).total),
      fecha_entrega: fmtFecha(o.date),
      pdfs:          pdfsOk,
    };

    // Usar cors normal para ver errores reales
    fetch(SHEETS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(payload),
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.status === 'ok') {
        showAdminToast('✅ Email enviado a ' + o.email);
      } else {
        showAdminToast('⚠️ Apps Script: ' + (res.msg || 'Error desconocido'));
        console.error('sendDeliveryEmail error:', res);
      }
    })
    .catch(function(err) {
      // CORS error — significa que el Apps Script recibió la petición igual
      // (no-cors fallback silencioso)
      console.warn('CORS/red:', err);
      showAdminToast('📧 Solicitud enviada a ' + o.email);
    });
  });
}

function marcarEntregado(orderId) {
  if (!confirm('¿Confirmar entrega del pedido ' + orderId + '?')) return;
  var o = orders.find(function(x) { return x.id === orderId; });
  if (o) { o.status = 'delivered'; addHistorial(orderId, 'delivered'); }
  fetch(SHEETS_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'updateStatus', order_id: orderId, status: 'Entregado' })
  }).catch(function(e) { console.warn(e); });
  renderLocalSection();
  showAdminToast('✅ Pedido ' + orderId + ' marcado como Entregado');
}

// ── Panel de cotización ────────────────────────

function openQuotePanel(orderId) {
  currentOrderId = orderId;
  const o = orders.find(x => x.id === orderId);

  document.getElementById('quote-modal-title').textContent = `Cotizar ${orderId}`;
  document.getElementById('quote-modal-sub').textContent   = `Cliente: ${o.client} - ${o.email}`;

  document.getElementById('quote-modal-body').innerHTML = `
    <div class="form-note">
      💡 Asigna el precio unitario (sin IVA) de cada producto. Al guardar se enviará la cotización al cliente.
    </div>

    <table class="quote-items-table">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cant.</th>
          <th>Precio Unit. (sin IVA)</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${o.items.map((item, idx) => `
          <tr id="qrow-${idx}">
            <td><strong>${item.icon || '📦'} ${item.name}</strong></td>
            <td>${item.qty}</td>
            <td>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="color:var(--text-soft);font-weight:600">$</span>
                <input
                  class="price-input"
                  type="number"
                  min="0"
                  placeholder="0"
                  value="${item.price || ''}"
                  oninput="updateQuoteRow(${idx}, this.value, '${orderId}')"
                >
              </div>
            </td>
            <td id="qsub-${idx}"><span style="color:var(--text-soft)">—</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="quote-totals">
      <div class="quote-total-row"><span class="ql">Subtotal</span><span class="qv" id="q-sub">$0</span></div>
      <div class="quote-total-row"><span class="ql">IVA (19%)</span><span class="qv" id="q-iva">$0</span></div>
      <div class="quote-total-row big"><span>TOTAL</span><span class="qv" id="q-total">$0</span></div>
    </div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">
      <button class="send-quote-btn" onclick="sendQuote('${orderId}')">
        📧 Enviar Cotización al Cliente
      </button>
      <button
        style="background:var(--bg);border:none;padding:14px 24px;border-radius:var(--radius-md);font-size:15px;font-weight:700;cursor:pointer"
        onclick="closeModal('quote-modal')">
        Cancelar
      </button>
    </div>
  `;

  // Recalcular si ya hay precios cargados
  o.items.forEach((_, idx) => {
    if (o.items[idx].price > 0) updateQuoteRow(idx, o.items[idx].price, orderId);
  });

  openModal('quote-modal');
}

function updateQuoteRow(idx, val, orderId) {
  const o    = orders.find(x => x.id === orderId);
  o.items[idx].price = parseFloat(val) || 0;

  const sub    = o.items[idx].price * o.items[idx].qty;
  const subEl  = document.getElementById('qsub-' + idx);
  if (subEl) subEl.innerHTML = `<strong>$${fmt(sub)}</strong>`;

  recalcQuoteTotals(orderId);
}

function recalcQuoteTotals(orderId) {
  const o             = orders.find(x => x.id === orderId);
  const { sub, iva, total } = calcOrderTotals(o);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = '$' + fmt(val); };
  set('q-sub',   sub);
  set('q-iva',   iva);
  set('q-total', total);
}

function sendQuote(orderId) {
  const o = orders.find(x => x.id === orderId);
  const allPriced = o.items.every(i => i.price > 0);

  if (!allPriced) {
    alert('Por favor asigna precio a todos los productos.');
    return;
  }

  const btn = document.querySelector('.send-quote-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando...'; }

  const { sub, iva, total } = calcOrderTotals(o);

  const productosTexto = o.items
    .map(i => '• ' + i.name + ' x' + i.qty + '  —  $' + fmt(i.price * i.qty) + ' (c/u $' + fmt(i.price) + ')')
    .join('\n');

  // Link de aprobación — apunta al Apps Script con los datos del pedido
  const approvalLink = SHEETS_URL
    + '?action=approve_page'
    + '&order_id=' + encodeURIComponent(orderId)
    + '&cliente='  + encodeURIComponent(o.client)
    + '&total='    + encodeURIComponent(fmt(total));

  const trackLink = 'tracking.html?id=' + encodeURIComponent(orderId);

  const quoteParams = {
    to_email:      o.email,
    to_name:       o.client,
    order_id:      orderId,
    cliente:       o.client,
    empresa:       o.company || o.client,
    productos:     productosTexto,
    subtotal:      fmt(sub),
    iva:           fmt(iva),
    total:         fmt(total),
    approval_link: approvalLink,
    track_link:    trackLink,
  };

  emailjs.send(EMAILJS_SERVICE, EMAILJS_CLIENT_T, quoteParams)
    .then(function() {
      o.status       = 'quoted';
      o.sheetSubtotal = sub;
      o.sheetIva      = iva;
      o.sheetTotal    = total;
      addHistorial(orderId, 'quoted');

      // Actualizar estado y totales en Google Sheets
      fetch(SHEETS_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action:   'updateQuote',
          order_id: orderId,
          status:   'Cotizado',
          subtotal: sub,
          iva:      iva,
          total:    total,
        }),
      }).catch(err => console.warn(err));

      closeModal('quote-modal');
      renderLocalSection();
      showAdminToast('✅ Cotización ' + orderId + ' enviada a ' + o.email);
    })
    .catch(function(err) {
      console.error('EmailJS error:', err);
      if (btn) { btn.disabled = false; btn.textContent = '📧 Enviar Cotización al Cliente'; }
      alert('Error al enviar. Verifica tu conexión e inténtalo de nuevo.');
    });
}

function simulateApprove(orderId) {
  if (!confirm('¿Simular que el cliente aprobó la cotización?')) return;
  const o = orders.find(x => x.id === orderId);
  if (o) { o.status = 'approved'; addHistorial(orderId, 'approved'); }
  renderLocalSection();
  showAdminToast('✅ Orden ' + orderId + ' aprobada.');
}

// ── Remisión ───────────────────────────────────

function openRemision(orderId) {
  const o      = orders.find(x => x.id === orderId);
  const remNum = 'REM-' + orderId.replace('DIST-', '');
  const today  = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const logo   = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAEnCAYAAADYYZpIAACrAUlEQVR42uxdd5wcZf1+vu87M7t7/S659F4hIbTQi0lEBFRseEFsqCgIiIpiVy4HothARVEQC3bvfqIgggqYBKQpKC2BBEJIveSSXN0+877f3x9TdnZvLyR0yfvks7m73dlpu/PMtz5fwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDgVQIyp+DlRXt7u8DixaJjyQoNdOi2TpZd6EIb2szJeRb0tK6gxVgMYAXmL17Mq1asIGAxFi8GdgC8CuBw2Q4ibc6YgcErFAJATUKaE/Ei3uzbl7O1nNnqZJbtzALMxgAwFqDBy2P5sVi2DHzPmp1z71jX/UZKJU5IOPbYbMZ7hglEBIYGpNQ+O1b7sCikzhLCa1oTwGL4dnVgBwnhv5egITSghb8mDcAj/zdLStiWBUcKkFAg7b9Pa47WTUQQIBAEpNDwja7SnnKwPSkEQOEr5cYYCwFQ5dExCBSZcASGCNbMgpAggaLSO7bsyPyroS7ZfMD4xmP6ND0tOLd61oQxwpFYPwFY1+y/RQuijVzlc+hkloGtrYmIzTfTEKDBS4Dly9lasoS825/OfPznD9N3/vToABKOA8tOxD4YApEXEQYBICGgBQ37FMlnNDAH17BgQKiIpACAiRB6hUQ+y2qfa/xlyCeakAeICJa0YDmERJKQsAVsoSEEQwW7IElAQEAQQUL5ayeCz8MEETAlCX97JBSAyv2SABGIEDA/AOGBSES8SEwR1QsiCAlY5D9IAMLSsG1C0iqi3hFwshkkVdFrdCSNSqRUQ9J+LCn03S0pa/vMhLyzGXgGwBaKucaGDPc9WOYUvLxQMpHrG8p46VxCFThhq4Kt/YtcgAFoYYFJRyRFgkr2kyCfKNm35QCOSEWThpa6jGiIRIwzCRAEFV7n4TJgyGALDAaRAJMLkh5sKeDYhETCQsJJwJKAFBrEHgQxJMuApeETYPgzWK9PgiG7l0hcEvuvg4L90NCWBhEH+xwQsoiRd7B/IA52XYMIcJWGYA8JSJkQNZZkQDJkS5116OhaOrQpCTSSh0bKDk1qSG27q6B+O8URD04B7iSi/jgZtgK0GFCGDA0BGrxI0FoLhrTAAqwtEXiiINIQJAAm6JI96DMKRV4iQORbRJqBwHcOfM7ofcE7QUzBb+HGAcjSezggFU9QjBMJggAwwfUYRaWRLbhIWBpJRyKZIDgOQQgBQII5IC5mADoib5+sNfzjtAM33N+OgBcQGEFA+/urLJAgMIeePgeETADDf54IIrgJhMatI32yZRAK7EcEtAAGC4o3FpQWygXgiZSF+rF9Xv2EJC6e1ChQ52U23DKQv39uQ+LGGcAfiSgXhSuYrWW+VWgSKYYADV7wOITv8wXuo4qsLwEJggeKXGAKLMHAJgrsEiby3WKOW0e+F1yiP/99hBh5AhA6sMzCeBv5vEhcstIEGAQJHazYA6BdD0XPRSYHJGwLqYSDhAPYtoQkDUD5xBzaTtpnMiKOrFY/pkixaAz5bjoziDUECzCHpEdQ2reA4/FOrX0XmAL6VkKBiUEMkCQCNAQ0BIgsImEJCUU2MmTx+jzz00Muyx2MZktMndRoTX046y0d7Q09c9tA/m8zGhJPzgB+SUQ9HT4RisWAMFahIUCDF8wHBggyYASGjsXoNAVsR6LkpnKwqM8AQbyN/KQEUXlQNyRIhFkVDtfuW0wCYFaA5iAm6Ft6UnGZ6+y7yv77dPCThR/JU5rg5gnpggdheahJWUglBZIJGzYxBAdbDS22cMeET7wQfrYmtPREkCkhcn3rkcrzI6HlF7r5oUEsyD8xUvlkLuGTL0PAI58lVeBo++ePSZAgSiQAaAyyox8ZUPzfwQJanOS0iQXnnP1djTHIf+ofRf7RbBt/mkz0SEcQkGVmaWKFhgANnrcLDDBsAF7kppZZe4glAkICpOEkBy6Pl/necvQiRBA7ZCpZXb5LzIFLGbjCAn76OfKRAa01WPjkJELrLdoRn7kYQJEFvKxCJl9E0rFQk5RIOYBjSZDQYFbQKLnhxAzWGiIgP+Lg+ImghYAIt8L+PsvIT+eSpcsc5qCDc6Mj0tc+W0MGFm6U9AmOPbh/ACShoIWwCBbVYlBB9w5CP9ZbRHOCxs/Lex1T3PSX/jJY/PvsevuPs4FfE1E+jBW2GSI0BGjw3MFaA1pXLUvTHAS84hYZVZS+gKN6E6KRE/vMvgWotY6tK9xOQE2aSgZnxXt1jHBJ+xZXmE2mwOUmCEBL5HKMfE7BthmplEZtQqAmKfwEC2vf/Q3deRGLQQbHy2Cw8F1gEIE1IuvYN0oFWITky9BBfU/oITO4lBHXGkKIqASIoqCh75mXVsvQpCGIRIIgYCcwpDXf21NUD2vLnuDSGw9R+o0TtXvuY8zfng/cQkQDwfkRJkZoCNBgLyGETz5xgqqgrYiJoguaqxgbRP77w5gZlZYnIp8gYushEJi4bJmAjQEVkKkQvussCBqxdVcQI2JWFRjQ5Nf1MQTyilFMF5DJ5FGbkkglLNQkbdiCwKzBWvuJE0HD1h0nakbpRiCE8AlOMyBKx+eTnI5IuXRqqHTcQRqamWPxR1Q764DwAGIilpZLNm9Os97cn+ZR9WLhgZ78zVM1ePpR5o4DgBuIKB1Yg2yI0BCgwYvpNsesPXqOpZyadeBuVuHSkGc1+yE64j2qGBXMPqkGRdgMAYYEYMNlgb6Mh6G8QjLHqE9ZqHEISVsCWkFrhggIt9ICJvYtO3qOVas87IbBZfcR5jCREi7rv2B5wY2FNAiaSEBysh7dLuvuTVm9KiVn7Nekrl/XJDueYj5vFtGtxi02BGiwF5CB6whNIB27yDny9UYkqMjSobgbFzivOmaZBdaVYl0WP4P2X2PEM8W+xeeHBsM6krBzBFFhn5+N5VK8EmGhdbB/Gn72Okj5CpJgIaGVRibrIZ8vIJkQqK1NoM6x4EiAWUMQ+/0pLP1MeECo8dpBjmW7w6SQIOHH9aLwAAUEF3aUEEqZFgIR+xnksAA7fD1GjDpIFjH57r8mPzttkxTk1IlupXX3jgI/kdbTHnEKf74lxzcuTOLbY4nuAYDOzk65dOlSZb7lhgANdgMC+4TBGOaSxnisVNAcva+UFY63poXPRS5vVOqCmMnjX/Bc6dKWcSlF5TaRU0cjWVWlNxNRQNIMDsp6IBBkZQEiCwyNbEEh7xaQthn1NQ5qExYSxGAoEHNQMsP++2JF1eUue0WMU1RmieLLlaqzOXakRCFZxusfAUV+cXWYmPJjtAxFvrstIIQQKfTkoXfk8nK78N7+jFN88505dfnxSfFdItq5nNlabMpmDAEa7JmrxqiMyXFAGrRb125YLK9iOa11WdswV1g75TzGw0gmfE4ElpeqFq+sIGsu207FcXBQPM2MdNFG1lVI2S7qUhINNRYSQReLYAKxb0nGe5t9l7na8Yx8HkoLa8T3PiS2EvmVYoZBXXaZ+U1BDDHYIkhAFIWDRwY970mlrM0evrSrQZ29ir2PzifqAjMxMxkSfOVBmFPw8kLthrTiSZHw78rfn+19qPL+MuuThicfhiURAjddMEAqKDLGbva5yrZKz1Pg+BNY+4IsxBKsbWTzwM6BIrp7i9iVVihoG1rY0MIJYokVNF2xvXiyQ2td9XwxMzTHukqG7TeiR/X4KlXY7grMeVieQgq2JakWK3cq75dbimNu35z/3T0Z9xIGbCLi9uVssVGgMRagQRVLjnnPlnu+FiZzGcGF5SPhc8xBdhUI2tuC+ry4maeHPbnn+6ADKzesR2QBCdeXbCEJkI1MgZF1i0gXgLoUoaHGhi0EZFDKHRK8CAu6n+VcVVuGIktSB8fJI1uN8XACa3/LkbCEANiG1AICgCJCrUVWn2vrO/oY1GB9eUdv5vU9zG8bQ9TdAVMyYwjQIObKBSV8yvMtIYiyS1To4UQj4jV8wcXJsSRGaNvzMIYKy5BLrW8iatWNJ0ECd1CHSRaOmvE4FC3g0p6WWvLKw21+8kVET4brYqjAgvP7mMMkg1/0zEEs1EI67yHnAkNFoDFlocmRkJLA8ECsoMjym/QocGWCTPIwlzzcFy4dDyu/9EZAgHSsVTBM2gi/vDqKl4auMHFU7kNBlw6zX7gdhgUcEBLEQlsW/r1Dqc21qSN7d+YfekDxjxcKXEpEhVANyFwBhgANuNytQ4WTFXdN44E7imVFh1tAQLWqwnh9YHjV024sxkDCoBTvotgePVu8LRbTLDe9yuOCmmh4LBMASEJrjWzORTFfRC4hUV/roD4hYQkGKxdMgTUmhN9uXCVpVBnLK3did1c4PnwJiscHUSqdif5mQAV3JskaJKXsL3j6oZw3hlP4YjGJo3qYzxtDtPaaB9g+5zByzQVgCNDAN9ACFRVEV7KmUERghAuVaLjLF8a6iIfF9Ia50TzcT4wvo1kHtX1cRh7xerkyMo0lTnQ8pxxknREv9SG/zo/jog3R2wXIr1MBEeCxQF+BkCvmUEwKNNU6SFp+a16UbAkKoinmvkdEXlYo7lvIUaF1ZQw0vIHE6y0F+a178ZtAsO9EKCvADvRsoDTB0wBZQuREiu/eVvB2NidOGLK8Ozcynz6FaGXQg2iSIy8TTBLklREEjH4S4n2x5YRTNZFRLeEwQjyMRzA+ObZ+zbo8aYByK45HWH88g135nnKri4evs+L94YY4kEdgDur4yILLNnalNbbsdNGTIWTYhidsMFt+RmlPEkWV5y2e+ajIJpditFUs1JHOMwMKAh4TFPuBB4YgkUjY6/rz6q7e3NgHcnrF48yfZoCWs0mOGAtwnydBn/pomIFWWeVM1bxa/7otaRPEhEjD65qj5yuqOspok+LWXHUPusTZlZaTRsxSpKhPt8reVjwz/DmwCIoPS9pfrBQUERQS8DxCZkjBKbgYVeeg0ZFICun3Tg8PHryAHxRVnolqhnxE6J72xcS0VLBAsCxH7vJIr9yS5bpZdd8ouOAlDn3rAWYbzJ6xBg0B7ltQQaGtEr5yZ6XaPcdTkEEfbLyFK3ARRSgGIGKZiEjNioKuD6C8MBhl8ve+a0d++1lQo+dzc8k6C11LTSPXAYYter6idbh+UaKluOJNtA9Ubl6G2ZlAK5FibE2BiawgkC0oaDeLYkJiVEMSKcvyq8dFqQ7RF1YtJXko5t6GUmGh2nRoBFb2CWtdOg7NVKpBJCpzlXWQIS+1VmswS1he4CoLAbITIsc237Qh5x7d6Hzznz3pgcOIftzW2Sk7mU0LnSHAfRBU7raJ2IwPXSFqUGYPkgDFZgqFZS2l9rHYRRxc3dVq/yIVlnCeR6yOLppGFFu/DlrURlxXQIhRX7HSEZkiLu81ghUVz2qPFP/0WwctFBWwM6sw6OXRUuegvtZCQgA2XD9bzLIs2hM3XiO3VZd3hviHqUeMoYZSWyR4hFKcQH9Rj6BdIZkyQlv/6i9q1KaufWiQ5SEN9KOlnSzZkKAhwH0rBMiAZsSNvTCozhUeHEcidohq0WJPlV9klYmPKtdUvHMilMSPXGaKCanuSYdFGYEFIqiBTmFENDRy7GxP118WnwP5eooigZzH2DpYRIOnMKrWRoPjy/mH56eccEv7FSZGSFSeMx52DomGd5sMPzd+a53WDC1R0ZaooYlgKSCpJOUpiXsHXU/Vih+uzBXmLk7RhSv8mKBpnzMEuG+T4p6SDar0EIekJaiiLo6evUh4GNHQnpHRMBILiB2iVDOoOVYvuAfrL5F+tbApB/L3BBHcPTQcDGaKKOaKyNU6aKx1UGOpqKUwomdmCBF/Rpdc870hYa5iTUZMCSilfcs7NnfF/ykBTZBSk07Cun9H1suPqvnEPwdzo44het81DzxgAzAlMoYA9xXGK5/DEfiZvosV+GxRDVrJa45U8kPRBBH2snIgWkphZjmQs6/ICFM8qB+WqlS6pBqlWRyRMRmWhcQIoEKsgMMndRS4C+J9XE7aoNjs4wqRgxhJkqTyXQt6eAWzP984iBdC2HA9ws4BhWwBGF0P1KVsCGYIVoEeggxChbEq7qCxo5TAiccRyt31SGmGKVaKVLGo8D8XXaHPQAAUAUVLwIIHWykI1MiHt2c9a2zNe1cOFu9Z1OD8aDmztYRMsbQhwFcxhCzF3/whQFRBBOG83lgcSujIegszu0pSFJuKJJ6iGpfAvdMUyw5TWawNoVQ9l6Rfogls4CDeFidnLqfPUEYLMZUaApjCpI0oxe24IvLHCEcFxzpZ9DC3klSFirUO1KKDJxXgCycoAJAgIZDNa2xxC2iqI4yqc1BjkT8HBYHIAmt/rnAoqa9KrrAKagSjUKiISWxFrYTwu0nKwhT+YCawP6yKY4mSUnshwx+AKuFBgggknBr5cG/ecxqdHz7QV1CHEf3YkKAhQAOUS7yX1QYinAAXU3QOCnfjcveCBfhZXNmRXM24+7g7RWhd0aES39mQAFAhQxXuX6VFSlX2QUeKNGIPzlcQRxWEItvYOVhAoajQWJdAY8pGUhehUZpHzIHKS/l55agbJiS7eGKk/BwQ4p4/61ISREdtdM9yMTJIa0fe319UTkvy2kcG8lsPJPrLA8z2YWQ6RgwBvgqhVSwDq3kYSTGefdYHoUoMUOtSTV7UBbGHOzVCjC4kSSFEeZIkyl5ThQvMMbGBuKvPkUVFobx9RedyXL2lMhMcZbpF9fxxyWcOEhHC7xkezHvIuXm4ro2xdTZADBmot1IQpwuPB8xgWWqhC5+nYV05HKlZl/m+RH7CI7gnsfTd/mqS/WWkLQRlKEkPDha1laSfPF7gE/cnepSZJREZcdUX2gMzp+B/kDRZB1ZTyZcUFY/nbGkGUlIhyex2uQpdvbi1GpejquTWsMsFmv12N7x4yc5gAkj0l1IaOway2NibR8YTUCTBLIOsrT+jZLd2eKxjRrOG1tXKYGJxQ6Zg8BI96366UoNIoUlrkfWAR/Jy7PqMun1jobCAiBQzm+vVWICvvhignygQII7P/+XYPSp0w0KfthSHivelDrMKY3E+ogpiDH+X5RZXfM4IRQFDKlu/r09KkWUUyvJrXaqxK8nkc2k9oQNMJdNNaz9GRhUxR46pM3Mob88xJZwwDkml+BwqqDRexhiIZ4GCsZ/9eYWil8PoehuNdTI4N+G++AXppANF6LAQO3SVK1qcBVOMbIN8SqAnqJmhlAZsEXOVKUoCUSyBwqoUIBBkiZ6iVv9ljHFq5O3bmY9dBjxtpLSMBfgqDPBR9CglYQllEu46Hj4rvcaxRIc/HTNwpWPinlHtSfi75sgKG9YzG/a9BusKpZ9KbbIUr+XwC4i5NBGOYr/H14NS8tcntLDrJCBUlB1HTOpfx45JV7Tscrk1idh2qj4gobWEYgENiZwLbOvLYftAHi5LkJDQOhg6FSrI6NKMk1AWhyvk9aNyn+i8ciSUoDVDaY59jlR2HGX3IyYwJFzht8/ZliW35T33cSXHPF50v9pBpB/EMGVYA2MBvmqYMBLcrBb3KxEVD4/RVbqbutTe5VtzHKmzEFXM4UW1oH5obOoySfzdqVeHA5yeTap/+CjO8iRLfOB5GTmL8sMkqnJuqky6K61Dx84zQcECw8a2gQLcYg5jGpJIOBLEHggqyMhT+XjOYcdTXiSuOSDqSPaLKj4ajmX6UaWIvTwZIxOO/diujJdqSLY9tDP/9oOJbjDxQGMBvroQGhOhGxZXfqmiAsNcUYBcYcnFy2AqH2WExcMVWcp2ayQJrdg+jKhSEyc0omHLchUmK3tec9wGLis2jmdmh50b7H5/4hE6ZoJmAZCN/ixjy64i+rMMjyx4kMP3K9bCVxo7QMPOYTT/JFbTyFx5rMNvNqXPsfRUAQRBKbm2P6832HT9VubDTDzQWICvflswsgT3Tno+tFaEEMNVX/a0o2M3GecoOVIl0xK+JsL6OQyX16+2PMUSqFEvdBCzZC7dHF5IwShfeToU3FJQlMSgR8j35eBqB031FpJQiBoEQ3dcaAiIUL7ajxlWsThZUyQYobkyOrk30RFCvQtyifSjpOqsnsFvE9GiZStWiJhJa2AI8EWxy14w17ZqIy78MphANM6v/Y0SAdKfkyFiFz6RH+wPCssiCy0+MS0W6hMkSjqkUSFzvNCaQZ6OCq3jFlu5n0DDyMevnYuRK0pdFaHGKAvhFycDUaFzPJdTsg51mVoLOFSb4agDhmN5GN/VjEn2x/glLngTJmp0eeQAIBFJ3/vbt4P90igysG3IxZAiTK4XqBEeBDx4QkKRBUeLaM5y6KIr8km/rBuHKWiCIXgMeJr8mcdBKY1AfOAVIfpoAsJXwUFYCnAFQDIpt+7IefUtDa+5c1fh/ONbnB+YImnjAr+4AbkX7LH7pnYOGSomvEnDPeQosF41dhgkCsIyE67iTg13QwPXWMemvsUD+ihTsK/c4rBIfnw//YQEVxVsLTtuHtk2qgidRdnXygTOSC4way5z1avegJiDXeWgBEbAU4zBdB5bevMYci1omYBgQLIqDY3i4dPkKu+dgVQFlNbw1Mh1mNH7R7DSNQFKMxIiITf1F9VO0Hc2MB+2hMjrZDZJEWMBvtDuJ8uurnsdYPMLsr5JAAqtre6SJUuG3611jEyquKQUb+IPimuponQlYjKUK59UToGLzwkpyW7FgnoISmeGPVdufZXtX7XkSaBSozVDR2UqIuq4KE8aVK8XRBWBAYI/RAllatVVgpPxdVQpLi83bksD6BnCP7+BOdafJ7jaxdgmG01JGxZ70faiYmyEowt0eXIpjOmBy85daHlylc+a/T1AeaIqFvMURJ4GnihKq3ZQXcfMhy8DlJk5bAjwBUF7e7vV0dHhXfbN7749nfe+158eUiSFFHvtDZcyhK7nqSmTJskjR4/9KIA/LF++3KpKhCi1b5URC5e344+UuRUxAig185cusJE19aplNZ89Flgtdkg0cuxgr9RtdrcNlItBPN+4YDlpl86kv7820kWGu6sA1WRjdI0FCTUsdcuxzO0wF0JzpDU40gCm3Z4X4cceZWhfSyG3ZvNea13yoHuyXntHrf2l+b4VaLLChgBfGDyzpbtW2LXjdg7mIKQcpqCyZxTo2yzFYhE1DXnkNc8EgBW78/WYq2rLoULcPR5UD62V+MVVksinklxT4F7FqjNiBlP5uuKkEMnVxzvMGGU6hXGtPFRz3RHON+HqMvtcOkaqiIuFXMMIrTmKlGnin0p4XMy0Bxmf4fsenRz20yJ+haICSQsFJbC1Nw+lHIypExAijOFRUHUT62+OHXV4rEqHUQUuy2g/277F/ywV8jDIlnJNT0G1tsjP7mD+1WhgjSmQNgT4gsFxEirrMmtFHrG29t63YDC0LwOv2dNaWUrzjqqLqliEUPtdB/7FI2KxtnITi0VIsX5xraDyKGPUAUHl+nZxXoiECIQuycIHBBiKDoRzdIkR6O1F4vT+oCKqbsHEyxPtMkuL/a6JSjGDyvkiBIBkecE1OHCfS+eGwCBVrrKidGzsXHT8upygyRcrEBRPRejoHFIwNo4lAK1AIBS1g60DGh4DYxpsJMmDDrpULMWRMjQJf/98QtYAWVBE4FjjclmTT5m/H6PzeMkN+Uo34d660ianqLi7KKxHh/JfeG1D6n2dpizmOcGctKpukSYfTDFu2MsHBYlCJiIiT2lvt26YLqfZqB+3Wj9tlLxgCK1LozSf/bhG7NEtvaZL/cSx7obK/aq2xei1mJBBZV9xted05X7x8HVVPTexRA0Hfbwcvi/4Wa2nOUyMaN69wVS+XwzNhB2DHrr78shrCxIEqbXf2gcRdK2QH/uMbV/rFy48Rww4HuDa0no8m9bbXff0Lcz7LSXSnZ2dJiFiCPCVid3MHx9W5MtVCpTjD6kYUjOkBqQGSPEwwqhWfBwf7TicyGLJjTBxgqCDZAQiqtzH4c89e/yNYu57tWPdbQF1mD3XuqzQ+9n3k4ef7yrZclSUzzADLjvYlQa6dxWQKxAI0reGg9Gd/u6Ukk8ikN2PZqloHqZ0UxYLJBohq10SahCa4REwZNt6q6hxHt2R/SIARlubudAMAe4DHxr7xCfZf4gRSl321CpkLldkIWaQZsjdkcpebmeEVQyfB1wtnFBNpRpR6V5ZGc+eEN/zgdSARgI704ytfUXkXF8qoST6WiUQit3PZh753FR7A0MJD7bSqNGO3DDg6h5Yp/dwfs5SImXKYkwM8H/R5/aViVn6XQYojYn0w2WlQL+vFVChrgK/KDhuSbAQGB4ViglDhUrNOiiIDgNYQfwyNkfTj/sF6ibhfOF4S37U+FXl6taxwmvfqiyRbalEhIYpz5fUokvJicqiZ/9lP96mI/IuF1SNl/CUlFi4LDkTmgJRt1s8ZhpqAAbnQED7E+GEjYGcB6CAsU0W6hISYA2O+rhDAgvmMQf7JWIty/HqJwKGD7+KnxIKBSSC49AEh4gK5OjNLOxHd6a/w8xvhukOMQT4fPHiKtQNN8FJMaDCEegqdoX4lzDF2sEAwCOAgla3MK8hdHknBYOhw3Qt+VN6NXSJAsOi51hvKsG/2HVUQuMncsKLv1wQNZakqWqblY/59ZM15BceRsnKYHYwxzPYAVEG2lpxuS3WVEYUWnApJR0TQxBxVomlUMsztOWZa1/iC1WytFQmEcZSQ7AXaFZJ9OU8uFzA5GaBOgfQrIKbS1AG7WcvEIxngdAMFkEnC2KxX6IyCbPyQUvxKfeAYAue8N8vieS2IU/1ja475Sng8NnAfZ3McqkRSzAE+D8TH0QQRAegw+YxUT6Qp2wmSGhRUKlURISkEikeaIiKDClFpcM+4cavNC6noMgyJdJgoqig2U88M5hlyTqL6mzc3d5WOOjZ49B8jFt0OhYQJUBGxMWlYmZJEQH7h1iueh259KFWIijqiolYPiysFCM53BWlMahw0zXHZrdrsJAYyjO29uUwoTmJWqd8dGllmECHEvzwawSFeO71keEOawlscMFNvfmPYFTqXrCpiTYE+Eoht2f5cgsoJq1YsIZgB5Jk1LUh4pPVYu6dECUfikgAQkMLr8y1ApWucs2+xRj1ycX2S0RGYkAW0AB5gfsdWH6hukxoqXBJqDSUd/J/c2OWVkiWwXqDUh3NcVe0nPRK+8VgKJCkiANFIEzqe8s6qnPkQHShWtwvtBxp2MjQ4Qo3vIefWTXpKwgb/fki0F/AuOYkau2SuV6a3azBLIJ4IUefb7yzRnO8gieuGlNlrBxKNZJCSrlpKM/j68W71jJ/fQ7RalMXaAjwFRPe01pDjRiaoQQLIp3L6QIXOZwnAQI0CTB7QTwupv5MoqyiORqAFKuaZRHE6cLnSABCoUzKuJypSxakiHX1czlBlbV7+NXNvssXmXFUsgiJIo3A0nZU0HQsStQTX4ZEbB+D3znmzpJQoGCouWURbIuIiIQgqiS1kjJOOYXQHgbK4l05I5GiYAVoBU846M0X4fXnMaUpgVoHgVy+b+XxC6mtUSWM4rFQOy3H2p72LgLwwWUrYNRiDAG+3OTHUQmEY/slwYsBdADYscO/ylNOfu1RU3u7JzSL8SRsSNhRvI8AsLBKfb7RF750RYflKiBRToCBq1pmNvhVuhE3xaZVRtaSH1sTVSJ61f6IWU9USs6EPa8cxBPL2VkFhcklF59FuY5hmRUZxivB/iHaNdaQZ6F3qIjtQwrbB/PYlc4iLxMe7CQsCCkCc1aBoCH92CFpEKtgPnKsiDsWHqg8SBHfl0hoVZSZjByUhvtKPjbSWY1t7GFCs4OU5Se3mEUw/CqImVaUPVXzGsrCmGG8kEvDpuL7qoQCWSS2DShsqSuewsy1BGRNj7AhwFcCDVYtxl26lBSY6TVEf2XmuQDmZgF2q1CMXfG3G3veDv52R3hPfNlqETr7BTxSdy/X+VzmPPYAxw+5qO3eZTVlMu6cviExd/OAPeeZXNJ6sqeA1dsKGFIpRckaYRPIUh5ckYziflH8NDCOWMc4r7KXuVKOhqvEDgNpfwrqBoWw0Z8tglDE5JYEEhLQSkErv0ZQgke8k8QmoZRRcVyRp5ohykywSIhMUau0ZY9bXSy+CYnE71cwWwCMXJYhwJc3/sfMKLr+5b6ifAEO7tJDAB4wZ2yP8ECFlZ0oon7OYzl88KmtNPHBjcWTHh0SDXc+NYRMIakc2xJSu8QCviUGlBU3Vo4ZoFhJzkhK2CPFCcOCZQUbu7IupChgYlMCyTD0ECjhUBXZ/hFjmHviArNfFsOO5O2uhw1u+ixB9PsdL10xgyFAg+oEGD7kCGlHCkiwq8sUpe8JWtt86lixAsAKaCIqAHgUwIUBccy9cwDnvmZa9r23PUkt9z65A9pymESKXCXBwoGfPAriiMOSIeXCD9WIqYwAK+alhMTFZKM3U4RFRYxvtH0XvKzbhqqMMSjV7ISZZK5Qk2Yu1W3GEyUeMWyQtb2/yP2jUot7tJ432iRDDAH+jxAlw8gZPbcAQzC5KJCIBxGtAfAJZv7ekVPx7b9PSp3ym4dyia19eSWSoyTHS4FerM9TK4AEXLKxY6gIKRij6uINGi98QkRJjaRH8CihdwL244PZmcz8+DKYZIghwL2EDQ1PeCDo0qzeCHJY5Gb498t3d/zoEFcE2A1ehJtH9CG0M4v5ABHR0wDexszz5o/KLO9cWxzzt4d3KjsxSnBgEmlIJJUHVzI8Kz5yjiLXskRZgeXFFZIugsqGH/n7JIKuEcCDxPYhYFwTMKqeYSsJDQFtq6B4ncqK18Ogn68kFCbhRaww2i8HqqyPtrVAzmIIqTnt2ugp2mdTI/25ndmQnyHA53Bhgf0ylFB+OfJORBUCLK/Up4gQ/fmzGhLMwrDgS4COwN1rD1pVyHcDj5g4sfbK2Um87Tf/HcA2jGYLNpHWkJ4GQ8ITBBqmSViKC3K1WQWAXxgdz6THvgjsD2aBpxl9aRfZZgEpCFL434wX0hKM8uwMkc65GELucGZuIqJ+kw02BLhX8DyXNcFTWnvD49BqxNkN8S+j1gpSSnhKe66n4CTlaHNmX3oiDGJgGwC8fW2GT210nN9f99/e1BY3xeTUkKcJiigstYx6hX1uq5IEQdjnWyLE6uMCwsnufma34Ar05zzYNRaSIAimMsXu0tpj4qpxy7DsC1eyVOOcK4LGn6znKj26Yey/B7JLAVy7wndbTDbYEOCeoaGpySnCtljkLSmtoAaLShOE4jO4AwVhjtVpKeX6MzAISKczVmtzHWoSzjRzZl8WF1mHbvEcoj8/k+NTkwn+03fu7U5uVy1SWw0ErSGCnuu4iELYwVLiHz/LG5+uV0aOXH14vO+FOsh5HvryLkalEnCIdhsa2fsRAn52mYSAtiS6i4rHSn0ygGtNNtgQ4B5h/vz5DADHLzpmnUbyN1u3bF+nlS4waSIWsdmVsbCfEP7sSkReL1IJe0yhUOgRJBI1NakJjY0Nuebmxl8CAFasMDGZl8ka7GR2phHd8d8CnyubZv/yKzdt8IasessBAUrBE74WD0XCBAEVVtAH6/gyXGqFjuKCXLLMOOxJ9l/LFxUGwWisEXCEDogu9Buoai3gnjnAFKn2AFIMFDVlHD6CmRsJGDRu8MhnzsBgn8E1D7B9zmHkPprhZZ2PFduvuLNHKXu01FrADayyaIoeVegCxUQUyoZIVfRXV7bOMTMmjSZMaCXYSkOQhbp6QkOSQPBggSG15XfOCB3Mc6aokzAekxSifBB7uIyM/Q0AnvbUwibI41qs180iuoOZJRmFGGMB7pEzwUxLu7rEvFWrCIsX7/0KVqwAFi8GVgCrV+/gefNWEQDd0dFhrL+XGeccBq+TWS4gWnbnTlW7tT9x0fUP7FConSAFe37OnmPJkIrQm6qc2kfDuzNK40iDbG64YBguYSCTycOCg7qUBLMqteYFG9RaQwgRDFIKCXbkUtGyvmUAWjPn2MKudPF4AHesMMaOsQDN5xC/lPf1GxxEZxtSf9zqPtH+98EJj/Y47Di20H7xUxDN0EE5U2gRAh5VIUBRXlRdGbsjABNGSUxsJdgaEJBgUUTCIjQ32EhY/ngD32MeLmEmCBXS+ZV90wzBOnoPAGjWalwN5IF27s43ja5bvAygjrAC3CAesTJ4JVyTL/EjLCDeN+82RNzWBhBR+tAJ9tIzD62jJpGF0szEMaGGIOcVDaHiqmzqy2LtkQZfqSGZyELRA9I51x/KzvS8xgtU2RT1uxqDHk+0BXGH6QYxBPhKtkheyocUAvt6QHwpkVq+nK1pRPe8dqx70ZsPaBQqX9CCBRKc8dMRJMEk/MJlJmgmBIMCY7cTX/KGdfmAp0rIMEvLgXAYMzQE8jlGJqv9igIqCd+WldKM+L2JE+uw0aTkKYmicho3am4FgPZly4zHZ1zgVwbhBb+mum75+83rntk0hZg1AYKJXsTtki7mCzR35rT+0996yhuIaMe+nB1kZloG0DIA1zyafvxb/1Sz16eTnJCDokh10MKOycWEJoMud3FjsmMU11Ss0C+dNlpi/CgLFmufUIUHAQGLCA5pNDdIJJzSHBhmz5dwBJUJp4YOgz+WIJw8589tFjFdRS0A4Wp9aIMQBziFNy9sSf7ZSOUPh0mCvIxuGDMnNm7efuxd9/3XSSaTpQAPlzRFI+GQeC1saWZSaV7I8JdROVO9SBYG+3rRNGoU+obc/QHs6OrqEthH+5CJiJcvZ0lLyHtggL920o7iz35wf1blrEYhlQcEyYnSoCTf3RUYWQ2m9AmgajywfAf8T8rVGkN5DWE5/gXJvu7W82mhFGCwEDpHoLzAwQD+3GoMHkOArzQjxLKdNKTTpESSiX1bIl7dH5EZDbfb48tWJUCqEDYRFqST1EqxYDadAQDw2iXktbe3i4UN+O2/R+e/OLWhOHNjrlZLsoWGijKvHBuiVJns4CqS+9HkuVCWP1DzLpMyDYeqCws5z4Wd99CQ8GetkKCggLraEHqO1K7D7fmZ51iihBlMRAMeqJASRwDACiOKYGKAr7gPQGshfdV0QSAh/Xlv0aPy75Fe293v4d+2VsLyCsISLBR55uYXkMfiZcsEERX2n9pw86K5TSSzg5rJDohFj6AL6Pf67nZgPIJB6Jp3E3vyY4weC2TzBRQLxRfsyDSAnGYMZQvj2cwLNgT4ir0ESQPwQC/2g5kTTpIG+vp3tNanVgPAqlWr9vmyiNAyOqoRP9yvrtBfkxTS88CCBaCDxAdTMIogqOdjEf0UbJU/tAXSEoIFiP0Jd1Jov21SB2Pq2Arer0FaQ2gBVzkYKvrT4qRWwXxW4U/SY/LDkUzDibji4b9AEIDIFDzkGPOywLiOoC3QXHOGAF9BgSjxkglmMcBCWFQsulkAfQDQ0bFsnyfADiLNzJQkWjt1lPPolNYkaa+gIz0DzeVZ3zATHM1LLn/4HZO+4IHQQSJDlARQKcgIRyPvApVoIWzkXSCXd4OC7HCdXFp31Q+2ygs+AUIxI++xVXxhpx8YAjR4gUhJ61K86CWyOMkPbBkXuNwKlO3tLCaMStx06AQBy0szV7Gwqt5Votc1Qvm9MAlFACgokQn7hUfkMc1gFhjKM7JFggh0BTliv738lhDI1fBSdbXWEHAUACw217whwFeeFfiytGaYjoAKN7ijg/RRLfjTjEQ6m6RC0JzBZcmO6F9IeuHrVLLYSAfKMsGNLazpoyrD0ssJVgMkUWQb6byG0qXJdOE6qpEx8whEHXCmJkE5hYT5lA0BGhhUxbLghpAENk2oEbuaalMEVaVdRvvT3ePT2rTWQGzyX5gggfYvsJGqLCuJLFSBYQgUPKBQLBdNDV3hvQ2xFDUwmFHmhmcI0MBgBJ4g4vblyy0AblNd6pGpTTWA6ynBEqQEhAIspWFpCUtLSCX8hxaQLCAh/d+1CKwugCGhtICUBIt9iXsNAhRBKIBYQECCWEQPoTWE8gANDOUZBY9AGpCsIRjQLCC0gNT+OoTy441EMiiD8RMmioMyG2YMSaAnkzEfsiFAA4ORsRiLQUS6scF5YNpoC0J7vsUXWWZ+y1u1R7UKu8g11bs3vpjZL5eJq+4zo+gq5IoammQs+xtzc/fEHCRAaX82cejrGxgCNDCoxoAAgAnNYt2CSRKOUKUkVZD55Yp/YShVs67i2paKpxHIbEWDjypcYL/AWqM0c4khiJAreih4/gCnsnnFQTKlWhlMKWvMgYuO6nOpDQwBGhiECKXjmyS2tFquqrFIsNYgHRIKPaslV5YpjoxHEUuGVHW/MfxNvvVWUEC26IHJt0DD2CPvZh+qQSnTAmwI0MBgN1i1zOeV5iRWW56rEhaE34nGkXUWKb5UCIxRUC8Y1QyiNE9EgqOZI4jX/8Vc5Tj9RcNUmUAQyBc0Cq4GQUBQ9ant5cowcSo1Q1kNARoY7AmWRReFk6oREH73DASzP+pUi6grpOwRZobDhxKRkAU0YJP/8GdqycB95UADkCLrMiyI5yATrLQAaQIpC9ksBWUxpaFMZe/XXCrQZoo0BjWLqpOrDXyYYlgDgwoCRFCfXg2h9HxcfbmqG6pLdXuC/Gltpalye75LmhkeGEUPcD0LRH5rnZF1MRaggcGLhlymCKV4WJFxnAjDBwfRuajVjSP2KtUM0sgJi5A0tS5tLyRav93YL2vJ5T0oLcG6MoFSWStY/iACbMcBEOV5DAwBGhiMYMEBOpPJgrWKRl+OvGypIyQEIYgJBiMuhRDPz2Ij3y3OFxWKronoGQI0MHgRsHixfz107yocmSsoO5PXypdZFiCWQQY2nPNbekADrMJSGQEmgiYNYgFAwhLkW4XaV5QJpfHD3/34YXz2SGm9YQCPAV8yq6ChWAT7oIfpAMZJGME8YksDjrnSDQEaGOweKwAAmzdvr1u/eQflXZ/SWIsgAaJ991NHdl6JrIJEBIUKLmBoEIgFJJXUZMIMMitAcOgml78W/11oKrnUJFDUhLwLaE3hhiLbs7IEhuGTqwOgJhUojhsf2BCggUFV+vP5Dzt27jps3eYdFW6u3r0qDMKuD+1nY1kGZS8aI+VL9nyaHKI6F6018kUFT8MvriFfM1prXYUAfYK1BFBfkzS+syFAA4ORsXr11czMVu/A0IItvRlAWMR+xqEaI0X/l5INQc2dJlCgB2gRYMvSsPM9TVzEt8JR14cvUVjwGEXl9xVXxh910LkSPses4Qig3pFGD7AKTBmMgYFPMkT+xDRn+/btB+wcUhBNQugREiBaR77q8JoUHRKchpCAFLvr3dg7EABXAwVPI+kIEO1GTpeZLSKZT2e9VGPNQ0Cp28XAEOAr6OozdV0vN7q6IJhZb9y6ddHWXYMNrm5Qgm1JSkKAokysEKWhUwx/hGUs5eDzn2BoAsAEhgspJUj7TKk1YIFApKGJo3rCMHMcDAgGEyBIgFkhqqMJNAcFE1zXg9KAQyKQ2Q9ikkGRtIALQMASgizO6dGo6QaAVYYAjQtsYFCJ1tYVRET82Nqn3rq5p89RcBgsgyRHKUOLmMFHJR+14qGj3/0ccmgAUulm92w0xCPYf0G3h/IY+YLryxDq4e50KNUvtEa9LTkPmKFIhgANDKq7v0uWLPGYue7pDVvetG7jNlipJqkD9ZdnefPw+F3YCaIZFgUWJEZOnOxmv6q738RQTCgUAcUI0snlBKg1QTF0XcpGkvHPUcDWdmbRQWS64gwB7su+NoVlZcYVqrgOnujuPnn95q1T+tJFLZJNxEyxvt1SwXMZ4Y2wMhHwkiQBK5YGDlVhKuXxS2rP5dZctQSMJg2GBU/ZcBWDicsSMf6bBTSI6xICdba1goj0YnO9D4OJAb7clESkSUgWQjC92JREkgFiS0oBwAHgmk8AWLp0KQDgP/95+NzHnljD0hnNRUoGfRxcNnU+FDclopHtuiimy5CCdmsBPrfbGIGJoLRGoaiQsEUFszEAAa0ZScGolcibT9kQ4CsRlFdc15/NU4NiIu1BCaqIsse+08/2+3B2LQsfgWw52NeLxuZDJ/UO5g4CcE9nZ5dYuhT7rFhcZ2enXLVqFefzvP8lV1177PruLZxonCUGrRooEESgphLyVxhIo6C9TTOXQnChVScAJgFGAdJhwLKjHmEi32LTDL8TRPgq00QEEgATR8kU3woUfpdImG0WgFASRAogDwVPwVMpJETYtBdUVbMCuSxt14bUuBsAdnR1GavfEOArgPWIuL29XQDIjhvd+Pc3LD5yMReLSoClfsHywZX1GQwWQrNyqTEp/9XSkHqUORRs2nexqrWVOjo61Mx5h3101arHExq2p+x6C+SANUMHbiVVSrho7VMNVZFmYfZb44ghpcAIEn6Bakz536wZmvRu1WZiSqvwXA3X1UgkrMj1BSkQCTjwUC89d1ZLaicAdJlLr+pVYvCy+L5MIGLLsuC67uiX9K5nyZ1KRf1c+6xV0NnJculSUuu7+xb/+Fe//seNN/5dq5pG2T/mDRiacBKyIgG/tKR0qZAoL2TWYJ9zKlSd/VGZRUwam8SkVgesvaCSxSdGCvhNCFGK3RGDBUOQKFufCCSwQAQWDJDwBVbhQZBGTUKiqcYCBVagEAwNocYktFxg9S8/Y+ao135Zs+jwd8xYgcYCfEWYgQwAnueBiHa+DAxMIw9s3BfuP0xdXV1g5vqfd/3lJ7ff9y+ypEOaE3ATzVC855cGo9xtpSAGKIhgCwnSL9xdJpS38qN8frrFcxmep2FbMvKVPaW5MSEw2nHWaPYHoncQeebCMwT4iqNC5peWh4jiVW37Jh588EFr6dKl7o23rfzEnff+a8au3n6vwa63XCsJdhrAkBAcozaq8D6jcxmot6AUjg1/FyRgSYIO8+5xg7tq7JYCMfz4djgqwkbojrOvCh2qQXvMKLoMaYdZZv+/GgG0NiQeB4DFJutvCPCVaowQmUjES4nlzNZhRO4jT25o+90NNy+7/8FHvIZk0sorQi5ZD7LqfDLSfiWgHwP036vCXyh0iQmS49PfAPZV7yFJQEj2Oz50RdQpVlJT9or2Y4qlr0S54otgAbD2Eybsu96aBQqKYTNgkQZpsANImc/mZtXU/LE6dRsApi7IYB9DZ2enXELk7do1NP8fy1de/Y8VK8m2HQFIPx9hjQKLGmgumWihQrPWGporHrHnIsrSAGnAEgRbikgef0/c21B1Zq/uoACUx/AHv/kCCbVS0ehasSsF7AoEAw0BGgI02Kctv+XLraVLlypmnvbn5XfecdOtt43O5oosLFuwZighoZ0JcKm23FrbUyKKtaFBaVgCsCgopeHdzfAtl7cnokgSf6TtaB0rpgZBMcFVvsOuNKvxdQ43Uv4XRJRdDkgyyQ/jAhvs2+QXtLs5P/1V509v+NuKsT27BjwnVWd5WkCwAlkSbI+GJ1K+RRfmiYjKkhzPhuAtsISAFCivx3xxoijQDCjPl35WzKIpAZqaslYAJv5nLECDfRbMTO0B+e0aKsy//vd/XP6X21YsWb9xi7KTKUtpDcCDJkLeSaKYaAGzAwqETVkHkveBvgEFWn+lR0BwHInl+4kTYljSF0Ng0kHOI1bNzLL0vuAn6/ARZpJDJWmKPcKki7+c/34BaMBTQE6TakpZQg8NLp/dWHdHO7MIZL4MjAVosC+hs5NlcPF7q5/Z9Mbf3XDjdf+4895xazd2e8lUjaWUgl9MwnCFDTc5BsppAOugDi9M/0aa84jq90pJYYr6dcMwIAsAUHBsO0hgcDRcieIF6qyCbHBsG+Fr5WWFsd9Lk0k4VmBNBGjFKHqax9QIHu849xCRXs5sdZixwIYADfYpq08sXbqUli4lxcwt/3hw1WV/uOnvH7n7/gewbUefSiRrLaXcMoYpIgmyp4FFLTRUYKFhr8KAUfJC+xpYthXQXixe9+I4wIEogwJkIUdjEzU0qcFeZ74JhgAN9iHS6+rqoqVLl2oKJJ8efnrzm6//4y3ffvCRNbMeeWyVzhdcAkmpYoIGYTegErXwxEy4XAMlPEidALMqWW1UQXIx46xS5t4vgfGVoAl6RNWYauuME2W1RIi/LEPr+LIEzQTBrOuElKl8etXB4+t/FbQ6GvfXEOAr+so16bnngK6uLtHa2korVqxAR0eHCknPtizc+/Ca49ese/qi33fd9ObHn3wKg0NDShBJt1gI5OorsgLMgFULsibBQxJMed8CjOZS7jko8IWlFLDtoGbvJSjzJBC0q/TohqRoqbf+QUTucmZrien+MAT4igYRmzLo54TIsrEsC9sz7vy1T6xduvqpjW/9/Y23HNi9rQfbtm1n23FYSkcODvWFcoi+Vh4RCC5sj+ByDfKpGSikBBRcgJKALAYJh4qgX2UhNHGgWF8eK7SkBUEEzcqnJ79hOMhuBCxMIhAvQBRfDAZxgpkhhF/TF/XWlWxOP+4nKFCd1mAwS/LkeJXJHjm6+TsAsNhYf4YA/wdctwSAlh0ZoGbEpTIVf9fuZpnaPdtwbexttRWbqK226swerGzvXtrbXQ54iDiT4XUbt04dzObm9uzYsWT79t451113/RHbd/bJjVu70T8wyFIKnUglpVaa0pkMXNercDF9YmEwXLsWXmoiXEr48TslQVr5LnJlC9ww5ZegPxfl4gWWBKQMMre+zlWV91KZORrWCu6t1akZUMx6fL0lJjao+5uInm7r7JQm+2sI8BWLts5O2bV0qbqu689X9/T0vSubzihBSjLroJSCg5/V3DCq0AQMdeBGmOAYjUik2DI8fBGq/trIz6GCHRANCK/yjuF7FS3HI+1ytV2E1hokkIR0MJQrYHAwjcGhNDwN5VhECdsSIJIEIJ/Po1AoxLpwGQwvWqErJNKJsXAT4+HpWgjYwfwPAchnn1YVnhrNMQkr9uBYDmQwD4T31MYvK4jeo5unz58koYtZmt1cQ5PG1P8QADrb2ozUkyHAV3IQy/8xOJif+PSmnmQ+O8iCNEV6gBEhhQVo8Tv+cDOEWUcXxXALIWiwh4wkEErPoex9DF/iKWyqJ0Ik105U/lyZ1ULxfeZhoq0cb2ilkuU04vLx46Dy5xgM1poZpARJkLRIWglhA5KhIqorFgvI5bL+PF6ESQ+fAJkEhLLhUhLF1CwUrDHQAARrv+4PgYhBRQn0sPNLFTN5ARBpOLb0RQsUAyKYWxRZd/EkzG4yxBzrL2Yu0wgsfQYEZsUtSS2mJHLbjqir/2u4O+YiMwT4ioeQVLQsmy3LVhBKMsQwohjmBvJwq8i3HKubgCK0KlhE1qMYZgFyzMPj0naCC5diBEWh2ROqoOwpAVaYdqxjy1exbkZ6LvhJxGxROP4szJgGJ0drjUwmC89TEdGEJ5URFh5LKLsOumY6PNSBSCGYZgmGCAqfdRCcG26tgYMQXlQv6N8opE1+CUzwN1ebHRxawMO0BPcwEBCccAKgPFftP6XJmjIaVxDRUCezcX8NAf7PxABJQZMikGQiweXspqs4iBQjgvDSEVWIjLiSTPQwMlFVGJYq9iEi1djvkkX5ukJx48rlK/ZrmPoJj+C3j7R8BclzLJwWnglmRiabR67gxlzFEgmysEHKbx/LpiYgb40B6wRYKD9rEGgHCE2RtUVEAaeXW2J+hCK06HzSlAKwLH+HFTtg8iCZQZogAjFU34ITEOyf7zAUyCz8omatSkHPYPta+4kRoaV/TIIhoHWjZDkF6W3HNtVd297eLtqM9WcI0GDfRT5fQC6XGzEmKrSAgIe8nYSXmI2ibIRHCqTLpa/iBB8RsXh2a82WBNsmMHtAMBLp2WJ5ocnsW4O7T4JwEFvUkGA3r/ebVGPNGu1eQUQDy5ezRab0xRDg/wqI9rwd+/kKp77UwqvPZZvPZx+JCK7rIpvNQCkVWWqV6yQGPHaQcyaimJgDTzQA8BBKSQ03OZ9tH8tjepYELKFBrCE4SIJQLDHEHPTxcnmCiUqutb+u4QkwDgavE2mwlqrZ9uQUZ2jNa8bUf6+9ncWSJab0Za9CUOYUGLw6biQEpRTS6XREfiORKQtGQdTDdeai4DRDK989fb4kHSaiHNuCIAUB5UcceTcWZVUqrf5MZBuShsNF6GIe+4+to4PGOj8josLixSvEvq70bQjwfw2895OpaA8eu9kcynORe7rN8n/8PNb1YlmY6XQaxWKxPKnADAJDBYosDAkPgGe1opCYDU84EOwFSsuVB0XDD7BimahGmULdU42UQ7BAkTQ0BX4rVTyGfahl6w8KrGP//HUwCAW4WujWBGh2g9t9xOjE1cxMK1asMLE/4wL/j92BtPaD7SzANDxJUY3NiEc0F8pL8ir7VqnKW3hkqyaqSeOYHl5YRlNlky+Hix26ndlsFvl8vmw//Fm8vraUS0AiIBclalBwpiDjTITWCZ8guXSyy089lZETCYpuCIEx5pflSEBrgYR0kbQUSEkwSTBpCCYIpiiZQeRPF1bwXWBB4S0lSIiEBCjKbz1+U4gGCyDnMr9uekIeOsb7WJj57ejoMO6vIUCDfcZ4Dpgqm81GSY9q/K5JQmoLlvbAcOFak5CvnQNP1kErCwTtFz1XIJS5J9CIpSrsL+jPBwbDsgDLln4tJe9ZQbNmDhIwuy+J8cvjLRQ9oeY2ZeWMenXHfvX1f+hklktN2Ytxgf93veBgFsTzJIO9scD2dvkqK9irdVRb9vnuMxGhWCwil8vB1/bDMIl5EEFBgFiAiFGkRuSc/ZBLzIBHCQgtIYJOjj3Zl2Ey9hxYg9q3zhwHsC0RldJUk71n5vIZIs8ilV8mmQ9wysviiPHQx0+r/4SRujcWoME+av15nodMJhOR30h2EyBBpODC9TO/yQVwuQ7EDFsTWOioU2bkG1Sp1m+YDcj+85o92LaAkC9OExoJgXzRVa+b1WDtP977+iiix4ziiyHAVzXK7u8jxOvCeH1V9wzlbW7D118e2yv7NapnpuHr3APX9IVwbyutpLC0RSmFTCYDz9v9te/Tn4JHBJcaUEjMRiE5DVpZEFpDhwXJQVcKxY5Mi1IhdDQkjjhyi0v0SEEsTyHpOIGUfdjmEktLiWBiHIVWYyCgT4glOkI3WPgSV0SQIg8CwStCT64tWAuaimuOba7/BjOLZabo2bjAr3oSxLNneHkPHtXXXf5vpJzyy53xDaelAWGbWwbFYnEPwgsAsQdiQiExE4XUbBTYAQUthwoMDQGhCSIYZxk9wiwvU0BHpaxwyQUuubVSaCRty+8nDtsBq2WTucSlfkY4/jP+vABpCQ0BjwTbKqeOmSzdAycm30NEvV1doA4iQ4DGAjTYF1zeeK1fPp+v6PEdwfoF+R0TugHZ1AIMWVMBRc/71h/P0gsGBDQsQXAcv0fj2Yl5z/T2JXtQSCFfzKrFs5vsg0err8xynAeM62sI0OAlJJ/n8/oLtf7Q8gvJb3fLx5MgLtci48xB1p6LAjdAgkfs5ihfT7kFGlekCbfv1+UpEAEJW8IiBmsVa3SOtbpxqWwHOtAjrJAaK8nq+/sooeDminpeq7IObsndc+y4uks7meViI3ZqXGCDfYuE45bfngYOiDWUaES6ZgFcjILUGizkXm9ba12WuS0jW82AVkg4EpYEXsiwHDPrsUnQcROt7W+eVvcmIiquAthkf40F+KqAFgIqaCUgPVz5paq+H43s88XKJSB4uCVTzbp5ThYdVbZHIJwH+aIgk8mgUCiMaOmFP6Wy4QkFTxLIs6CRRDp5IFyaiwLVQEgFsFU6iaHFFcrMU7myc1mHBgEsYmK0DDARPAgIaCQSBBa+zFb0XmKAVSDBVRIx9ef6xrR8BEBCQxPDgw1JgA3NojCgj51Zax01te6dRNRnav4MAb66YGR7Rz41RNBaR5bfnsCTClIRJDJIoxZ5Zz+knQUoUgM0+UkLqWnPEjmRriGV+nB1eRaYg7yxJQkJWwRJYoG9SxeF7jRBaAEIAWExCvkh76QFrfahk4pX7F9PK0zczxCgwZ6acXu6CjxHtRbay+X3xrpESdwgm81Gll9c16/6ehiuUJCeA6kJrj0a6dThyIlZcOEAnAd0MFBcPPvxxK1pxGJz5dTFEOQrwDi28IcYhIOMqq02Lq0YT4UExElswRYAZ3Z6h85tthdOErccNyb5eRP3MwRoUP1aeplW8uKEoOIubVzcIP48VxFLDelIMKMoLORpErLJQ5GlKfDY9pVZtM98GjomYhrTwA7WHbnB8RLJcLYvVQk1QCPhCFiSfAXpSkXsYWetJJAQTQogQJOGkBoql1YHjCHr9dPp4ePG4CwiKjKzMHE/Q4AGr1pjlqNav7DDI6zz03qkNjV/qDkH092IBSwtkLUSGLT3Q04eDA+1sFDwC761gBLCHyBVQYBxwiqJQCDS6KvUpa6cUpl0JGSQAR7eLULlDEjldBiWPTMBBTetZrRALtm/efPicfLUGqJtRuLeEOC+Swy0Z2oru0t4hCiT14+uez2idRefozHMnIknPF6AMpiQ/FzXRSaTgeu6UQwwJKrK4xdsQQNQIg+whqUlPHZQsKagYB2AHI+BQqKcg3QYoavogCHEZv1S6bi4nCQJFcQJgpAaiSSBSfsDq3yJGD/RQgSG8MtltD9HWLAAC4YmBWIBCQHJAtl8Tk1qKMi37p/aeOJM+boaok0m6WEI0OBVjpBMCoUCstksXNeFECIivxEJnRhgG1KlAC6CYSHtjEVOLkSRp0NJX6RA+0J9Zd0kL1wYgiEtwHEk9iREV8r7+jNJNNlQglDw8npCKiPfcWhzZsEU572NRE8yG3l7Q4D7sEtY6T0953W81Pu8F8QXWn+FQgHpdNqf+TtCoiO0CKNxkCID0haElnAFo0CNGHIORFYvQEG3QHG6bJpdtZMZH7VZZl0K4Sczhll88fcRGAq2A1i2ANgDIve3ImYZ306g9yegAKHBxYwaX1uUJ89v2PaGmc4JDUSr2Xd7DfkZAjR4NZM8MyOfzyOXy+09YTNBaAvMFvKyDoPicGTVkShSLbR0Ae34NX9wS/Za5PLuQScJVZBWzN2PRmGShu1YkBLgPchRlDQVGEICuWJGTakvyLaFTUOHTHHOaiBavdxYfoYA9x0WKMWhmKpPlKQRHamSG1ZNpeW52n80bP0vjtsblrmENX676+0NqojBFPRZkAehHEAn4FIDsjwPg3QkinoitCgA7EFyMhxfXH7OYlXiNJKJrdlXfy4b0ubPH2YIkJDBhGFGypGQfj7GX7kgEPmCqBx8wJo8OOzH+hQRPClQdDPezEZtvWXh6C2HTBHnzE3SLdc88IC9hMg1F4YhwH0DWvsdIMx+c0JlbJ6HJQ2HLwT4pR0V1/nwrpJnd18JtHuJrOfo7saXF0LAdV3kcrmy7o74MsNdYB3sfzLI+PrxtoJlYVBOwxAWokAt0ML1Z3Eo6ScjoKOBRyU3lsFRcmX4TSXs+0UwJjN+Tn2lZwmCBMOD4xDqEnZQYkO+yow/rjxS0w+LoxUYQvgDmLx8UR0wPWmdOktsOm22eC0RPbV8OVtLDjPkZwjQ4FULIkI+n0c2m4XneXvc18ukfW08z5/pq0HwUIshORu91nHI8jRIrQDS0LBAeGE0CRkMUVbWUhq1qVnBdgQshwKhv0DgAKWYHwVNIVIRCo6DvPQ4levjoycl5UnznTsPn5r4EBE9ZRIehgD3SQghAivklZ2weK7rDhMXoXsbkl/4XNz1rbQASy4xlyIFVIAWWeRFLXI8E4N0ODI8Gwo1EEgj9Fm5LF5X2cXBw2r+qp4NUe1cSQC+vD6gkUjYEKIUx2CoMmuSmcHEEDIP4Wotcjl94oG11qL9UtedMEl+OFhGGPJ7ma4/cwoMXgqrL5SyymQyz1reUs0CBCSIHYAECiKJDOahD8chy/sj4VmwOQOXLKgqsvZaaz97/ILcZHwXV2kFIQipGgdC6GimiD/bpTJ7LZEpSNWAPvH+4xutNxxQ+8kTJskPd3ayDMjPiJoaC3DfhNI6qB4jCB4uR1/NQayM95VlKXdnkfHwAGG1+GJlQoV576ijMpnhum7k8lazyMoG/wT688QSSghomQGzC6haQCdRgIU0pqKfFyMj5oIRKDAH+04j0CcQxuKCbepQfj54X2TFxcTutR/E49iHwkJHdoNtMSxHwoOGpTSE8MOPUP56pdSQyoOXLnoHTE5Yi+ePGjhmnvzAvCT9sa2zUy5dagqcDQHu6wQYsxf2tOTv+VkytJu/hs8Af67OeZjlLRaLyOfzFS7tbg8OzH67BqkkJCuwtsBaIm9bGOKDMKQXokiTAQhoUlBEoL2J+zF2k1AqU0GtOHh/MHkwoBeOLeA4vnS9gA1mCQWCpAIkWVBFaEf30uLDx1hLFiTvP3gsPtpK9MDy5WwtWWJcXkOABq9aeJ4Xjavc3dD14eoqfj0dUwESCV/Tjy3kqRFDYhZ20THI6dlIKBeCPXgkY1NLXhiUtwAOJ09iBkgjmbRhQUMqBgsJxb4aDEhyrphWM1qlddysuuKxhyQ/cVQ9fkJERSNpZQjQ4DldjC/O8i/kNuNWX7FY3C35VbMI/b/jbOihICVy1IwhHIQ+fRjy1ihoyXCDUZT0HI+LY9ssvVaeNNGsowxw+LrfzysgBaMmaUEKDc0KRASLPKA4qBLkyiMPbLGOnq3/vWRW6vxWon8H6zDJDkOABq9mq69QKMB13b0i0VKtcSgMKiBYQsFBToxFrzgYA+IQFKgFtid9y08G8brnyfeR2IKoYvDpoLsjytIHdX7MSNgSqYQEUPAFppWrherHnAkJefRsO3fUPPsbR7SIS4lILWe2FgPKJDsMARo8i4UyrOCYqjh3/OyWWmyEbXVJ/OCneh7WXnz7hUIBxWIx6tWtLGsJiaZyqBAASAYUHHiwQNqFzR7yMokBmo1+sRAZzICnGwEiKIpJVT0PVHJdKJcVZUYYkBCAUEBUm+wAsEGcQY1DsCwN13M1ink9vtGyXjuvAQeM55+fekDNMiLaAACdnSyNy2sI0OBVSNZEhGKxCNd1I+2+5+KCe2TB0gyLi8iRi0G7BhnvYKRpLjKYgSK3gP0pGmWipC/o8cTuFNHqhfJfYRvMFixWSGInipYF7dRpz3PRWq/Fwv1rxeFz7A2HznA+OdemGwCgk1m2Adro+BkCNHjFkFbc9tsLa6miUDms6ysWiygUClFR80j1fSPO7g0Sqp5UEMhCKIkcZqNXH4QczUGRGlFEIzTJgJjUi3huKkZTUmh+24AWsEhCkOaMrmPPTeOAMRCvWyAxbZSz4vBDan51SD3+j4gG2jpZzmsDGw0/Q4AGr1KEFt9ISY49JcCg4RaCLeTEaOR4Mvr5CKT1fLiUhIoGsLl4KWv2mTUIIhh47gcKXG9QgTLWuLEJOmquhdceyne/9lDnG/s1O38jokJo9RniMwRosBcoi73HlEdeiKIOfk5Lj+xfaq3hui5c193Lbg4Gx4q2iQlgv2pPkQ3NozHE87ELByMnRkMLBisbYA0iDcG+7op+AUZiEPvWnS5pQseOn6IyaCJmT7sKxbSosfJiv5m2NWMSu284quah4+bXf3P+aOpSwe4sX87W4sVQxt01BGiwtwTIJTl7/Szy9+FzezLv17etyts9nqv8PTNHsb6wrSzuFlfr42XmgM8JTBIa5FtW7AEsoCGREylkeTqyeg7SNBVpmgpmG5YuQItw78O5yXtGflU1+cjfpq/iEpyjsA+ZNYgYLBgAMTzBulhgFjk5ZYKwpo/ROHpuTe/Bs5M/fd2x9b8aTfRw2IfTySyCOJ9JchgCNHi1QWsNz/PgeV5EfHtrUzIIpG1YADQXoUnCpXrk0YAhPRVZ7zDkMBkFKaEFILQA6VqwlX9OdjBVDmdnBgmGZgGGhCcAIg8SHogloCUrVyrtZsiycnJUXZ7mzJGYPdlWs8fK3xx/2Li/HTtb3kJEff4K20Vn5zJaupSUcXcNARo8/4AT+UrF+nn5vc+3ADo+5Ic1oLQqi/NVS4KMRJpRITEYmjQsKoIBuNJDHvXIq9nIqnnIYCLyNB5F1EGLLIiyIOECSDznIAANEyIApK4BYEFpj5mKrLRmz2MAfUgmsnLi5FHW3DEWpreo4mGHjt80ZQL99DVzav+UJFodrqetk2VnG5iI9NKlHeZ7awjQ4AWxshgeQlHn0G9EuctXGmvBVd1XoLqL6IsLlBxaBpcLHEfPUUBqCp6n4LkMz3OfE7HG5+r6a9YAtC5yE9I8UQxhCnK8P3I0GZ4gEDxIDEKyb/mBABYMru6vV5IbEQVHyGCtmYmYtA72mglgzZ5XADxP2LIomho9am2yMLbJwpyZDsa26J3jxuIfcybW/u11s0f9A8A2IsoDwKL25db5yxZzWM5C5utqCNDghcG8eW3MzPL7P/+/ZmaPIGGxkLGmg2AkY6AxHC9hGa4h6kf8Ki26iPgCtZSqWinE0FpDeT75KeWBNSCljAaF+9MhNTgcYgSUDf8JY2oMQEhAc0h9jJxnQdoTZVrPRk92Koa88XCpCUwCoHxwSAKkEwBbfqWf9ODUJmQkRkDVbwlusQh4rv+3JSiRSoLcHGpqbDjCQ0IW0FAHTBqjMbYlhRqLe0e3Jrvnzqjvnjia/rjftOSTY4HHiKg7fkrCUpYOIm+lMfYMARq80F4vExF42TKkahwapQr9WUmkSUEIUKA2HHY8xGy/2KBuEEdkyb7vGTf1SpYf+z2tZfNtY6yitYZ2PWjP8yXgA7n4kkMMaK0i4qPAqpSaI+WWuKgoRYopmm0rSaPGzMhv2ZF6yHWJF8zEvFRNX6PGLvZd//I5HQRmIpDrovDEU/0PcQWrB8r2ICJiZp44oWZGS4Mcy8TIu9jZNySenD+ndrpDifVzpozGtHEJTxfyd8ydnvCmT25cNSbZ+HBtSmzP5sut2kXty63FiwEsXqyXAWyyufsOjFX/MhPhL37xi5Y7H3zQsm2bXdel2uC1TCbj/9zDddWiNlq2FkBmD98Zbqfac7Woje1D8FxtsIeZ8Eem6r7krQJPmbwfXffdr7pE1Bscbz2AmjIGHm7KEgCPiHbtwflLAmgM/kwTUYaZk6ELOzLaRfvyZWL+YoTuLZtvoyFAA4MXB+3tAqvnE7qW7rll1c4Cq0f4fs4DYzUIXRWWWhtLdJFCW6cEgDYA885ro8UAdhiyMzAE+Mq0Al/2D4ZGeoKf394E4g4h6Yx0rFV3aQ+IqnJ9gWdMhuQMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMXkS8rHOBmZmWLl0qRl6iDZ2dbbsdZt3W2Sl7Vq2ixQCWLVumXuqZsNW2z8y0ePFiCSwGFgMrOzoUSkN2X1K0t7cLAOE51h0dHfrV8uVta2uTe7LcvHnz+NV03BWfKebPn89Ll+7F0PkAnZ2d8gfBd7fjZfyOGuwBUY/wZX8hCJzATMGX6n/qBvK/eNP7XzlHHHwn9maY+/M1Bp7jd9B8D/7XTgIzExHxI49saP75r6+d/8iatUjU1hI8F7BswAOUdvigA+fgoANnP/met71tu9Y6/GKCiLi9vV10dHToq3/+q1Pu/Oe/XzNn1vR8x2c//l0i6g/X/2LfhTs6OvQ1v+o65d77H3zNtMkT8heec8H3Gxtp11/uWPna2+5Y+Y5H16ztHdvcKKdNG//9r37pS1vC97xUVkJHR4deed9D0//vpps+5EGIN73hxD+88bgjH3gp9+NF+s4yMztf+eYVr73vwUczlgV4nhu8bJcWFMSsi/SaIxfmPvepTz3A/L9t4ISf2x/+9rcDVq1ee8ZQOsuStD2hZfSWj5334e+F52ZPrj8hBF9x1TXvv/+RVXMPOvCAnZ87/0PfIaLwO7HPWILWy7pxK5PcNZhd7tQ3WyQEWCb8sy8I4CTWbejBhg1b+s698EuPTJs49puf//QFfyEidHayXLqU9J/+/vfDbvnripv78p5Yt6UHX/7qt6cLId4fuNVqD8k48f7zz28+5vDDm85+//vX7Alxcnu7oI4O/uPNf1t4y4p7/rx9IC9d3opvfv+KmUT0vjVr1rlbdvafa9eOBtsJFNLqTwC2rF69+iWzJgDwsmXLaj518ddv3rxjcJ4L4Oab//yunTt3Lhg9evTQS3GTeJHhrV2/8adI1oxXrAGZCC5bgfCoNDOcZA3Wb9z8EwAfamtrk11dXWoPzl9q2Te/2ZjePpB4xzveQUcffcgzL+b5Ymbr/PPPHz17/vzmg+fNW79kyZL8COEiYmb73M9f8qcdvf0zvWIeY5pqMXns2NMCL0k82/F1dnZKIlJX/fj6dz2yas3PBnIKa9ZtxOVXXacBXNne3m51dHR4+woBipdz4w8+80wmp2jA1ZYuKFIebGiZBFtJwJLYlU5jVzrX/ExP76L/rH365gsv/trPmbnpBz9YTAB41X8entI3MCjySgxt3rajMNDft8iSEnvyJQ9d6vM+88UrBwri6eV3P3j7L7/1rZo9sYyX+eeN1zyzeWbfUE7mC8XB7bt6vV39/a8VRLjq6ivWDg4O5gqavEze9YSS7ktuJhHxwMBAcvuOvv36+3P5of7+XKaQn/LPx/47MyBH+h93idjVGCoy6aImz2UL2koCMgG2/AdEAsKpxVNbutczM3rmzaNnsbAsAPjBj3/+9vXP9Dy9flff2jvuu3sxACzt6nrBr5Vwe5/84rKzt7vW03c98Nijt95xx8xYnC/C0qVLRVdXl2r/6nc+tKWnb/r2voH06NbRWLxo8Tnnf/iDN3R2doo9+d6vWrWKAGDL9m0H9fSl2XV1X0/PDrVrR8/rAGDFihX7lAv8shJgXSoliIQEk5BkCyi1QRfcv+tC/jahsreNHd2w00nayHqet23Qdddu3HHmpVf88MbwQ1owb+6dY5oatrXUJ+pnT5uUmDB+7K9dz0NnZ6cMYirWokXtVnCcsr293WJmYmZqbm4WzFzTny6ekHatVK6g5L83bpSL2tuthWefbYUkuWhRuxW+r62zUwIQHatXc3t7u7VoyaL/Tmht2Tm6PtEwurHWGjO29XuaGYcdfHCNFCQBWAJs6aSSi9rbra6upwUA0dbWJiu/4G1tbXJRe7u1aNEiq9LtWRQcR7gflXf02DGKRYvara6uLtHe3i4aGxsz06dNvX3imMbkuOa61LjW0Xe/ZdHrNjAzLVu2jAE/iRNskwEI+Ps2bDvxcxHETKNtAhCd/rmp6rbFl20bYf0crbNNhstWW67ChxCkpRBkCdK8XRfcv6ti/jZdzP1dF3N/17p4q1fM/z2ZTKwHgDHz53NbZ6cMbn7RNtra/H1fvXq1ANpk9/buxf1D2ZQm4ax5Ym3PokXt1tBP77IAUHt7u1i0aJG1qL3dam/nMEYYHVu4v9Fxt418PN3d3cSdnXIgr16fLohU0RWyv6dPLPLPlxXelNrb20VnZ6e+6aab9tu5a8fVnuuK6ZMm1C086MBL3nvam689+5pr7HgSpLPKMXZ2dsrOzk45YcKp1N7eLg4++Ijbxo5pptoEN08e0yxnTZ/xCwA4//zzudrnNtLnEX4/n225cL8qz8dLHPd8hdy6g5Pzx+XLm9519if6Xv/Oc/lNH/wMv+ld51weX65v/fqmK6791Uc+8oXLefE7P6qXnPHR/Bkf+RRfcfW158fWNfqyb399UedNNxxNVPpQdmfahNYfM9cu/cinh173ro/q0z74sW5Lyj27axDFj6X5qh/+cPH3vve9/cLn3nL66ZPf8O5zCq991wV82lmf5A+cc8E8AJBClL033E8iqrTe9vQcitI+AfG3BV9KJJMJ/OCaaxZ995prltSkUtF7K9+fSiYhBA0jr2c/FyPfUNtipEgV52136xdUvt6K5Sg8hneec9GTJ777Y/ym93+CTzn9/b/Zm5i3EFT2vQitMQD46Oe+fNdJZ5yj3/qhj+tPtV/62j35Tkghqh539Nns5rjffcHnV5/07o/qt535MX3pN785vcpNxAGAu+9ecciVV1/7g8uu+vEPfv1/f3zDCN+JsmPcHbq710/74tcuXfzXlX+dHKyAKvePaPj+t7W1SSIqy8JXns/4+oZ9vhX7tafZ/FddEuSPy5c3df32xvU7BwtNTk0ddG7wO7Ve70VD48ZZ9du2eaFJ3/m3FWf/4cZbv7+zb4gc0nLymMZ111x5+Zx777032XXTLV96aM36bY31NeLweXNXf/FzF90WbCN52Xd+9M5HH398zqTRLa/J59X2uoa6f5793nf8ZubMmdu/fc3P3rkrU3zjw6ufPCOXzlJLU52aOG7MH55es2r1mFH16euu+u73Lr/6R19eedddPG3KNP3Dr1/2vZ913bBww6ZtnxvKZOsSUt/yqS985nsfPeeC93d39/D0yeMbjznisHVnv/+9vz39zDOnpb3EmiISTsoS7ttev+QDvYXCkVu3bj7Myw7x1CkTuw/Yb/aXX7948eMA6Oof//zQtevWn7t+w8YNY1ua6o489IBvnXXWWTsA4Mtfu2ThY09seEPfQFbPmTZZfOR97/zRoYceuiM8lz/8bddbHnlszSIpEkeCPahi/u558+fcccGZ7/4bACz72rfO/+9jT9iQdmLRsQtbLzz7rE+HLjIAXHN953H/efChk2qaGk6ClXBZ6ydmTG6954IPvvd3RJQJEk/isiu+c8mKu/9VmDlrprr04i/f+stf/9/h/f0D7xgc7E/V1tUNjBs38eqPfeC0v8QC8QKA/usddxz0j7vuf2smXzzeTtWmcrnsEwfOnXPPee9/5y+IyG1vbxfLli3D449vab7+j39452Amc4zjyGkJafHECZOWf+yDS79DRLtiMbgwCULvPPeitbuGCrNqHAGd7e96WufeMyOXs1KplAcAXT09um3MGA7LYAjAdb++YdHadU+eoSUWZIaGXKX4zoULF9xy9jvfed+nv/Sl2Y2tk96+Zt3GZRu39SZq62pobEPytu2bN985e87MMScdd/g3tuzsO+Tu+/91TM7TuRNPOPG2N56yZN2vf3PD9Vu2dtfX1aY2zps/a9kZb3zj2l3Z7OTrfvnbpU89vXluqrZhPuUzhcbGhlvPOff9P5vY0LCTmcWVP/vl4kxBn/rAfx79aDqdl3Uph6ZNnnDHU2tXr2ypq6FTTzv1+0tPPrkPAN9+771j/3LrivcUWBxak3Qa3OzQM/UJZ+WlX/7srQCy4WcqpcSVV1/3xo3be9tgObNzQ71Z0t7KIw87dGVLY2tOCiHS+d7tm7u78/fc8+/39PQP5ie3jk4uPvKI2886630PhzHAxzdsmNDZ9ef3ZTKZU7L5gpWsrS3WpFK3vPOUN/903rxJu8Lv340r75u+atW6C/oG+o7MDA3Cceze1pbGP33hgg//gojc4HMDM9N3f/iTt23ctevtJMW0zMBgf0La/zxxyZLfv+nE459+uWLSLysBLl++vOnHv71p/c7BfJNTUwfODVz5l99e+8lF7e3Wyo4Oj5lp/vyl9urVXcUPffKLv9zWl3tPLp93WxtS8vhDDz7qvLPf89BZF3yquCOj0FRfi8Pnz7juY+d86MP/euSRGX+6+babnnh643xPAZl8HiCBmlQCLXVO9+ELD/zm3ff+61v9OS2KLtgiQUoVYVkWEhJorrWGfvb9K0d//JLLNz319DNj6mpqMH+//Z9Y+8SaOf1DOUHSQgKFdf/38x8d/t7zP907kC2gpS6Jg/affc0nzz/7I23vec/0rEo+4YqUI8BqwqgG7MrkZSaThi2ApGNhVHPD9qMOOviMD73/nctPe/eZiznRuNyDgFVMw/HS4373u99tB4ALv/zlT2wfyF+5fecQ5k6biHM/9O6DF8yY8TAzN3/2sit+sLF7yxmZXAGFPAOskUracByJiaObfnrlV9rP+8inPnfrQM5dkskrzJ46duPVl3dMzecLxMz1F3/9ez966ulnzsgVPGTzBShIJBMO6lLAjClT177pxJNPO/aIeY8xc/JTF1+6/fFnuhvq6xvR2lzbt217b3M6nfOtA2lhdEsT5s+dfOlnzju7fdmyFfIrX3mdd/lV13z2kVVrOrL5QiKdK8DTQNKxUV+bxIQJY+/98Lvee87+M8c99s/77jvuhr/84/dPb901Pl904blFSCLU1tdj7Ki69UfMm/OuD7z3nfe3t7dTR0cHhwR4xrkXrd2Vzs9KSIkaqW7o/OkPThv25SbCxRdfLJYtWya+/aOfX/fQo6vPHEx7yBUUBDFqkgk4tq1mTx3bMTS088RNO9LHD+RcTVZCsHKRtBQIjFFNjTju0P0Oyylqu++h1Z/tHcxg3uwZu3LpdH5Td8/EQqGI1pZGnLz4mHN29fcXn1y34bu7+gcbBrJFFFyFWuknZKZMmrD+9a9/zemnHHP4f86+6HPd2/pzrZmc0paUgrUHEOAQY0xTLV636DX7v/sdb37iqmt/dsG//vPI5/IsJgxm8gARbElIWAKTxo959IPvf++7D5o55TFmrv/KlVf/9vEnnnzDUF4h72lIaNQkHaQcC5btgHQRDSl71XGvWfThW+9Ycc/23n5MHTcOi4847OzT2079MQD87Hed737w4cd/sGVHb2Mhl4fWDI8E6mpr0VqfeGq/KeM/c9q7Tr/vhj/e/I27H1z9xoKi5lxmCIIBYdtobKjHhJaav37+gg+3rVy5MtfW1kYXf/2qvzz5zKbX92c9FIoaCSLUJZKoSzg75sxovfjzn73gGmpvJ7zE1QmvaP+biLitbZ5ub28XtpQ325LAkKrIltAWTrEs6bpa9GfzyktnXa+okRaC8NfbV371iXUb5g+mcwXlKUwaOwqjmhrguS6yucJ4N+8e1lRXu5mUC0kAtAfHsZBI+qEwW1oDAECc7FVF4Q0OFor3Pfjoft07BwSTBSILraNaBwBktcauTN71svmix4IyAICCX0kgCNAguWHLdplgFxNGt8B2UhjKk7tpR3rsI0888WtmTuzqS+cKir1MgT2XrQHLsqI7oVIiW8hrr+jJXD6rPJXXiohw6Xd/9Nt1m7ad0bMz7Xq5AkbVSYxvbQAzo3ewgIKrP4jBLXWaZE8mV/QyBc8jIftzuTwJIfjiy7/zvTUbtp2xbSjn5jyFpuZGjG9ugCM0egbS7iOrn5pzw0033rpzJzcAcC3h9HlF4fUPuIUn1m5sdr0iRo1uQKrGAXPB27xlk3r6mS1fvuPeBw7v6Fji/aLrTx99/Oktl2/cPugM5Tw01NVhypgWWCSwfUe/+9QzW47+v5tv/KVj2/yL3//5oqc3do/PZrIFG8DUsa1oqU+hd6AfWY3plHKWAGAsXlwe2mBAkIW8B84jcfKp7zvvryedcfYtb3zPObec/I73/Pljn734rlv+cefijo4O/cOf/mLxY2uePHPjziEv43poHdWA0aOb4WkPmaIr05mhUydNGN8nhAVLSEC7sAWDwFCsNZGGxaykcLL5Ans518k9vnbTqPUbt050PQ3pOCjkcxjTUt/zxFMbfrZ63eaGgaEsah0LE0c1wLEsDGYLhSee2Tp9xR13XVuTSqn6mtR28oqQAmD2QIJRk3IAYrDWmDymadf1v73h7Y+v2/i97v7shP6hDEY11GDcqEZYtoPewZy7btP2Bd+7+ppvEsBX/fTXX1mzbsMbtu4adIUgTGiqR0NdHdJZD1t7c3rTzrS3K10A2bamZNLN5FwvX1C5dCbvKaAIAL/48x8OWHnfgz99fOPWxsG861m2gwmtTRjbXI9CoYD+bGFWkcSHnlmz5rjVa9e/Z9uugWbtFTGuIYlJo+tBENjRmyls6xk8+XtX//RzS5cuVcu+/p3z1j6z+fVb+gpFpTQmjmlEU2MNcm4WQ16+dTDT/zoCuO0lqpJ4RRHgnhxxR0eHXrBggU4kHLhaw2Nga0+vEEQAawsgiwRZytWeYzvo2TVwcl+moFPJVOKoQxYsX/bxD08/+bgjTlg4Z+r1+08ce90nPvz+cw87+IAltY798YQENLOuTybSBx8w65SmxsZDJk+YcDIAzyJYmsliaUtAY+yoem/auJYVYxrsu3Qh/+0gHmgzyALIYk3++UwkARJQGmwJYP9ZUzYeOGfW0W879aRD9p81pbMmZdtFT+d3pAvjf33TX96YzfcNCQELRBYDVqb8AxIEWKTZsqS05kybMHjNL3958JNPbzypdzBTqEkl7FnTJj56wrGHHfOmU99w6JxpU86bMb71zjFjx71bNE7aRcz1BLJAwgLIISL+yW/+eOzTW3rO3NHbX6h1bHvujIkPLj72qKPffNLxh0yZ0HJlbU3Czipd2Li9b9KPf/GjDzi2paA5wQxLc9GaPGF09rgjDr34DSefcMi8OdM+3FRfY5ElVe9AVv/jH3cew8y04q5/XfzUph4vVV/HE8ePuftNJ58079vLvjztmCMOPH/iuFGyt3+guPrJ9Qfd/d9V7xjoTx+UzXtcV9+QOO7ohT//9IVnzdhvv2nHHTBr8v9NGjv662ee9rYrmZk6liwpy3IyMQANQHCuqGq0tE6ynNpTYNedgmTTm7JFHFfMqxYAGBzKnTHQP6QcKWnqhNbNHzun7ejXHHvwrEnjaz922IKpdx1y+CFnvuPNbzhz/+kzjyPt9UkASVugqaHm42NaRi1sbKg9qra2do3UXj2YLSK2PbfAtY7A5HGjHpg8puWusU0NN5x0wgl/hZ387MzpU/JTJ4+7df85s9745lNOOmzKhHFX1KechOcW3Y1bt8z96W9+M/PYo484paWh7q2WdsGKuDaRwNxpkz/S2Fx3yITxYw8//vjje/9xz/0Xrt+8XUtpudMnjXu47W1vXnJ5+5emv+74oz45YWwTpbMZN51XJ912zwOH3vXPf07blS6oRE29NWn8mL8vfcvrjzth0fHHj2ttWS+dGmEnUnLWrJl/Pv7YI09ds+pJj0hazNJisqy8VhIAVj288ds9A0WHGMVRdQkcsP+Mz5z+tjcfcuJxR79h7tTxNzUmrRtOfNPJ71p03HF/aGluuH3OlLGZmRPH/Oz4Iw455t1tb3nNgjlT1yUsZfcOpfXmnbuWMrOTzhXfOTiU0QmH7Lkzx//7i584Y795B02eM2Vy7dfnzxn/j3d84vyzAL9jZ5+qA9wbpHM5zWBIAgQxnGRShOWaBA0Cg8kPuhLIVWRxkaG29/bOuWnFv4/92PvbbiaifwDAJe1fEAAG37z0vatFqoFIWJTPZdKXfPyjfw0/gS9/9kIS8ADBKHguTxnbPHjaG45731tOPOXGMMh17jve2KSYdTUSZxLQGkg5EgsPnPXxD7z73fcBwKZNPV9q/+aVbx7KFWS26PH6pzcc11RTs5pY+8EtwVXKUDWIFJgUUqmU293T965M3rdLRjXUqdNPO+Xjxx121L3Bwv8F8MPoBqOhiRmCGVoTCQIeevihEwbzHpNm0VpXq85oO+2DRx+43yNBeOLR875w8elrNuwaP5gv8Obt3e8sut4PLvryV5WChxonIetS1k2fOe+sS4PlH373Ry78gpDJaUop+s9/Hhz6138eXVhwuZXIcmtSCTFuzKgnr//pNdOu+cmP6KB5B+yyLWvIcRI1/QOD3vIVK0clU0nbyxZ1tqjEzt6Bw277+z/nX3zhBbcTURsAXPbJ80a4Z/rdW8QKliCQKsJiAcUWPKUgWEG7GQpqAjMEIQXrYiFXrP/n3Q+fcsThC/5+3rtPu0ppviq2/rtPedd5HjOBiEEorL7+u99+CAC+C+AHP/6pBWhoLqqaGlscesCcr7R/+mMXK0+BAVx9xVcB4Bv/Wbv2Z4fOmRPFah9av15/49vXfLwvPQTASW3c1D3lsx8/f/lbTj+dpKgnRZJU0cP2tf/622+u//0zAPCaoxYeoTSOKriK6+tq7EnjJ/T85pe/aLjiyivmT5o69Skh7TW2TMzJFVzv9hV3LhCArTQJx7Zp7KjGq9540mvvBoCPf759xc6h4nQhHN6wbt3fr/zyhRsu/+614/0vKsBCQrPKMnPTRy667LhstqgaE7Yzc9yYm7762Qu/+dXgEADcCgDXfefrYGb6+hcvOgVALRENhMd5+VU/vjiZsn89mM4hp9QE/9zTIBGBVFFlB3MTlq987HVvO+mkfy6YMeNzAHDJZy+MDB1DgBUIqpLoicfX1OTyBQgCbEEY09SY1syx64HhWNIuFAuYOmnsDdv70mdv2zWgV63bPLF7Z/+vHnjo0dwXv/GDO/efNuFz71n6tofa29vFQ+s2p2KpKXFx+wUNQEs6WiEA1oxUKmVZJP/+lhNPuXHevHnO/PnL1Lx5qxhNz+rCk9aM21bes66trU3O6+zkScAWy7YHiGisUgqPP/GE5zhOnOuezSwW23f1j897iiwpHQv09JKjjlve1tYm0dYGdHWhq2set7Wttrq6uoqluKu/XgLgucWDWCmybMsWlr3uqAVzV7W1dUrMg1y2DF5COPfWJlKn5d0idg32jQEgSAgthIAQEkPpTKGtrU32zJtnE1H+1Hd/aIdt10xn/6Spe+6/d0LRLbIUoP6BXjz6xOD7WyZOeb8SNrr7s/AKLpKOgzqHcN+dtz0+Z+Gxt6ZBZ3VvHyg+uOqpAzZtqvvz46s7ej/xxa//atHrXnPl25YcPWIhsp8RAbWObtnsUPFDPZs3F+1kEtnsAFtcA+1aqwFQc0PtT+obas/rzQ06W3qH7KEHHr748fXrLr7g85fc39xY//WLP/3xPwHAez72sfrenSpKaRLLmvb2dtENJK/t6MgSSQ6+HYmEZQ184RPnXf7FC89HW1ub7Jo3jxHEKPXgYPHTF196BlnJt3X37Gy5+LLvjvHIkWyloDyN3p5et729Xax9prt2qKijg7FqWhrCLOwjq54Yrz1lWcJWQ7ki7n1o1Yn1tY0njkk1oKgJhXQaNRYhSRob1q8rzJ4+eejhp3dSvlhUW7p7vtnx7R/aqbqGuY889ujpuXyuOLY56cyfOZcWtLcLKWV0pyUAqZpa9+abb67N57M1xHATyaR0Uqm/ob1dtM+fb80H1NKuLmDePOZlyzj4LLwbl9/T+oXLrzovkx54zdbtu5x7H107KVvQLKRFynUVlpHX0PCDHzU1NZy0eXufeKanb2L/vf/+/n9XPYZPXnzZX8aOavrmZz9+/sqXKwnySowBUrq7m5iZOjs7ZfrmbrKk5FRt8qOFYhEEtmwBr7W58UZPKYehmZnBzJBSKmbgUx8566L9pk/4+bRxzWipTyE7NIhN3TtT/35k7Ul33v/fe6/9ZdfxHR0dmrQqO/66Okd1dHREjfMcJDQFM0grbm9vF62trbqzsy0SFdhdyQoH366xo0enurq6VIffaiQgBDEzBBHcYnnRvdYaiUSC4lUIKGMxIJtOkxAEIoLl2G7Rdamrq0t1LV2qOzs7dXs7RHNzM5eTMSLLMpvJqHB9tpQaAHd1LVU9WKU7sAyWY3ua/aNXrhsdZ9hKlkolqKurS6W7u1UQqrUQfAYAUCwUQUTwlELKsSGg7sqm+27NDvbfWswO3ipV/nbKpm8fVZ+4/U0nn5w+/6MfWrZg9pRb5k0f6zTUJLCzrw/rt25rWb95+8f+euvf7rvpttumEFGV8iYGs4KTTNLOnh13X3fFV/92U+cvlt/wi2uX33Hj71f84LvfXnHaaSf1tHV2inPPet/Dxxyx8HML5kzuHdWYoKJy8cwz3XjiqU1Hrtu45YZLv/3dS4QQjN7eMnIlTaqjo0MX/FsTWFrQJAAmCDD/5S9/SQQ1brrdt4hx2fd/9uGrfvGndWs27fzNw09uaksr6wQwFhSyGUgBYjC00NTR0aFzQY9n7KYZfQeLhSLgHyPXplJIJuz7B/p7b82lB24tpgdvldq7jdzs7Umhb585a8qDs6dO/1pLS+MOz/No8/a+/R5cte6Gux5Y9bVN2zM1dTUtzujG+lVnLn3Lrzs6OrS0LBUvXCEievLJJ7XnqdAegGXZBV62jLFqlV7a1qY729rQHhhNzFz/le//9LrfdN246tEn13917YbukyGt12rNc1j7iSNB0D8ce3XjpZ+54E9HHrz/tbOmtOYb6xPIZLN4+pmteOLJjW9c8/TGFd+5+pp3EhG3jVBLuq9ZgDzjda8LFWAUAHXNL/9w6Yq77ztCK+Va0rZbmhv/+67T3rSm5sYbm8HQJfLg8MMcAvCBux54oP3+e//70Y0bNx2zoTdz1EBWuVt3Dibvue9fZwO4i7m8IKmnp08A4OBC4/iFRlDo6LhML1q0aK9vGtlcvrBoUbu1cmWHBqCymYwk8tc/e84s+eC9WzgRI7nHn3qgEGbCledlKkiWyXPXWwz2lNKu5klZYDyAbRdccIFNRAUAXphtP/eTX+C458gAWke3Fnds3sVEhKFs2rZtWy9atMhK3d8r8dervF2f+nxSCwZrRn2yNguAtS55+uF5LvE8xc4V5PRpk7Y8uHoDgRn1qRTOOuPtXzjx+KP/We3c/IgI/MEPAsAb/3bnPcc++sjj79m4tfuUZ7b2TMkUC8XunYNj77//0Y8BuGjFCkhUtDhyQO5uscAAqK2t3e6a5x9/e+BWdflFwnTOe077FjNf9bWrrnlrz86+pdu2D5w0MJRxuncNSrcwdJ7Wa75y9NHvc1tmHBIdq21bDgDKDg7G2QJhwV1tbS0DwLIVK2RHR4c394CD3vPMhi3XPrNlBxprbcyeMmFLY2PDrY+vevQ+W6vvaWHX+JedV/WW6Xle9N2bNG1S98NrN7oaimoSEkuOPfwzH3nPO+7cXX3qJy658qltOwdbwfliPjsg7WSdHNNSMzB5bMs/lhx//AU/+clP+oPPkIk5+pp7rktnnHGGeuSrP1AgULFYRDabnUpEvOjMdgtE3tLgeuzo6KBv/Ohnl69Z+9RZ27f36FGjmjFj+sSHx7S2PrhrMNu8avWatxI0oCUaGxuhtcbHP/TecwaYv/D1b3y3bXAw+/bt2/oWDWaz3N07lKBHHr0AwO/mrVq1b1mA/QAUAVoIEDMYTG2ARNcyedtttzX+8Me/PuK8z3Z8dcU9939px2BWFRXr1qYEDl4w+2ueUlRbWyshiBUITAJC+kmIW25ZPum3N/314sa6UTUXXfDhz3zvm5ccN3+/6X+2kzqpLcGbt/UIAMjn8kwaENCw2MM3vvGTDDNTYN2RgAKD4AkbLKrfK4g1JDM0BDg4nXnk4Ys2WCwhMXvq9NErV3Z4Ugh99c9/f0GuqEcBdjFpOzS6qenegw87zHGcBFwXbk1DY+qij17y+pUdHV4i4aB5zMRjXVdDsgodBD2mpeWBhCUIBG8wnan9/lU/eisB+qqrriowc8NXvnXlF790+SULiIiFlJYGw4+OMpiBnFf8k8VF8pTnFbU37fvXXX/2ypUrvb/+9arCA2vWHFlQ3gm5XM5LOJaura27vyaZcAWRpYLL3g7IdGF4FyUB0oDWgLStVNtb3/oQiAuwJIZyLt/4t+WfYeZIpaDrxlsOvOSKqzt+d/PtS5gZ/3fzzTOuuf76M19//NGrL/roWede//2vT5s7a9ojJMjRkGrVE2uyAIDF5edeIQFNElA5tDQlm/mBByys6kLn6tXUtrqDVq/uoLY2yLa2NmlbNn//Jz8/4zs/vfbgL3zsI7//ziWfP+30095wbmNjra3JEgODrvf+xSdSIpFgrYvsQUNLwtTp05KCiDuvuCIPAIJBpAkE/zsbFRX/9rcEAH+5459Hbu3ZqZNJW02ZMGb5z7/zlUmXfeajH77k0x++zU7Y5LJgBiHsjXQ9j5nBkj3YrDF3fEsmECvAmW1HPZqyqVdaluxNZ3n1U+u/y8wpALCkxB3//OfcZZd/q+O633S+GQCuuOpHH92yaf3RRa+oaxsaVxyzcP8PzJzacvx5Z7714Ksv/9LbT33dMVvC77YNF0wEJoLQLlBwaydMmNDDXu4R24YYymV0JpP5CDOPX3l9R762pgZX/6Kr7Ws/+MnFtiX5n/96+OBtvUOqqaGe5k+fdMXVl33p4C9e8OGzJowadYfjJEhpgiBJfX19LjPbX7n8ijfefccdE7/62U/86PuXfeH1xx+z8PuplJPQZHP3zoGXrSf9ZbcAhe/8c9EtMCA/kH332W/WSuMHv74xWVtXN2FgKA3XVcpzXR43tjWx8OD9Os8+Y2kXADQ1NXkMYhCxZqDgKs3MiU9dfOkvt/VmFq+4+18Xf+6y79ySGUz3PLluw9G66LmQsA+af4C+/Q/A+ElTnP50Xnue1gWyR336q9+9Rbj5aZd863ufsy35pwu//DWpiZiFAAvBI5XqKJKsScIru58wQ0gMFpV65KlnOj918Tf+ZCWSE+79z6MnD2RzijXb40Y16bM/8sG7H7r77pqf/t8taudAkdN5TXfd/9B1n1p25Ym5fH7/R9euP3Yw5yohLMna49XrNtef/f4P3XfFj6/N9wxknd6hgvvfVU99/1Ptl7+Bhd39gY9/9rVD2fyMlobUhQ888MBx37u+Mw1hMUMBxEpKgaVnnHbH737dlVmzfmuqNyPUP+554Ecf/fwlxzQ1NFnX/PhXp+3YmU5oTcWxrS3W8ccs/N01V2hoKTWTn6pxgzPxYGgRkmTNFmtI2MJJAdCTJ7Ve723tO7u3dyi/aeuuU8/57Ffuu6jjO//J5YZa/nLHXW8ayhacZzZsPOeGv/71zX/568rrMrn8gkfXPJP77Feu+GOhWKzZvHXXrEJBFWtrRWL+nP2zfwr4b+WwEINg1ytyTtgnnvrdn6zlg4/V1xMAfAgMUpYkud/MiV1fWXTSo/c99NivCvmC/sSXLv83bGf1LbctP34oM6SZmceOaZE//d0zvOzaa+Uj9zxkecrS6bwST23Zdd7Hv3zZhz53yVc3CKIPuprh99FoaMhh34l8Ia+0cFgTc9bjqZ/62lXvkW5h/FXX33RukRO2JvI0sWUHl96smTOsZzb2iJxLugBJ3Tz6us9fdsWEjsuv+BvRlI9/8bKvX5tev/XLvRkv/9Qzmw8+65Nf/PdnOr55r7Tsab/5v1uO7RtMpzZv68vdeOON8//9+FPjXaVgASqbyS1Z89Tmhbv6+jZ9e/3PE+/52BdTY5ub/3vM0Yf99I1Ljr1ZKSIFwS4l2INgsizBzNhv/5k35NduOGTnrv78U1t2tH7kMx33f+bSb/+NhTzwngcePqJYyKH961e0PPj4xoKQAjlPYWdGHXXJVT8/zXXd1z629unzsnnXtaS0NIHPP/98/ZVvXv2LVU9teOczPX341CVX3MbgrQ8++ugp+WLBY0g5ZcoUEICOjn2SAD0p4ZKGJLKcRiXtRmUBLmv07eiHUEXU1iTltEkTMXvWjK994qz3feWev6VkV5ff+6iVlhKaLAFoRuHBB+9sGRwYPK5n1xA29wzIZGLXqY4QKBZdJCwbE5rqikctPPRyAHj3GUuf+f0fbxb9m3aITIH4v6vWnQQ3g1mTRv/R9dSMT7ZfXpDQZLEH1vaw+EShkNNas/Bzq+Sbg5ErqCSxRyxtuX0o37JjaNsHXdeFVgUtpZDjRjVg+sTxZ9YRdQsiXPzVK/6QyXtLe/oyau367rra2syHXNeDlRSwbEe6Xg5CADrXXzNzwYInr++66cJM4T8/3LSjV+wYzKN3aOMbpbTgugUoJowZ3Vrb0NAwVnlaCQESpEGsWUqJ4w88sO8PN9/+KeDuH63etAPbBwrIuoNnept2IpfLciKZpMmtTYkZkyd+/Z1vO/UfSinnoku+wRKaBGmoisQ3gyQLQUSAx+wRET/44INf/Vnnnw9ReXX40GCGM3nvUGGlDxXsIZ9PI5lMoKW5tjGfLZwwlHMXbNs5hO6dA6lkMvUuISQKBYXaVArjWxp6T3/b2zov+9wnKEgRldrP2IWEIgiLsh6BRM00KTmIDfpZH08wknUN83fu3HFg31AOQ5mC6MtuPVLY8kjtFqAKOUwcPxZTp467FEBx2dlnJz7d/Y2e1U93t2RcFDd37zxuq5fD5Mlj8YNfd/7VK+T7pNAk4YIhou/E+DPOYFx7LU44/ph/3ffo43Ljlm7etHXbjF19g7/U7Id+LZkC54cgyIILTwPA586/cFf7lVemn9zQU1f0hH74qU1LUBjC3Mlj5l7/69/dcvThh172w5//ZjHtHDq+fyiDjdsK87ftSs9XSqFYLCJZUwdFUm/fvqnmyOOW3L1lZxp9gxuFJZJyUFujEnUtozK5HJ7esgPdPf3T+jO5t/32ln/O2rDm4YwUgrQgCSmJLMvfnwvO/dEXvvndt+XyxUP7hwq8ZtPOyUln4ENF5aGQy2LKmCYU80U+aO70B1c9tXHJtr6c9/j6zcds6dl1TDaXhyUF6mqTdiGXQbHguQ+tXj29b2jg9F3pHLoHi7B2Zk6UpKHcAuAWMHHCWMyZO2cZA2hrW01dXfuQC9wEwCLkhMrlbZ3PSy+Xp2I6J4vpnONlchOaa3LzZk3uO/7IQ29c+vZTT7ro7DO/QETZefNKsQJHeDlbDeUtnc07pJzDDlvUfdThR558xMHz/z2uqTbXUmejNsVorrMLsye1/vM1Rx16SttbTljV3t5uvf64hf+eP2fal6eMqultTCga21KLia3N+dHNTX/Y1t/PbmFwZ61wC3YxnXe0W6jc/1TLrIY6R7qOl8mRl8vXOFYjALxz6dJDxzQ3uI47mJvSnHxsv2kTb6tLSm9sSz2aahwxd8q4LUcesuC9F577vl+0t7dbmpkuPO+D5x0wY9LN4xsTNH5sC9UmgTGNztaTXnPEDTMntmyzVDYvWOUpkXAB0Jltb/7RSYuPOm/+1PFP1CeE29JUi6Y6GxNGNxUWH3XoA0cfftzhc+bMWdmQFDXCzeYtN51PWiTzhWIKgDjtTa+75sRFx55x2H7TH2ttTGVZFTCqsRZTx7XQ1LHNj51w7OFf/OLHzvpcGPuTcHMJnck7nM0nLb9oNnSBk6TyCZXN2yqbnzRhVB0ALFy4cMMXP3HOkgVzJl8zfUJzYXS9g1ENDhzK8/iW2v4jDt7/L+86/fQT3/X2t3ztDaec9MmjD52/ecLoRrQ21aKhxkZTjcwduv/0u9/1llNff+DcqU/HQhPRd7fGBhI6n7d1Lme7mbwsDOSEl8kJlc0JL5sjLzskVT432N/X+6ULP/feoxYuuHXmpNZ8Y0pgdEMSDQ7rBXOmDBx/+IHfvPRzF3132bJlkojyi48/7pwZE0c9ObE55YxvrsGoplpuSNU8lLSTPUJ7wtb5vKMyeUeoXKlcYYVub28X537g3TceNGf67yc21+Zb6xOodQi1Sbuw36wpv1lyzCErR6U4Z+u819hQIwFg/Pj6ntccfcQ5B86cMFgni2JiSx2mjGn2Wpoal9clUwNz5swpXnFZ+2mH7j/9Z5NG1W1vrLHR1JBCjcOY2No4OHva2N+/4ZTXveXUM87fsfLOOy/t7tnBDbVJOaa57tFaB/8UqnDn1IljMvW1SeQ8ndvYvZMfe+zB8w8/cL+srfOFGs7kHJXO68KQG3g0Oz//kQ+etPCAub+eMq6lOKapFs21DhqTUs2fOWn9oqOP+FrHFy765Nlnvev7h+w3/b4JjUlrXGMSti5gUmtT9rXHHHbNjNaGv6Tg5WsdS9Fm95kTXvuaI15z1MIHJo9uyNUKD6MbkmhKwD18wextJx1/1HmfPOfM29vbeY/UbF4VFmCY7l6xYsVgjZU82MJOAe1XbNRw0NiogNNPfgPe8pa3uEQU1FO1C+ZlHAo3/ulPfxpsrU0cvGXLgKhtbUBrfU0aYPrQe+kOy5JH3HDDX6fsHNx5dF7lZF2q7t4PnnHGek+pUFjSA0AXnv2+r9xw/fU/fCZTOGjK1OnjmpPi/hNOOGHdZRd/Addff/3Zg/29g0XX5eYk5QBg5cqVXpiUcGtre0fXNxy8Y/MW7eRALc01DAATZsz4W+voB2eJnIuzlp7cd/xxx+Z+d/NtBzLzAZvWPfXUJy/4yGqi/2/vzKOjKrIGfqve1t3p7DsGAgQCJBBWBQQMKqMjgjJot7KIoCLbALIpKNjdLCoICuggIKKiiHbrAIqgiAIKIojKlkBYspB97U7v/bb6/kg3hpC4jd+MztTvHE44yXv1qm69uq/q1q17kdtgsDIWi1EGAIiMjKzFCA1/b8fuTMKy3d0utyv7+qwv09LS6q3WT2JKCwo0AdEFmR07VgEAMRgMzKi7//oKIeTV1Zs2ddTr9T0ZYKBL29bf3nzz4At+fwAIIeiR2bMnCKJL43UESES4NrSJoBoMBmbE0CHvEkI+eG3btvjScnunLp3TkzWsah9+222fNA46izEWly5dOpDHEsOBBHE6jRcAYOPGjTIAQEIEf3d1tYfzKgADe9wqb4SGA/XJyckeAJh88uTJpcdO596gD4vQFBVfujiod+/CAQMGVC0GAIPByowf8ZcXCSGv7vr88wyf19uhzu70BwLeY7MmTSpZ1rC7jJoJ1on79u4+/ONPP3XqQ4dhvQA6XfD/jVwFsSdRjIxEtSzDDD165lirg/uPZ7RJbZ/gdtjzHhxtuBx6vyzB45cIoS8JId3+uWvvUJVFGoHlC4cPyT6GEFLWrVt3UseRjV6/DOF6rXrgwGBnYx82i8XiAYD79+zZk1xcWdMvPDJSGxEbdfzOm246TwhhBF9lYmlNjW7onXfbLfMWhNr2zokTF/ft+nx326zMzA48QM6dd952UlGU0N+rAeChU0Wnog99frxrdFxc67qamsLUhIT8u4YPq1hLANZs2jSmtKyilz8gkaTkuINvrl42mPx49DR6pumZ3Wcult8AiBC/q16PMS4F4kmPYH0S9qno0tkcBwCAiRAcgVANz/NjT+Scf+HrI9+kcRzLASFnx426Nw8h5J384H0IAIo4lu1v2/1ZH5/TlR7wucUBN990tGNKSjECgLkmU6uq6mr1fP15v9FoPE4I6fvZZ4eTjnx7OC2zR/fWAZ/7+9H33FMe9CHEFgv6r0lZ8PtjMDDWX7FFHtzFbdY/pelWewuRKH7vUOiohTo2shheHcnjZ+r3s3/7JZFcfkqm1t/BJaFpxJmmMg494yfcH363MPEtybc5Obb0zF9Slxbb/Ov76krbCSEtpYQAg8HAW61WZsGyZcZ7Hp1FhoyZLhonzrY/u/rl55a+8MKdhnGTbpj0hMU8cuJj9uxRUwLGyfPIyrUbR/3WfmsUSamF8XFtPU0mgn/LO/xvmYz9x31eCGnRk440mTG2eD9qcJELHn4nTV6sn00IRAhBNpsN58THIzhw4Mp1oRfQ3OD42bhK1zwfSMgloyFiScgnLnSfyWTCMHgwhgMHVPOPjqQtDIbBODOzmhgMDQmhQjIizcsCmUwm1KSdpLH4GoSDIJROoJmXHYw2G86Ij0eZ1dXEaDSqTdvapA5Xy6LRYGiujj/2w2DIzV1HrFar2lw9bDYbzsmJR0H3959N4GQymbDFbCZgNiMIxjds6T0KPa9pX7fUF42vayyTkLyuvHMt9GMw5mJDYixoeKdC95rNZtT0ucHrUcM7MlhtbkZECEFGmw1n5MSj3MxqYjUYrvho7j10KPndD/acKKyqjyeyRKL0eiTLIiiKArwggMftBm1YGGR17nB+ybxp/c1mswMAwGI2k2b7tJnx04yskIkQBOYDuEmfNX7/yVXvmdGIM6ZORT83Dv5nFCCFQvnXCJkq3ti+q/e33+e8X1FV3dYvISCEAQ6pwIIMeq0gpqe323f/qBGz0hISzv8XpESgCpBCoTReiSBCCAlf/cbbvSvKqm6qqKjDAseQzC4dSdfOHXf+5ab+J9Ufbao0BSaFQvnvmgn+3ITnfzIEPZ0B/sGWK0F7VQs2vd/Wj4SAKZjo6L8pCfi/a/Z0RZB/gJlRk/qEXpVffG+DnTCn0dgeDADN2xUpFMr/KA270NfMiJAhmFTrt3yIgsmE8G+ZaRkMV5IGNfn9tUm0KJQ/40yD3fTWW53+NmZM8v0PPdRqlskU83uU++ijj8b9bcyY5CmzZ7feuXNnh6aziD8rBquVyTaZ2P8nVwncqF9icnMLk91uksyx7K9ZUl5RfIQQ/K+2tVF9wnMLC5PdbneyRqP5LfWh0CXwH1IB4kdnzDtVUetMYxgWbujeZfeTc6ff80sTdjfXfxgBmTR99tfFte6eDENwr64Zh0yPz7oV4NrIKZSr3nti/fDj+44cP/VIrcPdHQPoeRYRnUY43SU9bf+jD456ESFU9XMbBgaDlbHZjIp56YplZwuKb3Y4fe64+Ej+lkH9lj88yvCJ1WrFjVNWNl9GQ/9bP/j0lh/yLswuLy3pjhkcizEmgsCfT2vX9ujIu4cvb5scXRDa8aVd+PvAUhH8+2AYrI6ZMgdkLGgUhEEFRgMA8K8cfyQEQESMRmY0GiAKSAr86Xf3gtFQyEzzqskFRSWZvOq5aHtjwxoIhWn+FwhmoUMvbti0+aO9B8fV1AfALxGQZT8wSCU8z/W9XFPf92xxxejN1u3DAOBMS0ondEKFEBL58GMLJjgllIx0keCSGcjLL3YBwB7bzxxuJYQgBmNl9YY352z/7LPlDq/CyGIAFEUBAAyIY3uU1Ll6nLt44fbn16572F1beYAqQaoA/1R2ppygQdpsNqsTpj9BFCAEYQyERUpzA6LBITgHZWZmXnGG/qlnyIAUAgpBBAA3sxK74mQLgH9pmS3VCQBUi9lM4Kech39sr/JTjsIhY32TOjWEsFdVnXHirKWYFWJBRKcIIWuRzYahISACaa5tIRk3OjZ3FdnBlI9Rye1Hnsi5OK6syiEjhmcidQLSanUQkETk8/nA7qiTgaht2iclRDQk5jI0u/RscHQG+YWNr93hkdTkgKKKmJGx1+VHZeVV2YcPH04dMGBAUUsKK5hfV3nbur3HgW++W1lprycMA4pOyzFhugiQFALuAAFHfb2oRVJbnS6t17wZli+COYypAqQK8I89i0EIQePlj8VigQenzcWArkQnRVcpBKMNI4SUpktXQ8NRwBaVFgISTItOrlUyP5ZJGg+aX7LsDg5cCCqUH6+1WMBqtTKhtplMJpybm4ua1t1isVxT95Dia6mdGRkZCCEkr1y7tg2DSKTH7ZBZDmoaBci9RoE0bpulIaYSau7US0JuLiGE4EnzzJMrHX4VMEtSEmPEjLTUOZGR2uM+UW5Xfrl4Zll56fUJ8eFbZ0wcezgog2blZLFYVIZh4HJx2dR6p5OwiGVUUWQEBssBSQw/euLMfQCwIqic1WbWvoDefx9+OHHi0eraOsIgkBIi9WzXTh2XhYfrP/JJckJRSaWhplIeHROm+XrGpIdXNjrHTqEK8I+JyWTCCCEVYwwHjp/IPn0mNzoiTIPGjrz7+PiZCwIA6Crja3bDoCcAoBBCIjZueSeLF4Q4RfbX3Tx06Mm0mJj6oDsEgl/oEpGdnd24zPA33vngOhGgM6iien3fPkeCCXtaLK/xrGX37i/ji6tK+zCYE4gq5j/y4Ki8YOTpqwIVnLl8Oeb40eN9XE5nWExMDBk4sP+x1Pj4slBibIQQaVQn/ca33s/kdbpkgmTnhJF3HUGoIeAEISR6/RbbPT7pIisDA0KYPsm0fHmro/uPS4MH9xbnz59fDwDIZrMphBDdK5s3JxHMZQkMD7169iy4oUfGycbPbFRPBQDCiKL2kCQFh+m0OCo8fMPj0x/+R7DZRwkh761fvz71rrvuqlr1jAWZzWZiaSZQXUg+G97bmbp33xf9JJkgrQajmGg9VNTascsLkFdY8jdCyCqz2dzsbM1mNKoMxiDLcj9RVhHLa/jIyKgDCx6buvDKxw3BR+s2b3s6KUrjWPeiAsFjjpTf0RhM+Z2Vn8ViUb85eTLlw48+faus2jnYJ8qAEQG9Pqyuxl7Pujw+Pc9xuH+PzrsWzZoyPDhj0a1e/6Yl51z+GJerPonnBRBFEbRhmqrMbp22zZ04fhFCyN1kZoMQAHlw5rzj5XZfb14l0DMj/fPFT84cEhz0/PI16xcXldU8UFFjj+E0nAaDAloW7GmtW28wPTFrwcJFi65ZnoXacPjUqc67P92/OP9C4e0YMREAAIGAKEVGRV3u0bXjS39/eOxas9mMHnvssTabtmyz5FwqGx4IiNEYIUAYA4fB2aVDyvsPjR1viosLKwnuTLPPrln/9MWCogn1bv91DK8FBSSIj+QLemZ23BItxO/47sz5T4vrahIq7S5AmAUeq4AVyYFUhbRLTflq7bOL7sYIwcLlL02qczkXlJeUxfO8oMMYgyAIpHN6h53zpjz4sNFoq7daG52nbvgZNmn2ovyC8toElsVqq7ioc3cM6T/83mHD8n9NP4dSFix6/uWlp85dfsrldZKY8LD6Pllpaw99e/ppr0iUpJhwdMctAwc8cM/dR1vYDEEMxmTa3Ke+u1BW21MCliRGaqvuzL5hzNj7DV80SRdCoTPAP4XyI8ePH09+8x3b50VV9ekOtySxPMcJDIIahysGAANGnAIEQ0PKXwBCiG7Ji6/tOnP+4uCaGgcILAJWJOCXFFCcngQJXZj51HNrdYSQKUajEeCnd3cRAEBeXt51s+abP7hU7exrd4mg5zXgkyVw+7yExRDtl0rnP75kBbE8NffJxsvhkPI7m1/Saf0bWw9cKCxNDAQaQpVxPAcAwNWUlqdhFq1+491/xpnN5sXzF684eKG4sk210wcMUUGv4cEvKqDIcoTL63moau2LAw4dOnQ9Qsj19Iq18/NLyheWVToAMTwIsgh+yQ91dfXtauq8plsGDrytoKwkocrpBYblAAEBVVaB44UogUMg+txJhBDN1PmW7T+cvfhXl0dsyGqmAAR8biDErtR7/SOeWLbabbPNesBsbsjvErTlMQDgYzH5QafhbxNFSa6uc2bYdhz4ZuJj8z9t3SZ557gJ475rGx1d8AvMGzIhJGLak89Mcnp8RM9x6LqYqNNPTJuy/PTk6X+XZTHa6fWj3Lz8hxGCb2zNK1Hmy8WLZY7nDjMc31NUiGyvdyV9vP/rz6fMfWpHWrt2h7O6d9425MYbS5vOyim/D9Sv6HeWJyEEtu89uLi01pXu8Yn+mCgtl3Zd7HdZndptbZsUc1HLEMBEIYAQqERlAABWr39rxtkLBYOramr9kVE66NAu6XSPrh22duuSejYqOgLKy6v9ZRVVE9/dvudWm82m/FSoqlCypfT0dAdGhONBhtYxOkhPjtzft2v797q2T/FpBQGq691yQXHl9C+//z4+uJREAAC5ubmIEMK8te3d1flFJYmyKPmjI3SQ2aFNbs/MzlvT2iQfS46NAMnvrWyVct2ORc+uXJWXX9jG4fYEYiN10COz/aWsjPZbO7aO/y4mWg+1Lr//4uXKTh/uP7qEEMLkXyqYWlVtlwWtVklNSTrXo0u7d7qlJn2bGhsOydERNZkZnRe2TUnYGK5hTvKYAKOKoMGkWovVtzSMsjUyjN8JAFJUuE4vcAhaJUdCVkb7oh7dOryXldG2OjxCzzqcTrG0omKs9cPP+lssFvWKj53BAAghtWtGlzUxEVpEFIn3iYpY65XjK52BsSfP5tuWPvPiqRXrNjxHCNEEPybXrJJsDZsx6NXNW2+qrrPHEqJIYQILybFRryOEvFFRkV/yHIv8AUmtrqkZqaokymY0Kk39+II2SRjYv/+rCbHhSAr4eFHFUoXDo1yudIz4+vvTz7+xbeeZZ1/ZvKWosjLNYrGo1BeQzgD/sOYEi8UimydPDissrRpR75VVgeeEdskJ375gmT8IIRQghIRNmDbnTKXDm4qAA5UwCkYIcnJzRjkcLlUbphEio8LeXfvM02MRQgohJHz2My994so518/hdKvHT528HQD25lx1zKnp7CSkCJHn1KlTQz7bf2g+C8wnM2dO2g8AcOzEia7PrNl8xC8zWhGYsONHvr8BAD622WzYZDIRi8Wi/HPPnpRLRaVDvKKsaHlW0zopbscLixfchxASNYIAy15Ym11XV1V428C+xVu32b7yBkRV4DV8++TY/atMjw9HCHkIIcIc84rPXQH5RqekKsWVtfcVllfvBcTqFAUgjMHMzQOu/36i4Y4xflGGTz7Z2UHP6ZmBfbrmAcAXd416aDYvhK2SFQw6Hue+89qacaE2Ll+2BJxO58iXX3t9dmJKq5KH7r33NYSQnxCSZJz8+EkCTIwsE3KhoKAPABzJyIlHQZubYjAYmKkPj93z/NpXHkFAVtR5pBiPCOBw+2Sex2qds0LvcbmfmP+0JY0QYjSbzaip3S3o2UJOnb90ry8gIQQyq9NF1E2d9PeP5s+bDh3TO2+pcvxwt9Pvkdx+KWb9m++MBYCXm26GhD48GOPTG97bbuD5M5sqauojfX4/uPwi8cqqqPiUKMcPZx+w2+t7n7lUeodty8YSGsyAKsA/HCEbz9aDB3uIihKlqqoi8BouJjL8VYRQoF8/gxYh5Hlw6mwXRg27IIjBPkVVYx6YNLujTAjGhJDKirr+d41++PSw+8fztxvH+4WwqFbA8KqEGHwmNw8BABw48IuqxGRlZdkB4AkAAOtH+244nXMqfsOWf+oJwgiIhIiqopLi4gblAAAZwQFaXu7oJyMBSyArkTxmOKw+ixAS/zp9uvDJSy8F5kybdBAAIKF129t8isLJwChhGoEDRlqOEPIYpk7VI4Tcs03LV4Zp+e21Tq+qEEg8fe5CgGUgV6MR+rl8PvGDD3ePnjjX3D02LnZ7dOse7/bNTM3JMBj4+IwMFZ0vDJMJAgVxIMoBLjvbxFYnADZkgGwxm0lEQ5TkBQAAZ02mpEXPre198/DRbjY82sWyfIIkK1BaXBJMDH+g8exNMZlMeN6MKa/tPfTdnn37999f53D+TZb4gXaXB7wqA9UOjyTJ8r1LVqy622Kx7DBYrYyt0Y63xWJUTp8+n7Zi4+aRXklUwvQ6JiI29tiqVWZxzJgxEd07tz+bm5cvVdd7+XqPD86eL7iHEPKP5txzQq4/jxpHvH+5xnNk+64PR128eOmOypq6vn5JDfMEZHC5PYGLhaUZ2z/8cIbFsngutJxXk0KXwP8ZQjaeM2cLtIgoLCIy0Qoc6PVRJYQQJAhVEiEEESBMQ9poAFVVycmTX7OKChoCDCiKCggxqZwmrAsv6NN0YdGZsixHM6CyvMDjNq1TWQCAwYN/Yi8LXVHIjMPhiF64dOWSCdOfPGndufvI6bzCXaVVde96RRKGESJYlUFWrjUnlldWhRHEYpUg0Gk10D0zXSGEoPBBg2QAgDVr1ggGg4G5fKlIUBHLyoCIIAjQPbO7QghBAzt1kgghqEPHNrJOYAAhIIokoz07PnJe3+f6pQlxETLP8Xy9R4Kz+ZWZ353JX7jxjS1nnnv59X/kWK1w0GKRCWBVRSyoiAGCMTl40CLnZoBsDvogEkLCn1u74fHpC8yXCoqq8s5eLNwV16rNAZbj01RVlRqcg5hmZ8q5ubkIAPBtA3uXrVg094U31iwbNN447MasDm226XhWBIYlPhmpkihNAACI3rcPm0wmtnGk5F37vxjpl5RwIEgVJUm9mH954LHzpRfqiObC6g2vf1VZXYMxwxJJUkhVdU3/1999NwUA1NA54aAZAwWVKgIApk1cWOnM8aNW/mPZolunjxmd0Suz49oIAfk0GBiXx6tWVFbdynMsUDcYqgD/cBiCPyMidRhjBlQEoBICgYAHzGYz0mZlNbzwiKgqxqAiAEYRoXv3GwmwWJVUokTow1F6h6RVAXdNX0H13sgFXH2ZQN2N3urCXlrw9Ll76G2rABocjK/pRoKBIAKAGmx5vQYNijI9v2ZfTsHlhWV19ixJkXB4mFZq0ypJZjEhmCiAQW04MNeEiAgtwzAKYUAGWVahxO4mRqMRR9vt2GC1MjNnzgzYbDYlIjoKI8QBAgyqrEBJWVXAaDTiQlnGRqMR1zr8sl/BAIQBBjHQKiUldtoE48fXd+9yQ0brxK3t4iMrYsM14PO6yfmCy3LuxYKpqzduGQsAgBHDckQBjoiAkYIMVitjAGCNRiMmhAjzlj3/4fGzRcvPFlS2B8xGcFj1+r31x1TZ68UAGAMBRXI3a6qw2WyKVqNRAQAyMjL49PSR/OCBA48seWreaJ2Wz2Mx8KqqYpEwnMlkwhs3bpQsFouMECK5DXY75mRe/p0erx9YhLAiIQyI03OCPkGjiUhQ2ci4gMKxLFExC6riU0A4X1Q1Oah8WYvFogZ3hK/kXdEIQqhPUed77+UHDepTbJ49bWaUPmIvZnWsChxGiNMSoCtfugT+A5ITzGrfsX1q9cm8yyIGFgdEGVSiZloslj0AEEAvvQTjZzzOEiICEAIMw2oBoA6Ikq/l2fZejw8iItr1/Ni2be7Vdj3CCjwvv/PK2uCqqWX7T2hj5fU33x9XUuvpVe/y+VNTEtR+vXs83zez25tp3TvpHp78+Nd1gYBeQVd//3IzMwkAQEJcXC5I54AhCvKLAVAldajNZvsegjvFhJBwAJD2HzlRcy7/PYUhKgqIAXDV1/W12Wxfgc3mAwBI6dKnmyhJwKgK0vEMuWlgvyoAgKkPjv4BAMYSQoTX3n57yKET+a8Xl1fH1NbUqJeL+MEAsFklEgFQgQAGFZD0QYPCUAAArVi3YcTlkprBlXZXIDk2wt89PXVJYkKrbY+MHlF2x5iJJwhiuhNyrYhMJhNeumSJunrDG8tKq2uGdezQdv2kUYZXZCW3YeZb68p8cunyFMnhkzQajuV5vtoy/3H1Tau1Tbguqk/3LlmH09KSKl//54e3MJjJlgKirNMIbJjAXqh3Ok4jjBABVSWEQRzLIo1O9xeXTwzz+GRir3U+QghZjhBy2nbuyXS5PakTRt+zByGkrt70uqG8qnbRdUlJH0yfMGYVQsgdlDO+f9LcRKLIRMNikGV/rqqo8C+cHadQBfj/Q9BQju69++6cHXsPV2MgyT6fX71YVDzpH1u2fJ3ZpWvUF4e+ufPMmXNpSEUSBuBkICxCSJm3ePkn3vzyv3sDkngu79ItTz/74vLOHVK2yIrCni+oHP3QrKcemTBrwZnrb+w1rPiHHzwWixkAftoI/u2JkxGcPlLheE4QWO7k5DEGMyCAJ5etnB0I+HnArEoA48ajyGo0qggAjb9v5Jlj35+odjpdcV6fqJy/mP/Uhres1bGREQfPXbiQOXnOU8/pdRpYuWTR0M1b3zqkEfAgf0CSqmodlhXrNhUlx8XllFdW9jh19uIcn9cr8VhhBIYcy76xz/dPmJc/W+d03xIVFWFdsf71D3v36VZ9PK/cA0BiGJYBQSP4AQAwxkAYIJKogJ7XtNq09Z/9q6uKuyyYNXPzV18e4UEbq7Asw+v0QtmTM6e8qBF49bVtW5/es/9Yu3qnIiENwzWx0TJGo1F59/0dQ/YdPvbkpbJqKC6tWPfwzMfv1PDsXr2W55etWDG5zu6IVhXZH6bludj46FdXr9vU9cjREwe9ASVm5yef5XzzzTc37vz88Diny00IQqpewyrjRg574PbbbznatA+eenbtwpwLhUvqvUrA5fbFr9+0tdui5as1u/d9tVuSA/xXx45+9I5t58JdX+x7qdolJpaU1XS7cN5seGzRM28IGj4w7YlFBlGW+8mSPxCu1wopSYn7FFWFjIwM6r9LFeAfDmIymViMsfjkMys3yYpsqqpzBcpqnB2ch04cPnTsNNS7fCBLMhDAAaKCTDAnAQD85ZYBzzoce+8rrrLHV9bVBSTR+/iFosvzFMIiUZahtq5WbdUq+abywrInLBbLQpMJWIvlRyM4IUgmBGQCABiQDADQrVP7mvziUsYviYHL5RXdHpg2N0eWVXSuoKKLW8ZAEParAKCSHxUpCqbbRAi5X3hl02yX2/t2SZVdKqys5x1ffbdexyHiD4iozuWD+Fg9LFvzj8mjRwxf+MGn+77KK6rEl6oc2O4+Y9VyLAkEFFTvF0FWFWjfKgk6tm073maz3fHp1yfnF5TVgt7huaGwvGbl97mXwG6vBzEgqimJrXC3bpk7AACyunVDZwouI0WU/N6A3HHvgcNfCzwG0/JVbRPiE0989d1pxl3j9tmr7akT5z5dcv/kuZ5PDv7Qod7tAwDeRwhBwPy44xraOS+pqu4vEQQqwkpZrUMOE/g7tQJ/JyEucDg9QBAjRUdoNWnXxR2dPXHCofmLn7eV1HhiPAHZFRnGZR49ceqR8qqqvpKkKDzDYY7lT91xx61Hez/6KKfPyyMJCQkkOnoIttv3qelt06z5hUUmF5FIvcur2L2uv3t9cuuSGg+rqmIgKlwz3OsPeBVFSlQlFcoq7P4aHmXqdGHPMwwDXo8bApIqaTWckJIUc/mp2VPffmr2VAQASnOnUyjUBvgfxWw2K08//TT++/jRzyfGhH8aHxspSAoBu1sGe50bInSC0q5NSoFewwp6gWE51R8BAHDbwIFld9x2+0MdUq+7EBMZLkiSDHV2N6qr94Do90K7lEScFKV/J6tn5msGg4FpagPkkRKr1fCsTsOzmCiRAAAjhgx7q21ibEVsuE5QFMJUu3wZXlHpwnG8nBgXW6DlQBMucCyPiXDVZo7NplqtVmbutEe3ds1IfymtbStOwyHsdLqgps6BRFmF2NhYSE5M3J3YKuGVoX+5+VD3zMwnOrZJ8kWGRTFerwI1tW7k8ckQqQ+H5Oiwyht6dTfPmT7+AgCU6nWaz+PCdUBkGRx2J1RX2YFDAClJsbhd+9QVDxru2g0A6K4Rf3vvuoRYl8BhjS8ggssngs8nQkV51ah7Rw471So+Oi9ap9WKPj8uL69Ktju9HfwiKG1aJRVEhnFajUZgMeJ0jWbosslkwnOmPLK8S6dOT6RdlxCIi4wQJEUFu8cPDq8EWn04ROgErn1K0odzJo2/R1VVJIr+L3VhWsAMDkeYU+vsrl5Ol6czy2A2LjaSTYiP36AqKhqWnEwOHjwo22w2ZePGSVJGRgYZd//QSzFR+qOxUVoNBoU9n3fx/tiYmHCtwGIWg6ATOOjascfcrKyuQzqnta5OjI3SsIwAHpcXnA4XYMRBXKSO69Am+djQoUOHIYScZrOZusDQGeAfk+BRKwj6wd21/KWNk+1u3xhfQGZidEJOr56dNoeFiYXvbts3pbaqCgQx/iwAQHZ2NjvyrwN2EUL2r1q3+bFzeXmdoiLDu/K8ACpRvu/UOX375LGjPl6zTISGQw2NBgAC4BRpjex2piCsghiIuQgAMGhQlv2706dv2blr7yNun38w4TiiZdjj/btlbNbrhctv2XbOCPgcOCE5LRcAICNowwQAcp/RqBAAtPCxaTM+2PXBRydO5T0qSaiDs76+3h+QjtzYr3fBI2Pv2SgH7VEzJoxecfbkyT079x27v67ePhAjCFcJ1EfptYdG9M1al5GdXf7pTgNjs9lOcRw75OVXXjWcOX9xMMtr+gnacKTTsudTWyeufNBgOA4NzuQEIXRu74EDfb86evJxP8Hd6+vqypP0wtfd+2S9mRgVVVJTU3PDy5venuPze4dKkgSKon6V0S1zp2Fw74LFL22eWlZZD2ExrY6ETKNBJahaLBYRAFYUFVW8//EXn48praoe4JeUBI/H42cIOdQzo9PXj4y7f8dK84JQUNlXFyx7LqVVQvSt0fFJm6TaihIGSKnXVaf0ymivzJky6/0VCBEzIdfMyhBCymtb3x939NjRie6aOuLBYUx6x9QzPlfNYECoV3x05Jq+fTuW9uuXXkKIO+v1rZ+OLSmtvNHtdbclhAAhKLd1XPiOGTMmf4QQCtCTIJQ/x1q4UTRmlmGA437+O9M0eTTLsk3vQ78yyjO6qiz2N33rrpTBcRxgjJptZ+NoxgyDgWVZYBpdG/p701MMLMsAx3GNhYCbkyHPcz8pX5b9dQGjG0eYxggBx7LAMsxV9Wgqa5b5fRdLPxV5muNYYJv0Fz0BQvnTKcFg3DYEACgYFooJ/T7bZGKbHmn78R4D0/S+n3pWdrC8pmWaTCac3aQOJhPBoec08m1rkWB5ofrg0H3NKfDG7Q1d21z5VquVyc7ObnRt8zkvTCYTDiqra8prKt/sbBNraCTf4D/c8gfHFKovvlJGM30SkhsEc4UYDAYm22Ris7N/mfxCz8nO/rF/rpTXSBE3ag9uLBfrb89PQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBQKhUKhUK7m/wCU3TN7cNilFgAAAABJRU5ErkJggg==" alt="DLC" style="width:72px;height:auto;object-fit:contain">';

  document.getElementById('remision-body').innerHTML = `
    <div id="remision-print" style="font-family:'Outfit',Arial,sans-serif;background:#fff">

      <div style="background:#1C2B3A;padding:22px 32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
        <div style="display:flex;align-items:center;gap:14px">
          ${logo}
          <div>
            <div style="font-size:19px;font-weight:800;color:#fff">Distribuciones Estratégicas</div>
            <div style="font-size:10px;font-weight:700;color:#49C9F4;letter-spacing:2.5px;text-transform:uppercase;margin-top:3px">de la Costa S.A.S</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:5px">📞 (57) 321 896 5745 &nbsp;|&nbsp; ✉️ distribucionesestrategicasco@gmail.com</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="background:rgba(73,201,244,0.15);border:1px solid rgba(73,201,244,0.4);border-radius:8px;padding:6px 14px;margin-bottom:6px;display:inline-block">
            <span style="color:#49C9F4;font-size:11px;font-weight:800;letter-spacing:1px">REMISIÓN DE DESPACHO</span>
          </div>
          <div style="color:#fff;font-size:13px;font-weight:700">N°: ${remNum}</div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-top:2px">Pedido: ${orderId}</div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px">Fecha: ${today}</div>
        </div>
      </div>
      <div style="height:3px;background:linear-gradient(90deg,#49C9F4,#0872E6)"></div>

      <div style="padding:18px 32px;background:#F8F9FA;border-bottom:1px solid #E8E8EA">
        <div style="font-size:10px;font-weight:700;color:#6E6E73;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Datos del Cliente</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px">
          <div><div style="font-size:10px;color:#6E6E73">Cliente</div><div style="font-size:14px;font-weight:700;color:#1D1D1F">${o.client}</div></div>
          <div><div style="font-size:10px;color:#6E6E73">Empresa</div><div style="font-size:14px;font-weight:700;color:#1D1D1F">${o.company || '—'}</div></div>
          <div><div style="font-size:10px;color:#6E6E73">Email</div><div style="font-size:13px;color:#1D1D1F">${o.email}</div></div>
          <div><div style="font-size:10px;color:#6E6E73">Teléfono</div><div style="font-size:13px;color:#1D1D1F">${o.phone}</div></div>
        </div>
      </div>

      <div style="padding:20px 32px">
        <div style="font-size:10px;font-weight:700;color:#6E6E73;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px">Productos a Despachar</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #E8E8EA">
          <thead>
            <tr style="background:#1C2B3A">
              <th style="padding:10px 12px;font-size:10px;font-weight:700;color:#49C9F4;text-align:left;width:36px">#</th>
              <th style="padding:10px 12px;font-size:10px;font-weight:700;color:#49C9F4;text-align:left">Producto</th>
              <th style="padding:10px 12px;font-size:10px;font-weight:700;color:#49C9F4;text-align:center;width:80px">Cantidad</th>
              <th style="padding:10px 12px;font-size:10px;font-weight:700;color:#49C9F4;text-align:center;width:90px">Recibido ✓</th>
            </tr>
          </thead>
          <tbody>
            ${o.items.map((item, i) => '<tr style="background:' + (i % 2 === 0 ? '#fff' : '#F8F9FA') + '">' +
              '<td style="padding:12px 12px;font-size:12px;color:#6E6E73;border-bottom:1px solid #F0F0F0">' + (i+1) + '</td>' +
              '<td style="padding:12px 12px;font-size:14px;font-weight:600;color:#1D1D1F;border-bottom:1px solid #F0F0F0">' + item.name + '</td>' +
              '<td style="padding:12px 12px;font-size:15px;font-weight:800;color:#0872E6;text-align:center;border-bottom:1px solid #F0F0F0">' + item.qty + '</td>' +
              '<td style="padding:12px 12px;border-bottom:1px solid #F0F0F0;text-align:center"><div style="width:22px;height:22px;border:2px solid #D0D0D0;border-radius:4px;margin:0 auto"></div></td>' +
              '</tr>').join('')}
          </tbody>
        </table>
      </div>

      <div style="padding:0 32px 20px">
        <div style="background:#F8F9FA;border-radius:10px;padding:14px 18px;border-left:3px solid #0872E6">
          <div style="font-size:10px;font-weight:700;color:#6E6E73;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Observaciones</div>
          <div style="font-size:14px;color:#424245;line-height:1.5;min-height:32px">${o.notes || 'Ninguna'}</div>
        </div>
      </div>

      <div style="padding:16px 32px 20px;border-top:1px solid #E8E8EA;display:grid;grid-template-columns:1fr 1fr;gap:40px">
        <div style="text-align:center">
          <div style="font-size:11px;font-weight:700;color:#6E6E73;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Firma Despachador</div>
          <div style="border:1.5px solid #D0D0D0;border-radius:8px;background:#fff;overflow:hidden;padding:8px 12px;min-height:100px;display:flex;align-items:center;justify-content:center">
            <img src="${FIRMA_EMPRESA}" alt="Firma empresa" style="max-height:80px;max-width:100%;object-fit:contain;display:block;margin:0 auto">
          </div>
          <div style="border-top:1px dashed #D0D0D0;margin-top:8px;padding-top:6px;font-size:11px;color:#6E6E73">Distribuciones Estratégicas de la Costa S.A.S</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:11px;font-weight:700;color:#6E6E73;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Firma y Sello Receptor</div>
          <div style="border:1.5px solid #D0D0D0;border-radius:8px;background:#fff;min-height:100px;padding:8px 12px"></div>
          <div style="border-top:1px dashed #D0D0D0;margin-top:8px;padding-top:6px;font-size:11px;color:#6E6E73">Nombre, C.C. y Sello</div>
        </div>
      </div>

      <div style="background:#F8F9FA;padding:10px 32px;border-top:1px solid #E8E8EA;display:flex;justify-content:space-between">
        <div style="font-size:10px;color:#B4B2A9">Generado el ${today}</div>
        <div style="font-size:10px;color:#B4B2A9">${remNum} - ${orderId}</div>
      </div>
    </div>

    <div style="display:flex;gap:12px;justify-content:center;padding:24px 0;flex-wrap:wrap" class="no-print">
<button onclick="doDownloadPDF('${remNum}')" style="background:#1C2B3A;color:#fff;border:none;padding:13px 24px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer">⬇️ Descargar PDF</button>
      <button onclick="doPrint()" style="background:#0872E6;color:#fff;border:none;padding:13px 24px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer">🖨️ Imprimir</button>
      <button onclick="doMarkDispatched('${orderId}')" id="btn-despachar" style="background:linear-gradient(135deg,#3B6D11,#639922);color:#fff;border:none;padding:13px 24px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer">🚚 Marcar como Despachado</button>
    </div>


  `;

  openModal('remision-modal');


}


function doMarkDispatched(orderId) {
  if (!confirm('¿Confirmar que este pedido fue despachado?')) return;

  // Notificar al cliente por WhatsApp
  const order = orders.find(function(o) { return o.id === orderId; });
  if (order && order.phone) {
    const phone = order.phone.replace(/\D/g, '');
    const fullPhone = phone.startsWith('57') ? phone : '57' + phone;
    const msg = encodeURIComponent(
      '¡Hola ' + (order.client || order.cliente || '') + '! 🚚\n' +
      'Tu pedido *' + orderId + '* ha sido despachado y está en camino.\n' +
      'Pronto lo recibirás. ¡Gracias por confiar en Distribuciones Estratégicas! 📦'
    );
    window.open('https://wa.me/' + fullPhone + '?text=' + msg, '_blank');
  }

  // 1. Actualizar en memoria inmediatamente

  // 1. Actualizar en memoria inmediatamente
  const o = orders.find(function(x) { return x.id === orderId; });
  if (o) { o.status = 'dispatched'; addHistorial(orderId, 'dispatched'); }

  // 2. Actualizar en Google Sheets
  fetch(SHEETS_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'updateStatus', order_id: orderId, status: 'Despachado' }),
  }).then(function() {
    closeModal('remision-modal');
    renderLocalSection();
    showAdminToast('🚚 Pedido ' + orderId + ' marcado como despachado.');
  }).catch(function(err) {
    console.warn('Sheets update error:', err);
    closeModal('remision-modal');
    renderLocalSection();
    showAdminToast('🚚 Pedido ' + orderId + ' marcado como despachado.');
  });
}

// ── Sección de Usuarios ────────────────────────

function loadUsersSection(cont) {
  fetch(SHEETS_URL + '?action=getUsers&t=' + Date.now())
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.status !== 'ok') throw new Error(data.msg);
      cont.innerHTML = renderUsuarios(data.users);
    })
    .catch(function() {
      cont.innerHTML = renderUsuarios([]);
    });
}

function renderUsuarios(users) {
  users = users || [];
  const isAdmin = currentUser && currentUser.rol === 'administrador';
  return `
    <div class="admin-header">
      <h1>Gestión de Usuarios</h1>
      <p>${users.length} usuario(s) registrado(s)</p>
    </div>

    ${isAdmin ? `
    <div class="section-card" style="margin-bottom:28px">
      <div class="section-card-head"><h3>Crear Nuevo Usuario</h3></div>
      <div style="padding:24px 28px">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">
          <div class="form-group" style="margin:0">
            <label>Usuario *</label>
            <input type="text" id="nu-user" placeholder="nombre_usuario">
          </div>
          <div class="form-group" style="margin:0">
            <label>Contraseña *</label>
            <input type="password" id="nu-pass" placeholder="••••••••">
          </div>
          <div class="form-group" style="margin:0">
            <label>Rol *</label>
            <select id="nu-rol">
              <option value="vendedor">Vendedor</option>
              <option value="despachador">Despachador</option>
              <option value="gestor">Gestor</option>
              <option value="lectura">Solo Lectura</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div class="form-group" style="margin:0">
            <label>Nombre completo</label>
            <input type="text" id="nu-nombre" placeholder="Nombre del usuario">
          </div>
          <div class="form-group" style="margin:0">
            <label>Email</label>
            <input type="email" id="nu-email" placeholder="correo@empresa.com">
          </div>
        </div>
        <button onclick="crearUsuario()" style="background:linear-gradient(135deg,var(--brand-cyan),var(--brand-blue));color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer">
          + Crear Usuario
        </button>
      </div>
    </div>` : ''}

    <div class="section-card">
      <div class="section-card-head"><h3>Usuarios del Sistema</h3></div>
      ${users.length === 0
        ? '<div class="section-empty">No hay usuarios registrados</div>'
        : `<table>
          <thead>
            <tr>
              <th>Usuario</th><th>Nombre</th><th>Rol</th>
              <th>Email</th><th>Estado</th>${isAdmin ? '<th>Acciones</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${users.map(function(u) {
              const rolLabel = ROLE_LABELS[u.rol] || u.rol;
              const rolColor = {
                administrador: 'badge-approved',
                gestor:        'badge-quoted',
                vendedor:      'badge-pending',
                despachador:   'badge-new',
                lectura:       '',
              }[u.rol] || '';
              const isActive = u.activo === 'true';
              return '<tr>' +
                '<td><strong>' + u.username + '</strong></td>' +
                '<td>' + (u.nombre || '—') + '</td>' +
                '<td><span class="badge ' + rolColor + '">' + rolLabel + '</span></td>' +
                '<td style="font-size:13px">' + (u.email || '—') + '</td>' +
                '<td><span class="badge ' + (isActive ? 'badge-approved' : 'badge-new') + '">' + (isActive ? 'Activo' : 'Inactivo') + '</span></td>' +
                (isAdmin ? '<td>' +
                  (u.username !== 'admin' ? `
                    <button class="action-link" onclick="editarUsuario('${u.username}','${u.rol}','${u.nombre}','${u.email}','${u.activo}')">Editar</button>
                    <button class="action-link" style="color:#A32D2D;margin-left:8px" onclick="eliminarUsuario('${u.username}')">Eliminar</button>
                  ` : '<span style="font-size:12px;color:var(--text-soft)">Admin principal</span>') +
                '</td>' : '') +
              '</tr>';
            }).join('')}
          </tbody>
        </table>`}
    </div>

    <!-- Modal editar usuario -->
    <div id="edit-user-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:400;align-items:center;justify-content:center;padding:20px">
      <div style="background:#fff;border-radius:16px;padding:32px;width:100%;max-width:480px;box-shadow:0 24px 80px rgba(0,0,0,0.25)">
        <h3 style="font-size:20px;font-weight:800;margin-bottom:20px">Editar Usuario</h3>
        <input type="hidden" id="eu-username">
        <div class="form-group"><label>Nueva Contraseña</label><input type="password" id="eu-pass" placeholder="Dejar vacío para no cambiar"></div>
        <div class="form-group"><label>Rol</label>
          <select id="eu-rol">
            <option value="vendedor">Vendedor</option>
            <option value="despachador">Despachador</option>
            <option value="gestor">Gestor</option>
            <option value="lectura">Solo Lectura</option>
            <option value="administrador">Administrador</option>
          </select>
        </div>
        <div class="form-group"><label>Nombre</label><input type="text" id="eu-nombre"></div>
        <div class="form-group"><label>Email</label><input type="email" id="eu-email"></div>
        <div class="form-group"><label>Estado</label>
          <select id="eu-activo">
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
        <div style="display:flex;gap:12px;margin-top:8px">
          <button onclick="guardarEdicionUsuario()" style="background:var(--brand-blue);color:#fff;border:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;flex:1">Guardar</button>
          <button onclick="document.getElementById('edit-user-modal').style.display='none'" style="background:var(--bg);border:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer">Cancelar</button>
        </div>
      </div>
    </div>
  `;
}

function crearUsuario() {
  const username = document.getElementById('nu-user').value.trim();
  const password = document.getElementById('nu-pass').value.trim();
  const rol      = document.getElementById('nu-rol').value;
  const nombre   = document.getElementById('nu-nombre').value.trim();
  const email    = document.getElementById('nu-email').value.trim();

  if (!username || !password) { showAdminToast('⚠️ Usuario y contraseña son obligatorios'); return; }

  fetch(SHEETS_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'createUser', username, password, rol, nombre, email }),
  }).then(function() {
    showAdminToast('✅ Usuario ' + username + ' creado');
    renderAdminSection('usuarios');
  }).catch(function() {
    showAdminToast('⚠️ Error al crear usuario');
  });
}

function editarUsuario(username, rol, nombre, email, activo) {
  document.getElementById('eu-username').value = username;
  document.getElementById('eu-rol').value      = rol;
  document.getElementById('eu-nombre').value   = nombre;
  document.getElementById('eu-email').value    = email;
  document.getElementById('eu-activo').value   = activo;
  document.getElementById('eu-pass').value     = '';
  document.getElementById('edit-user-modal').style.display = 'flex';
}

function guardarEdicionUsuario() {
  const username = document.getElementById('eu-username').value;
  const password = document.getElementById('eu-pass').value.trim();
  const rol      = document.getElementById('eu-rol').value;
  const nombre   = document.getElementById('eu-nombre').value.trim();
  const email    = document.getElementById('eu-email').value.trim();
  const activo   = document.getElementById('eu-activo').value === 'true';

  const payload = { action: 'editUser', username, rol, nombre, email, activo };
  if (password) payload.password = password;

  fetch(SHEETS_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload),
  }).then(function() {
    document.getElementById('edit-user-modal').style.display = 'none';
    showAdminToast('✅ Usuario ' + username + ' actualizado');
    renderAdminSection('usuarios');
  }).catch(function() {
    showAdminToast('⚠️ Error al actualizar usuario');
  });
}

function eliminarUsuario(username) {
  if (!confirm('¿Eliminar el usuario "' + username + '"? Esta acción no se puede deshacer.')) return;
  fetch(SHEETS_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'deleteUser', username }),
  }).then(function() {
    showAdminToast('🗑 Usuario ' + username + ' eliminado');
    renderAdminSection('usuarios');
  }).catch(function() {
    showAdminToast('⚠️ Error al eliminar usuario');
  });
}

// ── Editar y Eliminar Pedidos (solo admin) ─────

function editarPedido(orderId) {
  const o = orders.find(x => x.id === orderId);
  if (!o) return;

  // Modal de edición inline
  const modal = document.createElement('div');
  modal.id = 'edit-order-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:32px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.25)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 style="font-size:20px;font-weight:800">Editar Pedido ${orderId}</h3>
        <button onclick="document.getElementById('edit-order-modal').remove()" style="background:var(--bg);border:none;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer">✕</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Cliente</label><input id="eo-client" value="${o.client}"></div>
        <div class="form-group"><label>Empresa</label><input id="eo-company" value="${o.company || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input id="eo-email" value="${o.email}"></div>
        <div class="form-group"><label>Teléfono</label><input id="eo-phone" value="${o.phone || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Ciudad</label><input id="eo-city" value="${o.city || ''}"></div>
        <div class="form-group"><label>Dirección</label><input id="eo-address" value="${o.address || ''}"></div>
      </div>
      <div class="form-group"><label>Estado</label>
        <select id="eo-status">
          <option value="pending"    ${o.status==='pending'    ? 'selected':''}>Nuevo</option>
          <option value="quoted"     ${o.status==='quoted'     ? 'selected':''}>Cotizado</option>
          <option value="approved"   ${o.status==='approved'   ? 'selected':''}>Aprobado</option>
          <option value="dispatched" ${o.status==='dispatched' ? 'selected':''}>Despachado</option>
        </select>
      </div>
      <div class="form-group"><label>Observaciones</label><textarea id="eo-notes" rows="3">${o.notes || ''}</textarea></div>
      <div style="display:flex;gap:12px;margin-top:8px">
        <button onclick="guardarEdicionPedido('${orderId}')" style="background:var(--brand-blue);color:#fff;border:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;flex:1">💾 Guardar cambios</button>
        <button onclick="document.getElementById('edit-order-modal').remove()" style="background:var(--bg);border:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function guardarEdicionPedido(orderId) {
  const o = orders.find(x => x.id === orderId);
  if (!o) return;

  const statusMap = { pending:'Pendiente', quoted:'Cotizado', approved:'Aprobado', dispatched:'Despachado' };
  const newStatus = document.getElementById('eo-status').value;

  o.client  = document.getElementById('eo-client').value.trim();
  o.company = document.getElementById('eo-company').value.trim();
  o.email   = document.getElementById('eo-email').value.trim();
  o.phone   = document.getElementById('eo-phone').value.trim();
  o.city    = document.getElementById('eo-city').value.trim();
  o.address = document.getElementById('eo-address').value.trim();
  o.notes   = document.getElementById('eo-notes').value.trim();
  o.status  = newStatus;

  fetch(SHEETS_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'updateStatus', order_id: orderId, status: statusMap[newStatus] }),
  }).catch(err => console.warn(err));

  document.getElementById('edit-order-modal').remove();
  renderLocalSection();
  showAdminToast('✅ Pedido ' + orderId + ' actualizado');
}

function eliminarPedido(orderId) {
  if (!confirm('¿Eliminar el pedido ' + orderId + '? Esta acción es permanente.')) return;

  orders = orders.filter(x => x.id !== orderId);

  fetch(SHEETS_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'deleteOrder', order_id: orderId }),
  }).catch(err => console.warn(err));

  renderLocalSection();
  showAdminToast('🗑 Pedido ' + orderId + ' eliminado');
}

// Renderiza la sección actual desde memoria local (sin recargar Sheets)
function renderLocalSection() {
  const cont = document.getElementById('admin-content');
  const map = {
    dashboard:    renderDashboard,
    pedidos:      renderPedidos,
    cotizaciones: renderCotizaciones,
    ordenes:      renderOrdenes,
    remisiones:   renderRemisiones,
    entregados:   renderEntregados,
    catalogo:     renderCatalogo,
  };
  if (map[currentAdminSection]) cont.innerHTML = map[currentAdminSection]();
}

// ══════════════════════════════════════════════
// FASE 2 — Catálogo editable, Seguimiento, Recordatorio, Firma
// ══════════════════════════════════════════════

// ── Catalogo via Supabase ──────────────────────

var _catalogoSupa = [];
var _catalogoCatFilter = 'Todos';
var _catalogoSearch = '';

function loadCatalogoSection(cont) {
  _catalogoCatFilter = 'Todos';
  _catalogoSearch = '';
  cont.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-soft)"><div style="font-size:32px;margin-bottom:12px">⏳</div><p>Cargando catalogo...</p></div>';
  var SUPA_URL  = 'https://jnxsofraqshxjboukiab.supabase.co';
  var SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';
  fetch(SUPA_URL + '/rest/v1/productos?select=*&order=nombre.asc', {
    headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON }
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    _catalogoSupa = data || [];
    cont.innerHTML = renderCatalogo();
  })
  .catch(function() {
    _catalogoSupa = [];
    cont.innerHTML = renderCatalogo();
  });
}


function renderCatalogo() {
  _catalogoSearch  = typeof _catalogoSearch  !== 'undefined' ? _catalogoSearch  : '';
  _catalogoCatFilter = typeof _catalogoCatFilter !== 'undefined' ? _catalogoCatFilter : 'Todos';
  _catalogoSupa    = typeof _catalogoSupa    !== 'undefined' ? _catalogoSupa    : [];

  var q    = (_catalogoSearch || '').toLowerCase();
  var cats = [...new Set(_catalogoSupa.map(function(p) { return p.categoria; }))].sort();

  var filtrado = _catalogoSupa.filter(function(p) {
    var matchQ   = !q || (p.nombre||'').toLowerCase().includes(q) || (p.categoria||'').toLowerCase().includes(q);
    var matchCat = _catalogoCatFilter === 'Todos' || p.categoria === _catalogoCatFilter;
    return matchQ && matchCat;
  });

  var isAdmin = window.currentUser && (window.currentUser.rol === 'administrador' || window.currentUser.rol === 'gestor');

  var catBtns = ['Todos', ...cats].map(function(c) {
    var active = _catalogoCatFilter === c;
    return '<button onclick="_catalogoCatFilter=\'' + c + '\';document.getElementById(\'admin-content\').innerHTML=renderCatalogo()" style="'
      + 'padding:7px 14px;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:inherit;margin:4px;'
      + (active ? 'background:var(--brand-blue);color:#fff' : 'background:var(--bg);color:var(--text-soft)')
      + '">' + c + '</button>';
  }).join('');

  var rows = filtrado.length === 0
    ? '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-soft)">Sin resultados</td></tr>'
    : filtrado.map(function(p) {
        var activo = p.activo !== false;
        return '<tr style="' + (!activo ? 'opacity:0.5' : '') + '">'
          + '<td style="width:60px">'
          + (p.imagen_url
            ? '<img src="' + p.imagen_url + '" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">'
            : '<div style="width:48px;height:48px;background:var(--bg);border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:22px">' + (p.icono || '📦') + '</div>')
          + '</td>'
          + '<td><strong>' + (p.nombre||'') + '</strong></td>'
          + '<td><span class="badge badge-quoted">' + (p.categoria||'') + '</span></td>'
          + '<td style="font-size:13px;color:var(--text-soft)">' + (p.precio_ref ? '$' + Number(p.precio_ref).toLocaleString('es-CO') : 'Por cotizar') + '</td>'
          + '<td><span class="badge ' + (activo ? 'badge-approved' : '') + '">' + (activo ? 'Activo' : 'Inactivo') + '</span></td>'
          + (isAdmin ? '<td style="white-space:nowrap">'
            + '<button class="action-link" onclick="abrirEditarProductoSupa(\'' + p.id + '\')">✏️ Editar</button> '
            + '<button class="action-link" style="color:' + (!activo ? 'var(--brand-blue)' : '#E67E22') + '" onclick="toggleProductoSupa(\'' + p.id + '\',' + activo + ')">' + (!activo ? '✅ Activar' : '⏸️ Pausar') + '</button> '
            + '<button class="action-link" style="color:#A32D2D" onclick="eliminarProductoSupa(\'' + p.id + '\',\'' + (p.nombre||'').replace(/\'/g,'') + '\')">🗑️ Eliminar</button>'
            + '</td>' : '')
          + '</tr>';
      }).join('');

  var searchBar = '<div style="position:relative;margin-bottom:16px">'
    + '<input id="cat-search" type="text" placeholder="Buscar por nombre o categoria..." value="' + (_catalogoSearch || '') + '"'
    + ' oninput="_catalogoSearch=this.value;document.getElementById(\'admin-content\').innerHTML=renderCatalogo()"'
    + ' style="width:100%;padding:10px 16px 10px 40px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;background:var(--bg);color:var(--text);outline:none">'
    + '<span style="position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--text-soft)">🔍</span>'
    + '</div>';

  var modal = '<div id="prod-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:400;align-items:center;justify-content:center;padding:16px">'
    + '<div style="background:var(--bg-white,#fff);border-radius:16px;padding:28px;width:100%;max-width:500px;max-height:92vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.3)">'
    + '<h3 id="prod-modal-title" style="font-size:19px;font-weight:800;margin-bottom:18px">Nuevo Producto</h3>'
    + '<input type="hidden" id="prod-id" value="">'
    + '<div class="form-group"><label>Nombre *</label><input id="prod-name" placeholder="Nombre del producto"></div>'
    + '<div class="form-group"><label>Categoria *</label>'
    + '<select id="prod-cat"><option>Oficina</option><option>Papeleria</option><option>Tecnologia</option><option>Equipos</option><option>Otros</option></select></div>'
    + '<div style="display:flex;gap:12px">'
    + '<div class="form-group" style="flex:1"><label>Icono</label><input id="prod-icon" placeholder="📦" maxlength="4"></div>'
    + '<div class="form-group" style="flex:1"><label>Precio ref.</label><input id="prod-price" type="number" placeholder="0" min="0"></div>'
    + '</div>'
    + '<div class="form-group"><label>Imagen del producto</label>'
    + '<div style="border:2px dashed var(--border);border-radius:10px;padding:16px;text-align:center;cursor:pointer" onclick="document.getElementById(\'prod-img-file\').click()">'
    + '<input type="file" id="prod-img-file" accept="image/*" style="display:none" onchange="previewImgProducto(this)">'
    + '<div id="prod-img-preview-wrap"><div style="font-size:28px;margin-bottom:6px">📁</div>'
    + '<div style="font-size:13px;color:var(--text-soft)">Haz clic para seleccionar imagen</div>'
    + '<div style="font-size:11px;color:var(--text-soft);margin-top:4px">JPG, PNG, WEBP — max 2MB</div></div>'
    + '</div><input id="prod-img-url" type="hidden" value=""></div>'
    + '<div style="display:flex;gap:10px;margin-top:16px">'
    + '<button onclick="guardarProductoSupa()" style="background:var(--brand-blue);color:#fff;border:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;flex:1" id="prod-save-btn">💾 Guardar</button>'
    + '<button onclick="document.getElementById(\'prod-modal\').style.display=\'none\'" style="background:var(--bg);border:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Cancelar</button>'
    + '</div></div></div>';

  return '<div class="admin-header"><div><h1>Catalogo de Productos</h1><p>' + filtrado.length + ' de ' + _catalogoSupa.length + ' productos</p></div>'
    + (isAdmin ? '<button onclick="abrirNuevoProductoSupa()" style="background:linear-gradient(135deg,var(--brand-cyan),var(--brand-blue));color:#fff;border:none;padding:11px 22px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">+ Nuevo Producto</button>' : '')
    + '</div>'
    + '<div class="section-card"><div class="section-card-head"><h3>Productos</h3></div>'
    + searchBar
    + '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:16px">' + catBtns + '</div>'
    + '<table><thead><tr><th>Img</th><th>Nombre</th><th>Categoria</th><th>Precio</th><th>Estado</th>' + (isAdmin ? '<th>Acciones</th>' : '') + '</tr></thead>'
    + '<tbody>' + rows + '</tbody></table>'
    + '</div>' + modal;
}

function previewImgProducto(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    var wrap = document.getElementById('prod-img-preview-wrap');
    wrap.innerHTML = '<img src="' + e.target.result + '" style="width:80px;height:80px;object-fit:cover;border-radius:8px;margin-bottom:6px"><br>'
      + '<span style="font-size:12px;color:var(--text-soft)">' + file.name + '</span>';
  };
  reader.readAsDataURL(file);
}

function abrirNuevoProductoSupa() {
  document.getElementById('prod-modal-title').textContent = 'Nuevo Producto';
  document.getElementById('prod-id').value    = '';
  document.getElementById('prod-name').value  = '';
  document.getElementById('prod-cat').value   = 'Oficina';
  document.getElementById('prod-icon').value  = '📦';
  document.getElementById('prod-price').value = '';
  document.getElementById('prod-img-url').value = '';
  document.getElementById('prod-img-file').value = '';
  document.getElementById('prod-img-preview-wrap').innerHTML = '<div style="font-size:28px;margin-bottom:6px">📁</div><div style="font-size:13px;color:var(--text-soft)">Haz clic para seleccionar imagen</div><div style="font-size:11px;color:var(--text-soft);margin-top:4px">JPG, PNG, WEBP — max 2MB</div>';
  document.getElementById('prod-modal').style.display = 'flex';
}

function abrirEditarProductoSupa(id) {
  var p = _catalogoSupa.find(function(x) { return x.id === id; });
  if (!p) return;
  document.getElementById('prod-modal-title').textContent = 'Editar Producto';
  document.getElementById('prod-id').value    = p.id;
  document.getElementById('prod-name').value  = p.nombre || '';
  document.getElementById('prod-cat').value   = p.categoria || 'Oficina';
  document.getElementById('prod-icon').value  = p.icono || '📦';
  document.getElementById('prod-price').value = p.precio_ref || '';
  document.getElementById('prod-img-url').value = p.imagen_url || '';
  document.getElementById('prod-img-file').value = '';
  var wrap = document.getElementById('prod-img-preview-wrap');
  if (p.imagen_url) {
    wrap.innerHTML = '<img src="' + p.imagen_url + '" style="width:80px;height:80px;object-fit:cover;border-radius:8px;margin-bottom:6px"><br><span style="font-size:12px;color:var(--text-soft)">Imagen actual — haz clic para cambiar</span>';
  } else {
    wrap.innerHTML = '<div style="font-size:28px;margin-bottom:6px">📁</div><div style="font-size:13px;color:var(--text-soft)">Haz clic para agregar imagen</div>';
  }
  document.getElementById('prod-modal').style.display = 'flex';
}

function guardarProductoSupa() {
  var id      = document.getElementById('prod-id').value;
  var nombre  = document.getElementById('prod-name').value.trim();
  var cat     = document.getElementById('prod-cat').value;
  var icono   = document.getElementById('prod-icon').value.trim() || '📦';
  var precio  = parseFloat(document.getElementById('prod-price').value) || 0;
  var imgUrl  = document.getElementById('prod-img-url').value;
  var fileInput = document.getElementById('prod-img-file');

  if (!nombre) { showAdminToast('El nombre es obligatorio'); return; }

  var btn = document.getElementById('prod-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando...'; }

  var SUPA_URL  = 'https://jnxsofraqshxjboukiab.supabase.co';
  var SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';

  function guardarConImg(imgFinal) {
    var body    = { nombre: nombre, categoria: cat, icono: icono, precio_ref: precio, imagen_url: imgFinal || null };
    var url     = id ? SUPA_URL + '/rest/v1/productos?id=eq.' + id : SUPA_URL + '/rest/v1/productos';
    var method  = id ? 'PATCH' : 'POST';
    var headers = { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' };
    if (!id) { headers['Prefer'] = 'return=representation'; body.activo = true; }
    fetch(url, { method: method, headers: headers, body: JSON.stringify(body) })
    .then(function(r) {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar'; }
      if (r.ok) {
        document.getElementById('prod-modal').style.display = 'none';
        showAdminToast(id ? '✅ Producto actualizado' : '✅ Producto creado');
        loadCatalogoSection(document.getElementById('admin-content'));
      } else {
        r.text().then(function(t) { showAdminToast('Error: ' + t.substring(0,80)); });
      }
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar'; }
      showAdminToast('Error de conexion');
    });
  }

  if (fileInput && fileInput.files && fileInput.files[0]) {
    var file = fileInput.files[0];
    var ext  = file.name.split('.').pop();
    var path = 'producto_' + Date.now() + '.' + ext;
    fetch(SUPA_URL + '/storage/v1/object/productos/' + path, {
      method: 'POST',
      headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Content-Type': file.type, 'x-upsert': 'true' },
      body: file
    })
    .then(function(r) {
      if (r.ok) {
        guardarConImg(SUPA_URL + '/storage/v1/object/public/productos/' + path);
      } else {
        r.text().then(function(t) { showAdminToast('Error subiendo imagen: ' + t.substring(0,80)); });
        if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar'; }
      }
    })
    .catch(function() {
      showAdminToast('Error subiendo imagen');
      if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar'; }
    });
  } else {
    guardarConImg(imgUrl || null);
  }
}

function toggleProductoSupa(id, activo) {
  var SUPA_URL  = 'https://jnxsofraqshxjboukiab.supabase.co';
  var SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';
  fetch(SUPA_URL + '/rest/v1/productos?id=eq.' + id, {
    method: 'PATCH',
    headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ activo: !activo })
  })
  .then(function(r) {
    if (r.ok) {
      showAdminToast(!activo ? '✅ Producto activado' : '⏸️ Producto pausado');
      loadCatalogoSection(document.getElementById('admin-content'));
    } else { showAdminToast('Error al actualizar'); }
  })
  .catch(function() { showAdminToast('Error de conexion'); });
}

function eliminarProductoSupa(id, nombre) {
  if (!confirm('¿Eliminar el producto "' + nombre + '"? Esta accion no se puede deshacer.')) return;
  var SUPA_URL  = 'https://jnxsofraqshxjboukiab.supabase.co';
  var SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';
  fetch(SUPA_URL + '/rest/v1/productos?id=eq.' + id, {
    method: 'DELETE',
    headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON }
  })
  .then(function(r) {
    if (r.ok) {
      showAdminToast('🗑️ Producto eliminado');
      loadCatalogoSection(document.getElementById('admin-content'));
    } else { showAdminToast('Error al eliminar'); }
  })
  .catch(function() { showAdminToast('Error de conexion'); });
}
