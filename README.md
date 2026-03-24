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
│   ├── data.js              ← 68 productos + ADMIN_CREDENTIALS (fallback) + ADMIN_EMAIL
│   ├── store.js             ← SHEETS_URL, estado global
│   ├── catalog.js           ← renderCatalog(), applyFilter(), catalogSearch()
│   ├── cart.js              ← addToCart(), removeFromCart(), toggleCart()
│   ├── orders.js            ← submitOrder() — EmailJS admin + cliente
│   ├── admin.js             ← Panel admin completo (~2268 líneas)
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

---

## 🔐 Login del Panel Admin

El login usa **Supabase** como backend seguro — las credenciales NO están en el código.

**Credenciales actuales:**
```
Usuario:    Gala
Contraseña: *B4rranquilla.1524*
```

**Cómo funciona:**
```
Admin ingresa usuario/contraseña
→ Se consulta tabla "usuarios" en Supabase
→ Se verifica activo=true
→ Se compara la contraseña en JavaScript
→ Si coincide, entra al panel con su rol
```

**Fallback:** Si Supabase falla, existe `ADMIN_CREDENTIALS` en `data.js` como respaldo (actualmente `admin/admin` — cambiar al finalizar).

### Gestión de usuarios
Desde el panel admin → sección **Usuarios** — crear, editar, activar/desactivar y eliminar sin tocar Supabase manualmente.

También se puede desde el SQL Editor de Supabase:
```
https://supabase.com/dashboard/project/jnxsofraqshxjboukiab/editor
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

## 📱 Menú hamburguesa móvil

Cada HTML público tiene este patrón en el nav:

```html
<button class="nav-hamburger" onclick="toggleNav()" aria-label="Menú">
  <span></span><span></span><span></span>
</button>
<div class="nav-mobile-menu" id="nav-mobile-menu">...</div>
<div class="nav-overlay" id="nav-overlay" onclick="toggleNav()"></div>
```

---

## 🛒 Carrito flotante

- `.cart-btn-wrap` fuera del `<nav>`, directo en el `<body>`
- `cart.css` usa `transform: translateX(100%)` para ocultar — NO `right: -500px`
- `.cart-panel.open` tiene `transform: translateX(0)`

---

## 💬 WhatsApp flotante

**Número:** +57 302 354 8415 — esquina inferior izquierda en las 4 páginas públicas.

### Notificación al despachar
En `admin.js` → `doMarkDispatched()` — al confirmar un despacho se abre WhatsApp con mensaje listo para enviar al cliente. El número se toma del campo `phone` del pedido.

---

## 🔧 Credenciales y servicios

### Supabase
```
URL:      https://jnxsofraqshxjboukiab.supabase.co
Bucket:   entregados    ← PDFs pedidos entregados
Tabla:    usuarios      ← Login del panel admin
ANON KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs
```

### Google Sheets
```
SHEETS_URL   = https://script.google.com/macros/s/AKfycbyAgnsRnMBTGtAobCb7eNhOh3k4p2zk8hHI8HSJMTIkkuLfEvPcDITlv-afdhfL4JLU_g/exec
TRACKING_URL = https://script.google.com/macros/s/AKfycbxY_h2cYlBppEseH0xaVWwdaPyOnqGIL6qM0rxepg-JtckId87FrZpHwvil4Pykl3M4/exec
```

### EmailJS
```
SERVICE:  service_zlygmxg
ADMIN_T:  template_5pq32d9
CLIENT_T: template_0cjbbl9
KEY:      Z36EAC4PWgs02Gy3o
```

### Contacto empresa
```
Teléfono: +57 302 354 8415
Email:    distribucionesestrategicasco@gmail.com
Ciudad:   Barranquilla, Colombia
```

---

## 🚀 Flujo de trabajo Git

**Repo local:** `C:\Users\Gala\Documents\GitHub\distribucionesl`

```bash
git pull origin main
git add -A
git commit -m "descripción"
git push origin main
```

> ⚠️ NUNCA editar archivos en GitHub.com — trunca archivos grandes
> ⚠️ GitHub Pages tarda 3-10 min en propagar — forzar con:
> `git commit --allow-empty -m "force deploy" && git push origin main`

---

## 📦 Flujo de pedidos

```
Cliente → addToCart() → toggleCart() → openOrderForm()
→ submitOrder() → EmailJS (admin + cliente) → saveOrderToSheet()

Panel admin: Pendiente → Cotizado → Aprobado → Despachado → Entregado → PDF Supabase
```

---

## ⏳ Pendientes

- [ ] **Imágenes reales en productos** — crear bucket `productos` en Supabase y actualizar `data.js`
- [ ] **Dominio propio**
- [ ] **Carrito persistente** — guardar en localStorage
- [ ] **Migración a Supabase** — reemplazar Google Sheets como backend principal
- [ ] **Responsive móvil** — panel admin
- [ ] **Correo en nosotros.html** — verificar que no lo ofusque Cloudflare
- [ ] **Cambiar credenciales fallback** en `data.js` — `admin/admin` → credenciales seguras

---

## ✅ Completado

- [x] Modo claro en páginas públicas
- [x] Menú hamburguesa móvil en 4 páginas
- [x] Carrito flotante (fuera del nav, con transform)
- [x] Footer navy en las 4 páginas públicas
- [x] Botón WhatsApp flotante esquina inferior izquierda
- [x] Icono WhatsApp SVG correcto en nosotros.html
- [x] Notificación WhatsApp al cliente al despachar pedido
- [x] Deshabilitar clic derecho y F12
- [x] Acordeón en nosotros con marcas, cobertura y FAQ
- [x] **Login seguro via Supabase** — credenciales fuera del código
- [x] **Gestión de usuarios via Supabase** — crear, editar, activar/desactivar, eliminar desde el panel

---

## 🐛 Historial de bugs resueltos

| Bug | Solución |
|---|---|
| Login admin no funcionaba | Restaurar `admin.js` desde commit `a8e2a7d` |
| `initTheme()` forzaba modo oscuro | Eliminada de `app.js` |
| Carrito dentro del nav | Mover `.cart-btn-wrap` fuera del `<nav>` |
| Carrito genera scroll horizontal | `transform: translateX(100%)` |
| Hamburguesa no aparecía | HTML del botón directo en el `<nav>` |
| Nav corrido a la derecha en catálogo | Agrupar CTA + hamburguesa en `div` flex |
| Netlify sin créditos | Migrado a GitHub Pages |
| Editor GitHub truncaba admin.js | NUNCA editar archivos grandes en GitHub.com |
| Logo no aparecía | Renombrar `logo.png` a `logo_icon.png` |
| SVG WhatsApp vacío en nosotros | Agregar `<path>` completo manualmente |
| `doLogin` duplicado corrompía admin.js | Restaurar desde commit limpio y reemplazar función completa |
| GitHub Pages no actualizaba caché | `git commit --allow-empty -m "force deploy"` |

---

*Última actualización: Marzo 2026*
