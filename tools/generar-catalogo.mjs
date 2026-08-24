/* ================================================================
   generar-catalogo.mjs — Pre-renderiza el catálogo como HTML estático

   POR QUÉ EXISTE
   El catálogo se pintaba 100% con JavaScript desde Supabase dentro de un
   <div> vacío. Google veía una página sin productos, y no existía ninguna
   URL por producto ni por categoría: cero long-tail. Este script consulta
   Supabase y escribe HTML real que el buscador puede leer sin ejecutar nada.

   QUÉ GENERA
     categoria/<slug>.html   → 1 por categoría   (/categoria/tecnologia)
     producto/<slug>.html    → 1 por producto    (/producto/toner-hp-negro)
     catalogo.html           → rellena la grilla entre los marcadores
     sitemap.xml             → todas las URLs del sitio

   CÓMO SE USA
     node tools/generar-catalogo.mjs

   El texto de cada ficha vive en tools/catalogo-seo.json (editable a mano).
   Si un producto de Supabase no está en ese archivo se genera igual, con un
   texto genérico, y el script lo avisa al final para que lo escribas.
   ================================================================ */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ  = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITIO = 'https://distcosta.com';
const WA    = '573023548415';

const SUPA_URL  = 'https://jnxsofraqshxjboukiab.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs';

const HOY = new Date().toISOString().slice(0, 10);

// ── Utilidades ──────────────────────────────────────────────────
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Igual que el slug de js/catalog.js: si cambia uno hay que cambiar el otro,
// porque las tarjetas del catálogo construyen el enlace a la ficha en cliente.
const slug = (s) => String(s ?? '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const jsonld = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

// ── Partes compartidas de la página ─────────────────────────────
function head({ title, meta, url, image, ld = [] }) {
  const css = ['animations', 'site', 'nav', 'catalog', 'ficha', 'footer'];
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(meta)}">
  <link rel="canonical" href="${url}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#0369A1">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_CO">
  <meta property="og:site_name" content="Distribuciones Estratégicas">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(meta)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${esc(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(meta)}">
  <meta name="twitter:image" content="${esc(image)}">
  <link rel="icon" href="/img/favicon-32.png">
${ld.map((o) => `  <script type="application/ld+json">${jsonld(o)}</script>`).join('\n')}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="${SUPA_URL}" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons"></noscript>
${css.map((c) => `  <link rel="stylesheet" href="/css/${c}.css?v=fase10">`).join('\n')}
</head>
<body>
  <a class="skip-link" href="#main">Saltar al contenido</a>
  <div id="scroll-progress"></div>`;
}

const NAV = `
  <nav>
    <a class="nav-logo" href="/">
      <img src="/img/logo_icon-80.png" alt="Distribuciones Estratégicas de la Costa" width="87" height="80" class="nav-logo-img">
      <div class="nav-logo-text">
        <span class="brand-main">Distribuciones Estratégicas</span>
        <span class="brand-sub">de la Costa S.A.S</span>
      </div>
    </a>
    <div class="nav-links">
      <a href="/">Inicio</a>
      <a href="/catalogo" class="active">Catálogo</a>
      <a href="/empresas">Empresas</a>
      <a href="/nosotros">Nosotros</a>
      <a href="/contacto">Contacto</a>
      <a href="/seguimiento">Seguimiento</a>
      <a href="/faq">FAQ</a>
    </div>
    <a class="nav-cta" href="https://wa.me/${WA}?text=Hola%2C%20quiero%20cotizar." target="_blank" rel="noopener">Cotiza ahora</a>
    <button class="nav-hamburger" onclick="toggleNav()" aria-label="Menú">
      <span></span><span></span><span></span>
    </button>
  </nav>
  <div class="nav-mobile-menu" id="nav-mobile-menu">
    <a href="/"><span class="material-icons">home</span> Inicio</a>
    <a href="/catalogo" class="active"><span class="material-icons">menu_book</span> Catálogo</a>
    <a href="/empresas"><span class="material-icons">business</span> Empresas</a>
    <a href="/nosotros"><span class="material-icons">groups</span> Nosotros</a>
    <a href="/contacto"><span class="material-icons">mail</span> Contacto</a>
    <a href="/seguimiento"><span class="material-icons">search</span> Seguimiento</a>
    <a href="/faq"><span class="material-icons">help_outline</span> FAQ</a>
    <button class="nav-mobile-cta" onclick="location.href='/catalogo'">Ver Catálogo <span class="material-icons">arrow_forward</span></button>
  </div>
  <div class="nav-overlay" id="nav-overlay" onclick="toggleNav()"></div>
`;

function footer(cats) {
  return `
  <footer>
    <div class="footer-grid">
      <div>
        <div class="footer-brand-name">Distribuciones Estratégicas</div>
        <div class="footer-brand-sub">de la Costa S.A.S</div>
        <div class="footer-desc">Proveedor de papelería, útiles de oficina y tecnología para empresas en Barranquilla y la Costa Caribe.</div>
        <a class="footer-contact-item" href="tel:+57${WA.slice(2)}">
          <span class="material-icons">phone</span>(57) 302 354 8415
        </a>
        <a class="footer-contact-item" href="mailto:distribucionesestrategicasco@gmail.com">
          <span class="material-icons">email</span>distribucionesestrategicasco@gmail.com
        </a>
        <div class="footer-contact-item">
          <span class="material-icons">location_on</span>Barranquilla, Colombia
        </div>
        <div class="footer-contact-item"><span class="material-icons">schedule</span>Lun a Vie · 8:00 a.m. – 5:00 p.m.</div>
      </div>
      <div>
        <div class="footer-col-title">Navegación</div>
        <a class="footer-link" href="/">Inicio</a>
        <a class="footer-link" href="/catalogo">Catálogo</a>
        <a class="footer-link" href="/empresas">Empresas</a>
        <a class="footer-link" href="/contacto">Contacto</a>
        <a class="footer-link" href="/nosotros">Nosotros</a>
        <a class="footer-link" href="/seguimiento">Seguimiento</a>
        <a class="footer-link" href="/faq">FAQ</a>
      </div>
      <div>
        <div class="footer-col-title">Categorías</div>
${cats.map((c) => `        <a class="footer-link" href="/categoria/${c.slug}">${esc(c.nombre)}</a>`).join('\n')}
      </div>
    </div>
    <div class="footer-bottom">
      <div class="footer-copy">© 2026 Distribuciones Estratégicas de la Costa S.A.S — Todos los derechos reservados · <a href="/privacidad" style="color:inherit">Política de Privacidad</a></div>
      <div class="footer-badge">Barranquilla, Colombia</div>
    </div>
  </footer>
  <script src="/js/app.js?v=fase10"></script>
</body>
</html>`;
}

// Cabecera decorativa igual a la del resto de páginas interiores.
function cabecera({ eyebrow, h1, grad, sub }) {
  return `
<section class="phead galaxia">
  <div class="hero-orb hero-orb-1"></div>
  <div class="hero-orb hero-orb-2"></div>
  <div class="hero-orb hero-orb-3"></div>
  <div class="hero-stars"></div>
  <div class="hero-noise"></div>
  <div class="wrap">
    <span class="eyebrow">${esc(eyebrow)}</span>
    <h1>${esc(h1)} ${grad ? `<span class="grad">${esc(grad)}</span>` : ''}</h1>
    ${sub ? `<p>${esc(sub)}</p>` : ''}
  </div>
</section>`;
}

function migas(items) {
  return `
    <nav class="migas" aria-label="Ruta de navegación">
${items.map((it, i) => (it.url
    ? `      <a href="${it.url}">${esc(it.nombre)}</a>`
    : `      <span aria-current="page">${esc(it.nombre)}</span>`
  ) + (i < items.length - 1 ? '\n      <span class="migas-sep" aria-hidden="true">/</span>' : '')).join('\n')}
    </nav>`;
}

function ldMigas(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.nombre, item: SITIO + (it.url || it.self),
    })),
  };
}

// ── Tarjeta de producto (misma estructura que js/catalog.js) ─────
function tarjeta(p) {
  const img = p.imagen_url
    ? `<img class="product-photo" src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" loading="lazy" decoding="async" width="300" height="220">`
    : `<span class="product-emoji">${esc(p.icono || '📦')}</span>`;
  return `      <div class="product-card" id="producto-${esc(p.id)}" data-product-id="${esc(p.id)}">
        <a class="product-img" href="/producto/${p.slug}" aria-label="Ver ${esc(p.nombre)}">${img}</a>
        <div class="product-info">
          <p class="product-cat">${esc(p.categoria)}</p>
          <h3 class="product-name"><a href="/producto/${p.slug}">${esc(p.nombre)}</a></h3>
          <p class="product-price">${p.precio_ref > 0 ? '$&nbsp;' + Math.round(p.precio_ref).toLocaleString('es-CO') : 'Precio a consultar'}</p>
          <p class="product-shipping"><span class="material-icons" style="font-size:13px;vertical-align:-2px">local_shipping</span> Envío a todo Colombia</p>
          <div class="add-btn-wrap"><a class="add-btn" href="/producto/${p.slug}">Ver producto</a></div>
        </div>
      </div>`;
}

// ── Página de categoría ─────────────────────────────────────────
function paginaCategoria(cat, prods, cats) {
  const url = `${SITIO}/categoria/${cat.slug}`;
  const ruta = [
    { nombre: 'Inicio', url: '/' },
    { nombre: 'Catálogo', url: '/catalogo' },
    { nombre: cat.nombre, self: `/categoria/${cat.slug}` },
  ];
  const ld = [
    ldMigas(ruta),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: cat.h1,
      numberOfItems: prods.length,
      itemListElement: prods.map((p, i) => ({
        '@type': 'ListItem', position: i + 1, name: p.nombre, url: `${SITIO}/producto/${p.slug}`,
      })),
    },
  ];

  return head({
    title: cat.title, meta: cat.meta, url,
    image: prods.find((p) => p.imagen_url)?.imagen_url || `${SITIO}/img/logo_full.png`,
    ld,
  }) + NAV + `
  <main id="main">
${cabecera({ eyebrow: 'Catálogo', h1: cat.h1.replace(/ en Barranquilla$/, ''), grad: 'en Barranquilla', sub: cat.intro })}
    <div class="wrap">
${migas(ruta)}
      <p class="cat-intro">${esc(cat.intro2)}</p>
      <p class="cat-count"><strong>${prods.length}</strong> producto${prods.length === 1 ? '' : 's'} en esta categoría</p>
      <div class="catalog-grid">
${prods.map(tarjeta).join('\n')}
      </div>

      <section class="cat-otras">
        <h2>Otras categorías del catálogo</h2>
        <div class="cat-otras-links">
${cats.filter((c) => c.slug !== cat.slug).map((c) => `          <a href="/categoria/${c.slug}">${esc(c.nombre)} <span>(${c.total})</span></a>`).join('\n')}
          <a href="/catalogo">Ver catálogo completo</a>
        </div>
      </section>

      <section class="cat-cta">
        <h2>¿Necesitas cotizar para tu empresa?</h2>
        <p>Arma tu lista en el catálogo o escríbenos directamente. Respondemos con precios y disponibilidad en menos de 24 horas hábiles, con factura electrónica y entrega el mismo día en Barranquilla.</p>
        <div class="cat-cta-btns">
          <a class="btn btn-primary" href="https://wa.me/${WA}?text=${encodeURIComponent('Hola, quiero cotizar productos de ' + cat.nombre + '.')}" target="_blank" rel="noopener">Cotizar por WhatsApp</a>
          <a class="btn btn-ghost" href="/empresas">Soluciones para empresas</a>
        </div>
      </section>
    </div>
  </main>
` + footer(cats);
}

// ── Página de producto ──────────────────────────────────────────
function paginaProducto(p, cat, relacionados, cats) {
  const url = `${SITIO}/producto/${p.slug}`;
  const imgs = (p.imagenes && p.imagenes.length ? p.imagenes : (p.imagen_url ? [p.imagen_url] : []));
  const ruta = [
    { nombre: 'Inicio', url: '/' },
    { nombre: 'Catálogo', url: '/catalogo' },
    { nombre: cat.nombre, url: `/categoria/${cat.slug}` },
    { nombre: p.nombre, self: `/producto/${p.slug}` },
  ];

  // Google exige offers, review o aggregateRating dentro de un Product;
  // declararlo sin ninguno de los tres genera un error crítico en Search
  // Console ("Fragmentos de productos"). Sin precio público no hay Offer
  // posible (un price 0 diría que el producto es gratis), así que el bloque
  // Product solo se emite cuando el producto tiene precio_ref en el panel.
  const ld = [ldMigas(ruta)];
  if (p.precio_ref > 0) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.nombre,
      description: p.seo.meta,
      category: cat.nombre,
      ...(imgs.length ? { image: imgs } : {}),
      brand: { '@type': 'Organization', name: 'Distribuciones Estratégicas de la Costa' },
      offers: {
        '@type': 'Offer',
        url,
        price: Math.round(p.precio_ref),
        priceCurrency: 'COP',
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
    });
  }

  const waTxt = encodeURIComponent(`Hola, quiero cotizar: ${p.nombre}`);

  const galeria = imgs.length
    ? `<div class="ficha-galeria">
          <div class="ficha-img-main">
            <img id="ficha-img" src="${esc(imgs[0])}" alt="${esc(p.nombre)}" width="520" height="520" fetchpriority="high" decoding="async">
          </div>
${imgs.length > 1 ? `          <div class="ficha-thumbs">
${imgs.map((u, i) => `            <button class="ficha-thumb${i === 0 ? ' active' : ''}" type="button" onclick="fichaImg(this,'${esc(u)}')" aria-label="Ver imagen ${i + 1} de ${esc(p.nombre)}"><img src="${esc(u)}" alt="${esc(p.nombre)} — imagen ${i + 1}" loading="lazy" decoding="async"></button>`).join('\n')}
          </div>` : ''}
        </div>`
    : `<div class="ficha-galeria">
          <div class="ficha-img-main ficha-img-vacia"><span>${esc(p.icono || '📦')}</span></div>
        </div>`;

  return head({
    title: `${p.nombre} en Barranquilla | Distribuciones Estratégicas`,
    meta: p.seo.meta,
    url,
    image: imgs[0] || `${SITIO}/img/logo_full.png`,
    ld,
  }) + NAV + `
  <main id="main">
    <div class="wrap">
${migas(ruta)}
      <article class="ficha">
        ${galeria}
        <div class="ficha-info">
          <a class="ficha-cat" href="/categoria/${cat.slug}">${esc(cat.nombre)}</a>
          <h1>${esc(p.nombre)}</h1>
          <p class="ficha-precio">${p.precio_ref > 0 ? '$ ' + Math.round(p.precio_ref).toLocaleString('es-CO') + ' COP' : 'Precio a consultar'}</p>
          <p class="ficha-stock"><span class="ficha-dot"></span>Disponible — entrega el mismo día en Barranquilla</p>

          <div class="ficha-texto">
            <p>${esc(p.seo.texto)}</p>
            ${p.seo.texto2 ? `<p>${esc(p.seo.texto2)}</p>` : ''}
          </div>

          <div class="ficha-btns">
            <a class="ficha-btn-wa" href="https://wa.me/${WA}?text=${waTxt}" target="_blank" rel="noopener">
              <span class="material-icons">chat</span> Cotizar por WhatsApp
            </a>
            <a class="ficha-btn-cart" href="/catalogo?add=${encodeURIComponent(p.id)}">
              <span class="material-icons">add_shopping_cart</span> Agregar al carrito
            </a>
          </div>

          <ul class="ficha-features">
            <li><span class="material-icons">bolt</span>Respuesta a tu cotización en menos de 24 h hábiles</li>
            <li><span class="material-icons">local_shipping</span>Entrega el mismo día en Barranquilla · 24-48 h en la Costa</li>
            <li><span class="material-icons">receipt_long</span>Factura electrónica y remisión de despacho</li>
            <li><span class="material-icons">inventory_2</span>Precio por volumen para pedidos corporativos</li>
          </ul>
        </div>
      </article>

${relacionados.length ? `      <section class="ficha-relacionados">
        <h2>Otros productos de ${esc(cat.nombre)}</h2>
        <div class="catalog-grid">
${relacionados.map(tarjeta).join('\n')}
        </div>
        <a class="ficha-vertodo" href="/categoria/${cat.slug}">Ver los ${cat.total} productos de ${esc(cat.nombre)}</a>
      </section>` : ''}
    </div>
  </main>
  <script>
    function fichaImg(btn, url) {
      document.getElementById('ficha-img').src = url;
      document.querySelectorAll('.ficha-thumb').forEach(function (t) { t.classList.remove('active'); });
      btn.classList.add('active');
    }
  </script>
` + footer(cats);
}

// ── Reemplazo de la grilla dentro de catalogo.html ──────────────
const MARCA_INI = '<!-- CATALOGO:INICIO — generado por tools/generar-catalogo.mjs, no editar a mano -->';
const MARCA_FIN = '<!-- CATALOGO:FIN -->';
const LD_INI = '<!-- CATALOGO:LD:INICIO — generado por tools/generar-catalogo.mjs -->';
const LD_FIN = '<!-- CATALOGO:LD:FIN -->';

const reEntre = (a, b) => new RegExp(
  a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
);

function patchCatalogo(prods, cats) {
  const f = path.join(RAIZ, 'catalogo.html');
  let html = fs.readFileSync(f, 'utf8');

  // 1) La grilla de tarjetas
  const grid = `${MARCA_INI}\n${prods.map(tarjeta).join('\n')}\n    ${MARCA_FIN}`;
  if (html.includes(MARCA_INI)) {
    html = html.replace(reEntre(MARCA_INI, MARCA_FIN), grid);
  } else {
    const vacio = '<div class="catalog-grid" id="catalog-grid"></div>';
    if (!html.includes(vacio)) throw new Error('No encuentro la grilla vacía en catalogo.html');
    html = html.replace(vacio, `<div class="catalog-grid" id="catalog-grid">\n    ${grid}\n    </div>`);
  }

  // 2) El ItemList completo en el <head>. Antes lo inyectaba catalog.js
  //    después del fetch; ahora va en el HTML, que es lo que el buscador lee.
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Catálogo de papelería, oficina y tecnología',
    numberOfItems: prods.length,
    itemListElement: prods.map((p, i) => ({
      '@type': 'ListItem', position: i + 1, name: p.nombre, url: `${SITIO}/producto/${p.slug}`,
    })),
  };
  const bloqueLd = `${LD_INI}\n  <script type="application/ld+json">${jsonld(ld)}</script>\n  ${LD_FIN}`;
  html = html.includes(LD_INI)
    ? html.replace(reEntre(LD_INI, LD_FIN), bloqueLd)
    : html.replace('</head>', `  ${bloqueLd}\n</head>`);

  // 3) Los enlaces de categoría del pie apuntan a las páginas nuevas
  html = html.replace(
    reEntre('<div class="footer-col-title">Categorías</div>', '</div>'),
    '<div class="footer-col-title">Categorías</div>\n'
      + cats.map((c) => `        <a class="footer-link" href="/categoria/${c.slug}">${esc(c.nombre)}</a>`).join('\n')
      + '\n      </div>',
  );

  fs.writeFileSync(f, html);
}

// ── Conteo de productos en las tarjetas de la home ──────────────
// Sin esto los números se quedarían pegados a la cifra del día que se
// escribieron, y este script corre solo todas las noches.
function patchHome(cats) {
  const f = path.join(RAIZ, 'index.html');
  let html = fs.readFileSync(f, 'utf8');
  for (const c of cats) {
    html = html.replace(
      new RegExp(`(<span class="ccount" data-cat="${c.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">)[^<]*(</span>)`),
      `$1${c.total} producto${c.total === 1 ? '' : 's'}$2`,
    );
  }
  fs.writeFileSync(f, html);
}

// ── Sitemap ─────────────────────────────────────────────────────
function sitemap(cats, prods) {
  const fijas = [
    ['/', '1.0', 'weekly'], ['/catalogo', '0.9', 'weekly'], ['/empresas', '0.8', 'monthly'],
    ['/nosotros', '0.7', 'monthly'], ['/contacto', '0.7', 'monthly'], ['/faq', '0.6', 'monthly'],
    ['/seguimiento', '0.4', 'monthly'], ['/privacidad', '0.3', 'yearly'],
  ];
  const urls = [
    ...fijas.map(([u, p, c]) => [u, p, c]),
    ...cats.map((c) => [`/categoria/${c.slug}`, '0.8', 'weekly']),
    ...prods.map((p) => [`/producto/${p.slug}`, '0.6', 'monthly']),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, pr, ch]) => `  <url><loc>${SITIO}${u}</loc><lastmod>${HOY}</lastmod><changefreq>${ch}</changefreq><priority>${pr}</priority></url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(RAIZ, 'sitemap.xml'), xml);
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  const seo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools/catalogo-seo.json'), 'utf8'));

  const r = await fetch(`${SUPA_URL}/rest/v1/productos?select=*&activo=eq.true&order=nombre.asc`, {
    headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` },
  });
  if (!r.ok) throw new Error(`Supabase respondió ${r.status}`);
  const prods = await r.json();
  if (!Array.isArray(prods) || !prods.length) throw new Error('Supabase no devolvió productos');

  const sinTexto = [];
  const slugsVistos = new Map();

  for (const p of prods) {
    p.slug = slug(p.nombre);
    if (slugsVistos.has(p.slug)) {
      // Dos productos con el mismo slug se pisarían el archivo. Se desempata
      // con el id para no perder ninguna ficha.
      p.slug = `${p.slug}-${String(p.id).slice(0, 6)}`;
    }
    slugsVistos.set(p.slug, p.nombre);

    const s = seo.productos[p.nombre];
    if (s) {
      p.seo = s;
    } else {
      sinTexto.push(p.nombre);
      p.seo = {
        meta: `${p.nombre} para empresas en Barranquilla y la Costa Caribe. Cotiza en línea y recibe el mismo día.`,
        texto: `${p.nombre}, disponible en nuestro catálogo de ${p.categoria.toLowerCase()} para empresas, instituciones y entidades en Barranquilla y la Costa Caribe.`,
        texto2: 'Trabajamos por cotización: escríbenos con la cantidad que necesitas y te respondemos con precio y disponibilidad en menos de 24 horas hábiles.',
      };
    }
  }

  // Categorías presentes en los datos, en el orden del archivo de copy.
  const cats = Object.entries(seo.categorias)
    .filter(([nombre]) => prods.some((p) => p.categoria === nombre))
    .map(([nombre, c]) => ({
      ...c, nombre, total: prods.filter((p) => p.categoria === nombre).length,
    }));

  const huerfanas = [...new Set(prods.map((p) => p.categoria))].filter((c) => !seo.categorias[c]);
  if (huerfanas.length) {
    throw new Error(`Categorías sin copy en tools/catalogo-seo.json: ${huerfanas.join(', ')}`);
  }

  // Limpieza: se borra lo generado antes para que un producto desactivado en
  // el panel no deje su ficha huérfana publicada.
  for (const dir of ['categoria', 'producto']) {
    const d = path.join(RAIZ, dir);
    if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) {
      if (f.endsWith('.html')) fs.unlinkSync(path.join(d, f));
    } else fs.mkdirSync(d, { recursive: true });
  }

  for (const cat of cats) {
    const suyos = prods.filter((p) => p.categoria === cat.nombre);
    fs.writeFileSync(path.join(RAIZ, 'categoria', `${cat.slug}.html`), paginaCategoria(cat, suyos, cats));
  }

  for (const p of prods) {
    const cat = cats.find((c) => c.nombre === p.categoria);
    const rel = prods.filter((x) => x.categoria === p.categoria && x.id !== p.id).slice(0, 4);
    fs.writeFileSync(path.join(RAIZ, 'producto', `${p.slug}.html`), paginaProducto(p, cat, rel, cats));
  }

  patchCatalogo(prods, cats);
  patchHome(cats);
  sitemap(cats, prods);

  console.log(`✓ ${cats.length} páginas de categoría`);
  console.log(`✓ ${prods.length} fichas de producto`);
  console.log('✓ catalogo.html pre-renderizado');
  console.log('✓ conteo de categorías de la home actualizado');
  console.log('✓ sitemap.xml actualizado');
  if (sinTexto.length) {
    console.log(`\n⚠ ${sinTexto.length} producto(s) sin texto propio en tools/catalogo-seo.json`);
    console.log('  (se generaron con texto genérico — conviene escribirles uno):');
    sinTexto.forEach((n) => console.log(`   - ${n}`));
  }
}

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
