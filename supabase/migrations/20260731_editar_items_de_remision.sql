-- ================================================================
-- Editar los productos de una remision. Ya aplicada en produccion.
--
-- PROBLEMA: la edicion dejaba cambiar cliente, direccion, observaciones y
-- estado, pero NO las lineas de producto. Si se colaba un producto de mas,
-- faltaba uno o la cantidad estaba mal, no habia forma de arreglarlo: solo
-- borrar la remision entera y rehacerla.
--
-- REGLA: no se tocan los productos de una remision ya ENTREGADA. El
-- cliente firmo un documento con unas lineas concretas; cambiarlas despues
-- dejaria el papel archivado sin corresponder con el sistema. Se valida
-- en el servidor, no solo en la interfaz.
--
-- Verificado: una remision entregada rechaza el cambio; una despachada lo
-- acepta; dejarla sin productos se rechaza; y al marcarla entregada vuelve
-- a quedar bloqueada.
-- ================================================================

CREATE OR REPLACE FUNCTION public.actualizar_items_remision(
  p_id text, p_items jsonb, p_usuario text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v        RECORD;
  v_item   jsonb;
  v_sub    numeric := 0;
  v_cuenta int     := 0;
BEGIN
  SELECT id, status, eliminado_en INTO v
  FROM pedidos WHERE upper(id) = upper(trim(p_id));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'La remisión no existe');
  END IF;
  IF v.eliminado_en IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'La remisión está en la papelera; restáurala primero');
  END IF;
  IF v.status = 'delivered' THEN
    RETURN jsonb_build_object('ok', false,
      'message', 'Esta remisión ya fue entregada y el cliente firmó estos productos. No se pueden cambiar.');
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'La remisión debe tener al menos un producto');
  END IF;
  IF jsonb_array_length(p_items) > 200 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Demasiados productos en la remisión');
  END IF;

  DELETE FROM pedido_items WHERE pedido_id = v.id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF nullif(trim(coalesce(v_item->>'name', '')), '') IS NOT NULL THEN
      INSERT INTO pedido_items (pedido_id, name, qty, price, icon)
      VALUES (
        v.id,
        left(v_item->>'name', 200),
        GREATEST(1, COALESCE(floor((v_item->>'qty')::numeric), 1))::int,
        GREATEST(0, COALESCE((v_item->>'price')::numeric, 0)),
        left(coalesce(nullif(v_item->>'icon', ''), '📦'), 16)
      );
      v_cuenta := v_cuenta + 1;
    END IF;
  END LOOP;

  IF v_cuenta = 0 THEN
    RAISE EXCEPTION 'La remisión debe tener al menos un producto con nombre';
  END IF;

  SELECT COALESCE(SUM(qty * price), 0) INTO v_sub
    FROM pedido_items WHERE pedido_id = v.id;

  UPDATE pedidos
     SET subtotal = v_sub, iva = round(v_sub * 0.19, 2), total = round(v_sub * 1.19, 2)
   WHERE id = v.id;

  RETURN jsonb_build_object('ok', true, 'id', v.id, 'lineas', v_cuenta);
END;
$$;

REVOKE ALL     ON FUNCTION public.actualizar_items_remision(text, jsonb, text) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.actualizar_items_remision(text, jsonb, text) TO service_role;
