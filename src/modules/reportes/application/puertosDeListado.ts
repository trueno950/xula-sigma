import type {
  AreaResponsable,
  EstadoDeReporte,
  FilaDeConteoDeArea,
  FilaDeConteoDeEstado,
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

/**
 * Los filtros tal como viajan por la URL: es lo que la pantalla puede
 * ofrecer. `lugar` es el `?lugar=` elegido -un lugar de la colonia o de la
 * localidad-, y el conjunto de ids de su subarbol lo resuelve la pagina, que
 * es el unico lugar que puede componer `territorio` con `reportes`.
 */
export type FiltrosDeLaBandeja = {
  estado?: EstadoDeReporte;
  tipo?: TipoDeIncidencia;
  area?: AreaResponsable;
  lugar?: string;
};

/** Filtros del listado del panel: los de la URL mas lo que la pantalla resolvio. RLS acota el resto. */
export type FiltrosDeListado = {
  estado?: EstadoDeReporte;
  tipo?: TipoDeIncidencia;
  area?: AreaResponsable;
  /**
   * El lugar elegido **y su subarbol**, ya resueltos por la pagina con la API
   * publica de `territorio`. Un arreglo vacio es «ese lugar no tiene
   * reportes» -no «sin filtro»-, para que un `?lugar=` de otro municipio no
   * se lea como la bandeja completa.
   */
  lugarIds?: readonly string[];
  /**
   * El filtro «solo atrasados» de S1 de `gestion-municipal`, ya resuelto a
   * una fecha civil de corte (`fechaDeCorte(hoy, umbral)`): un reporte
   * `RECIBIDO` registrado ese dia o antes esta atrasado.
   *
   * Llega como fecha y no como el `?atrasados=1` de la URL a proposito: el
   * corte depende del umbral del municipio y del dia de hoy, asi que
   * calcularlo en el repositorio obligaria a leer la configuracion y el
   * reloj dentro de `infrastructure`. Ausente es «sin filtro»; el umbral no
   * viaja por aca porque el listado no lo necesita para nada mas.
   */
  atrasadosDesde?: string;
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

/**
 * Lo que reciben `contarReportes` y el repositorio: los filtros y, cuando la
 * hay, la busqueda de texto. Los conteos tienen que contar exactamente lo que
 * el listado muestra, asi que comparten las dos condiciones.
 */
export type OpcionesDeConteo = {
  readonly filtros?: FiltrosDeListado;
  readonly cadena?: string;
};

/**
 * Lo que devuelve el `GROUP BY`: solo las filas que existen. Completar los
 * ceros y ordenar es de `domain/conteosDeReportes.ts`, no del repositorio.
 */
export type ConteosCrudos = {
  readonly porEstado: readonly FilaDeConteoDeEstado[];
  readonly porArea: readonly FilaDeConteoDeArea[];
};
