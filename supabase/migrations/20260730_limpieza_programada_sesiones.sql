-- ================================================================
-- F-09: limpieza programada de la tabla `sessions`.
--
-- PROBLEMA: la Edge Function intentaba una limpieza perezosa en cada
-- petición, pero lanzaba el DELETE sin await: una promesa sin esperar que
-- el runtime puede descartar al terminar la respuesta. En la práctica no
-- se ejecutaba — había 11 filas expiradas, la más antigua del 2026-05-28
-- (dos meses sin depurar).
--
-- SOLUCIÓN: un job de pg_cron a las 03:15 (hora del servidor) que borra
-- las sesiones ya expiradas. Independiente del tráfico de la aplicación.
--
-- La otra mitad de F-09 se resuelve en el frontend: `cerrarSesion()` en
-- js/app.js ahora llama a la acción `logout` de la Edge Function antes de
-- salir. Antes solo borraba localStorage y el token seguía siendo válido
-- en la BD durante sus 8 horas completas.
--
-- Verificado tras aplicar: la función borró las 11 sesiones atrasadas y
-- el job quedó activo; logout devuelve 200 y reusar el token → 401.
--
-- APLICAR EN: Supabase Dashboard → SQL Editor (o supabase db push)
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Función propia para no depender de que el job tenga permisos directos
-- sobre la tabla ni de comillas anidadas en la definición del cron.
CREATE OR REPLACE FUNCTION public.limpiar_sesiones_expiradas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  borradas integer;
BEGIN
  DELETE FROM sessions WHERE expires_at < now();
  GET DIAGNOSTICS borradas = ROW_COUNT;
  RETURN borradas;
END;
$$;

-- Solo el service_role la ejecuta; nunca desde el cliente.
REVOKE ALL     ON FUNCTION public.limpiar_sesiones_expiradas() FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.limpiar_sesiones_expiradas() TO service_role;

-- Reprogramar de forma idempotente
SELECT cron.unschedule('limpiar-sesiones-expiradas')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpiar-sesiones-expiradas');

SELECT cron.schedule(
  'limpiar-sesiones-expiradas',
  '15 3 * * *',
  $$SELECT public.limpiar_sesiones_expiradas();$$
);
