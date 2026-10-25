-- Lista domicilios activos guardados directamente en un asentamiento que
-- tiene colonias activas.
--
--   psql "$DATABASE_URL" -f scripts/auditar-domicilios-fuera-de-colonia.sql
--
-- Solo lista: decidir si cada domicilio debe guardarse en una colonia o si
-- realmente no pertenece a ninguna requiere criterio humano. Usa una tabla
-- temporal de reporte y no modifica filas persistentes.
--
-- Corre con `DATABASE_URL`, el rol menos privilegiado que puede leer estos
-- datos. Las tablas territoriales fuerzan RLS y sus politicas de tenant son
-- `TO xula_app`; se fija un municipio por vez, con su contexto, igual que la
-- aplicacion. El directorio publico de `ayuntamientos` proporciona las raices.

\set ON_ERROR_STOP on

CREATE TEMP TABLE domicilios_fuera_de_colonia (
  subdominio  text,
  municipio   text,
  calle       text,
  numero      text,
  lugar       text,
  domicilio_id uuid
) ON COMMIT PRESERVE ROWS;

DO $$
DECLARE
  municipio record;
BEGIN
  FOR municipio IN
    SELECT id, subdominio, nombre FROM ayuntamientos ORDER BY subdominio
  LOOP
    -- `set_config(..., true)` equivale a `SET LOCAL`: el tenant no se queda
    -- pegado en la conexion al terminar este municipio.
    PERFORM set_config('app.tenant', municipio.id::text, true);

    INSERT INTO domicilios_fuera_de_colonia
    SELECT
      municipio.subdominio,
      municipio.nombre,
      calle.nombre,
      domicilio.numero,
      lugar.nombre,
      domicilio.id
    FROM domicilios domicilio
    JOIN calles calle ON calle.id = domicilio.calle_id
    JOIN lugares lugar ON lugar.id = domicilio.lugar_id
    WHERE domicilio.baja_en IS NULL
      AND lugar.baja_en IS NULL
      AND lugar.tipo IN ('cabecera', 'comisaria')
      AND EXISTS (
        SELECT 1
        FROM lugares colonia
        WHERE colonia.padre_id = lugar.id
          AND colonia.tipo = 'colonia'
          AND colonia.baja_en IS NULL
      );
  END LOOP;
END $$;

SELECT
  subdominio,
  municipio,
  calle,
  COALESCE(numero, 'sin numero') AS numero,
  lugar,
  domicilio_id
FROM domicilios_fuera_de_colonia
ORDER BY subdominio, lugar, calle, numero, domicilio_id;

SELECT count(*) AS total FROM domicilios_fuera_de_colonia;
