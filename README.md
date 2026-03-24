# Distribuciones Estratégicas de la Costa S.A.S — Sitio Web

## 🌐 URLs

| Entorno | URL |
|---|---|
| **Producción (GitHub Pages)** | https://distribucionesestrategicasco-dev.github.io/distribucionesl/ |
| **Repositorio activo** | https://github.com/distribucionesestrategicasco-dev/distribucionesl |

---

## 📁 Estructura de archivos

```
raíz/
├── index.html               ← Inicio (hero + categorías + footer + WhatsApp)
├── catalogo.html            ← Catálogo + carrito + modal + footer + WhatsApp
├── nosotros.html            ← Quiénes somos con acordeón + footer + WhatsApp
├── seguimiento.html         ← Tracking de pedidos + footer + WhatsApp
├── acceso-interno.html      ← Panel admin — data-theme="dark" (NO tocar)
├── css/
│   ├── base.css             ← Variables CSS, reset, modo claro/oscuro
│   ├── nav.css              ← Navbar + menú hamburguesa móvil
│   ├── pages.css            ← Hero, categorías, nosotros, tracking, login
│   ├── catalog.css          ← Catálogo, filtros, tarjetas producto
│   ├── cart.css             ← Carrito flotante (fixed, transform)
│   ├── modals.css           ← Modales globales
│   ├── admin.css            ← Panel admin (modo oscuro fijo)
│   ├── footer.css           ← Footer corporativo navy
│   └── whatsapp.css         ← Botón WhatsApp flotante
├── js/
│   ├── data.js              ← 68 productos + ADMIN_CREDENTIALS + ADMIN_EMAIL
│   ├── store.js             ← SHEETS_URL, estado global
│   ├── catalog.js           ← renderCatalog(), applyFilter(), catalogSearch()
│   ├── cart.js              ← addToCart(), removeFromCart(), toggleCart()
│   ├── orders.js            ← submitOrder() — EmailJS admin + cliente
│   ├── admin.js             ← Panel admin completo (~2295 líneas)
│   └── app.js               ← showPage(), tracking, navegación multi-página
└── img/
    ├── logo_icon.png        ← Logo nav
    ├── logo_full.png        ← Logo hero deco
    └── bg-home.jpg          ← Fondo hero
```

---

## 🎨 Modo de color

- **Páginas públicas**: Modo claro — `<html lang="es">` sin `data-theme`
- **Panel admin**: Modo oscuro fijo — `<html lang="es" data-theme="dark">`
- **CRÍTICO:** `app.js` NO tiene `initTheme()` — si reaparece, borrarla

### Paleta modo claro
```css
--bg: #F5F7FA | --bg-white: #FFFFFF | --text: #1A2B3C
--text-mid: #3D5166 | --text-soft: #6B8296
--blue: #0071E3 | --brand-cyan: #00A896
```

---

## 📱 Menú hamburguesa móvil

Cada HTML público tiene este patrón en el nav:

```html
<!-- Dentro del <nav> -->
<button class="nav-hamburger" onclick="toggleNav()" aria-label="Menú">
  <span></span><span></span><span></span>
</button>

<!-- Fuera del nav -->
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

- `.cart-btn-wrap` está **fuera del `<nav>`**, directo en el `<body>` en `catalogo.html`
- `cart.css` usa `transform: translateX(100%)` para ocultar — NO `right: -500px`
- `.cart-panel.open` tiene `transform: translateX(0)`
- En móvil: `bottom: 24px; right: 20px; width: 52px; height: 52px`
- Panel carrito: `width: 100vw` en móvil

---

## 💬 WhatsApp flotante

**Número:** +57 302 354 8415

Aparece en las 4 páginas públicas — esquina inferior izquierda, botón verde con pulso.

```html
<div class="wa-float">
  <a class="wa-btn"
     href="https://wa.me/573023548415?text=Hola%2C%20me%20gustar%C3%ADa%20obtener%20m%C3%A1s%20informaci%C3%B3n%20sobre%20sus%20productos."
     target="_blank" rel="noopener" aria-label="Chatear por WhatsApp">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
    <span class="wa-tooltip">💬 ¡Escríbenos!</span>
  </a>
</div>
```

---

## 🦶 Footer

Presente en los 4 HTMLs públicos. Carga `css/footer.css`. Estructura:

```
footer
├── .footer-grid (3 columnas: 2fr 1fr 1fr)
│   ├── Col 1: Logo + descripción + contacto (tel, email, ciudad)
│   ├── Col 2: Navegación (Inicio, Catálogo, Nosotros, Seguimiento)
│   └── Col 3: Categorías (Oficina, Papelería, Tecnología, Equipos, Otros)
└── .footer-bottom: Copyright + badge "Barranquilla, Colombia"
```

Fondo `var(--brand-navy)` — oscuro, contrasta con modo claro.

---

## 📐 Responsive — fixes aplicados

| Problema | Solución |
|---|---|
| Nav corrido en catálogo desktop | Agrupar CTA + hamburguesa en un `div` flex |
| Hero pegado al nav | `<main style="padding-top: 64px;">` en todos los HTMLs |
| Carrito genera scroll horizontal | `cart.css` usa `transform` en vez de `right: -500px` |
| Overflow horizontal | `html { overflow-x: hidden }` en `base.css` |
| Filtros catálogo en móvil | `top: 64px` y `padding: 120px 24px 48px` en hero |

---

## 🔧 Credenciales y servicios

### Contacto empresa
```
Teléfono: +57 302 354 8415
Email:    distribucionesestrategicasco@gmail.com
Ciudad:   Barranquilla, Colombia
```

### Admin login (cambiar al final del proyecto)
```javascript
// js/data.js
ADMIN_CREDENTIALS = { user: 'admin', pass: 'admin' }
```

### Google Sheets
```javascript
SHEETS_URL   = 'https://script.google.com/macros/s/AKfycbyAgnsRnMBTGtAobCb7eNhOh3k4p2zk8hHI8HSJMTIkkuLfEvPcDITlv-afdhfL4JLU_g/exec'
TRACKING_URL = 'https://script.google.com/macros/s/AKfycbxY_h2cYlBppEseH0xaVWwdaPyOnqGIL6qM0rxepg-JtckId87FrZpHwvil4Pykl3M4/exec'
```

### Supabase
```javascript
SUPA_URL    = 'https://jnxsofraqshxjboukiab.supabase.co'
SUPA_BUCKET = 'entregados'   // PDFs pedidos entregados
// Próximo: bucket 'productos' para imágenes del catálogo
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

**Repo local:** `C:\Users\Gala\Documents\GitHub\distribucionesl`

```bash
git pull origin main
git add -A
git commit -m "descripción"
git push origin main
# GitHub Pages redesplega en ~1 minuto
```

> ⚠️ NUNCA editar archivos en GitHub.com — trunca archivos grandes

---

## 📦 Flujo de pedidos

```
Cliente → addToCart() → toggleCart() → openOrderForm()
→ submitOrder() → EmailJS (admin + cliente) → saveOrderToSheet()

Panel admin: Pendiente → Cotizado → Aprobado → Despachado → Entregado → PDF Supabase
```

---

## 👥 Roles del panel admin

| Rol | Acceso |
|---|---|
| `administrador` | Todo |
| `gestor` | Dashboard, Pedidos, Cotizaciones, Órdenes, Remisiones, Entregados |
| `vendedor` | Dashboard, Pedidos, Cotizaciones |
| `despachador` | Dashboard, Órdenes, Remisiones, Entregados |
| `lectura` | Todo en solo lectura |

---

## ⏳ Pendientes

- [ ] **SEO** — meta description y og:image en cada página ← SIGUIENTE
- [ ] **Imágenes reales** en productos — crear bucket `productos` en Supabase
- [ ] **Dominio propio**
- [ ] **Carrito persistente** — guardar en localStorage
- [ ] **Notificación WhatsApp** al cliente al despachar
- [ ] **Migración a Supabase** — reemplazar Google Sheets
- [ ] **Responsive móvil** — panel admin
- [ ] **Cambiar credenciales admin** — al final del proyecto

---

## ✅ Completado

- [x] Modo claro en páginas públicas
- [x] Menú hamburguesa móvil
- [x] Carrito flotante (fuera del nav, con transform)
- [x] Footer en las 4 páginas públicas
- [x] Botón WhatsApp flotante con número +57 302 354 8415
- [x] Icono WhatsApp SVG correcto en nosotros.html
- [x] Correo en texto plano en nosotros.html
- [x] Acordeón en nosotros con marcas, cobertura y FAQ
- [x] GitHub Pages activo en repo `distribucionesl`

---

## 🐛 Historial de bugs resueltos

| Bug | Solución |
|---|---|
| Login admin no funcionaba | Restaurar `admin.js` desde commit `e659405` |
| `initTheme()` forzaba modo oscuro | Eliminada de `app.js` |
| Carrito dentro del nav | Mover `.cart-btn-wrap` fuera del `<nav>` |
| Carrito genera scroll horizontal | `transform: translateX(100%)` en vez de `right: -500px` |
| Hamburguesa no aparecía | HTML del botón directo en el `<nav>`, no via JS |
| Nav corrido a la derecha en catálogo | Agrupar CTA + hamburguesa en `div` flex |
| Netlify sin créditos | Migrado a GitHub Pages |
| Editor GitHub truncaba admin.js | NUNCA editar archivos grandes en GitHub.com |
| Logo no aparecía | Renombrar `logo.png` a `logo_icon.png` en `img/` |
| SVG WhatsApp vacío en nosotros | Agregar `<path>` completo manualmente |
| Cloudflare ofuscaba el correo | Correo en texto plano sin href |

---

*Última actualización: Marzo 2026*
