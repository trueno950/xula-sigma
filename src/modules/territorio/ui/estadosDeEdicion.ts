import { puedeTenerCatalogoDeCalles } from "../domain";
import {
  type EstadoDeAccion,
  estadoDeBajaDeLugar,
  estadoDeMover,
} from "./bloqueosDeLugar";
import { hijosDirectosDe, type PropsDeContenido } from "./contenido";
import type { AccionDeNodo, NodoSeleccionado, TabDeLugar } from "./PanelDeNodo";
import { vistaVisibleDeLugar } from "./vistaDePanel";

export type ClaveDeEdicion = Extract<
  AccionDeNodo,
  "renombrar" | "reparentear" | "baja"
>;

/**
 * De que lugar cuelga este, para poder subir cuando se da de baja. La raiz
 * del arbol no esta en el subarbol y no cuelga de nada: `undefined`.
 */
export const padreDe = (
  nodos: PropsDeContenido["nodos"],
  lugarId: PropsDeContenido["lugar"]["id"],
) => {
  const propio = nodos.find((nodo) => nodo.id === lugarId);

  return propio?.clase === "lugar" ? (propio.padreId ?? undefined) : undefined;
};

/** Los domicilios del subarbol del lugar, o `undefined` si no se contaron. */
export const domiciliosDe = ({
  lugar,
  conteos,
}: Pick<PropsDeContenido, "lugar" | "conteos">) =>
  conteos?.find((cuenta) => cuenta.lugarId === lugar.id)?.domicilios;

/** El estado de cada accion de Editar con lo que la pagina ya leyo. */
export const estadosDeEdicion = ({
  lugar,
  nodos,
  calles,
  lugares,
  conteos,
  zonasDelLugar,
}: PropsDeContenido): Record<ClaveDeEdicion, EstadoDeAccion> => {
  const domicilios = domiciliosDe({ lugar, conteos });

  return {
    renombrar: { clase: "disponible" },
    reparentear: estadoDeMover({
      lugar,
      lugares,
      padre: padreDe(nodos, lugar.id),
      domicilios,
    }),
    baja: estadoDeBajaDeLugar({
      hijos: hijosDirectosDe(nodos, lugar.id).length,
      domicilios,
      calles: calles.filter((calle) => calle.lugarId === lugar.id).length,
      zonas: zonasDelLugar,
    }),
  };
};

/**
 * Si la pagina tiene que leer las zonas del lugar: solo un asentamiento
 * tiene zonas, y solo la pestana Editar las mira, para la baja.
 */
export const leeZonasDelLugar = (
  vista: TabDeLugar,
  nodo: Pick<NodoSeleccionado, "tipo">,
) =>
  puedeTenerCatalogoDeCalles(nodo.tipo) &&
  vistaVisibleDeLugar(vista, nodo.tipo) === "editar";
