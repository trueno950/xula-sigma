ALTER TABLE "ayuntamientos" ADD COLUMN "es_plataforma" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ayuntamientos_una_plataforma" ON "ayuntamientos" USING btree ((true)) WHERE "ayuntamientos"."es_plataforma";--> statement-breakpoint
CREATE POLICY "cuentas_alta_admin" ON "cuentas" AS PERMISSIVE FOR INSERT TO "xula_super_admin" WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid AND EXISTS (
  SELECT 1 FROM usuarios u
   WHERE u.id = cuentas.user_id AND u.rol = 'ADMIN_MUNICIPAL'
));--> statement-breakpoint
CREATE POLICY "cuentas_restablece_admin" ON "cuentas" AS PERMISSIVE FOR UPDATE TO "xula_super_admin" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid AND EXISTS (
  SELECT 1 FROM usuarios u
   WHERE u.id = cuentas.user_id AND u.rol = 'ADMIN_MUNICIPAL'
)) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "usuarios_alta_admin" ON "usuarios" AS PERMISSIVE FOR INSERT TO "xula_super_admin" WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid AND rol = 'ADMIN_MUNICIPAL');--> statement-breakpoint
CREATE POLICY "usuarios_lectura_admin" ON "usuarios" AS PERMISSIVE FOR SELECT TO "xula_super_admin" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid AND rol = 'ADMIN_MUNICIPAL');--> statement-breakpoint
CREATE POLICY "ayuntamientos_alta_plataforma" ON "ayuntamientos" AS PERMISSIVE FOR INSERT TO "xula_super_admin" WITH CHECK (NOT "ayuntamientos"."es_plataforma");--> statement-breakpoint
CREATE POLICY "bitacora_alta_plataforma" ON "bitacora" AS PERMISSIVE FOR INSERT TO "xula_super_admin" WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint

-- ---------------------------------------------------------------------
-- Lo que drizzle-kit no emite. Va en ESTE archivo, junto a las politicas
-- que habilita. Ver ADR 0001 seccion 2.
-- ---------------------------------------------------------------------
--
-- El tercer rol se crea en `scripts/bootstrap.sql`, no aca: crear roles no
-- es un cambio de esquema versionado y las contrasenias son por entorno.
-- Esta migracion asume que ya existe — un `CREATE POLICY ... TO
-- xula_super_admin` contra un rol inexistente falla, que es el orden
-- correcto de enterarse.
--
-- Los GRANT dicen lo que el rol PUEDE hacer; las politicas de arriba, sobre
-- que filas. Hacen falta los dos: sin GRANT no llega a evaluar la politica,
-- y sin politica el GRANT no alcanza ninguna fila. La lista es corta a
-- proposito y `esquema.isolation.test.ts` la fija como conjunto exacto: un
-- GRANT agregado despues para destrabar algo hace fallar ese test.

-- Da de alta municipios. Sin SELECT: el id lo genera la aplicacion antes
-- del INSERT, asi que no hace falta RETURNING.
GRANT INSERT ON "ayuntamientos" TO "xula_super_admin";--> statement-breakpoint

-- Crea el primer ADMIN_MUNICIPAL y su credencial, y despues puede
-- restablecerle la contrasenia. Nada mas: sin DELETE en ninguna, y sin
-- UPDATE sobre `usuarios` —no cambia roles, no da de baja.
GRANT INSERT ON "usuarios" TO "xula_super_admin";--> statement-breakpoint
GRANT INSERT, UPDATE ON "cuentas" TO "xula_super_admin";--> statement-breakpoint

-- La traza del alta. Solo INSERT, como todo el mundo: la bitacora es de
-- solo agregado.
GRANT INSERT ON "bitacora" TO "xula_super_admin";--> statement-breakpoint

-- SELECT **por columna**, no sobre la tabla.
--
-- Hacen falta cuatro y ninguna mas: `id` y `rol` para la subconsulta de
-- `cuentas_restablece_admin`, `ayuntamiento_id` para la politica, y `email`
-- porque el alta necesita detectar el duplicado antes de escribir. Sobre la
-- tabla entera esto abriria `name` y `baja_en` de cada persona de cada
-- municipio.
--
-- El GRANT por columna no aparece en `role_table_grants` sino en
-- `role_column_grants`; el test de esquema mira las dos vistas.
GRANT SELECT ("id", "ayuntamiento_id", "rol", "email")
  ON "usuarios" TO "xula_super_admin";
