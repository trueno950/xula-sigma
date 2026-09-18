import { z } from "zod";
import {
  comoLugarId,
  type FiltrosDeRegistro,
  TAMANO_DE_PAGINA,
} from "@/modules/territorio";

/**
 * La lectura de `?q=&numero=&raiz=&limite=` del registro plano de
 * domicilios.
 *
 * Vive aparte de `page.tsx` por el mismo motivo que
 * `territorio/parametros.ts`: aca se interpreta la URL, alla se compone la
 * pantalla.
 */
export type ParametrosDeDomicilios = {
  filtros: FiltrosDeRegistro;
  limite: number | undefined;
};

/**
 * Cada campo cae a `undefined` por su cuenta -`.catch()`, no un
 * `.safeParse()` de todo el objeto- mismo criterio que
 * `reportes/parametros.ts`, que documenta el caso que lo origino: con el
 * objeto entero, un `limite` basura tiraba tambien los filtros buenos y la
 * operadora perdia la busqueda sin que nada lo avisara. `?q=a&q=b`
 * (`string[]`) cae por el mismo `.catch()`, sin un chequeo aparte.
 */
const esquemaDeParametros = z.object({
  q: z.string().trim().min(1).optional().catch(undefined),
  numero: z.string().trim().min(1).optional().catch(undefined),
  raiz: z.string().uuid().optional().catch(undefined),
  limite: z.coerce
    .number()
    .int()
    .positive()
    .max(TAMANO_DE_PAGINA * 40)
    .optional()
    .catch(undefined),
});

export const leerParametros = (
  searchParams: Record<string, string | string[] | undefined>,
): ParametrosDeDomicilios => {
  // Cada campo ya cae solo con `.catch()`: este parse no falla.
  const datos = esquemaDeParametros.parse(searchParams);

  return {
    filtros: {
      ...(datos.raiz ? { raizId: comoLugarId(datos.raiz) } : {}),
      ...(datos.q ? { calle: datos.q } : {}),
      ...(datos.numero ? { numero: datos.numero } : {}),
    },
    limite: datos.limite,
  };
};
