-- Destraba al ADMIN_MUNICIPAL de un municipio que quedo afuera.
--
--   psql "$SUPER_ADMIN_DATABASE_URL" \
--     -v ayuntamiento_id="..." \
--     -v correo="admin@municipio.gob.mx" \
--     -v hash_argon2id="..." \
--     -f scripts/restablecer-admin.sql
--
-- **Es un acto operado a mano, y esa es la decision.** Un municipio pierde
-- a su administrador pocas veces al ano; cablearlo como caso de uso pedia
-- abrir una tercera puerta a la base —una conexion de `xula_super_admin`
-- con el tenant del municipio objetivo— y la regla 2 de `AGENTS.md` no la
-- deja entrar sin actualizar antes el ADR. La superficie estaria siempre y
-- el uso casi nunca. Ver tarea 4.16 de `openspec/changes/auth-rbac`.
--
-- Corre con `xula_super_admin` a proposito: es el unico rol al que
-- `cuentas_restablece_admin` le permite este UPDATE, y solo sobre la
-- credencial de un ADMIN_MUNICIPAL. Con el rol de aplicacion andaria
-- tambien, y por eso mismo no sirve: no probaria nada sobre el limite.
--
-- El `ayuntamiento_id` va como parametro porque este rol **no tiene SELECT
-- sobre `ayuntamientos`**: no puede resolver el subdominio ni recorrer el
-- directorio de municipios. Se obtiene aparte, con el rol de aplicacion:
--
--   psql "$DATABASE_URL" -tAc \
--     "SELECT id FROM ayuntamientos WHERE subdominio = 'ticul'"
--
-- El hash se calcula afuera y se pasa hecho, con el mismo argon2id que usa
-- `contrasenia.ts`. Una contrasenia en un archivo del repositorio es una
-- contrasenia en git, para siempre y en cada clon:
--
--   pnpm tsx -e "import('./src/shared/auth/contrasenia').then(m => \
--     m.hashDeClave(process.argv[1]).then(console.log))" "la-clave"

\set ON_ERROR_STOP on

BEGIN;

-- `set_config(..., true)` y no `SET`: local a la transaccion, muere en el
-- COMMIT. El mismo criterio que `withTenant`, y por el mismo motivo.
SELECT set_config('app.tenant', :'ayuntamiento_id', true);

-- Los parametros pasan por `set_config` en vez de interpolarse adentro del
-- bloque: psql no sustituye variables dentro de una cadena con comillas de
-- dolar, asi que `:'correo'` ahi llegaria literal.
SELECT set_config('restablecer.correo', :'correo', true);
SELECT set_config('restablecer.hash', :'hash_argon2id', true);

DO $$
DECLARE
  objetivo uuid;
  filas integer;
BEGIN
  /*
   * Resolver primero y fallar si no aparece.
   *
   * `usuarios_lectura_admin` acota este SELECT al tenant fijado y a
   * `rol = 'ADMIN_MUNICIPAL'`, asi que un correo de otro municipio, o de un
   * OPERADOR del propio, no da fila. Distinguir "no existe" de "no te
   * corresponde" no aporta aca y confirmaria cuentas ajenas.
   */
  SELECT id INTO objetivo
    FROM usuarios
   WHERE email = current_setting('restablecer.correo');

  IF objetivo IS NULL THEN
    RAISE EXCEPTION
      'No hay un ADMIN_MUNICIPAL con ese correo en ese municipio.';
  END IF;

  /*
   * **Sin `WHERE`, y no es un descuido.**
   *
   * Este rol tiene UPDATE sobre `cuentas` y ni una columna de SELECT, asi
   * que cualquier `WHERE user_id = ...` falla con `permission denied for
   * table cuentas`: filtrar es leer. Lo que acota el alcance es el `USING`
   * de `cuentas_restablece_admin`, que exige el tenant fijado y que la
   * credencial sea de un ADMIN_MUNICIPAL. Postgres reduce el UPDATE a esa
   * fila; el script no podria aunque quisiera.
   *
   * Es el diseno que el comentario de la politica ya anticipaba: el `USING`
   * esta puesto para que un UPDATE sin `WHERE` no alcance a nadie mas.
   */
  UPDATE cuentas
     SET password = current_setting('restablecer.hash'),
         updated_at = now();

  /*
   * **Contar es obligatorio.** Un UPDATE que RLS no deja pasar no lanza
   * error: devuelve cero filas y el script terminaria diciendo que salio
   * bien con la contrasenia sin cambiar. Y no se puede verificar leyendo
   * despues, porque este rol no tiene SELECT sobre `cuentas`.
   */
  GET DIAGNOSTICS filas = ROW_COUNT;

  IF filas <> 1 THEN
    RAISE EXCEPTION
      'Se esperaba actualizar 1 credencial y se actualizaron %.', filas;
  END IF;

  -- Quien destraba a un administrador deja registro. `actor` nulo: lo
  -- origina la plataforma y no una sesion, igual que el alta del municipio.
  INSERT INTO bitacora (ayuntamiento_id, accion, entidad, entidad_id)
  VALUES (
    NULLIF(current_setting('app.tenant', true), '')::uuid,
    'RESTABLECER_CONTRASENIA',
    'usuarios',
    objetivo
  );
END
$$;

COMMIT;
