-- Da de baja las calles activas que cuelgan de un lugar que no es
-- asentamiento.
--
--   psql "$DATABASE_URL" -f scripts/baja-calles-fuera-de-asentamiento.sql
--
-- Corre despues de que el catalogo de calles paso a ser del asentamiento
-- (`puedeTenerCatalogoDeCalles`). Una calle colgada de una colonia, un
-- sector o una manzana ya no aparece en ninguna pestana —la del lugar la
-- rechaza, la del asentamiento solo lista las suyas— y `reparentearCalle`
-- no la puede mover porque su destino tiene que ser un asentamiento. La
-- fila quedo inalcanzable por la aplicacion: SQL es el unico camino.
--
-- **Solo toca calles sin ninguna referencia**, y esa es la linea. Una
-- calle en uso —domicilios, reportes o intervenciones apuntando a su id—
-- no se da de baja desde aca: a que calle del asentamiento corresponde lo
-- sabe el municipio, no un script. Esas quedan listadas al final.
--
-- Idempotente: una segunda corrida no encuentra candidatas.
--
-- Falla ruidoso: si las filas dadas de baja no son las contadas, aborta y
-- revierte todo. Un UPDATE frenado por RLS devuelve cero filas SIN error,
-- y sin esa comparacion el script saldria con codigo 0
-- -indistinguible de "no habia nada"-. Mismo criterio que
-- `reparar-raices-huerfanas.sql`.

\set ON_ERROR_STOP on

CREATE TEMP TABLE candidatas (
  calle_id uuid PRIMARY KEY
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE desactivadas (
  subdominio  text,
  lugar_tipo  text,
  lugar       text,
  calle       text,
  calle_id    uuid
) ON COMMIT PRESERVE ROWS;

DO $$
DECLARE
  municipio  record;
  contadas   bigint;
  bajas      bigint;
BEGIN
  FOR municipio IN
    SELECT id, subdominio FROM ayuntamientos ORDER BY subdominio
  LOOP
    -- `set_config(..., true)` es `SET LOCAL`: muere con esta transaccion.
    PERFORM set_config('app.tenant', municipio.id::text, true);

    TRUNCATE candidatas;
    INSERT INTO candidatas (calle_id)
    SELECT c.id
    FROM calles c
    JOIN lugares l ON l.id = c.lugar_id
    WHERE c.baja_en IS NULL
      AND l.tipo NOT IN ('cabecera', 'comisaria')
      AND NOT EXISTS (
        SELECT 1 FROM domicilios d
        WHERE d.calle_id = c.id
           OR d.entre_calle_a_id = c.id
           OR d.entre_calle_b_id = c.id
      )
      AND NOT EXISTS (SELECT 1 FROM reportes r WHERE r.calle_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM intervenciones i WHERE i.calle_id = c.id);

    SELECT count(*) INTO contadas FROM candidatas;

    WITH bajas AS (
      UPDATE calles c
      SET baja_en = now(), actualizado_en = now()
      FROM candidatas k, lugares l
      WHERE c.id = k.calle_id
        AND l.id = c.lugar_id
      RETURNING c.id, l.tipo AS lugar_tipo, l.nombre AS lugar, c.nombre AS calle
    ), anotadas AS (
      -- Mismo verbo que el caso de uso, para que la bitacora se consulte
      -- igual. `actor` nulo porque no hubo usuario; el origen dice que fue
      -- este script y no una pantalla.
      INSERT INTO bitacora (
        ayuntamiento_id, actor, accion, entidad, entidad_id, origen
      )
      SELECT
        municipio.id, NULL, 'BAJA_CALLE', 'calles', b.id,
        'script:baja-calles-fuera-de-asentamiento'
      FROM bajas b
      RETURNING entidad_id
    )
    INSERT INTO desactivadas (subdominio, lugar_tipo, lugar, calle, calle_id)
    SELECT municipio.subdominio, b.lugar_tipo, b.lugar, b.calle, b.id
    FROM bajas b;

    GET DIAGNOSTICS bajas = ROW_COUNT;

    IF bajas <> contadas THEN
      RAISE EXCEPTION
        'En % se contaron % calles fuera de asentamiento y se dieron de '
        'baja %. La transaccion se revierte entera: revisar si RLS freno '
        'el UPDATE.',
        municipio.subdominio, contadas, bajas;
    END IF;
  END LOOP;
END $$;

-- Lo que se dio de baja, con el id de cada fila: revertir es poner
-- `baja_en` en NULL para esos ids.
SELECT subdominio, lugar_tipo, lugar, calle, calle_id
FROM desactivadas
ORDER BY subdominio, lugar, calle;

-- Calles fuera de asentamiento que SI estan en uso: no las toca el script.
SELECT l.tipo AS lugar_tipo, l.nombre AS lugar, c.nombre AS calle,
       c.id AS calle_id,
       (SELECT count(*) FROM domicilios d
         WHERE d.calle_id = c.id
            OR d.entre_calle_a_id = c.id
            OR d.entre_calle_b_id = c.id) AS domicilios,
       (SELECT count(*) FROM reportes r WHERE r.calle_id = c.id) AS reportes,
       (SELECT count(*) FROM intervenciones i WHERE i.calle_id = c.id)
         AS intervenciones
FROM calles c
JOIN lugares l ON l.id = c.lugar_id
WHERE c.baja_en IS NULL
  AND l.tipo NOT IN ('cabecera', 'comisaria')
ORDER BY l.nombre, c.nombre;

SELECT count(*) AS filas_dadas_de_baja FROM desactivadas;
