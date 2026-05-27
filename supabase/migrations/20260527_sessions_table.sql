-- ================================================================
-- Migración: Tabla de sesiones server-side
--
-- PROBLEMA: El token era base64(JSON) con el username — cualquiera
-- que conociera un username válido podía forjar un token admin.
--
-- SOLUCIÓN: Generar un UUID aleatorio en el servidor al hacer login,
-- guardarlo aquí, y verificar ese UUID en cada request.
-- Sin la clave del servidor es imposible forjar un token válido.
-- ================================================================

CREATE TABLE IF NOT EXISTS sessions (
  token      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_lookup
  ON sessions (token, expires_at);

-- Solo el service_role (Edge Function) puede acceder a esta tabla
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
