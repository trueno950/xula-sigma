import {
  type DetalleDeCalle,
  detallesDeCalles,
  type NodoSeleccionado,
} from "@/modules/territorio";
import { vistaVisibleDeLugar } from "@/modules/territorio/ui/vistaDePanel";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import type { ParametrosDeTerritorio } from "./parametros";

type Entrada = {
  contexto: ContextoActual;
  parametros: Pick<ParametrosDeTerritorio, "vista">;
  nodo: NodoSeleccionado | null;
};

/**
 * La zona y los domicilios de cada calle, para la tabla de la pestana Calles
 * (S8 de `odd/tasks/territorio-ux.md`).
 *
 * Se lee una sola vez por pantalla y solo cuando esa pestana se muestra: es
 * un agregado de tres tablas que nadie mas mira. Mismo criterio que las
 * cuentas de `cargaDeTerritorio.ts`: si falla, la lista sale sin las dos
 * columnas en vez de tumbar la pantalla, y un `NoAutorizadoError` se
 * relanza porque ese si es un veredicto (`errores.ts`).
 */
export const cargarDetallesDeCalles = async ({
  contexto,
  parametros,
  nodo,
}: Entrada): Promise<readonly DetalleDeCalle[] | undefined> => {
  if (!nodo || vistaVisibleDeLugar(parametros.vista, nodo.tipo) !== "calles") {
    return undefined;
  }

  try {
    return await detallesDeCalles(nodo.id, contexto);
  } catch (error) {
    if (error instanceof NoAutorizadoError) throw error;
    console.error(
      "[territorio] no se pudieron leer las zonas y domicilios de las calles",
      datosSegurosDeError(error),
    );

    return undefined;
  }
};
