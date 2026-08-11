/* ================================================
   whatsapp.js — Chat de WhatsApp dentro de la web
   ------------------------------------------------
   Widget de pre-chat: el visitante escribe en la
   propia pagina y al enviar se abre WhatsApp con el
   mensaje ya redactado (y el contexto de la pagina,
   util cuando escribe desde una ficha de producto).

   No se puede incrustar la conversacion real de
   WhatsApp en un iframe — Meta lo bloquea con
   X-Frame-Options —, asi que este es el patron que
   usan todos los widgets del mercado sin pagar la
   Cloud API.

   Sin dependencias. Se autoinyecta en cualquier
   pagina que cargue este archivo.
   ================================================ */
(function () {
  'use strict';

  var CFG = {
    telefono: '573023548415',
    marca:    'Distribuciones Estratégicas',
    avatar:   '/img/logo_icon-80.png',
    horario:  'Lun a Vie · 8:00 a.m. – 5:00 p.m.',
    // Globo de invitacion: ms de espera. 0 lo desactiva.
    teaserMs: 9000,
    saludo:   '¡Hola! 👋 Somos el equipo de Distribuciones Estratégicas. Cuéntanos qué necesitas y te devolvemos la cotización el mismo día.',
    rapidas: [
      'Quiero cotizar una lista',
      'Precios y disponibilidad',
      'Estado de mi pedido',
      'Entregas en Barranquilla'
    ]
  };

  // Evitar doble inyeccion si el script se cargara dos veces
  if (document.querySelector('.wsp')) return;

  // ── Horario de atencion ───────────────────────
  // Colombia es UTC-5 todo el año (no hay horario de verano), asi que basta
  // con desplazar el UTC del navegador: el estado no depende de la zona
  // horaria del visitante.
  function enHorario() {
    var d   = new Date();
    var utc = d.getTime() + d.getTimezoneOffset() * 60000;
    var co  = new Date(utc - 5 * 3600000);
    var dia = co.getDay();          // 0 domingo … 6 sabado
    var h   = co.getHours();
    return dia >= 1 && dia <= 5 && h >= 8 && h < 17;
  }

  function horaCorta() {
    var d   = new Date();
    var utc = d.getTime() + d.getTimezoneOffset() * 60000;
    var co  = new Date(utc - 5 * 3600000);
    var h   = co.getHours();
    var m   = String(co.getMinutes()).padStart(2, '0');
    var ap  = h >= 12 ? 'p.m.' : 'a.m.';
    var h12 = h % 12 || 12;
    return h12 + ':' + m + ' ' + ap;
  }

  // ── Contexto de la pagina ─────────────────────
  // Si escribe desde una ficha de producto, el asesor recibe cual es. En el
  // resto de paginas no se añade ruido al mensaje.
  function contexto() {
    if (!/\/producto\//.test(location.pathname)) return '';
    var h1 = document.querySelector('h1');
    var nombre = h1 ? h1.textContent.trim() : '';
    if (!nombre) return '';
    return '\n\n— Consulta por: ' + nombre + ' (' + location.origin + location.pathname + ')';
  }

  // ── Construccion del widget ───────────────────
  var raiz = document.createElement('div');
  raiz.className = 'wsp';

  var abierto  = enHorario();
  var icoWa    = '<svg class="wsp-ico wsp-ico--wa" width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.6.1l-.9 1.1c-.2.2-.3.2-.6.1-1.1-.5-2.4-1.7-2.9-2.9-.1-.3 0-.4.1-.6l.4-.5c.1-.2.1-.3 0-.5l-.9-2.1c-.2-.5-.4-.4-.6-.5h-.5c-.2 0-.5.1-.7.3-.9.9-1 2.2-.5 3.5.6 1.5 2.6 3.9 5.3 4.9 1.3.5 1.9.4 2.6.3.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2zM12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2z"/></svg>';
  var icoClose = '<svg class="wsp-ico wsp-ico--close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  raiz.innerHTML =
    '<div class="wsp-panel" id="wsp-panel" role="dialog" aria-label="Chat con Distribuciones Estratégicas" hidden>' +
      '<div class="wsp-head">' +
        '<img class="wsp-avatar" src="' + CFG.avatar + '" alt="" width="42" height="42" loading="lazy">' +
        '<div class="wsp-head-txt">' +
          '<div class="wsp-name">' + CFG.marca + '</div>' +
          '<div class="wsp-status">' +
            '<span class="wsp-dot' + (abierto ? '' : ' is-off') + '"></span>' +
            (abierto ? 'En línea · respondemos en minutos' : 'Fuera de horario · ' + CFG.horario) +
          '</div>' +
        '</div>' +
        '<button type="button" class="wsp-close" aria-label="Cerrar chat">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="wsp-body" id="wsp-body" aria-live="polite"></div>' +
      '<form class="wsp-form" id="wsp-form">' +
        '<textarea class="wsp-input" id="wsp-input" rows="1" placeholder="Escribe tu mensaje…" aria-label="Tu mensaje"></textarea>' +
        '<button type="submit" class="wsp-send" aria-label="Enviar por WhatsApp">' +
          '<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2.3 21.5 23 12 2.3 2.5 2.3 10l14.5 2-14.5 2z"/></svg>' +
        '</button>' +
      '</form>' +
      '<p class="wsp-note">Al enviar se abrirá WhatsApp con tu mensaje escrito</p>' +
    '</div>' +
    '<button type="button" class="wsp-btn" id="wsp-btn" aria-expanded="false" aria-controls="wsp-panel" aria-label="Abrir chat de WhatsApp">' +
      icoWa + icoClose +
    '</button>';

  document.body.appendChild(raiz);

  // En /catalogo el carrito flotante ya ocupa la esquina: el chat se apila.
  if (document.getElementById('cart-btn-wrap')) raiz.classList.add('wsp--stacked');

  var panel = raiz.querySelector('#wsp-panel');
  var cuerpo = raiz.querySelector('#wsp-body');
  var boton = raiz.querySelector('#wsp-btn');
  var form  = raiz.querySelector('#wsp-form');
  var input = raiz.querySelector('#wsp-input');

  // ── Helpers del hilo ──────────────────────────
  function burbuja(texto, tipo) {
    var el = document.createElement('div');
    el.className = 'wsp-msg' + (tipo ? ' wsp-msg--' + tipo : '');
    el.textContent = texto;
    if (tipo !== 'sys') {
      var t = document.createElement('span');
      t.className = 'wsp-time';
      t.textContent = horaCorta();
      el.appendChild(t);
    }
    cuerpo.appendChild(el);
    abajo();
    return el;
  }

  function abajo() { cuerpo.scrollTop = cuerpo.scrollHeight; }

  function escribiendo() {
    var el = document.createElement('div');
    el.className = 'wsp-typing';
    el.innerHTML = '<i></i><i></i><i></i>';
    cuerpo.appendChild(el);
    abajo();
    return el;
  }

  function chips() {
    var cont = document.createElement('div');
    cont.className = 'wsp-quick';
    CFG.rapidas.forEach(function (txt, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wsp-chip';
      b.textContent = txt;
      b.style.animationDelay = (i * 60) + 'ms';
      b.addEventListener('click', function () {
        input.value = txt + ': ';
        input.focus();
        autoAlto();
      });
      cont.appendChild(b);
    });
    cuerpo.appendChild(cont);
    abajo();
  }

  // El saludo se pinta una sola vez, la primera vez que se abre el panel.
  var saludado = false;
  function saludar() {
    if (saludado) return;
    saludado = true;
    var esc = escribiendo();
    setTimeout(function () {
      esc.remove();
      burbuja(CFG.saludo);
      if (!enHorario()) {
        setTimeout(function () {
          burbuja('Ahora estamos fuera de horario (' + CFG.horario + '), pero déjanos tu mensaje y te respondemos apenas abramos.');
        }, 450);
        setTimeout(chips, 800);
      } else {
        setTimeout(chips, 350);
      }
    }, 750);
  }

  // ── Abrir / cerrar ────────────────────────────
  function abrir() {
    quitarTeaser();
    panel.hidden = false;
    panel.classList.remove('is-closing');
    raiz.classList.add('is-open');
    boton.setAttribute('aria-expanded', 'true');
    boton.setAttribute('aria-label', 'Cerrar chat de WhatsApp');
    saludar();
    // En movil el teclado tapa media pantalla: mejor no forzar el foco.
    if (window.innerWidth > 768) setTimeout(function () { input.focus(); }, 320);
  }

  function cerrar() {
    panel.classList.add('is-closing');
    raiz.classList.remove('is-open');
    boton.setAttribute('aria-expanded', 'false');
    boton.setAttribute('aria-label', 'Abrir chat de WhatsApp');
    setTimeout(function () {
      panel.hidden = true;
      panel.classList.remove('is-closing');
    }, 200);
    boton.focus();
  }

  boton.addEventListener('click', function () {
    if (panel.hidden) abrir(); else cerrar();
  });
  raiz.querySelector('.wsp-close').addEventListener('click', cerrar);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) cerrar();
  });

  // ── Envio ─────────────────────────────────────
  function autoAlto() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  }
  input.addEventListener('input', autoAlto);

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit ? form.requestSubmit() : enviar();
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    enviar();
  });

  function enviar() {
    var texto = (input.value || '').trim();
    if (!texto) {
      input.classList.add('is-empty');
      setTimeout(function () { input.classList.remove('is-empty'); }, 400);
      input.focus();
      return;
    }

    var url = 'https://wa.me/' + CFG.telefono + '?text=' + encodeURIComponent(texto + contexto());

    burbuja(texto, 'out');
    input.value = '';
    autoAlto();

    // Se abre con un ancla sintetica en vez de window.open: al ir dentro del
    // gesto del usuario no la bloquea el navegador, y `window.open(...,
    // 'noopener')` devuelve null aunque haya funcionado, asi que no sirve para
    // detectar un bloqueo.
    var salto = document.createElement('a');
    salto.href = url;
    salto.target = '_blank';
    salto.rel = 'noopener';
    document.body.appendChild(salto);
    salto.click();
    salto.remove();

    setTimeout(function () {
      var sys = document.createElement('div');
      sys.className = 'wsp-msg wsp-msg--sys';
      sys.appendChild(document.createTextNode('Abrimos WhatsApp con tu mensaje. '));
      var a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = '¿No se abrió? Toca aquí';
      sys.appendChild(a);
      cuerpo.appendChild(sys);
      abajo();
    }, 500);
  }

  // ── Globo de invitacion (una vez por sesion) ──
  var teaser = null;
  function quitarTeaser() {
    if (!teaser) return;
    teaser.remove();
    teaser = null;
    try { sessionStorage.setItem('wsp_teaser', '1'); } catch (e) {}
  }

  function mostrarTeaser() {
    if (!panel.hidden) return;
    try { if (sessionStorage.getItem('wsp_teaser')) return; } catch (e) {}

    teaser = document.createElement('div');
    teaser.className = 'wsp-teaser';
    teaser.innerHTML =
      '¿Te ayudamos con tu pedido?' +
      '<small>Escríbenos por WhatsApp</small>' +
      '<button type="button" class="wsp-teaser-x" aria-label="Cerrar aviso">&times;</button>';

    teaser.addEventListener('click', function (e) {
      if (e.target.classList.contains('wsp-teaser-x')) { quitarTeaser(); return; }
      abrir();
    });

    raiz.appendChild(teaser);
    // Si nadie lo toca, se retira solo para no estorbar la lectura.
    setTimeout(quitarTeaser, 12000);
  }

  if (CFG.teaserMs > 0) setTimeout(mostrarTeaser, CFG.teaserMs);

  // ── API publica ───────────────────────────────
  // Permite abrir el chat desde cualquier boton del sitio:
  //   <button onclick="abrirChatWhatsApp()">Cotiza ahora</button>
  window.abrirChatWhatsApp = abrir;
  window.cerrarChatWhatsApp = cerrar;
})();
