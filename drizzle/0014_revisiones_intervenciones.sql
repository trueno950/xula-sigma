CREATE TABLE "revisiones_de_intervenciones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ayuntamiento_id" uuid NOT NULL,
  "intervencion_id" uuid NOT NULL,
  "valores_anteriores" jsonb NOT NULL,
  "usuario_id" uuid NOT NULL,
  "ocurrido_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "revisiones_de_intervenciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "revisiones_de_intervenciones"
  ADD CONSTRAINT "revisiones_intervenciones_ayuntamiento_fk"
  FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id");--> statement-breakpoint
ALTER TABLE "revisiones_de_intervenciones"
  ADD CONSTRAINT "revisiones_intervenciones_intervencion_tenant_fk"
  FOREIGN KEY ("intervencion_id", "ayuntamiento_id")
  REFERENCES "public"."intervenciones"("id", "ayuntamiento_id");--> statement-breakpoint
ALTER TABLE "revisiones_de_intervenciones"
  ADD CONSTRAINT "revisiones_intervenciones_usuario_tenant_fk"
  FOREIGN KEY ("usuario_id", "ayuntamiento_id")
  REFERENCES "public"."usuarios"("id", "ayuntamiento_id");--> statement-breakpoint
CREATE INDEX "revisiones_intervenciones_tenant_idx"
  ON "revisiones_de_intervenciones" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE INDEX "revisiones_intervenciones_intervencion_idx"
  ON "revisiones_de_intervenciones" USING btree ("ayuntamiento_id", "intervencion_id");--> statement-breakpoint
CREATE POLICY "revisiones_de_intervenciones_tenant"
  ON "revisiones_de_intervenciones" AS PERMISSIVE FOR ALL TO "xula_app"
  USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid)
  WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "revisiones_de_intervenciones" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "revisiones_de_intervenciones" TO "xula_app";
