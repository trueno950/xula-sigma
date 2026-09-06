import { z } from "zod";
import {
  ESTADOS_DE_CONSTANCIA,
  type FiltrosDeListado,
  type OrdenDeConstancias,
  TAMANO_DE_PAGINA,
} from "@/modules/constancias";

/**
 * La lectura de `?estado=&q=&limite=&ordenar=&direccion=&error=`.
 *
 * Vive aparte de `page.tsx` por el mismo motivo que
 * `reportes/parametros.ts`: aca se interpreta la URL, alla se compone la
 * pantalla.
 */
export type ParametrosDeConstancias = {
  filtros: FiltrosDeListado;
  q: string | undefined;
  limite: number | undefined;
  orden: OrdenDeConstancias | undefined;
  error: string | undefined;
};

/**
 * Cada campo cae a `undefined` por su cuenta -`.catch()`, no un
 * `.safeParse()` de todo el objeto- mismo criterio que
 * `reportes/parametros.ts`. `FiltrosDeConstancias` manda `q`/`estado` en un
 * solo `<form>`: un `q=""` (buscador vacio) o un `estado=""` (la opcion
 * "Todos" de `CampoDeLista`, que sale con `value=""`) fallaban su propio
 * campo y, con `.safeParse()` de todo el objeto, tiraban tambien el otro
 * -la operadora elegia un estado, dejaba el buscador vacio, y el filtro de
 * estado se descartaba sin aviso (el mismo hallazgo de GGA que corrigio
 * `reportes/parametros.ts`, replicado aca desde el inicio).
 * `?estado=a&estado=b` (`string[]`) cae por el mismo `.catch()`, sin
 * necesitar un chequeo aparte.
 */
const esquemaDeParametros = z.object({
  estado: z.enum(ESTADOS_DE_CONSTANCIA).optional().catch(undefined),
  q: z.string().trim().min(1).optional().catch(undefined),
  limite: z.coerce
    .number()
    .int()
    .positive()
    .max(TAMANO_DE_PAGINA * 40)
    .optional()
    .catch(undefined),
  ordenar: z.enum(["folio", "emitida"]).optional().catch(undefined),
  direccion: z.enum(["asc", "desc"]).optional().catch(undefined),
  error: z.string().optional().catch(undefined),
});

export const leerParametros = (
  searchParams: Record<string, string | string[] | undefined>,
): ParametrosDeConstancias => {
  // Cada campo ya cae solo con `.catch()`: este parse no falla.
  const datos = esquemaDeParametros.parse(searchParams);

  const filtros: FiltrosDeListado = {
    ...(datos.estado ? { estado: datos.estado } : {}),
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
  };
};
