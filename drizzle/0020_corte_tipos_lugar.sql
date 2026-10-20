ALTER TABLE "lugares" DROP CONSTRAINT "lugares_tipo_valido";--> statement-breakpoint
ALTER TABLE "lugares" ADD CONSTRAINT "lugares_tipo_valido" CHECK (tipo IN ('cabecera', 'comisaria', 'colonia'));