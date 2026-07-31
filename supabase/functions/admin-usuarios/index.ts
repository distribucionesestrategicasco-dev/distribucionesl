import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALLOWED_ORIGINS = [
  'https://distcosta.com',
  'https://www.distcosta.com',
  'https://distribucionesestrategicasco-dev.github.io',
]

serve(async (req) => {
  const origin = req.headers.get('Origin') || ''
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, data } = await req.json()

    // Lazy cleanup: borrar sesiones expiradas en cada request
    supabase.from('sessions').delete().lt('expires_at', new Date().toISOString())

    // ── Login: no requiere token ────────────────────────────────────────────
    if (action === 'login') {
      const { username, password } = data || {}
      if (!username || !password) {
        return new Response(JSON.stringify({ error: 'Credenciales requeridas' }), { status: 400, headers: corsHeaders })
      }

      const { data: userRow } = await supabase
        .from('usuarios')
        .select('failed_attempts, locked_until, activo')
        .eq('username', username)
        .maybeSingle()

      if (userRow?.locked_until && new Date(userRow.locked_until) > new Date()) {
        const remaining = Math.ceil((new Date(userRow.locked_until).getTime() - Date.now()) / 1000)
        return new Response(
          JSON.stringify({ error: `Demasiados intentos fallidos. Espera ${remaining} segundos.` }),
          { status: 429, headers: corsHeaders }
        )
      }

      const { data: loginResult } = await supabase.rpc('verificar_login', { p_username: username, p_password: password })

      if (loginResult && loginResult.length > 0 && loginResult[0].activo) {
        await supabase.from('usuarios')
          .update({ failed_attempts: 0, locked_until: null })
          .eq('username', username)

        // Crear sesión server-side con UUID aleatorio (TTL 8 horas)
        const expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString()
        const { data: sessionRow, error: sessionErr } = await supabase
          .from('sessions')
          .insert({ username, expires_at: expiresAt })
          .select('token')
          .single()

        if (sessionErr || !sessionRow) throw new Error('Error creando sesión')

        const user = loginResult[0]
        return new Response(
          JSON.stringify({ ok: true, data: { username: user.username, nombre: user.nombre, rol: user.rol, permisos: user.permisos, token: sessionRow.token } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        const attempts = (userRow?.failed_attempts || 0) + 1
        const lockedUntil = attempts >= 5 ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null
        if (userRow) {
          await supabase.from('usuarios')
            .update({ failed_attempts: attempts, locked_until: lockedUntil })
            .eq('username', username)
        }
        return new Response(JSON.stringify({ error: 'Usuario o contrasena incorrectos' }), { status: 401, headers: corsHeaders })
      }
    }

    // ── Logout: invalidar sesión en la BD ──────────────────────────────────
    if (action === 'logout') {
      const authHeader = req.headers.get('Authorization')
      const token = authHeader?.replace('Bearer ', '').trim()
      if (token) {
        await supabase.from('sessions').delete().eq('token', token)
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── Verificar sesión server-side para todas las demás acciones ──────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '').trim()

    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('username, expires_at')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (sessionErr || !session) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
    }

    // Rol, permisos y estado activo siempre desde la BD — nunca del token
    const { data: dbUser, error: dbError } = await supabase
      .from('usuarios')
      .select('username, rol, activo, permisos')
      .eq('username', session.username)
      .single()

    if (dbError || !dbUser || !dbUser.activo) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
    }

    const sessionUser = dbUser

    // Permisos de módulo desde la BD. `permisos` puede venir como array o
    // como string JSON según cómo se guardó; el administrador tiene todo.
    const puedeModulo = (modulo: string): boolean => {
      if (sessionUser.rol === 'administrador') return true
      let perms = sessionUser.permisos
      if (typeof perms === 'string') {
        try { perms = JSON.parse(perms) } catch (_) { perms = [] }
      }
      return Array.isArray(perms) && perms.includes(modulo)
    }

    // Módulos que dan acceso a los pedidos en alguna de sus vistas.
    const MODULOS_PEDIDOS = ['pedidos', 'cotizaciones', 'ordenes', 'remisiones', 'entregados']
    const puedeAlguno = (mods: string[]): boolean => mods.some(puedeModulo)

    const noAutorizado = (msg?: string) =>
      new Response(JSON.stringify({ error: msg || 'No autorizado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    // Traza de cambios. El usuario sale siempre de la sesión verificada, no
    // del cuerpo de la petición. Nunca debe tumbar la operación que audita:
    // si falla el registro, la acción del usuario sigue adelante.
    const auditar = async (
      accion: string, entidad: string, entidadId: string | null, detalle?: unknown
    ) => {
      try {
        await supabase.from('auditoria').insert({
          usuario:    sessionUser.username,
          accion,
          entidad,
          entidad_id: entidadId,
          detalle:    detalle ?? null,
        })
      } catch (e) {
        console.warn('auditoría:', e)
      }
    }

    // Estados canónicos. La interfaz traduce; aquí solo se guardan claves.
    const ESTADOS = ['pending', 'quoted', 'approved', 'dispatched', 'delivered']

    // Qué módulo habilita cada transición. Antes todas exigían rol
    // 'administrador', así que los operarios veían "guardado" mientras el
    // servidor devolvía 403 y el cambio se perdía en silencio.
    const MODULO_POR_ESTADO: Record<string, string[]> = {
      pending:    MODULOS_PEDIDOS,
      quoted:     ['cotizaciones'],
      approved:   ['cotizaciones', 'ordenes'],
      dispatched: ['remisiones'],
      delivered:  ['entregados'],
    }

    // Columnas que la edición de una remisión puede tocar. Antes se hacía
    // Object.assign con lo que mandara el navegador, así que una petición
    // manipulada podía escribir total, status o incluso id.
    const CAMPOS_EDITABLES = ['client', 'company', 'nit', 'email', 'phone', 'city', 'address', 'notes', 'fecha_requerida']

    let result

    // ── Acciones para cualquier usuario activo ─────────────────────────────
    if (action === 'refrescar-sesion') {
      const { data: r, error } = await supabase
        .from('usuarios')
        .select('username, nombre, email, rol, permisos, activo')
        .eq('username', sessionUser.username)
        .single()
      if (error) throw error
      result = r

    } else if (action === 'actualizar-perfil') {
      if (data.username !== sessionUser.username) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: corsHeaders })
      }
      const { username, nombre, password } = data
      if (password && password.length < 8) {
        return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }), { status: 400, headers: corsHeaders })
      }
      const payload: any = { nombre }
      if (password) {
        const { data: hashed } = await supabase.rpc('hashear_password', { p_password: password })
        payload.password_hash = hashed
      }
      const { data: r, error } = await supabase
        .from('usuarios')
        .update(payload)
        .eq('username', username)
        .select('id, username, nombre, email, rol, permisos, activo')
      if (error) throw error

      // Al cambiar la propia contraseña se cierran las demás sesiones y se
      // conserva la actual: si alguien te robó el token, deja de servirle.
      if (password) {
        await supabase.from('sessions').delete().eq('username', username).neq('token', token)
      }
      result = r

    // ── Lectura de pedidos (requiere algún módulo de pedidos) ──────────────
    // Reemplaza la lectura directa con la clave anon. El permiso se exige
    // aquí, no solo ocultando enlaces en el menú del panel.
    } else if (action === 'pedidos:listar') {
      // Los pedidos llevan PII de clientes (nombre, correo, teléfono, NIT,
      // dirección): hace falta al menos un módulo que los muestre.
      if (!puedeAlguno(MODULOS_PEDIDOS)) return noAutorizado()
      const { data: pedidos, error: e1 } = await supabase
        .from('pedidos').select('*')
        .is('eliminado_en', null)
        .order('created_at', { ascending: false })
      if (e1) throw e1
      const { data: items } = await supabase.from('pedido_items').select('*')
      const { data: historial } = await supabase
        .from('pedido_historial').select('*').order('created_at', { ascending: true })
      result = { pedidos: pedidos || [], items: items || [], historial: historial || [] }

    } else if (action === 'pedidos:ultimo') {
      if (!puedeAlguno(MODULOS_PEDIDOS)) return noAutorizado()
      const { data: rows } = await supabase
        .from('pedidos').select('id, client, status')
        .is('eliminado_en', null)
        .order('created_at', { ascending: false }).limit(1)
      result = (rows && rows[0]) || null

    // Pedidos nuevos desde un momento dado. Reemplaza a `pedidos:ultimo`
    // para el aviso del panel: aquel solo miraba el ÚLTIMO registro, así
    // que si entraban dos pedidos entre dos sondeos, uno no avisaba nunca.
    } else if (action === 'pedidos:nuevos') {
      if (!puedeAlguno(MODULOS_PEDIDOS)) return noAutorizado()
      const desde = typeof data?.desde === 'string' && data.desde
        ? data.desde
        : new Date(Date.now() - 60 * 1000).toISOString()
      const { data: rows, error } = await supabase
        .from('pedidos').select('id, client, created_at')
        .eq('status', 'pending')
        .is('eliminado_en', null)
        .gt('created_at', desde)
        .order('created_at', { ascending: true })
        .limit(50)
      if (error) throw error
      result = { nuevos: rows || [], ahora: new Date().toISOString() }

    // Cotización manual. A diferencia de la remisión, lleva precios: los
    // totales los calcula el RPC de las líneas, no el navegador.
    } else if (action === 'cotizaciones:crear-manual') {
      if (!puedeModulo('cotizaciones')) return noAutorizado()
      const p = data || {}
      const { data: creada, error } = await supabase.rpc('crear_cotizacion_manual', {
        payload: {
          client:  p.client,
          company: p.company || '',
          nit:     p.nit     || '',
          email:   p.email   || '',
          phone:   p.phone   || '',
          city:    p.city    || '',
          address: p.address || '',
          notes:   p.notes   || '',
          items:   Array.isArray(p.items) ? p.items : [],
        },
        p_usuario: sessionUser.username,
      })
      if (error) throw error
      if (!creada?.ok) throw new Error(creada?.message || 'No se pudo crear la cotización')
      await auditar('crear', 'cotizacion', creada.id, { cliente: p.client, total: creada.total })
      result = creada

    // Cambiar los productos de una remisión. El RPC rechaza las ya
    // entregadas: el cliente firmó esas líneas concretas.
    } else if (action === 'pedidos:actualizar-items') {
      if (!puedeAlguno(MODULOS_PEDIDOS)) return noAutorizado()
      const { orderId, items } = data
      if (!orderId) throw new Error('orderId es requerido')
      const { data: r, error } = await supabase.rpc('actualizar_items_remision', {
        p_id:      orderId,
        p_items:   Array.isArray(items) ? items : [],
        p_usuario: sessionUser.username,
      })
      if (error) throw error
      if (!r?.ok) throw new Error(r?.message || 'No se pudieron guardar los productos')
      await auditar('editar', 'remision', orderId, { productos: r.lineas })
      result = r

    // Traza de correos enviados (solo administrador)
    } else if (action === 'notificaciones:listar') {
      if (sessionUser.rol !== 'administrador') return noAutorizado()
      const limite = Math.min(Math.max(Number(data?.limite ?? 100), 1), 500)
      const { data: rows, error } = await supabase
        .from('notificaciones').select('*')
        .order('created_at', { ascending: false })
        .limit(limite)
      if (error) throw error
      result = rows || []

    // Papelera: remisiones borradas, para poder recuperarlas
    } else if (action === 'pedidos:papelera') {
      if (sessionUser.rol !== 'administrador') return noAutorizado()
      const { data: rows, error } = await supabase
        .from('pedidos')
        .select('id, client, company, date, status, eliminado_en, eliminado_por')
        .not('eliminado_en', 'is', null)
        .order('eliminado_en', { ascending: false })
      if (error) throw error
      result = rows || []

    } else if (action === 'pedidos:restaurar') {
      if (sessionUser.rol !== 'administrador') return noAutorizado()
      const { orderId } = data
      if (!orderId) throw new Error('orderId es requerido')
      const { error } = await supabase.from('pedidos')
        .update({ eliminado_en: null, eliminado_por: null })
        .eq('id', orderId)
      if (error) throw error
      await auditar('restaurar', 'remision', orderId)
      result = { restored: orderId }

    // Registro de auditoría (solo administrador)
    } else if (action === 'auditoria:listar') {
      if (sessionUser.rol !== 'administrador') return noAutorizado()
      const limite = Math.min(Math.max(Number(data?.limite ?? 200), 1), 500)
      const { data: rows, error } = await supabase
        .from('auditoria').select('*')
        .order('created_at', { ascending: false })
        .limit(limite)
      if (error) throw error
      result = rows || []

    // Agregar entrada al historial (reemplaza el INSERT anónimo del admin)
    } else if (action === 'pedidos:historial') {
      if (!puedeAlguno(MODULOS_PEDIDOS)) return noAutorizado()
      const { orderId, estado } = data
      if (!orderId || !estado) throw new Error('orderId y estado son requeridos')
      if (!ESTADOS.includes(estado)) throw new Error('Estado no válido: ' + estado)
      const { error } = await supabase.from('pedido_historial').insert({
        pedido_id: orderId,
        estado,
        fecha: new Date().toLocaleDateString('es-CO'),
        // El usuario sale de la sesión, nunca del cuerpo de la petición: el
        // nombre para mostrar es editable por el propio usuario en Mi Perfil,
        // así que no sirve como traza de auditoría.
        usuario: sessionUser.username,
      })
      if (error) throw error
      result = { ok: true }

    // Crear remisión manual desde el panel.
    // El consecutivo lo asigna el RPC dentro de la transacción, con el mismo
    // advisory lock que crear_pedido. Antes el navegador reservaba el número
    // al abrir el modal y lo mandaba aquí: dos operarios simultáneos
    // chocaban en la clave primaria y la remisión se perdía.
    } else if (action === 'pedidos:crear-manual') {
      if (!puedeModulo('remisiones')) return noAutorizado()
      const p = data || {}
      const { data: creada, error } = await supabase.rpc('crear_remision_manual', {
        payload: {
          client:  p.client,
          company: p.company || '',
          nit:     p.nit     || '',
          email:   p.email   || '',
          phone:   p.phone   || '',
          city:    p.city    || '',
          address: p.address || '',
          notes:   p.notes   || '',
          date:    p.date    || new Date().toISOString().slice(0, 10),
          status:  p.status  || 'dispatched',
          items:   Array.isArray(p.items) ? p.items : [],
        },
        p_usuario: sessionUser.username,
      })
      if (error) throw error
      if (!creada?.ok) throw new Error(creada?.message || 'No se pudo crear la remisión')
      result = { id: creada.id }

    // ── Storage (cualquier sesión activa) ──────────────────────────────────
    // El navegador admin solo tiene la clave anon; estas acciones operan con
    // service_role. Bucket restringido a una lista blanca.
    } else if (action.startsWith('storage:')) {
      const ALLOWED_BUCKETS = ['entregados', 'productos']
      const bucket = data?.bucket
      if (!ALLOWED_BUCKETS.includes(bucket)) throw new Error('bucket no permitido')

      // Cada bucket pertenece a un módulo. Antes bastaba con tener sesión, así
      // que cualquier usuario podía borrar los soportes firmados de cualquier
      // remisión o subir imágenes al catálogo sin tener ese módulo.
      const moduloBucket = bucket === 'entregados' ? 'entregados' : 'catalogo'
      if (!puedeModulo(moduloBucket)) return noAutorizado()

      // Ninguna ruta puede salir de su carpeta.
      const ruta = typeof data?.path === 'string' ? data.path : ''
      if (ruta && (ruta.includes('..') || ruta.startsWith('/'))) {
        throw new Error('Ruta no permitida')
      }

      if (action === 'storage:listar') {
        const { data: files, error } = await supabase.storage.from(bucket).list(data.prefix || '', { limit: 100 })
        if (error) throw error
        result = files || []

      } else if (action === 'storage:subir') {
        const { path, contentBase64, contentType } = data
        if (!path || !contentBase64) throw new Error('path y contenido requeridos')

        // Hasta ahora el único límite era el del navegador (2 MB en el modal
        // de productos), así que una llamada directa a la API podía subir
        // cualquier cosa, de cualquier tamaño, a los buckets.
        const REGLAS: Record<string, { maxBytes: number; tipos: string[]; etiqueta: string }> = {
          entregados: {
            maxBytes: 10 * 1024 * 1024,
            tipos: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
            etiqueta: 'PDF o imagen',
          },
          productos: {
            maxBytes: 2 * 1024 * 1024,
            tipos: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            etiqueta: 'imagen',
          },
        }
        const regla = REGLAS[bucket]

        const tipo = String(contentType || '').split(';')[0].trim().toLowerCase()
        if (!regla.tipos.includes(tipo)) {
          throw new Error('Tipo de archivo no permitido (' + (tipo || 'desconocido') + '). Se admite: ' + regla.etiqueta)
        }

        // Tamaño real a partir del base64, sin decodificarlo entero primero.
        const limpio = String(contentBase64).replace(/\s/g, '')
        const relleno = (limpio.endsWith('==') ? 2 : limpio.endsWith('=') ? 1 : 0)
        const tamano = Math.floor(limpio.length * 3 / 4) - relleno
        if (tamano > regla.maxBytes) {
          throw new Error('El archivo pesa ' + (tamano / 1048576).toFixed(1)
            + ' MB y el máximo es ' + (regla.maxBytes / 1048576) + ' MB')
        }

        let bytes: Uint8Array
        try {
          bytes = Uint8Array.from(atob(limpio), (c) => c.charCodeAt(0))
        } catch (_) {
          throw new Error('El contenido del archivo no es válido')
        }

        const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
          contentType: tipo, upsert: true,
        })
        if (error) throw error
        result = { path, bytes: tamano }

      } else if (action === 'storage:firmar') {
        const { path, expiresIn } = data
        if (!path) throw new Error('path requerido')
        const { data: signed, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn || 300)
        if (error) throw error
        result = { url: signed?.signedUrl || null }

      } else if (action === 'storage:borrar') {
        const { path } = data
        if (!path) throw new Error('path requerido')
        const { error } = await supabase.storage.from(bucket).remove([path])
        if (error) throw error
        result = { ok: true }

      } else {
        throw new Error('Accion de storage no reconocida')
      }

    // ── Envío de correo (cualquier sesión activa) ──────────────────────────
    // Reemplaza la llamada directa del navegador al Apps Script (que era un
    // relay abierto). Aquí se firma con un secreto que el Apps Script valida,
    // de modo que la URL pública deja de ser explotable.
    } else if (action === 'email:entrega' || action === 'email:cotizacion') {
      // Los dos salen con el remitente de la empresa, así que cada uno exige
      // su módulo: no basta con tener una sesión abierta.
      const moduloCorreo = action === 'email:cotizacion' ? 'cotizaciones' : 'entregados'
      if (!puedeModulo(moduloCorreo)) return noAutorizado()
      const secret = Deno.env.get('APPS_SCRIPT_SECRET')
      if (!secret) throw new Error('Servicio de correo no configurado')
      const { to, cc, subject, htmlContent, attachments } = data || {}
      if (!to || !subject || !htmlContent) throw new Error('Faltan datos del correo')
      // Las copias son opcionales. Admiten varias direcciones separadas por
      // coma o punto y coma, y se filtran aquí una a una: una sola dirección
      // mal escrita no debe tumbar el envío entero.
      const ccLimpio = (typeof cc === 'string' ? cc : '')
        .split(/[;,]/)
        .map((x: string) => x.trim())
        .filter((x: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))
        .slice(0, 5)
        .join(',')

      // Las copias van como DESTINATARIOS, no en el campo CC. El relay de
      // Apps Script ignora el `cc` que se le manda: comprobado con COT-1002,
      // que salió de aquí con copia registrada y nunca llegó. Ese script vive
      // en la cuenta de Google de la empresa y no se puede corregir desde el
      // proyecto, así que se suman al destinatario, que sí respeta.
      const destinatarios = [String(to).trim()]
        .concat(ccLimpio ? ccLimpio.split(',') : [])
        .filter((x: string, i: number, a: string[]) => x && a.indexOf(x) === i)
        .join(',')
      // Queda constancia del envío, salga bien o mal: antes la única traza
      // era un aviso en pantalla que desaparecía a los segundos.
      const registrarEnvio = async (estado: string, error?: string) => {
        try {
          await supabase.from('notificaciones').insert({
            pedido_id:    data?.orderId ?? null,
            canal:        'email',
            destinatario: to,
            copia:        ccLimpio || null,
            asunto:       subject,
            estado,
            error:        error ?? null,
            adjuntos:     Array.isArray(attachments) ? attachments.length : 0,
            usuario:      sessionUser.username,
          })
        } catch (e) {
          console.warn('registro de notificación:', e)
        }
      }

      let okResp = true
      let motivo = ''
      try {
        const r = await fetch('https://script.google.com/macros/s/AKfycbymIr6fSDc7cQ6VGYtYIFyxens8m--leTLW-fotY3gZhWOXS0X8FLS088NNn3SUSnBHHA/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret, to: destinatarios, cc: '', subject, htmlContent, attachments: attachments || [] }),
        })
        const txt = await r.text()
        try { const j = JSON.parse(txt); if (j && j.ok === false) { okResp = false; motivo = j.error || 'rechazado por el servidor de correo' } }
        catch (_) { /* respuesta no-JSON: asumir ok */ }
      } catch (e: any) {
        okResp = false
        motivo = e?.message || 'no se pudo contactar el servicio de correo'
      }

      await registrarEnvio(okResp ? 'enviado' : 'fallido', okResp ? undefined : motivo)
      if (!okResp) throw new Error('Correo rechazado: ' + motivo)
      result = { sent: true }

    // ── Catálogo de productos (requiere el módulo 'catalogo') ──────────────
    // Reemplaza la escritura directa a /rest/v1/productos con la clave anon,
    // que permitía a cualquier visitante alterar o borrar el catálogo.
    } else if (action.startsWith('productos:')) {
      if (!puedeModulo('catalogo')) return noAutorizado()

      // Normaliza y valida los campos del producto. Se aplica igual en crear
      // y editar para que no haya dos caminos de validación distintos.
      const normalizarProducto = (d: any) => {
        const nombre = String(d?.nombre ?? '').trim()
        if (!nombre) throw new Error('El nombre del producto es obligatorio')
        if (nombre.length > 200) throw new Error('El nombre no puede pasar de 200 caracteres')
        const categoria = String(d?.categoria ?? '').trim().slice(0, 120)
        if (!categoria) throw new Error('La categoría es obligatoria')
        const precio = Number(d?.precio_ref ?? 0)
        if (!Number.isFinite(precio) || precio < 0) throw new Error('El precio no puede ser negativo')
        const imagenes = Array.isArray(d?.imagenes)
          ? d.imagenes.filter((u: unknown) => typeof u === 'string' && u.length <= 1000).slice(0, 12)
          : []
        return {
          nombre,
          categoria,
          icono: String(d?.icono ?? '📦').trim().slice(0, 16) || '📦',
          precio_ref: precio,
          imagenes,
          imagen_url: imagenes[0] ?? null,
        }
      }

      if (action === 'productos:crear') {
        const { data: r, error } = await supabase
          .from('productos')
          .insert({ ...normalizarProducto(data), activo: true })
          .select('id, nombre, categoria, icono, precio_ref, imagen_url, imagenes, activo')
          .single()
        if (error) throw error
        await auditar('crear', 'producto', r.id, { nombre: r.nombre, categoria: r.categoria })
        result = r

      } else if (action === 'productos:editar') {
        const id = String(data?.id ?? '').trim()
        if (!id) throw new Error('id es requerido')
        const { data: r, error } = await supabase
          .from('productos')
          .update(normalizarProducto(data))
          .eq('id', id)
          .select('id, nombre, categoria, icono, precio_ref, imagen_url, imagenes, activo')
          .single()
        if (error) throw error
        await auditar('editar', 'producto', id, { nombre: r.nombre, categoria: r.categoria, precio_ref: r.precio_ref })
        result = r

      } else if (action === 'productos:toggle') {
        const id = String(data?.id ?? '').trim()
        if (!id) throw new Error('id es requerido')
        const { data: r, error } = await supabase
          .from('productos')
          .update({ activo: data?.activo === true })
          .eq('id', id)
          .select('id, nombre, activo')
          .single()
        if (error) throw error
        await auditar(r.activo ? 'activar' : 'pausar', 'producto', id, { nombre: r.nombre })
        result = r

      } else if (action === 'productos:eliminar') {
        const id = String(data?.id ?? '').trim()
        if (!id) throw new Error('id es requerido')
        const { data: previo } = await supabase
          .from('productos').select('nombre, categoria').eq('id', id).maybeSingle()
        const { error } = await supabase.from('productos').delete().eq('id', id)
        if (error) throw error
        await auditar('eliminar', 'producto', id, previo || null)
        result = { deleted: id }

      } else {
        throw new Error('Accion de productos no reconocida')
      }

    // ── Operaciones admin sobre pedidos ────────────────────────────────────
    } else if (action === 'pedidos:actualizar-estado') {
      const { orderId, status, campos } = data
      if (!orderId || !status) throw new Error('orderId y status son requeridos')
      if (!ESTADOS.includes(status)) throw new Error('Estado no válido: ' + status)

      // El permiso depende del estado destino, no del rol: quien maneja
      // despachos puede despachar aunque no sea administrador.
      if (!puedeAlguno(MODULO_POR_ESTADO[status] || [])) {
        return noAutorizado('No tienes permiso para mover una remisión a "' + status + '"')
      }

      const payload: any = { status }

      // Sello de la fecha real de entrega. `date` es la fecha de creación
      // de la remisión, así que sin esto no había forma de saber cuándo se
      // entregó ni de medir cuánto tardó.
      if (status === 'delivered') {
        const { data: actual } = await supabase
          .from('pedidos').select('entregado_en').eq('id', orderId).maybeSingle()
        // No se pisa si ya estaba entregada: reeditar no debe mover la fecha.
        if (!actual?.entregado_en) payload.entregado_en = new Date().toISOString()
      } else {
        // Si sale del estado entregado, la fecha deja de tener sentido.
        payload.entregado_en = null
      }

      // Solo se copian las columnas de la lista blanca.
      if (campos && typeof campos === 'object') {
        for (const clave of CAMPOS_EDITABLES) {
          if (Object.prototype.hasOwnProperty.call(campos, clave)) payload[clave] = campos[clave]
        }
      }
      const { error } = await supabase.from('pedidos').update(payload).eq('id', orderId)
      if (error) throw error
      result = { updated: orderId }

    } else if (action === 'pedidos:actualizar-totales') {
      if (!puedeModulo('cotizaciones')) return noAutorizado()
      const { orderId, subtotal, iva, total, items } = data
      if (!orderId) throw new Error('orderId es requerido')
      const { error: pErr } = await supabase.from('pedidos')
        .update({ subtotal, iva, total })
        .eq('id', orderId)
      if (pErr) throw pErr
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.name && item.price > 0) {
            await supabase.from('pedido_items')
              .update({ price: item.price })
              .eq('pedido_id', orderId)
              .eq('name', item.name)
          }
        }
      }
      result = { updated: orderId }

    } else if (action === 'pedidos:eliminar') {
      if (sessionUser.rol !== 'administrador') {
        return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: corsHeaders })
      }
      const { orderId } = data
      if (!orderId) throw new Error('orderId es requerido')

      // Borrado lógico: la fila se conserva. Antes se destruían pedido,
      // líneas e historial sin respaldo, y al desaparecer la fila el
      // consecutivo se reutilizaba (dos documentos con el mismo número si
      // el papel de la borrada ya estaba entregado).
      const { data: previo } = await supabase
        .from('pedidos').select('client, status').eq('id', orderId).maybeSingle()

      const { error } = await supabase.from('pedidos')
        .update({ eliminado_en: new Date().toISOString(), eliminado_por: sessionUser.username })
        .eq('id', orderId)
        .is('eliminado_en', null)
      if (error) throw error
      await auditar('eliminar', 'remision', orderId, previo || null)
      result = { deleted: orderId }

    // ── Solo administrador: gestión de usuarios ────────────────────────────
    } else {
      if (sessionUser.rol !== 'administrador') {
        return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
      }

      // Nadie puede dejar el sistema sin administradores. Hasta ahora la
      // única defensa era que la tabla del panel no pintaba los botones de
      // editar/eliminar en las filas de administrador: una llamada directa a
      // la API sí podía degradar o borrar al único admin y dejar la empresa
      // sin quien gestione usuarios.
      const adminsActivos = async (): Promise<number> => {
        const { count } = await supabase
          .from('usuarios')
          .select('username', { count: 'exact', head: true })
          .eq('rol', 'administrador')
          .eq('activo', true)
        return count ?? 0
      }
      const cuentaDe = async (u: string) => {
        const { data } = await supabase
          .from('usuarios').select('rol, activo').eq('username', u).maybeSingle()
        return data
      }

      if (action === 'crear') {
        const { username, password, rol, permisos, nombre, email } = data
        if (!username || username.trim().length < 3) throw new Error('El usuario debe tener al menos 3 caracteres')
        if (!password || password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres')
        if (!/^[a-zA-Z0-9_.-]+$/.test(username)) throw new Error('El usuario solo puede contener letras, números, _ . -')
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email inválido')
        const rolesPermitidos = ['administrador', 'usuario']
        const rolFinal = rolesPermitidos.includes(rol) ? rol : 'usuario'
        const permsArray = Array.isArray(permisos) ? permisos : (typeof permisos === 'string' && permisos ? JSON.parse(permisos) : null)
        const { data: hashed } = await supabase.rpc('hashear_password', { p_password: password })
        const { data: r, error } = await supabase
          .from('usuarios')
          .insert({ username: username.trim(), password_hash: hashed, rol: rolFinal, permisos: permsArray, nombre, email, activo: true })
          .select('id, username, nombre, email, rol, permisos, activo, created_at')
        if (error) throw error
        await auditar('crear', 'usuario', username.trim(), { rol: rolFinal, permisos: permsArray })
        result = r

      } else if (action === 'editar') {
        const { username, password, rol, permisos, nombre, email, activo } = data
        if (!username) throw new Error('username es requerido')
        if (password && password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres')
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email inválido')

        const objetivo = await cuentaDe(username)
        if (!objetivo) throw new Error('El usuario no existe')

        // El rol solo cambia si se manda explícitamente uno válido; antes el
        // panel enviaba 'usuario' fijo, así que cualquier edición degradaba
        // la cuenta sin que nadie lo pidiera.
        const rolesPermitidos = ['administrador', 'usuario']
        const rolFinal = rolesPermitidos.includes(rol) ? rol : objetivo.rol
        const activoFinal = typeof activo === 'boolean' ? activo : objetivo.activo

        const pierdeElAdmin = objetivo.rol === 'administrador' && objetivo.activo &&
                              (rolFinal !== 'administrador' || activoFinal === false)
        if (pierdeElAdmin && (await adminsActivos()) <= 1) {
          throw new Error('Es el único administrador activo: no puedes quitarle el rol ni desactivarlo. Crea otro administrador primero.')
        }

        const permsArray = Array.isArray(permisos) ? permisos : (typeof permisos === 'string' && permisos ? JSON.parse(permisos) : null)
        const payload: any = { rol: rolFinal, permisos: permsArray, nombre, email, activo: activoFinal }
        if (password) {
          const { data: hashed } = await supabase.rpc('hashear_password', { p_password: password })
          payload.password_hash = hashed
        }
        const { data: r, error } = await supabase
          .from('usuarios')
          .update(payload)
          .eq('username', username)
          .select('id, username, nombre, email, rol, permisos, activo, created_at')
        if (error) throw error

        // Cambiar la contraseña o desactivar una cuenta debe cortar sus
        // sesiones abiertas; si no, el token seguía sirviendo hasta 8 horas.
        if (password || activoFinal === false) {
          await supabase.from('sessions').delete().eq('username', username)
        }
        await auditar('editar', 'usuario', username, {
          rol: rolFinal, activo: activoFinal, permisos: permsArray,
          cambio_password: !!password,
          rol_anterior: objetivo.rol !== rolFinal ? objetivo.rol : undefined,
        })
        result = r

      } else if (action === 'eliminar') {
        const { username } = data
        if (!username) throw new Error('username es requerido')
        if (username === sessionUser.username) throw new Error('No puedes eliminar tu propia cuenta')

        const objetivo = await cuentaDe(username)
        if (!objetivo) throw new Error('El usuario no existe')
        if (objetivo.rol === 'administrador' && objetivo.activo && (await adminsActivos()) <= 1) {
          throw new Error('Es el único administrador activo: no puedes eliminarlo. Crea otro administrador primero.')
        }

        const { error } = await supabase.from('usuarios').delete().eq('username', username)
        if (error) throw error
        await supabase.from('sessions').delete().eq('username', username)
        await auditar('eliminar', 'usuario', username, { rol: objetivo.rol })
        result = { deleted: username }

      } else if (action === 'listar') {
        const { data: r, error } = await supabase
          .from('usuarios')
          .select('id, username, nombre, email, rol, permisos, activo, created_at, failed_attempts, locked_until')
          .order('created_at', { ascending: true })
        if (error) throw error
        result = r

      } else {
        throw new Error('Accion no reconocida')
      }
    }

    return new Response(JSON.stringify({ ok: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
