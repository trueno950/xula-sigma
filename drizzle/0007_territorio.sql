CREATE TABLE "calles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"lugar_id" uuid NOT NULL,
	"baja_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calles_id_tenant_key" UNIQUE("id","ayuntamiento_id")
);
--> statement-breakpoint
ALTER TABLE "calles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "domicilios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"lugar_id" uuid NOT NULL,
	"calle_id" uuid NOT NULL,
	"numero" text,
	"entre_calle_a_id" uuid,
	"entre_calle_b_id" uuid,
	"referencia" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domicilios_id_tenant_key" UNIQUE("id","ayuntamiento_id"),
	CONSTRAINT "domicilios_calles_distintas" CHECK ("domicilios"."calle_id" <> "domicilios"."entre_calle_a_id" AND "domicilios"."calle_id" <> "domicilios"."entre_calle_b_id" AND "domicilios"."entre_calle_a_id" <> "domicilios"."entre_calle_b_id")
);
--> statement-breakpoint
ALTER TABLE "domicilios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lugares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"nombre" text NOT NULL,
	"padre_id" uuid,
	"baja_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lugares_id_tenant_key" UNIQUE("id","ayuntamiento_id"),
	CONSTRAINT "lugares_tipo_valido" CHECK (tipo IN ('cabecera', 'comisaria', 'colonia', 'sector', 'manzana')),
	CONSTRAINT "lugares_sin_autopadre" CHECK ("lugares"."padre_id" <> "lugares"."id")
);
--> statement-breakpoint
ALTER TABLE "lugares" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "residencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"persona_id" uuid NOT NULL,
	"domicilio_id" uuid NOT NULL,
	"desde_en" date NOT NULL,
	"hasta_en" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "residencias_vigencia" CHECK ("residencias"."hasta_en" IS NULL OR "residencias"."hasta_en" >= "residencias"."desde_en")
);
--> statement-breakpoint
ALTER TABLE "residencias" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calles" ADD CONSTRAINT "calles_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calles" ADD CONSTRAINT "calles_lugar_tenant_fk" FOREIGN KEY ("lugar_id","ayuntamiento_id") REFERENCES "public"."lugares"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domicilios" ADD CONSTRAINT "domicilios_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domicilios" ADD CONSTRAINT "domicilios_lugar_tenant_fk" FOREIGN KEY ("lugar_id","ayuntamiento_id") REFERENCES "public"."lugares"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domicilios" ADD CONSTRAINT "domicilios_calle_tenant_fk" FOREIGN KEY ("calle_id","ayuntamiento_id") REFERENCES "public"."calles"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domicilios" ADD CONSTRAINT "domicilios_entre_calle_a_tenant_fk" FOREIGN KEY ("entre_calle_a_id","ayuntamiento_id") REFERENCES "public"."calles"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domicilios" ADD CONSTRAINT "domicilios_entre_calle_b_tenant_fk" FOREIGN KEY ("entre_calle_b_id","ayuntamiento_id") REFERENCES "public"."calles"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lugares" ADD CONSTRAINT "lugares_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lugares" ADD CONSTRAINT "lugares_padre_tenant_fk" FOREIGN KEY ("padre_id","ayuntamiento_id") REFERENCES "public"."lugares"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residencias" ADD CONSTRAINT "residencias_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residencias" ADD CONSTRAINT "residencias_domicilio_tenant_fk" FOREIGN KEY ("domicilio_id","ayuntamiento_id") REFERENCES "public"."domicilios"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calles_tenant_idx" ON "calles" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calles_tenant_lugar_nombre_idx" ON "calles" USING btree ("ayuntamiento_id","lugar_id","nombre");--> statement-breakpoint
CREATE INDEX "domicilios_tenant_idx" ON "domicilios" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE INDEX "domicilios_lugar_idx" ON "domicilios" USING btree ("ayuntamiento_id","lugar_id");--> statement-breakpoint
CREATE INDEX "domicilios_calle_idx" ON "domicilios" USING btree ("ayuntamiento_id","calle_id");--> statement-breakpoint
CREATE INDEX "lugares_tenant_idx" ON "lugares" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lugares_una_cabecera" ON "lugares" USING btree ("ayuntamiento_id") WHERE "lugares"."tipo" = 'cabecera';--> statement-breakpoint
CREATE INDEX "lugares_padre_idx" ON "lugares" USING btree ("ayuntamiento_id","padre_id");--> statement-breakpoint
CREATE INDEX "residencias_tenant_idx" ON "residencias" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "residencias_una_abierta_idx" ON "residencias" USING btree ("ayuntamiento_id","persona_id") WHERE "residencias"."hasta_en" is null;--> statement-breakpoint
CREATE POLICY "calles_tenant" ON "calles" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "domicilios_tenant" ON "domicilios" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "lugares_tenant" ON "lugares" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "residencias_tenant" ON "residencias" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
-- ---------------------------------------------------------------------
-- Lo que drizzle-kit no emite.
--
-- FORCE y GRANT van en el MISMO archivo que crea las tablas, no en uno
-- aparte (ADR 0001 seccion 2): un diff que solo toque lo generado se
-- veria identico a una migracion que se olvido del FORCE.
-- ---------------------------------------------------------------------

ALTER TABLE "lugares" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "domicilios" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "residencias" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Ninguna con DELETE: la baja de lugares/calles es logica (bajaEn), y el
-- cierre de una residencia es hastaEn. Borrar la fila dejaria huerfanos
-- los ids que otro modulo o el resto de este ya guardo
-- (drizzle/0004_padron.sql:42, mismo argumento).
--
-- Excepcion unica: drizzle/0018_grant_baja_fisica_lugares.sql agrega DELETE
-- a "lugares" para scripts/migrar-sectores-a-zonas.sql (B3d), que borra
-- fisicamente sector/manzana porque el CHECK de tipos de B2 valida todas
-- las filas y no solo las activas -un baja_en no alcanza. La via normal de
-- la aplicacion sigue siendo logica.
GRANT SELECT, INSERT, UPDATE ON "lugares" TO "xula_app";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "calles" TO "xula_app";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "domicilios" TO "xula_app";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "residencias" TO "xula_app";--> statement-breakpoint

-- ---------------------------------------------------------------------
-- Lo que drizzle-kit no puede emitir.
--
-- El objeto de tabla `personas` no es alcanzable fuera de `padron`
-- (su design.md, decision 1, capa A), asi que este FK no existe como
-- `foreignKey()` de Drizzle. En Postgres existe igual, y es lo que
-- impide que una residencia apunte a una persona de otro municipio:
-- el compuesto obliga a que el destino comparta el ayuntamiento_id de
-- la propia fila. Destino: personas_id_tenant_key (0004_padron.sql:17).
--
-- Por el mismo motivo, este FK tampoco esta en 0007_snapshot.json:
-- drizzle-kit no la conoce y una regeneracion del snapshot no la lee
-- como faltante que agregar, sino como ausente sin mas. Si algun dia
-- corre `drizzle-kit push` contra esta base, el ALTER TABLE de abajo
-- se borraria en silencio -- no se genera un `drizzle-kit push` en
-- este proyecto (solo generate/migrate), pero si eso cambia, este FK
-- tiene que reescribirse a mano de nuevo.
-- ---------------------------------------------------------------------
ALTER TABLE "residencias"
  ADD CONSTRAINT "residencias_persona_tenant_fk"
  FOREIGN KEY ("persona_id","ayuntamiento_id")
  REFERENCES "public"."personas"("id","ayuntamiento_id")
  ON DELETE no action ON UPDATE no action;