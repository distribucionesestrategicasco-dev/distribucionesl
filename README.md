# Distribuciones Estratégicas de la Costa S.A.S

> **Versión:** v6 | **Actualización:** Marzo 2026 | Supabase + Edge Functions + Seguridad bcrypt

---

## 🔗 URLs

| Recurso | URL |
|---|---|
| Producción | https://distribucionesestrategicasco-dev.github.io/distribucionesl/ |
| Panel Admin | https://distribucionesestrategicasco-dev.github.io/distribucionesl/acceso-interno.html |
| Repositorio | https://github.com/distribucionesestrategicasco-dev/distribucionesl |
| Local | `C:\Users\Gala\Documents\GitHub\distribucionesl` |

---

## 🔐 Credenciales y Servicios

### Panel Admin

| Campo | Valor |
|---|---|
| Usuario principal | `Gala` |
| Rol | `administrador` |
| Autenticación | RPC `verificar_login` con bcrypt |

> ⚠️ La contraseña NO se almacena en este README por seguridad. Está hasheada con bcrypt en Supabase.

### Supabase

| Campo | Valor |
|---|---|
| URL | `https://jnxsofraqshxjboukiab.supabase.co` |
| Anon Key | En `js/admin.js`, `js/store.js`, `js/catalog.js` |
| Service Role Key | Solo como secret `SERVICE_ROLE_KEY` en Edge Function — nunca en código fuente |

**Tablas:**

| Tabla | Descripción |
|---|---|
| `usuarios` | Login y gestión de usuarios del panel |
| `productos` | Catálogo (68 productos) |
| `pedidos` | Pedidos de clientes |
| `pedido_items` | Items de cada pedido |
| `pedido_historial` | Historial de estados de pedidos |

**Storage Buckets:**

| Bucket | Descripción |
|---|---|
| `entregados` | PDFs de soporte de pedidos entregados |
| `productos` | Imágenes de productos (pendiente subir) |

### Edge Functions

| Función | Endpoint | Propósito |
|---|---|---|
| `admin-usuarios` | `/functions/v1/admin-usuarios` | Crear, editar, eliminar usuarios con service role |

### Otros Servicios

| Servicio | Valor |
|---|---|
| EmailJS Service | `service_zlygmxg` |
| EmailJS Template pedido | `5pq32d9` |
| EmailJS Template cotización | `0cjbbl9` |
| EmailJS Public Key | `Z36EAC4PWgs02Gy3o` |
| WhatsApp empresa | `+57 302 354 8415` |

---

## 🗂️ Estructura de Archivos

```
distribucionesl/
├── index.html                    ← Inicio / hero / categorías
├── catalogo.html                 ← Catálogo público con carrito
├── nosotros.html                 ← Página institucional
├── seguimiento.html              ← Seguimiento de pedidos
├── acceso-interno.html           ← Panel de administración
│
├── css/
│   ├── base.css                  ← Variables CSS, reset, tipografía global
│   ├── nav.css                   ← Navbar y navegación
│   ├── pages.css                 ← Estilos páginas públicas
│   ├── catalog.css               ← Catálogo público
│   ├── cart.css                  ← Carrito lateral
│   ├── modals.css                ← Modales
│   ├── admin.css                 ← Panel admin (light mode, Material Icons)
│   ├── footer.css                ← Footer global
│   └── whatsapp.css              ← Botón flotante WhatsApp
│
├── js/
│   ├── data.js                   ← Credenciales backup, config EmailJS
│   ├── store.js                  ← Supabase config, pedidos, estado global
│   ├── catalog.js                ← Catálogo público, loadProductsFromSupa
│   ├── cart.js                   ← Carrito de compras
│   ├── orders.js                 ← Envío de pedidos y cotizaciones
│   ├── admin.js                  ← Panel admin completo (~2700 líneas)
│   ├── app.js                    ← Navegación, sesión, sidebar
│   └── nav-mobile.js             ← Hamburguesa y menú móvil
│
├── supabase/
│   └── functions/
│       └── admin-usuarios/
│           └── index.ts          ← Edge Function: gestión segura de usuarios
│
└── img/
    ├── logo_icon.png
    ├── logo_full.png
    └── bg-home.jpg
```

---

## 🗄️ Base de Datos Supabase

### Tabla `usuarios`

```sql
CREATE TABLE usuarios (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  nombre        TEXT,
  rol           TEXT,
  email         TEXT,
  activo        BOOLEAN DEFAULT true,
  password_hash TEXT,   -- bcrypt, nunca texto plano
  created_at    TIMESTAMP DEFAULT now()
);
```

**RLS — todo bloqueado para anon:**

| Operación | Policy |
|---|---|
| SELECT | `USING (false)` — solo via RPC `verificar_login` |
| INSERT | `WITH CHECK (false)` — solo via Edge Function |
| UPDATE | `USING (false)` — solo via Edge Function |
| DELETE | `USING (false)` — solo via Edge Function |

**RPC Functions:**

| Función | Descripción |
|---|---|
| `verificar_login(p_username, p_password)` | Autentica con bcrypt, retorna datos del usuario |
| `hashear_password(p_password)` | Hashea con bcrypt, usada por Edge Function |

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
```

RLS: SELECT público, escritura abierta para anon.

### Tabla `pedidos`

Campos: `id`, `client`, `company`, `email`, `phone`, `city`, `nit`, `date`, `status`, `items` (JSONB), `created_at`

**Flujo de estados:** `pending` → `quoted` → `approved` → `dispatched` → `delivered`

RLS: acceso total para anon.

### Tablas `pedido_items` y `pedido_historial`

Relacionadas con `pedidos`. RLS con acceso total para anon.

---

## 🔒 Arquitectura de Seguridad

```
Cliente (Browser)
    │
    ├── Login ──────────────────→ RPC verificar_login (bcrypt)
    │                              tabla usuarios NO accesible directo
    │
    ├── Leer pedidos/productos ──→ anon key (RLS permite)
    │
    └── Gestión usuarios ────────→ Edge Function (service_role privada)
              Valida: token btoa(session) con rol === 'administrador'
              Hashea password via RPC hashear_password antes de guardar
```

**Medidas implementadas:**

- ✅ Contraseñas hasheadas con bcrypt (`pgcrypto`)
- ✅ Login via RPC `SECURITY DEFINER` — anon nunca lee `usuarios` directamente
- ✅ Tabla `usuarios` completamente bloqueada para anon
- ✅ Crear/editar/eliminar usuarios solo via Edge Function con service role
- ✅ Service role key nunca en código — solo en Supabase Secrets
- ✅ Edge Function valida que el llamante tenga rol `administrador`

---

## 📄 Páginas HTML

### `acceso-interno.html` — Panel Admin

Contiene dos secciones alternadas:
- `#page-admin-login` — Formulario de login
- `#page-admin` — Dashboard con sidebar y contenido

**Orden de carga de scripts:**

```html
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<script src="js/data.js"></script>
<script src="js/store.js"></script>
<script src="js/catalog.js"></script>
<script src="js/cart.js"></script>
<script src="js/orders.js"></script>
<script src="js/admin.js"></script>
<script src="js/app.js"></script>
<script src="js/nav-mobile.js"></script>
```

Al cargar: `app.js` lee `localStorage('dlc_session')` y restaura sesión automáticamente.

---

## ⚙️ JS — Funciones Principales

### `store.js`

| Función | Descripción |
|---|---|
| `loadOrdersFromSheet()` | Carga pedidos + items + historial desde Supabase |
| `saveOrderToSheet(order)` | Guarda nuevo pedido en Supabase |
| `updateOrderStatus(orderId, status)` | Actualiza estado del pedido |

Variable global: `orders[]` — array de pedidos en memoria.

### `catalog.js`

| Función | Descripción |
|---|---|
| `loadProductsFromSupa()` | Carga productos desde Supabase → `window.PRODUCTS` (UUIDs) |
| `renderCatalog()` | Grid con filtros y búsqueda |
| `buildProductCard(p)` | HTML de cada tarjeta de producto |

### `cart.js`

| Función | Descripción |
|---|---|
| `addToCart(id)` | Busca en `window.PRODUCTS \|\| PRODUCTS` (UUIDs de Supabase) |
| `removeFromCart(id)` | Elimina del carrito |
| `updateCartUI()` | Actualiza panel lateral del carrito |

### `app.js`

| Función | Descripción |
|---|---|
| `showPage(page)` | Navegación entre páginas HTML |
| `initAdminSidebar()` | Muestra nombre/rol y oculta links según permisos |
| `adminSection(section)` | Cambia sección y marca link activo en sidebar |
| `cerrarSesion()` | Limpia localStorage y redirige al login |
| `initTheme()` | Aplica tema guardado (light only en mobile) |

### `admin.js` (~2700 líneas)

#### Variables Globales

```javascript
var currentUser = null;        // DEBE ser var para ser window.currentUser
var ROLE_PERMS = { ... }       // Permisos por rol
var currentAdminSection        // Sección activa del panel
var adminSearch = ''           // Texto de búsqueda activo
var adminDateFrom, adminDateTo // Filtros de fecha
var _pedidosStatusFilter       // Filtro de estado en sección Pedidos
```

#### Sistema de Roles

| Rol | Secciones accesibles |
|---|---|
| `administrador` | Todo: dashboard, pedidos, cotizaciones, ordenes, remisiones, entregados, usuarios, catalogo |
| `gestor` | dashboard, pedidos, cotizaciones, ordenes, remisiones, entregados |
| `vendedor` | dashboard, pedidos, cotizaciones |
| `despachador` | dashboard, ordenes, remisiones, entregados |
| `lectura` | dashboard, pedidos, cotizaciones, ordenes, remisiones, entregados (sin editar) |

#### Funciones por Módulo

**Autenticación:**
- `doLogin()` — llama RPC `verificar_login`, guarda sesión en localStorage
- `canDo(section)` — verifica permisos del usuario activo
- `isReadOnly()` — true si rol es `lectura`

**Navegación:**
- `renderAdminSection(sec)` — spinner + carga sección, actualiza link activo
- `renderLocalSection()` — re-renderiza desde memoria sin fetch
- `renderTableOnly()` — actualiza solo la tabla preservando foco del buscador

**Pedidos:**
- `renderPedidos()` — tabla con pestañas: Todos / Pendientes / Cotizados / Aprobados / Despachados / Entregados
- `filterOrders(list)` — filtra por texto, fechas y estado
- `buildSearchBar(placeholder)` — barra de búsqueda con debounce
- `addHistorial(orderId, nuevoEstado)` — agrega entrada al historial
- `renderHistorial(o)` — renderiza historial de estados
- `editarPedido()`, `guardarEdicionPedido()`, `eliminarPedido()`

**Cotizaciones:**
- `openQuotePanel(orderId)` — panel con cards por producto y totales
- `updateQuoteRow(idx, val, orderId)` — actualiza precio unitario
- `recalcQuoteTotals(orderId)` — recalcula subtotal, IVA 19%, total
- `sendQuote(orderId)` — envía cotización por email (EmailJS)
- `simulateApprove(orderId)` — marca como aprobada
- `generarPDFCotizacion(orderId)` — genera PDF con html2pdf

**Órdenes y Remisiones:**
- `renderOrdenes()` — órdenes aprobadas listas para despacho
- `renderRemisiones()` — historial de despachos y entregados
- `openRemision(orderId)` — modal de remisión para imprimir
- `doMarkDispatched(orderId)` — marca despachado + notifica WhatsApp
- `marcarEntregado(orderId)` — marca como `delivered`

**Entregados:**
- `loadAllDeliveryDocs(cb)` — carga PDFs desde Supabase Storage `entregados`
- `uploadDocToSupabase(orderId, file, onDone)` — sube PDF
- `deleteDeliveryDoc(orderId, fileId, filePath)` — elimina PDF
- `renderSoporteCell(orderId)` — celda con links a PDFs
- `notificarEntregaCliente(orderId)` — email de confirmación (EmailJS)

**Usuarios (solo administrador):**
- `loadUsersSection(cont)` — carga desde Supabase
- `renderUsuarios(users)` — tabla con formulario de creación
- `editarUsuario(username, rol, nombre, email, activo)` — abre modal edición
- `guardarEdicionUsuario()` — llama Edge Function `admin-usuarios`
- `crearUsuario()` — llama Edge Function `admin-usuarios`
- `eliminarUsuario(username)` — llama Edge Function `admin-usuarios`
- `_edgeUsuarios(action, data, onOk)` — helper para la Edge Function

**Catálogo Admin:**
- `loadCatalogoSection(cont)` — carga productos desde Supabase
- `renderCatalogo()` — tabla con editar / pausar / eliminar
- `abrirNuevoProductoSupa()`, `abrirEditarProductoSupa(id)`
- `guardarProductoSupa()` — crea/actualiza + sube imagen a Storage
- `toggleProductoSupa(id, activo)` — activa/pausa producto
- `eliminarProductoSupa(id, nombre)` — elimina producto

---

## 🎨 CSS — Variables Principales (`base.css`)

```css
--brand-blue:  #1A3C5E
--brand-cyan:  #49C9F4
--brand-navy:  #0D2237
--bg:          #F8FAFB
--bg-white:    #FFFFFF
--text:        #1A1A2E
--text-soft:   #6B7280
--border:      #E5E7EB
```

**`admin.css`:** Light mode únicamente. Sin dark mode. Usa Material Icons.

---

## 📦 Dependencias Externas (CDN)

| Librería | Uso |
|---|---|
| Google Fonts (Outfit) | Tipografía global |
| Material Icons | Iconografía del panel admin |
| EmailJS Browser v4 | Envío de emails |
| html2pdf.js 0.10.1 | Generación de PDFs |
| Chart.js | Gráfico en dashboard |

---

## 🔄 Flujos Principales

### Login
```
doLogin()
  → POST /rest/v1/rpc/verificar_login { p_username, p_password }
  → Supabase compara bcrypt(password, hash)
  → Si OK: guarda session en localStorage
  → initAdminSidebar() + renderAdminSection('dashboard')
```

### Pedido de cliente
```
1. Cliente agrega al carrito → saveOrderToSheet() → tabla pedidos (pending)
2. Admin cotiza → sendQuote() → EmailJS → cliente (quoted)
3. Cliente aprueba → simulateApprove() (approved)
4. Admin despacha → doMarkDispatched() → WhatsApp (dispatched)
5. Admin entrega → marcarEntregado() (delivered)
6. Admin sube PDF → Supabase Storage bucket entregados
```

### Gestión de usuarios
```
crearUsuario() → _edgeUsuarios('crear', data)
  → Edge Function valida token (rol === administrador)
  → RPC hashear_password() → bcrypt hash
  → INSERT en tabla usuarios con service_role
```

---

## ⚠️ Reglas Críticas

1. **NUNCA editar `admin.js` directamente en GitHub.com** — trunca el archivo
2. **Siempre `Ctrl+S` en VS Code antes de `git add`**
3. **GitHub Pages tarda 3-10 min** — usar `Ctrl+Shift+R` para limpiar caché
4. **`currentUser` debe ser `var`** en `admin.js` para ser `window.currentUser`
5. **PowerShell UTF-8** — siempre usar:
   ```powershell
   [System.IO.File]::WriteAllText((Resolve-Path "js\admin.js").Path, $c, (New-Object System.Text.UTF8Encoding $false))
   ```
6. **Los 68 productos ya están en Supabase** — no re-insertar
7. **La service role key** nunca va en el código fuente

---

## 🚧 Pendientes

### Alta Prioridad
- [ ] Subir precios reales a los 68 productos (`precio_ref: 0` actualmente)
- [ ] Subir imágenes al bucket `productos` de Supabase

### Media Prioridad
- [ ] Migrar seguimiento de pedidos de Google Sheets a Supabase
- [ ] Carrito persistente en localStorage
- [ ] Responsive del panel admin en móvil

### Baja Prioridad
- [ ] Dominio propio
- [ ] SEO — meta description y Open Graph
- [ ] Paginación en tablas del panel
- [ ] Cambio de contraseña desde el panel por el propio usuario

---

## 🔧 Verificar Estado de Producción

Abre la consola en `acceso-interno.html` (F12 → Console) y ejecuta:

```javascript
(async () => {
  const r = await fetch('/distribucionesl/js/admin.js?t='+Date.now(), {cache:'no-store'});
  const txt = await r.text();
  console.log('Líneas:', txt.split('\n').length);                             // ~2700
  console.log('Login RPC:', txt.includes('verificar_login'));                 // true
  console.log('Edge Function:', txt.includes('admin-usuarios'));              // true
  console.log('editarUsuario:', txt.includes('function editarUsuario'));      // true
  console.log('Filtros pedidos:', txt.includes('_pedidosStatusFilter'));      // true
  console.log('marcarEntregado:', txt.includes('function marcarEntregado')); // true
})()
```

---

## 🔧 Comandos Git Frecuentes

```powershell
cd C:\Users\Gala\Documents\GitHub\distribucionesl

# Ver estado
git status
git log --oneline -5

# Subir cambios
git add js\admin.js
git commit -m "descripcion del cambio"
git push

# Revertir último commit
git revert HEAD --no-edit
git push

# Desplegar Edge Function
cd C:\Users\Gala\Documents\GitHub\distribucionesl
supabase functions deploy admin-usuarios --no-verify-jwt
```

---

## 🔧 Para Retomar en Otro Chat

Compartir este README y decir:

> "Soy Gala, proyecto Distribuciones Estratégicas de la Costa. Aquí el README. Necesito [describir tarea]."
