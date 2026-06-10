-- ================================================================
-- Migración: bloquear lectura anónima de pedidos (PII) y exponer
-- un tracking público mínimo vía RPC.
--
-- PROBLEMA (CRÍTICO): las políticas anon_select_* USING(true)
-- permitían a cualquiera con la clave anon (pública, embebida en el
-- JS) descargar TODOS los pedidos con su PII: nombre, email,
-- teléfono, NIT, dirección y notas. El buscador de seguimiento ya
-- descargaba la tabla completa al navegador del visitante.
--
-- SOLUCIÓN:
--   - Eliminar las políticas SELECT permisivas para el rol anon en
--     pedidos, pedido_items y pedido_historial.
--   - track_pedido(id): RPC SECURITY DEFINER que devuelve SOLO datos
--     no sensibles (estado, fecha, ciudad, totales, items) por ID
--     exacto. Sin nombre, email, teléfono, NIT ni dirección.
--   - next_order_id(): RPC que entrega el próximo ID correlativo sin
--     exponer ningún dato de la tabla.
--   - El panel admin pasa a leer pedidos vía Edge Function
--     (service_role), nunca con la clave anon.
--
-- APLICAR EN: Supabase Dashboard → SQL Editor (o supabase db push)
-- ================================================================

-- ── 1. Quitar la lectura anónima directa a las tablas ────────────
DROP POLICY IF EXISTS "anon_select_pedidos"          ON pedidos;
DROP POLICY IF EXISTS "anon_select_pedido_items"     ON pedido_items;
DROP POLICY IF EXISTS "anon_select_pedido_historial" ON pedido_historial;

-- (Se conservan las políticas de INSERT para que los clientes sigan
--  creando pedidos. Las lecturas del admin y el tracking público ya
--  no dependen de la tabla directamente.)


-- ── 2. Tracking público: solo datos mínimos, por ID exacto ───────
-- SECURITY DEFINER ejecuta con privilegios del owner (ignora RLS),
-- pero la función SOLO devuelve campos no sensibles del pedido pedido
-- por su ID exacto. No permite enumerar ni filtrar por otros campos.
CREATE OR REPLACE FUNCTION public.track_pedido(p_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id',       p.id,
    'status',   p.status,
    'date',     p.date,
    'city',     p.city,
    'subtotal', p.subtotal,
    'iva',      p.iva,
    'total',    p.total,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name',  i.name,
        'qty',   i.qty,
        'price', i.price,
        'icon',  i.icon
      ) ORDER BY i.id)
      FROM pedido_items i
      WHERE i.pedido_id = p.id
    ), '[]'::jsonb)
  )
  FROM pedidos p
  WHERE upper(p.id) = upper(trim(p_id))
  LIMIT 1;
$$;

REVOKE ALL     ON FUNCTION public.track_pedido(text) FROM public;
GRANT  EXECUTE ON FUNCTION public.track_pedido(text) TO anon, authenticated;


-- ── 3. Próximo ID correlativo sin exponer la tabla ───────────────
-- Devuelve 'REM-<n>' con n = max(actual, 2025299) + 1 (mínimo REM-2025300).
-- Reemplaza la lectura `select=id` que hacía el cliente con la clave anon.
CREATE OR REPLACE FUNCTION public.next_order_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_num bigint;
BEGIN
  SELECT COALESCE(MAX((regexp_replace(id, '\D', '', 'g'))::bigint), 2025299)
    INTO max_num
    FROM pedidos
   WHERE id ~ '^REM-\d+$'
     AND (regexp_replace(id, '\D', '', 'g'))::bigint >= 2025300;

  RETURN 'REM-' || (GREATEST(max_num, 2025299) + 1)::text;
END;
$$;

REVOKE ALL     ON FUNCTION public.next_order_id() FROM public;
GRANT  EXECUTE ON FUNCTION public.next_order_id() TO anon, authenticated;
