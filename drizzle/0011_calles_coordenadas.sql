ALTER TABLE "calles" ADD COLUMN "latitud" double precision;--> statement-breakpoint
ALTER TABLE "calles" ADD COLUMN "longitud" double precision;--> statement-breakpoint
ALTER TABLE "calles"
  ADD CONSTRAINT "calles_punto_completo"
  CHECK (("latitud" IS NULL) = ("longitud" IS NULL));
