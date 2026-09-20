-- Mueve domicilios que cuelgan de sector o manzana a su asentamiento.
--
--   psql "$DATABASE_URL" -f scripts/migrar-sectores-a-zonas.sql
--
-- El script se ejecuta con el rol de la conexion. No cambia de rol ni
-- contiene credenciales: el llamador debe entregar DATABASE_URL.
--
-- La bitacora se escribe antes del UPDATE para conservar el lugar_id que
-- tenia cada domicilio antes de la migracion. Si cualquier conteo no
-- coincide, la excepcion revierte toda la transaccion del bloque DO.

\set ON_ERROR_STOP on

CREATE TEMP TABLE candidatas (
  domicilio_id       uuid PRIMARY KEY,
  ayuntamiento_id    uuid NOT NULL,
  lugar_anterior_id  uuid NOT NULL,
  lugar_destino_id   uuid NOT NULL
) ON COMMIT PRESERVE ROWS;

DO $$
DECLARE
  municipio              record;
  candidatas_contadas    bigint;
  bitacora_insertadas    bigint;
  domicilios_actualizados bigint;
BEGIN
  FOR municipio IN
    SELECT id, subdominio FROM ayuntamientos ORDER BY subdominio
  LOOP
    -- `set_config(..., true)` es `SET LOCAL`: muere con esta transaccion.
    PERFORM set_config('app.tenant', municipio.id::text, true);

    TRUNCATE candidatas;

    WITH RECURSIVE lugares_hacia_arriba AS (
      SELECT
        d.id AS domicilio_id,
        d.ayuntamiento_id,
        d.lugar_id,
        l.padre_id,
        l.tipo,
        ARRAY[l.id]::uuid[] AS camino,
        0 AS profundidad
      FROM domicilios d
      JOIN lugares l
        ON l.id = d.lugar_id
       AND l.ayuntamiento_id = d.ayuntamiento_id
      WHERE l.tipo IN ('sector', 'manzana')

      UNION ALL

      SELECT
        h.domicilio_id,
        h.ayuntamiento_id,
        padre.id AS lugar_id,
        padre.padre_id,
        padre.tipo,
        array_append(h.camino, padre.id),
        h.profundidad + 1
      FROM lugares_hacia_arriba h
      JOIN lugares padre
        ON padre.id = h.padre_id
       AND padre.ayuntamiento_id = h.ayuntamiento_id
      WHERE h.tipo IN ('sector', 'manzana')
        AND NOT padre.id = ANY(h.camino)
    ), destinos AS (
      SELECT DISTINCT ON (domicilio_id)
        domicilio_id,
        ayuntamiento_id,
        lugar_id AS lugar_destino_id,
        profundidad
      FROM lugares_hacia_arriba
      WHERE tipo IN ('cabecera', 'comisaria', 'colonia')
      ORDER BY domicilio_id, profundidad
    )
    INSERT INTO candidatas (
      domicilio_id,
      ayuntamiento_id,
      lugar_anterior_id,
      lugar_destino_id
    )
    SELECT
      d.id,
      d.ayuntamiento_id,
      d.lugar_id,
      destinos.lugar_destino_id
    FROM destinos
    JOIN domicilios d
      ON d.id = destinos.domicilio_id
     AND d.ayuntamiento_id = destinos.ayuntamiento_id
    WHERE d.lugar_id <> destinos.lugar_destino_id;

    SELECT count(*) INTO candidatas_contadas FROM candidatas;

    INSERT INTO bitacora (
      ayuntamiento_id,
      actor,
      accion,
      entidad,
      entidad_id,
      origen
    )
    SELECT
      c.ayuntamiento_id,
      NULL,
      'MIGRACION_DOMICILIO',
      'domicilios',
      c.domicilio_id,
      'script:migrar-sectores-a-zonas:' || c.lugar_anterior_id::text
    FROM candidatas c;

    GET DIAGNOSTICS bitacora_insertadas = ROW_COUNT;

    IF bitacora_insertadas <> candidatas_contadas THEN
      RAISE EXCEPTION
        'En % se contaron % domicilios y se anotaron % en bitacora. '
        'La transaccion se revierte entera.',
        municipio.subdominio, candidatas_contadas, bitacora_insertadas;
    END IF;

    UPDATE domicilios d
    SET lugar_id = c.lugar_destino_id
    FROM candidatas c
    WHERE d.id = c.domicilio_id
      AND d.ayuntamiento_id = c.ayuntamiento_id
      AND d.lugar_id = c.lugar_anterior_id;

    GET DIAGNOSTICS domicilios_actualizados = ROW_COUNT;

    IF domicilios_actualizados <> candidatas_contadas THEN
      RAISE EXCEPTION
        'En % se contaron % domicilios y se actualizaron %. La '
        'transaccion se revierte entera: revisar si RLS freno el UPDATE.',
        municipio.subdominio, candidatas_contadas, domicilios_actualizados;
    END IF;
  END LOOP;
END $$;
