ALTER TABLE "reportes" ADD COLUMN "domicilio_id" uuid;--> statement-breakpoint

-- `domicilios` pertenece a `territorio`; su esquema no se importa desde
-- `reportes` para preservar el limite entre modulos. Como los FK de lugar y
-- calle, este FK compuesto se mantiene en la migracion y cierra el tenant.
ALTER TABLE "reportes"
  ADD CONSTRAINT "reportes_domicilio_tenant_fk"
  FOREIGN KEY ("domicilio_id", "ayuntamiento_id")
  REFERENCES "public"."domicilios"("id", "ayuntamiento_id")
  ON DELETE no action ON UPDATE no action;