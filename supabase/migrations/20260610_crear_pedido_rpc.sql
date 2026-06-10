-- ================================================================
-- #3: creación de pedidos del cliente vía RPC (reemplaza el INSERT
-- anónimo directo a las tablas).
--
-- PROBLEMA: las políticas anon_insert_* (WITH CHECK true) permitían a
-- cualquiera con la clave anon insertar pedidos/items/historial
-- arbitrarios: forjar registros, inyectar historial en pedidos ajenos
-- y spamear la base. Además la generación de ID se hacía en el cliente
-- (condición de carrera: dos pedidos simultáneos podían chocar de ID).
--
-- SOLUCIÓN: RPC SECURITY DEFINER que valida y recorta los campos,
-- asigna el ID de forma atómica (advisory lock) e inserta pedido,
-- items e historial inicial en una sola transacción.
--
-- Se acompaña de drop_anon_insert_pedidos.sql, que elimina las políticas
-- de INSERT anónimo una vez el frontend usa este RPC.
--
-- APLICAR EN: Supabase Dashboard → SQL Editor (o supabase db push)
-- ================================================================

CREATE OR REPLACE FUNCTION public.crear_pedido(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id     text;
  v_item   jsonb;
  v_client text  := nullif(trim(coalesce(payload->>'client', '')), '');
  v_items  jsonb := coalesce(payload->'items', '[]'::jsonb);
BEGIN
  IF v_client IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'El nombre del cliente es obligatorio');
  END IF;
  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'El pedido no tiene productos');
  END IF;
  IF jsonb_array_length(v_items) > 200 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Demasiados productos en el pedido');
  END IF;

  -- ID correlativo atómico (serializa solo las llamadas a crear_pedido)
  PERFORM pg_advisory_xact_lock(hashtext('crear_pedido'));
  SELECT 'REM-' || (GREATEST(
           COALESCE(MAX((regexp_replace(id, '\D', '', 'g'))::bigint), 2025299), 2025299) + 1)::text
    INTO v_id
    FROM pedidos
   WHERE id ~ '^REM-\d+$'
     AND (regexp_replace(id, '\D', '', 'g'))::bigint >= 2025300;

  INSERT INTO pedidos (id, client, company, nit, email, phone, city, address, notes,
                       date, fecha_requerida, status, subtotal, iva, total)
  VALUES (
    v_id,
    left(v_client, 200),
    left(coalesce(payload->>'company', ''), 200),
    left(coalesce(payload->>'nit', ''), 50),
    left(coalesce(payload->>'email', ''), 200),
    left(coalesce(payload->>'phone', ''), 50),
    left(coalesce(payload->>'city', ''), 120),
    left(coalesce(payload->>'address', ''), 300),
    left(coalesce(payload->>'notes', ''), 1000),
    coalesce(nullif(payload->>'date', '')::date, current_date),
    nullif(payload->>'fechaRequerida', '')::date,
    'pending', 0, 0, 0
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    IF nullif(trim(coalesce(v_item->>'name', '')), '') IS NOT NULL THEN
      INSERT INTO pedido_items (pedido_id, name, qty, price, icon)
      VALUES (
        v_id,
        left(v_item->>'name', 200),
        GREATEST(1, COALESCE(floor((v_item->>'qty')::numeric), 1))::int,
        GREATEST(0, COALESCE((v_item->>'price')::numeric, 0)),
        left(coalesce(nullif(v_item->>'icon', ''), '📦'), 16)
      );
    END IF;
  END LOOP;

  INSERT INTO pedido_historial (pedido_id, estado, fecha, usuario)
  VALUES (v_id, 'Nuevo', to_char(now(), 'DD/MM/YYYY'), 'Cliente');

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

REVOKE ALL     ON FUNCTION public.crear_pedido(jsonb) FROM public;
GRANT  EXECUTE ON FUNCTION public.crear_pedido(jsonb) TO anon, authenticated;
