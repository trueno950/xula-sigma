import type { NodoSeleccionado, PasoDeMigaja } from "@/modules/territorio";
import type {
  LugarGuardado,
  NodoDeSubarbol,
} from "@/modules/territorio/application/puertos";
import { etiquetaDeTipo } from "@/modules/territorio/ui/etiquetaDeTipo";
import { pasosDeMigaja } from "@/modules/territorio/ui/vistaDePanel";
import { Migaja } from "@/shared/ui";

/** Las props de `PaginaDePanel` que decide el lugar abierto. */
type Cabecera = {
  titulo: string;
  etiqueta?: string;
  migaja?: React.ReactNode;
};

/**
 * La cadena de ancestros del lugar, de la raiz al nodo: Tepakan > Colonia
 * Centro > [lugar]. Sin `?nodo=` o con la raiz como nodo, solo la raiz.
 */
const cadenaDe = (
  raiz: Pick<LugarGuardado, "id" | "nombre">,
  nodos: readonly NodoDeSubarbol[],
  nodo: NodoSeleccionado,
): PasoDeMigaja[] => {
  const porId = new Map(nodos.map((n) => [n.id, n]));
  const cadena: PasoDeMigaja[] = [{ id: nodo.id, nombre: nodo.nombre }];
  let actual: NodoDeSubarbol | undefined =
    nodo.id === raiz.id ? undefined : porId.get(nodo.id);

  while (actual && actual.clase === "lugar" && actual.padreId) {
    const padre = porId.get(actual.padreId);
    if (padre?.clase !== "lugar") break;
    cadena.unshift({ id: padre.id, nombre: padre.nombre });
    actual = padre;
  }

  if (nodo.id !== raiz.id) cadena.unshift({ id: raiz.id, nombre: raiz.nombre });

  return cadena;
};

/**
 * El titulo, la etiqueta de tipo y la migaja de la pagina. En el listado de
 * raices el titulo es "Territorio" y no hay migaja: es el primer eslabon.
 * Dentro de un lugar el titulo es el lugar -la pantalla ya dice donde esta-
 * y el primer eslabon de la migaja sigue siendo "Territorio".
 */
export const cabeceraDeLugar = (
  raiz: Pick<LugarGuardado, "id" | "nombre"> | null,
  nodos: readonly NodoDeSubarbol[],
  nodo: NodoSeleccionado | null,
): Cabecera => {
  if (!raiz || !nodo) return { titulo: "Territorio" };

  return {
    titulo: nodo.nombre,
    etiqueta: etiquetaDeTipo(nodo.tipo),
    migaja: (
      <Migaja
        pasos={pasosDeMigaja(raiz.id, cadenaDe(raiz, nodos, nodo))}
        etiqueta="Ubicación"
      />
    ),
  };
};
