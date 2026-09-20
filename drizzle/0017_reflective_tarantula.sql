CREATE TABLE "calles_de_zonas" (
	"zona_id" uuid NOT NULL,
	"calle_id" uuid NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"lugar_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calles_de_zonas_pk" PRIMARY KEY("zona_id","calle_id")
);
--> statement-breakpoint
ALTER TABLE "calles_de_zonas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "zonas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"lugar_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"baja_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zonas_id_tenant_key" UNIQUE("id","ayuntamiento_id"),
	CONSTRAINT "zonas_id_lugar_tenant_key" UNIQUE("id","lugar_id","ayuntamiento_id")
);
--> statement-breakpoint
ALTER TABLE "zonas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calles" ADD CONSTRAINT "calles_id_lugar_tenant_key" UNIQUE("id","lugar_id","ayuntamiento_id");--> statement-breakpoint
ALTER TABLE "calles_de_zonas" ADD CONSTRAINT "calles_de_zonas_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calles_de_zonas" ADD CONSTRAINT "calles_de_zonas_zona_tenant_fk" FOREIGN KEY ("zona_id","lugar_id","ayuntamiento_id") REFERENCES "public"."zonas"("id","lugar_id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calles_de_zonas" ADD CONSTRAINT "calles_de_zonas_calle_tenant_fk" FOREIGN KEY ("calle_id","lugar_id","ayuntamiento_id") REFERENCES "public"."calles"("id","lugar_id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zonas" ADD CONSTRAINT "zonas_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zonas" ADD CONSTRAINT "zonas_lugar_tenant_fk" FOREIGN KEY ("lugar_id","ayuntamiento_id") REFERENCES "public"."lugares"("id","ayuntamiento_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "zonas_calles_zona_idx" ON "calles_de_zonas" USING btree ("ayuntamiento_id","zona_id");--> statement-breakpoint
CREATE INDEX "zonas_calles_calle_idx" ON "calles_de_zonas" USING btree ("ayuntamiento_id","calle_id");--> statement-breakpoint
CREATE INDEX "zonas_tenant_idx" ON "zonas" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "zonas_tenant_lugar_nombre_idx" ON "zonas" USING btree ("ayuntamiento_id","lugar_id","nombre") WHERE "zonas"."baja_en" is null;--> statement-breakpoint
CREATE POLICY "calles_de_zonas_tenant" ON "calles_de_zonas" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "zonas_tenant" ON "zonas" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);
ALTER TABLE "calles_de_zonas" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "calles_de_zonas" TO "xula_app";--> statement-breakpoint
ALTER TABLE "zonas" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "zonas" TO "xula_app";
