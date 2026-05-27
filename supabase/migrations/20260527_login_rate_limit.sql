-- ================================================================
-- Migración: Rate limiting server-side para login
--
-- PROBLEMA: El bloqueo de login estaba solo en localStorage del
-- navegador. Cualquiera podía borrarlo y hacer fuerza bruta.
--
-- SOLUCIÓN: Agregar contadores de intentos fallidos directamente
-- en la tabla usuarios. El Edge Function verifica y actualiza
-- estos valores antes de permitir el login.
--
-- COMPORTAMIENTO:
--   - 5 intentos fallidos → bloqueo de 5 minutos
--   - Login exitoso → contadores se resetean a 0
--
-- APLICAR EN: Supabase Dashboard → SQL Editor
-- ================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until    TIMESTAMPTZ;

-- Índice para acelerar la consulta de bloqueo en el login
CREATE INDEX IF NOT EXISTS idx_usuarios_username_lock
  ON usuarios (username, locked_until)
  WHERE locked_until IS NOT NULL;
