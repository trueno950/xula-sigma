ALTER TABLE "eventos_de_calles" ADD COLUMN "nombre_anterior" text;--> statement-breakpoint
ALTER TABLE "eventos_de_calles" ADD COLUMN "nombre_nuevo" text;--> statement-breakpoint
ALTER TABLE "eventos_de_calles" ADD COLUMN "latitud_anterior" double precision;--> statement-breakpoint
ALTER TABLE "eventos_de_calles" ADD COLUMN "longitud_anterior" double precision;--> statement-breakpoint
ALTER TABLE "eventos_de_calles" ADD COLUMN "latitud_nueva" double precision;--> statement-breakpoint
ALTER TABLE "eventos_de_calles" ADD COLUMN "longitud_nueva" double precision;--> statement-breakpoint
ALTER TABLE "eventos_de_calles" ADD COLUMN "lugar_anterior_id" uuid;--> statement-breakpoint
ALTER TABLE "eventos_de_calles" ADD COLUMN "lugar_nuevo_id" uuid;