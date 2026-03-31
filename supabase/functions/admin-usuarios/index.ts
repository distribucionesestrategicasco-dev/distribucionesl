import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verificar que quien llama tiene sesion valida
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    let sessionUser: any
    try { sessionUser = JSON.parse(atob(token)) } catch { sessionUser = null }
    if (!sessionUser || sessionUser.rol !== 'administrador') {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
    }

    const { action, data } = await req.json()
    let result

     if (action === 'crear') {
      const { username, password, rol, nombre, email } = data
      // Hashear password con pgcrypto via RPC
      const { data: hashed } = await supabase.rpc('hashear_password', { p_password: password })
      const { data: r, error } = await supabase
        .from('usuarios')
        .insert({ username, password_hash: hashed, rol, nombre, email, activo: true })
        .select()
      if (error) throw error
      result = r

    } else if (action === 'editar') {
      const { username, password, rol, nombre, email, activo } = data
      const payload: any = { rol, nombre, email, activo }
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

    } else {
      throw new Error('Acción no reconocida')
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