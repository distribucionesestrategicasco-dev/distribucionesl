/* ================================================
   store.js — Estado global y utilidades
   100% Supabase (sin Google Sheets)
   ================================================ */

// ── Supabase config ────────────────────────────
const SUPA_URL_STORE  = 'https://jnxsofraqshxjboukiab.supabase.co';
const SUPA_ANON_STORE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';

function _supaHeaders(extras) {
  return Object.assign({
    'apikey':        SUPA_ANON_STORE,
    'Authorization': 'Bearer ' + SUPA_ANON_STORE,
    'Content-Type':  'application/json',
  }, extras || {});
}

// ── Estado global ──────────────────────────────
let cart                = [];
let currentFilter       = 'Todos';
let currentAdminSection = 'dashboard';
let currentOrderId      = null;

// Pedidos en memoria — cargados desde Supabase
let orders = [];

// ── Guardar pedido en Supabase ─────────────────
async function saveOrderToSheet(order) {
  const newId = await _nextOrderId();
  order.id = newId;

  // 1. Insertar pedido
  const r1 = await fetch(SUPA_URL_STORE + '/rest/v1/pedidos', {
    method:  'POST',
    headers: _supaHeaders({ 'Prefer': 'return=representation' }),
    body: JSON.stringify({
      id:              order.id,
      client:          order.client,
      company:         order.company   || '',
      nit:             order.nit       || '',
      email:           order.email,
      phone:           order.phone,
      city:            order.city      || '',
      address:         order.address   || '',
      notes:           order.notes     || '',
      date:            order.date,
      fecha_requerida: order.fechaRequerida || null,
      status:          'pending',
      subtotal:        0,
      iva:             0,
      total:           0,
    }),
  });
  if (!r1.ok) {
    const t = await r1.text();
    throw new Error('Error guardando pedido: ' + t);
  }

  // 2. Insertar items uno a uno
  for (var i = 0; i < order.items.length; i++) {
    var item = order.items[i];
    await fetch(SUPA_URL_STORE + '/rest/v1/pedido_items', {
      method:  'POST',
      headers: _supaHeaders(),
      body: JSON.stringify({
        pedido_id: order.id,
        name:      item.name,
        qty:       item.qty,
        price:     item.price || 0,
        icon:      item.icon  || '📦',
      }),
    });
  }

  // 3. Historial inicial
  await fetch(SUPA_URL_STORE + '/rest/v1/pedido_historial', {
    method:  'POST',
    headers: _supaHeaders(),
    body: JSON.stringify({
      pedido_id: order.id,
      estado:    'Nuevo',
      fecha:     new Date().toLocaleDateString('es-CO'),
      usuario:   'Cliente',
    }),
  });

  return { status: 'ok', id: order.id };
}

// Genera el próximo ID correlativo (DIST-XXXX)
async function _nextOrderId() {
  try {
    const r = await fetch(
      SUPA_URL_STORE + '/rest/v1/pedidos?select=id&order=created_at.desc&limit=1',
      { headers: _supaHeaders() }
    );
    const data = await r.json();
    if (data && data.length > 0) {
      // Extraer número del último id (ej: "DIST-0002" → 2)
      const last = data[0].id || '';
      const num  = parseInt(last.replace(/\D/g, ''), 10);
      if (!isNaN(num)) {
        return 'DIST-' + String(num + 1).padStart(4, '0');
      }
    }
  } catch(e) {
    console.warn('_nextOrderId falló:', e);
  }
  // Fallback: timestamp corto
  return 'DIST-' + String(Date.now()).slice(-4);
}

// ── Cargar pedidos desde Supabase ─────────────
async function loadOrdersFromSheet() {
  try {
    // 1. Traer pedidos
    const rP = await fetch(
      SUPA_URL_STORE + '/rest/v1/pedidos?select=*&order=created_at.desc',
      { headers: _supaHeaders() }
    );
    if (!rP.ok) throw new Error('HTTP ' + rP.status);
    const rawPedidos = await rP.json();

    // 2. Traer todos los items
    const rI = await fetch(
      SUPA_URL_STORE + '/rest/v1/pedido_items?select=*',
      { headers: _supaHeaders() }
    );
    const rawItems = rI.ok ? await rI.json() : [];

    // 3. Traer historial
    const rH = await fetch(
      SUPA_URL_STORE + '/rest/v1/pedido_historial?select=*&order=created_at.asc',
      { headers: _supaHeaders() }
    );
    const rawHistorial = rH.ok ? await rH.json() : [];

    // 4. Combinar
    orders = rawPedidos.map(function(p) {
      return {
        id:             p.id,
        client:         p.client,
        company:        p.company        || '',
        nit:            p.nit            || '',
        email:          p.email          || '',
        phone:          p.phone          || '',
        city:           p.city           || '',
        address:        p.address        || '',
        notes:          p.notes          || '',
        date:           p.date           || '',
        fechaRequerida: p.fecha_requerida || '',
        status:         p.status         || 'pending',
        sheetSubtotal:  p.subtotal       || 0,
        sheetIva:       p.iva            || 0,
        sheetTotal:     p.total          || 0,
        items: rawItems
          .filter(function(i) { return i.pedido_id === p.id; })
          .map(function(i) {
            return { name: i.name, qty: i.qty, price: i.price || 0, icon: i.icon || '📦' };
          }),
        historial: rawHistorial
          .filter(function(h) { return h.pedido_id === p.id; })
          .map(function(h) {
            return { estado: h.estado, fecha: h.fecha, usuario: h.usuario };
          }),
      };
    });

    return orders;
  } catch(err) {
    console.warn('loadOrdersFromSheet (Supabase) falló:', err.message);
    if (orders && orders.length > 0) return orders;
    orders = [];
    return orders;
  }
}

// ── Actualizar estado de pedido en Supabase ────
async function updateOrderStatus(orderId, newStatus, campos) {
  const body = Object.assign({ status: newStatus }, campos || {});
  await fetch(
    SUPA_URL_STORE + '/rest/v1/pedidos?id=eq.' + encodeURIComponent(orderId),
    { method: 'PATCH', headers: _supaHeaders(), body: JSON.stringify(body) }
  );
}

// ── Actualizar totales de cotización ───────────
async function updateOrderTotals(orderId, subtotal, iva, total) {
  await fetch(
    SUPA_URL_STORE + '/rest/v1/pedidos?id=eq.' + encodeURIComponent(orderId),
    {
      method:  'PATCH',
      headers: _supaHeaders(),
      body: JSON.stringify({ subtotal: subtotal, iva: iva, total: total }),
    }
  );
  // Actualizar precios de items
  var o = orders.find(function(x) { return x.id === orderId; });
  if (o && o.items) {
    for (var i = 0; i < o.items.length; i++) {
      var item = o.items[i];
      if (item.price > 0) {
        await fetch(
          SUPA_URL_STORE + '/rest/v1/pedido_items?pedido_id=eq.' + encodeURIComponent(orderId) + '&name=eq.' + encodeURIComponent(item.name),
          { method: 'PATCH', headers: _supaHeaders(), body: JSON.stringify({ price: item.price }) }
        );
      }
    }
  }
}

// ── Agregar entrada al historial ───────────────
async function addHistorialSupa(orderId, estado, usuario) {
  await fetch(SUPA_URL_STORE + '/rest/v1/pedido_historial', {
    method:  'POST',
    headers: _supaHeaders(),
    body: JSON.stringify({
      pedido_id: orderId,
      estado:    estado,
      fecha:     new Date().toLocaleDateString('es-CO'),
      usuario:   usuario || 'Sistema',
    }),
  });
}

// ── Eliminar pedido ────────────────────────────
async function deleteOrderSupa(orderId) {
  await fetch(
    SUPA_URL_STORE + '/rest/v1/pedido_items?pedido_id=eq.' + encodeURIComponent(orderId),
    { method: 'DELETE', headers: _supaHeaders() }
  );
  await fetch(
    SUPA_URL_STORE + '/rest/v1/pedido_historial?pedido_id=eq.' + encodeURIComponent(orderId),
    { method: 'DELETE', headers: _supaHeaders() }
  );
  await fetch(
    SUPA_URL_STORE + '/rest/v1/pedidos?id=eq.' + encodeURIComponent(orderId),
    { method: 'DELETE', headers: _supaHeaders() }
  );
}

// ── Generar ID local de emergencia ────────────
function generateOrderId() {
  return 'DIST-' + String(Date.now()).slice(-4);
}

// ── Utilidades globales ────────────────────────

function fmt(n) {
  return Math.round(n || 0).toLocaleString('es-CO');
}

function statusLabel(s) {
  const map = {
    pending:    'Nuevo',
    quoted:     'Cotizado',
    approved:   'Aprobado',
    dispatched: 'Despachado',
    delivered:  'Entregado',
  };
  return map[s] || s;
}

function statusBadgeClass(s) {
  const map = {
    pending:    'badge-new',
    quoted:     'badge-quoted',
    approved:   'badge-approved',
    dispatched: 'badge-dispatched',
    delivered:  'badge-delivered',
  };
  return map[s] || 'badge-pending';
}

function calcOrderTotals(order) {
  const itemsTotal = (order.items || []).reduce(function(s, i) {
    return s + ((i.price || 0) * (i.qty || 1));
  }, 0);
  if (itemsTotal > 0) {
    const sub   = itemsTotal;
    const iva   = sub * 0.19;
    const total = sub + iva;
    return { sub: sub, iva: iva, total: total };
  }
  if (order.sheetTotal > 0) {
    return {
      sub:   order.sheetSubtotal || 0,
      iva:   order.sheetIva      || 0,
      total: order.sheetTotal    || 0,
    };
  }
  return { sub: 0, iva: 0, total: 0 };
}
