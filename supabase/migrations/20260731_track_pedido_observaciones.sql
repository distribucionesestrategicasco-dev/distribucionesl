-- ================================================================
-- El seguimiento publico muestra las observaciones. Ya aplicada.
--
-- PROBLEMA: `city` es la ciudad donde se TOMO el pedido, no donde se
-- entrega. Como el formulario de remision manual no pide direccion, el
-- destino real acaba escrito en las observaciones. De 15 remisiones, 12
-- tienen observaciones y NINGUNA tiene direccion. Caso real: REM-2025326
-- muestra "Barranquilla" y la entrega es en Valledupar, dato que solo
-- estaba en las observaciones y que el cliente no veia al consultar.
--
-- SOLUCION: track_pedido devuelve tambien `notes` y `address`. El cliente
-- ya ve las observaciones impresas en la remision que recibe, asi que no
-- se expone nada nuevo; se sigue sin devolver nombre, correo, telefono ni
-- NIT.
--
-- Se limpia el marcador "[Aprobada manualmente ... por usuario: ...]" que
-- anade la aprobacion interna: lleva un username y es ruido para el
-- cliente.
--
-- NOTA DE FONDO: esto hace visible el dato, pero la causa es que falta un
-- campo de direccion/destino en el formulario de remision manual.
-- ================================================================

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
    'address',  p.address,
    'notes',    nullif(trim(regexp_replace(coalesce(p.notes, ''),
                  '\[Aprobada manualmente[^\]]*\]', '', 'g')), ''),
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
    AND p.eliminado_en IS NULL
  LIMIT 1;
$$;

REVOKE ALL     ON FUNCTION public.track_pedido(text) FROM public;
GRANT  EXECUTE ON FUNCTION public.track_pedido(text) TO anon, authenticated;
