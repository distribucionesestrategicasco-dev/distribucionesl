-- ================================================================
-- F-02: cerrar la escritura anónima en `productos`.
--
-- PROBLEMA (CRÍTICO): la política `escritura admin` era FOR ALL sobre
-- el rol `public` con USING (true) y sin WITH CHECK. Como la clave anon
-- va incrustada en el JavaScript del sitio (es pública por diseño),
-- cualquier visitante podía INSERTAR, ACTUALIZAR o BORRAR los 67
-- productos del catálogo sin autenticarse. Verificado antes de aplicar:
-- un INSERT anónimo devolvía 201. El linter lo marcaba como
-- `rls_policy_always_true` ("effectively bypasses row-level security").
--
-- Además el propio panel escribía directo a /rest/v1/productos con esa
-- misma clave, así que no había forma de distinguir al admin del público.
--
-- SOLUCIÓN: eliminar la política de escritura. El rol anon queda solo con
-- `lectura publica` (SELECT), que es la que sirve el catálogo del sitio.
-- Toda la escritura pasa por la Edge Function admin-usuarios con las
-- acciones productos:crear / productos:editar / productos:toggle /
-- productos:eliminar, que exigen sesión válida y el módulo 'catalogo'.
-- El service_role bypasea RLS, así que la Edge Function sigue operando.
--
-- IMPORTANTE: aplicar SOLO después de publicar el frontend que usa las
-- acciones productos:*, o el panel no podrá guardar productos.
--
-- Verificado tras aplicar: INSERT anon → 401 (violación de RLS),
-- UPDATE y DELETE anon → 204 con cero filas afectadas (datos intactos:
-- 67 productos, 0 precios alterados), SELECT anon → 200.
--
-- APLICAR EN: Supabase Dashboard → SQL Editor (o supabase db push)
-- ================================================================

DROP POLICY IF EXISTS "escritura admin" ON productos;

-- Dejar constancia de que la lectura pública es intencional (el catálogo
-- del sitio la necesita) y que no hay política de escritura a propósito.
COMMENT ON TABLE productos IS
  'Catálogo público. RLS: solo SELECT para anon (política "lectura publica"). '
  'La escritura va exclusivamente por la Edge Function admin-usuarios '
  '(acciones productos:*), que exige sesión válida y el módulo catalogo.';
