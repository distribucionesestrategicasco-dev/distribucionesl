-- ================================================================
-- Cotizacion manual desde el panel. Ya aplicada en produccion.
--
-- Hasta ahora una cotizacion solo podia nacer de un pedido llegado por la
-- web, y eso no ha ocurrido nunca: no habia forma de cotizarle a un
-- cliente que llama o escribe.
--
-- A diferencia de la remision, la cotizacion SI lleva precios: es su razon
-- de ser. Los totales se calculan aqui de las lineas, no de lo que mande
-- el navegador.
--
-- Serie propia `COT-`, separada de `REM-`. Compartir secuencia mezclaba
-- dos documentos distintos bajo la misma numeracion.
--
-- El correo es obligatorio y se valida aqui: la cotizacion se envia ahi.
--
-- Verificado: sin correo, con correo invalido y sin productos se rechaza;
-- 5x18000 + 2x4500 da subtotal 99000, IVA 18810, total 117810, con id
-- COT-1001 sin interferir con la serie REM.
-- ================================================================

CREATE OR REPLACE FUNCTION public.crear_cotizacion_manual(payload jsonb, p_usuario text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id     text;
  v_item   jsonb;
  v_client text    := nullif(trim(coalesce(payload->>'client', '')), '');
  v_email  text    := nullif(trim(coalesce(payload->>'email', '')), '');
  v_items  jsonb   := coalesce(payload->'items', '[]'::jsonb);
  v_sub    numeric := 0;
BEGIN
  IF v_client IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'El nombre del cliente es obligatorio');
  END IF;
  IF v_email IS NULL OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Hace falta un correo válido para enviar la cotización');
  END IF;
  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'La cotización no tiene productos');
  END IF;
  IF jsonb_array_length(v_items) > 200 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Demasiados productos en la cotización');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('crear_cotizacion'));
  SELECT 'COT-' || (GREATEST(
           COALESCE(MAX((regexp_replace(id, '\D', '', 'g'))::bigint), 1000), 1000) + 1)::text
    INTO v_id
    FROM pedidos
   WHERE id ~ '^COT-\d+$';

  SELECT COALESCE(SUM(
           GREATEST(1, COALESCE(floor((it->>'qty')::numeric), 1))
           * GREATEST(0, COALESCE((it->>'price')::numeric, 0))), 0)
    INTO v_sub
    FROM jsonb_array_elements(v_items) it
   WHERE nullif(trim(coalesce(it->>'name', '')), '') IS NOT NULL;

  INSERT INTO pedidos (id, client, company, nit, email, phone, city, address, notes,
                       date, status, subtotal, iva, total)
  VALUES (
    v_id,
    left(v_client, 200),
    left(coalesce(payload->>'company', ''), 200),
    left(coalesce(payload->>'nit', ''), 50),
    left(v_email, 200),
    left(coalesce(payload->>'phone', ''), 50),
    left(coalesce(payload->>'city', ''), 120),
    left(coalesce(payload->>'address', ''), 300),
    left(coalesce(payload->>'notes', ''), 1000),
    current_date,
    'quoted',
    v_sub, round(v_sub * 0.19, 2), round(v_sub * 1.19, 2)
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
  VALUES (v_id, 'quoted', to_char(now(), 'DD/MM/YYYY'), coalesce(nullif(trim(p_usuario), ''), 'Sistema'));

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'subtotal', v_sub,
                            'iva', round(v_sub * 0.19, 2), 'total', round(v_sub * 1.19, 2));
END;
$$;

REVOKE ALL     ON FUNCTION public.crear_cotizacion_manual(jsonb, text) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.crear_cotizacion_manual(jsonb, text) TO service_role;
