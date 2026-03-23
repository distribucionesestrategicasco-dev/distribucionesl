# Distribuciones Estratégicas de la Costa S.A.S — Sitio Web

## 🌐 URLs

| Entorno | URL |
|---|---|
| **Producción (GitHub Pages)** | https://distribucionesestrategicasco-dev.github.io/distribuciones-web/ |
| **Repositorio** | https://github.com/distribucionesestrategicasco-dev/distribuciones-web |

---

## 📁 Estructura de archivos

```
raíz/
├── index.html               ← Inicio (hero + categorías)
├── catalogo.html            ← Catálogo + carrito + modal cotización
├── nosotros.html            ← Quiénes somos + contacto
├── seguimiento.html         ← Tracking de pedidos
├── acceso-interno.html      ← Panel admin (login + dashboard) — data-theme="dark"
├── css/
│   ├── base.css             ← Variables CSS, reset, botones Apple, modo claro/oscuro
│   ├── nav.css              ← Navbar
│   ├── pages.css            ← Hero, categorías, nosotros, tracking, login
│   ├── catalog.css          ← Catálogo, filtros, tarjetas
│   ├── cart.css             ← Carrito lateral
│   ├── modals.css           ← Modales globales
│   └── admin.css            ← Panel admin (modo oscuro fijo)
├── js/
│   ├── data.js              ← 68 productos + ADMIN_CREDENTIALS + ADMIN_EMAIL
│   ├── store.js             ← SHEETS_URL, estado global (cart, orders)
│   ├── catalog.js           ← renderCatalog(), applyFilter(), catalogSearch()
│   ├── cart.js              ← addToCart(), removeFromCart(), toggleCart(), updateCartUI()
│   ├── orders.js            ← submitOrder() — EmailJS admin + cliente
│   ├── admin.js             ← Panel admin completo (~2300 líneas)
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
- **IMPORTANTE:** `app.js` NO debe tener la función `initTheme()` — fue eliminada. Si reaparece, borrarla.

### Paleta modo claro (base.css :root)
```css
--bg:         #F5F7FA   /* fondo general */
--bg-white:   #FFFFFF
--text:       #1A2B3C   /* azul oscuro, no negro puro */
--text-mid:   #3D5166
--text-soft:  #6B8296
--blue:       #0071E3   /* botones primarios */
--brand-cyan: #00A896   /* acento teal */
```

---

## 🗂️ CSS cargado por página

| Página | CSS |
|---|---|
| `index.html` | base, nav, pages |
| `catalogo.html` | base, nav, pages, catalog, cart, modals |
| `nosotros.html` | base, nav, pages |
| `seguimiento.html` | base, nav, pages |
| `acceso-interno.html` | base, pages, catalog, cart, modals, admin |

> `acceso-interno.html` **NO carga `nav.css`** — tiene su propio sidebar, sin navbar pública.

---

## 🔧 Credenciales y servicios externos

### Admin login (fallback)
```javascript
// js/data.js
ADMIN_CREDENTIALS = { user: 'admin', pass: 'admin' }
ADMIN_EMAIL = 'distribucionesestrategicasco@gmail.com'
```

### Google Sheets
```javascript
// js/store.js — pedidos
SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyAgnsRnMBTGtAobCb7eNhOh3k4p2zk8hHI8HSJMTIkkuLfEvPcDITlv-afdhfL4JLU_g/exec'

// js/app.js — tracking
TRACKING_URL = 'https://script.google.com/macros/s/AKfycbxY_h2cYlBppEseH0xaVWwdaPyOnqGIL6qM0rxepg-JtckId87FrZpHwvil4Pykl3M4/exec'
```

### Supabase (PDFs Entregados)
```javascript
SUPA_URL    = 'https://jnxsofraqshxjboukiab.supabase.co'
SUPA_BUCKET = 'entregados'
// Path archivos: entregados/{orderId}/{timestamp}_{nombre}.pdf
```

### EmailJS
```javascript
EMAILJS_SERVICE  = 'service_zlygmxg'
EMAILJS_ADMIN_T  = 'template_5pq32d9'   // correo al admin
EMAILJS_CLIENT_T = 'template_0cjbbl9'   // correo al cliente
EMAILJS_KEY      = 'Z36EAC4PWgs02Gy3o'
```
SDK cargado en `catalogo.html` y `acceso-interno.html`:
```html
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
<script>emailjs.init({ publicKey: 'Z36EAC4PWgs02Gy3o' });</script>
```
Para Live Server local: autorizar `http://127.0.0.1:5500` en EmailJS Dashboard → Allowed origins.

---

## 🚀 Flujo de trabajo Git

**Repo local:** `C:\Users\Gala\Documents\GitHub\Web distribuciones`

```bash
# Inicio de sesión
git pull origin main

# Al terminar cambios
git add .
git commit -m "descripción"
git push origin main
# GitHub Pages redesplega en ~1 minuto automáticamente
```

> ⚠️ NO editar en GitHub.com con el lápiz si también se edita desde VS Code — causa conflictos.

---

## 📦 Flujo de pedidos

```
Cliente en catalogo.html
  → addToCart() → toggleCart() → openOrderForm()
  → submitOrder()
  → EmailJS (admin + cliente simultáneo)
  → saveOrderToSheet() → Google Sheets

Panel admin (acceso-interno.html):
  Pendiente → Cotizado → Aprobado → Despachado → Entregado
                                                    ↓
                                              PDF a Supabase
```

---

## 👥 Roles del panel admin

| Rol | Acceso |
|---|---|
| `administrador` | Todo — incluyendo Catálogo y Usuarios |
| `gestor` | Dashboard, Pedidos, Cotizaciones, Órdenes, Remisiones, Entregados |
| `vendedor` | Dashboard, Pedidos, Cotizaciones |
| `despachador` | Dashboard, Órdenes, Remisiones, Entregados |
| `lectura` | Todo en solo lectura |

---

## 🧭 Navegación multi-página (app.js)

```javascript
showPage('home')     → index.html
showPage('catalog')  → catalogo.html
showPage('about')    → nosotros.html
showPage('tracking') → seguimiento.html
showPage('admin')    → acceso-interno.html
```

**Excepción:** dentro de `acceso-interno.html`, `showPage('admin')` y `showPage('admin-login')` muestran/ocultan divs localmente sin redirigir.

**URL params:**
- `catalogo.html?cat=Oficina` → filtra por categoría al cargar
- `seguimiento.html?id=DIST-xxxx` → busca el pedido automáticamente

---

## 🎯 Estilo visual — Botones tipo Apple

- `border-radius: 980px` (píldora)
- `font-weight: 400` (ligero)
- `letter-spacing: -0.374px`
- Sin gradientes — colores planos
- Sin `transform` ni `box-shadow` en hover — solo cambio de color
- `transition: background 0.2s ease`

---

## ⏳ Pendientes

- [ ] Verificar modo claro funcionando en producción (GitHub Pages)
- [ ] Imágenes reales en productos (actualmente emojis)
- [ ] Dominio propio
- [ ] Notificación WhatsApp al cliente al despachar
- [ ] Migración completa a Supabase (reemplazar Google Sheets)
- [ ] Responsive móvil — catálogo y panel admin
- [ ] SEO básico: meta description, og:image

---

## 🐛 Historial de bugs resueltos

| Bug | Solución |
|---|---|
| Carrito no abría | Agregar HTML del carrito a ambos HTML que lo usan |
| EmailJS no enviaba al cliente | `orders.js` con `Promise.allSettled` para admin + cliente |
| Login admin recargaba la página | `app.js` detecta `acceso-interno.html` y maneja login localmente |
| Modal cotización no abría | Cambiar class a `modal-head`, quitar inline style |
| Botones nav en acceso-interno | Quitada la `<nav>` pública de `acceso-interno.html` |

---

*Última actualización: Marzo 2026*
