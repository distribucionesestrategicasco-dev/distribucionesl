-- ================================================================
-- Migración de seguridad: RLS para pedidos, pedido_items, historial
--
-- PROBLEMA: Actualmente cualquier persona con la clave anon puede
-- leer, modificar y eliminar TODOS los pedidos del sistema.
--
-- SOLUCIÓN:
--   - Permitir a anon: INSERT (crear pedidos) y SELECT (tracking)
--   - Permitir a anon UPDATE SOLO para aprobar cotizaciones (status → 'approved')
--   - Bloquear DELETE a anon — las eliminaciones van por Edge Function (service_role)
--   - service_role bypasea RLS automáticamente → admin sigue funcionando
--
-- APLICAR EN: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── pedidos ─────────────────────────────────────────────────────

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Clientes crean pedidos
CREATE POLICY "anon_insert_pedidos"
  ON pedidos FOR INSERT TO anon
  WITH CHECK (true);

-- Clientes y admin consultan (tracking, polling de notificaciones)
CREATE POLICY "anon_select_pedidos"
  ON pedidos FOR SELECT TO anon
  USING (true);

-- Clientes SOLO pueden aprobar una cotización que está pendiente/cotizada.
-- Ninguna otra operación UPDATE está permitida para anon.
-- Las actualizaciones de estado del admin van por Edge Function (service_role).
CREATE POLICY "anon_aprobar_cotizacion"
  ON pedidos FOR UPDATE TO anon
  USING  (status IN ('pending', 'quoted'))
  WITH CHECK (status = 'approved');

-- DELETE solo por service_role (Edge Function) — anon no puede eliminar
-- (no se crea política para DELETE en anon → queda bloqueado por defecto)


-- ── pedido_items ────────────────────────────────────────────────

ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_pedido_items"
  ON pedido_items FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "anon_select_pedido_items"
  ON pedido_items FOR SELECT TO anon
  USING (true);

-- UPDATE y DELETE de items solo por service_role (Edge Function)


-- ── pedido_historial ────────────────────────────────────────────

ALTER TABLE pedido_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_pedido_historial"
  ON pedido_historial FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "anon_select_pedido_historial"
  ON pedido_historial FOR SELECT TO anon
  USING (true);

-- UPDATE y DELETE de historial solo por service_role (Edge Function)
