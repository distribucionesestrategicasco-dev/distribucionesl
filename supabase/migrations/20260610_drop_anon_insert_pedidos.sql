-- ================================================================
-- #3 cierre: eliminar el INSERT anónimo directo.
--
-- Tras esta migración, el rol anon NO tiene ninguna política en
-- pedidos / pedido_items / pedido_historial → RLS deniega todo acceso
-- directo. Toda operación pasa por:
--   - crear_pedido()        (RPC público, SECURITY DEFINER)
--   - aprobar_cotizacion()  (RPC público, SECURITY DEFINER)
--   - track_pedido()        (RPC público, SECURITY DEFINER, solo lectura)
--   - Edge Function admin-usuarios (service_role) para el panel.
--
-- IMPORTANTE: aplicar SOLO después de publicar el frontend que usa los
-- RPC, o la creación de pedidos del cliente fallará en producción.
--
-- APLICAR EN: Supabase Dashboard → SQL Editor (o supabase db push)
-- ================================================================

DROP POLICY IF EXISTS "anon_insert_pedidos"          ON pedidos;
DROP POLICY IF EXISTS "anon_insert_pedido_items"     ON pedido_items;
DROP POLICY IF EXISTS "anon_insert_pedido_historial" ON pedido_historial;
