# Distribuciones Estratégicas de la Costa S.A.S — Documentación Completa

> **Última actualización:** Marzo 2026 | **Versión:** v5 Multi-página con Supabase

---

## 🔗 URLs y Repositorio

| Recurso | URL |
|---|---|
| **Producción** | https://distribucionesestrategicasco-dev.github.io/distribucionesl/ |
| **Panel Admin** | https://distribucionesestrategicasco-dev.github.io/distribucionesl/acceso-interno.html |
| **Repositorio** | https://github.com/distribucionesestrategicasco-dev/distribucionesl |
| **Local** | `C:\Users\Gala\Documents\GitHub\distribucionesl` |

---

## 🔐 Credenciales y Servicios

### Acceso al Panel Admin
| Campo | Valor |
|---|---|
| **Usuario principal** | `Gala` |
| **Contraseña principal** | `*B4rranquilla.1524*` |
| **Autenticación** | Supabase tabla `usuarios` |
| **Fallback (data.js)** | usuario: `dlc_backup_2026` / pass: `DLC$B4rr4nquill4.2026!` |

### Supabase
| Campo | Valor |
|---|---|
| **URL** | `https://jnxsofraqshxjboukiab.supabase.co` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs` |
| **Tabla usuarios** | Login y gestión de usuarios del panel |
| **Tabla productos** | Catálogo (69 productos insertados) |
| **Bucket `entregados`** | PDFs de pedidos entregados |
| **Bucket `productos`** | Imágenes de productos del catálogo |

### Otros Servicios
| Servicio | Dato |
|---|---|
| **EmailJS Service** | `service_zlygmxg` |
| **EmailJS Template pedido** | `5pq32d9` |
| **EmailJS Template cotización** | `0cjbbl9` |
| **EmailJS Public Key** | `Z36EAC4PWgs02Gy3o` |
| **WhatsApp empresa** | `+57 302 354 8415` |
| **Google Sheets pedidos** | Variable `SHEETS_URL` en `store.js` |
| **Google Sheets tracking** | Variable `TRACKING_URL` en `app.js` |

---

## 🗂️ Estructura de Archivos

```
distribucionesl/
├── index.html              ← Inicio / catálogo público
├── catalogo.html           ← Catálogo de productos
├── nosotros.html           ← Página institucional
├── seguimiento.html        ← Seguimiento de pedidos
├── acceso-interno.html     ← Panel de administración
│
├── css/
│   ├── base.css            ← Variables CSS, reset, tipografía global
│   ├── nav.css             ← Navbar y navegación
│   ├── pages.css           ← Estilos de páginas públicas
│   ├── catalog.css         ← Catálogo público de productos
│   ├── cart.css            ← Carrito de compras
│   ├── modals.css          ← Modales (cotización, remisión, etc.)
│   ├── admin.css           ← Estilos del panel admin
│   ├── footer.css          ← Footer global
│   └── whatsapp.css        ← Botón flotante de WhatsApp
│
├── js/
│   ├── data.js             ← Datos estáticos: productos, credenciales backup
│   ├── store.js            ← Google Sheets API, estado global de pedidos
│   ├── catalog.js          ← Lógica del catálogo público
│   ├── cart.js             ← Carrito de compras
│   ├── orders.js           ← Gestión de pedidos desde el frontend
│   ├── admin.js            ← Panel de administración completo (~2573 líneas)
│   ├── app.js              ← Navegación, inicialización, sesión, dark mode
│   └── nav-mobile.js       ← Hamburguesa y menú móvil
│
└── img/
    ├── logo_icon.png
    ├── logo_full.png
    └── bg-home.jpg
```

---

## 🗄️ Base de Datos Supabase

### Tabla `productos`
```sql
CREATE TABLE productos (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre     TEXT NOT NULL,
  categoria  TEXT NOT NULL,
  icono      TEXT DEFAULT '📦',
  precio_ref NUMERIC DEFAULT 0,
  imagen_url TEXT,
  activo     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lectura publica" ON productos FOR SELECT USING (true);
CREATE POLICY "escritura admin" ON productos FOR ALL USING (true);
```

### Tabla `usuarios`
Campos: `username`, `password`, `nombre`, `rol`, `email`, `activo`, `created_at`

Roles disponibles: `administrador`, `gestor`, `vendedor`, `despachador`, `lectura`

---

## 📄 HTML — Cada Página

### `index.html` — Inicio
Página principal pública. Hero, categorías, productos destacados. Carga todos los JS. El catálogo público usa `data.js` (pendiente migrar a Supabase).

### `catalogo.html` — Catálogo Público
Grid de productos con filtros y búsqueda. Acepta `?cat=Categoria` en URL. Conectado a `catalog.js` y `data.js`.

### `nosotros.html` — Nosotros
Página institucional estática.

### `seguimiento.html` — Seguimiento de Pedidos
Clientes consultan su pedido por número de orden. Consulta `TRACKING_URL` (Google Sheets). Lógica en `app.js` → `buscarSeguimiento()`.

### `acceso-interno.html` — Panel Admin
Página central del admin. Contiene **dos secciones** alternadas con CSS:
- `#page-admin-login` — Formulario de login
- `#page-admin` — Dashboard con sidebar y contenido

**Orden de carga de scripts:**
```html
<script src="js/data.js"></script>
<script src="js/store.js"></script>
<script src="js/catalog.js"></script>
<script src="js/cart.js"></script>
<script src="js/orders.js"></script>
<script src="js/admin.js"></script>
<script src="js/app.js"></script>
<script src="js/nav-mobile.js"></script>
```

Al cargar: `app.js` lee `localStorage` y restaura sesión automáticamente (sin pedir login al F5).

---

## ⚙️ JS — Descripción Detallada

### `data.js`
- `PRODUCTS[]` — Productos estáticos para catálogo público
- `ADMIN_CREDENTIALS` — Credenciales backup si Supabase falla
- `CATEGORIES[]` — Lista de categorías
- Config EmailJS

### `store.js`
- `SHEETS_URL` — URL del Google Sheets con pedidos
- `loadOrdersFromSheet()` — Carga pedidos en `window.allOrders`
- `allOrders[]` — Array global de todos los pedidos

### `catalog.js`
- `renderCatalog()` — Renderiza grid de productos en catálogo público
- Filtros por categoría, búsqueda

### `cart.js`
- Estado del carrito (`cartItems`)
- `addToCart()`, `removeFromCart()`, `updateQty()`
- Panel lateral del carrito

### `orders.js`
- `submitOrder()` — Envía pedido a Google Sheets
- `submitQuote()` — Envía cotización
- Emails vía EmailJS, notificaciones WhatsApp

### `app.js` (~307 líneas)

**Funciones principales:**
- `showPage(page)` — Navegación multi-HTML. En `acceso-interno.html` alterna `#page-admin-login` / `#page-admin` sin recargar
- `initAdminSidebar()` — Inicializa sidebar: muestra nombre del usuario, oculta links no permitidos según rol
- `logout()` — Limpia localStorage, borra `window.currentUser`, redirige
- `toggleDarkMode()` — Alterna modo oscuro/claro
- `buscarSeguimiento()` — Consulta Google Sheets de tracking

**DOMContentLoaded:**
1. Si existe `#page-admin-login` (estamos en acceso-interno.html):
   - Lee `localStorage('dlc_session')`
   - Si hay sesión válida: muestra panel, llama `initAdminSidebar()` + `renderAdminSection('dashboard')`
2. Inicializa modales
3. Atajos: Enter en login → `doLogin()`, Escape → cierra modales

### `admin.js` (~2573 líneas) — El más importante

#### Variables Globales Clave
```javascript
var currentUser = null;           // DEBE ser var (no let) para ser window.currentUser
var ROLE_PERMS = { ... }          // Permisos por rol
var ROLE_LABELS = { ... }         // Labels legibles
var adminSearch = ''              // Búsqueda activa
var adminDateFrom, adminDateTo    // Filtros de fecha
var SUPA_URL, SUPA_ANON          // Config Supabase
var deliveryDocs = {}             // PDFs entregados (cacheados)
var _catalogoSupa = []            // Productos del catálogo desde Supabase
var _catalogoCatFilter = 'Todos'  // Filtro activo de categoría
var _catalogoSearch = ''          // Búsqueda activa en catálogo
```

#### IIFE de Inicialización (al cargar el archivo)
```javascript
// Líneas 68-70 de admin.js
var currentUser = null;
(function() {
  try {
    var s = localStorage.getItem('dlc_session');
    if (s) { var u = JSON.parse(s); if (u && u.username) { currentUser = u; window.currentUser = u; } }
  } catch(e) {}
})();
```

#### Sistema de Roles
| Rol | Secciones accesibles |
|---|---|
| `administrador` | dashboard, pedidos, cotizaciones, ordenes, remisiones, entregados, **usuarios**, **catalogo** |
| `gestor` | dashboard, pedidos, cotizaciones, ordenes, remisiones, entregados |
| `vendedor` | dashboard, pedidos, cotizaciones |
| `despachador` | dashboard, ordenes, remisiones, entregados |
| `lectura` | dashboard, pedidos, cotizaciones, ordenes, remisiones, entregados |

#### Todas las Funciones por Categoría

**Autenticación:**
- `doLogin()` — Auth contra Supabase `usuarios`, guarda sesión en localStorage
- `showLoginError(msg)` — Muestra error en formulario
- `canDo(section)` — Verifica permisos del usuario activo
- `isReadOnly()` — True si rol = 'lectura'

**Navegación:**
- `adminSection(sec)` — Cambia sección activa del sidebar
- `renderAdminSection(sec)` — Enruta a función de render:
  - `'usuarios'` → `loadUsersSection(cont)`
  - `'catalogo'` → `loadCatalogoSection(cont)`
  - `'entregados'` → carga Sheets + `renderEntregados()`
  - resto → mapa de funciones directas

**Dashboard:**
- `renderDashboard()` — Métricas, totales, gráfico
- `initDashboardChart()` — Chart.js con datos de pedidos
- `dashboardAction(o)` — Acciones rápidas
- `exportarReporte()` — CSV (solo admin)

**Pedidos:**
- `renderPedidos()` — Tabla con filtros
- `filterOrders(list)` — Filtra por búsqueda y fechas
- `buildSearchBar(placeholder)` — Barra de búsqueda reutilizable
- `buildDateFilter()` — Filtros de fecha
- `editarPedido(orderId)`, `guardarEdicionPedido(orderId)`, `eliminarPedido(orderId)`
- `addHistorial(orderId, nuevoEstado)` — Historial de estados
- `renderHistorial(o)` — Renderiza historial

**Cotizaciones:**
- `renderCotizaciones()` — Tabla de cotizaciones
- `openQuotePanel(orderId)` — Panel de cotización
- `updateQuoteRow(idx, val, orderId)` — Actualiza precio en fila
- `recalcQuoteTotals(orderId)` — Recalcula totales
- `sendQuote(orderId)` — Envía por email (EmailJS)
- `simulateApprove(orderId)` — Marca como aprobada
- `generarPDFCotizacion(orderId)` — Genera PDF

**Órdenes y Remisiones:**
- `renderOrdenes()`, `renderRemisiones()`
- `openRemision(orderId)` — Modal de remisión de despacho
- `doMarkDispatched(orderId)` — Marca despachado, notifica cliente

**Entregados (Supabase Storage):**
- `renderEntregados()` — Tabla de entregados
- `loadAllDeliveryDocs(cb)` — Carga PDFs desde Supabase Storage `entregados`
- `uploadDocToSupabase(orderId, file, onDone)` — Sube PDF
- `deleteDeliveryDoc(orderId, fileId, filePath)` — Elimina PDF
- `handlePdfInput(orderId, input)` — Maneja selección de PDF
- `renderSoporteCell(orderId)` — Celda con links a PDFs
- `refreshSoporteCell(orderId)` — Refresca celda
- `previewDeliveryDoc(orderId, idx)` — Preview del PDF
- `notificarEntregaCliente(orderId)` — Email de confirmación
- `marcarEntregado(orderId)` — Marca en Sheets

**Gestión de Usuarios (solo admin):**
- `loadUsersSection(cont)` — Carga desde Supabase `usuarios`
- `renderUsuarios(users)` — Tabla con acciones
- `crearUsuario()` — Formulario de creación
- `editarUsuario(username, rol, nombre, email, activo)` — Formulario edición
- `guardarEdicionUsuario()` — PATCH/POST a Supabase
- `eliminarUsuario(username)` — DELETE en Supabase

**Catálogo Admin (solo admin/gestor):**
- `loadCatalogoSection(cont)` — Carga desde Supabase `productos`
- `renderCatalogo()` — Tabla con botones de acción (usa `window.currentUser.rol`)
- `abrirNuevoProductoSupa()` — Modal de nuevo producto
- `abrirEditarProductoSupa(id)` — Modal pre-rellenado para editar
- `guardarProductoSupa()` — Crea/actualiza en Supabase + sube imagen a Storage
- `toggleProductoSupa(id, activo)` — Activa/pausa (actualización local inmediata)
- `eliminarProductoSupa(id, nombre)` — Elimina (actualización local inmediata)
- `previewImgProducto(input)` — Preview de imagen seleccionada

**Utilidades:**
- `fmtFecha(str)`, `fmtFechaLarga(str)` — Formateo de fechas
- `parseOrderDate(o)` — Parsea fecha de un pedido
- `showAdminToast(msg)` — Toast de notificación
- `toggleDarkMode()`, `initTheme()` — Modo oscuro
- `verHistorialPrecios(id)` — Historial de precios

---

## 🎨 CSS — Cada Archivo

### `base.css`
Variables CSS globales:
```css
--brand-blue: #1A3C5E  --brand-cyan: #49C9F4  --brand-navy: #0D2237
--bg: #F8FAFB  --bg-white: #FFFFFF  --text: #1A1A2E
--text-soft: #6B7280  --border: #E5E7EB
```
Reset CSS, tipografía Outfit (Google Fonts), animaciones globales.

### `nav.css` — Navbar superior, logo, links, botón carrito, responsive hamburguesa

### `pages.css` — Hero section, secciones de categorías, cards, footer

### `catalog.css` — Grid de productos, cards, filtros de categoría, búsqueda

### `cart.css` — Panel lateral deslizante, items, cantidades, totales, checkout

### `modals.css`
- `.modal-overlay` — Fondo semitransparente
- `.modal-box` — Contenedor
- `.modal-head` — Encabezado con título y cierre
- `.modal-body` — Cuerpo scrolleable
- `.modal-wide` — Variante ancha (cotizaciones, remisiones)

### `admin.css`
- Layout: sidebar fijo + contenido principal
- `.admin-sidebar` — Links de sección con iconos
- `.section-card` — Cards con encabezado
- `.badge` — Badges de estado (colores por estado)
- `.action-link` — Botones de tabla
- Tablas responsivas, formularios del admin

### `footer.css` — Footer público con columnas de info y redes

### `whatsapp.css` — Botón flotante con animación de pulso

---

## 🔄 Flujos Principales

### Inicialización del Panel Admin
```
1. Carga acceso-interno.html → todos los JS en orden
2. admin.js IIFE: lee localStorage → asigna currentUser y window.currentUser
3. app.js DOMContentLoaded:
   - Si hay sesión en localStorage:
     → Oculta #page-admin-login, muestra #page-admin
     → initAdminSidebar() (nombre usuario, links por rol)
     → renderAdminSection('dashboard')
   - Si no hay sesión: muestra formulario de login
```

### Login
```
doLogin():
1. Lee admin-user y admin-pass del formulario
2. GET Supabase /rest/v1/usuarios?username=eq.{user}&activo=eq.true
3. Verifica password contra campo de Supabase
4. Si OK:
   - currentUser = window.currentUser = { username, nombre, rol }
   - localStorage.setItem('dlc_session', JSON.stringify(currentUser))
   - Oculta login, muestra panel
   - initAdminSidebar() + renderAdminSection('dashboard')
5. Si falla: intenta fallback con ADMIN_CREDENTIALS de data.js
```

### Catálogo Admin
```
renderAdminSection('catalogo') → loadCatalogoSection(cont):
1. Resetea filtros (_catalogoSearch = '', _catalogoCatFilter = 'Todos')
2. Spinner de carga
3. GET Supabase /rest/v1/productos?select=*&order=nombre.asc
4. _catalogoSupa[] = resultados
5. cont.innerHTML = renderCatalogo()

renderCatalogo():
- isAdmin = window.currentUser.rol === 'administrador' || 'gestor'
- Filtra por búsqueda y categoría activa
- Si isAdmin: muestra botones Editar, Pausar, Eliminar, + Nuevo
- Edición/eliminación: actualiza _catalogoSupa[] LOCAL ANTES del fetch a Supabase
```

### Gestión de Usuarios
```
loadUsersSection() → GET Supabase /rest/v1/usuarios → renderUsuarios()
guardarEdicionUsuario():
- Si nuevo: POST con Prefer: return=representation
- Si editar: PATCH con username=eq.{username}
- Después: recarga loadUsersSection()
```

---

## 📊 Secciones del Panel vs Fuentes de Datos

| Sección | Fuente | Estado |
|---|---|---|
| Dashboard | Google Sheets | ✅ |
| Pedidos | Google Sheets | ✅ |
| Cotizaciones | Google Sheets | ✅ |
| Órdenes | Google Sheets | ✅ |
| Remisiones | Google Sheets | ✅ |
| Entregados | Google Sheets + Supabase Storage | ✅ |
| **Usuarios** | **Supabase `usuarios`** | ✅ Migrado |
| **Catálogo** | **Supabase `productos`** | ✅ Migrado |

---

## ⚠️ Reglas Críticas (Lecciones Aprendidas)

1. **NUNCA editar admin.js directamente en GitHub.com** — trunca el archivo
2. **GitHub Pages tarda 3-10 min** — usar Ctrl+Shift+R para limpiar caché
3. **PowerShell UTF-8** — siempre usar:
   ```powershell
   [System.IO.File]::WriteAllText((Resolve-Path "js\admin.js").Path, $c2, (New-Object System.Text.UTF8Encoding $false))
   ```
4. **`currentUser` debe ser `var`** en admin.js para ser accesible como `window.currentUser`
5. **`isAdmin` en `renderCatalogo`** usa `window.currentUser` explícitamente (no `currentUser`)
6. **Los 69 productos ya están en Supabase** — no re-insertar
7. **Verificar que admin.js es correcto:**
   ```powershell
   (Get-Item js\admin.js).Length   # debe ser ~269492
   Select-String "loadUsersSection" js\admin.js   # debe encontrar en línea ~1700
   Select-String "window.currentUser.rol" js\admin.js   # debe encontrar
   ```

---

## 🚧 Pendientes

### Alta Prioridad
- [ ] Actualizar precios reales de los 69 productos (`precio_ref: 0` actualmente)
- [ ] Subir imágenes reales al bucket `productos` de Supabase

### Media Prioridad
- [ ] Migrar catálogo público (`catalogo.html`) de `data.js` a Supabase
- [ ] Carrito persistente en localStorage
- [ ] Verificar seguimiento de pedidos

### Baja Prioridad
- [ ] Dominio propio
- [ ] Migrar pedidos/cotizaciones de Google Sheets a Supabase
- [ ] Responsive móvil del panel admin
- [ ] Cambio de contraseña desde el panel
- [ ] Paginación en tablas del admin

---

## 🔧 Para Retomar en Otro Chat

Compartir este README y decir:

> "Soy Gala, proyecto Distribuciones Estratégicas de la Costa. Aquí el README. [adjuntar] Necesito [describir tarea]."

Para verificar estado de producción, abrir consola en el panel y ejecutar:
```javascript
(async () => {
  const r = await fetch('/distribucionesl/js/admin.js?t='+Date.now(), {cache:'no-store'});
  const txt = await r.text();
  console.log('Líneas:', txt.split('\n').length);               // ~2573
  console.log('Login Supabase:', txt.includes('supabase.co/rest/v1/usuarios'));  // true
  console.log('Usuarios:', txt.includes('loadUsersSection'));    // true
  console.log('Catálogo:', txt.includes('loadCatalogoSection')); // true
  console.log('window.currentUser:', txt.includes('window.currentUser.rol')); // true
})()
```

