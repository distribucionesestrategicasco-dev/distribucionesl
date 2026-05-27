import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS restringido al dominio de producción
const ALLOWED_ORIGIN = 'https://distribucionesestrategicasco-dev.github.io'
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Leer el body primero para poder manejar la acción 'login' sin auth
    const { action, data } = await req.json()

    // ── Acción login: no requiere token (es el punto de autenticación) ──
    if (action === 'login') {
      const { username, password } = data || {}
      if (!username || !password) {
        return new Response(JSON.stringify({ error: 'Credenciales requeridas' }), { status: 400, headers: corsHeaders })
      }

      // Verificar bloqueo server-side en la BD
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

      // Verificar credenciales
      const { data: loginResult } = await supabase.rpc('verificar_login', { p_username: username, p_password: password })

      if (loginResult && loginResult.length > 0 && loginResult[0].activo) {
        // Éxito: resetear contador de intentos
        await supabase.from('usuarios')
          .update({ failed_attempts: 0, locked_until: null })
          .eq('username', username)
        const user = loginResult[0]
        return new Response(
          JSON.stringify({ ok: true, data: { username: user.username, nombre: user.nombre, rol: user.rol, permisos: user.permisos } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Fallo: incrementar intentos. Bloquear 5 min después de 5 intentos.
        const attempts = (userRow?.failed_attempts || 0) + 1
        const lockedUntil = attempts >= 5 ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null
        if (userRow) {
          await supabase.from('usuarios')
            .update({ failed_attempts: attempts, locked_until: lockedUntil })
            .eq('username', username)
        }
        return new Response(JSON.stringify({ error: 'Usuario o contraseña incorrectos' }), { status: 401, headers: corsHeaders })
      }
    }

    // ── Para todas las demás acciones: requerir token ───────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
    }

    // Extraer username del token (base64)
    const token = authHeader.replace('Bearer ', '')
    let tokenUser: any
    try { tokenUser = JSON.parse(atob(token)) } catch { tokenUser = null }
    if (!tokenUser || !tokenUser.username) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
    }

    // CRÍTICO: verificar rol y estado activo directamente en la BD.
    // El token base64 puede ser falsificado — NUNCA confiar en su contenido.
    const { data: dbUser, error: dbError } = await supabase
      .from('usuarios')
      .select('username, rol, activo')
      .eq('username', tokenUser.username)
      .single()

    if (dbError || !dbUser || !dbUser.activo) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
    }

    // sessionUser viene de la BD, no del token — no puede ser falsificado
    const sessionUser = dbUser
    let result

    // ── Acciones disponibles para cualquier usuario activo ──────────────
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
        .select()
      if (error) throw error
      result = r

    // ── Operaciones admin sobre pedidos (service_role bypasea RLS) ──────
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

    // ── Acciones solo para administrador (gestión de usuarios) ──────────
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
          .insert({
            username: username.trim(),
            password_hash: hashed,
            rol: rolFinal,
            permisos: permsArray,
            nombre,
            email,
            activo: true,
          })
          .select()
        if (error) throw error
        result = r

      } else if (action === 'editar') {
        const { username, password, rol, permisos, nombre, email, activo } = data
        if (password && password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres')
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email inválido')
        const rolesPermitidos = ['administrador', 'usuario']
        const rolFinal = rolesPermitidos.includes(rol) ? rol : 'usuario'
        const permsArray = Array.isArray(permisos) ? permisos : (typeof permisos === 'string' && permisos ? JSON.parse(permisos) : null)
        const payload: any = {
          rol: rolFinal,
          permisos: permsArray,
          nombre,
          email,
          activo,
        }
        if (password) {
          const { data: hashed } = await supabase.rpc('hashear_password', { p_password: password })
          payload.password_hash = hashed
        }
        const { data: r, error } = await supabase
          .from('usuarios')
          .update(payload)
          .eq('username', username)
          .select()
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
          .select('*')
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
