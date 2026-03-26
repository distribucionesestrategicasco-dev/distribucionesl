# Distribuciones Estratégicas de la Costa S.A.S — README del Proyecto

## 🌐 URLs

| Recurso | URL |
|---|---|
| **Producción** | https://distribucionesestrategicasco-dev.github.io/distribucionesl/ |
| **Panel Admin** | https://distribucionesestrategicasco-dev.github.io/distribucionesl/acceso-interno.html |
| **Repositorio** | https://github.com/distribucionesestrategicasco-dev/distribucionesl |
| **Local** | `C:\Users\Gala\Documents\GitHub\distribucionesl` |

---

## 📁 Estructura de Archivos

```
raíz/
├── index.html
├── catalogo.html
├── nosotros.html
├── seguimiento.html
├── acceso-interno.html        ← Panel Administrador
css/
├── base.css, nav.css, pages.css, catalog.css
├── cart.css, modals.css, admin.css, footer.css, whatsapp.css
js/
├── data.js                    ← 68 productos base (PRODUCTS[])
├── store.js                   ← Estado del carrito + Google Sheets URL
├── catalog.js                 ← Catálogo público
├── cart.js                    ← Carrito de compras
├── orders.js                  ← Gestión de pedidos
├── admin.js                   ← Panel admin (ARCHIVO PRINCIPAL - 173,228 bytes)
└── app.js                     ← Inicialización
img/
├── logo_icon.png, logo_full.png, bg-home.jpg
```

---

## 🔑 Credenciales y Servicios

### Supabase
- **URL:** `https://jnxsofraqshxjboukiab.supabase.co`
- **ANON KEY:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueHNvZnJhcXNoeGpib3VraWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjkxNzUsImV4cCI6MjA4OTI0NTE3NX0.CejqobwjHcbrgnT7nn29dgYzLf-bLT_J0fqDvvb59Gs`

### Tablas y Buckets Supabase
| Recurso | Tipo | Descripción | Estado |
|---|---|---|---|
| `usuarios` | Tabla | Login y gestión de usuarios del panel | ✅ Activa |
| `productos` | Tabla | Catálogo de productos (69 productos) | ✅ Activa |
| `entregados` | Bucket | PDFs de pedidos entregados | ✅ Activo |
| `productos` | Bucket | Imágenes de productos | ✅ Creado |

### Usuarios del Panel
| Usuario | Contraseña | Rol |
|---|---|---|
| `Gala` | `*B4rranquilla.1524*` | administrador |

### Credencial Fallback (en data.js — ADMIN_CREDENTIALS)
| Usuario | Contraseña |
|---|---|
| `dlc_backup_2026` | `DLC$B4rr4nquill4.2026!` |

### Otros Servicios
- **Google Sheets:** `SHEETS_URL` y `TRACKING_URL` en `store.js` y `app.js`
- **EmailJS:** service `service_zlygmxg`, templates `5pq32d9` y `0cjbbl9`, key `Z36EAC4PWgs02Gy3o`
- **WhatsApp empresa:** +57 302 354 8415

---

## 🏗️ Arquitectura del Panel Admin

### Roles y Permisos
```
administrador: dashboard, pedidos, cotizaciones, ordenes, remisiones, entregados, usuarios, catalogo
gestor:        dashboard, pedidos, cotizaciones, ordenes, remisiones, entregados
vendedor:      dashboard, pedidos, cotizaciones
despachador:   dashboard, ordenes, remisiones, entregados
lectura:       dashboard, pedidos, cotizaciones, ordenes, remisiones, entregados
```

### Secciones del Panel y su Backend
| Sección | Backend | Estado |
|---|---|---|
| Dashboard | Google Sheets | ✅ |
| Pedidos | Google Sheets | ✅ |
| Cotizaciones | Google Sheets | ✅ |
| Órdenes | Google Sheets | ✅ |
| Remisiones | Google Sheets | ✅ |
| Entregados | Google Sheets + Supabase Storage | ✅ |
| **Usuarios** | **Supabase tabla `usuarios`** | ✅ Migrado |
| **Catálogo** | **Supabase tabla `productos`** | ✅ Migrado |

---

## ✅ Catálogo — Estado Actual

### SQL de la tabla productos
```sql
CREATE TABLE productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  icono TEXT DEFAULT '📦',
  precio_ref NUMERIC DEFAULT 0,
  imagen_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lectura publica" ON productos FOR SELECT USING (true);
CREATE POLICY "escritura admin" ON productos FOR ALL USING (true);
```

### Funciones del Catálogo en admin.js
| Función | Descripción |
|---|---|
| `loadCatalogoSection(cont)` | Carga productos desde Supabase (resetea filtros) |
| `renderCatalogo()` | Renderiza tabla con buscador y filtros por categoría |
| `abrirNuevoProductoSupa()` | Abre modal para crear producto |
| `abrirEditarProductoSupa(id)` | Abre modal con datos del producto a editar |
| `guardarProductoSupa()` | Crea o edita producto — sube imagen a Supabase Storage |
| `toggleProductoSupa(id, activo)` | Activa/pausa producto |
| `eliminarProductoSupa(id, nombre)` | Elimina producto con `confirm()` |
| `previewImgProducto(input)` | Muestra vista previa de imagen seleccionada |

### Variables Globales del Catálogo
```javascript
var _catalogoSupa = [];           // Lista de productos cargados de Supabase
var _catalogoCatFilter = 'Todos'; // Filtro activo de categoría
var _catalogoSearch = '';         // Texto de búsqueda activo
```

### Subida de Imágenes
- Bucket: `productos` en Supabase Storage (público)
- URL pública: `https://jnxsofraqshxjboukiab.supabase.co/storage/v1/object/public/productos/producto_TIMESTAMP.ext`
- Formatos: JPG, PNG, WEBP — máx 2MB

---

## 🔧 Comandos Útiles

### Git
```bash
# Push normal
git add js/admin.js
git commit -m "descripcion"
git push origin main

# Forzar redespliegue de GitHub Pages
git commit --allow-empty -m "force deploy"
git push origin main

# Restaurar archivo desde commit anterior
git checkout COMMIT_HASH -- js/admin.js
```

### PowerShell — Escribir archivo con UTF-8 sin BOM
```powershell
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Resolve-Path "js\admin.js").Path, $content, $utf8)
```

### PowerShell — Hacer un reemplazo en el archivo
```powershell
$f = "js\admin.js"
$c = [System.IO.File]::ReadAllText((Resolve-Path $f).Path, [System.Text.Encoding]::UTF8)
$c2 = $c.Replace("texto viejo", "texto nuevo")
[System.IO.File]::WriteAllText((Resolve-Path $f).Path, $c2, (New-Object System.Text.UTF8Encoding $false))
```

---

## ⚠️ Reglas Importantes

1. **NUNCA editar archivos grandes en GitHub.com** — GitHub trunca el contenido
2. **GitHub Pages tarda 3-10 minutos** en propagar cambios — ser paciente
3. **`app.js` NO tiene `initTheme()`** — si reaparece en algún lado, borrarla
4. **El `admin.js` correcto** tiene **173,228 bytes** y **2,265 líneas**
5. **PowerShell corrompe UTF-8** al usar `Set-Content` o `copy` — siempre usar `[System.IO.File]::WriteAllText` con `UTF8Encoding($false)`
6. **Los 69 productos ya están en Supabase** — NO re-insertar o se duplicarán
7. **`isAdmin` usa `window.currentUser`** (no solo `currentUser`) para evitar problemas de scope en `renderCatalogo`

---

## 📊 Estado de Migración a Supabase

| Módulo | Antes | Ahora |
|---|---|---|
| Login | Google Sheets | ✅ Supabase `usuarios` |
| Gestión Usuarios | Google Sheets | ✅ Supabase `usuarios` |
| Catálogo Admin | `data.js` local | ✅ Supabase `productos` |
| Imágenes Productos | N/A | ✅ Supabase Storage `productos` |
| PDFs Entregados | N/A | ✅ Supabase Storage `entregados` |
| Pedidos | Google Sheets | ⏳ Pendiente |
| Cotizaciones | Google Sheets | ⏳ Pendiente |
| Órdenes | Google Sheets | ⏳ Pendiente |
| Remisiones | Google Sheets | ⏳ Pendiente |

---

## 🚧 Pendientes

### Alta Prioridad
- [ ] Confirmar que botones Editar/Eliminar/Pausar aparecen en catálogo (fix `window.currentUser` recién aplicado)
- [ ] Actualizar precios reales de los 69 productos (actualmente `precio_ref: 0`)
- [ ] Subir imágenes reales para cada producto

### Media Prioridad
- [ ] Conectar `catalogo.html` (catálogo público) a Supabase en vez de `data.js`
- [ ] Carrito persistente en localStorage
- [ ] Verificar seguimiento de pedidos

### Baja Prioridad
- [ ] Dominio propio
- [ ] Migración completa a Supabase (reemplazar Google Sheets)
- [ ] Responsive móvil panel admin (sidebar hamburguesa < 768px)
- [ ] Cambio de contraseña desde el panel
