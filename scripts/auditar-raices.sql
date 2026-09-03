-- Lista los lugares que violan el MUST de raiz de `jerarquia-territorial`.
--
--   psql "$DATABASE_URL" -f scripts/auditar-raices.sql
--
-- El spec dice: "Una fila de tipo `cabecera` o `comisaria` MUST tener
-- `padreId IS NULL`; ningun otro tipo MUST tener `padreId NULL`". Es una
-- bicondicional sobre una sola fila, asi que se detecta con una condicion y
-- sin recorrer el arbol.
--
-- Hasta el cambio que introdujo `RaizInvalidaError`, `altaDeLugar` y
-- `reparentearLugar` validaban la jerarquia solo cuando habia padre: con
-- `padreId NULL` aceptaban cualquier tipo. Este barrido existe para las
-- filas que quedaron de esa epoca. El codigo ya no las crea.
--
-- **Corre con `DATABASE_URL`, el rol menos privilegiado**, y no con el de
-- migraciones. No es una preferencia: `lugares` tiene FORCE ROW LEVEL
-- SECURITY y su unica politica es `TO xula_app` contra `app.tenant`.
-- Ningun rol del sistema tiene BYPASSRLS -ni el dueno de la tabla-, asi que
-- una consulta sin tenant no ve una sola fila. La forma de barrer todos los
-- municipios es la misma que usa la aplicacion: uno por vez, con su tenant
-- puesto. El aislamiento no tiene puerta de servicio, y este script no la
-- abre.
--
-- La lista de municipios sale de `ayuntamientos_directorio_publico`, la
-- politica que ya permite ese SELECT sin tenant (misma que usa
-- `resolverAyuntamientoPorSubdominio`).

\set ON_ERROR_STOP on

CREATE TEMP TABLE hallazgos_de_raiz (
  subdominio  text,
  municipio   text,
  lugar_id    uuid,
  tipo        text,
  nombre      text,
  padre_id    uuid,
  activo      boolean,
  problema    text
) ON COMMIT PRESERVE ROWS;

DO $$
DECLARE
  municipio record;
BEGIN
  FOR municipio IN
    SELECT id, subdominio, nombre FROM ayuntamientos ORDER BY subdominio
  LOOP
    -- `set_config(..., true)` es `SET LOCAL`: muere con la transaccion de
    -- este bloque. Sin `LOCAL` se quedaria pegado en el pooler y lo
    -- heredaria la siguiente consulta, que es la fuga que el invariante 1
    -- existe para impedir.
    PERFORM set_config('app.tenant', municipio.id::text, true);

    INSERT INTO hallazgos_de_raiz
    SELECT
      municipio.subdominio,
      municipio.nombre,
      l.id,
      l.tipo,
      l.nombre,
      l.padre_id,
      l.baja_en IS NULL,
      CASE
        WHEN l.padre_id IS NULL
          THEN 'sin padre y no es cabecera ni comisaria'
        ELSE 'es cabecera o comisaria y cuelga de otro lugar'
      END
    FROM lugares l
    WHERE (l.tipo IN ('cabecera', 'comisaria')) <> (l.padre_id IS NULL);
  END LOOP;
END $$;

-- Los activos son los que el operador ve y puede corregir desde Territorio
-- (Editar -> Mover). Los de baja siguen listados a proposito: no molestan a
-- nadie hoy, pero cuentan para el CHECK que cierre esto en el esquema, que
-- no se puede validar mientras exista una sola fila que lo viole.
SELECT
  subdominio,
  municipio,
  tipo,
  nombre,
  problema,
  CASE WHEN activo THEN 'activo' ELSE 'de baja' END AS estado,
  lugar_id
FROM hallazgos_de_raiz
ORDER BY subdominio, activo DESC, tipo, nombre;

SELECT
  count(*) FILTER (WHERE activo)       AS activos,
  count(*) FILTER (WHERE NOT activo)   AS de_baja,
  count(*)                             AS total
FROM hallazgos_de_raiz;
