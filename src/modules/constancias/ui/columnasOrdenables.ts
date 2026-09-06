import {
  createColumnHelper,
  createTable,
  getCoreRowModel,
  type SortingState,
} from "@tanstack/table-core";
import type { ColumnaDeTabla } from "@/shared/ui";
import type {
  ConstanciaGuardada,
  FiltrosDeListado,
} from "../application/puertos";
import type { OrdenDeConstancias } from "../domain";
import { construirHrefDeListado } from "./hrefsDeListado";

const columnHelper = createColumnHelper<ConstanciaGuardada>();

/**
 * "folio" y "emitida" son las dos columnas del listado y las dos tienen
 * orden natural (`domain/ordenDeConstancias.ts`). `sortDescFirst: false`
 * -motivo en `reportes/ui/columnasOrdenables.ts`.
 */
const COLUMNAS_TANSTACK = [
  columnHelper.accessor("folio", {
    id: "folio",
    enableSorting: true,
    sortDescFirst: false,
  }),
  columnHelper.accessor("emitidaEn", {
    id: "emitida",
    enableSorting: true,
    sortDescFirst: false,
  }),
];

/**
 * La tabla de `@tanstack/table-core` con el estado de orden ya puesto -sin
 * esto, `resolverOrdenDeColumnas` pasaba las 30 lineas de la metrica de
 * `AGENTS.md` (hallazgo del revisor de IA sobre esta rebanada).
 */
const tablaDeOrden = (orden: OrdenDeConstancias | undefined) => {
  const sorting: SortingState = orden
    ? [{ id: orden.campo, desc: orden.direccion === "desc" }]
    : [];

  return createTable({
    data: [] as ConstanciaGuardada[],
    columns: COLUMNAS_TANSTACK,
    state: { sorting },
    onStateChange: () => {},
    renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(),
    enableSortingRemoval: false,
  });
};

/**
 * Resuelve el estado de orden de cada columna con `@tanstack/table-core`
 * -el nucleo sin React de TanStack Table- corriendo en el Server Component
 * (`design.md`, "Ordenamiento de columnas"): el estado sale de
 * `parametros.orden`, que ya vino de `?ordenar=&direccion=` en la URL.
 * `@tanstack/react-table` no se usa -pide `"use client"`.
 *
 * No ordena filas: esas ya llegan ordenadas por SQL
 * (`listadoDeConstanciasSql.ts`). `data: []` alcanza porque esta funcion
 * solo lee el estado de las columnas, nunca `table.getRowModel()`.
 */
export function resolverOrdenDeColumnas(
  columnasBase: readonly ColumnaDeTabla[],
  parametros: {
    orden?: OrdenDeConstancias | undefined;
    filtros?: FiltrosDeListado | undefined;
    q?: string | undefined;
  },
): readonly ColumnaDeTabla[] {
  const table = tablaDeOrden(parametros.orden);

  return columnasBase.map((columna) => {
    const columnaTanstack = table.getColumn(columna.clave);
    if (!columnaTanstack?.getCanSort()) return columna;

    const siguiente = columnaTanstack.getNextSortingOrder() || "asc";

    return {
      ...columna,
      orden: {
        activa: columnaTanstack.getIsSorted(),
        href: construirHrefDeListado({
          filtros: parametros.filtros,
          q: parametros.q,
          orden: {
            campo: columna.clave as OrdenDeConstancias["campo"],
            direccion: siguiente,
          },
        }),
      },
    };
  });
}
