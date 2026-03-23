/* ================================================
   store.js — Estado global y utilidades
   ================================================ */

// ── URL Google Apps Script ────────────────────
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyAgnsRnMBTGtAobCb7eNhOh3k4p2zk8hHI8HSJMTIkkuLfEvPcDITlv-afdhfL4JLU_g/exec';

// ── Estado global ─────────────────────────────
let cart = [];
let currentFilter = 'Todos';
let currentAdminSection = 'dashboard';
let currentOrderId = null;
let nextOrderId = 1;

// Pedidos en memoria — se sincronizan con Google Sheets
let orders = [];

// ── Google Sheets: guardar pedido ─────────────
async function saveOrderToSheet(order) {
  const productosTexto = order.items
    .map(i => `• ${i.name} x${i.qty}`)
    .join('\n');

  // Intentar obtener consecutivo del Sheet, con timeout de 5s
  let finalId = order.id;
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 5000);
    const res  = await fetch(SHEETS_URL + '?action=nextId&t=' + Date.now(), { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.status === 'ok' && data.nextId) {
      finalId  = String(data.nextId).padStart(4, '0');
      order.id = finalId;
    }
  } catch(e) {
    // Si falla nextId, usar ID provisional — el pedido igual se envía
    console.warn('nextId no disponible, usando ID provisional:', finalId);
  }

  const payload = {
    id:             finalId,
    fecha:          order.date,
    cliente:        order.client,
    empresa:        order.company,
    nit:            order.nit      || '',
    email:          order.email,
    telefono:       order.phone,
    ciudad:         order.city     || '',
    direccion:      order.address  || '',
    fechaRequerida: order.fechaRequerida || '',
    productos:      productosTexto,
    observaciones:  order.notes   || '',
  };

  // no-cors: nunca falla visiblemente — el dato llega al Sheet igual
  try {
    await fetch(SHEETS_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(payload),
    });
  } catch(e) {
    console.warn('Sheet POST falló silenciosamente:', e);
  }

  return { status: 'ok', id: finalId };
}

// ── Google Sheets: cargar pedidos ─────────────
// Usa fetch normal con GET — Apps Script sí devuelve CORS en GET
async function loadOrdersFromSheet() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res  = await fetch(SHEETS_URL + '?t=' + Date.now(), { signal: controller.signal });
    clearTimeout(timer);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(data.msg || 'Error desconocido');

    orders = data.orders.map(o => ({
      id:      o.id,
      client:  o.cliente,
      company: o.empresa,
      nit:     o.nit,
      email:   o.email,
      phone:   o.telefono,
      city:    o.ciudad,
      address: o.direccion,
      date:    normalizeFecha(o.fecha),
      fechaRequerida: normalizeFecha(o.fechaRequerida),
      status:  o.status,
      notes:   o.observaciones,
      items:   parseProductos(o.productosRaw),
      sheetTotal:    parseFloat(o.total)    || 0,
      sheetSubtotal: parseFloat(o.subtotal) || 0,
      sheetIva:      parseFloat(o.iva)      || 0,
    }));

    return orders;
  } catch(err) {
    clearTimeout(timer);
    // Si ya tenemos pedidos en memoria, usar los que hay sin lanzar error
    if (orders && orders.length > 0) {
      console.warn('Sheets no disponible, usando caché:', err.message);
      return orders;
    }
    // Sin caché: retornar array vacío en lugar de lanzar error
    console.warn('Sheets no disponible, sin caché:', err.message);
    orders = orders || [];
    return orders;
  }
}

// Convierte el texto de productos del Sheet en array de items
function parseProductos(txt) {
  if (!txt) return [];
  return txt.split('\n')
    .filter(l => l.trim())
    .map(l => {
      // Formato: "• Nombre x3"
      const m = l.replace('•', '').trim().match(/^(.+?)\s+x(\d+)$/);
      if (m) return { name: m[1].trim(), qty: parseInt(m[2]), price: 0, icon: '📦' };
      return { name: l.trim(), qty: 1, price: 0, icon: '📦' };
    });
}

// Normaliza cualquier formato de fecha a YYYY-MM-DD
function normalizeFecha(val) {
  if (!val) return '';
  var s = String(val).trim();
  // Ya está en formato ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  // Google Sheets puede devolver M/D/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
    var p = s.split('/');
    return p[2] + '-' + p[0].padStart(2,'0') + '-' + p[1].padStart(2,'0');
  }
  // Objeto Date de JS serializado
  var d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  return s;
}


function generateOrderId() {
  // Fallback local — se sobreescribe con el consecutivo real del Sheet
  return String(Math.floor(Date.now() / 1000) % 9000 + 1000).padStart(4, '0');
}

// ── Utilidades globales ───────────────────────

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
  // Si los items tienen precio asignado, calcula desde ahí
  const itemsTotal = order.items.reduce((s, i) => s + (i.price * i.qty), 0);
  if (itemsTotal > 0) {
    const sub   = itemsTotal;
    const iva   = sub * 0.19;
    const total = sub + iva;
    return { sub, iva, total };
  }
  // Si no hay precios en items, usar los totales guardados en el Sheet
  if (order.sheetTotal > 0) {
    return {
      sub:   order.sheetSubtotal || 0,
      iva:   order.sheetIva      || 0,
      total: order.sheetTotal    || 0,
    };
  }
  return { sub: 0, iva: 0, total: 0 };
}
