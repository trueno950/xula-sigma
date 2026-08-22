CREATE TABLE "abreviaturas" (
	"corta" text PRIMARY KEY NOT NULL,
	"larga" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ayuntamiento_id" uuid NOT NULL,
	"nombres" text NOT NULL,
	"primer_apellido" text NOT NULL,
	"segundo_apellido" text,
	"nombre_normalizado" text NOT NULL,
	"curp" char(18),
	"baja_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personas_id_tenant_key" UNIQUE("id","ayuntamiento_id")
);
--> statement-breakpoint
ALTER TABLE "personas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "personas_tenant_idx" ON "personas" USING btree ("ayuntamiento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personas_tenant_curp_idx" ON "personas" USING btree ("ayuntamiento_id","curp");--> statement-breakpoint
CREATE POLICY "personas_tenant" ON "personas" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);-- ---------------------------------------------------------------------
-- Lo que drizzle-kit no emite.
--
-- FORCE y GRANT van en el MISMO archivo que crea las tablas, no en uno
-- aparte (ADR 0001 seccion 2): un diff que solo toque lo generado se veria
-- identico a una migracion que se olvido del FORCE.
--
-- pg_trgm y unaccent (ADR 0002): la busqueda tolerante de la rebanada 3
-- las necesita, y la columna que las usa (nombreNormalizado) ya se escribe
-- desde esta rebanada, asi que las extensiones entran ahora y no cuando
-- llegue la consulta.
-- ---------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint

ALTER TABLE "personas" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- personas sin DELETE: la baja es logica (bajaEn), igual que usuarios.
-- Borrar la fila dejaria huerfanos los persona_id que otros modulos ya
-- guardaron.
GRANT SELECT, INSERT, UPDATE ON "personas" TO "xula_app";--> statement-breakpoint

-- abreviaturas: catalogo de plataforma de solo lectura para el rol de
-- aplicacion (pregunta 2 de proposal.md, invariantes-criticos.md seccion
-- 1). Sin INSERT ni UPDATE a proposito: el diccionario se cura a mano, no
-- lo escribe la aplicacion.
GRANT SELECT ON "abreviaturas" TO "xula_app";--> statement-breakpoint

-- Semilla del diccionario de abreviaturas (ADR 0002 seccion 4), la misma
-- que sostiene los numeros medidos en scripts/spike-busqueda-personas.sql.
INSERT INTO "abreviaturas" ("corta", "larga") VALUES
  ('ma', 'maria'),
  ('mma', 'maria'),
  ('gpe', 'guadalupe'),
  ('gpa', 'guadalupe'),
  ('fco', 'francisco'),
  ('fca', 'francisca'),
  ('j', 'jose'),
  ('jo', 'jose'),
  ('jsus', 'jesus'),
  ('ant', 'antonio'),
  ('mig', 'miguel'),
  ('mgl', 'miguel'),
  ('crmn', 'carmen'),
  ('conc', 'concepcion'),
  ('cnc', 'concepcion'),
  ('rmn', 'ramon'),
  ('flcn', 'feliciano'),
  ('alej', 'alejandro');