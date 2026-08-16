CREATE TABLE "ayuntamientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subdominio" text NOT NULL,
	"nombre" text NOT NULL,
	"marca" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"alta_en" timestamp with time zone DEFAULT now() NOT NULL,
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
CREATE POLICY "bitacora_tenant" ON "bitacora" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);--> statement-breakpoint

-- ---------------------------------------------------------------------
-- Lo que drizzle-kit no emite. Va en ESTE archivo, no en uno aparte.
-- ---------------------------------------------------------------------
--
-- Las cuatro cosas que hace toda migracion que crea una tabla —columna
-- `ayuntamiento_id`, ENABLE + FORCE RLS, politica, GRANT— tienen que
-- poder leerse juntas. Partidas en dos archivos, un diff que toque solo
-- el generado se ve identico a una migracion que se olvido del FORCE, y
-- entonces ni una persona ni una revision automatica pueden distinguir
-- una omision real del ruido. Ver ADR 0001 seccion 2.
--
-- ENABLE ROW LEVEL SECURITY solo no alcanza: el DUENO de la tabla queda
-- exento de sus propias politicas. Como el dueno es `xula_migrator`, una
-- consulta que saliera por esa conexion veria todos los municipios. FORCE
-- quita esa excepcion.

ALTER TABLE "ayuntamientos" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bitacora" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Alta de municipios: provisionamiento, no operacion.
--
-- Con FORCE puesto, ni el dueno puede insertar sin una politica que lo
-- habilite. Es lo correcto: `xula_app` no da de alta municipios, eso lo
-- hace el panel de SUPER_ADMIN.
--
-- La excepcion se abre SOLO sobre `ayuntamientos` y solo para el rol de
-- migraciones. Se justifica barato: sus columnas de lectura ya son
-- publicas (el escudo se pinta antes del login) y quien tiene esa
-- conexion ya puede hacer DROP TABLE.
--
-- `bitacora` y toda tabla operativa que venga despues se quedan con FORCE
-- sin escape para nadie. Ahi estan los datos que no pueden cruzarse.
CREATE POLICY "ayuntamientos_provision" ON "ayuntamientos"
  AS PERMISSIVE FOR ALL TO "xula_migrator"
  USING (true) WITH CHECK (true);--> statement-breakpoint

-- GRANT explicito por tabla. No hay ALTER DEFAULT PRIVILEGES: ver el
-- cierre de scripts/bootstrap.sql.
GRANT SELECT, UPDATE ON "ayuntamientos" TO "xula_app";--> statement-breakpoint

-- La bitacora es de solo agregado. No se le da UPDATE ni DELETE a nadie:
-- el permiso no existe, asi que no hay nada que recordar revisar.
GRANT SELECT, INSERT ON "bitacora" TO "xula_app";
