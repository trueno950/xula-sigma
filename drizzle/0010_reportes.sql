CREATE TABLE "folios_de_reportes" (
	"ayuntamiento_id" uuid NOT NULL,
	"anio" integer NOT NULL,
	"ultimo_consecutivo" integer NOT NULL,
	CONSTRAINT "folios_de_reportes_pk" PRIMARY KEY("ayuntamiento_id","anio"),
	CONSTRAINT "folios_de_reportes_consecutivo_positivo" CHECK ("folios_de_reportes"."ultimo_consecutivo" > 0)
);
--> statement-breakpoint
ALTER TABLE "folios_de_reportes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "movimientos_de_reportes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"reporte_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"estado_anterior" text,
	"estado_nuevo" text,
	"area_asignada" text,
	"motivo" text,
	"ocurrido_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movimientos_estado_anterior_valido" CHECK ("movimientos_de_reportes"."estado_anterior" IS NULL OR estado_anterior IN ('RECIBIDO', 'EN_ATENCION', 'RESUELTO', 'RECHAZADO')),
	CONSTRAINT "movimientos_estado_nuevo_valido" CHECK ("movimientos_de_reportes"."estado_nuevo" IS NULL OR estado_nuevo IN ('RECIBIDO', 'EN_ATENCION', 'RESUELTO', 'RECHAZADO')),
	CONSTRAINT "movimientos_area_valida" CHECK ("movimientos_de_reportes"."area_asignada" IS NULL OR area_asignada IN ('OBRAS_PUBLICAS', 'ALUMBRADO_PUBLICO', 'AGUA_POTABLE_Y_DRENAJE', 'LIMPIA_Y_RECOLECCION', 'PARQUES_Y_JARDINES', 'SERVICIOS_GENERALES')),
	CONSTRAINT "movimientos_motivo_valido" CHECK ("movimientos_de_reportes"."motivo" IS NULL OR motivo IN ('DUPLICADO', 'FUERA_DE_COMPETENCIA', 'INFORMACION_INSUFICIENTE')),
	CONSTRAINT "movimientos_no_vacio" CHECK ("movimientos_de_reportes"."estado_nuevo" IS NOT NULL OR "movimientos_de_reportes"."area_asignada" IS NOT NULL),
	CONSTRAINT "movimientos_motivo_solo_en_rechazo" CHECK ("movimientos_de_reportes"."motivo" IS NULL OR "movimientos_de_reportes"."estado_nuevo" IS NOT DISTINCT FROM 'RECHAZADO')
);
--> statement-breakpoint
ALTER TABLE "movimientos_de_reportes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reportes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"folio" text NOT NULL,
	"anio" integer NOT NULL,
	"consecutivo" integer NOT NULL,
	"tipo" text NOT NULL,
	"estado" text NOT NULL,
	"area_responsable" text,
	"lugar_id" uuid NOT NULL,
	"calle_id" uuid,
	"referencia" text,
	"descripcion" text NOT NULL,
	"persona_id" uuid,
	"motivo_de_rechazo" text,
	"duplicado_de_reporte_id" uuid,
	"registrado_por_usuario_id" uuid NOT NULL,
	"registrado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reportes_id_tenant_key" UNIQUE("id","ayuntamiento_id"),
	CONSTRAINT "reportes_tipo_valido" CHECK (tipo IN ('BACHE', 'ALUMBRADO', 'FUGA', 'BASURA', 'PARQUE', 'OTRO')),
	CONSTRAINT "reportes_estado_valido" CHECK (estado IN ('RECIBIDO', 'EN_ATENCION', 'RESUELTO', 'RECHAZADO')),
	CONSTRAINT "reportes_area_valida" CHECK ("reportes"."area_responsable" IS NULL OR area_responsable IN ('OBRAS_PUBLICAS', 'ALUMBRADO_PUBLICO', 'AGUA_POTABLE_Y_DRENAJE', 'LIMPIA_Y_RECOLECCION', 'PARQUES_Y_JARDINES', 'SERVICIOS_GENERALES')),
	CONSTRAINT "reportes_motivo_valido" CHECK ("reportes"."motivo_de_rechazo" IS NULL OR motivo_de_rechazo IN ('DUPLICADO', 'FUERA_DE_COMPETENCIA', 'INFORMACION_INSUFICIENTE')),
	CONSTRAINT "reportes_rechazo_completo" CHECK (("reportes"."estado" = 'RECHAZADO') = ("reportes"."motivo_de_rechazo" IS NOT NULL)),
	CONSTRAINT "reportes_duplicado_con_motivo" CHECK (("reportes"."motivo_de_rechazo" IS NOT DISTINCT FROM 'DUPLICADO') = ("reportes"."duplicado_de_reporte_id" IS NOT NULL)),
	CONSTRAINT "reportes_sin_autoduplicado" CHECK ("reportes"."duplicado_de_reporte_id" <> "reportes"."id"),
	CONSTRAINT "reportes_consecutivo_positivo" CHECK ("reportes"."consecutivo" > 0)
);
--> statement-breakpoint
ALTER TABLE "reportes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "folios_de_reportes" ADD CONSTRAINT "folios_de_reportes_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_de_reportes" ADD CONSTRAINT "movimientos_de_reportes_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_de_reportes" ADD CONSTRAINT "movimientos_de_reportes_reporte_tenant_fk" FOREIGN KEY ("reporte_id","ayuntamiento_id") REFERENCES "public"."reportes"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_de_reportes" ADD CONSTRAINT "movimientos_de_reportes_usuario_tenant_fk" FOREIGN KEY ("usuario_id","ayuntamiento_id") REFERENCES "public"."usuarios"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_registrado_por_tenant_fk" FOREIGN KEY ("registrado_por_usuario_id","ayuntamiento_id") REFERENCES "public"."usuarios"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_duplicado_tenant_fk" FOREIGN KEY ("duplicado_de_reporte_id","ayuntamiento_id") REFERENCES "public"."reportes"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movimientos_de_reportes_tenant_idx" ON "movimientos_de_reportes" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE INDEX "movimientos_de_reportes_reporte_idx" ON "movimientos_de_reportes" USING btree ("ayuntamiento_id","reporte_id");--> statement-breakpoint
CREATE INDEX "reportes_tenant_idx" ON "reportes" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reportes_tenant_folio_idx" ON "reportes" USING btree ("ayuntamiento_id","folio");--> statement-breakpoint
CREATE UNIQUE INDEX "reportes_serie_idx" ON "reportes" USING btree ("ayuntamiento_id","anio","consecutivo");--> statement-breakpoint
CREATE INDEX "reportes_duplicado_idx" ON "reportes" USING btree ("ayuntamiento_id","duplicado_de_reporte_id");--> statement-breakpoint
CREATE INDEX "reportes_similares_idx" ON "reportes" USING btree ("ayuntamiento_id","lugar_id","tipo","estado");--> statement-breakpoint
CREATE POLICY "folios_de_reportes_tenant" ON "folios_de_reportes" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "movimientos_de_reportes_tenant" ON "movimientos_de_reportes" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "reportes_tenant" ON "reportes" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint

-- ---------------------------------------------------------------------
-- Lo que drizzle-kit no emite.
--
-- FORCE y GRANT van en el MISMO archivo que crea las tablas, no en uno
-- aparte (ADR 0001 seccion 2): un diff que solo toque lo generado se
-- veria identico a una migracion que se olvido del FORCE.
-- ---------------------------------------------------------------------

ALTER TABLE "reportes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "folios_de_reportes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "movimientos_de_reportes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- `reportes` con UPDATE porque el reporte cambia de estado por diseno
-- (decision 1) -- es la diferencia declarada con `constancias`, que solo
-- lo tiene por la cancelacion. Sin DELETE: un reporte ciudadano no se
-- borra.
GRANT SELECT, INSERT, UPDATE ON "reportes" TO "xula_app";--> statement-breakpoint
-- Sin DELETE: borrar una fila del contador reinicia la serie y hace que
-- el proximo folio repita uno ya entregado (design.md seccion 4).
GRANT SELECT, INSERT, UPDATE ON "folios_de_reportes" TO "xula_app";--> statement-breakpoint
-- Sin UPDATE y sin DELETE: es lo que convierte "el historial es de solo
-- agregado" de una regla que hay que respetar en una que no se puede
-- violar. Mismo mecanismo que `bitacora` (`shared/tenancy/esquema.ts:115-120`)
-- y `reimpresiones`.
GRANT SELECT, INSERT ON "movimientos_de_reportes" TO "xula_app";--> statement-breakpoint

-- ---------------------------------------------------------------------
-- Lo que drizzle-kit no puede emitir.
--
-- Los objetos de tabla `lugares`, `calles` y `personas` no son alcanzables
-- fuera de sus modulos (design.md seccion 6, correccion sobre la
-- propuesta: el autorreferencial de `reportes` SI lo emite Drizzle mas
-- arriba, `reportes_duplicado_tenant_fk` -- precedente
-- `lugares_padre_tenant_fk`, `drizzle/0007_territorio.sql:64`). Los tres
-- FK de abajo no existen como `foreignKey()` de Drizzle por eso. En
-- Postgres existen igual, y son lo unico que impide que un reporte apunte
-- a un lugar, una calle o una persona de otro municipio.
--
-- Mismo mecanismo y misma advertencia que `drizzle/0007_territorio.sql:103-120`
-- y `drizzle/0008_constancias.sql:103-119`: si algun dia corre
-- `drizzle-kit push` contra esta base, los tres ALTER TABLE de abajo se
-- borrarian en silencio -- no se genera un `drizzle-kit push` en este
-- proyecto (solo generate/migrate), pero si eso cambia, estos FK tienen
-- que reescribirse a mano de nuevo.
-- ---------------------------------------------------------------------
ALTER TABLE "reportes"
  ADD CONSTRAINT "reportes_lugar_tenant_fk"
  FOREIGN KEY ("lugar_id","ayuntamiento_id")
  REFERENCES "public"."lugares"("id","ayuntamiento_id")
  ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes"
  ADD CONSTRAINT "reportes_calle_tenant_fk"
  FOREIGN KEY ("calle_id","ayuntamiento_id")
  REFERENCES "public"."calles"("id","ayuntamiento_id")
  ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes"
  ADD CONSTRAINT "reportes_persona_tenant_fk"
  FOREIGN KEY ("persona_id","ayuntamiento_id")
  REFERENCES "public"."personas"("id","ayuntamiento_id")
  ON DELETE no action ON UPDATE no action;