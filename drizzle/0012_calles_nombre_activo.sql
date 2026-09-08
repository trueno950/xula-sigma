DROP INDEX "calles_tenant_lugar_nombre_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "calles_tenant_lugar_nombre_idx" ON "calles" USING btree ("ayuntamiento_id","lugar_id","nombre") WHERE "calles"."baja_en" IS NULL;
