/* ================================================
   nav-mobile.js — Menú hamburguesa para móvil
   Incluir en todos los HTML públicos
   ================================================ */
(function() {
  // Inyectar hamburguesa en la nav existente
  const nav = document.querySelector('nav');
  if (!nav) return;

  // Botón hamburguesa
  const hamburger = document.createElement('button');
  hamburger.className = 'nav-hamburger';
  hamburger.setAttribute('aria-label', 'Menú');
  hamburger.innerHTML = '<span></span><span></span><span></span>';
  nav.appendChild(hamburger);

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'nav-overlay';
  document.body.appendChild(overlay);

  // Menú móvil — leer los links del nav desktop
  const mobileMenu = document.createElement('div');
  mobileMenu.className = 'nav-mobile-menu';

  // Copiar links del nav
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    navLinks.querySelectorAll('a').forEach(link => {
      const mLink = document.createElement('a');
      mLink.href = link.href;
      if (link.classList.contains('active')) mLink.classList.add('active');
      // Emoji por página
      const emojis = {
        'index.html': '🏠', 'catalogo.html': '📋',
        'nosotros.html': '👥', 'seguimiento.html': '🔍'
      };
      const page = link.getAttribute('href') || '';
      const key = Object.keys(emojis).find(k => page.includes(k)) || '';
      mLink.textContent = (emojis[key] || '•') + ' ' + link.textContent.trim();
      mLink.addEventListener('click', closeMenu);
      mobileMenu.appendChild(mLink);
    });
  }

  // Botón CTA móvil
  const navCta = document.querySelector('.nav-cta');
  if (navCta) {
    const mobileCta = document.createElement('button');
    mobileCta.className = 'nav-mobile-cta';
    mobileCta.textContent = navCta.textContent;
    mobileCta.addEventListener('click', () => {
      closeMenu();
      if (navCta.onclick) navCta.onclick();
      else location.href = 'catalogo.html';
    });
    mobileMenu.appendChild(mobileCta);
  }

  document.body.appendChild(mobileMenu);

  // Abrir / cerrar
  function openMenu() {
    hamburger.classList.add('open');
    mobileMenu.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    if (mobileMenu.classList.contains('open')) closeMenu();
    else openMenu();
  });
  overlay.addEventListener('click', closeMenu);

  // Cerrar al cambiar tamaño a desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMenu();
  });
})();
