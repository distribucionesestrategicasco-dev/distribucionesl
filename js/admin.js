// Firma digital de la empresa (pre-cargada en remisiones)
// FIRMA_EMPRESA y LOGO_REMISION viven en js/remision-assets.js, que se
// carga antes que este archivo. Estaban incrustadas aquí como base64 y
// sumaban 142 KB de los 307 KB del archivo.
﻿
// El tema lo maneja app.js, que se carga después que este archivo y por
// tanto ganaba de todas formas. Aquí había una segunda pareja
// toggleDarkMode/initTheme, muerta y además con otra clave de
// localStorage ('dlc_theme' frente a 'dlc-theme'): dos sistemas de tema
// escribiendo en el mismo navegador.


// ── Historial de precios ───────────────────────


/* ================================================
   admin.js — Panel de administración
   ================================================ */

// Usuario activo en sesión
var currentUser = null;
// Sincronizar con window.currentUser al arrancar
(function() { try { var s = localStorage.getItem('dlc_session'); if (s) { var u = JSON.parse(s); if (u && u.username && (!u.expires || Date.now() < u.expires)) { currentUser = u; window.currentUser = u; } else { localStorage.removeItem('dlc_session'); } } } catch(e) {} })();

// Módulos disponibles para asignar a usuarios
const ALL_MODULES = [
  { key: 'pedidos',      label: 'Nuevas' },
  { key: 'cotizaciones', label: 'En Aprobación' },
  { key: 'ordenes',      label: 'Aprobadas' },
  { key: 'remisiones',   label: 'Despachadas' },
  { key: 'entregados',   label: 'Entregadas' },
  { key: 'catalogo',     label: 'Catálogo' },
  { key: 'exportar',     label: 'Exportar Excel' },
  { key: 'usuarios',     label: 'Usuarios' },
];

const ROLE_LABELS = {
  administrador: 'Administrador',
};

// Permisos: admin tiene todo. El resto usa el array currentUser.permisos
function canDo(section) {
  if (!currentUser) return false;
  if (currentUser.rol === 'administrador') return true;
  var perms = currentUser.permisos || [];
  return perms.includes(section);
}



// Parsear permisos desde string JSON o array
function parsePermisos(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch(e) { return []; }
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
  // Usar Edge Function para login: aplica rate limiting server-side
  fetch(SUPA_URL + '/functions/v1/admin-usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPA_ANON },
    body: JSON.stringify({ action: 'login', data: { username: u, password: p } })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar →'; }
    if (d.ok && d.data) {
      var user = d.data;
      window.currentUser = { username: user.username, nombre: user.nombre || user.username, rol: user.rol || 'administrador', permisos: parsePermisos(user.permisos), token: user.token, expires: Date.now() + 8 * 3600 * 1000 };
      try { localStorage.setItem('dlc_session', JSON.stringify(window.currentUser)); } catch(e) {}
      var lg = document.getElementById('page-admin-login'); if (lg) lg.style.display = 'none';
      var pa = document.getElementById('page-admin'); if (pa) { pa.style.display = 'block'; pa.classList.add('active'); }
      if (typeof initAdminSidebar === 'function') initAdminSidebar();
      renderAdminSection('dashboard');
    } else {
      if (err) { err.textContent = d.error || 'Usuario o contraseña incorrectos.'; err.classList.add('show'); }
    }
  })
  .catch(function() {
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar →'; }
    if (err) { err.textContent = 'Error de conexión. Intenta de nuevo.'; err.classList.add('show'); }
  });
}



// ── Navegación interna ─────────────────────────

function adminSection(section) {
  currentAdminSection = section;
  document.querySelectorAll('.admin-sidebar a').forEach(function(a) {
    a.classList.remove('active');
  });
  var link = document.querySelector('.admin-sidebar a[onclick*="\'' + section + '\'"]');
  if (link) link.classList.add('active');
  if (typeof renderAdminSection === 'function') renderAdminSection(section);
}

// Módulo que hace falta para cada sección. El servidor también lo exige;
// esto evita que la pantalla se quede cargando contra un 403.
const MODULO_POR_SECCION = {
  pedidos:      'pedidos',
  cotizaciones: 'cotizaciones',
  ordenes:      'ordenes',
  remisiones:   'remisiones',
  entregados:   'entregados',
  catalogo:     'catalogo',
  clientes:     'pedidos',
};

function renderAdminSection(sec) {
  // Antes esta función no comprobaba permisos ni una vez: el menú ocultaba
  // enlaces, pero escribir adminSection('pedidos') en la consola bastaba.
  const modulo = MODULO_POR_SECCION[sec];
  const SOLO_ADMIN = ['usuarios', 'papelera', 'auditoria'];
  const permitido = SOLO_ADMIN.indexOf(sec) >= 0
    ? (currentUser && currentUser.rol === 'administrador')
    : (!modulo || canDo(modulo));

  if (!permitido) {
    showAdminToast('⛔ No tienes acceso a esta sección');
    if (sec !== 'dashboard') return renderAdminSection('dashboard');
    return;
  }

  currentAdminSection = sec;
  const cont = document.getElementById('admin-content');
  document.querySelectorAll('.admin-sidebar a').forEach(function(a) { a.classList.remove('active'); });
  var activeLink = document.querySelector('.admin-sidebar a[onclick*="\'' + sec + '\'"]');
  if (activeLink) activeLink.classList.add('active');

  cont.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;gap:16px;color:var(--text-soft)">
      <div style="width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--brand-cyan);border-radius:50%;animation:spin 0.8s linear infinite"></div>
      <p style="font-size:15px">Cargando...</p>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;

  // Perfil del usuario actual
  if (sec === 'perfil') {
    cont.innerHTML = renderPerfilSection();
    return;
  }

  // Usuarios y Catálogo no necesitan cargar pedidos
  if (sec === 'usuarios') {
    loadUsersSection(cont);
    return;
  }

  if (sec === 'catalogo') {
    loadCatalogoSection(cont);
    return;
  }

  if (sec === 'papelera') {
    loadPapeleraSection(cont);
    return;
  }

  if (sec === 'auditoria') {
    loadAuditoriaSection(cont);
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
  const cnt = s => orders.filter(o => o.status === s).length;

  // Pedidos urgentes: pending > 2 días
  const hoy      = new Date();
  const urgentes = orders.filter(o => {
    if (o.status !== 'pending') return false;
    const diff = (hoy - new Date(o.date)) / 86400000;
    return diff >= 2;
  });

  // Últimos 5 movimientos. `orders` ya llega ordenado de más reciente a más
  // antiguo desde el servidor; el .reverse() que había aquí mostraba
  // justamente los cinco más viejos bajo el título "Últimos Movimientos".
  const recientes = orders.slice(0, 5);

  return `
    <div class="admin-header">
      <div>
        <h1>Dashboard</h1>
        <p>Hola ${currentUser ? (currentUser.nombre || currentUser.username) : ''} - ${fmtFechaLarga(new Date().toISOString().slice(0,10))}</p>
      </div>
      ${canDo('exportar') ? '<button onclick="exportarExcel()" style="background:#1D6F42;color:#fff;border:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">📥 Exportar Excel</button>' : ''}
    </div>

    <!-- KPIs -->
    <div class="stats-row">
      <div class="stat-card" onclick="adminSection('pedidos')" style="cursor:pointer;--stat-color:#F59E0B">
        <div class="stat-card-top"><div class="slbl">Nuevas Remisiones</div><span class="material-icons stat-kpi-icon" style="color:#F59E0B">inbox</span></div>
        <div class="sval" style="color:#854F0B">${cnt('pending')}</div>
        <div class="sdelta up">Requieren aprobación →</div>
      </div>
      <div class="stat-card" onclick="adminSection('cotizaciones')" style="cursor:pointer;--stat-color:#3B82F6">
        <div class="stat-card-top"><div class="slbl">En Aprobación</div><span class="material-icons stat-kpi-icon" style="color:#3B82F6">request_quote</span></div>
        <div class="sval" style="color:#185FA5">${cnt('quoted')}</div>
        <div class="sdelta">Esperando aprobación →</div>
      </div>
      <div class="stat-card" onclick="adminSection('ordenes')" style="cursor:pointer;--stat-color:#10B981">
        <div class="stat-card-top"><div class="slbl">Por Despachar</div><span class="material-icons stat-kpi-icon" style="color:#10B981">verified</span></div>
        <div class="sval" style="color:#3B6D11">${cnt('approved')}</div>
        <div class="sdelta up">Listas para despacho →</div>
      </div>
      <div class="stat-card" onclick="adminSection('remisiones')" style="cursor:pointer;--stat-color:#8B5CF6">
        <div class="stat-card-top"><div class="slbl">Despachados</div><span class="material-icons stat-kpi-icon" style="color:#8B5CF6">local_shipping</span></div>
        <div class="sval" style="color:#7C3AED">${cnt('dispatched')}</div>
        <div class="sdelta">En camino →</div>
      </div>
      <div class="stat-card" onclick="adminSection('entregados')" style="cursor:pointer;--stat-color:#1E47A0">
        <div class="stat-card-top"><div class="slbl">Entregados</div><span class="material-icons stat-kpi-icon" style="color:#1E47A0">task_alt</span></div>
        <div class="sval" style="color:#1E47A0">${cnt('delivered')}</div>
        <div class="sdelta">Confirmado →</div>
      </div>
    </div>

    <!-- Alertas urgentes -->
    ${urgentes.length > 0 ? `
    <div style="background:#FFF4E5;border:1px solid #F59E0B;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
      <span style="font-size:24px">⚠️</span>
      <div>
        <div style="font-size:14px;font-weight:700;color:#92400E">
          ${urgentes.length} remisión(es) sin cotizar hace más de 2 días
        </div>
        <div style="font-size:13px;color:#B45309;margin-top:2px">
          ${urgentes.map(o => _esc(o.client)).join(', ')}
          — <a onclick="adminSection('pedidos')" style="cursor:pointer;color:#B45309;font-weight:700">Cotizar ahora →</a>
        </div>
      </div>
    </div>` : ''}

    <!-- Gráfica de ventas mensuales -->
    <div class="section-card" style="margin-bottom:20px">
      <div class="section-card-head">
        <h3><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:6px;color:#2F62D4">bar_chart</span>Remisiones por Mes</h3>
      </div>
      <canvas id="dashboard-chart" height="120" style="width:100%;padding:16px 20px"></canvas>
    </div>

    <div class="dashboard-grid">

      <!-- Últimos movimientos -->
      <div class="section-card" style="margin:0">
        <div class="section-card-head"><h3>Últimos Movimientos</h3></div>
        <table>
          <thead><tr><th>Cliente</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            ${recientes.map(o => `
              <tr>
                <td>${_esc(o.client)}<small>${_esc(o.company||'')}</small></td>
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
            ['Remisiones recibidas', orders.length,                                                        '#5B8DEF'],
            ['Remisiones en aprobación', cnt('quoted') + cnt('approved') + cnt('dispatched') + cnt('delivered'), '#2F62D4'],
            ['Órdenes aprobadas',    cnt('approved') + cnt('dispatched') + cnt('delivered'),               '#3B6D11'],
            ['Despachados',          cnt('dispatched') + cnt('delivered'),                                  '#639922'],
            ['Entregados', cnt('delivered'),                                                      '#1E47A0'],
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
  return '<div style="position:relative;margin-bottom:16px">'
    + '<span class="material-icons" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#B0B4C0;font-size:18px;pointer-events:none">search</span>'
    + '<input'
    + ' id="admin-search-input"'
    + ' type="text"'
    + ' placeholder="' + placeholder + '"'
    + ' value="' + adminSearch + '"'
    + ' oninput="adminSearch=this.value;clearTimeout(window._searchT);window._searchT=setTimeout(renderTableOnly,350)"'
    + ' style="width:100%;padding:10px 40px;border:1.5px solid #E8EAF0;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;color:#1A1A2E;outline:none;box-sizing:border-box"'
    + '>'
    + '</div>';
}



function renderTableOnly() {
  const cont = document.getElementById('admin-content');
  if (!cont) return;
  const sec = currentAdminSection;
  const map = {
    pedidos:      renderPedidos,
    cotizaciones: renderCotizaciones,
    ordenes:      renderOrdenes,
    remisiones:   renderRemisiones,
    entregados:   renderEntregados,
  };
  if (!map[sec]) return;
  const cursor = document.getElementById('admin-search-input');
  const pos = cursor ? cursor.selectionStart : 0;
  const val = cursor ? cursor.value : adminSearch;
  cont.innerHTML = map[sec]();
  const newInput = document.getElementById('admin-search-input');
  if (newInput) { newInput.focus(); newInput.setSelectionRange(pos, pos); }
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
// Guarda la clave canónica, no la etiqueta en español: así el historial se
// puede filtrar y comparar, y la traducción queda en un solo sitio.
function addHistorial(orderId, nuevoEstado) {
  const o = orders.find(x => x.id === orderId);
  if (!o) return;
  if (!o.historial) o.historial = [];
  const ahora = new Date();
  o.historial.push({
    estado:  nuevoEstado,
    fecha:   ahora.toLocaleDateString('es-CO'),
    hora:    ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    // El servidor guarda el username de la sesión; aquí se muestra lo mismo
    // para que la vista coincida con lo que quedó registrado.
    usuario: currentUser ? currentUser.username : 'Sistema',
  });
  addHistorialSupa(orderId, nuevoEstado).catch(function(e) { console.warn('historial supa:', e); });
}

// ── Cambio de estado con confirmación del servidor ─────────────────────
// Único camino para mover una remisión. Antes cada acción mutaba la memoria,
// anunciaba éxito y lanzaba la petición con .catch(console.warn): si el
// servidor la rechazaba (pasaba siempre con rol 'usuario'), el operario veía
// "guardado" y el cambio no existía. Ahora se espera la confirmación y, si
// falla, se revierte y se muestra el motivo real.
async function cambiarEstadoPedido(orderId, nuevoEstado, opciones) {
  const opts = opciones || {};
  const o = orders.find(x => x.id === orderId);
  if (!o) return false;

  const estadoPrevio = o.status;
  try {
    await updateOrderStatus(orderId, nuevoEstado, opts.campos || null);
    o.status = nuevoEstado;
    addHistorial(orderId, nuevoEstado);
    if (opts.silencioso !== true) {
      showAdminToast(opts.exito || ('✅ Remisión ' + orderId + ' → ' + statusLabel(nuevoEstado)));
    }
    return true;
  } catch (err) {
    o.status = estadoPrevio;
    console.error('No se pudo cambiar el estado:', err);
    showAdminToast('❌ ' + String((err && err.message) || 'No se pudo guardar el cambio').substring(0, 140));
    return false;
  }
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
    months[key] = { label: label, count: 0 };
  }

  orders.forEach(function(o) {
    var d = parseOrderDate(o);
    if (!d) return;
    var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (months[key]) months[key].count++;
  });

  // La gráfica siempre representó el número de remisiones por mes; también
  // acumulaba importes que no se usaban para dibujar nada.
  var keys    = Object.keys(months);
  var labels  = keys.map(function(k) { return months[k].label; });
  var counts  = keys.map(function(k) { return months[k].count; });
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
    var color = counts[i] === Math.max.apply(null, counts) ? '#5B8DEF' : '#2F62D4';
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


function renderHistorial(o) {
  if (!o.historial || o.historial.length === 0) return '';
  return `
    <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
      <div style="font-size:11px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Historial</div>
      ${o.historial.map(h => `
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-soft);margin-bottom:4px">
          <span style="width:6px;height:6px;border-radius:50%;background:var(--brand-cyan);flex-shrink:0"></span>
          <strong style="color:var(--text)">${_esc(statusLabel(h.estado))}</strong>
          <span>${_esc(h.fecha || '')}${h.hora ? ' ' + _esc(h.hora) : ''}</span>
          <span>· ${_esc(h.usuario || '—')}</span>
        </div>`).join('')}
    </div>
  `;
}

// ── Pedidos nuevos ─────────────────────────────



// ── Cotizaciones ───────────────────────────────

function renderCotizaciones() {
  const all    = filterOrders(orders);
  const quoted = all.filter(o => o.status === 'quoted');
  return `
    <div class="admin-header">
      <div>
        <h1>En Aprobación</h1>
        <p>${quoted.length} remisión(es) esperando aprobación del cliente</p>
      </div>
    </div>
    <div class="section-card">
      <div class="section-card-head"><h3>En Espera de Aprobación</h3></div>
      ${buildSearchBar('Buscar remisión...')}
      ${buildDateFilter()}
      ${quoted.length === 0
        ? '<div class="section-empty">' + (adminSearch ? 'Sin resultados para "' + adminSearch + '"' : 'No hay remisiones en aprobación') + '</div>'
        : `<table>
            <thead>
              <tr><th>Remisión</th><th>Cliente</th><th>Productos</th><th>Fecha</th><th>Días espera</th><th>Acción</th></tr>
            </thead>
            <tbody>
              ${quoted.map(o => {
                const dias = Math.floor((new Date() - new Date(o.date)) / 86400000);
                const diasColor = dias >= 3 ? '#A32D2D' : dias >= 2 ? '#B45309' : 'var(--text-soft)';
                return `
                  <tr>
                    <td><strong>${o.id}</strong></td>
                    <td>${_esc(o.client)}<small>${_esc(o.company||'')}</small></td>
                    <td><strong>${contarUnidades(o)}</strong><small>${(o.items||[]).length} referencia(s)</small></td>
                    <td>${fmtFecha(o.date)}</td>
                    <td style="font-weight:700;color:${diasColor}">${dias}d</td>
                    <td>
                      <button class="action-link muted" onclick="openQuotePanel('${o.id}')">Ver →</button>
                      <button class="action-link" style="color:#3B6D11;margin-left:4px" onclick="aprobarManualmente('${o.id}')" title="El cliente confirmó por teléfono o WhatsApp">✅ Aprobar</button>
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

function renderPedidos() {
  const all = filterOrders(orders);
  const statusFilter = window._pedidosStatusFilter || 'todos';
  const filtered = statusFilter === 'todos' ? all : all.filter(o => o.status === statusFilter);
  const STATUS_LABEL = { pending:'Pendiente', quoted:'Cotizado', approved:'Aprobado', dispatched:'Despachado', delivered:'Entregado' };
  const STATUS_BADGE = { pending:'badge-pending', quoted:'badge-quoted', approved:'badge-approved', dispatched:'badge-dispatched', delivered:'badge-delivered' };
  const tabs = [
    { key:'todos',      label:'Todos',        count: all.length },
    { key:'pending',    label:'Pendientes',   count: all.filter(o => o.status === 'pending').length },
    { key:'quoted',     label:'Por aprobar',  count: all.filter(o => o.status === 'quoted').length },
    { key:'approved',   label:'Aprobados',    count: all.filter(o => o.status === 'approved').length },
    { key:'dispatched', label:'Despachados',  count: all.filter(o => o.status === 'dispatched').length },
    { key:'delivered',  label:'Entregados',   count: all.filter(o => o.status === 'delivered').length },
  ];
  const tabsHtml = tabs.map(function(t) {
    const active = statusFilter === t.key;
    return '<button onclick="window._pedidosStatusFilter=\'' + t.key + '\';renderLocalSection()" style="padding:8px 16px;border-radius:20px;border:2px solid ' + (active ? 'var(--brand-cyan)' : 'var(--border)') + ';background:' + (active ? 'var(--brand-cyan)' : 'transparent') + ';color:' + (active ? '#fff' : 'var(--text)') + ';font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">' + t.label + ' (' + t.count + ')</button>';
  }).join('');
  const rowsHtml = filtered.length === 0
    ? '<div class="section-empty">' + (adminSearch ? 'Sin resultados para "' + adminSearch + '"' : 'No hay remisiones en esta categoría') + '</div>'
    : '<table><thead><tr><th>Remisión</th><th>Cliente</th><th>Contacto</th><th>Fecha</th><th>Estado</th><th>Historial</th><th>Acción</th></tr></thead><tbody>'
      + filtered.map(function(o) {
          var itemsHtml = '<ul style="margin:0;padding-left:16px">' + (o.items || []).map(function(i) { return '<li style="font-size:13px">' + _esc(i.name) + ' ×' + i.qty + '</li>'; }).join('') + '</ul>';
          var badge = '<span class="badge ' + (STATUS_BADGE[o.status] || '') + '">' + (STATUS_LABEL[o.status] || o.status) + '</span>';
          var acciones = '<button class="action-link" onclick="openQuotePanel(\'' + o.id + '\')">Cotizar →</button>';
          if (currentUser && currentUser.rol === 'administrador') {
            acciones += '<button class="action-link" style="color:var(--brand-blue);margin-left:6px" onclick="editarPedido(\'' + o.id + '\')">✏️</button>';
            acciones += '<button class="action-link" style="color:#A32D2D;margin-left:4px" onclick="eliminarPedido(\'' + o.id + '\')">🗑</button>';
          }
          return '<tr>'
            + '<td><strong>' + o.id + '</strong></td>'
            + '<td>' + _esc(o.client) + '<br><small style="color:var(--text-soft)">' + _esc(o.company) + '</small></td>'
            + '<td style="font-size:13px">' + _esc(o.email) + '<br><small>' + _esc(o.phone) + '</small></td>'
            + '<td>' + fmtFecha(o.date) + '</td>'
            + '<td>' + badge + '</td>'
            + '<td>' + renderHistorial(o) + '</td>'
            + '<td>' + acciones + '</td>'
            + '</tr>';
        }).join('')
      + '</tbody></table>';
  return '<div class="admin-header"><div><h1>Remisiones</h1><p>' + all.length + ' remisión(es) en total</p></div></div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">' + tabsHtml + '</div>'
    + '<div class="section-card"><div class="section-card-head"><h3>' + (statusFilter === 'todos' ? 'Todas las Remisiones' : 'Remisiones: ' + (STATUS_LABEL[statusFilter] || statusFilter)) + '</h3></div>'
    + buildSearchBar('Buscar por cliente, empresa, email...')
    + buildDateFilter()
    + rowsHtml
    + '</div>';
}

function renderOrdenes() {
  const all      = filterOrders(orders);
  const approved = all.filter(o => o.status === 'approved');
  return `
    <div class="admin-header">
      <div>
        <h1>Órdenes Aprobadas</h1>
        <p>${approved.length} orden(es) lista(s) para despacho</p>
      </div>
    </div>
    <div class="section-card">
      <div class="section-card-head"><h3>Órdenes de Compra Confirmadas</h3></div>
      ${buildSearchBar('Buscar orden...')}
      ${buildDateFilter()}
      ${approved.length === 0
        ? '<div class="section-empty">' + (adminSearch ? 'Sin resultados' : 'No hay órdenes aprobadas') + '</div>'
        : `<table>
            <thead>
              <tr><th>Remisión</th><th>Cliente</th><th>Productos</th><th>Ciudad</th><th>Fecha req.</th><th>Acción</th></tr>
            </thead>
            <tbody>
              ${approved.map(o => {
                return `
                  <tr>
                    <td><strong>${o.id}</strong></td>
                    <td>${_esc(o.client)}<small>${_esc(o.company||'')}</small></td>
                    <td><strong>${contarUnidades(o)}</strong><small>${(o.items||[]).length} referencia(s)</small></td>
                    <td>${_esc(o.city)||'—'}</td>
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


// ── Remisión Manual ─────────────────────────────────
var _remManualItems = [];

// Alimenta el autocompletado de productos del formulario. Este fetch estaba
// suelto en el ámbito global del archivo, así que se disparaba al cargar la
// página —antes incluso del login— aunque nadie fuera a crear una remisión.
// Ahora se pide al abrir el modal, y solo la primera vez.
function _cargarProductosParaRemision() {
  if (window._catalogoSupa && window._catalogoSupa.length > 0) return;
  var SUPA = 'https://jnxsofraqshxjboukiab.supabase.co';
  var KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';
  fetch(SUPA + '/rest/v1/productos?select=id,nombre,categoria,precio_ref&activo=eq.true&order=nombre.asc', {
    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  }).then(function(r) { return r.json(); })
    .then(function(data) { window._catalogoSupa = data || []; })
    .catch(function(e) { console.warn('catálogo para remisión manual:', e); });
}

// Abre el formulario manual con los datos de una remisión anterior ya
// puestos. En la práctica casi todas las remisiones son del mismo cliente,
// así que hasta ahora se reteclaban cliente, NIT, teléfono, ciudad y correo
// una y otra vez — cinco campos por remisión, y cada uno una ocasión de
// equivocarse en el NIT que va impreso en el documento.
function repetirRemision(orderId) {
  var o = orders.find(function(x) { return x.id === orderId; });
  if (!o) { showAdminToast('⚠️ No se encontró la remisión'); return; }

  abrirRemisionManual();

  document.getElementById('rm-cliente').value  = o.client  || '';
  document.getElementById('rm-email').value    = o.email   || '';
  document.getElementById('rm-telefono').value = o.phone   || '';
  document.getElementById('rm-ciudad').value    = o.city    || '';
  document.getElementById('rm-direccion').value = o.address || '';
  document.getElementById('rm-nit').value       = o.nit     || '';

  // Los productos también se copian: si no sirven, se quitan de un clic.
  _remManualItems = (o.items || []).map(function(i) {
    return { name: i.name, qty: i.qty, price: i.price || 0 };
  });
  renderItemsManual();

  showAdminToast('Copiado de ' + orderId + ' — ajusta lo que haga falta');
}

function abrirRemisionManual() {
  _remManualItems = [];
  _cargarProductosParaRemision();
  const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  document.getElementById('quote-modal-title').textContent = 'Nueva Remisión Manual';
  document.getElementById('quote-modal-sub').textContent = 'Nueva remisión · ' + today;
  document.getElementById('quote-modal-body').innerHTML = ''
    + '<div style="display:flex;align-items:center;gap:12px;background:#EEF4FF;border:1px solid #D5E3FF;border-radius:10px;padding:12px 16px;margin-bottom:18px">'
      + '<span class="material-icons" style="color:#2F62D4;font-size:22px">receipt_long</span>'
      + '<div><div style="font-size:10px;font-weight:700;color:#6B7A99;text-transform:uppercase;letter-spacing:1px">Número de remisión</div>'
      + '<div style="font-size:19px;font-weight:800;color:#1E2A44;letter-spacing:-0.3px" id="rm-consecutivo">Calculando…</div></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">'
      + '<div class="form-group" style="margin:0"><label>Cliente *</label><input type="text" id="rm-cliente" placeholder="Nombre del cliente"></div>'
      + '<div class="form-group" style="margin:0"><label>Email</label><input type="email" id="rm-email" placeholder="correo@empresa.com"></div>'
      + '<div class="form-group" style="margin:0"><label>Teléfono</label><input type="text" id="rm-telefono" placeholder="+57 300 000 0000"></div>'
      + '<div class="form-group" style="margin:0"><label>NIT / CC</label><input type="text" id="rm-nit" placeholder="000000000-0"></div>'
    + '</div>'

    // El destino se pide aparte y con su nombre. Antes solo habia "Ciudad",
    // que se rellenaba con la del cliente, y el destino real acababa escrito
    // en las observaciones: de 15 remisiones, 12 tenian observaciones y
    // ninguna direccion. El cliente consultaba el seguimiento, leia
    // "Barranquilla" y la entrega era en Valledupar.
    + '<div style="border:1px solid #D5E3FF;background:#F7FAFF;border-radius:10px;padding:14px 16px;margin-bottom:20px">'
      + '<div style="font-size:10px;font-weight:700;color:#6B7A99;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Destino de la entrega</div>'
      + '<div style="display:grid;grid-template-columns:1fr 2fr;gap:12px">'
        + '<div class="form-group" style="margin:0"><label>Ciudad de entrega</label><input type="text" id="rm-ciudad" placeholder="Valledupar"></div>'
        + '<div class="form-group" style="margin:0"><label>Dirección de entrega</label><input type="text" id="rm-direccion" placeholder="Calle 00 # 00-00, local / bodega"></div>'
      + '</div>'
      + '<div style="font-size:11px;color:#6B7A99;margin-top:8px">Dónde se entrega la mercancía, que no siempre es la ciudad del cliente.</div>'
    + '</div>'

    + '<div class="section-card" style="margin-bottom:16px">'
      + '<div class="section-card-head"><h3><span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:6px">add_box</span>Agregar Producto</h3></div>'
      + '<div style="padding:16px 20px;display:grid;grid-template-columns:2fr 1fr auto;gap:10px;align-items:end">'
        + '<div class="form-group" style="margin:0">'
          + '<label>Producto</label>'
          + '<input type="text" id="rm-prod-nombre" placeholder="Buscar o escribir producto..." oninput="filtrarProductosManual(this.value)" autocomplete="off">'
          + '<div id="rm-prod-suggestions" style="position:absolute;background:#fff;border:1px solid #E8EAF0;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.1);z-index:100;max-height:180px;overflow-y:auto;width:300px;display:none"></div>'
        + '</div>'
        + '<div class="form-group" style="margin:0"><label>Cantidad</label><input type="number" id="rm-prod-qty" placeholder="1" min="1" value="1"></div>'
        
        + '<button onclick="agregarItemManual()" style="background:linear-gradient(135deg,#5B8DEF,#2F62D4);color:#FFFFFF;border:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;height:40px"><span class="material-icons" style="font-size:16px;vertical-align:middle">add</span></button>'
      + '</div>'
    + '</div>'

    + '<div id="rm-items-list" style="margin-bottom:20px"></div>'

    + '<div class="quote-totals" id="rm-totales" style="display:none">'
      + '<div class="quote-total-row"><span class="material-icons">receipt</span><span class="ql">Subtotal</span><span class="qv" id="rm-sub">$0</span></div>'
      + '<div class="quote-total-row"><span class="material-icons">percent</span><span class="ql">IVA (19%)</span><span class="qv" id="rm-iva">$0</span></div>'
      + '<div class="quote-total-row big"><span class="material-icons">payments</span><span>TOTAL</span><span class="qv" id="rm-total">$0</span></div>'
    + '</div>'

    + '<div class="form-group" style="margin-bottom:20px"><label>Observaciones</label><textarea id="rm-notas" rows="2" placeholder="Observaciones adicionales..." style="resize:vertical"></textarea></div>'

    + '<div class="quote-actions">'
      + '<button class="send-quote-btn" onclick="generarRemisionManual()">'
        + '<span class="material-icons">local_shipping</span> Generar Remisión'
      + '</button>'
      + '<button class="quote-cancel-btn" onclick="closeModal(\'quote-modal\')">'
        + '<span class="material-icons">close</span> Cancelar'
      + '</button>'
    + '</div>';

  openModal('quote-modal');

  // El número ya no se reserva aquí: lo asigna el servidor dentro de la
  // transacción al guardar. Reservarlo al abrir el modal hacía que dos
  // operarios simultáneos obtuvieran el mismo consecutivo.
  var el = document.getElementById('rm-consecutivo');
  if (el) el.textContent = 'Se asigna al guardar';
}

function filtrarProductosManual(q) {
  const box = document.getElementById('rm-prod-suggestions');
  if (!q || q.length < 2) { box.style.display = 'none'; return; }
  const lista = (window._catalogoSupa || window.PRODUCTS || [])
    .filter(function(p) { return (p.nombre || p.name || '').toLowerCase().includes(q.toLowerCase()); })
    .slice(0, 8);
  if (lista.length === 0) { box.style.display = 'none'; return; }
  box.innerHTML = lista.map(function(p) {
    const nombre = p.nombre || p.name || '';
    const precio = p.precio_ref || p.price || 0;
    return '<div onclick="seleccionarProductoManual(\'' + nombre.replace(/'/g, "\\'") + '\',' + precio + ')" '
      + 'style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #F0F1F5;font-size:13px;transition:background 0.1s" '
      + 'onmouseover="this.style.background=\'#F5F6FA\'" onmouseout="this.style.background=\'#fff\'">'
      + '<strong>' + nombre + '</strong>'
      + (precio > 0 ? '<span style="float:right;color:#2F62D4;font-size:12px">$' + fmt(precio) + '</span>' : '<span style="float:right;color:#B0B4C0;font-size:11px">Sin precio</span>')
      + '</div>';
  }).join('');
  box.style.display = 'block';
}

function seleccionarProductoManual(nombre, precio) {
  document.getElementById('rm-prod-nombre').value = nombre;
  document.getElementById('rm-prod-suggestions').style.display = 'none';
  document.getElementById('rm-prod-qty').focus();
}

function agregarItemManual() {
  const nombre = document.getElementById('rm-prod-nombre').value.trim();
  const qty    = parseInt(document.getElementById('rm-prod-qty').value) || 1;
  const precio = 0;
  if (!nombre) { showAdminToast('⚠️ Escribe el nombre del producto'); return; }
  _remManualItems.push({ name: nombre, qty: qty, price: precio });
  document.getElementById('rm-prod-nombre').value = '';
  document.getElementById('rm-prod-qty').value = '1';
  document.getElementById('rm-prod-suggestions').style.display = 'none';
  renderItemsManual();
}

function eliminarItemManual(idx) {
  _remManualItems.splice(idx, 1);
  renderItemsManual();
}

function actualizarItemManual(idx, campo, val) {
  if (campo === 'qty')   _remManualItems[idx].qty   = parseInt(val)   || 1;
  if (campo === 'price') _remManualItems[idx].price = parseFloat(val) || 0;
  renderItemsManual();
}

function renderItemsManual() {
  const cont = document.getElementById('rm-items-list');
  const totDiv = document.getElementById('rm-totales');
  if (_remManualItems.length === 0) {
    cont.innerHTML = '<div class="section-empty" style="padding:20px">Agrega productos a la remisión</div>';
    totDiv.style.display = 'none';
    return;
  }
  cont.innerHTML = '<div class="section-card"><table style="width:100%;border-collapse:collapse;font-size:13px">'
    + '<thead><tr style="background:#FAFBFC">'
      + '<th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;border-bottom:1px solid #F0F1F5">Producto</th>'
      + '<th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;border-bottom:1px solid #F0F1F5;width:80px">Cant.</th>'
      + '<th style="padding:10px 14px;border-bottom:1px solid #F0F1F5;width:40px"></th>'
    + '</tr></thead><tbody>'
    + _remManualItems.map(function(item, i) {
        return '<tr style="border-bottom:1px solid #F5F6FA">'
          + '<td style="padding:10px 14px;font-weight:600;color:#1A1A2E">' + _esc(item.name) + '</td>'
          + '<td style="padding:6px 8px;text-align:center"><input type="number" min="1" value="' + item.qty + '" oninput="actualizarItemManual(' + i + ',\'qty\',this.value)" style="width:56px;text-align:center;border:1px solid #E8EAF0;border-radius:6px;padding:5px;font-family:inherit;font-size:13px;font-weight:700"></td>'
          + '<td style="padding:10px 8px;text-align:center"><button onclick="eliminarItemManual(' + i + ')" style="background:none;border:none;cursor:pointer;color:#B0B4C0;padding:4px"><span class="material-icons" style="font-size:16px">delete</span></button></td>'
        + '</tr>';
      }).join('')
    + '</tbody></table></div>';
}

async function generarRemisionManual() {
  const cliente   = document.getElementById('rm-cliente').value.trim();
  const empresa   = cliente; // Campo "Empresa" eliminado del formulario: se usa Cliente.
  const email     = document.getElementById('rm-email').value.trim();
  const telefono  = document.getElementById('rm-telefono').value.trim();
  const ciudad    = document.getElementById('rm-ciudad').value.trim();
  const direccion = document.getElementById('rm-direccion').value.trim();
  const nit       = document.getElementById('rm-nit').value.trim();
  const notas     = document.getElementById('rm-notas').value.trim();

  if (!cliente) { showAdminToast('⚠️ El nombre del cliente es obligatorio'); return; }
  if (_remManualItems.length === 0) { showAdminToast('⚠️ Agrega al menos un producto'); return; }

  const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const logo  = document.querySelector('.sidebar-brand-logo') ? '<img src="' + document.querySelector('.sidebar-brand-logo').src + '" style="height:48px;width:48px;object-fit:contain">' : '';

  const btnGen = document.querySelector('#quote-modal .send-quote-btn');
  if (btnGen) { btnGen.disabled = true; btnGen.textContent = '⏳ Guardando...'; }

  // Se guarda PRIMERO y el servidor asigna el consecutivo. Antes el documento
  // se generaba antes de guardar: si la inserción fallaba, quedaba un papel
  // entregado al cliente con un número que el sistema no conocía.
  const itemsManual = _remManualItems.map(function(i) {
    return { name: i.name, qty: i.qty, price: i.price || 0, icon: String.fromCodePoint(128230) };
  });

  let remNum;
  try {
    const guardada = await _edgePedidosAsync('pedidos:crear-manual', {
      client: cliente, company: empresa || '', nit: nit || '', email: email || '',
      phone: telefono || '', city: ciudad || '', address: direccion || '', notes: notas || '',
      date: new Date().toISOString().slice(0, 10), status: 'dispatched',
      items: itemsManual,
    });
    remNum = guardada && guardada.id;
    if (!remNum) throw new Error('El servidor no devolvió el número de remisión');
  } catch (err) {
    console.error('Error guardando la remisión manual:', err);
    if (btnGen) { btnGen.disabled = false; btnGen.innerHTML = '<span class="material-icons">local_shipping</span> Generar Remisión'; }
    showAdminToast('❌ ' + String((err && err.message) || 'No se pudo guardar la remisión').substring(0, 140));
    return; // sin guardar no se genera documento
  }

  const fNow = new Date();
  const sub2 = itemsManual.reduce(function(s, i) { return s + (i.qty * (i.price || 0)); }, 0);
  orders.unshift({
    id: remNum, client: cliente, company: empresa || '', nit: nit || '', email: email || '',
    phone: telefono || '', city: ciudad || '', address: direccion || '', notes: notas || '',
    date: fNow.toISOString().slice(0, 10), status: 'dispatched',
    sheetSubtotal: sub2, sheetIva: sub2 * 0.19, sheetTotal: sub2 * 1.19,
    items: itemsManual,
    historial: [{
      estado: 'dispatched',
      fecha: fNow.toLocaleDateString('es-CO'),
      hora: fNow.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      usuario: window.currentUser ? window.currentUser.username : 'Sistema',
    }],
  });

  if (btnGen) { btnGen.disabled = false; btnGen.innerHTML = '<span class="material-icons">local_shipping</span> Generar Remisión'; }
  closeModal('quote-modal');
  showAdminToast('✅ Remisión ' + remNum + ' guardada');

  document.getElementById('remision-body').innerHTML = _buildRemisionHTML({
    remNum: remNum,
    orderId: null,
    today: today,
    logo: logo,
    cliente: cliente,
    empresa: empresa,
    nit: nit,
    email: email,
    telefono: telefono,
    ciudad: ciudad,
    direccion: direccion,
    notas: notas,
    items: _remManualItems,
    mostrarPrecios: false,
    mostrarTotales: false
  })
  + '<div style="display:flex;gap:12px;justify-content:center;padding:20px 0;flex-wrap:wrap" class="no-print">'
  + '<button onclick="doDownloadPDF(\'' + remNum + '\')" style="background:linear-gradient(135deg,#5B8DEF,#2F62D4);color:#FFFFFF;border:none;padding:12px 22px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">⬇️ Descargar PDF</button>'
  + '<button onclick="doPrint()" style="background:linear-gradient(135deg,#2F62D4,#1E47A0);color:#fff;border:none;padding:12px 22px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Imprimir</button>'
  + (navigator.share ? '<button onclick="compartirRemision()" style="background:#25D366;color:#fff;border:none;padding:12px 22px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Compartir PDF</button>' : '')
  + '<button id="btn-enviar-correo" onclick="enviarRemisionCorreo(\'' + remNum + '\')" style="background:linear-gradient(135deg,#0EA5E9,#0369A1);color:#fff;border:none;padding:12px 22px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px"><span class="material-icons" style="font-size:16px">mail</span> Enviar por Correo</button>'
  + '</div>';

  openModal('remision-modal');
}
// ── Remisiones ─────────────────────────────────

function renderRemisiones() {
  const all        = filterOrders(orders);
  const dispatched = all.filter(o => o.status === 'dispatched' || o.status === 'delivered');
  const delivered  = all.filter(o => o.status === 'delivered');
  const unidades   = dispatched.reduce((s, o) => s + contarUnidades(o), 0);

  return `
    <div class="admin-header">
      <div>
        <h1>Remisiones</h1>
        <p>${dispatched.length} despacho(s) · ${delivered.length} entregado(s)</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button onclick="abrirRemisionManual()" style="background:linear-gradient(135deg,#5B8DEF,#2F62D4);color:#FFFFFF;border:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px"><span class="material-icons" style="font-size:16px">add</span> Nueva Remisión</button>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card" style="--stat-color:#2F62D4">
        <div class="stat-card-top"><div class="slbl">Despachos</div><span class="material-icons stat-kpi-icon" style="color:#2F62D4">local_shipping</span></div>
        <div class="sval" style="color:#1E47A0">${dispatched.length}</div>
        <div class="sdelta">Remisiones generadas</div>
      </div>
      <div class="stat-card" style="--stat-color:#D97706">
        <div class="stat-card-top"><div class="slbl">En ruta</div><span class="material-icons stat-kpi-icon" style="color:#D97706">pending</span></div>
        <div class="sval" style="color:#B45309">${dispatched.filter(o => o.status === 'dispatched').length}</div>
        <div class="sdelta">Pendientes de entrega</div>
      </div>
      <div class="stat-card" style="--stat-color:#16A34A">
        <div class="stat-card-top"><div class="slbl">Entregados</div><span class="material-icons stat-kpi-icon" style="color:#16A34A">task_alt</span></div>
        <div class="sval" style="color:#15803D">${delivered.length}</div>
        <div class="sdelta up">Confirmados por el cliente</div>
      </div>
      <div class="stat-card" style="--stat-color:#1E47A0">
        <div class="stat-card-top"><div class="slbl">Unidades despachadas</div><span class="material-icons stat-kpi-icon" style="color:#1E47A0">inventory</span></div>
        <div class="sval" style="color:#1E47A0">${fmt(unidades)}</div>
        <div class="sdelta">Productos entregados y en ruta</div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-card-head"><h3>Historial de Despachos</h3></div>
      ${buildSearchBar('Buscar remisión...')}
      ${buildDateFilter()}
      ${dispatched.length === 0
        ? '<div class="section-empty">' + (adminSearch ? 'Sin resultados' : 'No hay remisiones generadas') + '</div>'
        : `<table>
            <thead>
              <tr><th>Remisión</th><th>Cliente</th><th>Empresa</th><th>Productos</th><th>Fecha</th><th>Estado</th><th>Acción</th></tr>
            </thead>
            <tbody>
              ${dispatched.map(o => {
                const isDelivered = o.status === 'delivered';
                                return `
                  <tr>
                    <td><strong>${o.id}</strong></td>
                    <td>${_esc(o.client)}</td>
                    <td>${_esc(o.company)||'—'}</td>
                    <td>${contarUnidades(o)}</td>
                    <td>${fmtFecha(o.date)}</td>
                    <td>
                      <span class="badge ${isDelivered ? 'badge-delivered' : 'badge-dispatched'}">${isDelivered ? 'Entregado' : 'Despachado'}</span>
                            </td>
                    <td>
                      <button class="action-link" onclick="openRemision('${o.id}')">Ver →</button>
                      <button class="action-link" style="color:#1E47A0;margin-left:6px" onclick="repetirRemision('${o.id}')" title="Nueva remisión con los datos de este cliente">🔁 Repetir</button>
                      ${!isDelivered ? `<button class="action-link" style="color:#3B6D11;margin-left:6px" onclick="marcarEntregado('${o.id}')">✅ Entregado</button>` : ''}
                      ${currentUser && currentUser.rol === 'administrador' ? `
                        <button class="action-link" style="color:var(--brand-blue);margin-left:6px" onclick="editarPedido('${o.id}')">✏️ Editar</button>
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

// ── Helpers de Storage (vía Edge Function, service_role) ──────
// El navegador admin solo tiene la clave anon; no escribe ni lee
// directo el bucket privado. Sube por base64 y abre con URL firmada.
function _fileToBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload  = function() {
      var res = String(reader.result || '');
      var comma = res.indexOf(',');
      resolve(comma >= 0 ? res.slice(comma + 1) : res);
    };
    reader.onerror = function() { reject(reader.error); };
    reader.readAsDataURL(file);
  });
}

// Pide una URL firmada (TTL corto) y abre el documento en una pestaña nueva.
function abrirDocFirmado(orderId, idx) {
  var docs = deliveryDocs[orderId] || [];
  var doc  = docs[idx !== undefined ? idx : 0];
  if (!doc || !doc.path) return showAdminToast('⚠️ Documento no disponible');
  _edgePedidosAsync('storage:firmar', { bucket: SUPA_BUCKET, path: doc.path })
    .then(function(r) {
      if (r && r.url) window.open(r.url, '_blank');
      else showAdminToast('⚠️ No se pudo abrir el documento');
    })
    .catch(function() { showAdminToast('⚠️ Error abriendo el documento'); });
}

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
    _edgePedidosAsync('storage:listar', { bucket: SUPA_BUCKET, prefix: o.id })
    .then(function(files) {
      if (!Array.isArray(files)) return;
      if (files.length > 0) {
        var existing = deliveryDocs[o.id] || [];
        files.forEach(function(file) {
          if (!file.name) return;
          var path   = o.id + '/' + file.name;
          // Usar el path como fileId estable (no depende de file.id que puede ser undefined)
          var fileId = 'supa_' + path.replace(/[^a-zA-Z0-9]/g, '_');
          if (!existing.some(function(d) { return d.path === path; })) {
            // Sin URL pública: el bucket es privado, se firma al abrir.
            existing.push({ name: file.name, fileId: fileId, url: '', path: path, uploadedAt: file.created_at || '' });
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

  var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  var path     = orderId + '/' + Date.now() + '_' + safeName;

  // Subida vía Edge Function (service_role): el bucket ya no acepta anon.
  _fileToBase64(file)
  .then(function(b64) {
    return _edgePedidosAsync('storage:subir', {
      bucket:        SUPA_BUCKET,
      path:          path,
      contentBase64: b64,
      contentType:   file.type || 'application/pdf',
    });
  })
  .then(function() {
    var fileId = 'doc_' + Date.now();
    deliveryDocs[orderId] = (deliveryDocs[orderId] || []).filter(function(d) { return d.fileId !== tempId; });
    deliveryDocs[orderId].push({ name: file.name, fileId: fileId, url: '', path: path, uploadedAt: new Date().toISOString() });
    refreshSoporteCell(orderId);
    if (onDone) onDone();
  })
  .catch(function(err) {
    console.error('❌ Supabase upload FALLÓ:', err.message);
    showAdminToast('❌ Error Supabase: ' + err.message);
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
    _edgePedidosAsync('storage:borrar', { bucket: SUPA_BUCKET, path: resolvedPath })
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
  var html = '<input type="file" id="' + inputId + '" accept="application/pdf,image/*" multiple style="display:none" onchange="handlePdfInput(\'' + orderId + '\',this)">';

  if (docs.length > 0) {
    html += '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:4px">';
    docs.forEach(function(doc, idx) {
      if (doc.uploading) {
        html += '<div style="background:#FFF8E1;border:1px solid #FFD54F;border-radius:6px;padding:4px 8px;font-size:11px;color:#795548">⏳ Subiendo: ' + doc.name + '</div>';
      } else {
        var icono = /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(doc.name) ? '🖼️' : '📄';
        html += '<div style="display:flex;align-items:center;gap:5px;background:#F0FBF4;border:1px solid #C6EDD4;border-radius:6px;padding:3px 8px">'
          + '<span style="font-size:11px;color:#1D6B35;font-weight:600;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + doc.name + '">' + icono + ' ' + doc.name + '</span>'
          + '<button class="action-link" style="font-size:11px" onclick="previewDeliveryDoc(\'' + orderId + '\',' + idx + ')">👁 Ver</button>'
          + '<button class="action-link" style="font-size:11px;color:var(--brand-blue);font-weight:700;background:none;border:none;cursor:pointer" onclick="abrirDocFirmado(\'' + orderId + '\',' + idx + ')">⬇️</button>'
          + '<button class="action-link" style="color:#E53E3E;font-size:11px" onclick="removeDeliveryDoc(\'' + orderId + '\',\'' + doc.fileId + '\',\'' + (doc.path||'') + '\')">✕</button>'
          + '</div>';
      }
    });
    html += '</div>';
  }

  html += '<button onclick="document.getElementById(\'' + inputId + '\').click()" style="background:#F5F5F7;border:1.5px dashed #C0C0C5;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:600;color:#1D1D1F;cursor:pointer;font-family:inherit">'
    + (docs.length > 0 ? '➕ Agregar Soporte' : '📎 Adjuntar Soporte') + '</button>';
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
    if (f.type !== 'application/pdf' && f.type.indexOf('image/') !== 0) { errors.push(f.name + ': solo se permite PDF o imagen'); return false; }
    if (f.size > 5 * 1024 * 1024)    { errors.push(f.name + ': supera 5MB'); return false; }
    return true;
  });
  if (errors.length) showAdminToast('⚠️ ' + errors.join(' | '));
  if (!toUpload.length) return;
  showAdminToast('⏫ Subiendo ' + toUpload.length + ' soporte(s)...');
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

  _edgePedidosAsync('storage:borrar', { bucket: SUPA_BUCKET, path: resolvedPath })
  .then(function() {
    if (deliveryDocs[orderId]) {
      deliveryDocs[orderId] = deliveryDocs[orderId].filter(function(d) { return d.fileId !== fileId; });
    }
    deliveryDocsLoaded = false;
    refreshSoporteCell(orderId);
    showAdminToast('🗑 Soporte eliminado correctamente');
  })
  .catch(function(err) {
    console.error('❌ DELETE error:', err);
    showAdminToast('❌ Error al eliminar el soporte');
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
    card.style.cssText = 'background:#FFFFFF;border-radius:16px;padding:28px;min-width:320px;max-width:480px;width:90%;border:1px solid rgba(47,98,212,0.25)';
    var h3 = document.createElement('h3');
    h3.style.cssText = 'color:#0F172A;font-size:16px;font-weight:700;margin:0 0 16px;font-family:\'Space Grotesk\',Outfit,sans-serif';
    h3.textContent = '📄 Seleccionar soporte';
    card.appendChild(h3);
    docs.forEach(function(d, i) {
      var btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;background:#fff;border:1px solid rgba(47,98,212,0.30);border-radius:10px;padding:12px 14px;margin-bottom:8px;color:#1A1A2E;font-size:13px;font-weight:600;cursor:pointer;font-family:Outfit,sans-serif;text-align:left';
      btn.innerHTML = '<span style="font-size:18px">📄</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + d.name + '</span><span style="color:#2F62D4;font-size:12px">Abrir →</span>';
      btn.onclick = function() { modal.remove(); abrirDocFirmado(orderId, i); };
      card.appendChild(btn);
    });
    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'width:100%;margin-top:8px;background:transparent;border:1px solid #E8EAF0;border-radius:10px;padding:10px;color:#6B7280;font-size:13px;cursor:pointer;font-family:Outfit,sans-serif';
    closeBtn.textContent = 'Cancelar';
    closeBtn.onclick = function() { modal.remove(); };
    card.appendChild(closeBtn);
    modal.appendChild(card);
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
    return;
  }
  abrirDocFirmado(orderId, idx !== undefined ? idx : 0);
}

// Celda de entrega: cuándo se entregó y cuánto tardó desde que se creó la
// remisión. Antes solo se guardaba la fecha de creación, así que no había
// forma de responder a "¿cuánto tardamos?".
function _celdaEntrega(o) {
  if (!o.entregadoEn) return '<span style="color:var(--text-soft)">—</span>';
  var entrega = new Date(o.entregadoEn);
  if (isNaN(entrega.getTime())) return '<span style="color:var(--text-soft)">—</span>';

  var texto = entrega.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  var salida = parseOrderDate(o);
  var dias = null;
  if (salida && !isNaN(salida.getTime())) {
    dias = Math.round((entrega - salida) / 86400000);
    if (dias < 0) dias = null;
  }

  var color = dias === null ? 'var(--text-soft)' : dias <= 1 ? '#3B6D11' : dias <= 3 ? '#B45309' : '#A32D2D';
  return texto + (dias === null ? ''
    : '<br><small style="color:' + color + ';font-weight:700">'
      + (dias === 0 ? 'mismo día' : dias === 1 ? '1 día' : dias + ' días') + '</small>');
}

function renderEntregados() {
  var all       = filterOrders(orders || []);
  var delivered = all.filter(function(o) { return o.status === 'delivered'; });

  loadAllDeliveryDocs();

  var html = '<div class="admin-header"><div>'
    + '<h1 class="admin-title">Entregados</h1>'
    + '<p class="admin-subtitle">' + delivered.length + ' remisión(es) entregada(s)</p>'
    + '</div></div>';

  if (delivered.length === 0) {
    html += '<div class="section-card"><div style="text-align:center;padding:48px;color:var(--text-soft)">'
      + '<div style="font-size:48px;margin-bottom:16px">📦</div>'
      + '<h3 style="font-size:18px;font-weight:700;margin-bottom:8px">No hay remisiones entregadas aún</h3>'
      + '<p>Marca una remisión como entregada desde Remisiones.</p>'
      + '</div></div>';
    return html;
  }

  html += '<div class="section-card" style="overflow-x:auto"><table class="admin-table"><thead><tr>'
    + '<th>N° Remisión</th><th>Cliente</th><th>Empresa</th><th>Productos</th>'
    + '<th>Despacho</th><th>Entrega</th><th>Soportes PDF</th><th>Acciones</th>'
    + '</tr></thead><tbody>';

  delivered.forEach(function(o) {
    html += '<tr>'
      + '<td><strong>' + o.id + '</strong></td>'
      + '<td>' + (_esc(o.client) || '—') + (o.email ? '<br><span style="font-size:11px;color:var(--text-soft)">' + _esc(o.email) + '</span>' : '') + '</td>'
      + '<td>' + (_esc(o.company) || '—') + '</td>'
      + '<td style="color:var(--brand-blue);font-weight:700">' + contarUnidades(o) + '</td>'
      + '<td>' + (o.date ? fmtFecha(o.date) : '—') + '</td>'
      + '<td>' + _celdaEntrega(o) + '</td>'
      + '<td id="soporte-cell-' + o.id + '">' + renderSoporteCell(o.id) + '</td>'
      + '<td>'
      + '<button class="action-link" style="color:#1E47A0;margin-right:8px" onclick="repetirRemision(\'' + o.id + '\')" title="Nueva remisión con los datos de este cliente">🔁 Repetir</button>'
      + '<button id="btn-notif-' + o.id + '" onclick="notificarEntregaCliente(\'' + o.id + '\', event)" style="display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#059669,#10B981);color:#fff;border:none;border-radius:10px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(16,185,129,0.35);letter-spacing:0.3px;transition:opacity 0.2s" onmouseover="this.style.opacity=\'0.85\'" onmouseout="this.style.opacity=\'1\'"><span class="material-icons" style="font-size:15px">mark_email_read</span>Notificar</button>'
      + (currentUser && currentUser.rol === 'administrador'
          ? '<br><button class="action-link" style="color:var(--brand-blue);font-size:11px;margin-top:4px" onclick="editarPedido(\'' + o.id + '\')">✏️ Editar</button>'
            + '<button class="action-link" style="color:#E53E3E;font-size:11px;margin-top:4px;margin-left:8px" onclick="eliminarPedido(\'' + o.id + '\')">🗑 Eliminar</button>'
          : '')
      + '</td>'
      + '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}


// ── Panel de cotización ────────────────────────

function openQuotePanel(orderId) {
  currentOrderId = orderId;
  const o = orders.find(x => x.id === orderId);
  document.getElementById('quote-modal-title').textContent = 'Cotizar ' + orderId;
  document.getElementById('quote-modal-sub').textContent   = 'Cliente: ' + o.client + ' — ' + o.email;

  const rowsHtml = o.items.map(function(item, idx) {
    return '<div class="quote-item-card" id="qrow-' + idx + '">'
      + '<div class="quote-item-info">'
        + '<span class="material-icons quote-item-icon">inventory_2</span>'
        + '<div>'
          + '<div class="quote-item-name">' + _esc(item.name) + '</div>'
          + '<div class="quote-item-qty"><span class="material-icons" style="font-size:14px;vertical-align:middle">shopping_cart</span> Cantidad: <strong>' + item.qty + '</strong></div>'
        + '</div>'
      + '</div>'
      + '<div class="quote-item-price">'
        + '<label>Precio unit. (sin IVA)</label>'
        + '<div class="quote-price-input-wrap">'
          + '<span class="material-icons">attach_money</span>'
          + '<input class="price-input" type="number" min="0" placeholder="0" value="' + (item.price || '') + '" oninput="updateQuoteRow(' + idx + ', this.value, \'' + orderId + '\')">'
        + '</div>'
      + '</div>'
      + '<div class="quote-item-sub" id="qsub-' + idx + '">'
        + '<span class="material-icons" style="font-size:14px;color:#B0B4C0">calculate</span>'
        + '<span>—</span>'
      + '</div>'
    + '</div>';
  }).join('');

  document.getElementById('quote-modal-body').innerHTML = ''
    + '<div class="quote-hint"><span class="material-icons">tips_and_updates</span> Asigna el precio unitario sin IVA. El sistema calcula el total automáticamente.</div>'
    + '<div class="quote-items-list">' + rowsHtml + '</div>'
    + '<div class="quote-totals">'
      + '<div class="quote-total-row"><span class="material-icons">receipt</span><span class="ql">Subtotal</span><span class="qv" id="q-sub">$0</span></div>'
      + '<div class="quote-total-row"><span class="material-icons">percent</span><span class="ql">IVA (19%)</span><span class="qv" id="q-iva">$0</span></div>'
      + '<div class="quote-total-row big"><span class="material-icons">payments</span><span>TOTAL</span><span class="qv" id="q-total">$0</span></div>'
    + '</div>'
    + '<div class="quote-actions">'
      + '<button class="send-quote-btn" onclick="sendQuote(\'' + orderId + '\')">'
        + '<span class="material-icons">send</span> Enviar Remisión'
      + '</button>'
      + '<button class="quote-cancel-btn" onclick="closeModal(\'quote-modal\')">'
        + '<span class="material-icons">close</span> Cancelar'
      + '</button>'
    + '</div>';

  o.items.forEach(function(_, idx) {
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


//NOTIFICACION DE ENTREGA AL CLIENTE


// Adivina el content-type de un soporte (PDF o imagen) por su extensión,
// ya que deliveryDocs no guarda el tipo original, solo el nombre.
function _mimePorNombre(name) {
  var ext = String(name || '').split('.').pop().toLowerCase();
  var map = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif' };
  return map[ext] || 'application/octet-stream';
}

// Plantilla única del correo de "producto entregado": cliente, productos
// con cantidad y observaciones (sin Empresa ni precios/totales — las
// remisiones manuales no manejan precio por producto y Empresa siempre
// duplica a Cliente).
function _buildEntregaEmailHtml(o) {
  var productosTexto = (o.items || []).map(function(i) {
    return '• ' + _esc(i.name) + ' x' + i.qty;
  }).join('\n');

  var observacionesHtml = o.notes
    ? '<tr><td style="padding:0 40px 32px"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:6px"><tr><td style="padding:20px;background:#FFFBEB;border-left:4px solid #F59E0B"><div style="font-size:10px;font-weight:700;color:#92400E;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">Observaciones</div><div style="font-size:13px;color:#475569;line-height:1.6;white-space:pre-wrap">' + _esc(o.notes) + '</div></td></tr></table></td></tr>'
    : '';

  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Pedido Entregado</title></head><body style="margin:0;padding:0;background:#F5F7FA;font-family:\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:40px 0"><tr><td align="center"><table width="650" cellpadding="0" cellspacing="0" style="max-width:650px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)"><tr><td style="background:#065F46;padding:0"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 40px;width:60%"><div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;margin-bottom:4px">Distribuciones Estratégicas</div><div style="font-size:11px;font-weight:600;color:#A7F3D0;letter-spacing:1.8px;text-transform:uppercase">de la Costa S.A.S</div></td><td align="right" style="padding:32px 40px;width:40%"><table cellpadding="0" cellspacing="0" style="float:right"><tr><td style="background:rgba(255,255,255,0.95);border-radius:6px;padding:12px 24px;box-shadow:0 2px 8px rgba(0,0,0,0.15)"><div style="font-size:9px;font-weight:700;color:#64748B;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px">ENTREGADO</div><div style="font-size:18px;font-weight:800;color:#065F46;letter-spacing:-0.3px">#' + o.id + '</div></td></tr></table></td></tr></table></td></tr><tr><td style="height:4px;background:linear-gradient(90deg,#059669,#10B981,#34D399)"></td></tr><tr><td style="padding:48px 40px 32px"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="80" align="center" valign="top"><table width="70" height="70" cellpadding="0" cellspacing="0" style="background:#10B981;border-radius:50%"><tr><td align="center" valign="middle"><span style="font-size:36px;line-height:1;color:#fff">✓</span></td></tr></table></td><td style="padding-left:24px"><h1 style="margin:0 0 12px;font-size:28px;font-weight:700;color:#065F46;letter-spacing:-0.5px;line-height:1.2">¡Pedido Entregado!</h1><div style="font-size:15px;color:#475569;line-height:1.6">¡Hola <strong>' + _esc(o.client || 'Cliente') + '</strong>! Tu pedido #<strong>' + o.id + '</strong> ha sido entregado con éxito. 📦</div><p style="margin:12px 0 0;font-size:14px;color:#64748B;line-height:1.6">Gracias por confiar en nosotros. Esperamos que disfrutes de tus productos.</p></td></tr></table></td></tr><tr><td style="padding:0 40px 32px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#ECFDF5;border-left:4px solid #10B981;border-radius:6px"><tr><td style="padding:20px 24px"><div style="font-size:10px;font-weight:700;color:#047857;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:16px">✅ Información del Cliente</div><div style="font-size:11px;color:#64748B;margin-bottom:4px;font-weight:600">Cliente</div><div style="font-size:16px;font-weight:700;color:#0F172A">' + _esc(o.client || 'Cliente') + '</div></td></tr></table></td></tr><tr><td style="padding:0 40px 32px"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:6px;overflow:hidden"><tr><td style="background:linear-gradient(135deg,#065F46,#10B981);padding:16px 20px;border-bottom:3px solid #A7F3D0"><span style="font-size:11px;font-weight:800;color:#ffffff;letter-spacing:1.5px;text-transform:uppercase">📦 PRODUCTOS ENTREGADOS</span></td></tr><tr><td style="padding:24px 20px;background:#ffffff"><div style="font-size:14px;color:#1E293B;line-height:2;white-space:pre-line;font-family:\'Courier New\',monospace">' + productosTexto + '</div></td></tr></table></td></tr>'
    + observacionesHtml
    + '<tr><td style="padding:0 40px 40px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#ECFDF5;border:2px solid #10B981;border-radius:6px"><tr><td style="padding:32px;text-align:center"><p style="margin:0;font-size:14px;color:#065F46;line-height:1.7;font-weight:600">¡Gracias por tu compra! Si tienes alguna pregunta, no dudes en contactarnos. ¡Esperamos verte pronto! 🎉</p></td></tr></table></td></tr><tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:32px 40px"><table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px"><tr><td style="text-align:center"><div style="font-size:15px;font-weight:700;color:#0F172A;margin-bottom:12px">Distribuciones Estratégicas de la Costa S.A.S</div><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:6px 0;font-size:13px;color:#64748B;text-align:center"><strong style="color:#475569">📞 Teléfono:</strong> (57) 302 354 8415</td></tr><tr><td style="padding:6px 0;font-size:13px;color:#64748B;text-align:center"><strong style="color:#475569">💬 WhatsApp:</strong> (57) 302 354 8415</td></tr><tr><td style="padding:6px 0;font-size:13px;color:#64748B;text-align:center"><strong style="color:#475569">✉️ Email:</strong> distribucionesestrategicasco@gmail.com</td></tr><tr><td style="padding:6px 0;font-size:13px;color:#64748B;text-align:center"><strong style="color:#475569">📍 Ubicación:</strong> Barranquilla, Colombia</td></tr></table></td></tr></table><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #E2E8F0;padding-top:16px;text-align:center"><p style="margin:0;font-size:11px;color:#94A3B8;line-height:1.6">Este correo electrónico fue generado automáticamente por nuestro sistema.<br>Por favor, no responda directamente a este mensaje.</p></td></tr></table></td></tr></table></td></tr></table></body></html>';
}

function notificarEntregaCliente(orderId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  var btn = (event && event.currentTarget) ? event.currentTarget : document.getElementById('btn-notif-' + orderId);
  var o = orders.find(function(x) { return x.id === orderId; });
  if (!o || !o.email) {
    showAdminToast('⚠️ Esta remisión no tiene email registrado.');
    return;
  }

  // Estado: enviando
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons" style="font-size:15px;animation:dlcSpin 0.7s linear infinite">sync</span> Enviando…';
    btn.style.background = 'linear-gradient(135deg,#6B7280,#9CA3AF)';
    btn.style.boxShadow = 'none';
    btn.style.cursor = 'not-allowed';
    btn.style.opacity = '1';
  }

  var docs = deliveryDocs[orderId] || [];

  var pdfPromises = docs.map(function(doc) {
    return _edgePedidosAsync('storage:firmar', { bucket: SUPA_BUCKET, path: doc.path })
      .then(function(s) { if (!s || !s.url) throw new Error('sin url'); return fetch(s.url); })
      .then(function(r) { return r.arrayBuffer(); })
      .then(function(buf) {
        var bytes = new Uint8Array(buf);
        var binary = '';
        for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return {
          content: btoa(binary),
          filename: doc.name,
          type: _mimePorNombre(doc.name)
        };
      })
      .catch(function() { return null; });
  });

  Promise.all(pdfPromises).then(function(attachments) {
    var validAttachments = attachments.filter(function(a) { return a !== null; });

    var htmlContent = _buildEntregaEmailHtml(o);

    // Envío vía Edge Function (sesión + secreto). El navegador ya no llama
    // al Apps Script directamente (antes era un relay abierto).
    _edgePedidosAsync('email:entrega', {
      orderId: o.id,
      to: o.email,
      subject: '¡Remisión Entregada! ' + o.id + ' - Distribuciones Estratégicas',
      htmlContent: htmlContent,
      attachments: validAttachments
    })
    .then(function() {
      showAdminToast('✅ Email enviado a ' + o.email);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons" style="font-size:15px">check_circle</span> Enviado';
        btn.style.background = 'linear-gradient(135deg,#065F46,#059669)';
        btn.style.boxShadow = '0 2px 8px rgba(6,95,70,0.35)';
        btn.style.cursor = 'pointer';
        // Restaurar tras 4 s
        setTimeout(function() {
          if (btn) {
            btn.innerHTML = '<span class="material-icons" style="font-size:15px">mark_email_read</span> Notificar';
            btn.style.background = 'linear-gradient(135deg,#059669,#10B981)';
            btn.style.boxShadow = '0 2px 8px rgba(16,185,129,0.35)';
          }
        }, 4000);
      }
    })
    .catch(function(err) {
      console.error('Error:', err);
      showAdminToast('❌ Error al enviar email');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons" style="font-size:15px">mark_email_read</span> Notificar';
        btn.style.background = 'linear-gradient(135deg,#059669,#10B981)';
        btn.style.boxShadow = '0 2px 8px rgba(16,185,129,0.35)';
        btn.style.cursor = 'pointer';
      }
    });
  });
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

  const approvalLink = 'https://distribucionesestrategicasco-dev.github.io/distribucionesl/seguimiento.html'
    + '?id=' + encodeURIComponent(orderId);

  const trackLink = 'seguimiento.html?id=' + encodeURIComponent(orderId);

  emailjs.send(EMAILJS_SERVICE, EMAILJS_CLIENT_T, {
    to_email:      o.email,
    to_name:       o.client || 'Cliente',
    order_id:      orderId,
    cliente:       o.client || 'Cliente',
    empresa:       o.company || o.client || 'N/A',
    productos:     productosTexto,
    subtotal:      fmt(sub),
    iva:           fmt(iva),
    total:         '$' + fmt(total),
    track_link:    trackLink,
    
    // ========================================
    // DISEÑO AZUL PARA COTIZACIÓN
    // ========================================
    asunto:              'Remisión ' + orderId + ' - Distribuciones Estratégicas',
    color_header:        '#1E3A8A',
    color_badge:         '#93C5FD',
    color_franja:        'linear-gradient(90deg, #1E3A8A, #3B82F6, #60A5FA)',
    badge_text:          'COTIZACIÓN',
    
    estilo_icono:        'width:90px;height:90px;background:linear-gradient(135deg,#3B82F6,#1E40AF);border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(59,130,246,0.4);border:4px solid #DBEAFE',
    icono:               '💰',
    tamano_icono:        '42px',
    
    titulo:              '¡Nueva Remisión!',
    tamano_titulo:       '30px',
    color_titulo:        '#1E3A8A',
    mensaje_principal:   'Hola <strong>' + _esc(o.client || 'Cliente') + '</strong>, hemos preparado tu remisión.',
    mensaje_secundario:  'Revisa los detalles a continuación y autorízala para proceder con el despacho.',
    
    color_fondo_cliente: '#EFF6FF',
    color_borde_cliente: '#BFDBFE',
    color_label_cliente: '#1E40AF',
    emoji_cliente:       '👤',
    
    color_header_tabla:  'linear-gradient(135deg, #1E3A8A, #2563EB)',
    color_borde_tabla:   '#BFDBFE',
    emoji_productos:     '📋',
    titulo_productos:    'PRODUCTOS COTIZADOS',
    color_total_fondo:   'linear-gradient(135deg, #1E3A8A, #2563EB)',
    
    color_cta_fondo:     '#EFF6FF',
    color_cta_borde:     '#3B82F6',
    color_cta_texto:     '#1E40AF',
    mensaje_final:       'Si estás de acuerdo con la remisión, haz clic en el botón para autorizarla y procederemos con el despacho inmediato.',
    approval_link: '<a href="' + approvalLink + '" style="display:inline-block;background:#1E3A8A;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:6px;letter-spacing:0.3px;box-shadow:0 2px 8px rgba(30,58,138,0.3);text-transform:uppercase;border:none">✅ AUTORIZAR</a>'

  })
  .then(function() {
    // Se guarda ANTES de anunciar nada. Antes el correo salía primero y el
    // guardado iba sin esperar: el cliente recibía una cotización de una
    // remisión que en la base seguía pendiente.
    return updateOrderTotals(orderId, sub, iva, total)
      .then(function() { return cambiarEstadoPedido(orderId, 'quoted', { silencioso: true }); });
  })
  .then(function(ok) {
    if (!ok) {
      if (btn) { btn.disabled = false; btn.textContent = '📧 Enviar Remisión al Cliente'; }
      return;
    }
    o.sheetSubtotal = sub;
    o.sheetIva      = iva;
    o.sheetTotal    = total;
    closeModal('quote-modal');
    renderLocalSection();
    showAdminToast('✅ Remisión ' + orderId + ' enviada a ' + o.email);
  })
  .catch(function(err) {
    console.error('Error enviando la remisión:', err);
    if (btn) { btn.disabled = false; btn.textContent = '📧 Enviar Remisión al Cliente'; }
    showAdminToast('❌ ' + String((err && err.message) || 'No se pudo enviar la remisión').substring(0, 140));
  });
}

// Aprobación registrada desde el panel, para cuando el cliente confirma por
// teléfono o WhatsApp — el canal que se usa de verdad. Antes solo existía la
// aprobación del propio cliente en seguimiento.html, así que esas
// confirmaciones no tenían forma de entrar al sistema.
function aprobarManualmente(orderId) {
  const o = orders.find(x => x.id === orderId);
  if (!o) return;

  const motivo = prompt(
    'Aprobación manual de ' + orderId + '\n\n' +
    '¿Cómo confirmó el cliente? (ej: "Por WhatsApp con Juan Pérez")'
  );
  if (motivo === null) return; // cancelado
  const detalle = motivo.trim();
  if (!detalle) { showAdminToast('⚠️ Escribe cómo confirmó el cliente'); return; }

  const sello = '[Aprobada manualmente el ' + new Date().toLocaleDateString('es-CO') +
                ' por ' + (currentUser ? currentUser.username : 'sistema') + ': ' + detalle + ']';
  const notas = (o.notes ? o.notes + '\n' : '') + sello;

  cambiarEstadoPedido(orderId, 'approved', {
    campos: { notes: notas },
    exito:  '✅ Remisión ' + orderId + ' aprobada',
  }).then(function(ok) {
    if (!ok) return;
    o.notes = notas;
    renderLocalSection();
  });
}

// ── Remisión ───────────────────────────────────
// El consecutivo lo asigna crear_remision_manual dentro de la transacción.
// Aquí había un _nextRemisionNum() que lo pedía por adelantado: ese era el
// origen de las colisiones de número entre operarios simultáneos.

// QR con el enlace de seguimiento del pedido. La página ya existe y el RPC
// solo devuelve datos no sensibles, pero nadie la usaba porque nadie conocía
// la URL; impresa en el documento, el cliente escanea y ve el estado.
// Se genera como imagen incrustada (data URI) para que el PDF no dependa de
// ninguna descarga externa, igual que la firma y el logo.
function _qrSeguimiento(remNum) {
  if (!remNum || typeof qrcode !== 'function') return '';
  try {
    var url = 'https://distcosta.com/seguimiento.html?id=' + encodeURIComponent(remNum);
    var qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    return '<div style="margin-top:10px;display:flex;flex-direction:column;align-items:flex-end;gap:3px">'
      + '<img src="' + qr.createDataURL(3, 0) + '" alt="Seguimiento ' + _esc(remNum) + '" '
      +   'style="width:62px;height:62px;image-rendering:pixelated;border:1px solid #E5E9F0;padding:3px;background:#fff">'
      + '<div style="font-size:7px;color:#94A3B8;letter-spacing:0.6px;text-transform:uppercase">Consulta tu entrega</div>'
      + '</div>';
  } catch (e) {
    console.warn('QR de seguimiento:', e);
    return '';
  }
}

function _buildRemisionHTML(datos) {
  var remNum=datos.remNum,orderId=datos.orderId,today=datos.today,logo=datos.logo;
  var cliente=datos.cliente,empresa=datos.empresa,nit=datos.nit,email=datos.email;
  var telefono=datos.telefono,ciudad=datos.ciudad,notas=datos.notas,items=datos.items;
  var direccion=datos.direccion||'';
  var mostrarPrecios=datos.mostrarPrecios,mostrarTotales=datos.mostrarTotales;
  var sub=items.reduce(function(s,i){return s+(i.qty*(i.price||0));},0);
  var iva=sub*0.19,total=sub+iva;
  var DISP='font-family:\'Space Grotesk\',\'Plus Jakarta Sans\',Arial,sans-serif';
  var SEC='font-size:9.5px;font-weight:700;color:#2F62D4;text-transform:uppercase;letter-spacing:2.5px';
  var L='font-size:8.5px;color:#94A3B8;text-transform:uppercase;letter-spacing:1.2px;font-weight:700;margin-bottom:3px';
  var V='font-size:13px;font-weight:600;color:#1E2A44;line-height:1.35';
  function pair(lbl,val){return '<div style="display:flex;align-items:baseline;gap:14px;padding:7px 0;border-bottom:1px solid #F1F4F9"><span style="'+L+';width:96px;flex:none;margin:0">'+lbl+'</span><span style="'+V+';flex:1">'+(val||'&mdash;')+'</span></div>';}
  function th(t,extra){return '<th style="padding:0 8px 9px 0;font-size:8.5px;font-weight:700;color:#94A3B8;letter-spacing:1.3px;text-transform:uppercase;border-bottom:1.5px solid #1E2A44;'+(extra||'text-align:left')+'">'+t+'</th>';}
  var filas=items.map(function(item,i){
    var sub2=item.qty*(item.price||0);
    return '<tr>'
      +'<td style="padding:11px 8px 11px 0;font-size:11px;color:#CBD5E1;border-bottom:1px solid #EEF2F7;'+DISP+';width:26px">'+(i+1<10?'0':'')+(i+1)+'</td>'
      +'<td style="padding:11px 8px;font-size:13px;font-weight:600;color:#1E2A44;border-bottom:1px solid #EEF2F7">'+_esc(item.name)+'</td>'
      +'<td style="padding:11px 8px;font-size:14px;font-weight:700;color:#2F62D4;text-align:center;border-bottom:1px solid #EEF2F7;'+DISP+';width:56px">'+item.qty+'</td>'
      +(mostrarPrecios?'<td style="padding:11px 8px;font-size:12px;color:#64748B;text-align:right;border-bottom:1px solid #EEF2F7;width:90px">$'+fmt(item.price||0)+'</td>':'')
      +(mostrarPrecios?'<td style="padding:11px 8px;font-size:12px;font-weight:700;text-align:right;border-bottom:1px solid #EEF2F7;color:#1E2A44;'+DISP+';width:96px">$'+fmt(sub2)+'</td>':'')
      +'<td style="padding:11px 0 11px 8px;border-bottom:1px solid #EEF2F7;text-align:right;width:62px"><div style="width:15px;height:15px;border:1.5px solid #CBD5E1;border-radius:4px;display:inline-block"></div></td>'
    +'</tr>';
  }).join('');
  return '<div id="remision-print" style="font-family:\'Plus Jakarta Sans\',\'DM Sans\',Arial,sans-serif;background:#FFFFFF;font-size:13px;color:#1E2A44;padding:10px 8px">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;flex-wrap:wrap">'
      +'<div style="display:flex;align-items:center;gap:13px">'+logo
        +'<div><div style="'+DISP+';font-size:18px;font-weight:700;letter-spacing:-0.3px;color:#1E2A44;line-height:1.1">Distribuciones Estratégicas</div>'
        +'<div style="font-size:8.5px;font-weight:700;color:#2F62D4;letter-spacing:3px;text-transform:uppercase;margin-top:3px">de la Costa S.A.S</div>'
        +'<div style="font-size:8.5px;color:#94A3B8;margin-top:7px;line-height:1.6">NIT 901.445.281-1 &nbsp;·&nbsp; (57) 302 354 8415<br>distribucionesestrategicasco@gmail.com</div>'
      +'</div></div>'
      +'<div style="text-align:right">'
        +'<div style="'+SEC+';margin-bottom:6px">Remisión de Despacho</div>'
        +'<div style="'+DISP+';color:#1E2A44;font-size:23px;font-weight:700;letter-spacing:-0.5px;line-height:1;white-space:nowrap">N° '+remNum+'</div>'
        +'<div style="color:#94A3B8;font-size:10px;margin-top:7px">'+today+'</div>'
        +_qrSeguimiento(remNum)
      +'</div>'
    +'</div>'
    +'<div style="height:2px;background:#1E2A44;margin:18px 0 0"></div>'
    +'<div style="height:1px;background:#E5E9F0;margin:2px 0 22px"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:24px">'
      +'<div>'
        +'<div style="'+SEC+';margin-bottom:14px">Emitido a</div>'
        +pair('Cliente',_esc(cliente))
        +pair('NIT / CC',_esc(nit))
        +pair('Teléfono',_esc(telefono))
      +'</div>'
      +'<div>'
        +'<div style="'+SEC+';margin-bottom:14px">Entrega</div>'
        +pair('Ciudad',_esc(ciudad))
        // El destino tiene su propia linea: antes acababa escrito dentro de
        // las observaciones y el repartidor lo leia entre otras notas.
        +(direccion?pair('Dirección',_esc(direccion)):'')
        +pair('Fecha',today)
        +pair('Orden ref.',orderId?_esc(orderId):'&mdash;')
        +pair('Email',_esc(email))
      +'</div>'
    +'</div>'
    +'<div style="'+SEC+';margin-bottom:10px">Productos a Despachar</div>'
    +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
      +'<thead><tr>'
        +th('#','text-align:left;width:26px')
        +th('Descripción','text-align:left')
        +th('Cant.','text-align:center;width:56px')
        +(mostrarPrecios?th('V. Unit.','text-align:right;width:90px'):'')
        +(mostrarPrecios?th('Total','text-align:right;width:96px'):'')
        +th('Recibido','text-align:right;width:62px')
      +'</tr></thead><tbody>'+filas+'</tbody></table>'
    +(mostrarTotales&&sub>0?'<div class="totales-block" style="display:flex;justify-content:flex-end;margin-top:18px;break-inside:avoid;page-break-inside:avoid"><div style="min-width:260px">'
        +'<div style="display:flex;justify-content:space-between;font-size:11.5px;color:#94A3B8;padding:4px 0"><span>Subtotal</span><span style="color:#475569;'+DISP+'">$'+fmt(sub)+'</span></div>'
        +'<div style="display:flex;justify-content:space-between;font-size:11.5px;color:#94A3B8;padding:4px 0 10px;border-bottom:1px solid #E5E9F0"><span>IVA (19%)</span><span style="color:#475569;'+DISP+'">$'+fmt(iva)+'</span></div>'
        +'<div style="display:flex;justify-content:space-between;align-items:baseline;padding:12px 0 0"><span style="'+SEC+'">Total</span><span style="'+DISP+';font-size:24px;font-weight:700;color:#1E2A44;letter-spacing:-0.5px">$'+fmt(total)+'</span></div>'
      +'</div></div>':'')
    +(notas?'<div style="margin-top:22px;padding-left:14px;border-left:2px solid #2F62D4">'
        +'<div style="'+SEC+';margin-bottom:5px">Observaciones</div>'
        +'<div style="font-size:12px;color:#475569;line-height:1.55;white-space:pre-wrap">'+_esc(notas)+'</div></div>':'')
    +'<div class="firmas-block" style="display:grid;grid-template-columns:1fr 1fr;gap:48px;padding-top:44px;break-inside:avoid;page-break-inside:avoid">'
      +'<div>'
        +'<div style="height:56px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">'
          +(typeof FIRMA_EMPRESA!="undefined"&&FIRMA_EMPRESA?'<img src="'+FIRMA_EMPRESA+'" style="max-height:54px;max-width:80%;object-fit:contain">':'')
        +'</div>'
        +'<div style="border-top:1.5px solid #1E2A44;padding-top:7px"><div style="'+SEC+'">Despachado por</div><div style="font-size:10px;color:#94A3B8;margin-top:3px">Distribuciones Estratégicas de la Costa S.A.S</div></div>'
      +'</div>'
      +'<div>'
        +'<div style="height:56px"></div>'
        +'<div style="border-top:1.5px solid #1E2A44;padding-top:7px"><div style="'+SEC+'">Recibí conforme</div><div style="font-size:10px;color:#94A3B8;margin-top:3px">Nombre &middot; C.C. &middot; Sello</div></div>'
      +'</div>'
    +'</div>'
    +'<div style="margin-top:26px;padding-top:12px;border-top:1px solid #E5E9F0">'
      +'<div style="font-size:8.5px;color:#94A3B8">Documento sin valor fiscal &middot; Generado el '+today+'</div>'
    +'</div></div>';
}

async function openRemision(orderId) {
  const o      = orders.find(x => x.id === orderId);
  const remNum = orderId;
  const today  = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const logo   = '<img src="' + (typeof LOGO_REMISION !== 'undefined' ? LOGO_REMISION : '') + '" alt="DLC" style="width:72px;height:auto;object-fit:contain">';

  document.getElementById('remision-body').innerHTML = _buildRemisionHTML({
    remNum: remNum,
    orderId: orderId,
    today: today,
    logo: logo,
    cliente: o.client,
    empresa: o.company || '',
    nit: o.nit || '',
    email: o.email,
    telefono: o.phone,
    ciudad: o.city || '',
    direccion: o.address || '',
    notas: o.notes || '',
    items: o.items,
    mostrarPrecios: false,
    mostrarTotales: false
  })
  + '<div style="display:flex;gap:12px;justify-content:center;padding:20px 0;flex-wrap:wrap" class="no-print">'
  + '<button onclick="doDownloadPDF(\'' + remNum + '\')" style="background:linear-gradient(135deg,#5B8DEF,#2F62D4);color:#FFFFFF;border:none;padding:12px 22px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">⬇️ Descargar PDF</button>'
  + '<button onclick="doPrint()" style="background:linear-gradient(135deg,#2F62D4,#1E47A0);color:#fff;border:none;padding:12px 22px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Imprimir</button>'
  + (navigator.share ? '<button onclick="compartirRemision()" style="background:#25D366;color:#fff;border:none;padding:12px 22px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Compartir PDF</button>' : '')
  + '<button id="btn-enviar-correo" onclick="enviarRemisionCorreo(\'' + orderId + '\')" style="background:linear-gradient(135deg,#0EA5E9,#0369A1);color:#fff;border:none;padding:12px 22px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px"><span class="material-icons" style="font-size:16px">mail</span> Enviar por Correo</button>'
  + '<button onclick="doMarkDispatched(\'' + orderId + '\')" id="btn-despachar" style="background:linear-gradient(135deg,#3B6D11,#639922);color:#fff;border:none;padding:12px 22px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">🚚 Marcar Despachado</button>'
  + '</div>';

  openModal('remision-modal');


}



// ═══════════════════════════════════════════════════════════
// FUNCIONES PARA IMPRIMIR Y DESCARGAR PDF DE REMISIONES
// ═══════════════════════════════════════════════════════════

// Hoja A4 reutilizable: impresión nativa = texto vectorial nítido,
// seleccionable y con cabecera de tabla repetida por página.
// Opciones html2pdf compartidas por descargar / imprimir / compartir,
// para que los tres produzcan exactamente el mismo documento.
function _remisionPdfOptions(filename) {
  return {
    margin: [10, 10, 10, 10],
    filename: (filename || 'Remisión') + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2, useCORS: true, logging: false,
      // Ya no hace falta compensar ningún scroll: _prepRemisionEl() rasteriza
      // una copia colocada en el origen del documento, fuera del modal fijo.
      // El ancho y los márgenes se fijan sobre esa copia, así que tampoco
      // hace falta un onclone que los reajuste.
      scrollX: 0, scrollY: 0,
    },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.totales-block', '.firmas-block'] },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
}

// Prepara el elemento (alto A4, firmas al fondo, oculta botones) y devuelve
// { element, restore }. restore() revierte los estilos al terminar.
// Ancho de la hoja al rasterizar (A4 menos márgenes, a 96 dpi).
var REMISION_ANCHO_PX = 718;

function _prepRemisionEl() {
  var original = document.getElementById('remision-print');
  if (!original) return null;

  // html2canvas calcula las coordenadas de lo que rasteriza respecto al
  // DOCUMENTO, pero la remisión vive dentro de .modal-overlay, que es
  // position:fixed y por tanto se sitúa respecto al VIEWPORT. Ese desfase
  // recortaba el PDF por arriba: se perdían el logo, el nombre de la empresa
  // y el bloque "Remisión de Despacho N° ...". Encima .modal-box tiene
  // overflow-y:auto, así que el scroll interno movía el recorte todavía más.
  //
  // En lugar de pelear con ambos, se rasteriza una COPIA colocada en flujo
  // normal en el origen del documento, donde los dos sistemas de coordenadas
  // coinciden. Va detrás del modal (z-index:-1), así que no se ve.
  var jaula = document.createElement('div');
  jaula.setAttribute('aria-hidden', 'true');
  jaula.style.cssText = 'position:absolute;top:0;left:0;z-index:-1;pointer-events:none;'
    + 'background:#FFFFFF;width:' + REMISION_ANCHO_PX + 'px';

  // Los botones viven fuera de #remision-print, así que la copia no los trae.
  var copia = original.cloneNode(true);
  copia.id = 'remision-print-pdf';
  copia.style.width = REMISION_ANCHO_PX + 'px';
  copia.style.maxWidth = REMISION_ANCHO_PX + 'px';
  // El contenido fluye natural: las firmas quedan justo debajo de los
  // productos, nunca estiradas hasta el borde de la hoja.
  copia.style.minHeight = '0';
  copia.style.paddingBottom = '6mm';
  jaula.appendChild(copia);
  document.body.appendChild(jaula);

  var scrollPagina = window.scrollY;
  window.scrollTo(0, 0);

  return {
    element: copia,
    restore: function() {
      jaula.remove();
      window.scrollTo(0, scrollPagina);
    }
  };
}

// Espera a que las fuentes web (Space Grotesk/Plus Jakarta Sans/DM Sans) terminen
// de cargar antes de rasterizar. Si no está lista a tiempo, html2canvas usa la
// fuente de respaldo (Arial) con otro ancho/alto de línea y el PDF queda con
// márgenes distintos según qué tan cacheadas tenga las fuentes cada usuario.
function _esperarFuentes() {
  if (!document.fonts || !document.fonts.ready) return Promise.resolve();
  return Promise.race([
    document.fonts.ready,
    new Promise(function(r) { setTimeout(r, 2000); })
  ]);
}

function doPrint() {
  if (typeof html2pdf === 'undefined') { showAdminToast('❌ Error: Biblioteca html2pdf no cargada'); return; }
  var ctx = _prepRemisionEl();
  if (!ctx) { showAdminToast('❌ No se encontró la remisión'); return; }
  showAdminToast('Preparando impresión...');
  _esperarFuentes().then(function() {
    html2pdf().set(_remisionPdfOptions('Remisión')).from(ctx.element).outputPdf('bloburl').then(function(url) {
      ctx.restore();
      var w = window.open(url, '_blank');
      if (!w) { showAdminToast('⚠️ Permite ventanas emergentes para imprimir'); return; }
      w.addEventListener('load', function() { setTimeout(function() { try { w.focus(); w.print(); } catch (e) {} }, 600); });
    }).catch(function() {
      ctx.restore();
      showAdminToast('Error generando PDF');
    });
  });
}

function doDownloadPDF(filename) {
  if (typeof html2pdf === 'undefined') { showAdminToast('❌ Error: Biblioteca html2pdf no cargada'); return; }
  var ctx = _prepRemisionEl();
  if (!ctx) { showAdminToast('❌ No se encontró la remisión'); return; }
  showAdminToast('Generando PDF...');
  _esperarFuentes().then(function() {
    html2pdf().set(_remisionPdfOptions(filename)).from(ctx.element).save().then(ctx.restore).catch(function() {
      ctx.restore();
      showAdminToast('Error generando PDF');
    });
  });
}

function compartirRemision() {
  if (!navigator.share) { showAdminToast('Dispositivo no soporta compartir'); return; }
  if (typeof html2pdf === 'undefined') { showAdminToast('❌ Error: Biblioteca html2pdf no cargada'); return; }
  var ctx = _prepRemisionEl();
  if (!ctx) { showAdminToast('No hay remisión para compartir'); return; }
  showAdminToast('Preparando PDF...');
  _esperarFuentes().then(function() {
    html2pdf().set(_remisionPdfOptions('Remisión')).from(ctx.element).outputPdf('blob').then(function(blob) {
      ctx.restore();
      var file = new File([blob], 'remision.pdf', { type: 'application/pdf' });
      var data = (navigator.canShare && navigator.canShare({ files: [file] }))
        ? { title: 'Remisión DLC', files: [file] }
        : { title: 'Remisión DLC', text: 'Remisión de despacho - Distribuciones Estratégicas de la Costa' };
      navigator.share(data).catch(function(e) { console.warn('share:', e); });
    }).catch(function() {
      ctx.restore();
      showAdminToast('Error generando PDF');
    });
  });
}
// Pide (opcional) un correo adicional que reciba copia de la notificación.
// El destinatario principal (el registrado en la remisión) nunca cambia.
function _pedirCorreoAdicional() {
  var input = prompt('¿Copiar esta notificación a otro correo? (opcional, deja vacío para omitir)', '');
  var cc = (input || '').trim();
  if (cc && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cc)) {
    showAdminToast('⚠️ Correo adicional inválido, se enviará solo al destinatario principal');
    return '';
  }
  return cc;
}

function enviarRemisionCorreo(orderId) {
  var o = orders.find(function(x) { return x.id === orderId; });
  if (!o || !o.email) { showAdminToast('⚠️ Esta remisión no tiene email registrado.'); return; }
  if (typeof html2pdf === 'undefined') { showAdminToast('❌ Error: Biblioteca html2pdf no cargada'); return; }

  var cc = _pedirCorreoAdicional();

  var btn = document.getElementById('btn-enviar-correo');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons" style="font-size:15px;animation:dlcSpin 0.7s linear infinite">sync</span> Enviando…';
  }

  var ctx = _prepRemisionEl();
  if (!ctx) {
    showAdminToast('❌ No se encontró la remisión');
    if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons" style="font-size:16px">mail</span> Enviar por Correo'; }
    return;
  }

  var productosTexto = (o.items || []).map(function(i) {
    return '• ' + _esc(i.name) + ' x' + i.qty;
  }).join('\n');

  _esperarFuentes().then(function() {
    return html2pdf().set(_remisionPdfOptions(orderId)).from(ctx.element).outputPdf('datauristring');
  }).then(function(dataUri) {
    ctx.restore();
    var base64 = dataUri.split(',')[1];

    var htmlContent = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Remisión de Despacho</title></head><body style="margin:0;padding:0;background:#F5F7FA;font-family:\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif">'
      + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:40px 0"><tr><td align="center">'
      + '<table width="650" cellpadding="0" cellspacing="0" style="max-width:650px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">'
      + '<tr><td style="background:#0B1220;padding:32px 40px"><div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;margin-bottom:4px">Distribuciones Estratégicas</div><div style="font-size:11px;font-weight:600;color:#7BA5F5;letter-spacing:1.8px;text-transform:uppercase">de la Costa S.A.S</div></td></tr>'
      + '<tr><td style="height:4px;background:linear-gradient(90deg,#2F62D4,#5B8DEF)"></td></tr>'
      + '<tr><td style="padding:40px 40px 24px"><h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#1E2A44;letter-spacing:-0.5px">Remisión de Despacho</h1>'
      + '<div style="font-size:15px;color:#475569;line-height:1.6">¡Hola <strong>' + _esc(o.client || 'Cliente') + '</strong>! Adjunto encontrarás la remisión <strong>N° ' + _esc(orderId) + '</strong> con el detalle de los productos despachados. 📎</div></td></tr>'
      + '<tr><td style="padding:0 40px 32px"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:6px;overflow:hidden">'
      + '<tr><td style="background:linear-gradient(135deg,#1E3A8A,#2563EB);padding:14px 20px"><span style="font-size:11px;font-weight:800;color:#ffffff;letter-spacing:1.5px;text-transform:uppercase">📦 Productos</span></td></tr>'
      + '<tr><td style="padding:20px;background:#ffffff"><div style="font-size:14px;color:#1E293B;line-height:2;white-space:pre-line;font-family:\'Courier New\',monospace">' + productosTexto + '</div></td></tr>'
      + '</table></td></tr>'
      + '<tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:28px 40px;text-align:center"><div style="font-size:13px;color:#64748B;line-height:1.6"><strong style="color:#475569">📞 Teléfono:</strong> (57) 302 354 8415 &nbsp;·&nbsp; <strong style="color:#475569">✉️ Email:</strong> distribucionesestrategicasco@gmail.com</div>'
      + '<p style="margin:16px 0 0;font-size:11px;color:#94A3B8;line-height:1.6">Este correo fue generado automáticamente por nuestro sistema. Por favor, no responda directamente a este mensaje.</p></td></tr>'
      + '</table></td></tr></table></body></html>';

    return _edgePedidosAsync('email:entrega', {
      orderId: orderId,
      to: o.email,
      cc: cc || undefined,
      subject: 'Remisión ' + orderId + ' - Distribuciones Estratégicas',
      htmlContent: htmlContent,
      attachments: [{ content: base64, filename: orderId + '.pdf', type: 'application/pdf' }]
    });
  }).then(function() {
    showAdminToast('✅ Remisión enviada por correo a ' + o.email);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons" style="font-size:15px">check_circle</span> Enviado';
      setTimeout(function() {
        if (btn) btn.innerHTML = '<span class="material-icons" style="font-size:16px">mail</span> Enviar por Correo';
      }, 4000);
    }
  }).catch(function(err) {
    ctx.restore();
    console.error('Error enviando remisión por correo:', err);
    showAdminToast('❌ Error al enviar el correo');
    if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons" style="font-size:16px">mail</span> Enviar por Correo'; }
  });
}

// Pide el soporte de entrega (foto/PDF de firma de recibido), lo sube y
// solo entonces marca la remisión como entregada y notifica al cliente
// por correo con esa evidencia adjunta.
function marcarEntregado(orderId) {
  var o = orders.find(function(x) { return x.id === orderId; });
  if (!o) return;

  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/pdf,image/*';
  input.onchange = function() {
    var file = input.files && input.files[0];
    _confirmarEntrega(orderId, file || null);
  };
  input.click();
}

function _confirmarEntrega(orderId, file) {
  var o = orders.find(function(x) { return x.id === orderId; });
  if (!o) return;
  if (!confirm('¿Confirmar que esta remisión fue entregada al cliente?')) return;

  var cc = _pedirCorreoAdicional();

  // Solo se notifica al cliente si el estado quedó realmente guardado.
  function finalizar(attachment) {
    cambiarEstadoPedido(orderId, 'delivered', {
      exito: '✅ Remisión ' + orderId + ' marcada como entregada.',
    }).then(function(ok) {
      renderLocalSection();
      if (ok) _enviarNotificacionEntrega(o, attachment, cc);
    });
  }

  if (!file) { finalizar(null); return; }

  showAdminToast('Subiendo soporte de entrega...');
  var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  var path = orderId + '/' + Date.now() + '_' + safeName;

  _fileToBase64(file).then(function(b64) {
    return _edgePedidosAsync('storage:subir', {
      bucket: SUPA_BUCKET, path: path, contentBase64: b64, contentType: file.type || 'application/pdf'
    }).then(function() {
      if (!deliveryDocs[orderId]) deliveryDocs[orderId] = [];
      deliveryDocs[orderId].push({ name: file.name, fileId: 'doc_' + Date.now(), url: '', path: path, uploadedAt: new Date().toISOString() });
      return { content: b64, filename: file.name, type: file.type || 'application/pdf' };
    });
  }).then(function(attachment) {
    finalizar(attachment);
  }).catch(function(err) {
    console.error('Error subiendo soporte de entrega:', err);
    showAdminToast('⚠️ No se pudo subir el soporte; se marcó entregado sin adjunto');
    finalizar(null);
  });
}

// Correo automático de "producto entregado": solo productos, cantidades
// y observaciones (las remisiones manuales no llevan precio por producto).
function _enviarNotificacionEntrega(o, attachment, cc) {
  if (!o.email) return;

  var htmlContent = _buildEntregaEmailHtml(o);

  _edgePedidosAsync('email:entrega', {
    orderId: o.id,
    to: o.email,
    cc: cc || undefined,
    subject: '¡Remisión Entregada! ' + o.id + ' - Distribuciones Estratégicas',
    htmlContent: htmlContent,
    attachments: attachment ? [attachment] : []
  }).then(function() {
    showAdminToast('✅ Cliente notificado por correo (' + o.email + ')');
  }).catch(function(err) {
    console.error('Error notificando entrega:', err);
    showAdminToast('⚠️ Entregado, pero no se pudo notificar por correo');
  });
}
function doMarkDispatched(orderId) {
  if (!confirm('¿Confirmar que esta remisión fue despachada?')) return;

  const order = orders.find(function(o) { return o.id === orderId; });

  // Primero se guarda; el aviso al cliente solo tiene sentido si el despacho
  // quedó registrado. Antes se abría WhatsApp aunque el guardado fallara.
  cambiarEstadoPedido(orderId, 'dispatched', {
    exito: '🚚 Remisión ' + orderId + ' marcada como despachada.',
  }).then(function(ok) {
    if (!ok) return;
    closeModal('remision-modal');
    renderLocalSection();

    if (order && order.phone) {
      const phone = order.phone.replace(/\D/g, '');
      const fullPhone = phone.startsWith('57') ? phone : '57' + phone;
      const msg = encodeURIComponent(
        '¡Hola ' + (order.client || '') + '! 🚚\n' +
        'Tu remisión *' + orderId + '* ha sido despachada y está en camino.\n' +
        'Pronto lo recibirás. ¡Gracias por confiar en Distribuciones Estratégicas! 📦'
      );
      const w = window.open('https://wa.me/' + fullPhone + '?text=' + msg, '_blank');
      // El navegador puede bloquear la pestaña: hay que decirlo, porque si no
      // el cliente se queda sin aviso y nadie se entera.
      if (!w) showAdminToast('⚠️ El navegador bloqueó WhatsApp. Avisa al cliente a mano.');
    }
  });
}

// ── Sección de Usuarios ────────────────────────

function loadUsersSection(cont) {
  _edgeUsuarios('listar', {}, function(users) {
    cont.innerHTML = renderUsuarios(users || []);
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
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div class="form-group" style="margin:0">
            <label>Usuario *</label>
            <input type="text" id="nu-user" placeholder="nombre_usuario">
          </div>
          <div class="form-group" style="margin:0">
            <label>Contraseña *</label>
            <input type="password" id="nu-pass" placeholder="••••••••">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
          <div class="form-group" style="margin:0">
            <label>Nombre completo</label>
            <input type="text" id="nu-nombre" placeholder="Nombre del usuario">
          </div>
          <div class="form-group" style="margin:0">
            <label>Email</label>
            <input type="email" id="nu-email" placeholder="correo@empresa.com">
          </div>
        </div>
        <div class="form-group" style="margin:0 0 16px;max-width:280px">
          <label>Rol</label>
          <select id="nu-rol" onchange="_toggleModulosPorRol('nu')">
            <option value="usuario">Usuario — acceso por módulos</option>
            <option value="administrador">Administrador — acceso total</option>
          </select>
        </div>
        <div class="form-group" style="margin:0 0 20px" id="nu-modulos-wrap">
          <label style="margin-bottom:10px;display:block">Acceso a módulos</label>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">
            ${ALL_MODULES.map(m => `
              <label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;transition:border-color 0.2s">
                <input type="checkbox" id="nu-mod-${m.key}" value="${m.key}" style="width:16px;height:16px;cursor:pointer;accent-color:var(--brand-cyan)">
                ${m.label}
              </label>`).join('')}
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
              <th>Usuario</th><th>Nombre</th><th>Email</th>
              <th>Módulos Asignados</th><th>Estado</th>${isAdmin ? '<th>Acciones</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${users.map(function(u) {
              const isActive  = u.activo === true || u.activo === 'true';
              const isMainAdmin = u.rol === 'administrador';
              const esYoMismo = currentUser && u.username === currentUser.username;
              const perms = parsePermisos(u.permisos);
              const modChips = isMainAdmin
                ? '<span class="badge badge-approved">Administrador Total</span>'
                : (perms.length === 0
                    ? '<span style="font-size:12px;color:#9CA3AF">Sin módulos asignados</span>'
                    : perms.map(function(p) {
                        var mod = ALL_MODULES.find(function(m) { return m.key === p; });
                        return '<span style="display:inline-block;background:#EFF6FF;color:#1D4ED8;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;margin:2px">' + (mod ? mod.label : p) + '</span>';
                      }).join(''));
              return '<tr>' +
                '<td><strong>' + u.username + '</strong></td>' +
                '<td>' + (u.nombre || '—') + '</td>' +
                '<td style="font-size:13px">' + (u.email || '—') + '</td>' +
                '<td style="max-width:260px">' + modChips + '</td>' +
                '<td><span class="badge ' + (isActive ? 'badge-approved' : 'badge-new') + '">' + (isActive ? 'Activo' : 'Inactivo') + '</span></td>' +
                // Los administradores ya se pueden editar: el servidor impide
                // dejar el sistema sin ninguno, así que ocultar el botón ya no
                // es la única defensa. Eliminarse a uno mismo sigue vetado.
                (isAdmin ? '<td style="white-space:nowrap">' +
                  '<button class="action-link" onclick="editarUsuario(\'' + u.username + '\',\'' + (u.nombre||'').replace(/'/g,"&#39;") + '\',\'' + (u.email||'') + '\',\'' + u.activo + '\',\'' + JSON.stringify(perms).replace(/"/g,'&quot;').replace(/'/g,"&#39;") + '\',\'' + (u.rol||'usuario') + '\')">Editar</button>' +
                  (esYoMismo
                    ? '<span style="font-size:12px;color:var(--text-soft);margin-left:8px">Tu cuenta</span>'
                    : '<button class="action-link" style="color:#A32D2D;margin-left:8px" onclick="eliminarUsuario(\'' + u.username + '\')">Eliminar</button>') +
                '</td>' : '') +
              '</tr>';
            }).join('')}
          </tbody>
        </table>`}
    </div>

    <!-- Modal editar usuario (módulos) -->
    <div id="edit-user-modal" style="display:none;position:fixed;inset:0;height:100vh;width:100vw;background:rgba(0,0,0,0.5);z-index:400;align-items:center;justify-content:center;padding:20px;overflow:auto;box-sizing:border-box">
      <div style="background:#fff;border-radius:16px;padding:32px;width:100%;max-width:560px;box-shadow:0 24px 80px rgba(0,0,0,0.25)">
        <h3 style="font-size:20px;font-weight:800;margin-bottom:20px">Editar Usuario</h3>
        <input type="hidden" id="eu-username">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div class="form-group" style="margin:0"><label>Nombre</label><input type="text" id="eu-nombre"></div>
          <div class="form-group" style="margin:0"><label>Email</label><input type="email" id="eu-email"></div>
        </div>
        <div class="form-group"><label>Nueva Contraseña <small style="font-weight:400;color:#9CA3AF">(dejar vacío para no cambiar; al cambiarla se cierran sus sesiones abiertas)</small></label><input type="password" id="eu-pass" placeholder="••••••••"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group"><label>Estado</label>
            <select id="eu-activo">
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>
          <div class="form-group"><label>Rol</label>
            <select id="eu-rol" onchange="_toggleModulosPorRol('eu')">
              <option value="usuario">Usuario</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:20px" id="eu-modulos-wrap">
          <label style="margin-bottom:10px;display:block">Acceso a módulos</label>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px" id="eu-modulos">
            ${ALL_MODULES.map(m =>
              '<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;font-size:14px;font-weight:500">' +
              '<input type="checkbox" id="eu-mod-' + m.key + '" value="' + m.key + '" style="width:16px;height:16px;cursor:pointer;accent-color:var(--brand-cyan)">' +
              m.label + '</label>').join('')}
          </div>
        </div>
        <div style="display:flex;gap:12px">
          <button onclick="guardarEdicionUsuario()" style="background:var(--brand-blue);color:#fff;border:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;flex:1">Guardar Cambios</button>
          <button onclick="document.getElementById('edit-user-modal').style.display='none'" style="background:var(--bg);border:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer">Cancelar</button>
        </div>
      </div>
    </div>
  `;
}

function _edgeUsuarios(action, data, onOk) {
  const session = JSON.parse(localStorage.getItem('dlc_session') || '{}');
  const token = session.token || '';
  const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';
  fetch('https://jnxsofraqshxjboukiab.supabase.co/functions/v1/admin-usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'apikey': SUPA_ANON },
    body: JSON.stringify({ action: action, data: data })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.ok) { onOk(d.data); }
    else { showAdminToast('⚠️ Error: ' + (d.error || 'desconocido')); }
  }).catch(function() { showAdminToast('⚠️ Error de conexión'); });
}


// Un administrador tiene acceso a todo, así que la lista de módulos no
// aplica: se oculta para no dar a entender que se puede recortar.
function _toggleModulosPorRol(prefijo) {
  var sel  = document.getElementById(prefijo + '-rol');
  var wrap = document.getElementById(prefijo + '-modulos-wrap');
  if (!sel || !wrap) return;
  var esAdmin = sel.value === 'administrador';
  wrap.style.display = esAdmin ? 'none' : '';
}

// permisosJson: string JSON del array de permisos actuales
function editarUsuario(username, nombre, email, activo, permisosJson, rol) {
  document.getElementById('eu-username').value = username;
  document.getElementById('eu-nombre').value   = nombre || '';
  document.getElementById('eu-email').value    = email  || '';
  document.getElementById('eu-activo').value   = activo;
  document.getElementById('eu-pass').value     = '';
  document.getElementById('eu-rol').value      = rol || 'usuario';
  _toggleModulosPorRol('eu');

  // Parsear permisos y marcar checkboxes
  var perms = [];
  try { perms = JSON.parse(permisosJson || '[]'); } catch(e) { perms = []; }
  ALL_MODULES.forEach(function(m) {
    var cb = document.getElementById('eu-mod-' + m.key);
    if (cb) cb.checked = perms.includes(m.key);
  });

  document.getElementById('edit-user-modal').style.display = 'flex';
}

function _recogerModulos(prefix) {
  return ALL_MODULES
    .filter(function(m) {
      var cb = document.getElementById(prefix + m.key);
      return cb && cb.checked;
    })
    .map(function(m) { return m.key; });
}

function crearUsuario() {
  const username = document.getElementById('nu-user').value.trim();
  const password = document.getElementById('nu-pass').value.trim();
  const nombre   = document.getElementById('nu-nombre').value.trim();
  const email    = document.getElementById('nu-email').value.trim();
  const rol      = document.getElementById('nu-rol').value;
  // Un administrador tiene acceso total: no se le asignan módulos sueltos.
  const permisos = rol === 'administrador' ? [] : _recogerModulos('nu-mod-');
  if (!username || !password) { showAdminToast('⚠️ Usuario y contraseña son obligatorios'); return; }
  if (rol === 'administrador' &&
      !confirm('Vas a crear a ' + username + ' como ADMINISTRADOR.\n\nTendrá acceso total: usuarios, catálogo, y podrá eliminar remisiones. ¿Continuar?')) return;

  _edgeUsuarios('crear', { username, password, rol, permisos, nombre, email }, function() {
    showAdminToast('✅ Usuario ' + username + ' creado');
    renderAdminSection('usuarios');
  });
}

function guardarEdicionUsuario() {
  const username = document.getElementById('eu-username').value;
  const password = document.getElementById('eu-pass').value.trim();
  const nombre   = document.getElementById('eu-nombre').value.trim();
  const email    = document.getElementById('eu-email').value.trim();
  const activo   = document.getElementById('eu-activo').value === 'true';
  // El rol se envía tal cual está en el selector. Antes iba 'usuario' fijo,
  // así que cualquier edición degradaba la cuenta sin que nadie lo pidiera.
  const rol      = document.getElementById('eu-rol').value;
  const permisos = rol === 'administrador' ? [] : _recogerModulos('eu-mod-');

  _edgeUsuarios('editar', { username, password, rol, permisos, nombre, email, activo }, function() {
    document.getElementById('edit-user-modal').style.display = 'none';
    showAdminToast('✅ Usuario ' + username + ' actualizado');
    renderAdminSection('usuarios');
  });
}

function eliminarUsuario(username) {
  if (!confirm('¿Eliminar usuario ' + username + '? Esta acción no se puede deshacer.')) return;
  _edgeUsuarios('eliminar', { username }, function() {
    showAdminToast('🗑 Usuario ' + username + ' eliminado');
    renderAdminSection('usuarios');
  });
}

// ── Perfil del usuario actual ──────────────────

function renderPerfilSection() {
  var u = window.currentUser || {};
  return `
    <div class="admin-content">
      <div class="admin-header">
        <div><h1>Mi Perfil</h1><p>Actualiza tu nombre y contraseña</p></div>
      </div>
      <div class="section-card" style="max-width:520px">
        <div class="section-card-head"><h3>Datos de la cuenta</h3></div>
        <div style="padding:28px 32px;display:flex;flex-direction:column;gap:18px">
          <div class="form-group" style="margin:0">
            <label>Usuario</label>
            <input type="text" value="${u.username || ''}" disabled style="background:var(--bg);color:var(--text-soft);cursor:not-allowed">
          </div>
          <div class="form-group" style="margin:0">
            <label>Nombre mostrado</label>
            <input type="text" id="perfil-nombre" value="${(u.nombre || '').replace(/"/g,'&quot;')}" placeholder="Tu nombre">
          </div>
          <div class="form-group" style="margin:0">
            <label>Nueva contraseña <small style="font-weight:400;color:#9CA3AF">(dejar vacío para no cambiar)</small></label>
            <div style="position:relative">
              <input type="password" id="perfil-pass" placeholder="••••••••" style="padding-right:44px">
              <button type="button" onclick="togglePerfilPass()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9CA3AF;display:flex;align-items:center">
                <span class="material-icons" id="perfil-pass-icon" style="font-size:20px">visibility</span>
              </button>
            </div>
          </div>
          <div class="form-group" style="margin:0">
            <label>Confirmar contraseña</label>
            <div style="position:relative">
              <input type="password" id="perfil-pass2" placeholder="••••••••" style="padding-right:44px">
              <button type="button" onclick="togglePerfilPass2()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9CA3AF;display:flex;align-items:center">
                <span class="material-icons" id="perfil-pass2-icon" style="font-size:20px">visibility</span>
              </button>
            </div>
          </div>
          <button onclick="guardarPerfil()" style="background:linear-gradient(135deg,var(--brand-cyan),var(--brand-blue));color:#fff;border:none;padding:13px 28px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;margin-top:4px">
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  `;
}

function togglePerfilPass() {
  var inp = document.getElementById('perfil-pass');
  var ico = document.getElementById('perfil-pass-icon');
  if (!inp) return;
  var hidden = inp.type === 'password';
  inp.type = hidden ? 'text' : 'password';
  if (ico) ico.textContent = hidden ? 'visibility_off' : 'visibility';
}

function togglePerfilPass2() {
  var inp = document.getElementById('perfil-pass2');
  var ico = document.getElementById('perfil-pass2-icon');
  if (!inp) return;
  var hidden = inp.type === 'password';
  inp.type = hidden ? 'text' : 'password';
  if (ico) ico.textContent = hidden ? 'visibility_off' : 'visibility';
}

function guardarPerfil() {
  var u       = window.currentUser || {};
  var nombre  = document.getElementById('perfil-nombre').value.trim();
  var pass    = document.getElementById('perfil-pass').value;
  var pass2   = document.getElementById('perfil-pass2').value;

  if (!nombre) { showAdminToast('⚠️ El nombre no puede estar vacío'); return; }
  if (pass && pass !== pass2) { showAdminToast('⚠️ Las contraseñas no coinciden'); return; }
  if (pass && pass.length < 8) { showAdminToast('⚠️ La contraseña debe tener al menos 8 caracteres'); return; }

  _edgeUsuarios('actualizar-perfil', {
    username: u.username,
    nombre:   nombre,
    password: pass,
  }, function() {
    window.currentUser.nombre = nombre;
    try { localStorage.setItem('dlc_session', JSON.stringify(window.currentUser)); } catch(e) {}
    showAdminToast('✅ Perfil actualizado correctamente');
    if (typeof window._enhanceUserChip === 'function') window._enhanceUserChip();
    renderAdminSection('perfil');
  });
}

// ── Editar y Eliminar Pedidos (solo admin) ─────

function editarPedido(orderId) {
  const o = orders.find(x => x.id === orderId);
  if (!o) return;

  // Copia de trabajo: no se toca el pedido en memoria hasta guardar.
  _editItems = (o.items || []).map(function(i) {
    return { name: i.name, qty: i.qty, price: i.price || 0 };
  });

  // Modal de edición inline
  const modal = document.createElement('div');
  modal.id = 'edit-order-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:32px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.25)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 style="font-size:20px;font-weight:800">Editar Remisión ${orderId}</h3>
        <button onclick="document.getElementById('edit-order-modal').remove()" style="background:var(--bg);border:none;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer">✕</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Cliente</label><input id="eo-client" value="${_esc(o.client)}"></div>
        <div class="form-group"><label>Empresa</label><input id="eo-company" value="${_esc(o.company || '')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input id="eo-email" value="${_esc(o.email)}"></div>
        <div class="form-group"><label>Teléfono</label><input id="eo-phone" value="${_esc(o.phone || '')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Ciudad de entrega</label><input id="eo-city" value="${_esc(o.city || '')}" placeholder="Valledupar"></div>
        <div class="form-group"><label>Dirección de entrega</label><input id="eo-address" value="${_esc(o.address || '')}" placeholder="Calle 00 # 00-00, local / bodega"></div>
      </div>
      <div style="font-size:11px;color:var(--text-soft);margin:-8px 0 14px">Dónde se entrega la mercancía, que no siempre es la ciudad del cliente.</div>
      <div class="form-group"><label>Estado</label>
        <select id="eo-status">
          <option value="pending"    ${o.status==='pending'    ? 'selected':''}>Nuevo</option>
          <option value="quoted"     ${o.status==='quoted'     ? 'selected':''}>Cotizado</option>
          <option value="approved"   ${o.status==='approved'   ? 'selected':''}>Aprobado</option>
          <option value="dispatched" ${o.status==='dispatched' ? 'selected':''}>Despachado</option>
          <option value="delivered"  ${o.status==='delivered'  ? 'selected':''}>Entregado</option>
        </select>
      </div>
      ${_bloqueItemsEdicion(o)}
      <div class="form-group"><label>Observaciones</label><textarea id="eo-notes" rows="3">${_esc(o.notes || '')}</textarea></div>
      <div style="display:flex;gap:12px;margin-top:8px">
        <button onclick="guardarEdicionPedido('${orderId}')" style="background:var(--brand-blue);color:#fff;border:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;flex:1">💾 Guardar cambios</button>
        <button onclick="document.getElementById('edit-order-modal').remove()" style="background:var(--bg);border:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  _renderItemsEdicion();
  _cargarProductosParaRemision();
}

function guardarEdicionPedido(orderId) {
  const o = orders.find(x => x.id === orderId);
  if (!o) return;

  const newStatus = document.getElementById('eo-status').value;
  const previo = {
    client:  o.client,  company: o.company, email: o.email, phone: o.phone,
    city:    o.city,    address: o.address, notes: o.notes,
  };
  const campos = {
    client:  document.getElementById('eo-client').value.trim(),
    company: document.getElementById('eo-company').value.trim(),
    email:   document.getElementById('eo-email').value.trim(),
    phone:   document.getElementById('eo-phone').value.trim(),
    city:    document.getElementById('eo-city').value.trim(),
    address: document.getElementById('eo-address').value.trim(),
    notes:   document.getElementById('eo-notes').value.trim(),
  };
  // Los productos solo se pueden tocar mientras no esté entregada; si lo
  // está, el modal los muestra en modo lectura y no hay nada que enviar.
  const editaProductos = document.getElementById('eo-items-lista') !== null;
  if (editaProductos && _editItems.length === 0) {
    showAdminToast('⚠️ La remisión debe tener al menos un producto');
    return;
  }

  Object.assign(o, campos);

  cambiarEstadoPedido(orderId, newStatus, {
    campos: campos,
    exito:  editaProductos ? null : '✅ Remisión ' + orderId + ' actualizada',
    silencioso: editaProductos,
  }).then(function(ok) {
    // Si el servidor rechazó, se revierten también los datos del formulario:
    // el estado en pantalla debe reflejar lo que hay en la base.
    if (!ok) { Object.assign(o, previo); return; }
    if (!editaProductos) {
      document.getElementById('edit-order-modal').remove();
      renderLocalSection();
      return;
    }

    // Los productos van en su propia llamada: el servidor los reemplaza en
    // bloque y recalcula los totales dentro de la misma transacción.
    return _edgePedidosAsync('pedidos:actualizar-items', {
      orderId: orderId,
      items: _editItems.map(function(i) {
        return { name: i.name, qty: i.qty, price: i.price || 0 };
      }),
    }).then(function() {
      o.items = _editItems.map(function(i) {
        return { name: i.name, qty: i.qty, price: i.price || 0, icon: '📦' };
      });
      document.getElementById('edit-order-modal').remove();
      renderLocalSection();
      showAdminToast('✅ Remisión ' + orderId + ' actualizada');
    }).catch(function(err) {
      console.error('No se pudieron guardar los productos:', err);
      showAdminToast('❌ ' + String((err && err.message) || 'No se pudieron guardar los productos').substring(0, 140));
    });
  });
}

function eliminarPedido(orderId) {
  // Ya no es permanente: el borrado es lógico y se puede deshacer desde la
  // Papelera. El número tampoco se reutiliza, así que no pueden acabar dos
  // documentos distintos con el mismo consecutivo.
  if (!confirm('¿Enviar la remisión ' + orderId + ' a la papelera?\n\nPodrás recuperarla después desde la sección Papelera.')) return;

  // Se quita de la lista solo si el servidor confirma. Antes desaparecía de la
  // tabla y reaparecía al recargar cuando la petición era rechazada.
  deleteOrderSupa(orderId)
    .then(function() {
      orders = orders.filter(x => x.id !== orderId);
      renderLocalSection();
      showAdminToast('🗑 Remisión ' + orderId + ' enviada a la papelera');
    })
    .catch(function(err) {
      console.error('No se pudo eliminar la remisión:', err);
      showAdminToast('❌ ' + String((err && err.message) || 'No se pudo eliminar').substring(0, 140));
    });
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

// El catálogo del panel vive en la sección "Catalogo via Supabase" de más
// abajo. Aquí había un módulo anterior completo (catalogoLocal sobre los 68
// productos de data.js, con su propio renderCatalogo, alta, edición y
// pausa) que quedaba inalcanzable: la versión Supabase se define después y
// en JavaScript gana la última declaración.

// ── Recordatorio manual a cliente ─────────────

function enviarRecordatorio(orderId) {
  const o = orders.find(x => x.id === orderId);
  if (!o) return;
  
  const { total } = calcOrderTotals(o);
  const approvalLink = 'https://distribucionesestrategicasco-dev.github.io/distribucionesl/seguimiento.html'
    + '?id=' + encodeURIComponent(orderId);

  showAdminToast('📧 Enviando recordatorio...');

  var productosTexto = o.items.map(function(i) {
    return '• ' + i.name + ' x' + i.qty + ' - $' + fmt(i.price * i.qty);
  }).join('\n');

  emailjs.send(EMAILJS_SERVICE, EMAILJS_CLIENT_T, {
    to_email:      o.email,
    to_name:       o.client || 'Cliente',
    order_id:      orderId,
    cliente:       o.client || 'Cliente',
    empresa:       o.company || o.client || 'N/A',
    productos:     productosTexto,
    subtotal:      fmt(total / 1.19),
    iva:           fmt(total - total / 1.19),
    total:         '$' + fmt(total),
    
    // ========================================
    // DISEÑO AZUL PARA RECORDATORIO
    // ========================================
    asunto:              '📋 Recordatorio: Remisión ' + orderId + ' - Distribuciones Estratégicas',
    color_header:        '#1E3A8A',
    color_badge:         '#93C5FD',
    color_franja:        'linear-gradient(90deg, #1E3A8A, #3B82F6, #60A5FA)',
    badge_text:          'RECORDATORIO',
    
    estilo_icono:        'width:90px;height:90px;background:linear-gradient(135deg,#3B82F6,#1E40AF);border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(59,130,246,0.4);border:4px solid #DBEAFE',
    icono:               '⏰',
    tamano_icono:        '42px',
    
    titulo:              '¡Recordatorio de Remisión!',
    tamano_titulo:       '30px',
    color_titulo:        '#1E3A8A',
    mensaje_principal:   'Hola <strong>' + _esc(o.client || 'Cliente') + '</strong>, te recordamos que tienes una remisión pendiente de aprobación.',
    mensaje_secundario:  'No olvides revisar y autorizar tu remisión para que podamos proceder con el despacho.',
    
    color_fondo_cliente: '#EFF6FF',
    color_borde_cliente: '#BFDBFE',
    color_label_cliente: '#1E40AF',
    emoji_cliente:       '👤',
    
    color_header_tabla:  'linear-gradient(135deg, #1E3A8A, #2563EB)',
    color_borde_tabla:   '#BFDBFE',
    emoji_productos:     '📋',
    titulo_productos:    'PRODUCTOS COTIZADOS',
    color_total_fondo:   'linear-gradient(135deg, #1E3A8A, #2563EB)',
    
    color_cta_fondo:     '#EFF6FF',
    color_cta_borde:     '#3B82F6',
    color_cta_texto:     '#1E40AF',
    mensaje_final:       '⏰ Esta remisión sigue vigente. Haz clic en el botón para autorizarla y continuar con el proceso.',
    approval_link: '<a href="' + approvalLink + '" style="display:inline-block;background:#1E3A8A;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:6px;letter-spacing:0.3px;box-shadow:0 2px 8px rgba(30,58,138,0.3);text-transform:uppercase;border:none">✅ AUTORIZAR AHORA</a>'    
    
  }).then(function() {
    showAdminToast('✅ Recordatorio enviado a ' + o.email);
  }).catch(function(err) {
    console.warn('Error EmailJS recordatorio:', err);
    showAdminToast('❌ Error al enviar recordatorio');
  });
}

// ── Toast de notificación admin ────────────────

function showAdminToast(msg) {
  const existing = document.getElementById('admin-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'admin-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: #1D1D1F;
    color: #fff;
    padding: 14px 28px;
    border-radius: 40px;
    font-size: 15px;
    font-weight: 600;
    font-family: 'Outfit', sans-serif;
    box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    z-index: 9999;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
    border: 1px solid rgba(73,201,244,0.2);
  `;
  document.body.appendChild(toast);

  // Animación entrada
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Auto-cerrar en 3.5s
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Catalogo via Supabase ──────────────────────

var _catalogoSupa = [];
var _catalogoCatFilter = 'Todos';
var _catalogoSearch = '';

function loadCatalogoSection(cont) {
  _catalogoSearch = '';
  _catalogoCatFilter = 'Todos';
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
    cont.innerHTML = '<p style="color:red;padding:20px">Error cargando catalogo</p>';
  });
}

function renderCatalogo() {
  _catalogoSearch    = typeof _catalogoSearch    !== 'undefined' ? _catalogoSearch    : '';
  _catalogoCatFilter = typeof _catalogoCatFilter !== 'undefined' ? _catalogoCatFilter : 'Todos';
  _catalogoSupa      = typeof _catalogoSupa      !== 'undefined' ? _catalogoSupa      : [];

  var q    = (_catalogoSearch || '').toLowerCase();
  var cats = [...new Set(_catalogoSupa.map(function(p) { return p.categoria; }))].sort();

  var filtrado = _catalogoSupa.filter(function(p) {
    var matchQ   = !q || (p.nombre||'').toLowerCase().includes(q) || (p.categoria||'').toLowerCase().includes(q);
    var matchCat = _catalogoCatFilter === 'Todos' || p.categoria === _catalogoCatFilter;
    return matchQ && matchCat;
  });

  var isAdmin = canDo('catalogo');

  // La categoría se pasa por data-cat (escapado como atributo), no interpolada
  // dentro del onclick: un nombre con comillas rompía el HTML antes.
  var catBtns = ['Todos', ...cats].map(function(c) {
    var active = _catalogoCatFilter === c;
    return '<button data-cat="' + _esc(c) + '" onclick="filtrarCatCatalogo(this.dataset.cat)" style="padding:7px 14px;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:inherit;margin:4px;'
      + (active ? 'background:var(--brand-blue);color:#fff' : 'background:var(--bg);color:var(--text-soft)') + '">' + _esc(c) + '</button>';
  }).join('');

  var rows = filtrado.length === 0
    ? '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-soft)">Sin resultados</td></tr>'
    : filtrado.map(function(p) {
        var activo = p.activo !== false;
        return '<tr style="' + (!activo ? 'opacity:0.5' : '') + '">'
          + '<td style="width:60px">'
          + (p.imagen_url ? '<img src="' + _esc(p.imagen_url) + '" alt="' + _esc(p.nombre || '') + '" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">'
            : '<div style="width:48px;height:48px;background:var(--bg);border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:22px">' + _esc(p.icono || '📦') + '</div>')
          + '</td>'
          + '<td><strong>' + _esc(p.nombre||'') + '</strong></td>'
          + '<td><span class="badge badge-quoted">' + _esc(p.categoria||'') + '</span></td>'
          + '<td style="font-size:13px;color:var(--text-soft)">' + (p.precio_ref ? '$' + Number(p.precio_ref).toLocaleString('es-CO') : 'Por cotizar') + '</td>'
          + '<td><span class="badge ' + (activo ? 'badge-approved' : '') + '">' + (activo ? 'Activo' : 'Inactivo') + '</span></td>'
          + (isAdmin ? '<td style="white-space:nowrap">'
              + '<button class="action-link" onclick="abrirEditarProductoSupa(\'' + _esc(p.id) + '\')">✏️ Editar</button> '
              + '<button class="action-link" style="color:' + (!activo ? 'var(--brand-blue)' : '#E67E22') + '" onclick="toggleProductoSupa(\'' + _esc(p.id) + '\',' + activo + ')">' + (!activo ? '✅ Activar' : '⏸️ Pausar') + '</button> '
              + '<button class="action-link" style="color:#A32D2D" onclick="eliminarProductoSupa(\'' + _esc(p.id) + '\')">🗑️ Eliminar</button>'
              + '</td>' : '')
          + '</tr>';
      }).join('');

  var searchBar = '<div style="position:relative;margin-bottom:16px">'
    + '<input id="cat-search" type="text" placeholder="Buscar por nombre o categoria..." value="' + _esc(_catalogoSearch || '') + '"'
    + ' oninput="_catalogoSearch=this.value;clearTimeout(window._catT);window._catT=setTimeout(function(){var p=document.getElementById(\'cat-search\');var v=p?p.selectionStart:0;document.getElementById(\'admin-content\').innerHTML=renderCatalogo();var ni=document.getElementById(\'cat-search\');if(ni){ni.focus();ni.setSelectionRange(v,v);}},300)"'
    + ' style="width:100%;padding:10px 16px 10px 40px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;background:var(--bg);color:var(--text);outline:none">'
    + '<span style="position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--text-soft)">🔍</span>'
    + '</div>';

  var modal = '<div id="prod-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:400;align-items:center;justify-content:center;padding:16px">'
    + '<div style="background:var(--bg-white,#fff);border-radius:16px;padding:28px;width:100%;max-width:500px;max-height:92vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.3)">'
    + '<h3 id="prod-modal-title" style="font-size:19px;font-weight:800;margin-bottom:18px">Nuevo Producto</h3>'
    + '<input type="hidden" id="prod-id" value="">'
    + '<div class="form-group"><label>Nombre *</label><input id="prod-name" placeholder="Nombre del producto"></div>'
    + '<div class="form-group"><label>Categoria *</label>'
    + '<select id="prod-cat"><option>Oficina y Papelería</option><option>Tecnología</option><option>Equipos</option><option>Otros</option></select></div>'
    + '<div style="display:flex;gap:12px">'
    + '<div class="form-group" style="flex:1"><label>Icono</label><input id="prod-icon" placeholder="📦" maxlength="4"></div>'
    + '<div class="form-group" style="flex:1"><label>Precio ref.</label><input id="prod-price" type="number" placeholder="0" min="0"></div>'
    + '</div>'
    + '<div class="form-group"><label>Imágenes del producto</label>'
    + '<div id="prod-imgs-list" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px"></div>'
    + '<div style="border:2px dashed var(--border);border-radius:10px;padding:12px 16px;text-align:center;cursor:pointer;transition:background .2s" onclick="document.getElementById(\'prod-img-file\').click()" onmouseover="this.style.background=\'var(--bg-subtle)\'" onmouseout="this.style.background=\'\'">'
    + '<input type="file" id="prod-img-file" accept="image/*" style="display:none" onchange="agregarImgProducto(this)">'
    + '<div style="font-size:13px;color:var(--text-soft)">📎 Agregar imagen (JPG, PNG, WEBP — max 2MB)</div>'
    + '</div>'
    + '<input id="prod-img-url" type="hidden" value=""></div>'
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

function renderProdImgsList() {
  var list = document.getElementById('prod-imgs-list');
  if (!list) return;
  var imgs = window._prodImagenesPendientes || [];
  list.innerHTML = imgs.map(function(item, i) {
    return '<div style="position:relative;display:inline-block;margin:4px">'
      + '<img src="' + item.preview + '" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:2px solid ' + (i === 0 ? 'var(--brand-blue)' : 'var(--border)') + '">'
      + (i === 0 ? '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);color:#fff;font-size:9px;text-align:center;border-radius:0 0 6px 6px;padding:2px;font-weight:700">Principal</div>' : '')
      + '<button onclick="eliminarImgProducto(' + i + ')" style="position:absolute;top:-6px;right:-6px;background:#E53935;color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:14px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;padding:0">×</button>'
      + '</div>';
  }).join('')
  + '<label style="display:inline-flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:8px;border:2px dashed var(--brand-blue);cursor:pointer;color:var(--brand-blue);font-size:28px;margin:4px;vertical-align:top" title="Agregar imagen">+<input type="file" accept="image/*" multiple style="display:none" onchange="agregarImgProducto(this)"></label>';
}

function agregarImgProducto(input) {
  if (!input.files || !input.files.length) return;
  if (!window._prodImagenesPendientes) window._prodImagenesPendientes = [];
  Array.from(input.files).forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      window._prodImagenesPendientes.push({ file: file, preview: e.target.result, url: null });
      renderProdImgsList();
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}



function eliminarImgProducto(idx) {
  if (!window._prodImagenesPendientes) return;
  window._prodImagenesPendientes.splice(idx, 1);
  renderProdImgsList();
}

function abrirNuevoProductoSupa() {
  document.getElementById('prod-modal-title').textContent = 'Nuevo Producto';
  document.getElementById('prod-id').value    = '';
  document.getElementById('prod-name').value  = '';
  document.getElementById('prod-cat').value   = 'Oficina y Papelería';
  document.getElementById('prod-icon').value  = '📦';
  document.getElementById('prod-price').value = '';
  document.getElementById('prod-img-url').value = '';
  document.getElementById('prod-img-file').value = '';
  window._prodImagenesPendientes = [];
  renderProdImgsList();
  (function(){ var _m=document.getElementById('prod-modal'); _m.style.cssText='display:flex;position:fixed;inset:0;height:100vh;width:100vw;background:rgba(0,0,0,0.55);z-index:400;align-items:center;justify-content:center;padding:16px;overflow:hidden;box-sizing:border-box'; })();
}

function abrirEditarProductoSupa(id) {
  var p = _catalogoSupa.find(function(x) { return x.id === id; });
  if (!p) return;
  document.getElementById('prod-modal-title').textContent = 'Editar Producto';
  document.getElementById('prod-id').value    = p.id;
  document.getElementById('prod-name').value  = p.nombre || '';
  document.getElementById('prod-cat').value   = p.categoria || 'Oficina y Papelería';
  document.getElementById('prod-icon').value  = p.icono || '📦';
  document.getElementById('prod-price').value = p.precio_ref || '';
  document.getElementById('prod-img-url').value = p.imagen_url || '';
  document.getElementById('prod-img-file').value = '';
  var imgs = (p.imagenes && p.imagenes.length > 0) ? p.imagenes : (p.imagen_url ? [p.imagen_url] : []);
  window._prodImagenesPendientes = imgs.map(function(url){ return { url: url, preview: url, file: null }; });
  renderProdImgsList();
  (function(){ var _m=document.getElementById('prod-modal'); _m.style.cssText='display:flex;position:fixed;inset:0;height:100vh;width:100vw;background:rgba(0,0,0,0.55);z-index:400;align-items:center;justify-content:center;padding:16px;overflow:hidden;box-sizing:border-box'; })();
}

// Límite de subida por imagen (el texto de ayuda del modal promete 2 MB).
var PROD_IMG_MAX_BYTES = 2 * 1024 * 1024;

function guardarProductoSupa() {
  var id     = document.getElementById('prod-id').value;
  var nombre = document.getElementById('prod-name').value.trim();
  var cat    = document.getElementById('prod-cat').value;
  var icono  = document.getElementById('prod-icon').value.trim() || '📦';
  var precio = parseFloat(document.getElementById('prod-price').value) || 0;

  if (!nombre) { showAdminToast('El nombre es obligatorio'); return; }
  if (precio < 0) { showAdminToast('El precio no puede ser negativo'); return; }

  var btn = document.getElementById('prod-save-btn');
  function liberarBoton() {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar'; }
  }
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando...'; }

  var SUPA_URL = 'https://jnxsofraqshxjboukiab.supabase.co';

  // Sube una imagen al storage (vía Edge Function, service_role) y devuelve
  // la URL pública. El bucket 'productos' sigue siendo de lectura pública.
  function subirArchivo(file) {
    if (file.size > PROD_IMG_MAX_BYTES) {
      return Promise.reject(new Error('"' + file.name + '" pesa más de 2 MB'));
    }
    var ext  = file.name.split('.').pop().toLowerCase();
    var mime = file.type || ({'jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png','webp':'image/webp','gif':'image/gif'}[ext] || 'application/octet-stream');
    var path = 'producto_' + Date.now() + '_' + Math.random().toString(36).slice(2,6) + '.' + ext;
    return _fileToBase64(file).then(function(b64) {
      return _edgePedidosAsync('storage:subir', { bucket: 'productos', path: path, contentBase64: b64, contentType: mime });
    }).then(function() {
      return SUPA_URL + '/storage/v1/object/public/productos/' + path;
    });
  }

  // Resuelve todas las imágenes pendientes (sube las que tienen file, mantiene las que ya tienen url)
  var pendientes = window._prodImagenesPendientes || [];
  var promesas = pendientes.map(function(item) {
    if (item.file) return subirArchivo(item.file);
    return Promise.resolve(item.url);
  });

  Promise.all(promesas).then(function(urls) {
    var imagenesArr = urls.filter(Boolean);
    // La escritura va por la Edge Function (service_role): el rol anon ya no
    // puede insertar, actualizar ni borrar productos.
    return _edgePedidosAsync(id ? 'productos:editar' : 'productos:crear', {
      id:         id || undefined,
      nombre:     nombre,
      categoria:  cat,
      icono:      icono,
      precio_ref: precio,
      imagenes:   imagenesArr,
    });
  }).then(function(guardado) {
    // El cache local se actualiza con lo que confirmó el servidor, no con lo
    // que se tecleó, para que la tabla refleje el estado real.
    if (id) {
      var idx = _catalogoSupa.findIndex(function(x) { return x.id === id; });
      if (idx >= 0 && guardado) _catalogoSupa[idx] = guardado;
      document.getElementById('prod-modal').style.cssText = 'display:none';
      liberarBoton();
      showAdminToast('✅ Producto actualizado');
      document.getElementById('admin-content').innerHTML = renderCatalogo();
    } else {
      document.getElementById('prod-modal').style.cssText = 'display:none';
      liberarBoton();
      showAdminToast('✅ Producto creado');
      loadCatalogoSection(document.getElementById('admin-content'));
    }
  }).catch(function(err) {
    console.error('Error guardando producto:', err);
    showAdminToast('❌ ' + String(err.message || 'No se pudo guardar el producto').substring(0, 120));
    liberarBoton();
  });
}

function toggleProductoSupa(id, activo) {
  var nuevoEstado = !activo;
  _edgePedidosAsync('productos:toggle', { id: id, activo: nuevoEstado })
    .then(function() {
      var idx = _catalogoSupa.findIndex(function(x) { return x.id === id; });
      if (idx >= 0) _catalogoSupa[idx].activo = nuevoEstado;
      showAdminToast(nuevoEstado ? '✅ Producto activado' : '⏸️ Producto pausado');
      document.getElementById('admin-content').innerHTML = renderCatalogo();
    })
    .catch(function(err) {
      console.error('Error cambiando estado del producto:', err);
      showAdminToast('❌ ' + String(err.message || 'No se pudo cambiar el estado').substring(0, 120));
    });
}

// Cambia el filtro de categoría del catálogo. Vive fuera del onclick para que
// el nombre de la categoría no tenga que interpolarse en un atributo HTML.
function filtrarCatCatalogo(cat) {
  _catalogoCatFilter = cat || 'Todos';
  document.getElementById('admin-content').innerHTML = renderCatalogo();
}

// El nombre se resuelve del cache, no se recibe por parámetro: así no hay que
// interpolar texto del producto dentro del onclick.
function eliminarProductoSupa(id) {
  var prod = _catalogoSupa.find(function(x) { return x.id === id; });
  var nombre = (prod && prod.nombre) || 'este producto';
  if (!confirm('Eliminar el producto "' + nombre + '"? Esta accion no se puede deshacer.')) return;
  _edgePedidosAsync('productos:eliminar', { id: id })
    .then(function() {
      _catalogoSupa = _catalogoSupa.filter(function(x) { return x.id !== id; });
      showAdminToast('🗑 Producto eliminado');
      document.getElementById('admin-content').innerHTML = renderCatalogo();
    })
    .catch(function(err) {
      console.error('Error eliminando producto:', err);
      showAdminToast('❌ ' + String(err.message || 'No se pudo eliminar el producto').substring(0, 120));
    });
}


// ══════════════════════════════════════════════
// PAPELERA — remisiones con borrado lógico
// ══════════════════════════════════════════════

var _papelera = [];

function loadPapeleraSection(cont) {
  cont.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-soft)">'
    + '<div style="font-size:32px;margin-bottom:12px">🗑</div><p>Cargando papelera...</p></div>';
  _edgePedidosAsync('pedidos:papelera', {})
    .then(function(rows) {
      _papelera = rows || [];
      cont.innerHTML = renderPapelera();
    })
    .catch(function(err) {
      cont.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-soft)">'
        + '<p>No se pudo cargar la papelera</p>'
        + '<p style="font-size:13px">' + _esc(String(err.message || '')) + '</p></div>';
    });
}

function renderPapelera() {
  var filas = _papelera.length === 0
    ? '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-soft)">La papelera está vacía</td></tr>'
    : _papelera.map(function(o) {
        var borrado = o.eliminado_en ? new Date(o.eliminado_en) : null;
        var horaBorrado = borrado
          ? borrado.toLocaleDateString('es-CO') + ' ' + borrado.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
          : '—';
        return '<tr>'
          + '<td><strong>' + _esc(o.id) + '</strong></td>'
          + '<td>' + (_esc(o.client) || '—') + '<br><small style="color:var(--text-soft)">' + (_esc(o.company) || '') + '</small></td>'
          + '<td>' + fmtFecha(o.date) + '</td>'
          + '<td><span class="badge ' + statusBadgeClass(o.status) + '">' + statusLabel(o.status) + '</span></td>'
          + '<td style="font-size:13px">' + horaBorrado
            + '<br><small style="color:var(--text-soft)">' + (_esc(o.eliminado_por) || '—') + '</small></td>'
          + '<td><button class="action-link" style="color:#3B6D11" onclick="restaurarPedido(\'' + _esc(o.id) + '\')">↩ Restaurar</button></td>'
          + '</tr>';
      }).join('');

  return '<div class="admin-header"><div>'
    + '<h1>Papelera</h1>'
    + '<p>' + _papelera.length + ' remisión(es) en la papelera</p>'
    + '</div></div>'
    + '<div class="section-card">'
    + '<div style="padding:14px 20px;background:#EEF4FF;border-bottom:1px solid var(--border);font-size:13px;color:#1E2A44">'
    + 'Las remisiones borradas se conservan con sus productos y su historial. '
    + 'Su número tampoco se reutiliza, así que no pueden existir dos documentos distintos con el mismo consecutivo.'
    + '</div>'
    + '<table><thead><tr>'
    + '<th>Remisión</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th>Borrada</th><th>Acción</th>'
    + '</tr></thead><tbody>' + filas + '</tbody></table></div>';
}

function restaurarPedido(orderId) {
  if (!confirm('¿Restaurar la remisión ' + orderId + '?')) return;
  _edgePedidosAsync('pedidos:restaurar', { orderId: orderId })
    .then(function() {
      _papelera = _papelera.filter(function(x) { return x.id !== orderId; });
      showAdminToast('↩ Remisión ' + orderId + ' restaurada');
      document.getElementById('admin-content').innerHTML = renderPapelera();
    })
    .catch(function(err) {
      showAdminToast('❌ ' + String((err && err.message) || 'No se pudo restaurar').substring(0, 140));
    });
}


// ══════════════════════════════════════════════
// AUDITORÍA — quién cambió qué y cuándo
// ══════════════════════════════════════════════

var _auditoria = [];

var _notificaciones = [];

function loadAuditoriaSection(cont) {
  cont.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-soft)">'
    + '<div style="font-size:32px;margin-bottom:12px">📋</div><p>Cargando registro...</p></div>';
  Promise.all([
    _edgePedidosAsync('auditoria:listar',      { limite: 200 }),
    _edgePedidosAsync('notificaciones:listar', { limite: 100 }),
  ])
    .then(function(res) {
      _auditoria      = res[0] || [];
      _notificaciones = res[1] || [];
      cont.innerHTML = renderAuditoria() + renderNotificaciones();
    })
    .catch(function(err) {
      cont.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-soft)">'
        + '<p>No se pudo cargar el registro</p>'
        + '<p style="font-size:13px">' + _esc(String(err.message || '')) + '</p></div>';
    });
}

// Correos enviados al cliente. Antes no quedaba constancia de si salieron:
// la única traza era un aviso en pantalla que desaparecía a los segundos.
function renderNotificaciones() {
  var filas = _notificaciones.length === 0
    ? '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-soft)">Todavía no se ha enviado ningún correo</td></tr>'
    : _notificaciones.map(function(n) {
        var t  = n.created_at ? new Date(n.created_at) : null;
        var ok = n.estado === 'enviado';
        return '<tr>'
          + '<td style="white-space:nowrap;font-size:13px">'
            + (t ? t.toLocaleDateString('es-CO') : '—')
            + '<br><small style="color:var(--text-soft)">' + (t ? t.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '') + '</small></td>'
          + '<td><span class="badge ' + (ok ? 'badge-approved' : 'badge-new') + '">' + (ok ? 'Enviado' : 'Fallido') + '</span>'
            + (n.error ? '<br><small style="color:#A32D2D">' + _esc(String(n.error).substring(0, 80)) + '</small>' : '') + '</td>'
          + '<td style="font-size:13px">' + (_esc(n.pedido_id) || '—') + '</td>'
          + '<td style="font-size:13px">' + _esc(n.destinatario)
            + (n.copia ? '<br><small style="color:var(--text-soft)">copia: ' + _esc(n.copia) + '</small>' : '') + '</td>'
          + '<td style="font-size:12px;max-width:260px">' + (_esc(n.asunto) || '—')
            + (n.adjuntos ? '<br><small style="color:var(--text-soft)">' + n.adjuntos + ' adjunto(s)</small>' : '') + '</td>'
          + '<td style="font-size:13px">' + _esc(n.usuario) + '</td>'
          + '</tr>';
      }).join('');

  return '<div class="section-card" style="margin-top:24px">'
    + '<div class="section-card-head"><h3>Correos enviados al cliente</h3></div>'
    + '<table><thead><tr>'
    + '<th>Fecha</th><th>Estado</th><th>Remisión</th><th>Destinatario</th><th>Asunto</th><th>Enviado por</th>'
    + '</tr></thead><tbody>' + filas + '</tbody></table></div>';
}

// El detalle se resume en texto legible: la columna es para leerla de un
// vistazo, no para inspeccionar JSON.
function _resumirDetalleAuditoria(d) {
  if (!d) return '—';
  if (typeof d === 'string') {
    try { d = JSON.parse(d); } catch (e) { return _esc(d); }
  }
  if (typeof d !== 'object') return _esc(String(d));
  var partes = Object.keys(d)
    .filter(function(k) { return d[k] !== null && d[k] !== undefined && d[k] !== ''; })
    .map(function(k) {
      var v = d[k];
      if (Array.isArray(v))          v = v.length ? v.join(', ') : '(ninguno)';
      else if (typeof v === 'boolean') v = v ? 'sí' : 'no';
      return '<span style="color:var(--text-soft)">' + _esc(k.replace(/_/g, ' ')) + ':</span> ' + _esc(String(v));
    });
  return partes.length ? partes.join(' · ') : '—';
}

function renderAuditoria() {
  var COLOR_ACCION = {
    crear:     '#3B6D11', editar:  '#1E47A0', eliminar: '#A32D2D',
    restaurar: '#3B6D11', activar: '#3B6D11', pausar:   '#B45309'
  };
  var ETIQUETA_ENTIDAD = { usuario: 'Usuario', producto: 'Producto', remision: 'Remisión' };

  var filas = _auditoria.length === 0
    ? '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-soft)">Todavía no hay movimientos registrados</td></tr>'
    : _auditoria.map(function(a) {
        var t = a.created_at ? new Date(a.created_at) : null;
        var color = COLOR_ACCION[a.accion] || 'var(--text)';
        return '<tr>'
          + '<td style="white-space:nowrap;font-size:13px">'
            + (t ? t.toLocaleDateString('es-CO') : '—')
            + '<br><small style="color:var(--text-soft)">' + (t ? t.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '') + '</small></td>'
          + '<td><strong>' + _esc(a.usuario) + '</strong></td>'
          + '<td style="white-space:nowrap"><span style="font-weight:700;color:' + color + '">'
            + _esc(a.accion) + '</span><br><small style="color:var(--text-soft)">'
            + _esc(ETIQUETA_ENTIDAD[a.entidad] || a.entidad) + '</small></td>'
          + '<td style="font-size:13px">' + (_esc(a.entidad_id) || '—') + '</td>'
          + '<td style="font-size:12px;max-width:340px">' + _resumirDetalleAuditoria(a.detalle) + '</td>'
          + '</tr>';
      }).join('');

  return '<div class="admin-header"><div>'
    + '<h1>Auditoría</h1>'
    + '<p>Últimos ' + _auditoria.length + ' movimientos sobre usuarios, productos y remisiones</p>'
    + '</div></div>'
    + '<div class="section-card">'
    + '<div style="padding:14px 20px;background:#EEF4FF;border-bottom:1px solid var(--border);font-size:13px;color:#1E2A44">'
    + 'El usuario que aparece es el de la sesión verificada en el servidor, no el nombre para mostrar. '
    + 'Los cambios de estado de cada remisión se ven en su propio historial.'
    + '</div>'
    + '<table><thead><tr>'
    + '<th>Fecha</th><th>Usuario</th><th>Acción</th><th>Sobre</th><th>Detalle</th>'
    + '</tr></thead><tbody>' + filas + '</tbody></table></div>';
}


// ══════════════════════════════════════════════
// EDITAR LOS PRODUCTOS DE UNA REMISIÓN
// Antes se podían cambiar cliente, dirección y observaciones, pero no las
// líneas: si sobraba un producto o la cantidad estaba mal, la única salida
// era borrar la remisión entera y rehacerla, perdiendo el consecutivo.
// El servidor rechaza tocar las ya entregadas, porque el cliente firmó
// esas líneas concretas.
// ══════════════════════════════════════════════

var _editItems = [];

function _bloqueItemsEdicion(o) {
  var entregada = o.status === 'delivered';
  if (entregada) {
    return '<div class="form-group">'
      + '<label>Productos</label>'
      + '<div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;background:var(--bg)">'
        + (o.items || []).map(function(i) {
            return '<div style="font-size:13px;padding:3px 0">' + _esc(i.name) + ' <strong>×' + i.qty + '</strong></div>';
          }).join('')
        + '<div style="font-size:11px;color:var(--text-soft);margin-top:8px;line-height:1.5">'
        + '🔒 Ya entregada. El cliente firmó estos productos, así que no se pueden cambiar. '
        + 'Si hay un error, crea una remisión nueva.'
        + '</div>'
      + '</div></div>';
  }

  return '<div class="form-group">'
    + '<label>Productos</label>'
    + '<div id="eo-items-lista"></div>'
    + '<div style="display:grid;grid-template-columns:2fr 1fr auto;gap:8px;align-items:end;margin-top:10px">'
      + '<div class="form-group" style="margin:0;position:relative">'
        + '<input type="text" id="eo-prod-nombre" placeholder="Buscar o escribir producto..." autocomplete="off" oninput="_sugerirProductoEdicion(this.value)">'
        + '<div id="eo-prod-sug" style="position:absolute;top:100%;left:0;background:#fff;border:1px solid #E8EAF0;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.1);z-index:100;max-height:180px;overflow-y:auto;width:100%;display:none"></div>'
      + '</div>'
      + '<div class="form-group" style="margin:0"><input type="number" id="eo-prod-qty" min="1" value="1" placeholder="Cant."></div>'
      + '<button type="button" onclick="_agregarItemEdicion()" style="background:var(--brand-blue);color:#fff;border:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;height:40px">+ Añadir</button>'
    + '</div></div>';
}

function _renderItemsEdicion() {
  var cont = document.getElementById('eo-items-lista');
  if (!cont) return;
  if (_editItems.length === 0) {
    cont.innerHTML = '<div style="border:1px dashed var(--border);border-radius:10px;padding:16px;text-align:center;color:var(--text-soft);font-size:13px">'
      + 'Sin productos. Añade al menos uno.</div>';
    return;
  }
  cont.innerHTML = '<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden">'
    + _editItems.map(function(item, i) {
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--bg)">'
          + '<span style="flex:1;font-size:13px;font-weight:600">' + _esc(item.name) + '</span>'
          + '<input type="number" min="1" value="' + item.qty + '" oninput="_cambiarQtyEdicion(' + i + ',this.value)" '
          +   'style="width:64px;text-align:center;border:1px solid var(--border);border-radius:6px;padding:5px;font-family:inherit;font-size:13px;font-weight:700">'
          + '<button type="button" onclick="_quitarItemEdicion(' + i + ')" title="Quitar" '
          +   'style="background:none;border:none;cursor:pointer;color:#A32D2D;font-size:16px;padding:2px 6px">✕</button>'
        + '</div>';
      }).join('')
    + '</div>';
}

function _cambiarQtyEdicion(i, val) {
  if (!_editItems[i]) return;
  _editItems[i].qty = Math.max(1, parseInt(val, 10) || 1);
}

function _quitarItemEdicion(i) {
  _editItems.splice(i, 1);
  _renderItemsEdicion();
}

function _agregarItemEdicion() {
  var nombre = document.getElementById('eo-prod-nombre').value.trim();
  var qty    = Math.max(1, parseInt(document.getElementById('eo-prod-qty').value, 10) || 1);
  if (!nombre) { showAdminToast('⚠️ Escribe el nombre del producto'); return; }
  _editItems.push({ name: nombre, qty: qty, price: 0 });
  document.getElementById('eo-prod-nombre').value = '';
  document.getElementById('eo-prod-qty').value = '1';
  document.getElementById('eo-prod-sug').style.display = 'none';
  _renderItemsEdicion();
}

// Mismo autocompletado que la remisión manual, sobre el catálogo ya cargado.
function _sugerirProductoEdicion(q) {
  var box = document.getElementById('eo-prod-sug');
  if (!box) return;
  if (!q || q.length < 2) { box.style.display = 'none'; return; }
  var lista = (window._catalogoSupa || window.PRODUCTS || [])
    .filter(function(p) { return (p.nombre || p.name || '').toLowerCase().includes(q.toLowerCase()); })
    .slice(0, 8);
  if (lista.length === 0) { box.style.display = 'none'; return; }
  box.innerHTML = lista.map(function(p) {
    var nombre = p.nombre || p.name || '';
    return '<div data-nombre="' + _esc(nombre) + '" onclick="_elegirProductoEdicion(this.dataset.nombre)" '
      + 'style="padding:9px 12px;cursor:pointer;border-bottom:1px solid #F0F1F5;font-size:13px" '
      + 'onmouseover="this.style.background=\'#F5F6FA\'" onmouseout="this.style.background=\'#fff\'">'
      + _esc(nombre) + '</div>';
  }).join('');
  box.style.display = 'block';
}

function _elegirProductoEdicion(nombre) {
  document.getElementById('eo-prod-nombre').value = nombre;
  document.getElementById('eo-prod-sug').style.display = 'none';
  document.getElementById('eo-prod-qty').focus();
}
