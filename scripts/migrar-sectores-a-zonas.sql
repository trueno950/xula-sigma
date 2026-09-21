-- Mueve domicilios que cuelgan de sector o manzana a su asentamiento,
-- crea una zona por sector y borra fisicamente sector/manzana.
--
--   psql "$DATABASE_URL" -f scripts/migrar-sectores-a-zonas.sql
--
-- El script se ejecuta con el rol de la conexion. No cambia de rol ni
-- contiene credenciales: el llamador debe entregar DATABASE_URL.
--
-- Corre como xula_app y no como xula_migrator: `politicaTenant()`
-- (shared/tenancy/esquema.ts) escribe cada politica `to: "xula_app"`
-- exclusivamente, y con FORCE ROW LEVEL SECURITY un rol sin politica
-- aplicable no ve ninguna fila -ni siquiera xula_migrator, dueno del
-- schema. xula_app necesita GRANT DELETE en lugares ademas del
-- SELECT/INSERT/UPDATE que ya tenia (drizzle/0007_territorio.sql),
-- agregado en drizzle/0018_grant_baja_lugares.sql: la baja logica sigue
-- siendo la via normal de la aplicacion, este script es la unica salida
-- que borra fisicamente, y sigue acotado por la misma politica de tenant.
--
-- La bitacora se escribe antes del UPDATE/DELETE para conservar el dato que
-- se pierde con el cambio. Si cualquier conteo no coincide, la excepcion
-- revierte toda la transaccion del bloque DO.

\set ON_ERROR_STOP on

CREATE TEMP TABLE candidatas (
  domicilio_id       uuid PRIMARY KEY,
  ayuntamiento_id    uuid NOT NULL,
  lugar_anterior_id  uuid NOT NULL,
  lugar_destino_id   uuid NOT NULL,
  sector_id          uuid,
  calle_id           uuid NOT NULL
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE sectores_a_migrar (
  sector_id        uuid PRIMARY KEY,
  ayuntamiento_id  uuid NOT NULL,
  nombre           text NOT NULL,
  asentamiento_id  uuid
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE domicilios_movidos (
  subdominio         text NOT NULL,
  ayuntamiento_id    uuid NOT NULL,
  domicilio_id       uuid NOT NULL,
  lugar_anterior_id  uuid NOT NULL,
  lugar_destino_id   uuid NOT NULL,
  sector_id          uuid,
  calle_id           uuid NOT NULL,
  PRIMARY KEY (ayuntamiento_id, domicilio_id)
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE lugares_borrados (
  subdominio       text NOT NULL,
  ayuntamiento_id  uuid NOT NULL,
  lugar_id         uuid NOT NULL,
  tipo             text NOT NULL,
  nombre           text NOT NULL,
  padre_id         uuid,
  PRIMARY KEY (ayuntamiento_id, lugar_id)
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE zonas_creadas (
  subdominio       text NOT NULL,
  ayuntamiento_id  uuid NOT NULL,
  sector_id        uuid NOT NULL,
  zona_id          uuid NOT NULL,
  lugar_id         uuid NOT NULL,
  nombre           text NOT NULL,
  PRIMARY KEY (ayuntamiento_id, sector_id)
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE calles_validas (
  ayuntamiento_id  uuid NOT NULL,
  zona_id          uuid NOT NULL,
  calle_id         uuid NOT NULL,
  lugar_id         uuid NOT NULL,
  PRIMARY KEY (zona_id, calle_id)
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE calles_rechazadas (
  subdominio            text NOT NULL,
  ayuntamiento_id       uuid NOT NULL,
  sector_id             uuid NOT NULL,
  zona_id               uuid NOT NULL,
  calle_id              uuid NOT NULL,
  lugar_esperado_id     uuid NOT NULL,
  lugar_real_id         uuid NOT NULL,
  PRIMARY KEY (ayuntamiento_id, zona_id, calle_id)
) ON COMMIT PRESERVE ROWS;

DO $$
DECLARE
  municipio                         record;
  candidatas_contadas               bigint;
  bitacora_insertadas               bigint;
  domicilios_actualizados           bigint;
  sectores_con_asentamiento         bigint;
  zonas_insertadas                  bigint;
  zonas_mapeadas                    bigint;
  calles_validas_contadas           bigint;
  calles_insertadas                 bigint;
  lugares_contados                  bigint;
  lugares_anotados                  bigint;
  manzanas_contadas                 bigint;
  manzanas_borradas                 bigint;
  sectores_contados                 bigint;
  sectores_borrados                 bigint;
BEGIN
  FOR municipio IN
    SELECT id, subdominio FROM ayuntamientos ORDER BY subdominio
  LOOP
    -- `set_config(..., true)` es `SET LOCAL`: muere con esta transaccion.
    PERFORM set_config('app.tenant', municipio.id::text, true);

    TRUNCATE candidatas, sectores_a_migrar, calles_validas;

    -- Un sector vacio tambien necesita su zona. La cadena busca el primer
    -- cabecera o comisaria que encuentre al subir por padre_id.
    INSERT INTO sectores_a_migrar (
      sector_id,
      ayuntamiento_id,
      nombre,
      asentamiento_id
    )
    WITH RECURSIVE cadena_de_sectores AS (
      SELECT
        l.id AS sector_id,
        l.ayuntamiento_id,
        l.id AS lugar_id,
        l.padre_id,
        l.tipo,
        ARRAY[l.id]::uuid[] AS camino,
        0 AS profundidad
      FROM lugares l
      WHERE l.tipo = 'sector'

      UNION ALL

      SELECT
        c.sector_id,
        c.ayuntamiento_id,
        padre.id AS lugar_id,
        padre.padre_id,
        padre.tipo,
        array_append(c.camino, padre.id),
        c.profundidad + 1
      FROM cadena_de_sectores c
      JOIN lugares padre
        ON padre.id = c.padre_id
       AND padre.ayuntamiento_id = c.ayuntamiento_id
      WHERE c.tipo NOT IN ('cabecera', 'comisaria')
        AND NOT padre.id = ANY(c.camino)
    ), asentamientos AS (
      SELECT DISTINCT ON (sector_id)
        sector_id,
        lugar_id AS asentamiento_id
      FROM cadena_de_sectores
      WHERE tipo IN ('cabecera', 'comisaria')
      ORDER BY sector_id, profundidad
    )
    SELECT
      l.id,
      l.ayuntamiento_id,
      l.nombre,
      a.asentamiento_id
    FROM lugares l
    LEFT JOIN asentamientos a ON a.sector_id = l.id
    WHERE l.tipo = 'sector';

    IF EXISTS (
      SELECT 1
      FROM sectores_a_migrar
      WHERE asentamiento_id IS NULL
    ) THEN
      RAISE EXCEPTION
        'En % el sector % no tiene antecesor asentamiento. '
        'La transaccion se revierte.',
        municipio.subdominio,
        (SELECT sector_id
         FROM sectores_a_migrar
         WHERE asentamiento_id IS NULL
         LIMIT 1);
    END IF;

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
    ), sectores_por_domicilio AS (
      SELECT DISTINCT ON (domicilio_id)
        domicilio_id,
        lugar_id AS sector_id
      FROM lugares_hacia_arriba
      WHERE tipo = 'sector'
      ORDER BY domicilio_id, profundidad
    )
    INSERT INTO candidatas (
      domicilio_id,
      ayuntamiento_id,
      lugar_anterior_id,
      lugar_destino_id,
      sector_id,
      calle_id
    )
    SELECT
      d.id,
      d.ayuntamiento_id,
      d.lugar_id,
      destinos.lugar_destino_id,
      sectores_por_domicilio.sector_id,
      d.calle_id
    FROM destinos
    JOIN domicilios d
      ON d.id = destinos.domicilio_id
     AND d.ayuntamiento_id = destinos.ayuntamiento_id
    LEFT JOIN sectores_por_domicilio
      ON sectores_por_domicilio.domicilio_id = d.id
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

    INSERT INTO domicilios_movidos (
      subdominio,
      ayuntamiento_id,
      domicilio_id,
      lugar_anterior_id,
      lugar_destino_id,
      sector_id,
      calle_id
    )
    SELECT
      municipio.subdominio,
      c.ayuntamiento_id,
      c.domicilio_id,
      c.lugar_anterior_id,
      c.lugar_destino_id,
      c.sector_id,
      c.calle_id
    FROM candidatas c;

    SELECT count(*)
    INTO sectores_con_asentamiento
    FROM sectores_a_migrar
    WHERE asentamiento_id IS NOT NULL;

    INSERT INTO zonas (ayuntamiento_id, lugar_id, nombre)
    SELECT ayuntamiento_id, asentamiento_id, nombre
    FROM sectores_a_migrar
    WHERE asentamiento_id IS NOT NULL;

    GET DIAGNOSTICS zonas_insertadas = ROW_COUNT;

    IF zonas_insertadas <> sectores_con_asentamiento THEN
      RAISE EXCEPTION
        'En % se contaron % sectores con asentamiento y se crearon % zonas. '
        'La transaccion se revierte entera.',
        municipio.subdominio, sectores_con_asentamiento, zonas_insertadas;
    END IF;

    INSERT INTO zonas_creadas (
      subdominio,
      ayuntamiento_id,
      sector_id,
      zona_id,
      lugar_id,
      nombre
    )
    SELECT
      municipio.subdominio,
      s.ayuntamiento_id,
      s.sector_id,
      z.id,
      z.lugar_id,
      z.nombre
    FROM sectores_a_migrar s
    JOIN zonas z
      ON z.ayuntamiento_id = s.ayuntamiento_id
     AND z.lugar_id = s.asentamiento_id
     AND z.nombre = s.nombre
     AND z.baja_en IS NULL
    WHERE s.asentamiento_id IS NOT NULL;

    GET DIAGNOSTICS zonas_mapeadas = ROW_COUNT;

    IF zonas_mapeadas <> sectores_con_asentamiento THEN
      RAISE EXCEPTION
        'En % se crearon % zonas y se mapearon % a sectores. '
        'La transaccion se revierte entera.',
        municipio.subdominio, zonas_insertadas, zonas_mapeadas;
    END IF;

    -- La FK recibe el lugar_id real de la calle. Los domicilios con una
    -- calle de otro asentamiento se listan, nunca se fuerzan al destino.
    INSERT INTO calles_validas (
      ayuntamiento_id,
      zona_id,
      calle_id,
      lugar_id
    )
    SELECT DISTINCT
      c.ayuntamiento_id,
      z.zona_id,
      c.calle_id,
      z.lugar_id
    FROM candidatas c
    JOIN zonas_creadas z
      ON z.ayuntamiento_id = c.ayuntamiento_id
     AND z.sector_id = c.sector_id
    JOIN calles calle
      ON calle.id = c.calle_id
     AND calle.ayuntamiento_id = c.ayuntamiento_id
    WHERE c.sector_id IS NOT NULL
      AND calle.lugar_id = z.lugar_id;

    INSERT INTO calles_rechazadas (
      subdominio,
      ayuntamiento_id,
      sector_id,
      zona_id,
      calle_id,
      lugar_esperado_id,
      lugar_real_id
    )
    SELECT DISTINCT
      municipio.subdominio,
      c.ayuntamiento_id,
      c.sector_id,
      z.zona_id,
      c.calle_id,
      z.lugar_id,
      calle.lugar_id
    FROM candidatas c
    JOIN zonas_creadas z
      ON z.ayuntamiento_id = c.ayuntamiento_id
     AND z.sector_id = c.sector_id
    JOIN calles calle
      ON calle.id = c.calle_id
     AND calle.ayuntamiento_id = c.ayuntamiento_id
    WHERE c.sector_id IS NOT NULL
      AND calle.lugar_id <> z.lugar_id;

    SELECT count(*)
    INTO calles_validas_contadas
    FROM calles_validas;

    INSERT INTO calles_de_zonas (
      zona_id,
      calle_id,
      ayuntamiento_id,
      lugar_id
    )
    SELECT zona_id, calle_id, ayuntamiento_id, lugar_id
    FROM calles_validas;

    GET DIAGNOSTICS calles_insertadas = ROW_COUNT;

    IF calles_insertadas <> calles_validas_contadas THEN
      RAISE EXCEPTION
        'En % se contaron % pertenencias validas y se insertaron %. '
        'La transaccion se revierte entera: revisar si RLS freno el INSERT.',
        municipio.subdominio, calles_validas_contadas, calles_insertadas;
    END IF;

    INSERT INTO lugares_borrados (
      subdominio,
      ayuntamiento_id,
      lugar_id,
      tipo,
      nombre,
      padre_id
    )
    SELECT
      municipio.subdominio,
      l.ayuntamiento_id,
      l.id,
      l.tipo,
      l.nombre,
      l.padre_id
    FROM lugares l
    WHERE l.tipo IN ('sector', 'manzana');

    SELECT count(*)
    INTO lugares_contados
    FROM lugares_borrados
    WHERE ayuntamiento_id = municipio.id;

    INSERT INTO bitacora (
      ayuntamiento_id,
      actor,
      accion,
      entidad,
      entidad_id,
      origen
    )
    SELECT
      b.ayuntamiento_id,
      NULL,
      'BAJA_LUGAR',
      'lugares',
      b.lugar_id,
      'script:migrar-sectores-a-zonas:' || b.padre_id::text
    FROM lugares_borrados b
    WHERE b.ayuntamiento_id = municipio.id;

    GET DIAGNOSTICS lugares_anotados = ROW_COUNT;

    IF lugares_anotados <> lugares_contados THEN
      RAISE EXCEPTION
        'En % se contaron % lugares y se anotaron % bajas. '
        'La transaccion se revierte entera.',
        municipio.subdominio, lugares_contados, lugares_anotados;
    END IF;

    SELECT count(*)
    INTO manzanas_contadas
    FROM lugares_borrados
    WHERE ayuntamiento_id = municipio.id
      AND tipo = 'manzana';

    DELETE FROM lugares l
    USING lugares_borrados b
    WHERE l.id = b.lugar_id
      AND l.ayuntamiento_id = b.ayuntamiento_id
      AND b.ayuntamiento_id = municipio.id
      AND b.tipo = 'manzana';

    GET DIAGNOSTICS manzanas_borradas = ROW_COUNT;

    IF manzanas_borradas <> manzanas_contadas THEN
      RAISE EXCEPTION
        'En % se contaron % manzanas y se borraron %. '
        'La transaccion se revierte entera.',
        municipio.subdominio, manzanas_contadas, manzanas_borradas;
    END IF;

    SELECT count(*)
    INTO sectores_contados
    FROM lugares_borrados
    WHERE ayuntamiento_id = municipio.id
      AND tipo = 'sector';

    DELETE FROM lugares l
    USING lugares_borrados b
    WHERE l.id = b.lugar_id
      AND l.ayuntamiento_id = b.ayuntamiento_id
      AND b.ayuntamiento_id = municipio.id
      AND b.tipo = 'sector';

    GET DIAGNOSTICS sectores_borrados = ROW_COUNT;

    IF sectores_borrados <> sectores_contados THEN
      RAISE EXCEPTION
        'En % se contaron % sectores y se borraron %. '
        'La transaccion se revierte entera.',
        municipio.subdominio, sectores_contados, sectores_borrados;
    END IF;
  END LOOP;
END $$;

-- Domicilios movidos, incluyendo el lugar_id anterior y el sector origen.
SELECT subdominio, domicilio_id, lugar_anterior_id, lugar_destino_id,
       sector_id, calle_id
FROM domicilios_movidos
ORDER BY subdominio, domicilio_id;

-- Filas de lugares borradas: guardar este resultado para reconstruirlas.
SELECT subdominio, lugar_id, tipo, nombre, padre_id
FROM lugares_borrados
ORDER BY subdominio, tipo, nombre, lugar_id;

-- Zonas creadas y su sector de origen.
SELECT subdominio, sector_id, zona_id, lugar_id, nombre
FROM zonas_creadas
ORDER BY subdominio, nombre, zona_id;

-- Siempre devuelve la cantidad, incluso cuando no hay rechazos.
SELECT 'calles_rechazadas' AS salida, count(*) AS cantidad
FROM calles_rechazadas;

SELECT 'calles_rechazadas' AS salida,
       subdominio,
       sector_id,
       zona_id,
       calle_id,
       lugar_esperado_id,
       lugar_real_id
FROM calles_rechazadas
ORDER BY subdominio, sector_id, calle_id;
