-- S4 de `intervenciones-trazabilidad`: `PAVIMENTACION` entra a la categoria
-- cerrada de tipos de obra. El usuario nombro "BACHEO, PAVIMENTO, REPAVIMENTO";
-- el catalogo ya tenia BACHE y REPAVIMENTACION, y "pavimento" es el tipo que
-- faltaba para distinguir una calle pavimentada de una repavimentada.
--
-- Solo cambia el CHECK: la columna sigue siendo `text` y el resto de la tabla
-- no se toca, asi que no hay RLS, GRANT ni FK nuevos que agregar.
ALTER TABLE "intervenciones" DROP CONSTRAINT "intervenciones_tipo_valido";--> statement-breakpoint
ALTER TABLE "intervenciones" ADD CONSTRAINT "intervenciones_tipo_valido" CHECK (tipo IN ('OBRA', 'REPAVIMENTACION', 'PAVIMENTACION', 'MEJORA', 'FUGA', 'ALUMBRADO', 'BACHE', 'MANTENIMIENTO'));