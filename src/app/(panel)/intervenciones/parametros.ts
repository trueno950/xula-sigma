import { z } from "zod";
import {
  ESTADOS_DE_INTERVENCION,
  ETIQUETA_DE_ESTADO_DE_INTERVENCION,
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
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
 * Los filtros del tablero sin el estado: es con lo que se piden los conteos
 * de S2. El estado es la estructura -las cuatro columnas-, asi que el conteo
 * de una columna dice cuantas obras tiene con el resto de los filtros puestos,
 * no cuantas tiene la columna que se esta mirando.
 */
export const filtrosSinEstado = (
  filtros: FiltrosDeIntervenciones,
): FiltrosDeIntervenciones => {
  const { estado: _estado, ...resto } = filtros;

  return resto;
};

/**
 * Nombra cada filtro aplicado para el vacio por filtro, mismo criterio que
 * `descripcionDeFiltrosDeReportes`: sin esto, una bandeja vacia por `estado`
 * o `tipo` no decia por que.
 *
 * S5: los filtros se nombran con sus **etiquetas** -«Cancelada», «Fuga»-,
 * nunca con el valor de enum, que es lo que se guarda y lo que viaja en la
 * URL, no lo que lee una persona.
 */
export const descripcionDeFiltrosDeIntervenciones = ({
  estado,
  tipo,
  lugarId,
}: FiltrosDeIntervenciones): string | undefined => {
  const partes = [
    estado ? `estado "${ETIQUETA_DE_ESTADO_DE_INTERVENCION[estado]}"` : null,
    tipo ? `tipo "${ETIQUETA_DE_TIPO_DE_INTERVENCION[tipo]}"` : null,
    lugarId ? "lugar elegido" : null,
  ].filter((parte) => parte !== null);

  return partes.length > 0 ? partes.join(", ") : undefined;
};
