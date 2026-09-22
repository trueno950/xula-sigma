import { z } from "zod";
import {
  ESTADOS_DE_INTERVENCION,
  TIPOS_DE_INTERVENCION,
} from "@/modules/intervenciones";
import {
  AREAS_RESPONSABLES,
  ESTADOS_DE_REPORTE,
  TIPOS_DE_INCIDENCIA,
} from "@/modules/reportes";

export type ParametrosDeMapa = {
  tipo: string | undefined;
  estado: string | undefined;
  area: string | undefined;
};

/**
 * Cada campo cae a `undefined` por su cuenta -`.catch()`, no un
 * `.safeParse()` de todo el objeto-, mismo criterio que
 * `reportes/parametros.ts`: un valor invalido en un campo no debe tirar
 * los otros dos filtros vigentes. `tipo`/`estado` aceptan el vocabulario
 * de cualquiera de los dos recursos -el mapa decide cual le aplica a cada
 * hecho, no esta pantalla-.
 */
const esquemaDeParametros = z.object({
  tipo: z
    .union([z.enum(TIPOS_DE_INCIDENCIA), z.enum(TIPOS_DE_INTERVENCION)])
    .optional()
    .catch(undefined),
  estado: z
    .union([z.enum(ESTADOS_DE_REPORTE), z.enum(ESTADOS_DE_INTERVENCION)])
    .optional()
    .catch(undefined),
  area: z.enum(AREAS_RESPONSABLES).optional().catch(undefined),
});

export const leerParametrosDeMapa = (
  searchParams: Record<string, string | string[] | undefined>,
): ParametrosDeMapa => {
  // Cada campo ya cae solo con `.catch()`: este parse no falla.
  const datos = esquemaDeParametros.parse(searchParams);
  return { tipo: datos.tipo, estado: datos.estado, area: datos.area };
};
