-- ================================================================
-- Una cotizacion aprobada tiene que convertirse en remision CON SU PROPIO
-- CONSECUTIVO. Ya aplicada en produccion.
--
-- Al darle a "Remision" en Ordenes aprobadas, el documento salia con el
-- numero de la cotizacion (COT-1002) en vez del siguiente de la serie de
-- remisiones, y no aparecia en Remisiones con las demas. La cotizacion y la
-- remision son dos documentos distintos y solo el segundo lleva la
-- numeracion de despacho.
--
-- Se renumera la fila en vez de duplicarla: es el mismo pedido siguiendo su
-- ciclo, igual que los pedidos de la web, que ya nacen con REM-.
--
-- Verificado: COT-1003 -> REM-2025335 con las lineas y el historial
-- siguiendo al padre (0 huerfanas), estado dispatched, el numero de la
-- cotizacion conservado, el enlace viejo del cliente resolviendo a la
-- remision nueva, y una segunda conversion que no vuelve a renumerar.
-- ================================================================

-- 1. Renumerar exige que las lineas y el historial sigan al padre. Estaban en
--    NO ACTION, asi que un UPDATE del id habria fallado.
ALTER TABLE pedido_items    DROP CONSTRAINT pedido_items_pedido_id_fkey;
ALTER TABLE pedido_items    ADD  CONSTRAINT pedido_items_pedido_id_fkey
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE pedido_historial DROP CONSTRAINT pedido_historial_pedido_id_fkey;
ALTER TABLE pedido_historial ADD  CONSTRAINT pedido_historial_pedido_id_fkey
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- 2. El numero de la cotizacion no se tira: el cliente lo tiene en su correo y
--    el enlace de seguimiento que recibio apunta a el.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cotizacion_num text;
CREATE INDEX IF NOT EXISTS pedidos_cotizacion_num_idx ON pedidos (upper(cotizacion_num));

CREATE OR REPLACE FUNCTION public.convertir_en_remision(p_id text, p_usuario text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v      RECORD;
  v_new  text;
  v_cot  text := NULL;
BEGIN
  SELECT id, status, cotizacion_num INTO v
    FROM pedidos
   WHERE upper(id) = upper(trim(p_id)) AND eliminado_en IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Pedido no encontrado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pedido_items WHERE pedido_id = v.id) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'El pedido no tiene productos');
  END IF;

  -- Mismo lock y misma serie que la remision manual: un solo consecutivo.
  PERFORM pg_advisory_xact_lock(hashtext('crear_pedido'));

  IF v.id ~ '^REM-\d+$' THEN
    -- Ya es una remision (pedido llegado por la web): solo se despacha.
    v_new := v.id;
  ELSE
    SELECT 'REM-' || (GREATEST(
             COALESCE(MAX((regexp_replace(id, '\D', '', 'g'))::bigint), 2025299), 2025299) + 1)::text
      INTO v_new
      FROM pedidos
     WHERE id ~ '^REM-\d+$'
       AND (regexp_replace(id, '\D', '', 'g'))::bigint >= 2025300;
    v_cot := v.id;
  END IF;

  UPDATE pedidos
     SET id             = v_new,
         cotizacion_num = COALESCE(v.cotizacion_num, v_cot),
         status         = 'dispatched'
   WHERE id = v.id;

  INSERT INTO pedido_historial (pedido_id, estado, fecha, usuario)
  VALUES (v_new, 'dispatched', to_char(now(), 'DD/MM/YYYY'),
          coalesce(nullif(trim(p_usuario), ''), 'Sistema'));

  RETURN jsonb_build_object('ok', true, 'id', v_new,
                            'cotizacion_num', COALESCE(v.cotizacion_num, v_cot));
END;
$$;

REVOKE ALL     ON FUNCTION public.convertir_en_remision(text, text) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.convertir_en_remision(text, text) TO service_role;

-- 3. El enlace que ya tiene el cliente (...?id=COT-1002) debe seguir sirviendo
--    despues de renumerar, o se queda mirando una pagina vacia. Igual al
--    autorizar, para que reciba el motivo real y no "no encontrado".
--    (Cuerpos completos de track_pedido y aprobar_cotizacion aplicados en
--    produccion; aqui solo cambia la clausula WHERE de busqueda:
--       WHERE (upper(p.id) = upper(trim(p_id))
--              OR upper(coalesce(p.cotizacion_num, '')) = upper(trim(p_id)))
--         AND p.eliminado_en IS NULL )
