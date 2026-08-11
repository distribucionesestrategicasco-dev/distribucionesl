// ════════════════════════════════════════════════════════════════
// correo-abierto — confirmación de lectura de las cotizaciones.
//
// Es el único endpoint del proyecto sin sesión (verify_jwt = false):
// quien lo llama es el lector de correo del cliente, que no puede
// mandar cabeceras. Por eso no acepta nada más que un token opaco y
// nunca dice si existe — responde el mismo GIF pase lo que pase, para
// que la URL no sirva para averiguar qué correos hay.
//
// Dos entradas, el mismo token:
//   ?t=<uuid>              → píxel del cuerpo del correo ("lo abrió")
//   ?t=<uuid>&tipo=enlace  → la página de seguimiento avisa del clic
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// GIF transparente de 1x1. Es lo que ve el cliente en su correo.
const PIXEL = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (c) => c.charCodeAt(0))

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Sin caché: si el proveedor guarda el píxel, las aperturas siguientes
// no llegan. Aun así muchos clientes cachean por su cuenta, así que el
// contador de aperturas es siempre un mínimo, no un total exacto.
const cabecerasPixel = {
  'Content-Type':  'image/gif',
  'Content-Length': String(PIXEL.length),
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma':        'no-cache',
  'Expires':       '0',
  // El píxel lo pide un <img> del correo y el aviso de clic lo pide un
  // <img> de la web: ninguno lee la respuesta, así que abrir el CORS
  // aquí no expone nada.
  'Access-Control-Allow-Origin': '*',
}

const responderPixel = () => new Response(PIXEL, { status: 200, headers: cabecerasPixel })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    })
  }

  try {
    const url   = new URL(req.url)
    const token = (url.searchParams.get('t') || '').trim()
    const tipo  = url.searchParams.get('tipo') === 'enlace' ? 'enlace' : 'pixel'

    // Token con forma equivocada: ni se consulta la base.
    if (!RE_UUID.test(token)) return responderPixel()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // El User-Agent distingue una lectura real de una precarga del
    // proveedor (GoogleImageProxy, Apple Mail Privacy Protection…).
    const agente = req.headers.get('User-Agent') || ''

    const { error } = await supabase.rpc('registrar_apertura_correo', {
      p_token:  token,
      p_tipo:   tipo,
      p_agente: agente,
    })
    if (error) console.warn('registrar apertura:', error.message)
  } catch (e) {
    // Nunca romper el correo del cliente por un fallo del rastreo: si
    // algo va mal, el píxel sale igual y solo se pierde el registro.
    console.warn('correo-abierto:', e)
  }

  return responderPixel()
})
