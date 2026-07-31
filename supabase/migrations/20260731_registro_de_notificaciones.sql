-- ================================================================
-- Registro de notificaciones enviadas al cliente.
-- Ya aplicada en produccion.
--
-- PROBLEMA: no quedaba constancia de si un correo salio, fallo o cuando.
-- La unica traza era un aviso en pantalla que desaparecia a los segundos.
-- Ante un "nunca me avisaron" del cliente no habia nada que mirar.
--
-- SOLUCION: la Edge Function registra cada envio —el que sale y el que
-- falla— con destinatario, asunto, remision asociada y quien lo disparo.
-- Se ve en la seccion Auditoria del panel.
-- ================================================================

CREATE TABLE IF NOT EXISTS notificaciones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id    text,
  canal        text        NOT NULL DEFAULT 'email',
  destinatario text        NOT NULL,
  copia        text,
  asunto       text,
  estado       text        NOT NULL,
  error        text,
  adjuntos     int         NOT NULL DEFAULT 0,
  usuario      text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  notificaciones           IS 'Traza de correos enviados al cliente. La escribe la Edge Function.';
COMMENT ON COLUMN notificaciones.estado    IS 'enviado | fallido';
COMMENT ON COLUMN notificaciones.usuario   IS 'username verificado de quien disparo el envio.';
COMMENT ON COLUMN notificaciones.pedido_id IS 'Remision asociada, si el envio venia de una.';

CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha  ON notificaciones (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_pedido ON notificaciones (pedido_id);

-- Sin politicas: solo el service_role (Edge Function) entra.
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
