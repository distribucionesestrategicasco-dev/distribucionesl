-- ================================================================
-- #7 Storage: asegurar buckets `entregados` y `productos`.
--
-- PROBLEMA:
--   - `entregados` (PDFs de entrega con datos del cliente) era PÚBLICO y
--     con acceso TOTAL para anon (SELECT/INSERT/UPDATE/DELETE): cualquiera
--     podía enumerar y descargar todos los soportes (PII), subir archivos
--     arbitrarios y BORRAR documentos legítimos.
--   - `productos` permitía INSERT/UPDATE anónimos (defacement de imágenes)
--     y listado público.
--
-- SOLUCIÓN:
--   - `entregados` → privado, sin políticas anon. Todo el acceso (listar,
--     subir, borrar, ver con URL firmada) pasa por la Edge Function
--     admin-usuarios (service_role), que exige sesión válida.
--   - `productos` → se mantiene la LECTURA pública (bucket public=true; las
--     URLs /object/public/ siguen sirviendo las imágenes del catálogo),
--     pero se quitan la escritura y el listado anónimos. La subida de
--     imágenes del catálogo pasa por la Edge Function.
--
-- IMPORTANTE: aplicar junto con el frontend que usa las acciones storage:*
-- de la Edge Function, o el panel no podrá subir/ver/borrar soportes.
--
-- APLICAR EN: Supabase Dashboard → SQL Editor (o supabase db push)
-- ================================================================

UPDATE storage.buckets SET public = false WHERE id = 'entregados';

DROP POLICY IF EXISTS "allow anon all t65xu8_0" ON storage.objects;  -- SELECT entregados
DROP POLICY IF EXISTS "allow anon all t65xu8_1" ON storage.objects;  -- INSERT entregados
DROP POLICY IF EXISTS "allow anon all t65xu8_2" ON storage.objects;  -- UPDATE entregados
DROP POLICY IF EXISTS "allow anon all t65xu8_3" ON storage.objects;  -- DELETE entregados

DROP POLICY IF EXISTS "productos insert anon"   ON storage.objects;
DROP POLICY IF EXISTS "productos update anon"   ON storage.objects;
DROP POLICY IF EXISTS "productos select public" ON storage.objects;
