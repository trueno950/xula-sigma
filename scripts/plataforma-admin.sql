-- Paso 2 de la siembra de plataforma: el primer SUPER_ADMIN.
--
--   psql "$DATABASE_URL" \
--     -v subdominio="plataforma" \
--     -v correo="quien-corresponda@ejemplo.mx" \
--     -v hash_argon2id="..." \
--     -f scripts/plataforma-admin.sql
--
-- Corre con el rol de aplicacion. Por que no con los otros dos esta en
-- `scripts/plataforma.sql`, que es el paso 1 y tiene que haber corrido
-- antes.
--
-- El hash se calcula afuera y se pasa hecho. Una contrasenia en un archivo
-- del repositorio es una contrasenia en git, para siempre y en cada clon.
-- Con el mismo argon2id que usa `contrasenia.ts`:
--
--   pnpm tsx -e "import('./src/shared/auth/contrasenia').then(m => \
--     m.hashDeClave(process.argv[1]).then(console.log))" "la-clave"
--
-- La cuenta resultante queda sujeta al mismo RLS, al mismo `withTenant` y a
-- los mismos tests de aislamiento que cualquier usuario municipal. Esa fue
-- la decision de la seccion 10 del diseno: un solo mecanismo de sesion, no
-- dos.

\set ON_ERROR_STOP on

BEGIN;

-- `set_config(..., true)` y no `SET`: local a la transaccion, muere en el
-- COMMIT. El mismo criterio que `withTenant`, y por el mismo motivo.
SELECT set_config(
  'app.tenant',
  (SELECT id::text FROM ayuntamientos
    WHERE subdominio = :'subdominio' AND es_plataforma),
  true
);

WITH persona AS (
  INSERT INTO usuarios (ayuntamiento_id, name, email, rol)
  VALUES (
    NULLIF(current_setting('app.tenant', true), '')::uuid,
    'Plataforma',
    :'correo',
    'SUPER_ADMIN'
  )
  RETURNING id, ayuntamiento_id
)
-- `account_id` es el id de la persona. El porque —y la linea del paquete
-- que lo fija— esta en `src/shared/auth/alta.ts`, que hace este mismo
-- insert desde la aplicacion. Una sola copia: dos divergen cuando cambie
-- la version de la libreria y ninguna avisa.
INSERT INTO cuentas (ayuntamiento_id, user_id, account_id, provider_id, password)
SELECT ayuntamiento_id, id, id::text, 'credential', :'hash_argon2id'
  FROM persona;

COMMIT;
