CREATE TABLE "ayuntamientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subdominio" text NOT NULL,
	"nombre" text NOT NULL,
	"marca" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"activo" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ayuntamientos_subdominio_unique" UNIQUE("subdominio")
);
--> statement-breakpoint
ALTER TABLE "ayuntamientos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bitacora" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"actor" uuid,
	"accion" text NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" uuid,
	"origen" text,
	"ocurrido_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bitacora" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bitacora_tenant_idx" ON "bitacora" USING btree ("ayuntamiento_id","ocurrido_en");--> statement-breakpoint
CREATE POLICY "ayuntamientos_directorio_publico" ON "ayuntamientos" AS PERMISSIVE FOR SELECT TO "xula_app" USING (true);--> statement-breakpoint
CREATE POLICY "ayuntamientos_escritura_propia" ON "ayuntamientos" AS PERMISSIVE FOR UPDATE TO "xula_app" USING (id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "bitacora_tenant" ON "bitacora" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);