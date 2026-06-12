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

    // Rol y estado activo siempre desde la BD — nunca del token
    const { data: dbUser, error: dbError } = await supabase
      .from('usuarios')
      .select('username, rol, activo')
      .eq('username', session.username)
      .single()

    if (dbError || !dbUser || !dbUser.activo) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
    }

    const sessionUser = dbUser
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
      result = r

    // ── Lectura de pedidos (cualquier sesión activa) ───────────────────────
    // Reemplaza la lectura directa con la clave anon. El panel filtra la
    // visibilidad por permisos en la UI; aquí solo exigimos sesión válida.
    } else if (action === 'pedidos:listar') {
      const { data: pedidos, error: e1 } = await supabase
        .from('pedidos').select('*').order('created_at', { ascending: false })
      if (e1) throw e1
      const { data: items } = await supabase.from('pedido_items').select('*')
      const { data: historial } = await supabase
        .from('pedido_historial').select('*').order('created_at', { ascending: true })
      result = { pedidos: pedidos || [], items: items || [], historial: historial || [] }

    } else if (action === 'pedidos:ultimo') {
      const { data: rows } = await supabase
        .from('pedidos').select('id, client, status')
        .order('created_at', { ascending: false }).limit(1)
      result = (rows && rows[0]) || null

    // Agregar entrada al historial (reemplaza el INSERT anónimo del admin)
    } else if (action === 'pedidos:historial') {
      const { orderId, estado, usuario } = data
      if (!orderId || !estado) throw new Error('orderId y estado son requeridos')
      const { error } = await supabase.from('pedido_historial').insert({
        pedido_id: orderId,
        estado,
        fecha: new Date().toLocaleDateString('es-CO'),
        usuario: usuario || sessionUser.username,
      })
      if (error) throw error
      result = { ok: true }

    // Crear remisión manual desde el panel (reemplaza el INSERT anónimo)
    } else if (action === 'pedidos:crear-manual') {
      const p = data || {}
      if (!p.id || !p.client) throw new Error('id y client son requeridos')
      const { error: pErr } = await supabase.from('pedidos').insert({
        id: p.id, client: p.client, company: p.company || '', nit: p.nit || '',
        email: p.email || '', phone: p.phone || '', city: p.city || '', notes: p.notes || '',
        date: p.date || new Date().toISOString().slice(0, 10), status: p.status || 'dispatched',
        subtotal: p.subtotal || 0, iva: p.iva || 0, total: p.total || 0,
      })
      if (pErr) throw pErr
      if (Array.isArray(p.items)) {
        for (const it of p.items) {
          if (it && it.name) {
            await supabase.from('pedido_items').insert({
              pedido_id: p.id, name: it.name, qty: it.qty || 1, price: it.price || 0, icon: it.icon || '📦',
            })
          }
        }
      }
      await supabase.from('pedido_historial').insert({
        pedido_id: p.id, estado: p.status || 'dispatched',
        fecha: new Date().toLocaleDateString('es-CO'), usuario: sessionUser.username,
      })
      result = { id: p.id }

    // ── Storage (cualquier sesión activa) ──────────────────────────────────
    // El navegador admin solo tiene la clave anon; estas acciones operan con
    // service_role. Bucket restringido a una lista blanca.
    } else if (action.startsWith('storage:')) {
      const ALLOWED_BUCKETS = ['entregados', 'productos']
      const bucket = data?.bucket
      if (!ALLOWED_BUCKETS.includes(bucket)) throw new Error('bucket no permitido')

      if (action === 'storage:listar') {
        const { data: files, error } = await supabase.storage.from(bucket).list(data.prefix || '', { limit: 100 })
        if (error) throw error
        result = files || []

      } else if (action === 'storage:subir') {
        const { path, contentBase64, contentType } = data
        if (!path || !contentBase64) throw new Error('path y contenido requeridos')
        const bytes = Uint8Array.from(atob(contentBase64), (c) => c.charCodeAt(0))
        const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
          contentType: contentType || 'application/octet-stream', upsert: true,
        })
        if (error) throw error
        result = { path }

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
    } else if (action === 'email:entrega') {
      const secret = Deno.env.get('APPS_SCRIPT_SECRET')
      if (!secret) throw new Error('Servicio de correo no configurado')
      const { to, subject, htmlContent, attachments } = data || {}
      if (!to || !subject || !htmlContent) throw new Error('Faltan datos del correo')
      const r = await fetch('https://script.google.com/macros/s/AKfycbymIr6fSDc7cQ6VGYtYIFyxens8m--leTLW-fotY3gZhWOXS0X8FLS088NNn3SUSnBHHA/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, to, subject, htmlContent, attachments: attachments || [] }),
      })
      const txt = await r.text()
      let okResp = true
      try { const j = JSON.parse(txt); if (j && j.ok === false) okResp = false } catch (_) { /* respuesta no-JSON: asumir ok */ }
      if (!okResp) throw new Error('Correo rechazado por el servidor')
      result = { sent: true }

    // ── Operaciones admin sobre pedidos ────────────────────────────────────
    } else if (action === 'pedidos:actualizar-estado') {
      if (sessionUser.rol !== 'administrador') {
        return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: corsHeaders })
      }
      const { orderId, status, campos } = data
      if (!orderId || !status) throw new Error('orderId y status son requeridos')
      const payload: any = { status }
      if (campos && typeof campos === 'object') Object.assign(payload, campos)
      const { error } = await supabase.from('pedidos').update(payload).eq('id', orderId)
      if (error) throw error
      result = { updated: orderId }

    } else if (action === 'pedidos:actualizar-totales') {
      if (sessionUser.rol !== 'administrador') {
        return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: corsHeaders })
      }
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
      await supabase.from('pedido_items').delete().eq('pedido_id', orderId)
      await supabase.from('pedido_historial').delete().eq('pedido_id', orderId)
      const { error } = await supabase.from('pedidos').delete().eq('id', orderId)
      if (error) throw error
      result = { deleted: orderId }

    // ── Solo administrador: gestión de usuarios ────────────────────────────
    } else {
      if (sessionUser.rol !== 'administrador') {
        return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
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
        result = r

      } else if (action === 'editar') {
        const { username, password, rol, permisos, nombre, email, activo } = data
        if (password && password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres')
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email inválido')
        const rolesPermitidos = ['administrador', 'usuario']
        const rolFinal = rolesPermitidos.includes(rol) ? rol : 'usuario'
        const permsArray = Array.isArray(permisos) ? permisos : (typeof permisos === 'string' && permisos ? JSON.parse(permisos) : null)
        const payload: any = { rol: rolFinal, permisos: permsArray, nombre, email, activo }
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
        result = r

      } else if (action === 'eliminar') {
        const { username } = data
        const { error } = await supabase.from('usuarios').delete().eq('username', username)
        if (error) throw error
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
