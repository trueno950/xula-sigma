CREATE TABLE "cuentas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cuentas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "intentos_acceso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"clave" text NOT NULL,
	"tipo" text NOT NULL,
	"ocurrido_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intentos_acceso_tipo_valido" CHECK (tipo IN ('correo', 'ip'))
);
--> statement-breakpoint
ALTER TABLE "intentos_acceso" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sesiones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"rol" text NOT NULL,
	"baja_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_rol_valido" CHECK (rol IN ('SUPER_ADMIN', 'ADMIN_MUNICIPAL', 'OPERADOR', 'CONSULTA'))
);
--> statement-breakpoint
ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verificaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verificaciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intentos_acceso" ADD CONSTRAINT "intentos_acceso_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verificaciones" ADD CONSTRAINT "verificaciones_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cuentas_tenant_idx" ON "cuentas" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE INDEX "intentos_acceso_ventana_idx" ON "intentos_acceso" USING btree ("ayuntamiento_id","clave","ocurrido_en");--> statement-breakpoint
CREATE INDEX "sesiones_tenant_idx" ON "sesiones" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sesiones_token_idx" ON "sesiones" USING btree ("token");--> statement-breakpoint
CREATE INDEX "usuarios_tenant_idx" ON "usuarios" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_tenant_email_idx" ON "usuarios" USING btree ("ayuntamiento_id","email");--> statement-breakpoint
CREATE INDEX "verificaciones_tenant_idx" ON "verificaciones" USING btree ("ayuntamiento_id","identifier");--> statement-breakpoint
CREATE POLICY "cuentas_tenant" ON "cuentas" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "intentos_acceso_tenant" ON "intentos_acceso" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "sesiones_tenant" ON "sesiones" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "usuarios_tenant" ON "usuarios" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "verificaciones_tenant" ON "verificaciones" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint

-- ---------------------------------------------------------------------
-- Lo que drizzle-kit no emite.
--
-- FORCE y GRANT van en el MISMO archivo que crea las tablas, no en uno
-- aparte (ADR 0001 seccion 2). Si estuvieran separados, un diff que solo
-- toque lo generado se veria identico a una migracion que se olvido del
-- FORCE, y esa es exactamente la que no se puede pasar por alto.
--
-- Sin FORCE, el DUENO de la tabla —`xula_migrator`— queda exento de sus
-- propias politicas. ENABLE solo no alcanza.
-- ---------------------------------------------------------------------

ALTER TABLE "usuarios" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sesiones" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cuentas" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verificaciones" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "intentos_acceso" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Los GRANT no son uniformes, y las diferencias son la regla de negocio:
--
--   usuarios         sin DELETE  — la baja es logica (`bajaEn`). Borrar la
--                                  fila deja huerfanas las constancias que
--                                  esa persona firmo.
--   cuentas          sin DELETE  — la credencial se revoca con la baja del
--                                  usuario, no borrandola por separado.
--   sesiones         con DELETE  — cerrar sesion ES borrar la fila.
--   verificaciones   con DELETE  — el adaptador consume el token borrandolo.
--   intentos_acceso  sin UPDATE  — se registra y se purga. Reescribirlo
--                                  seria reescribir la evidencia de que
--                                  alguien estuvo probando claves.

GRANT SELECT, INSERT, UPDATE ON "usuarios" TO "xula_app";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "sesiones" TO "xula_app";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "cuentas" TO "xula_app";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "verificaciones" TO "xula_app";--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "intentos_acceso" TO "xula_app";