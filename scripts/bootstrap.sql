-- Provisionamiento de roles. Se corre UNA vez por entorno, con el
-- superusuario que entrega Railway.
--
--   psql "$SUPERUSER_URL" \
--     -v clave_migrator="..." \
--     -v clave_app="..." \
--     -v clave_super_admin="..." \
--     -f scripts/bootstrap.sql
--
-- NO es una migracion, y no por comodidad:
--
--   1. Crear roles no es un cambio de esquema versionado. Se hace una vez
--      por base, no se replica en cada entorno como parte de la historia.
--   2. `drizzle-kit migrate` se conecta con MIGRATION_DATABASE_URL, que es
--      justamente el rol que este archivo crea. No puede crearse a si
--      mismo.
--   3. Las contrasenias son por entorno. Una contrasenia en una migracion
--      es una contrasenia en git, para siempre y en cada clon.

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------
-- Los tres roles
-- ---------------------------------------------------------------------
--
-- Railway entrega un solo `postgres` con `rolsuper` y `rolbypassrls` en
-- `t` (verificado 2026-08-16). Un superusuario ignora RLS SIEMPRE, incluso
-- con FORCE. Si la aplicacion se conecta con esa URL tal cual, todo el
-- aislamiento entre municipios es decorativo.
--
-- Por eso el owner tampoco es `postgres`: es `xula_migrator`, que no es
-- superusuario. Asi, si alguna vez una consulta de aplicacion sale por la
-- conexion equivocada, las politicas siguen aplicando. Es la razon de ser
-- de FORCE ROW LEVEL SECURITY: hace que la politica alcance tambien al
-- dueno de la tabla.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'xula_migrator') THEN
    CREATE ROLE xula_migrator LOGIN
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'xula_app') THEN
    CREATE ROLE xula_app LOGIN
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;

  -- El tercero da de alta municipios y destraba al ADMIN_MUNICIPAL. No es
  -- llave maestra: los mismos atributos que los otros dos, y lo que puede
  -- hacer lo acotan politicas RLS propias en `0002_super_admin.sql`. No
  -- tiene SELECT sobre ninguna tabla operativa salvo cuatro columnas de
  -- `usuarios`, y esas porque una subconsulta de politica las exige.
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'xula_super_admin') THEN
    CREATE ROLE xula_super_admin LOGIN
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

ALTER ROLE xula_migrator    WITH PASSWORD :'clave_migrator';
ALTER ROLE xula_app         WITH PASSWORD :'clave_app';
ALTER ROLE xula_super_admin WITH PASSWORD :'clave_super_admin';

-- ---------------------------------------------------------------------
-- Propiedad del esquema
-- ---------------------------------------------------------------------

ALTER SCHEMA public OWNER TO xula_migrator;

-- `drizzle-kit migrate` guarda su journal en un esquema propio llamado
-- `drizzle` y lo crea en la primera corrida. Crear un esquema pide CREATE
-- sobre la BASE, que es un privilegio distinto de ser dueno de `public` y
-- que nadie tiene por defecto. Sin esto la migracion falla —  y falla
-- callada: drizzle-kit se queda en "applying migrations..." y sale con
-- codigo 1 sin imprimir el error de Postgres.
--
-- El nombre de la base cambia por entorno, de ahi el format().
DO $$
BEGIN
  EXECUTE format(
    'GRANT CREATE ON DATABASE %I TO xula_migrator', current_database()
  );
END
$$;

-- Nadie crea objetos en `public` salvo el rol de migraciones. Postgres 15
-- en adelante ya no da CREATE a PUBLIC, pero se revoca explicito porque
-- una base restaurada desde un volcado viejo puede traerlo puesto.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO xula_app;
GRANT USAGE ON SCHEMA public TO xula_super_admin;

-- ---------------------------------------------------------------------
-- Sin privilegios por defecto. A proposito.
-- ---------------------------------------------------------------------
--
-- Seria comodo poner un ALTER DEFAULT PRIVILEGES y que toda tabla nueva
-- quedara accesible para `xula_app` sola. No se hace, y el motivo es la
-- asimetria del ADR 0001 seccion 2:
--
--   Olvidar el GRANT falla ruidosamente — error de permisos en el primer
--   request contra la tabla nueva.
--   Olvidar la politica RLS falla en silencio — durante meses, hasta que
--   entra el segundo municipio.
--
-- El GRANT explicito por migracion obliga a escribir una linea por tabla,
-- y esa linea es el momento en que alguien se pregunta si tambien puso la
-- politica. Un default privileges se lleva puesta esa pregunta.
