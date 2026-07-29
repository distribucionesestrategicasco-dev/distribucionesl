# Auditoría profesional — DISTCOSTA (distcosta.com)

**Fecha:** 29 de julio de 2026 · **Alcance:** código fuente del workspace (9 páginas públicas + panel interno, 10 CSS, 9 JS, backend Supabase) · **Metodología:** revisión estática de código con evidencia `archivo:línea`, cálculo matemático de contrastes WCAG 2.2, análisis de competencia real del sector.

**Herramientas usadas:** skill `ui-ux-pro-max` (criterios de diseño/UX/a11y), skill local `frontend-design` del propio repo, script de contraste WCAG ejecutado en esta sesión, búsqueda web de competidores.
**No disponibles en este entorno:** Lighthouse y Figma. El análisis de Core Web Vitals es estático (sobre el código), no una medición de laboratorio; se indica en cada caso.

---

## Resumen ejecutivo

DISTCOSTA tiene una base técnica **mejor que la media de su sector local** (SEO on-page sólido, JSON-LD, seguridad Supabase endurecida, seguimiento de pedidos en línea que ningún competidor local pequeño ofrece) y una **capa visual con ambición**, pero está lastrada por tres problemas estructurales:

1. **Dos sitios en uno.** `index.html` es una isla con su propio design system embebido ([index.html:65-175](index.html#L65-L175)) que no comparte nada con el resto del sitio (`css/base.css` + módulos). Dos navbars, dos footers, dos paletas, dos escalas.
2. **Confianza rota en el punto de cierre.** La página de contacto muestra literalmente `[NIT de la empresa]` y `[Dirección física en Barranquilla]` ([contacto.html:140-143](contacto.html#L140-L143)); las redes sociales son enlaces muertos; el teléfono de seguimiento no coincide con el del resto del sitio.
3. **Accesibilidad por debajo del mínimo legal/AA.** Cero `:focus-visible`, cero skip links, texto blanco sobre botones que falla contraste (2,1:1 medido), buscador sin label.

**Puntuación por dimensión (0–10):**

| Dimensión | Nota | Comentario |
|---|---|---|
| Primera impresión | 6 | Home moderna, pero genérica y con señales de confianza contradictorias |
| Identidad visual | 4 | Dos sistemas conviviendo; tokens con nombres engañosos |
| UX / Arquitectura | 5 | Nav inconsistente entre páginas; flujo de cotización con `prompt()` nativo |
| UI / Componentes | 6 | Buen nivel en catálogo/carrito; sin estados de foco |
| Accesibilidad | 3 | No cumple WCAG 2.2 AA (evidencia numérica abajo) |
| Rendimiento | 5 | Sin optimización de imágenes ni bundling; 1,9 MB de imágenes |
| SEO | 7,5 | Lo más fuerte del sitio; catálogo invisible para Google |
| Conversión | 4 | Todo depende de WhatsApp; placeholders y prueba social débil |
| Código | 4 | Duplicación masiva de nav/footer; `admin.js` de 306 KB |

---

# 1. Primera impresión

**Qué transmite.** La home comunica "empresa digital joven que quiere verse grande": glassmorphism, degradados azul cielo, halo flotante, hero con producto renderizado. El mensaje comercial es claro en 3 segundos: *papelería y oficina para empresas en Barranquilla, entrega el mismo día* ([index.html:207-209](index.html#L207-L209)). Eso está bien resuelto.

**Emociones.** Ligereza y modernidad, pero no *solidez*. Para un comprador B2B (jefe de compras de un colegio o una entidad), la estética "SaaS startup" genera menos confianza que una estética "proveedor establecido": faltan el NIT visible, la dirección física, los logos de marcas y clientes en la home.

**Nivel de confianza.** Medio al aterrizar, **bajo al profundizar**:

- Las cifras se contradicen: "500+ Empresas satisfechas" junto a "Desde 2024" ([index.html:223-225](index.html#L223-L225)). Un comprador institucional hace esa cuenta (¿250 empresas nuevas por año?) y duda de todo lo demás. La "5★ Calificación promedio" no enlaza a ninguna fuente (Google Business, por ejemplo).
- Contacto muestra placeholders sin rellenar: `[NIT de la empresa]`, `[Dirección física en Barranquilla]`, `[Lun–Vie 8:00–18:00, Sáb 8:00–13:00]` ([contacto.html:140-143](contacto.html#L140-L143)). **Este es el peor defecto de todo el sitio**: es la página donde el cliente decide si eres real.
- Los iconos sociales del footer de la home son letras sueltas ("f", "◎", "in") sin `href` ([index.html:279](index.html#L279)): parecen botones rotos.

**¿Parece profesional/actual/grande?** Actual sí (estética 2024-2026). Profesional a medias. Parece exactamente lo que es: una empresa pequeña con una web ambiciosa — el objetivo del rediseño debe ser que parezca un **distribuidor regional consolidado**, y eso se logra con datos verificables y consistencia, no con más efectos.

---

# 2. Identidad visual

### 2.1 Marca y naming — tres nombres conviviendo

- **Problema:** el sitio usa al menos 4 identidades: "DLC" ([index.html:6](index.html#L6), título SEO), "DISTCOSTA" (dominio, previews), "Distribuciones Estratégicas de la Costa S.A.S" (logo/legal) y claves internas `dlc_*` ([js/app.js:84](js/app.js#L84)).
- **Evidencia:** `<title>Papelería y Suministros de Oficina en Barranquilla | DLC</title>` vs `og:site_name "Distribuciones Estratégicas de la Costa"`.
- **Impacto:** dilución de marca y de SEO de marca (nadie busca "DLC").
- **Justificación:** la ley de consistencia de branding: un solo nombre corto memorable + un descriptor legal.
- **Solución:** adoptar **DISTCOSTA** como marca comercial única (ya es el dominio). Títulos: `… | DISTCOSTA`. El nombre legal solo en footer, factura y privacidad.
- **Dificultad:** baja · **Prioridad:** 🟠

### 2.2 Paleta — dos sistemas y tokens con nombres engañosos

- **Problema:** conviven la paleta del index (`--blue:#0369A1`, `--blue2:#0EA5E9` en [index.html:67-74](index.html#L67-L74)) y la de `base.css`, donde los azules están guardados en variables llamadas `--gold`, `--gold-light`, `--gold-dark` ([css/base.css:19-23](css/base.css#L19-L23)) con el comentario "gold — mantiene compatibilidad JS". Además sobreviven restos de la paleta anterior: `theme-color #2F62D4` en [catalogo.html:10](catalogo.html#L10) y fallbacks `var(--brand-blue,#2F62D4)` por todo [empresas.html:93](empresas.html#L93) y [contacto.html:106](contacto.html#L106), y un CTA con gradiente hardcodeado del azul viejo `#2F62D4→#1E47A0` ([empresas.html:153](empresas.html#L153)) que no coincide con los botones del resto del sitio.
- **Impacto:** inconsistencia visual real (dos azules distintos en la misma jornada de compra) y mantenimiento imposible: nadie puede razonar sobre `--gold: #0369A1`.
- **Solución:** un solo archivo de tokens con nombres semánticos (`--brand-500/600/700`, ver §15) y una pasada de find/replace para retirar `#2F62D4`, `#1E47A0` y el alias `--gold`.
- **Dificultad:** media (hay JS que lee esas variables) · **Prioridad:** 🔴

### 2.3 Tipografía — una sola sans para todo

- **Problema:** Plus Jakarta Sans se usa para display, cuerpo, botones y formularios ([css/base.css:78-79](css/base.css#L78-L79)). Es una fuente correcta pero omnipresente en webs generadas por IA; el propio skill del repo ([.agents/skills/frontend-design/SKILL.md](.agents/skills/frontend-design/SKILL.md), líneas 30-38) prohíbe explícitamente esta convergencia y pide "display con carácter".
- **Impacto:** la marca no tiene voz tipográfica; la home es indistinguible de una plantilla.
- **Solución:** par display/cuerpo con carácter manteniendo la identidad azul: **Bricolage Grotesque** (display, gratuita, con personalidad geométrico-humanista que funciona en español) + **Inter** o **Source Sans 3** (cuerpo). Centralizado en `--font-display` / `--font-body`, que ya existen ([css/base.css:78-79](css/base.css#L78-L79)) — el cambio es de 2 líneas + el `<link>` de fuentes.
- **Dificultad:** baja · **Prioridad:** 🟠

### 2.4 Iconografía — cuatro sistemas mezclados

- **Evidencia:** SVG inline con trazo 1.8 en la home ([index.html:90](index.html#L90)) · Material Icons por webfont en el resto ([catalogo.html:36](catalogo.html#L36)) · **emojis** como iconos del tracking (📋 💰 ✅ 🚚 📦 en [js/app.js:271-275](js/app.js#L271-L275)) · letras sueltas como iconos sociales ([index.html:279](index.html#L279)).
- **Impacto:** los emojis se renderizan distinto por SO, los lee el lector de pantalla ("cara con billete de dólar"), y la webfont de Material Icons produce FOUT (el usuario ve el texto "shopping_cart" un instante).
- **Solución:** un único set SVG (Lucide, sprite inline o por componente), tamaño 20/24 px, `stroke-width` fijo. Eliminar emojis de la UI.
- **Dificultad:** media · **Prioridad:** 🟠

### 2.5 Logo, fotografía y fondos

- El logo es un PNG de **220 KB** usado también como favicon ([index.html:22](index.html#L22)). Debe existir en SVG (escalable, ~5 KB, nítido en retina) + favicon .ico/.png de 32 px.
- La fotografía mezcla render 3D (hero) con fotos reales (bodega, van). Para B2B, la foto real del equipo/bodega/flota **vende más** que el render: invertir en 6-8 fotos propias con la misma temperatura de color.
- Fondos: la home usa grid + radiales con máscara ([index.html:91-95](index.html#L91-L95)) — bien ejecutado. El hero del catálogo en cambio acumula 3 orbs + 2 capas de estrellas + noise + 3 anillos SVG + marquee ([catalogo.html:97-149](catalogo.html#L97-L149)): es ruido visual que compite con los productos. Menos capas, más intención.

---

# 3. Experiencia de usuario (UX)

### 3.1 Navegación inconsistente entre páginas 🔴

- **Problema:** la home ofrece 5 enlaces (Inicio · Catálogo · Empresas · Nosotros · Contacto) con CTA "Cotiza ahora" ([index.html:183-190](index.html#L183-L190)); todas las demás páginas ofrecen 7 en otro orden (Inicio · Catálogo · Nosotros · Seguimiento · FAQ · Empresas · Contacto) sin CTA ([catalogo.html:59-67](catalogo.html#L59-L67)). Empresas — la página de mayor valor comercial — pasa de la posición 3 a la 6.
- **Impacto:** desorientación (el usuario pierde referencias espaciales al navegar) y pérdida del CTA principal fuera de la home.
- **Justificación:** consistencia de Nielsen (#4); la memoria espacial del menú es de los anclajes más fuertes de la navegación web.
- **Solución:** un único menú, mismo orden en todo el sitio, con CTA persistente: `Inicio · Catálogo · Empresas · Nosotros · Contacto` + botón "Cotizar" (FAQ y Seguimiento van a footer y a la página de empresa). Implementarlo una sola vez (ver §17).
- **Dificultad:** media · **Prioridad:** 🔴

### 3.2 Flujo de aprobación de cotización con diálogos nativos 🔴

- **Problema:** aprobar una cotización — el momento de mayor valor del funnel — se hace con `confirm()` y un `prompt()` nativo del navegador que pide correo/NIT/teléfono ([js/app.js:438-444](js/app.js#L438-L444)), y los errores con `alert()` ([js/app.js:469](js/app.js#L469)).
- **Impacto:** los diálogos nativos parecen phishing (sin marca, sin contexto), no se pueden estilar, rompen en móvil con teclados, y Chrome los bloquea en iframes. Es el punto exacto donde un cliente institucional puede abandonar una orden ya cotizada.
- **Solución:** modal propio (ya existe el sistema `modal-overlay` en [css/modals.css](css/modals.css) y `openModal()` en [js/app.js:90-97](js/app.js#L90-L97)) con input etiquetado, validación inline y estado de carga.
- **Dificultad:** baja-media · **Prioridad:** 🔴

### 3.3 Datos de contacto inconsistentes y rotos 🔴

- El teléfono de ayuda del seguimiento es **(57) 321 896 5745** ([js/app.js:463](js/app.js#L463)) mientras todo el sitio usa **(57) 302 354 8415**. Uno de los dos está mal; si un cliente con pedido llama al equivocado, se pierde la entrega.
- El enlace de correo del footer del catálogo apunta a `/cdn-cgi/l/email-protection#…` ([catalogo.html:288-289](catalogo.html#L288-L289)): es la ofuscación de Cloudflare pegada como HTML estático. **Fuera de Cloudflare ese enlace está muerto** y el texto se muestra como "[email protected]".
- **Solución:** unificar teléfono (verificar cuál es el real), restaurar `mailto:` normal, y centralizar los datos de contacto en un único parcial/constante.
- **Dificultad:** trivial · **Prioridad:** 🔴

### 3.4 Arquitectura de información y hallazgo

- **Sin breadcrumbs visibles** en ninguna página (existen solo como JSON-LD, [catalogo.html:23-32](catalogo.html#L23-L32)). En un catálogo con categorías, el breadcrumb visible orienta y añade enlaces internos.
- **Búsqueda solo dentro del catálogo** ([catalogo.html:152](catalogo.html#L152)); no hay búsqueda global, aceptable a este tamaño de sitio, pero el input no tiene label ni botón (solo placeholder) — ver §6.
- **Seguimiento exige el ID exacto** (`REM-…`); tras el endurecimiento de seguridad (correcto) ya no se busca por nombre ([js/app.js:314-317](js/app.js#L314-L317)). Falta decirle al usuario **dónde encuentra su número** (está en el correo de EmailJS): una línea de ayuda bajo el input reduce tickets de soporte.
- **FAQ y Seguimiento** no están enlazados desde el flujo del carrito, que es donde nacen las dudas ("¿cuánto tarda?", "¿cómo pago?").

### 3.5 Formularios

El sitio público **no tiene ni un formulario de captación** (contacto y empresas convierten solo por enlaces a WhatsApp/tel/mailto, [contacto.html:115-132](contacto.html#L115-L132)). El único formulario real del funnel es el del modal de cotización del carrito. Consecuencias en §9. El login interno tiene labels sin asociar (§6).

---

# 4. Interfaz (UI)

| Componente | Estado | Evidencia y observaciones |
|---|---|---|
| Botones | ⚠️ | Dos sistemas: `.btn/.btn-primary` del index ([index.html:85-89](index.html#L85-L89)) y `.btn-primary/.btn-secondary` de base ([css/base.css:220-286](css/base.css#L220-L286)). Mismos nombres, métricas distintas. Hover con `translateY(-2px)` + sombra: correcto. `:active scale(0.97)`: buen detalle. **Texto blanco sobre el tramo claro del gradiente falla contraste (2,1:1, §6).** |
| Inputs | ⚠️ | `.form-group` bien resuelto: focus con borde + ring de 3px ([css/base.css:319-326](css/base.css#L319-L326)). Pero el placeholder `#94A3B8` falla contraste (2,43:1) y el buscador del catálogo no usa este sistema ni tiene label. |
| Cards | ✔️ | `.ccard` con hover elevación + borde ([index.html:149-150](index.html#L149-L150)); cards de empresas son `div` con 100% estilos inline ([empresas.html:110-139](empresas.html#L110-L139)) — mismo aspecto, cero reutilización. |
| Modales | ✔️ | Overlay con cierre por clic-fuera y Escape ([js/app.js:99-121](js/app.js#L99-L121)). Falta gestión de foco (focus trap, devolver foco al cerrar). |
| Dropdowns | — | No hay componente propio; los `select` usan el estilo de inputs. |
| Estados hover | ✔️ | Consistentes dentro de cada sistema; transiciones 200-350 ms correctas. |
| Estados focus | ❌ | **Cero `:focus-visible` en 4.920 líneas de CSS.** El reset elimina el outline por defecto en inputs (`outline:none`, [css/base.css:313](css/base.css#L313)) y solo lo compensa en inputs, no en enlaces ni botones. |
| Disabled | ⚠️ | Solo `.submit-btn:disabled` ([css/base.css:362](css/base.css#L362)); `.btn-primary` no tiene estado disabled. |
| Feedback | ✔️ | Skeleton loader definido ([css/base.css:434-439](css/base.css#L434-L439)), spinner en seguimiento, badge del carrito con `bounceIn`. Buenos cimientos. |
| Microinteracciones | ⚠️ | Bien en botones/cards; excesivas en el hero del catálogo (GSAP+ScrollTrigger cargados solo para animar un h1 y un párrafo, [catalogo.html:266-276](catalogo.html#L266-L276)). |
| Sistema de diseño | ❌ | No existe como tal: tokens duplicados, componentes duplicados, sin documentación viva (el README documenta una paleta que ya no existe, README.md §variables). |

---

# 5. Responsive

- **Breakpoints:** 900/560 px en index ([index.html:172-173](index.html#L172-L173)); 768/600 px en el resto ([css/base.css:472](css/base.css#L472), [css/nav.css:367](css/nav.css#L367)). Dos sistemas de breakpoints = comportamientos distintos entre páginas con el mismo ancho de ventana.
- **Móvil:** el menú móvil está bien resuelto (overlay, bloqueo de scroll, animación). Pero la home tiene su propia hamburguesa/menú (`.ham/.mnav`, [index.html:106-111](index.html#L106-L111)) distinta a la del resto (`.nav-hamburger/.nav-mobile-menu`). Dos códigos para el mismo patrón.
- **Dark mode bloqueado en móvil** a la fuerza ([js/app.js:126-136](js/app.js#L126-L136)): un usuario de escritorio que eligió oscuro (admin) lo pierde al rotar/reducir la ventana (`resize` fuerza light, [js/app.js:193-198](js/app.js#L193-L198)). Comportamiento sorpresa sin explicación.
- **Touch targets:** botones principales ≥44 px ✔️; los enlaces del nav desktop tienen padding 6×14 px (~30 px de alto), justos si se usan en tablet ([css/nav.css:149](css/nav.css#L149)).
- **Tipografía fluida:** `clamp()` bien usado en héroes ([index.html:115](index.html#L115)). El cuerpo queda en 15-17 px: subir mínimo a 16 px en móvil.
- **Imágenes:** sin `srcset`, el móvil descarga la misma `bodega.jpg` de 396 KB que el desktop (§7).
- **Pantallas grandes:** contenedores 1000-1200 px correctos; el marquee del catálogo y los orbs escalan sin romperse.
- **Riesgo CLS móvil:** las category cards usan `background-image` sin altura reservada dependiente de fuente — bajo. El mayor riesgo de CLS es la webfont de Material Icons mostrando el nombre del icono como texto antes de cargar (menú móvil entero, [catalogo.html:77-83](catalogo.html#L77-L83)).

---

# 6. Accesibilidad (WCAG 2.2)

**Veredicto: no cumple nivel AA.** Fallos medidos (script de esta sesión, fórmula WCAG):

| Par de colores | Uso real | Ratio | AA (4,5:1) |
|---|---|---|---|
| `#94A3B8` sobre `#FFFFFF` | `--text-xsoft`, metadatos y placeholders ([css/base.css:42](css/base.css#L42)) | **2,56:1** | ❌ |
| `#94A3B8` sobre `#F6F9FC` | placeholder de inputs ([css/base.css:110](css/base.css#L110)) | **2,43:1** | ❌ |
| `#38BDF8` sobre `#F8FAFC` | eyebrow "Catálogo" de la home ([index.html:83](index.html#L83)) | **2,05:1** | ❌ (13 px bold no llega a large-text) |
| `#FFFFFF` sobre `#38BDF8` | inicio del gradiente `.btn-primary` ([css/base.css:240](css/base.css#L240)) | **2,14:1** | ❌ |
| `#FFFFFF` sobre `#0EA5E9` | tramo medio del gradiente del index ([index.html:86](index.html#L86)) | **2,77:1** | ❌ |
| `#FFFFFF` sobre `#25D366` | icono botón WhatsApp ([index.html:284](index.html#L284)) | **1,98:1** | ❌ (mínimo gráfico 3:1) |
| `#1E8A38` sobre verde 10% | badge "Aprobado" ([css/base.css:416](css/base.css#L416)) | 3,97:1 | ❌ a 11 px |

Aprueban: texto principal 17,85:1 (AAA), `--text-mid` 7,58:1 (AAA), `--text-soft` 4,76:1, enlaces `#0369A1` 5,93:1.

**Resto de fallos estructurales:**

1. **Foco de teclado invisible** — 0 reglas `:focus-visible` en todo el CSS; el índice de tab existe pero no se ve. Bloqueante para AA (2.4.7) y para cualquier usuario de teclado. **Solución:** regla global `:focus-visible { outline: 2px solid var(--brand-600); outline-offset: 2px; }` + versión para fondos oscuros. 🔴
2. **Sin skip link** en ninguna página (2.4.1). Añadir `<a class="skip-link" href="#main">Saltar al contenido</a>`. 🟠
3. **Logo-nav inaccesible:** es un `div` con `onclick` ([catalogo.html:52](catalogo.html#L52)) — no focusable, no activable por teclado, invisible para lector de pantalla como enlace. Debe ser `<a href="index.html">`. 🔴
4. **Buscador sin nombre accesible:** `<input id="catalog-search" placeholder="Buscar productos...">` sin label ni `aria-label` ([catalogo.html:152](catalogo.html#L152)) (1.3.1, 4.1.2). 🔴
5. **Labels sin asociar** en el login interno (recon: `acceso-interno.html` L41-46 sin `for`/`id`) y **página interna sin landmarks**. 🟠
6. **`index.html` sin `<main>`** ([index.html:205](index.html#L205) usa `<header class="hero">` + secciones sueltas); el resto sí lo tiene. 🟠
7. **Emojis como iconos de estado** del tracking ([js/app.js:271-275](js/app.js#L271-L275)): verbalización absurda en lector de pantalla. 🟠
8. **`prompt()` para verificación de identidad** ([js/app.js:441](js/app.js#L441)): sin label, sin instrucciones persistentes, imposible de asistir. 🔴
9. **Correcto:** `alt` al 100% en imágenes reales, `aria-label` en botones icono (hamburguesa, WhatsApp, carrito), `prefers-reduced-motion` respetado en index ([index.html:174](index.html#L174)) — verificar que `animations.css` también lo respete.

**Nivel AAA:** no es objetivo razonable ahora; alcanzar AA sólido (contraste + foco + labels + landmarks) es 1-2 días de trabajo.

---

# 7. Rendimiento (análisis estático)

**Presupuesto actual estimado de la home:** ~1 MB transferido (hero-float 260 KB + logo 220 KB ×2 usos + bodega 396 KB lazy + fuentes) con CSS crítico inline — la home es, irónicamente, la página más rápida por ser isla. **El catálogo es la más pesada:** 11 CSS + 9 JS sin minificar + 4 CDNs.

| Hallazgo | Evidencia | Impacto | Solución | Prioridad |
|---|---|---|---|---|
| Imágenes JPG/PNG sin WebP/AVIF ni `srcset` (0 en todo el repo) | `img/` = **1,88 MB**; bodega.jpg 396 KB, hero-float.png 260 KB, van.jpg 228 KB | LCP alto en móvil/3G; el hero-float es probablemente el LCP de la home | Convertir a WebP (−60-80%), generar 2-3 tamaños con `srcset`, `fetchpriority="high"` en el LCP | 🔴 |
| Logo PNG 220 KB como favicon y logo | [index.html:22](index.html#L22), [index.html:182](index.html#L182) | 220 KB en cada página, y el favicon se descarga siempre | SVG (~5 KB) + favicon 32px | 🔴 |
| Fuente descargada dos veces | `<link>` en cada HTML + `@import` en [css/base.css:1](css/base.css#L1) | El `@import` dentro de CSS es render-blocking en cascada (se descubre tarde) | Eliminar el `@import`; dejar solo `<link>` con `preconnect` (hoy solo index tiene preconnect, [index.html:62-63](index.html#L62-L63)) | 🔴 |
| GSAP + ScrollTrigger (~110 KB) para animar 2 elementos | [catalogo.html:206-207](catalogo.html#L206-L207), uso en L266-276 | 2 requests + parse para algo que CSS hace gratis | Reemplazar por animación CSS con `animation-delay` | 🟠 |
| 8-11 hojas CSS y 5-9 JS sin minificar ni combinar | [catalogo.html:38-45](catalogo.html#L38-L45), [catalogo.html:204-213](catalogo.html#L204-L213) | Cascada de requests render-blocking (CSS) | Build mínimo (esbuild/Vite o incluso `cat`+minify en CI) → 1 CSS + 1-2 JS | 🟠 |
| Scripts al final del body sin `defer` | todas las páginas | Correcto para no bloquear parse, pero el orden es frágil (dependencias implícitas entre 6 globals) | `defer` + módulos ES (§17) | 🟢 |
| `pageFadeIn` de 0,42 s en `body` | [css/base.css:179-184](css/base.css#L179-L184) | Retrasa la percepción de carga en TODAS las páginas (el contenido ya está, pero invisible); penaliza LCP percibido | Quitarlo o limitarlo a 0,2 s solo en héroes | 🟠 |
| Material Icons webfont → FOUT de nombres de icono | [catalogo.html:36-37](catalogo.html#L36-L37) | Flash de texto "shopping_cart"; CLS leve | Migrar a SVG inline (§2.4) | 🟠 |
| `admin.js` 306 KB sin trocear | `js/admin.js` | Solo afecta al panel interno, pero 3.086 líneas parseadas en cada login | Trocear por módulo con imports dinámicos | 🟢 |
| Lazy loading parcial | index 1, nosotros 12, resto 0 | Imágenes bajo el fold se descargan siempre | `loading="lazy"` sistemático salvo LCP | 🟠 |

**CWV esperados (estimación cualitativa):** LCP móvil de la home en riesgo por hero-float.png; CLS bajo (dimensiones declaradas en index, [index.html:217](index.html#L217)); INP sano (poco JS en hilo principal en páginas públicas). Medir con PageSpeed Insights sobre distcosta.com al publicar.

---

# 8. SEO

**Lo más sólido del sitio.** Base común excelente: titles únicos orientados a intención local, meta description, canonical, OG/Twitter completos, `robots.txt`, `sitemap.xml`, CNAME coherente, JSON-LD `Store`+`WebSite`+`SearchAction` ([index.html:23-61](index.html#L23-L61)), `FAQPage` en FAQ, `Service` en empresas, `BreadcrumbList` en varias.

**Hallazgos a corregir:**

1. 🔴 **El catálogo es invisible para Google.** Los 68 productos se renderizan 100% client-side desde Supabase en `#catalog-grid` vacío ([catalogo.html:160](catalogo.html#L160)). Google puede ejecutar JS, pero el contenido dependiente de fetch autenticado con anon-key es de indexación frágil, y no existen URLs por producto ni por categoría (solo `?cat=`). Consecuencia: cero long-tail ("resma carta reprograf barranquilla"). **Solución:** pre-render estático de las cards (build que consulte Supabase y genere HTML) o al menos páginas de categoría estáticas con listado SSG + `ItemList` schema.
2. 🔴 **JSON-LD con datos placeholder:** `"streetAddress": "[DIRECCIÓN — calle y número]"` ([contacto.html:45](contacto.html#L45)) se está enviando a Google tal cual. Rich results con basura o descartados.
3. 🟠 **Marca inconsistente en titles** ("| DLC" vs site_name largo) — §2.1.
4. 🟠 **`theme-color` desincronizado:** `#F8FAFC` en index ([index.html:10](index.html#L10)) vs `#2F62D4` legado en el resto ([catalogo.html:10](catalogo.html#L10)).
5. 🟠 **`seguimiento.html` sin JSON-LD** y sin `max-image-preview` (recon L9); añadir `WebPage` + breadcrumb.
6. 🟢 **Sin página 404 personalizada** (no existe `404.html`; GitHub Pages sirve la genérica): pérdida de retención en enlaces rotos.
7. 🟢 Oportunidad de contenido local que la competencia ya explota (Suescun tiene páginas por zona: "papelería al por mayor en Barranquilla"): crear 2-3 landings por intención ("papelería para colegios", "suministros para entidades públicas", "tóner y tintas Barranquilla").

---

# 9. Conversión (CRO)

**Diagnóstico del embudo actual:** Home → Catálogo → Carrito → Modal cotización (EmailJS+Supabase) → WhatsApp para todo lo demás. La dependencia de WhatsApp es razonable en Colombia (es el canal real), pero el sitio **no captura ningún lead propio**: si el usuario no quiere abrir WhatsApp, no hay plan B ([contacto.html:115-132](contacto.html#L115-L132) son solo enlaces).

| # | Problema | Evidencia | Impacto | Solución | Dif. | Prio |
|---|---|---|---|---|---|---|
| 1 | Placeholders visibles en la página de cierre | [contacto.html:140-143](contacto.html#L140-L143) | Destruye la confianza justo antes de convertir | Rellenar NIT, dirección y horario reales (30 min de trabajo) | Trivial | 🔴 |
| 2 | Prueba social inexistente en el funnel | 0 testimonios en el repo; logos de 12 marcas solo en nosotros.html | Un comprador B2B compara con Abastece ("5.000+ clientes B2B, desde 1999") | Fila de logos de marcas en la home + 3 testimonios con nombre/cargo/empresa + enlace a reseñas de Google | Baja | 🔴 |
| 3 | Cifras no creíbles | "500+ empresas" + "Desde 2024" ([index.html:223-225](index.html#L223-L225)) | Incoherencia detectable en 5 s | Usar cifras verificables: nº de productos, tiempo de entrega, marcas distribuidas, pedidos entregados | Trivial | 🔴 |
| 4 | Sin formulario B2B | empresas.html solo tiene 2 enlaces WhatsApp ([empresas.html:100-106](empresas.html#L100-L106)) | Los compradores institucionales cotizan por escrito con NIT/correo corporativo, no por chat | Formulario corto (empresa, NIT, correo, necesidad) → EmailJS ya integrado + registro en Supabase | Media | 🟠 |
| 5 | Redes sociales muertas | [index.html:279](index.html#L279) sin `href` | Señal de abandono | Enlazarlas o eliminarlas (mejor eliminar que fingir) | Trivial | 🔴 |
| 6 | CTA del carrito sin refuerzo | "Solicitar Cotización" ([catalogo.html:186-188](catalogo.html#L186-L188)) sin promesa de tiempo | La promesa "en menos de 24 h" existe en contacto pero no aquí | Microcopy bajo el botón: "Respuesta en menos de 24 h hábiles" | Trivial | 🟢 |
| 7 | Sin urgencia/incentivo | — | — | Banner honesto: "Pedidos antes de las 12 m se entregan hoy en Barranquilla" (usa la ventaja real) | Baja | 🟢 |
| 8 | Autoridad desaprovechada | Seguimiento online + remisiones digitales ya existen | Ningún competidor local pequeño lo tiene | Contarlo en la home como diferenciador ("Rastrea tu pedido en línea") | Baja | 🟠 |

---

# 10. Código

**Arquitectura actual:** multipágina estática con CSS modular y JS global (0 módulos ES, patrón IIFE + `window.*`). Sin build, sin linter, sin tests.

1. 🔴 **Duplicación estructural masiva:** navbar, menú móvil, footer y bloque `<head>` copiados a mano en 8-9 HTML. Ya hay divergencias reales por ello: menús distintos (§3.1), footers distintos (el de index tiene "Síguenos", el resto "Categorías"; compárense [index.html:271-282](index.html#L271-L282) y [catalogo.html:279-318](catalogo.html#L279-L318)), y el email roto de Cloudflare pegado en uno solo de los footers.
2. 🔴 **`index.html` isla de diseño** (§2.2): 110 líneas de CSS propio + navbar propia + footer propio. Cada mejora hay que hacerla dos veces.
3. 🟠 **`toggleNav()` definido 3 veces** — en [js/app.js:475-485](js/app.js#L475-L485) y de nuevo inline en cada página ([contacto.html:190-199](contacto.html#L190-L199), [empresas.html:198-207](empresas.html#L198-L207), [catalogo.html:226-235](catalogo.html#L226-L235)); gana el último en cargarse. Además existe `js/nav-mobile.js` para lo mismo. Cuatro implementaciones del mismo menú.
4. 🟠 **Código muerto/vestigial:** `showPage()` con mapa de la era SPA ([js/app.js:7-37](js/app.js#L7-L37)), `js/data.js` (catálogo local heredado, 237 líneas que aún se cargan en catalogo.html), capas de nav.css anuladas por la sección "UNIFICACIÓN CON INDEX" ([css/nav.css:380-403](css/nav.css#L380-L403) revierte las L5-179), `fix.py` con ruta absoluta de otra máquina (`C:\Users\Gala\...`, fix.py L1), `dark-preview.html`, `stripe-preview.html` y 2 snippets en la raíz pública.
5. 🟠 **Configuración dispersa:** la URL y anon-key de Supabase están repetidas en `js/store.js:8`, `js/catalog.js:6`, [js/app.js:267-268](js/app.js#L267-L268) y 8+ sitios de `js/admin.js`. La anon key es pública por diseño (el RLS ya fue endurecido con las 9 migraciones de 2026), pero repetirla garantiza inconsistencias al rotarla. → `js/config.js` único.
6. 🟠 **`admin.js` monolito de 306 KB / 3.086 líneas** (75% del JS del proyecto) + `admin-extras.js` que lo parchea por encima sin tocarlo (anti-patrón "capa de correcciones"). → trocear por dominio (pedidos, remisiones, usuarios, catálogo) con imports dinámicos.
7. 🟢 **Estilo mixto ES5/ES6** (`var` + `const` en el mismo archivo), sin ESLint/Prettier. Comentarios de proceso tipo "← cambiar de 'active' a 'open'" ([js/app.js:481-483](js/app.js#L481-L483)) que son ruido.
8. ✔️ **Puntos fuertes reales:** separación CSS por dominio, seguridad backend seria (RPCs, RLS, rate-limit, sesiones server-side — las 9 migraciones de mayo-junio 2026), escape de HTML en render de tracking (`_esc`), `IntersectionObserver` para reveals, `passive:true` en scroll.

---

# 11. Diseño moderno

Paradoja del sitio: **no le faltan efectos modernos — le sobra ornamentación y le falta sistema.** Inventario contra el checklist 2026:

| Tendencia | Estado | Comentario |
|---|---|---|
| Glassmorphism | ✔️ presente | Bien en nav/stats; abusa en catálogo-hero |
| Microanimaciones | ✔️ | hover/active/bounceIn correctos |
| Scroll reveal | ✔️ | IntersectionObserver + GSAP |
| Sticky sections / parallax | ⚠️ | Solo nav sticky; sin parallax (no es carencia grave en B2B) |
| Bento grid | ❌ | Las categorías son un grid uniforme 5×1 ([index.html:250-256](index.html#L250-L256)); un bento con jerarquía (Tecnología y Papelería grandes, resto pequeñas) contaría mejor qué vende más |
| Dark mode público | ❌ | Existe la infraestructura completa (`[data-theme]` en base.css:117-159) pero está confinada al admin y bloqueada en móvil |
| Tipografía display con carácter | ❌ | §2.3 — es la carencia #1 según su propio skill de diseño |
| Hero section moderna | ⚠️ | Composición correcta pero genérica (render flotante + halo = patrón plantilla) |
| Espaciados generosos | ✔️ | 90px de ritmo vertical bien llevado |
| View Transitions / `prefers-color-scheme` | ❌ | Oportunidad de bajo coste |

**Contra el skill local del repo** ([.agents/skills/frontend-design/SKILL.md](.agents/skills/frontend-design/SKILL.md)): el sitio incumple sus propias reglas — fuente convergente, layout predecible, ornamentación sin dirección única. La corrección no es añadir más efectos sino **elegir una dirección** (propuesta en §13) y ejecutarla con menos capas.

---

# 12. Competencia

Consultados durante esta sesión (búsqueda y análisis reales):

| Competidor | Qué hace mejor que DISTCOSTA | Qué hace peor |
|---|---|---|
| **[Panamericana](https://www.panamericana.com.co/)** (nacional) | E-commerce transaccional completo: precios visibles, compra directa, buscador global, páginas por producto indexables, catálogos digitales | Experiencia genérica de retail masivo; sin trato B2B cercano |
| **[Abastece.co](https://www.abastece.co/proveedor-papeleria-empresas-bogota/)** (B2B, Bogotá/Medellín/B'quilla) | Prueba social dura ("5.000+ clientes B2B", opera desde 1999), entrega express 2 h, chat IA que arma carrito corporativo, control de gasto por sede/centro de costo, crédito a fin de mes — todo contado en la landing | Sin testimonios con nombre; diseño funcional sin marca fuerte |
| **[Suescun](https://www.suescun.com.co/papeleria-al-por-mayor-en-barranquilla/)** (mayorista, cubre la Costa) | SEO local agresivo: landing específica por ciudad y por zonas de Barranquilla (Riomar, Vía 40, Soledad…), promesa logística concreta 24-48 h | UX de catálogo anticuada |
| **[ISCAR / kaycosas](https://kaycosas.com/)** | Segmentación por audiencia (colegios, empresas, instituciones) | Diseño débil |

**Lecciones accionables:** (1) la prueba social B2B se dice con números verificables y antigüedad, no con estrellas; (2) el SEO local por intención/zona es el campo de batalla real en Barranquilla; (3) las funciones B2B (crédito, centro de costos, reporting) se anuncian en la landing aunque se gestionen por asesor; (4) DISTCOSTA tiene un arma que ninguno exhibe bien: **seguimiento online del pedido + aprobación de cotización en línea** — debe ser protagonista de la home.

---

# 13. Propuesta de rediseño

**Dirección: "Distribuidor Caribe, precisión logística".** Identidad azul mantenida (preferencia ya establecida), elevada con tipografía display con carácter y datos verificables como lenguaje de confianza. Menos capas decorativas, más contenido que venda.

- **Tipografía:** Bricolage Grotesque (display 600-800) + Inter/Source Sans 3 (cuerpo 400-600), vía `--font-display`/`--font-body` existentes.
- **Color:** un solo azul de marca `#0369A1` con escala 50-900, navy `#0F172A` para texto y bloques oscuros, acento cálido opcional (ámbar `#D97706`) para badges de urgencia/entrega — diferencia frente al mar de azules del sector.
- **Header único** (compartido por inyección/build): logo SVG + 5 enlaces + CTA "Cotizar" + carrito (solo catálogo). Glass sutil al hacer scroll, como hoy.
- **Hero home:** titular de beneficio concreto ("Tu papelería y oficina, entregada hoy en Barranquilla"), sub con los 3 diferenciadores (mismo día · crédito corporativo · seguimiento online), CTA doble (Ver catálogo / Cotizar para mi empresa), foto real de bodega/flota con tratamiento duotono azul en lugar del render flotante.
- **Fila de confianza** inmediatamente bajo el hero: 12 logos de marcas (ya existen en `img/brands/`) en marquee lento + "Distribuidor autorizado".
- **Categorías en bento:** 2 celdas grandes (Papelería, Tecnología) + 3 medianas, con foto y nº de productos por categoría (dato real desde Supabase en build).
- **Sección "Cómo trabajamos"** (3 pasos: Cotiza → Aprueba en línea → Recibe y rastrea) — convierte el diferenciador técnico en argumento de venta.
- **Prueba social:** 3 testimonios con nombre/cargo/empresa + cifras honestas (productos en catálogo, marcas, tiempo medio de entrega).
- **CTA final B2B** con formulario corto embebido (no solo WhatsApp) + botón WhatsApp como alternativa.
- **Footer único:** 4 columnas (marca+NIT+dirección real, navegación, categorías, contacto), sin redes hasta que existan.
- **Páginas interiores:** mismo hero pattern sobrio (eyebrow + h1 + sub, sin orbs), breadcrumb visible, y el catálogo con la ficha/carrito actuales pero iconos SVG y buscador con label y botón.
- **Animación:** una sola orquesta de entrada por página (stagger 60-80 ms con CSS), hover consistente, `prefers-reduced-motion` global. GSAP fuera.

---

# 14. Wireframes

### Home — desktop (1180 px)

```
┌────────────────────────────────────────────────────────────┐
│ [logo SVG]  Inicio Catálogo Empresas Nosotros Contacto  [Cotizar] │ ← header 64px, glass on-scroll
├────────────────────────────────────────────────────────────┤
│  EYEBROW: DISTRIBUIDOR EN BARRANQUILLA                     │
│  H1 (Bricolage, clamp 44-72): Tu papelería y oficina,      │
│  entregada hoy en Barranquilla                             │   [FOTO real bodega/flota
│  Sub: mismo día · crédito corporativo · seguimiento online │    duotono azul, 55% ancho]
│  [Ver catálogo]  [Cotizar para mi empresa]                 │
├────────────────────────────────────────────────────────────┤
│  ▸ marquee lento: BIC · Faber-Castell · Casio · Kingston…  │ ← confianza, logos reales
├────────────────────────────────────────────────────────────┤
│  BENTO CATEGORÍAS                                          │
│  ┌───────────────┬───────────────┬───────┐                 │
│  │ Papelería     │ Tecnología    │ Impre-│                 │
│  │ (grande,foto) │ (grande,foto) │ sión  │                 │
│  ├───────┬───────┴───────────────┴───────┤                 │
│  │ Mobil.│ Aseo y cafetería   [Ver todo →]                 │
│  └───────┴────────────────────────────────                 │
├────────────────────────────────────────────────────────────┤
│  CÓMO TRABAJAMOS: ① Cotiza → ② Aprueba online → ③ Rastrea  │ ← 3 pasos, iconos SVG
├────────────────────────────────────────────────────────────┤
│  TESTIMONIOS (3 cards: cita, nombre, cargo, empresa)       │
│  + cifras honestas: 68 productos · 12 marcas · <24h        │
├────────────────────────────────────────────────────────────┤
│  CTA B2B (bloque navy): formulario corto (empresa, NIT,    │
│  correo, mensaje) [Enviar]  ·  ó  [WhatsApp]               │
├────────────────────────────────────────────────────────────┤
│  FOOTER: marca+NIT+dirección | navegación | categorías |   │
│  contacto  ·  © + privacidad                               │
└────────────────────────────────────────────────────────────┘
```

### Home — móvil (375 px)

```
┌──────────────────────┐
│ [logo]          [☰] │
├──────────────────────┤
│ H1 (clamp 34px)      │
│ Sub (16px)           │
│ [Ver catálogo]       │  ← CTA full-width, 48px alto
│ [Cotizar empresa]    │
│ [foto 4:3 lazy]      │
├──────────────────────┤
│ marquee marcas       │
│ bento → 1 col apilada│
│ (Papelería y Tecno   │
│  primero, foto 16:9) │
│ 3 pasos verticales   │
│ testimonios swipe →  │
│ CTA B2B (form corto) │
│ footer 1 col         │
└──────────────────────┘
│ [WhatsApp flotante]  │ ← 56px, aria-label, contraste corregido
```

### Catálogo

```
┌────────────────────────────────────────────┐
│ header único + [🛒 carrito]                │
│ Inicio / Catálogo            ← breadcrumb  │
│ H1 sobrio: Catálogo 2026 (sin orbs/stars)  │
│ [label Buscar] [input........] [Buscar]    │
│ chips: Todos · Papelería · Tecnología · …  │
│ ┌────┬────┬────┬────┐                      │
│ │card│card│card│card│  ← foto, nombre,     │
│ └────┴────┴────┴────┘    marca, [+ Añadir] │
│ … (paginado o scroll)                      │
└────────────────────────────────────────────┘
  Carrito lateral: items, subtotal, IVA,
  total, [Solicitar cotización]
  + "Respuesta en <24h hábiles"
```

### Empresas (B2B)

```
┌────────────────────────────────────────────┐
│ H1: Suministro corporativo con crédito     │
│ 6 cards beneficios (componente compartido) │
│ Bloque "¿Para quién?" (3 audiencias)       │
│ ★ FORMULARIO B2B (4 campos) + WhatsApp alt │
│ logos marcas + testimonio institucional    │
└────────────────────────────────────────────┘
```

---

# 15. Sistema de diseño (tokens propuestos)

Un solo `:root` en `css/tokens.css`, reemplazando el actual doble sistema:

```css
:root {
  /* Marca */
  --brand-50:#F0F9FF; --brand-100:#E0F2FE; --brand-300:#7DD3FC;
  --brand-500:#0EA5E9; --brand-600:#0369A1; --brand-700:#075985;
  --navy-900:#0F172A; --navy-950:#020617;
  --accent-600:#D97706;            /* urgencia/entrega */
  --success-600:#15803D; --danger-600:#B91C1C; --wa:#1DA851; /* ≥3:1 con blanco */

  /* Texto (todos AA sobre blanco) */
  --text:#0F172A; --text-mid:#475569; --text-soft:#5B6B7E; /* sustituye #64748B justo y elimina #94A3B8 como texto */

  /* Superficies */
  --bg:#FFFFFF; --bg-subtle:#F6F9FC; --bg-inverse:#0B1220;
  --border:rgba(15,23,42,.10); --border-strong:rgba(15,23,42,.18);

  /* Tipografía */
  --font-display:'Bricolage Grotesque',system-ui,sans-serif;
  --font-body:'Inter',system-ui,sans-serif;
  --fs-12:.75rem; --fs-14:.875rem; --fs-16:1rem; --fs-18:1.125rem;
  --fs-21:1.3125rem; --fs-28:1.75rem; --fs-36:2.25rem;
  --fs-display:clamp(2.5rem,5vw,4.25rem);
  --lh-body:1.6; --lh-heading:1.1;

  /* Espaciado (escala 4px) */
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-6:24px;
  --sp-8:32px; --sp-12:48px; --sp-16:64px; --sp-24:96px;

  /* Radios y sombras */
  --radius-sm:8px; --radius-md:14px; --radius-lg:20px; --radius-full:999px;
  --shadow-sm:0 2px 8px rgba(15,23,42,.06);
  --shadow-md:0 12px 32px rgba(15,23,42,.10);
  --shadow-brand:0 8px 28px rgba(3,105,161,.28);

  /* Z-index */
  --z-nav:100; --z-overlay:200; --z-modal:300; --z-toast:400;

  /* Motion */
  --ease-out:cubic-bezier(.22,1,.36,1); --dur-fast:150ms; --dur-base:250ms;
}
```

**Reglas de componentes:**

- **Botón primario:** fondo sólido `--brand-600` (blanco encima = 5,93:1 AA ✓) — el gradiente actual falla contraste en su tramo claro; si se quiere gradiente, `#0369A1→#075985`. Estados: hover (−4% luminosidad + sombra), active (scale .97), disabled (opacity .45 + `cursor:not-allowed`), focus-visible (outline 2px offset 2px). Altura 44-48px.
- **Botón secundario:** borde `--border-strong`, texto `--text`; **ghost:** solo texto `--brand-600`.
- **Inputs:** 44px min, label siempre visible (no placeholder-como-label), placeholder `#64748B`, focus ring `0 0 0 3px rgba(3,105,161,.18)` + borde `--brand-600`; error con borde `--danger-600` + mensaje bajo el campo.
- **Cards:** `--bg` + `--border` + `--radius-md` + `--shadow-sm`; hover: `--shadow-md` + borde brand 25%; padding `--sp-6`.
- **Badges:** 12px/700, fondo 12% del color, texto de la escala 700 (nunca 500) para garantizar 4,5:1.
- **Alertas/toasts:** 4 variantes semánticas, icono SVG + texto, autodescartables 5s, `role="status"`.
- **Tablas (admin):** header sticky, zebra `--bg-subtle`, celdas numéricas alineadas a la derecha, versión móvil en cards.
- **Modales:** máx 560px, focus trap, cierre Esc/overlay, foco devuelto al disparador.
- **Iconos:** Lucide SVG, 20/24px, `stroke-width:1.75`, `aria-hidden="true"` + texto o `aria-label`.

---

# 16. Roadmap

### 🔴 Críticas (semana 1 — confianza, accesibilidad legal, bugs)

| Acción | Impacto | Dificultad | Tiempo |
|---|---|---|---|
| Rellenar NIT/dirección/horario reales en contacto + JSON-LD ([contacto.html:45](contacto.html#L45), L140-143) | Muy alto | Trivial | 30 min |
| Unificar teléfono (302… vs 321…, [js/app.js:463](js/app.js#L463)) y arreglar email Cloudflare del footer catálogo ([catalogo.html:288](catalogo.html#L288)) | Alto | Trivial | 30 min |
| Quitar o enlazar redes sociales muertas ([index.html:279](index.html#L279)) | Alto | Trivial | 15 min |
| Corregir cifras contradictorias del hero (500+/2024) | Alto | Trivial | 30 min |
| Foco visible global `:focus-visible` + logo-nav como `<a>` + label del buscador | Alto (AA) | Baja | 3 h |
| Contraste: botón primario a fondo sólido/gradiente oscuro; retirar `#94A3B8` como color de texto; eyebrow a `--brand-700` | Alto (AA) | Baja | 3 h |
| Reemplazar `prompt()/confirm()/alert()` de aprobación por modal propio ([js/app.js:437-471](js/app.js#L437-L471)) | Alto | Media | 4-6 h |
| Unificar menú de navegación (orden + CTA) en todas las páginas | Alto | Media | 4 h |
| Imágenes → WebP + `srcset` + logo SVG (favicon incluido) | Alto (LCP) | Baja | 4 h |
| Eliminar `@import` de fuentes en [css/base.css:1](css/base.css#L1) + `preconnect` en todas las páginas | Medio | Trivial | 30 min |

### 🟠 Importantes (semanas 2-3 — sistema y conversión)

| Acción | Impacto | Dificultad | Tiempo |
|---|---|---|---|
| Componentizar header/footer/head (parcial compartido o build Eleventy/Astro) y disolver la isla de index.html | Muy alto (mantenibilidad) | Media-alta | 2-3 días |
| Tokens únicos (§15): retirar `--gold`, `#2F62D4`, doble `:root` | Alto | Media | 1 día |
| Tipografía display + jerarquía (§2.3) | Alto (marca) | Baja | 3 h |
| Iconografía única SVG; eliminar emojis del tracking y Material Icons | Medio | Media | 1 día |
| Prueba social: logos marcas en home, 3 testimonios, cifras honestas | Alto (CRO) | Baja | 1 día (+recolectar) |
| Formulario B2B en empresas + contacto (EmailJS ya integrado) | Alto (CRO) | Media | 1 día |
| Skip links, landmarks (main en index, login), labels asociados | Medio (AA) | Baja | 2 h |
| Quitar GSAP/ScrollTrigger → CSS; quitar `pageFadeIn` global | Medio (perf) | Baja | 2 h |
| SEO: theme-color unificado, JSON-LD en seguimiento, marca "DISTCOSTA" en titles, 404.html | Medio | Baja | 2 h |
| Limpieza del repo: fix.py, previews, snippets, data.js legado, código muerto de app.js | Medio | Trivial | 1 h |

### 🟢 Recomendables (mes 2 — crecimiento)

| Acción | Impacto | Dificultad | Tiempo |
|---|---|---|---|
| Pre-render del catálogo (SSG desde Supabase) + URLs por categoría + `ItemList` schema | Muy alto (SEO long-tail) | Alta | 3-5 días |
| Rediseño completo de la home según §13-14 (bento, 3 pasos, CTA B2B) | Alto | Media-alta | 3-4 días |
| Landings SEO locales (colegios, entidades, tóner) | Alto | Media | 1 día c/u |
| Build con minificación (esbuild) → 1 CSS + 2 JS | Medio | Media | 1 día |
| Trocear admin.js por módulos + ESLint/Prettier | Medio (dev) | Alta | 3-4 días |
| Dark mode público con `prefers-color-scheme` (la infraestructura ya existe) | Bajo-medio | Media | 1-2 días |
| Testimonios en video / caso de estudio institucional | Medio | Media | — |

---

# 17. Análisis del código en el workspace (refactorización propuesta)

**Componentes reutilizables detectados (hoy duplicados):** navbar+menú móvil (×9 variantes), footer (×2 diseños × 8 copias), bloque head/meta (×9), card de beneficio (inline styles en empresas/contacto), botón WhatsApp flotante (+snippet), sistema modal (bien centralizado ✓), badges de estado (bien centralizados ✓).

**Plan de refactor en 4 fases (sin romper GitHub Pages):**

1. **Fase 0 — limpieza (1 h):** borrar `fix.py`, `dark-preview.html`, `stripe-preview.html`, `theme-script-snippet.html`, `whatsapp-snippet.html` (moverlos a `/docs` o eliminarlos), `js/data.js` si `catalog.js` ya es 100% Supabase, código muerto de `app.js` (`showPage`, `filterCatalog`), sección anulada de `nav.css` (L5-179 vs L380-403).
2. **Fase 1 — configuración única (2 h):** `js/config.js` con `SUPA_URL`, `SUPA_ANON`, `PHONE`, `EMAIL`, `WA_LINK`; todos los módulos leen de ahí. Elimina las 12+ repeticiones de la anon key y el bug del teléfono.
3. **Fase 2 — parciales compartidos (2-3 días):** opción recomendada **Eleventy o Astro** (salida estática, compatible con Pages vía Action): `_includes/head.njk`, `nav.njk`, `footer.njk`, `wa.njk`; las 9 páginas se vuelven contenido + layout. Alternativa sin build: inyección con JS (`nav.js` que hace `outerHTML`), aceptable pero peor para SEO/CLS. Con esto la isla de `index.html` se disuelve: su CSS pasa a los módulos y su navbar muere.
4. **Fase 3 — admin (3-4 días, independiente):** trocear `admin.js` en `admin/{auth,pedidos,cotizaciones,remisiones,usuarios,catalogo}.js` como módulos ES con `import()` por sección; fusionar `admin-extras.js` en sus módulos correspondientes (hoy es una capa de parches que depende del orden de carga).

**Errores potenciales detectados:** `toggleNav` triple-definido (comportamiento depende del orden de carga); listener `resize` que machaca la preferencia de tema ([js/app.js:193-198](js/app.js#L193-L198)); `catalog.css?v=2`/`catalog.js?v=2` como versionado manual (usar hash de build); dependencia implícita de orden entre 6 scripts globales sin `defer` (si un CDN falla, `applyFilter` puede no existir cuando el inline lo llama, [catalogo.html:222](catalogo.html#L222)).

---

# 18. Lista final priorizada de acciones

1. Rellenar NIT, dirección y horario reales en contacto (HTML y JSON-LD). — 30 min que cambian la percepción entera del negocio.
2. Unificar el teléfono de contacto y reparar el email del footer del catálogo.
3. Eliminar (o enlazar) los iconos sociales muertos y corregir las cifras "500+/Desde 2024".
4. Accesibilidad AA base: `:focus-visible` global, logo-nav como enlace, label del buscador, labels del login, skip link, `<main>` en index.
5. Contraste: botón primario sólido `--brand-600`, retirar `#94A3B8` como texto, eyebrow a `--brand-700`, verde WhatsApp `#1DA851`.
6. Reemplazar `prompt()/confirm()/alert()` del flujo de aprobación por el modal propio.
7. Unificar navegación (orden, CTA y una sola implementación de menú móvil).
8. Optimizar imágenes: WebP + srcset + logo SVG + favicon ligero; quitar el `@import` de fuentes.
9. Componentizar header/footer/head con Eleventy/Astro y disolver la isla de `index.html`.
10. Unificar tokens (retirar `--gold`, `#2F62D4`, doble `:root`) según §15.
11. Adoptar la tipografía display (Bricolage Grotesque + Inter) en las variables existentes.
12. Iconografía única SVG (fuera emojis y Material Icons).
13. Prueba social en la home: logos de marcas, 3 testimonios reales, cifras verificables; contar el seguimiento online como diferenciador.
14. Formulario B2B en empresas y contacto (EmailJS + Supabase ya disponibles).
15. Limpieza del repo (fix.py, previews, snippets, código muerto) + `js/config.js` único.
16. SEO: marca DISTCOSTA en titles, theme-color único, JSON-LD en seguimiento, 404.html.
17. Quitar GSAP y `pageFadeIn`; una sola orquesta de animación CSS por página.
18. Pre-render del catálogo desde Supabase con URLs por categoría (mayor palanca SEO disponible).
19. Rediseño de la home según §13-14 (bento, 3 pasos, CTA B2B).
20. Trocear `admin.js` + ESLint/Prettier + build con minificación.

---

*Informe generado el 29/07/2026 sobre el commit `06f8ab1`. Toda la evidencia `archivo:línea` es verificable con clic en el workspace. Los ratios de contraste fueron calculados con la fórmula de luminancia relativa de WCAG 2.x durante esta sesión.*
