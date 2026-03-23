/* ================================================
   orders.js — Formulario de pedido y envío real
   Usa EmailJS para enviar emails sin backend.

   Configuración EmailJS:
     SERVICE_ID       = service_zlygmxg
     TEMPLATE_ADMIN   = template_5pq32d9  → notificación al admin (fijo a tu correo)
     TEMPLATE_CLIENT  = template_0cjbbl9  → confirmación cliente + cotización (to_email dinámico)
     PUBLIC_KEY       = Z36EAC4PWgs02Gy3o
   ================================================ */

const EMAILJS_SERVICE  = 'service_zlygmxg';
const EMAILJS_ADMIN_T  = 'template_5pq32d9';
const EMAILJS_CLIENT_T = 'template_0cjbbl9';
const EMAILJS_KEY      = 'Z36EAC4PWgs02Gy3o';

// ── Abrir formulario ──────────────────────────

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
      📧 Recibirás confirmación de tu solicitud por email.
      Pronto te enviaremos la cotización con precios.
    </div>

    <div class="order-summary">
      <h4>Resumen del Pedido</h4>
      ${cart.map(i => `
        <div class="order-item-row">
          <span>${i.icon} ${i.name} ×${i.qty}</span>
          <span>Por cotizar</span>
        </div>
      `).join('')}
      <div class="order-total-row">
        <span>${totalItems} producto(s)</span>
        <span>→ Cotización</span>
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

// ── Enviar pedido ─────────────────────────────

function submitOrder() {
  const name    = document.getElementById('f-name').value.trim();
  const company = document.getElementById('f-company').value.trim();
  const nit     = document.getElementById('f-nit').value.trim();
  const phone   = document.getElementById('f-phone').value.trim();
  const email   = document.getElementById('f-email').value.trim();
  const city    = document.getElementById('f-city').value.trim();
  const address = document.getElementById('f-address').value.trim();
  const date    = document.getElementById('f-date').value;
  const notes   = document.getElementById('f-notes').value.trim();

  // Validar campos obligatorios
  if (!name || !company || !nit || !phone || !email) {
    showFormError('Por favor completa los campos obligatorios (*).');
    return;
  }
  if (!isValidEmail(email)) {
    showFormError('El correo electrónico no es válido.');
    return;
  }

  // Deshabilitar botón mientras envía
  const btn = document.getElementById('submit-order-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Enviando...';

  // Crear objeto del pedido
  const orderId = generateOrderId();
  const order = {
    id:      orderId,
    client:  name,
    company,
    nit,
    phone,
    email,
    city,
    address,
    date:    new Date().toISOString().slice(0, 10),
    fechaRequerida: date || 'No especificada',
    status:  'pending',
    notes,
    items: cart.map(i => ({ name: i.name, icon: i.icon, qty: i.qty, price: 0, cat: i.cat })),
  };

  const productosTexto = cart
    .map(i => `• ${i.name} — Cantidad: ${i.qty}`)
    .join('\n');

  // Primero EmailJS (más crítico para el cliente), luego Sheet en paralelo
  const emailPromise = emailjs.send(EMAILJS_SERVICE, EMAILJS_ADMIN_T, {
    order_id:      orderId,
    cliente:       name,
    empresa:       company,
    nit:           nit,
    telefono:      phone,
    email:         email,
    direccion:     address || 'No especificada',
    ciudad:        city    || 'No especificada',
    fecha:         date    || 'No especificada',
    productos:     productosTexto,
    observaciones: notes || 'Ninguna',
    to_email:      ADMIN_EMAIL,
  });

  // Guardar en Sheet en paralelo (no bloquea si falla)
  saveOrderToSheet(order).then(function(result) {
    if (result && result.id) {
      order.id = result.id;
    }
  }).catch(function(e) {
    console.warn('Sheet guardado con error:', e);
  });

  // Solo esperar el email para mostrar confirmación al cliente
  emailPromise
  .then(() => {
    orders.push(order);
    showOrderSuccess(order);
    cart = [];
    updateCartUI();
  })
  .catch(err => {
    console.error('Error EmailJS:', err);
    btn.disabled = false;
    btn.textContent = '📨 Enviar Solicitud de Cotización';
    showFormError('Error al enviar. Verifica tu conexión e inténtalo de nuevo.');
  });
}

// ── Helpers de UI ─────────────────────────────

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
  const trackLink = 'index.html?tracking=' + encodeURIComponent(order.id);

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
      <a href="${trackLink}" target="_blank"
        style="display:block;background:var(--brand-navy);color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:700;text-align:center;margin:12px 0">
        📍 Seguir mi pedido en tiempo real →
      </a>
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
