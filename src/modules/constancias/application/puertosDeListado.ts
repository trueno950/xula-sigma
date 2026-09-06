import type { EstadoDeConstancia, OrdenDeConstancias } from "../domain";

/**
 * Separado de `puertos.ts` por la metrica de lineas por archivo
 * (`AGENTS.md`): filtro, paginacion y orden del listado del panel son un
 * tema propio -`design.md`, "Filtros", "Paginacion", "Ordenamiento de
 * columnas"- y no el contrato de escritura/lectura de una fila de
 * `constancias`. Mismo criterio que `reportes/application/puertosDeListado.ts`.
 */

/**
 * Filtro del listado del panel. Sin `tipo`: `TIPOS_DE_DOCUMENTO` tiene un
 * solo valor hoy (`domain/tipoDeDocumento.ts`), y un filtro sobre una lista
 * cerrada de una sola opcion no deja nada que acotar -se agrega el dia que
 * exista un segundo tipo de documento.
 */
export type FiltrosDeListado = {
  estado?: EstadoDeConstancia;
};

/**
 * `limite`/`orden` de `design.md`, "Paginacion" y "Ordenamiento de
 * columnas", mismo contrato que `OpcionesDeListado` de `reportes`: `limite`
 * ya llega con el `+1` de `resolverPagina` sumado, y `orden` ausente deja
 * el `ORDER BY` por defecto del metodo.
 */
export type OpcionesDeListado = {
  readonly limite: number;
  readonly orden?: OrdenDeConstancias;
};

/**
 * `OpcionesDeListado` mas `filtros`, para que `buscar` siga en 3 parametros
 * (metrica de AGENTS.md: `tx`, `cadena`, `opciones`). `listar` no necesita
 * este empaquetado -recibe `filtros` como su propio parametro.
 */
export type OpcionesDeBusqueda = OpcionesDeListado & {
  readonly filtros?: FiltrosDeListado;
};
