-- ================================================================
-- Fase 2 de la auditoría funcional (parte de base de datos).
-- Ya aplicada en producción y verificada; se guarda como fuente de verdad.
--
-- Contiene dos migraciones que se aplicaron por separado:
--   1. historial_vocabulario_unico            (F-08)
--   2. crear_remision_manual_consecutivo_atomico (F-05)
--
-- El texto completo de cada una está abajo. Ver también la Edge Function
-- admin-usuarios v20, que exige permisos de módulo por acción (F-03) y
-- abre las transiciones de estado a los operarios (F-01).
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- F-08: un solo vocabulario de estados en `pedido_historial`
--
-- PROBLEMA: la columna `estado` mezclaba etiquetas en español escritas por
-- el panel ('Entregado') con claves internas escritas por el servidor
-- ('dispatched'), y los RPC públicos añadían 'Nuevo' y 'Aprobado'. La misma
-- transición quedaba registrada de dos formas según por dónde entrara.
-- Además el `usuario` guardaba el nombre para mostrar, que el propio usuario
-- puede cambiar en Mi Perfil, así que no servía como traza de auditoría
-- (había 13 filas atribuidas a "Lucas", que no existe en la tabla usuarios).
--
-- SOLUCIÓN: guardar siempre la clave canónica y dejar la traducción a la
-- interfaz. La Edge Function pasa a escribir el username de la sesión.
-- ────────────────────────────────────────────────────────────────

UPDATE pedido_historial SET estado = CASE lower(trim(estado))
  WHEN 'nuevo'      THEN 'pending'
  WHEN 'pendiente'  THEN 'pending'
  WHEN 'cotizado'   THEN 'quoted'
  WHEN 'aprobado'   THEN 'approved'
  WHEN 'despachado' THEN 'dispatched'
  WHEN 'entregado'  THEN 'delivered'
  ELSE lower(trim(estado))
END
WHERE lower(trim(estado)) NOT IN ('pending','quoted','approved','dispatched','delivered')
   OR estado <> lower(trim(estado));

ALTER TABLE pedido_historial DROP CONSTRAINT IF EXISTS pedido_historial_estado_check;
ALTER TABLE pedido_historial ADD CONSTRAINT pedido_historial_estado_check
  CHECK (estado IN ('pending','quoted','approved','dispatched','delivered'));

COMMENT ON COLUMN pedido_historial.estado IS
  'Clave canónica del estado. La traducción a español la hace la interfaz (statusLabel).';
COMMENT ON COLUMN pedido_historial.usuario IS
  'username verificado en el servidor, nunca el nombre para mostrar (que el usuario puede editar).';
COMMENT ON COLUMN pedido_historial.fecha IS
  'Heredado. Usar created_at, que es la marca de tiempo real.';


-- ────────────────────────────────────────────────────────────────
-- F-05: consecutivo atómico para la remisión manual
--
-- PROBLEMA: el panel pedía el número a next_order_id() al ABRIR el modal y
-- lo insertaba después con ese id explícito. Dos operarios con el formulario
-- abierto a la vez obtenían el mismo consecutivo; el segundo INSERT chocaba
-- con la clave primaria y el error solo iba a console.warn. El documento ya
-- se había impreso: quedaba un papel entregado al cliente con un número que
-- el sistema no registró.
--
-- SOLUCIÓN: asignar el número DENTRO de la transacción, con el mismo
-- advisory lock que crear_pedido (para que los pedidos de cliente y las
-- remisiones manuales compartan serie sin colisionar). Los totales se
-- calculan de las líneas, no de lo que mande el navegador.
--
-- Verificado: tres llamadas simultáneas devolvieron REM-2025335, 336 y 337,
-- sin colisiones ni registros perdidos.
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.crear_remision_manual(payload jsonb, p_usuario text)
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
  v_estado text  := coalesce(nullif(payload->>'status', ''), 'dispatched');
  v_sub    numeric := 0;
BEGIN
  IF v_client IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'El nombre del cliente es obligatorio');
  END IF;
  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'La remisión no tiene productos');
  END IF;
  IF jsonb_array_length(v_items) > 200 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Demasiados productos en la remisión');
  END IF;
  IF v_estado NOT IN ('pending','quoted','approved','dispatched','delivered') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Estado no válido');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('crear_pedido'));
  SELECT 'REM-' || (GREATEST(
           COALESCE(MAX((regexp_replace(id, '\D', '', 'g'))::bigint), 2025299), 2025299) + 1)::text
    INTO v_id
    FROM pedidos
   WHERE id ~ '^REM-\d+$'
     AND (regexp_replace(id, '\D', '', 'g'))::bigint >= 2025300;

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
    left(coalesce(payload->>'email', ''), 200),
    left(coalesce(payload->>'phone', ''), 50),
    left(coalesce(payload->>'city', ''), 120),
    left(coalesce(payload->>'address', ''), 300),
    left(coalesce(payload->>'notes', ''), 1000),
    coalesce(nullif(payload->>'date', '')::date, current_date),
    v_estado,
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
  VALUES (v_id, v_estado, to_char(now(), 'DD/MM/YYYY'), coalesce(nullif(trim(p_usuario), ''), 'Sistema'));

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

REVOKE ALL     ON FUNCTION public.crear_remision_manual(jsonb, text) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.crear_remision_manual(jsonb, text) TO service_role;

-- Nota: crear_pedido() y aprobar_cotizacion() también se actualizaron para
-- escribir la clave canónica en el historial ('pending' y 'approved' en vez
-- de 'Nuevo' y 'Aprobado'). Su definición completa está en las migraciones
-- 20260610_crear_pedido_rpc.sql y 20260610_secure_aprobar_cotizacion.sql,
-- con ese único cambio en la línea del INSERT a pedido_historial.
