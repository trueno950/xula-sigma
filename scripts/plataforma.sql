-- Siembra del ayuntamiento reservado de plataforma y su primer
-- SUPER_ADMIN. Se corre UNA vez por entorno.
--
-- Son DOS pasos con DOS roles distintos, y no por descuido: **ningun rol
-- puede hacer los dos**. Se comprobo contra Postgres, no se dedujo.
--
--   Paso 1, con el rol de migraciones:
--
--     psql "$MIGRATION_DATABASE_URL" \
--       -v subdominio="plataforma" -v nombre="XULA SIGMA" \
--       -f scripts/plataforma.sql
--
--   Paso 2, con el rol de aplicacion:
--
--     psql "$DATABASE_URL" \
--       -v subdominio="plataforma" \
--       -v correo="quien-corresponda@ejemplo.mx" \
--       -v hash_argon2id="..." \
--       -f scripts/plataforma-admin.sql
--
-- Por que se parte:
--
--   - `xula_migrator` es el unico que puede crear la fila de plataforma:
--     `ayuntamientos_alta_plataforma` le pone `WITH CHECK (NOT
--     es_plataforma)` a `xula_super_admin`, y esa negativa es la garantia
--     de que la plataforma no aparezca como un municipio mas.
--   - Pero `xula_migrator` **no puede escribir en `usuarios`**: con FORCE
--     ROW LEVEL SECURITY el dueno queda sujeto a las politicas, y ahi no
--     tiene ninguna. Verificado: `new row violates row-level security
--     policy for table "usuarios"`. Que falle es correcto — es lo que hace
--     que FORCE valga algo.
--   - `xula_super_admin` tampoco: `usuarios_alta_admin` exige
--     `rol = 'ADMIN_MUNICIPAL'`.
--
-- Queda `xula_app`, que tiene su politica de tenant y los GRANT. Es el
-- unico camino, y no debilita nada: escribe una fila de su propio tenant,
-- igual que en cualquier request.
--
-- **Si el paso 2 falla, el paso 1 hay que deshacerlo a mano**
-- (`DELETE FROM ayuntamientos WHERE es_plataforma`). No hay transaccion
-- posible entre dos conexiones. Es aceptable porque esto corre una vez por
-- entorno y con alguien mirando; el alta de municipios, que corre siempre y
-- sin nadie mirando, si es atomica — ver `withAltaDeAyuntamiento`.

\set ON_ERROR_STOP on

-- El indice parcial `ayuntamientos_una_plataforma` hace que una segunda
-- corrida falle aca en vez de dejar dos plataformas. Correr esto dos veces
-- es un error ruidoso, que es como tiene que ser.
INSERT INTO ayuntamientos (subdominio, nombre, es_plataforma)
VALUES (:'subdominio', :'nombre', true);

\echo 'Fila de plataforma creada. Falta el paso 2, con DATABASE_URL:'
\echo '  psql "$DATABASE_URL" -v subdominio=... -v correo=...'
\echo '       -v hash_argon2id=... -f scripts/plataforma-admin.sql'
\echo 'Si el paso 2 falla: DELETE FROM ayuntamientos WHERE es_plataforma;'
