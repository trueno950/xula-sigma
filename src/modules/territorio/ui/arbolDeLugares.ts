import { normalizarParaBusqueda } from "@/shared/lib/textoDeBusqueda";
import type { LugarId, TipoDeLugar } from "../domain";
import { masAdentroDe } from "./conteo";

/** Lo minimo para dibujar el arbol: lo tienen `LugarGuardado` y el subarbol. */
export type LugarDelArbol = {
  id: LugarId;
  nombre: string;
  tipo: TipoDeLugar;
  padreId: LugarId | null;
};

export type NodoDeArbol = {
  lugar: LugarDelArbol;
  /** La raiz de la que cuelga: `?raiz=` del enlace a su vista. */
  raizId: LugarId;
  nivel: number;
  hijos: readonly NodoDeArbol[];
  /** Cuantos lugares quedan debajo de lo que la fila ya muestra. */
  masAdentro: number;
  /** Si el nombre coincide con la busqueda; sin busqueda, siempre `false`. */
  coincide: boolean;
};

/** Raiz, hijo y nieto: lo que queda debajo se resume en un enlace. */
export const NIVELES_VISIBLES = 3;
/** El mismo cinturon `profundidad < 8` de las consultas de subarbol. */
const NIVEL_MAXIMO = 8;

type Entrada = {
  raices: readonly LugarDelArbol[];
  /** Todos los lugares del municipio: de aca sale que cuelga de que. */
  lugares: readonly LugarDelArbol[];
  busqueda: string | undefined;
};

/**
 * Sin busqueda, el arbol se corta en `NIVELES_VISIBLES`: un municipio con
 * trescientas manzanas volveria la pantalla un scroll infinito. Con
 * busqueda baja hasta el fondo, pero solo por las ramas que llevan a una
 * coincidencia: el operador ve el camino completo y nada mas.
 */
export const armarArbol = ({
  raices,
  lugares,
  busqueda,
}: Entrada): readonly NodoDeArbol[] => {
  const aguja = busqueda ? normalizarParaBusqueda(busqueda) : "";
  const hijosDe = (lugar: LugarDelArbol) =>
    lugares.filter((otro) => otro.padreId === lugar.id);
  const coincideCon = (lugar: LugarDelArbol) =>
    aguja !== "" && normalizarParaBusqueda(lugar.nombre).includes(aguja);

  const construir = (
    lugar: LugarDelArbol,
    raizId: LugarId,
    nivel: number,
  ): NodoDeArbol | null => {
    const base = { lugar, raizId, nivel, coincide: coincideCon(lugar) };

    if (aguja === "" && nivel === NIVELES_VISIBLES - 1) {
      const directos = hijosDe(lugar).map((hijo) => hijo.id);
      return {
        ...base,
        hijos: [],
        masAdentro: directos.length + masAdentroDe(directos, lugares),
      };
    }

    const hijos =
      nivel + 1 >= NIVEL_MAXIMO
        ? []
        : hijosDe(lugar)
            .map((hijo) => construir(hijo, raizId, nivel + 1))
            .filter((nodo): nodo is NodoDeArbol => nodo !== null);

    if (aguja !== "" && !base.coincide && hijos.length === 0) return null;

    return { ...base, hijos, masAdentro: 0 };
  };

  return raices
    .map((raiz) => construir(raiz, raiz.id, 0))
    .filter((nodo): nodo is NodoDeArbol => nodo !== null);
};
