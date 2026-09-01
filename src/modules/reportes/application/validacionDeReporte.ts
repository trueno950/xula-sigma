import { z } from "zod";
import { TIPOS_DE_INCIDENCIA } from "../domain";

/**
 * El Zod del alta (design.md seccion 5, tasks.md 4.4). Vive en
 * `application` y no en `domain` por `dominio-no-importa-nada`
 * (`.dependency-cruiser.cjs`): Zod es dependencia de produccion y el dominio
 * no importa nada. Tampoco en `shared`: los unicos consumidores -la Server
 * Action de alta (Fase 7) y `registrarReporte`- viven dentro de `reportes`.
 *
 * Los topes de `descripcion` (10..1000) y `referencia` (0..200) son de
 * captura, no de seguridad: son las dos cajas de texto libre del modulo
 * (decision 13) y ningun tipo valida que un operador no escriba un nombre
 * (propuesta, tabla de riesgos). Se declaran como limite, no como garantia.
 */
export const esquemaDeReporte = z.object({
  descripcion: z.string().trim().min(10).max(1000),
  referencia: z.string().trim().max(200).optional(),
  tipo: z.enum(TIPOS_DE_INCIDENCIA),
  lugarId: z.string().trim().uuid(),
  calleId: z.string().trim().uuid().optional(),
  personaId: z.string().trim().uuid().optional(),
});

export type DatosDeReporte = z.infer<typeof esquemaDeReporte>;
