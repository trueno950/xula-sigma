CREATE TABLE "eventos_de_calles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"calle_id" uuid NOT NULL,
	"naturaleza" text NOT NULL,
	"ocurrido_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "eventos_de_calles_naturaleza_valida" CHECK (naturaleza IN ('ALTA', 'RENOMBRE', 'REPARENTEO', 'UBICACION'))
);
--> statement-breakpoint
ALTER TABLE "eventos_de_calles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "eventos_de_calles" ADD CONSTRAINT "eventos_de_calles_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_de_calles" ADD CONSTRAINT "eventos_de_calles_calle_tenant_fk" FOREIGN KEY ("calle_id","ayuntamiento_id") REFERENCES "public"."calles"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eventos_de_calles_tenant_idx" ON "eventos_de_calles" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE INDEX "eventos_de_calles_calle_idx" ON "eventos_de_calles" USING btree ("ayuntamiento_id","calle_id");--> statement-breakpoint
CREATE POLICY "eventos_de_calles_tenant" ON "eventos_de_calles" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "eventos_de_calles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "eventos_de_calles" TO "xula_app";