import type {
  EstadoDeReporte,
  OrdenDeReportes,
  TipoDeIncidencia,
} from "../domain";

/**
 * Separado de `puertos.ts` por la metrica de lineas por archivo
 * (`AGENTS.md`): filtro, paginacion y orden del listado del panel son un
 * tema propio -`design.md`, "Filtros", "Paginacion", "Ordenamiento de
 * columnas"- y no el contrato de escritura/lectura de una fila de
 * `reportes`. Sin `ResultadoDeListado` -ese sigue en `puertos.ts` porque
 * depende de `ReporteGuardado`, y traerlo aca cerraria un ciclo entre los
 * dos archivos.
 */

/** Filtros del listado del panel. `estado` y `tipo` opcionales; RLS acota el resto. */
export type FiltrosDeListado = {
  estado?: EstadoDeReporte;
  tipo?: TipoDeIncidencia;
};

/**
 * `limite`/`orden` de `design.md`, "Paginacion" y "Ordenamiento de
 * columnas", mismo contrato que `OpcionesDeListado` de `padron`: `limite`
 * ya llega con el `+1` de `resolverPagina` sumado, y `orden` ausente deja
 * el `ORDER BY` por defecto del metodo.
 */
export type OpcionesDeListado = {
  readonly limite: number;
  readonly orden?: OrdenDeReportes;
};

/**
 * `OpcionesDeListado` mas `filtros`, para que `buscar` siga en 3 parametros
 * (metrica de AGENTS.md: `tx`, `cadena`, `opciones`). `listar` no necesita
 * este empaquetado -recibe `filtros` como su propio parametro- porque ya
 * tenia esa forma antes de esta rebanada y cambiarla rompia el llamador de
 * `app/(panel)/reportes/page.tsx` sin necesidad; `buscar` es nuevo y no
 * tiene esa deuda.
 */
export type OpcionesDeBusqueda = OpcionesDeListado & {
  readonly filtros?: FiltrosDeListado;
};
