-- ================================================================
-- Limpieza de restos de disenos anteriores.
-- Ya aplicada en produccion.
--
-- `pedidos_duplicate`: copia huerfana de la tabla de pedidos, vacia. Al
-- tener la misma forma, era una posible copia de PII esperando a que
-- alguien la rellenara.
--
-- `login_attempts`: tabla de un control de intentos anterior. Solo tenia
-- 3 filas de prueba de marzo de 2026; el control real vive en las
-- columnas failed_attempts / locked_until de `usuarios`.
--
-- Las cinco funciones de auth heredadas ya tenian revocado el EXECUTE
-- para anon y authenticated, pero seguian existiendo con search_path
-- mutable y el linter las senalaba. No las usa nadie: la Edge Function
-- solo llama a verificar_login y hashear_password.
--
-- OJO para el futuro: verificar_login y hashear_password usan crypt() y
-- gen_salt() de pgcrypto, que en este proyecto vive en el esquema
-- `extensions`. Su search_path debe ser `public, extensions` — ponerles
-- solo `public` rompe el login.
-- ================================================================

DROP FUNCTION IF EXISTS public.verify_user_password(text, text, text, text);
DROP FUNCTION IF EXISTS public.admin_reset_password(text, text, text, text);
DROP FUNCTION IF EXISTS public.change_own_password(text, text, text);
DROP FUNCTION IF EXISTS public.crear_usuario_auth(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.set_user_password(text, text);

DROP TABLE IF EXISTS public.login_attempts;
DROP TABLE IF EXISTS public.pedidos_duplicate;
