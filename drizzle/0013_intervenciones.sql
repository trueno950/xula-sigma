CREATE TABLE "intervenciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"estado" text NOT NULL,
	"fecha_de_ocurrencia" date NOT NULL,
	"lugar_id" uuid NOT NULL,
	"calle_id" uuid,
	"reporte_id" uuid,
	"descripcion" text NOT NULL,
	"registrado_por_usuario_id" uuid NOT NULL,
	"capturado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intervenciones_id_tenant_key" UNIQUE("id","ayuntamiento_id"),
	CONSTRAINT "intervenciones_tipo_valido" CHECK (tipo IN ('OBRA', 'REPAVIMENTACION', 'MEJORA', 'FUGA', 'ALUMBRADO', 'BACHE', 'MANTENIMIENTO')),
	CONSTRAINT "intervenciones_estado_valido" CHECK (estado IN ('PLANIFICADA', 'EN_EJECUCION', 'FINALIZADA', 'CANCELADA')),
	CONSTRAINT "intervenciones_descripcion_acotada" CHECK (char_length("intervenciones"."descripcion") BETWEEN 10 AND 1000)
);
--> statement-breakpoint
ALTER TABLE "intervenciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "intervenciones" ADD CONSTRAINT "intervenciones_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervenciones" ADD CONSTRAINT "intervenciones_registrado_por_tenant_fk" FOREIGN KEY ("registrado_por_usuario_id","ayuntamiento_id") REFERENCES "public"."usuarios"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intervenciones_tenant_idx" ON "intervenciones" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE INDEX "intervenciones_lugar_idx" ON "intervenciones" USING btree ("ayuntamiento_id","lugar_id");--> statement-breakpoint
CREATE INDEX "intervenciones_calle_idx" ON "intervenciones" USING btree ("ayuntamiento_id","calle_id");--> statement-breakpoint
CREATE INDEX "intervenciones_reporte_idx" ON "intervenciones" USING btree ("ayuntamiento_id","reporte_id");--> statement-breakpoint
CREATE POLICY "intervenciones_tenant" ON "intervenciones" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "intervenciones" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "intervenciones" TO "xula_app";--> statement-breakpoint
ALTER TABLE "intervenciones"
  ADD CONSTRAINT "intervenciones_lugar_tenant_fk"
  FOREIGN KEY ("lugar_id", "ayuntamiento_id")
  REFERENCES "public"."lugares"("id", "ayuntamiento_id")
  ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervenciones"
  ADD CONSTRAINT "intervenciones_calle_tenant_fk"
  FOREIGN KEY ("calle_id", "ayuntamiento_id")
  REFERENCES "public"."calles"("id", "ayuntamiento_id")
  ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervenciones"
  ADD CONSTRAINT "intervenciones_reporte_tenant_fk"
  FOREIGN KEY ("reporte_id", "ayuntamiento_id")
  REFERENCES "public"."reportes"("id", "ayuntamiento_id")
  ON DELETE no action ON UPDATE no action;
