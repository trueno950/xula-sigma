import { z } from "zod";
import {
  AREAS_RESPONSABLES,
  ESTADOS_DE_REPORTE,
  type FiltrosDeLaBandeja,
  type OrdenDeReportes,
  TAMANO_DE_PAGINA,
  TIPOS_DE_INCIDENCIA,
} from "@/modules/reportes";

/**
 * La lectura de
 * `?estado=&tipo=&area=&lugar=&q=&atrasados=&limite=&ordenar=&direccion=&error=`.
 *
 * Vive aparte de `page.tsx` por el mismo motivo que
 * `territorio/parametros.ts`: aca se interpreta la URL, alla se compone la
 * pantalla.
 */
export type ParametrosDeReportes = {
  filtros: FiltrosDeLaBandeja;
  q: string | undefined;
  limite: number | undefined;
  orden: OrdenDeReportes | undefined;
  error: string | undefined;
  /**
   * `?atrasados=1`: el filtro de S1. Booleano y no fecha porque el corte lo
   * resuelve el servidor con el umbral del municipio y el dia de hoy; una
   * fecha en la URL quedaria congelada en el historial del navegador.
   */
  soloAtrasados: boolean;
};

/**
 * Cada campo cae a `undefined` por su cuenta -`.catch()`, no un
 * `.safeParse()` de todo el objeto- mismo criterio que
 * `territorio/parametros.ts`. `FiltrosDeReportes` manda `q`/`estado`/`tipo`
 * en un solo `<form>`: un `q=""` (buscador vacio) o un `estado=""` (la
 * opcion "Todos" de `CampoDeLista`, que sale con `value=""`) fallaban su
 * propio campo y, con `.safeParse()` de todo el objeto, tiraban tambien los
 * otros dos -la operadora elegia un estado, dejaba el buscador vacio, y el
 * filtro de estado se descartaba sin aviso (GGA, PR de listados).
 * `?estado=a&estado=b` (`string[]`) cae por el mismo `.catch()`, sin
 * necesitar un chequeo aparte.
 */
const esquemaDeParametros = z.object({
  estado: z.enum(ESTADOS_DE_REPORTE).optional().catch(undefined),
  tipo: z.enum(TIPOS_DE_INCIDENCIA).optional().catch(undefined),
  area: z.enum(AREAS_RESPONSABLES).optional().catch(undefined),
  // Forma de uuid y nada mas: el nombre y el subarbol los resuelve la pagina
  // contra los lugares del propio municipio, y un id de otro tenant no entra
  // a los filtros.
  lugar: z.string().uuid().optional().catch(undefined),
  q: z.string().trim().min(1).optional().catch(undefined),
  limite: z.coerce
    .number()
    .int()
    .positive()
    .max(TAMANO_DE_PAGINA * 40)
    .optional()
    .catch(undefined),
  ordenar: z.enum(["folio", "registrado"]).optional().catch(undefined),
  direccion: z.enum(["asc", "desc"]).optional().catch(undefined),
  atrasados: z.literal("1").optional().catch(undefined),
  error: z.string().optional().catch(undefined),
});

export const leerParametros = (
  searchParams: Record<string, string | string[] | undefined>,
): ParametrosDeReportes => {
  // Cada campo ya cae solo con `.catch()`: este parse no falla.
  const datos = esquemaDeParametros.parse(searchParams);

  const filtros: FiltrosDeLaBandeja = {
    ...(datos.estado ? { estado: datos.estado } : {}),
    ...(datos.tipo ? { tipo: datos.tipo } : {}),
    ...(datos.area ? { area: datos.area } : {}),
    ...(datos.lugar ? { lugar: datos.lugar } : {}),
  };
  const orden = datos.ordenar
    ? { campo: datos.ordenar, direccion: datos.direccion || "asc" }
    : undefined;

  return {
    filtros,
    q: datos.q,
    limite: datos.limite,
    orden,
    error: datos.error,
    soloAtrasados: datos.atrasados === "1",
  };
};
