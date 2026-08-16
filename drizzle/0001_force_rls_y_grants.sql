-- Lo que drizzle-kit no emite, y sin lo cual las politicas de 0000 no
-- valen nada.
--
-- ENABLE ROW LEVEL SECURITY no alcanza: el DUENO de la tabla queda exento
-- de sus propias politicas. Como el dueno es `xula_migrator`, una consulta
-- que saliera por esa conexion veria todos los municipios. FORCE quita esa
-- excepcion y hace que la politica alcance tambien al dueno.
--
-- Toda migracion que cree una tabla con `ayuntamiento_id` repite estas dos
-- cosas. Ver ADR 0001 seccion 2.

ALTER TABLE "ayuntamientos" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bitacora" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Alta de municipios: provisionamiento, no operacion.
--
-- Con FORCE puesto, ni siquiera el dueno de la tabla puede insertar sin una
-- politica que lo habilite. Es correcto y es lo que queremos: `xula_app` no
-- da de alta municipios, eso lo hace el panel de SUPER_ADMIN.
--
-- Esta excepcion se abre SOLO sobre `ayuntamientos`, y solo para el rol de
-- migraciones. Cuesta poco justificarla: sus columnas de lectura ya son
-- publicas (el escudo se pinta antes del login), y quien tiene esa conexion
-- ya puede hacer DROP TABLE. No se gana nada bloqueandole el INSERT.
--
-- Lo que NO se toca es el resto: `bitacora` y toda tabla operativa que
-- venga despues se quedan con FORCE sin escape para nadie. Ahi es donde
-- estan los datos que no pueden cruzarse entre municipios.
CREATE POLICY "ayuntamientos_provision" ON "ayuntamientos"
  AS PERMISSIVE FOR ALL TO "xula_migrator"
  USING (true) WITH CHECK (true);
--> statement-breakpoint

-- El GRANT es explicito por tabla. No hay ALTER DEFAULT PRIVILEGES, y es a
-- proposito: ver el cierre de scripts/bootstrap.sql.
GRANT SELECT, UPDATE ON "ayuntamientos" TO "xula_app";
--> statement-breakpoint

-- La bitacora es de solo agregado. No se le da UPDATE ni DELETE a nadie:
-- el permiso no existe, asi que no hay nada que recordar revisar. Un
-- borrado de auditoria requiere el rol owner y deja rastro en el sistema.
GRANT SELECT, INSERT ON "bitacora" TO "xula_app";
