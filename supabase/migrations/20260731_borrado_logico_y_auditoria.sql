-- ================================================================
-- Borrado logico de remisiones + registro de auditoria.
-- Ya aplicada en produccion y verificada; se guarda como fuente de verdad.
--
-- PROBLEMA 1: eliminarPedido borraba pedido, lineas e historial de forma
-- permanente y sin respaldo. Un clic accidental no tenia vuelta atras.
-- Ademas, al desaparecer la fila el consecutivo se reutilizaba: si el
-- papel de la remision borrada ya estaba en la calle, quedaban dos
-- documentos distintos con el mismo numero.
--
-- PROBLEMA 2: no quedaba traza de quien creaba, editaba o borraba
-- usuarios y productos. El historial de remisiones si es fiable, pero
-- todo lo demas era invisible.
--
-- SOLUCION: `pedidos.eliminado_en` (las filas se conservan, asi que el
-- consecutivo tampoco se reutiliza) y una tabla `auditoria` que escribe
-- la Edge Function con el username verificado de la sesion.
--
-- Verificado: borrar -> desaparece del listado y aparece en la papelera
-- con quien la borro; restaurar -> vuelve; borrar otra vez y crear una
-- nueva -> sale REM-2025336, no reutiliza el 335.
-- ================================================================

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS eliminado_en timestamptz;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS eliminado_por text;

COMMENT ON COLUMN pedidos.eliminado_en IS
  'Marca de borrado logico. Las consultas del panel excluyen las filas con valor; '
  'se conservan para poder restaurarlas y para que el consecutivo no se reutilice.';

CREATE INDEX IF NOT EXISTS idx_pedidos_vivos
  ON pedidos (created_at DESC) WHERE eliminado_en IS NULL;

CREATE TABLE IF NOT EXISTS auditoria (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario    text        NOT NULL,
  accion     text        NOT NULL,
  entidad    text        NOT NULL,
  entidad_id text,
  detalle    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  auditoria         IS 'Traza de cambios en usuarios, productos y remisiones. La escribe la Edge Function con el username de la sesion verificada.';
COMMENT ON COLUMN auditoria.usuario IS 'username verificado en el servidor, nunca el nombre para mostrar.';
COMMENT ON COLUMN auditoria.accion  IS 'crear | editar | eliminar | restaurar | activar | pausar';
COMMENT ON COLUMN auditoria.entidad IS 'usuario | producto | remision';

CREATE INDEX IF NOT EXISTS idx_auditoria_fecha   ON auditoria (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria (entidad, entidad_id);

-- Sin politicas: solo el service_role (Edge Function) entra.
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- track_pedido y aprobar_cotizacion pasan a ignorar las remisiones
-- borradas (definiciones completas en la migracion aplicada).
