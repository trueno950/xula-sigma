import {
  createColumnHelper,
  createTable,
  getCoreRowModel,
  type SortingState,
} from "@tanstack/table-core";
import type { ColumnaDeTabla } from "@/shared/ui";
import type { PersonaGuardada } from "../application/puertos";
import type { OrdenDePersonas } from "../domain";
import { construirHrefDeListado } from "./hrefsDeListado";

const columnHelper = createColumnHelper<PersonaGuardada>();

/**
 * Solo "persona" tiene orden natural (`design.md`, "Ordenamiento de
 * columnas": apellido + nombre, el mismo criterio que ya usa `listar` por
 * defecto). CURP no entra -"no todas las columnas ordenan", una columna sin
 * un orden que el operador reconozca no es clicable.
 *
 * `sortDescFirst: false` fuerza que el primer clic sea ascendente: sin esto
 * table-core lo infiere del tipo del primer valor, que es fragil con `data`
 * vacio (abajo).
 */
const COLUMNAS_TANSTACK = [
  columnHelper.accessor(
    (persona) => `${persona.primerApellido} ${persona.nombres}`,
    { id: "persona", enableSorting: true, sortDescFirst: false },
  ),
  columnHelper.accessor("curp", { id: "curp", enableSorting: false }),
];

/**
 * Resuelve el estado de orden de cada columna con `@tanstack/table-core`
 * -el nucleo sin React de TanStack Table- corriendo aca, en el Server
 * Component (`design.md`, "Ordenamiento de columnas"): el estado sale de
 * `parametros.orden`, que ya vino de `?ordenar=&direccion=` en la URL, nunca
 * de un `useState`. `@tanstack/react-table` no se usa -pide `"use client"`.
 *
 * No ordena filas: esas ya llegan ordenadas por SQL
 * (`repositorioDePersonasSql.ts`). `data: []` alcanza porque esta funcion
 * solo lee el estado de las columnas -`getCanSort`, `getIsSorted`,
 * `getNextSortingOrder`-, nunca `table.getRowModel()`.
 *
 * `enableSortingRemoval: false` mantiene el ciclo en dos estados
 * (asc <-> desc): un tercer estado "sin orden" seria identico al orden
 * alfabetico ascendente que `listar` ya usa por defecto, y el operador no
 * tiene forma de distinguirlos en la pantalla.
 */
export function resolverOrdenDeColumnas(
  columnasBase: readonly ColumnaDeTabla[],
  parametros: {
    orden?: OrdenDePersonas | undefined;
    filtro?: string | undefined;
  },
): readonly ColumnaDeTabla[] {
  const sorting: SortingState = parametros.orden
    ? [
        {
          id: parametros.orden.campo,
          desc: parametros.orden.direccion === "desc",
        },
      ]
    : [];

  const table = createTable({
    data: [] as PersonaGuardada[],
    columns: COLUMNAS_TANSTACK,
    state: { sorting },
    onStateChange: () => {},
    renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(),
    enableSortingRemoval: false,
  });

  return columnasBase.map((columna) => {
    const columnaTanstack = table.getColumn(columna.clave);
    if (!columnaTanstack?.getCanSort()) return columna;

    const siguiente = columnaTanstack.getNextSortingOrder() || "asc";

    return {
      ...columna,
      orden: {
        activa: columnaTanstack.getIsSorted(),
        href: construirHrefDeListado({
          filtro: parametros.filtro,
          orden: {
            campo: columna.clave as OrdenDePersonas["campo"],
            direccion: siguiente,
          },
        }),
      },
    };
  });
}
