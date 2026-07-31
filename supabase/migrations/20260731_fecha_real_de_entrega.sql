-- ================================================================
-- Fecha real de entrega. Ya aplicada en produccion.
--
-- PROBLEMA: `pedidos.date` es la fecha de creacion de la remision. No
-- habia ningun campo con la fecha en que se entrego, asi que no se podia
-- responder a "cuanto tardamos en entregar" ni ordenar las entregas por
-- cuando ocurrieron.
--
-- SOLUCION: `entregado_en`, que la Edge Function sella al pasar a
-- 'delivered' y limpia si la remision sale de ese estado. No se pisa si
-- ya estaba entregada: reeditar no debe mover la fecha.
--
-- BACKFILL: se rellena con la entrada 'delivered' del historial, que es
-- lo mejor que hay. OJO: las 13 entregas historicas se registraron todas
-- el 2026-07-29 en menos de 30 segundos (marcado en bloque), asi que esas
-- fechas dicen cuando se REGISTRO la entrega, no cuando ocurrio. Los
-- tiempos de ciclo solo son significativos a partir del 2026-07-31.
-- ================================================================

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS entregado_en timestamptz;

COMMENT ON COLUMN pedidos.entregado_en IS
  'Momento en que la remision se marco como entregada. Distinto de `date`, que es la creacion. '
  'Los valores anteriores al 2026-07-31 vienen de un marcado en bloque y no reflejan la entrega real.';

CREATE INDEX IF NOT EXISTS idx_pedidos_entregado ON pedidos (entregado_en DESC)
  WHERE entregado_en IS NOT NULL;

UPDATE pedidos p
   SET entregado_en = h.created_at
  FROM (
    SELECT DISTINCT ON (pedido_id) pedido_id, created_at
      FROM pedido_historial
     WHERE estado = 'delivered'
     ORDER BY pedido_id, created_at DESC
  ) h
 WHERE h.pedido_id = p.id
   AND p.status = 'delivered'
   AND p.entregado_en IS NULL;
