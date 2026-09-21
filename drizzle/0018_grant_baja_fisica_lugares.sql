-- Excepcion puntual a drizzle/0007_territorio.sql:94-97 ("Ninguna con
-- DELETE"). scripts/migrar-sectores-a-zonas.sql (B3d) borra fisicamente
-- sector/manzana antes del CHECK de tipos de B2, que valida todas las filas
-- y no solo las activas -un baja_en no alcanza para esas dos filas. La via
-- normal de la aplicacion sigue siendo la baja logica; este GRANT no cambia
-- eso, solo habilita el unico script que necesita el verbo.
GRANT DELETE ON "lugares" TO "xula_app";--> statement-breakpoint
