CREATE TABLE "constancias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"folio" text NOT NULL,
	"anio" integer NOT NULL,
	"consecutivo" integer NOT NULL,
	"codigo_verificacion" text NOT NULL,
	"persona_id" uuid NOT NULL,
	"datos" jsonb NOT NULL,
	"plantilla_version" text NOT NULL,
	"emitida_por_usuario_id" uuid NOT NULL,
	"emitida_en" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelada_en" timestamp with time zone,
	"cancelada_por_usuario_id" uuid,
	"motivo_cancelacion" text,
	CONSTRAINT "constancias_id_tenant_key" UNIQUE("id","ayuntamiento_id"),
	CONSTRAINT "constancias_tipo_valido" CHECK (tipo IN ('VECINDAD')),
	CONSTRAINT "constancias_motivo_cancelacion_valido" CHECK ("constancias"."motivo_cancelacion" IS NULL OR motivo_cancelacion IN ('ERROR_DE_CAPTURA', 'DATOS_INCORRECTOS', 'SOLICITUD_DEL_INTERESADO')),
	CONSTRAINT "constancias_cancelacion_completa" CHECK (("constancias"."cancelada_en" IS NULL) = ("constancias"."motivo_cancelacion" IS NULL) AND ("constancias"."cancelada_en" IS NULL) = ("constancias"."cancelada_por_usuario_id" IS NULL)),
	CONSTRAINT "constancias_consecutivo_positivo" CHECK ("constancias"."consecutivo" > 0)
);
--> statement-breakpoint
ALTER TABLE "constancias" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "folios_de_documentos" (
	"ayuntamiento_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"anio" integer NOT NULL,
	"ultimo_consecutivo" integer NOT NULL,
	CONSTRAINT "folios_de_documentos_pk" PRIMARY KEY("ayuntamiento_id","tipo","anio"),
	CONSTRAINT "folios_tipo_valido" CHECK (tipo IN ('VECINDAD')),
	CONSTRAINT "folios_consecutivo_positivo" CHECK ("folios_de_documentos"."ultimo_consecutivo" > 0)
);
--> statement-breakpoint
ALTER TABLE "folios_de_documentos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reimpresiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"constancia_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"motivo" text NOT NULL,
	"ocurrido_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reimpresiones_motivo_valido" CHECK (motivo IN ('EXTRAVIO', 'DETERIORO', 'EJEMPLAR_ADICIONAL'))
);
--> statement-breakpoint
ALTER TABLE "reimpresiones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ayuntamientos" ADD COLUMN "documentos" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "constancias" ADD CONSTRAINT "constancias_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constancias" ADD CONSTRAINT "constancias_emitida_por_tenant_fk" FOREIGN KEY ("emitida_por_usuario_id","ayuntamiento_id") REFERENCES "public"."usuarios"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constancias" ADD CONSTRAINT "constancias_cancelada_por_tenant_fk" FOREIGN KEY ("cancelada_por_usuario_id","ayuntamiento_id") REFERENCES "public"."usuarios"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folios_de_documentos" ADD CONSTRAINT "folios_de_documentos_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimpresiones" ADD CONSTRAINT "reimpresiones_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimpresiones" ADD CONSTRAINT "reimpresiones_constancia_tenant_fk" FOREIGN KEY ("constancia_id","ayuntamiento_id") REFERENCES "public"."constancias"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimpresiones" ADD CONSTRAINT "reimpresiones_usuario_tenant_fk" FOREIGN KEY ("usuario_id","ayuntamiento_id") REFERENCES "public"."usuarios"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "constancias_tenant_idx" ON "constancias" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "constancias_tenant_folio_idx" ON "constancias" USING btree ("ayuntamiento_id","folio");--> statement-breakpoint
CREATE UNIQUE INDEX "constancias_serie_idx" ON "constancias" USING btree ("ayuntamiento_id","tipo","anio","consecutivo");--> statement-breakpoint
CREATE INDEX "constancias_persona_idx" ON "constancias" USING btree ("ayuntamiento_id","persona_id");--> statement-breakpoint
CREATE INDEX "reimpresiones_tenant_idx" ON "reimpresiones" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE INDEX "reimpresiones_constancia_idx" ON "reimpresiones" USING btree ("ayuntamiento_id","constancia_id");--> statement-breakpoint
CREATE POLICY "constancias_tenant" ON "constancias" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "folios_de_documentos_tenant" ON "folios_de_documentos" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "reimpresiones_tenant" ON "reimpresiones" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
-- ---------------------------------------------------------------------
-- Lo que drizzle-kit no emite.
--
-- FORCE y GRANT van en el MISMO archivo que crea las tablas, no en uno
-- aparte (ADR 0001 seccion 2): un diff que solo toque lo generado se
-- veria identico a una migracion que se olvido del FORCE.
-- ---------------------------------------------------------------------

ALTER TABLE "constancias" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "folios_de_documentos" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reimpresiones" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- `constancias` con UPDATE solo por la cancelacion: no hay ningun otro
-- caso de uso que escriba sobre una fila existente, y el invariante 2
-- prohibe que lo haya. Sin DELETE en ninguna: un documento oficial no se
-- borra (design.md seccion 6).
GRANT SELECT, INSERT, UPDATE ON "constancias" TO "xula_app";--> statement-breakpoint
-- Sin UPDATE y sin DELETE: es lo que convierte "el contador de
-- reimpresiones nunca decrece" de una regla que hay que respetar en una
-- que no se puede violar -- la aplicacion solo puede agregar filas.
GRANT SELECT, INSERT ON "reimpresiones" TO "xula_app";--> statement-breakpoint
-- Sin DELETE: borrar una fila del contador reinicia la serie y hace que
-- el proximo folio repita uno ya entregado (design.md seccion 4).
GRANT SELECT, INSERT, UPDATE ON "folios_de_documentos" TO "xula_app";--> statement-breakpoint

-- ---------------------------------------------------------------------
-- Lo que drizzle-kit no puede emitir.
--
-- El objeto de tabla `personas` no es alcanzable fuera de `padron`
-- (su design.md, decision 1, capa A), asi que este FK no existe como
-- `foreignKey()` de Drizzle. En Postgres existe igual, y es lo que
-- impide que una constancia apunte a una persona de otro municipio: el
-- compuesto obliga a que el destino comparta el ayuntamiento_id de la
-- propia fila. Destino: personas_id_tenant_key (0004_padron.sql:17).
--
-- Mismo mecanismo y misma advertencia que
-- drizzle/0007_territorio.sql:103-120: si algun dia corre
-- `drizzle-kit push` contra esta base, el ALTER TABLE de abajo se
-- borraria en silencio -- no se genera un `drizzle-kit push` en este
-- proyecto (solo generate/migrate), pero si eso cambia, este FK tiene
-- que reescribirse a mano de nuevo.
-- ---------------------------------------------------------------------
ALTER TABLE "constancias"
  ADD CONSTRAINT "constancias_persona_tenant_fk"
  FOREIGN KEY ("persona_id","ayuntamiento_id")
  REFERENCES "public"."personas"("id","ayuntamiento_id")
  ON DELETE no action ON UPDATE no action;