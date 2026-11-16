-- S1 de `gestion-municipal`: el umbral de atraso de los reportes ciudadanos,
-- configurable por municipio. Una fila por ayuntamiento -la identidad es
-- `ayuntamiento_id`, no hay `id` sustituto, mismo criterio que
-- `configuracion_de_documentos`-; un municipio sin fila usa los 7 dias
-- recomendados, asi que dar de alta un municipio no exige sembrar nada.
--
-- No es una columna de `ayuntamientos` a proposito: esa tabla tiene lectura
-- publica (el escudo del login se pinta antes de que exista sesion) y la
-- configuracion de la bandeja no hereda esa puerta.
CREATE TABLE "configuracion_de_reportes" (
	"ayuntamiento_id" uuid PRIMARY KEY NOT NULL,
	"dias_de_atraso" integer NOT NULL,
	CONSTRAINT "configuracion_de_reportes_umbral_en_rango" CHECK ("configuracion_de_reportes"."dias_de_atraso" BETWEEN 1 AND 90)
);
--> statement-breakpoint
ALTER TABLE "configuracion_de_reportes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "configuracion_de_reportes" ADD CONSTRAINT "configuracion_de_reportes_ayuntamiento_id_ayuntamientos_id_fk" FOREIGN KEY ("ayuntamiento_id") REFERENCES "public"."ayuntamientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "configuracion_de_reportes_tenant" ON "configuracion_de_reportes" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);
--> statement-breakpoint

-- ---------------------------------------------------------------------
-- Lo que drizzle-kit no emite.
--
-- FORCE y GRANT van en el MISMO archivo que crea la tabla, no en uno
-- aparte (ADR 0001 seccion 2): un diff que solo toque lo generado se
-- veria identico a una migracion que se olvido del FORCE.
-- ---------------------------------------------------------------------

ALTER TABLE "configuracion_de_reportes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- SELECT, INSERT y UPDATE: el umbral se cambia con un upsert del propio
-- municipio. Sin DELETE -borrar la fila seria "volver al valor por
-- defecto" por una puerta que nadie pidio: para eso se guarda 7-. Y sin
-- permiso para otro rol: es configuracion operativa, no de plataforma.
GRANT SELECT, INSERT, UPDATE ON "configuracion_de_reportes" TO "xula_app";
