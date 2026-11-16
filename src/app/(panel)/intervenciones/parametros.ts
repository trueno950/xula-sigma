import { z } from "zod";
import {
  ESTADOS_DE_INTERVENCION,
  type FiltrosDeIntervenciones,
  TIPOS_DE_INTERVENCION,
} from "@/modules/intervenciones";

/**
 * La lectura de `?estado=&tipo=&lugarId=&error=` de `/intervenciones`.
 * Vive aparte de `page.tsx` por el mismo motivo que
 * `reportes/parametros.ts`: aca se interpreta la URL, alla se compone la
 * pantalla.
 */
export type ParametrosDeIntervenciones = {
  filtros: FiltrosDeIntervenciones;
  error: string | undefined;
};

/**
 * Cada campo cae a `undefined` por su cuenta con `.catch()`, no con un
 * `safeParse` de todo el objeto: el `<form>` manda los tres filtros juntos y
 * la opcion "Todos" de cada `<select>` sale con `value=""`, asi que un campo
 * vacio no puede descartar los otros dos. `?estado=a&estado=b` cae por el
 * mismo `.catch()`, sin un chequeo aparte.
 */
const esquemaDeParametros = z.object({
  estado: z.enum(ESTADOS_DE_INTERVENCION).optional().catch(undefined),
  tipo: z.enum(TIPOS_DE_INTERVENCION).optional().catch(undefined),
  lugarId: z.string().trim().uuid().optional().catch(undefined),
  error: z.string().optional().catch(undefined),
});

export const leerParametros = (
  searchParams: Record<string, string | string[] | undefined>,
): ParametrosDeIntervenciones => {
  // Cada campo ya cae solo con `.catch()`: este parse no falla.
  const datos = esquemaDeParametros.parse(searchParams);

  const filtros: FiltrosDeIntervenciones = {
    ...(datos.estado ? { estado: datos.estado } : {}),
    ...(datos.tipo ? { tipo: datos.tipo } : {}),
    ...(datos.lugarId ? { lugarId: datos.lugarId } : {}),
  };

  return { filtros, error: datos.error };
};

/**
 * Nombra cada filtro aplicado para el vacio por filtro, mismo criterio que
 * `descripcionDeFiltrosDeReportes`: sin esto, una bandeja vacia por `estado`
 * o `tipo` no decia por que.
 */
export const descripcionDeFiltrosDeIntervenciones = ({
  estado,
  tipo,
  lugarId,
}: FiltrosDeIntervenciones): string | undefined => {
  const partes = [
    estado ? `estado "${estado}"` : null,
    tipo ? `tipo "${tipo}"` : null,
    lugarId ? "lugar elegido" : null,
  ].filter((parte) => parte !== null);

  return partes.length > 0 ? partes.join(", ") : undefined;
};
