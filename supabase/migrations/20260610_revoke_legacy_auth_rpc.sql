-- ================================================================
-- CRÍTICO: revocar ejecución pública de funciones de auth heredadas.
--
-- PROBLEMA: varias funciones SECURITY DEFINER de un diseño de auth
-- anterior quedaron expuestas al rol anon vía /rest/v1/rpc/*:
--   - set_user_password(username, password): SIN validación → cualquiera
--     podía cambiar la contraseña de cualquier usuario (incluido admin).
--   - crear_usuario_auth(...): SIN validación → anon podía crear un
--     usuario con rol 'administrador'.
--   - admin_reset_password / change_own_password / verify_user_password:
--     validan credenciales pero no tienen rate-limit y no se usan en el
--     frontend actual.
-- Resultado: toma de control total de cuentas con una sola petición.
--
-- SOLUCIÓN: revocar EXECUTE a anon/authenticated/public. La Edge Function
-- usa verificar_login y hashear_password con service_role, que se reotorgan.
-- El sistema de login actual (Edge Function + tabla sessions) no usa
-- ninguna de las funciones legacy directamente desde el cliente.
--
-- APLICAR EN: Supabase Dashboard → SQL Editor (o supabase db push)
-- ================================================================

REVOKE EXECUTE ON FUNCTION public.set_user_password(text, text)                    FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.crear_usuario_auth(text, text, text, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.admin_reset_password(text, text, text, text)     FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.change_own_password(text, text, text)            FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.verify_user_password(text, text, text, text)     FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.verificar_login(text, text)                      FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.hashear_password(text)                           FROM anon, authenticated, public;

-- La Edge Function (service_role) sí necesita estas dos:
GRANT EXECUTE ON FUNCTION public.verificar_login(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.hashear_password(text)      TO service_role;

-- Endurecer search_path de las funciones que se conservan:
ALTER FUNCTION public.verificar_login(text, text) SET search_path = public;
ALTER FUNCTION public.hashear_password(text)      SET search_path = public;
