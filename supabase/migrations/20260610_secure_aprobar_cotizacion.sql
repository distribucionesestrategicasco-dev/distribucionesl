-- ================================================================
-- #2 IDOR: aprobación de cotizaciones.
--
-- PROBLEMA: la política anon_aprobar_cotizacion permitía a CUALQUIER
-- anon hacer UPDATE de cualquier pedido pending/quoted -> approved sin
-- probar propiedad. Con IDs secuenciales (REM-202530x), un atacante
-- podía enumerar y aprobar cotizaciones ajenas, disparando el despacho.
--
-- SOLUCIÓN: eliminar la política y mover la aprobación a un RPC
-- SECURITY DEFINER que exige un verificador (correo, NIT/CC o teléfono
-- del propio pedido). Sin ese dato no se puede aprobar.
--
-- APLICAR EN: Supabase Dashboard → SQL Editor (o supabase db push)
-- ================================================================

DROP POLICY IF EXISTS "anon_aprobar_cotizacion" ON pedidos;

CREATE OR REPLACE FUNCTION public.aprobar_cotizacion(p_id text, p_verifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v        RECORD;
  vf       text    := lower(trim(coalesce(p_verifier, '')));
  v_digits text    := regexp_replace(coalesce(p_verifier, ''), '\D', '', 'g');
  v_match  boolean := false;
BEGIN
  SELECT id, status, email, nit, phone INTO v
  FROM pedidos
  WHERE upper(id) = upper(trim(p_id));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Pedido no encontrado');
  END IF;

  IF v.status NOT IN ('pending', 'quoted') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Esta cotización no está disponible para aprobación');
  END IF;

  IF vf = '' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Falta el dato de verificación');
  END IF;

  IF v.email IS NOT NULL AND v.email <> '' AND lower(v.email) = vf THEN
    v_match := true;
  END IF;
  IF v.nit IS NOT NULL AND v.nit <> '' AND lower(v.nit) = vf THEN
    v_match := true;
  END IF;
  IF v.phone IS NOT NULL AND regexp_replace(v.phone, '\D', '', 'g') <> ''
     AND v_digits <> '' AND regexp_replace(v.phone, '\D', '', 'g') = v_digits THEN
    v_match := true;
  END IF;

  IF NOT v_match THEN
    RETURN jsonb_build_object('ok', false, 'message', 'El dato de verificación no coincide con el pedido');
  END IF;

  UPDATE pedidos SET status = 'approved' WHERE id = v.id;
  INSERT INTO pedido_historial (pedido_id, estado, fecha, usuario)
  VALUES (v.id, 'Aprobado', to_char(now(), 'DD/MM/YYYY'), 'Cliente');

  RETURN jsonb_build_object('ok', true, 'message', 'Cotización aprobada');
END;
$$;

REVOKE ALL     ON FUNCTION public.aprobar_cotizacion(text, text) FROM public;
GRANT  EXECUTE ON FUNCTION public.aprobar_cotizacion(text, text) TO anon, authenticated;
