-- ================================================================
-- Confirmacion de lectura de las cotizaciones enviadas por correo.
--
-- PROBLEMA: al enviar una cotizacion no habia forma de saber si el
-- cliente la vio. La tabla `notificaciones` solo decia que el correo
-- habia salido, no que alguien lo hubiera abierto, asi que el
-- seguimiento telefonico se hacia a ciegas.
--
-- SOLUCION: cada correo de cotizacion sale con un token unico. El
-- token viaja en dos sitios: un pixel invisible del cuerpo y el
-- enlace "Autorizar" que ya llevaba el correo. Cuando el cliente
-- abre el correo (carga las imagenes) o entra al seguimiento, la
-- Edge Function publica `correo-abierto` marca la fila.
--
-- El acuse de lectura real (cabecera Disposition-Notification-To) no
-- es posible: los correos salen por el Apps Script de la cuenta de la
-- empresa, que usa MailApp y no admite cabeceras propias, y el
-- remitente es un Gmail gratuito (esa funcion es solo de Workspace).
--
-- OJO al interpretarlo: el pixel solo prueba lo positivo. Si el
-- cliente bloquea imagenes no se registra nada aunque lo haya leido,
-- y algunos proveedores (Apple Mail Privacy Protection) precargan las
-- imagenes al recibir, lo que marca abierto sin que nadie lo lea. El
-- clic en el enlace, en cambio, es senal fiable.
-- ================================================================

ALTER TABLE notificaciones
  ADD COLUMN IF NOT EXISTS token              uuid,
  ADD COLUMN IF NOT EXISTS abierto_en         timestamptz,
  ADD COLUMN IF NOT EXISTS ultima_apertura_en timestamptz,
  ADD COLUMN IF NOT EXISTS aperturas          int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enlace_abierto_en  timestamptz,
  ADD COLUMN IF NOT EXISTS enlace_clics       int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cliente_agente     text;

COMMENT ON COLUMN notificaciones.token              IS 'Token de rastreo del correo. NULL = envio sin confirmacion de lectura.';
COMMENT ON COLUMN notificaciones.abierto_en         IS 'Primera apertura registrada por el pixel.';
COMMENT ON COLUMN notificaciones.ultima_apertura_en IS 'Ultima apertura registrada por el pixel.';
COMMENT ON COLUMN notificaciones.aperturas          IS 'Veces que se cargo el pixel. Los proveedores cachean, asi que es un minimo.';
COMMENT ON COLUMN notificaciones.enlace_abierto_en  IS 'Primera vez que se abrio el enlace de seguimiento del correo. Senal fiable.';
COMMENT ON COLUMN notificaciones.cliente_agente     IS 'User-Agent de la primera apertura. Sirve para reconocer precargas del proveedor.';

-- El token es la clave de busqueda del endpoint publico, y no puede
-- repetirse entre envios. Parcial: los envios sin rastreo son NULL.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notificaciones_token
  ON notificaciones (token) WHERE token IS NOT NULL;

-- Un solo UPDATE atomico: el contador se incrementa en la base, no
-- leyendo y volviendo a escribir desde la funcion (dos aperturas
-- simultaneas se pisarian). Devuelve si el token existia.
CREATE OR REPLACE FUNCTION registrar_apertura_correo(
  p_token  uuid,
  p_tipo   text DEFAULT 'pixel',
  p_agente text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_filas int;
BEGIN
  IF p_tipo = 'enlace' THEN
    UPDATE notificaciones SET
      enlace_abierto_en = COALESCE(enlace_abierto_en, now()),
      enlace_clics      = enlace_clics + 1
    WHERE token = p_token;
  ELSE
    UPDATE notificaciones SET
      abierto_en         = COALESCE(abierto_en, now()),
      ultima_apertura_en = now(),
      aperturas          = aperturas + 1,
      cliente_agente     = COALESCE(cliente_agente, left(p_agente, 300))
    WHERE token = p_token;
  END IF;

  GET DIAGNOSTICS v_filas = ROW_COUNT;
  RETURN v_filas > 0;
END;
$$;

COMMENT ON FUNCTION registrar_apertura_correo(uuid, text, text)
  IS 'Marca la apertura de un correo rastreado. La llama la Edge Function publica correo-abierto.';

-- La tabla no tiene politicas (solo entra el service_role) y esta
-- funcion es SECURITY DEFINER: hay que cerrarla a cal y canto para
-- que el anon key no pueda invocarla a lo bruto desde el navegador.
REVOKE ALL ON FUNCTION registrar_apertura_correo(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION registrar_apertura_correo(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION registrar_apertura_correo(uuid, text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION registrar_apertura_correo(uuid, text, text) TO service_role;
