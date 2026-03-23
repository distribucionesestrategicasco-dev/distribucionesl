# Distribuciones Estratégicas de la Costa S.A.S — Sitio Web

## 🌐 URLs

| Entorno | URL |
|---|---|
| **Producción (GitHub Pages)** | https://distribucionesestrategicasco-dev.github.io/distribucionesl/ |
| **Repositorio activo** | https://github.com/distribucionesestrategicasco-dev/distribucionesl |
| ~~Repo anterior (no usar)~~ | ~~distribuciones-web~~ |

---

## 📁 Estructura de archivos

```
raíz/
├── index.html               ← Inicio (hero + categorías)
├── catalogo.html            ← Catálogo + carrito + modal cotización
├── nosotros.html            ← Quiénes somos con acordeón completo
├── seguimiento.html         ← Tracking de pedidos
├── acceso-interno.html      ← Panel admin (login + dashboard) — data-theme="dark"
├── css/
│   ├── base.css             ← Variables CSS, reset, modo claro/oscuro
│   ├── nav.css              ← Navbar + menú hamburguesa móvil
│   ├── pages.css            ← Hero, categorías, nosotros, tracking, login
│   ├── catalog.css          ← Catálogo, filtros, tarjetas producto
│   ├── cart.css             ← Carrito flotante (fixed bottom-right)
│   ├── modals.css           ← Modales globales
│   └── admin.css            ← Panel admin (modo oscuro fijo)
├── js/
│   ├── data.js              ← 68 productos + ADMIN_CREDENTIALS + ADMIN_EMAIL
│   ├── store.js             ← SHEETS_URL, estado global
│   ├── catalog.js           ← renderCatalog(), applyFilter(), catalogSearch()
│   ├── cart.js              ← addToCart(), removeFromCart(), toggleCart()
│   ├── orders.js            ← submitOrder() — EmailJS admin + cliente
│   ├── admin.js             ← Panel admin completo (~2295 líneas)
│   └── app.js               ← showPage(), tracking, navegación multi-página
└── img/
    ├── logo_icon.png
    ├── logo_full.png
    └── bg-home.jpg
```

---

## 🎨 Modo de color

- **Páginas públicas** (`index`, `catalogo`, `nosotros`, `seguimiento`): **Modo claro** — `<html lang="es">` sin `data-theme`
- **Panel admin** (`acceso-interno.html`): **Modo oscuro fijo** — `<html lang="es" data-theme="dark">`
- **CRÍTICO:** `app.js` NO tiene `initTheme()` — fue eliminada. Si reaparece, borrarla inmediatamente.

### Paleta modo claro (base.css :root)
```css
--bg:         #F5F7FA
--bg-white:   #FFFFFF
--text:       #1A2B3C   /* azul oscuro */
--text-mid:   #3D5166
--text-soft:  #6B8296
--blue:       #0071E3
--brand-cyan: #00A896
```

---

## 🗂️ CSS por página

| Página | CSS cargado |
|---|---|
| `index.html` | base, nav, pages |
| `catalogo.html` | base, nav, pages, catalog, cart, modals |
| `nosotros.html` | base, nav, pages |
| `seguimiento.html` | base, nav, pages |
| `acceso-interno.html` | base, pages, catalog, cart, modals, admin |

> `acceso-interno.html` NO carga `nav.css` — tiene su propio sidebar.

---

## 📱 Menú hamburguesa móvil

Implementado en los 4 HTMLs públicos. Cada HTML tiene:

```html
<!-- Dentro del <nav> al final, antes de </nav> -->
<button class="nav-hamburger" onclick="toggleNav()" aria-label="Menú">
  <span></span><span></span><span></span>
</button>

<!-- Fuera del nav, después de </nav> -->
<div class="nav-mobile-menu" id="nav-mobile-menu">
  <a href="index.html">🏠 Inicio</a>
  <a href="catalogo.html">📋 Catálogo</a>
  <a href="nosotros.html">👥 Nosotros</a>
  <a href="seguimiento.html">🔍 Seguimiento</a>
  <button class="nav-mobile-cta" onclick="location.href='catalogo.html'">Ver Catálogo →</button>
</div>
<div class="nav-overlay" id="nav-overlay" onclick="toggleNav()"></div>
```

Y antes del `</body>`:
```html
<script>
  function toggleNav() {
    const menu = document.getElementById('nav-mobile-menu');
    const overlay = document.getElementById('nav-overlay');
    const btn = document.querySelector('.nav-hamburger');
    const isOpen = menu.classList.contains('open');
    menu.classList.toggle('open', !isOpen);
    overlay.classList.toggle('open', !isOpen);
    btn.classList.toggle('open', !isOpen);
    document.body.style.overflow = isOpen ? '' : 'hidden';
  }
</script>
```

---

## 🛒 Carrito flotante

- El `.cart-btn-wrap` está **fuera del `<nav>`**, directo en el `<body>` en `catalogo.html`
- `cart.css` lo posiciona con `position: fixed; bottom: 28px; right: 28px`
- En móvil: `bottom: 24px; right: 20px` y `width: 52px; height: 52px`
- El panel del carrito ocupa `100vw` en móvil

---

## 📐 Responsive — problemas conocidos y fixes

### Nav fijo
El nav es `position: fixed; height: 64px`. Todos los `<main>` deben tener:
```html
<main style="padding-top: 64px;">
```

### Hero catálogo en móvil
`catalog.css` @media 768px tiene:
```css
.catalog-hero { padding: 120px 24px 48px; }
.catalog-hero h1 { font-size: 28px; }
.catalog-hero p { font-size: 15px; }
.catalog-filters { top: 64px; }
```

### Hero inicio en móvil — PENDIENTE
`pages.css` @media 768px tiene `.hero { padding: 60px 20px; }` — hay que cambiar a `padding: 80px 20px 60px` para separar el texto "Líderes en papelería" del nav.

---

## 📄 nosotros.html — Acordeón

Secciones con acordeón expandible:
- **La Empresa:** Misión, Visión, Historia
- **Nuestros Valores:** Calidad, Integridad, Innovación, Servicio
- **Lo que Ofrecemos:** Papelería, Tecnología, Equipos, Proceso de compra
- **Marcas aliadas:** BIC, Faber-Castell, Pelikan, Reprograf, Kingston, Logitech, Casio, Colbón, Artesco, Sharpie, Leitz, Staedtler
- **Cobertura:** Barranquilla (mismo día), Cartagena, Santa Marta, Valledupar, Montería (24-48h), resto del país
- **FAQ:** 6 preguntas frecuentes

---

## 🔧 Credenciales y servicios

### Admin login (fallback)
```javascript
// js/data.js
ADMIN_CREDENTIALS = { user: 'admin', pass: 'admin' }
ADMIN_EMAIL = 'distribucionesestrategicasco@gmail.com'
```

### Google Sheets
```javascript
SHEETS_URL   = 'https://script.google.com/macros/s/AKfycbyAgnsRnMBTGtAobCb7eNhOh3k4p2zk8hHI8HSJMTIkkuLfEvPcDITlv-afdhfL4JLU_g/exec'
TRACKING_URL = 'https://script.google.com/macros/s/AKfycbxY_h2cYlBppEseH0xaVWwdaPyOnqGIL6qM0rxepg-JtckId87FrZpHwvil4Pykl3M4/exec'
```

### Supabase (PDFs Entregados)
```javascript
SUPA_URL    = 'https://jnxsofraqshxjboukiab.supabase.co'
SUPA_BUCKET = 'entregados'
```

### EmailJS
```javascript
EMAILJS_SERVICE  = 'service_zlygmxg'
EMAILJS_ADMIN_T  = 'template_5pq32d9'
EMAILJS_CLIENT_T = 'template_0cjbbl9'
EMAILJS_KEY      = 'Z36EAC4PWgs02Gy3o'
```

---

## 🚀 Flujo de trabajo Git

**Repo local:** `C:\Users\Gala\Documents\GitHub\Web distribuciones`

```bash
git pull origin main
git add -A
git commit -m "descripción"
git push origin main
# GitHub Pages redesplega en ~1 minuto
```

> ⚠️ NUNCA editar archivos directamente en GitHub.com con el editor web — trunca archivos grandes como `admin.js`

---

## 📦 Flujo de pedidos

```
Cliente → addToCart() → toggleCart() → openOrderForm()
→ submitOrder() → EmailJS (admin + cliente) → saveOrderToSheet()

Panel admin: Pendiente → Cotizado → Aprobado → Despachado → Entregado → PDF a Supabase
```

---

## 👥 Roles del panel admin

| Rol | Acceso |
|---|---|
| `administrador` | Todo — Catálogo y Usuarios |
| `gestor` | Dashboard, Pedidos, Cotizaciones, Órdenes, Remisiones, Entregados |
| `vendedor` | Dashboard, Pedidos, Cotizaciones |
| `despachador` | Dashboard, Órdenes, Remisiones, Entregados |
| `lectura` | Todo en solo lectura |

---

## ⏳ Pendientes

- [ ] **Hero inicio móvil** — `pages.css` @media 768px: cambiar `.hero { padding: 60px 20px }` a `padding: 80px 20px 60px`
- [ ] Cambiar credenciales admin (actualmente `admin/admin`)
- [ ] Imágenes reales en productos (actualmente emojis)
- [ ] Dominio propio
- [ ] Notificación WhatsApp al cliente al despachar
- [ ] Migración completa a Supabase (reemplazar Google Sheets)
- [ ] Responsive móvil completo — panel admin
- [ ] SEO: meta description, og:image

---

## 🐛 Historial de bugs resueltos

| Bug | Solución |
|---|---|
| Login admin no funcionaba | Restaurar `admin.js` desde commit `e659405` via `git checkout` |
| `initTheme()` forzaba modo oscuro | Eliminada la función de `app.js` |
| Carrito dentro del nav | Mover `.cart-btn-wrap` fuera del `<nav>` en `catalogo.html` |
| Hamburguesa no aparecía en móvil | HTML del botón directo en el `<nav>`, no via JS dinámico |
| GitHub Pages no desplegaba | Repo activo es `distribucionesl`, no `distribuciones-web` |
| Editor GitHub truncaba `admin.js` | NUNCA editar archivos grandes con el editor web de GitHub |
| Netlify sin créditos | Migrado a GitHub Pages (gratis, ilimitado) |

---

*Última actualización: Marzo 2026*
