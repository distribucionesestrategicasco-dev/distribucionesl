/* ================================================
   orders.js — Formulario de pedido y envío real
   Guarda en Supabase + EmailJS para notificaciones
   ================================================ */

const EMAILJS_SERVICE  = 'service_zlygmxg';
const EMAILJS_ADMIN_T  = 'template_5pq32d9';
const EMAILJS_CLIENT_T = 'template_0cjbbl9';
const EMAILJS_KEY      = 'Z36EAC4PWgs02Gy3o';

// ── Abrir formulario ─────────────────────────────
function openOrderForm() {
  if (cart.length === 0) {
    alert('Agrega productos primero.');
    return;
  }
  document.getElementById('cart-overlay').classList.remove('open');
  document.getElementById('cart-panel').classList.remove('open');

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);

  document.getElementById('order-modal-body').innerHTML = `
    <div class="form-note">
      <div class="form-note-item">
        <span class="material-icons">mark_email_read</span>
        <div>
          <strong>Confirmación inmediata</strong>
          <p>Recibirás un email con el resumen de tu solicitud al instante.</p>
        </div>
      </div>
      <div class="form-note-item">
        <span class="material-icons">request_quote</span>
        <div>
          <strong>Cotización personalizada</strong>
          <p>Nuestro equipo te enviará los precios y disponibilidad en breve.</p>
        </div>
      </div>
    </div>
    <div class="order-summary">
      <div class="order-summary-head">
        <span class="material-icons">receipt_long</span>
        <span>Resumen del Pedido</span>
        <span class="order-summary-count">${totalItems} producto${totalItems !== 1 ? 's' : ''}</span>
      </div>
      <div class="order-summary-list">
        ${cart.map(i => `
          <div class="order-item-row">
            <span class="order-item-icon">${i.icon}</span>
            <span class="order-item-name">${i.name}</span>
            <span class="order-item-qty">×${i.qty}</span>
            <span class="order-item-price">Por cotizar</span>
          </div>
        `).join('')}
      </div>
      <div class="order-total-row">
        <span class="material-icons">local_offer</span>
        <span>Recibirás la cotización con precios reales</span>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Nombre Completo *</label>
        <input type="text" id="f-name" placeholder="Tu nombre completo">
      </div>
      <div class="form-group">
        <label>Empresa *</label>
        <input type="text" id="f-company" placeholder="Nombre de la empresa">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>NIT / CC *</label>
        <input type="text" id="f-nit" placeholder="NIT o Cédula">
      </div>
      <div class="form-group">
        <label>Teléfono / WhatsApp *</label>
        <input type="tel" id="f-phone" placeholder="310 000 0000">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Correo Electrónico *</label>
        <input type="email" id="f-email" placeholder="correo@empresa.com">
      </div>
      <div class="form-group">
        <label>Ciudad</label>
        <input type="text" id="f-city" placeholder="Ciudad">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Dirección de Entrega</label>
        <input type="text" id="f-address" placeholder="Dirección completa">
      </div>
      <div class="form-group">
        <label>Fecha Requerida</label>
        <input type="date" id="f-date">
      </div>
    </div>
    <div class="form-group">
      <label>Observaciones</label>
      <textarea id="f-notes" placeholder="Especificaciones, urgencia u otras indicaciones..."></textarea>
    </div>
    <button class="submit-btn" id="submit-order-btn" onclick="submitOrder()">
      📨 Enviar Solicitud de Cotización
    </button>
  `;

  openModal('order-modal');
}

// ── Enviar pedido ────────────────────────────────
async function submitOrder() {
  const name    = document.getElementById('f-name').value.trim();
  const company = document.getElementById('f-company').value.trim();
  const nit     = document.getElementById('f-nit').value.trim();
  const phone   = document.getElementById('f-phone').value.trim();
  const email   = document.getElementById('f-email').value.trim();
  const city    = document.getElementById('f-city').value.trim();
  const address = document.getElementById('f-address').value.trim();
  const date    = document.getElementById('f-date').value;
  const notes   = document.getElementById('f-notes').value.trim();

  if (!name || !company || !nit || !phone || !email) {
    showFormError('Por favor completa los campos obligatorios (*).');
    return;
  }
  if (!isValidEmail(email)) {
    showFormError('El correo electrónico no es válido.');
    return;
  }

  const btn = document.getElementById('submit-order-btn');
  btn.disabled    = true;
  btn.textContent = '⏳ Enviando...';

  const order = {
    id:             generateOrderId(), // provisional, se reemplaza por Supabase
    client:         name,
    company:        company,
    nit:            nit,
    phone:          phone,
    email:          email,
    city:           city,
    address:        address,
    date:           new Date().toISOString().slice(0, 10),
    fechaRequerida: date || '',
    status:         'pending',
    notes:          notes,
    items: cart.map(i => ({
      name:  i.name,
      icon:  i.icon,
      qty:   i.qty,
      price: 0,
      cat:   i.cat,
    })),
  };

  const productosTexto = cart
    .map(i => `• ${i.name} — Cantidad: ${i.qty}`)
    .join('\n');

  try {
    // 1. Guardar en Supabase (obtiene el ID real)
    const result = await saveOrderToSheet(order);
    if (result && result.id) order.id = result.id;

    // 2. Email al admin (no bloquea si falla)
    emailjs.send(EMAILJS_SERVICE, EMAILJS_ADMIN_T, {
      order_id:      order.id,
      cliente:       name,
      empresa:       company,
      nit:           nit,
      telefono:      phone,
      email:         email,
      direccion:     address || 'No especificada',
      ciudad:        city    || 'No especificada',
      fecha:         date    || 'No especificada',
      productos:     productosTexto,
      observaciones: notes   || 'Ninguna',
      to_email:      typeof ADMIN_EMAIL !== 'undefined' ? ADMIN_EMAIL : email,
    }).catch(function(e) { console.warn('EmailJS admin falló:', e); });

    // 3. Mostrar éxito
    orders.push(order);
    showOrderSuccess(order);
    cart = [];
    updateCartUI();

  } catch(err) {
    console.error('Error guardando pedido:', err);
    btn.disabled    = false;
    btn.textContent = '📨 Enviar Solicitud de Cotización';
    showFormError('Error al enviar. Verifica tu conexión e inténtalo de nuevo.');
  }
}

// ── Helpers de UI ────────────────────────────────
function showFormError(msg) {
  let err = document.getElementById('form-error-msg');
  if (!err) {
    err = document.createElement('div');
    err.id = 'form-error-msg';
    err.style.cssText = 'background:#FCEBEB;color:#A32D2D;padding:12px 16px;border-radius:10px;font-size:14px;font-weight:600;margin-bottom:16px;';
    const btn = document.getElementById('submit-order-btn');
    btn.parentNode.insertBefore(err, btn);
  }
  err.textContent = '⚠️ ' + msg;
  err.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showOrderSuccess(order) {
  document.getElementById('order-modal-body').innerHTML = `
    <div class="success-state">
      <div class="success-icon">✅</div>
      <h3>¡Solicitud Recibida!</h3>
      <p>
        Tu solicitud <strong>${order.id}</strong> fue enviada correctamente.<br><br>
        En breve recibirás un email en <strong>${order.email}</strong>
        con la cotización y los precios de los productos.
      </p>
      <div class="success-detail">
        <div class="success-detail-label">Productos solicitados</div>
        ${order.items.map(i => `
          <div class="success-item">${i.icon} ${i.name} ×${i.qty}</div>
        `).join('')}
      </div>
      <div style="background:rgba(0,216,240,0.08);border-left:3px solid #49C9F4;border-radius:0 10px 10px 0;padding:12px 16px;font-size:13px;color:#0F2340;margin:16px 0;line-height:1.6">
        📋 <strong>¿Qué sigue?</strong><br>
        Revisaremos tu solicitud y te enviaremos la cotización con precios.<br>
        Una vez que la apruebes, procederemos con el despacho.
      </div>
      <p style="font-size:14px;color:var(--text-soft)">
        📞 ¿Tienes dudas? Llámanos: <strong>(57) 321 896 5745</strong>
      </p>
      <button class="btn-primary" style="margin-top:16px" onclick="closeModal('order-modal');">
        Entendido
      </button>
    </div>
  `;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
