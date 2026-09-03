-- Le da padre a los lugares DE BAJA que quedaron colgados de la nada.
--
--   psql "$DATABASE_URL" -f scripts/reparar-raices-huerfanas.sql
--
-- Corre despues de `auditar-raices.sql`, que es el que los encuentra. Lee
-- ese archivo primero: ahi esta por que no existe la consulta cross-tenant
-- y por que el barrido usa el rol menos privilegiado. Este script hereda
-- las dos cosas.
--
-- **Solo toca filas con `baja_en` no nulo, y esa es la linea.** Una fila de
-- baja es inalcanzable por toda ruta de la aplicacion —
-- `repositorioDeLugaresSql` filtra `isNull(bajaEn)` en `buscarPorId`,
-- `listarRaices`, `listarLugares` y los hijos del subarbol—, asi que
-- `reparentearLugar` sobre una de ellas tira `NoEncontradoError` y el
-- operador no tiene forma de corregirla nunca. SQL es el unico camino.
--
-- Un huerfano ACTIVO no se toca aca: se ve en `/territorio` marcado, se
-- mueve desde Editar -> Mover, y cual es su padre real lo sabe el municipio
-- y no un script. Elegirle uno "cualquiera" seria inventar territorio.
--
-- El padre que asigna es el asentamiento del municipio: la cabecera si
-- existe, si no la primera comisaria activa. Cualquiera de los dos sirve
-- para cualquier huerfano, porque el rango 0 precede a los tres tipos
-- restantes (`domain/tipoDeLugar.ts`). No se elige por criterio territorial
-- —no lo hay para un dato muerto—, se elige por ser el unico valido.
--
-- Idempotente: una segunda corrida no encuentra nada porque ya no hay
-- filas con `padre_id IS NULL` que no sean rango 0.
--
-- Falla ruidoso: si en algun municipio las filas reparadas no son las que
-- se contaron, aborta y revierte TODO -el `DO` es una sola transaccion-.
-- Un barrido a medias es peor que uno que no corrio, porque el que lo mira
-- no sabe cual mitad quedo.
--
-- Y ese aborto tiene que llegarle a quien lo corre: un `RAISE EXCEPTION`
-- dentro del `DO` no alcanza solo. Sin `ON_ERROR_STOP`, `psql -f` imprime
-- el error, sigue con la proxima sentencia del archivo y sale con codigo
-- 0 -medido con un `DO` que revienta a proposito-. Un script que falla
-- ruidoso adentro y silencioso hacia afuera es el mismo defecto que las
-- filas frenadas por RLS, una capa mas arriba.

\set ON_ERROR_STOP on

CREATE TEMP TABLE reparaciones (
  subdominio text,
  lugar_id   uuid,
  tipo       text,
  nombre     text,
  padre_id   uuid
) ON COMMIT PRESERVE ROWS;

DO $$
DECLARE
  municipio record;
  asentamiento uuid;
  candidatos bigint;
  reparados bigint;
BEGIN
  FOR municipio IN
    SELECT id, subdominio FROM ayuntamientos ORDER BY subdominio
  LOOP
    -- `set_config(..., true)` es `SET LOCAL`: muere con esta transaccion.
    PERFORM set_config('app.tenant', municipio.id::text, true);

    SELECT id INTO asentamiento
    FROM lugares
    WHERE padre_id IS NULL
      AND baja_en IS NULL
      AND tipo IN ('cabecera', 'comisaria')
    ORDER BY (tipo = 'cabecera') DESC, nombre
    LIMIT 1;

    -- Un municipio sin cabecera ni comisaria activa no tiene padre valido
    -- que ofrecer. Se saltea en silencio y sus huerfanos siguen listados
    -- por el barrido: es un municipio a medio cargar, no un error de este
    -- script.
    IF asentamiento IS NULL THEN
      CONTINUE;
    END IF;

    -- Se cuentan antes de escribir y se compara despues. Un UPDATE frenado
    -- por RLS devuelve cero filas SIN error: sin esta comparacion el script
    -- imprimiria `filas_reparadas = 0` y saldria con codigo 0, que es
    -- indistinguible de "no habia nada que reparar". La regla de scripts de
    -- AGENTS.md pide exactamente esto.
    SELECT count(*) INTO candidatos
    FROM lugares
    WHERE padre_id IS NULL
      AND baja_en IS NOT NULL
      AND tipo NOT IN ('cabecera', 'comisaria');

    WITH movidos AS (
      UPDATE lugares
      SET padre_id = asentamiento, actualizado_en = now()
      WHERE padre_id IS NULL
        AND baja_en IS NOT NULL
        AND tipo NOT IN ('cabecera', 'comisaria')
      RETURNING id, tipo, nombre, padre_id
    ), anotados AS (
      -- Mismo verbo que usa el caso de uso, para que la bitacora se
      -- consulte igual. `actor` nulo porque no hubo usuario; el origen dice
      -- que fue este script y no una pantalla.
      INSERT INTO bitacora (
        ayuntamiento_id, actor, accion, entidad, entidad_id, origen
      )
      SELECT
        municipio.id, NULL, 'REPARENTEAR_LUGAR', 'lugares', m.id,
        'script:reparar-raices-huerfanas'
      FROM movidos m
      RETURNING entidad_id
    )
    INSERT INTO reparaciones
    SELECT municipio.subdominio, m.id, m.tipo, m.nombre, m.padre_id
    FROM movidos m;

    GET DIAGNOSTICS reparados = ROW_COUNT;

    IF reparados <> candidatos THEN
      RAISE EXCEPTION
        'En % se contaron % huerfanos de baja y se repararon %. La '
        'transaccion se revierte entera: revisar si RLS freno el UPDATE.',
        municipio.subdominio, candidatos, reparados;
    END IF;
  END LOOP;
END $$;

-- Lo que se movio, con el id de cada fila: revertir es poner `padre_id` en
-- NULL para esos ids.
SELECT subdominio, tipo, nombre, lugar_id, padre_id
FROM reparaciones
ORDER BY subdominio, tipo, nombre;

SELECT count(*) AS filas_reparadas FROM reparaciones;
