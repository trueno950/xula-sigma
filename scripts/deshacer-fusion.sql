-- Deshace la fusion de una persona del padron: la devuelve a existir por
-- separado y recolapsa su subarbol de fusiones directas.
--
--   psql "$DATABASE_URL" -v tenant=<uuid> -v persona=<uuid> \
--     -f scripts/deshacer-fusion.sql
--
-- Es la via de operacion que reemplaza a `revertirFusion` (padron), retirada
-- del codigo: deshacer una fusion pasa pocas veces al ano, y una conexion
-- mas con el tenant puesto es superficie que queda abierta siempre. Ver
-- `AGENTS.md`, seccion `scripts/*.sql`.
--
-- Corre con el rol de la conexion, que debe ser el de aplicacion: `personas`
-- tiene FORCE ROW LEVEL SECURITY y su unica politica es `personas_tenant`
-- (`TO xula_app`, contra `app.tenant`), asi que ningun otro rol ve la fila.
-- El limite lo sigue poniendo la politica: una persona de otro municipio no
-- entra al UPDATE y el conteo de abajo lo convierte en un aborto ruidoso, no
-- en un exito fantasma.
--
-- Que hace:
--
--   1. Devuelve a la persona a existir por separado: `fusionada_en` y
--      `fusionada_directo_en` a NULL, SOLO si estaba fusionada.
--   2. Recolapsa TODO el subarbol de fusiones directas bajo esa persona, no
--      solo los hijos inmediatos, para que cada descendiente vuelva a
--      apuntar a su destino directo en vez de al terminal que dejo de serlo.
--
-- Que NO hace:
--
--   - No borra ni da de baja a nadie: `baja_en` no se toca.
--   - No deshace las fusiones por encima de la persona indicada. Deshace un
--     salto, el de esa persona; su ganadora sigue siendo la ganadora de lo
--     que no cuelga de ella.
--   - No reapunta a quien ya guardo el `persona_id` ganador (domicilios,
--     constancias, reportes). Esos siguen apuntando al ganador: la reversion
--     devuelve a la persona al padron, no reescribe el historial.
--   - No escribe bitacora. La entrada `REVERTIR_FUSION` que dejaba el caso
--     de uso no se reproduce porque no hay sesion ni actor que la origine;
--     el registro de la operacion va en el ticket que la pide. `bitacora`
--     solo tiene GRANT de SELECT e INSERT para `xula_app`, y una fila con
--     actor inventado seria peor que la ausencia.
--
-- Los dos parametros entran por `-v` y no hardcodeados: el script no decide
-- de que municipio es la persona. Un parametro olvidado no escribe nada, y
-- falla ruidosamente por dos vias distintas: psql no sustituye una variable
-- sin definir -manda el literal `:'tenant'` y Postgres responde error de
-- sintaxis antes del primer UPDATE-, y con un tenant que no es el de la
-- persona la politica deja pasar cero filas, que es el aborto del conteo.

\set ON_ERROR_STOP on

BEGIN;

-- `SET LOCAL`, nunca `SET` suelto: la variable muere en el COMMIT y no la
-- hereda el proximo request de la conexion. `:'tenant'` si se sustituye aca
-- porque no esta adentro de una cadena con comillas de dolar; `persona` se
-- pasa por `set_config` porque adentro del bloque `DO $$...$$` psql no
-- sustituye nada.
SET LOCAL app.tenant = :'tenant';
SELECT set_config('reversion.persona', :'persona', true);

DO $$
DECLARE
  filas integer;
BEGIN
  /*
   * `fusionada_en IS NOT NULL` no es adorno: sin esa condicion, revertir a
   * alguien que nunca fue fusionado -su `fusionada_en` ya es NULL- afecta la
   * fila igual (fijar NULL sobre NULL cuenta como fila tocada) y el
   * operador creeria que revirtio algo que nunca paso.
   */
  UPDATE personas
     SET fusionada_en = NULL,
         fusionada_directo_en = NULL
   WHERE id = current_setting('reversion.persona')::uuid
     AND fusionada_en IS NOT NULL;

  /*
   * Contar es obligatorio. Un UPDATE que RLS no deja pasar no lanza error:
   * devuelve cero filas, y sin este conteo el script terminaria diciendo que
   * salio bien sin haber tocado nada. Mas de una tampoco puede pasar -`id`
   * es la clave primaria-, y se comprueba igual porque el invariante es el
   * conteo, no el esquema de hoy.
   */
  GET DIAGNOSTICS filas = ROW_COUNT;

  IF filas <> 1 THEN
    RAISE EXCEPTION
      'No se deshizo ninguna fusion: se esperaba 1 persona fusionada con ese id en ese municipio y se afectaron %. Nada se escribio.',
      filas;
  END IF;

  /*
   * El arbol lo arma `fusionada_directo_en`, no `fusionada_en`: la columna
   * ya colapsada no distingue un descendiente real de otra persona fusionada
   * aparte hacia el mismo terminal. En una cadena A->B->C->D, revertir C
   * reengancha a B, pero A -que llego a D a traves de B y C, con
   * `fusionada_directo_en = B`- quedaria con `fusionada_en = D`, un terminal
   * que dejo de serlo en el momento en que C volvio a existir por separado.
   * La recursion lo devuelve a C.
   */
  WITH RECURSIVE subarbol AS (
    SELECT id
      FROM personas
     WHERE fusionada_directo_en = current_setting('reversion.persona')::uuid
    UNION ALL
    SELECT p.id
      FROM personas p
      JOIN subarbol s ON p.fusionada_directo_en = s.id
  )
  UPDATE personas
     SET fusionada_en = current_setting('reversion.persona')::uuid
   WHERE id IN (SELECT id FROM subarbol);

  GET DIAGNOSTICS filas = ROW_COUNT;

  RAISE NOTICE
    'Fusion deshecha: % persona(s) del subarbol vuelven a apuntar a la persona %.',
    filas,
    current_setting('reversion.persona');
END
$$;

COMMIT;
