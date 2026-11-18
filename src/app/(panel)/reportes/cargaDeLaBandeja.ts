import {
  buscarReportes,
  type ConteosDeReportes,
  contarReportes,
  type FiltrosDeLaBandeja,
  type FiltrosDeListado,
  listarReportes,
  type OrdenDeReportes,
  type ReporteDeBandeja,
} from "@/modules/reportes";
import {
  comoLugarId,
  type LugarGuardado,
  listarLugares,
  subarbol,
} from "@/modules/territorio";
import { opcionesDeLugares } from "@/modules/territorio/ui/opciones";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { OpcionDeLista } from "@/shared/ui";

/**
 * Lo que la bandeja necesita del territorio para sus filtros de S2: las
 * opciones del `<select>` de lugar y el subarbol del lugar elegido.
 *
 * Vive aca y no en `reportes` porque esta pagina es el unico lugar
 * autorizado a componer dos modulos: `reportes` no importa `territorio` -iria
 * contra el antipatron 8-, recibe el conjunto de ids ya resuelto.
 *
 * El `?lugar=` se valida contra los lugares **del propio municipio**: uno de
 * otro tenant, o inventado, no entra a los filtros y la bandeja se lee sin
 * ese filtro. RLS impide de todos modos que aparezca una fila ajena; esto
 * impide ademas que un id pegado a mano deje la pantalla vacia sin decir por
 * que.
 */
export type FiltrosDeTerritorio = {
  /** Las opciones del `<select>`, rotuladas por el propio modulo. */
  readonly opciones: readonly OpcionDeLista[];
  /** `id` y nombre de cada lugar, para nombrar el filtro en el vacio. */
  readonly lugares: readonly { id: string; nombre: string }[];
  /** El lugar elegido y su subarbol; `undefined` es «sin filtro de lugar». */
  readonly lugarIds?: readonly string[];
};

const idsDelSubarbol = async (
  lugar: LugarGuardado,
  contexto: ContextoActual,
): Promise<readonly string[]> => {
  const nodos = await subarbol(comoLugarId(lugar.id), contexto, {
    soloLugares: true,
  });

  return [
    String(lugar.id),
    ...nodos.flatMap((nodo) =>
      nodo.clase === "lugar" ? [String(nodo.id)] : [],
    ),
  ];
};

export async function cargarFiltrosDeTerritorio(
  filtros: FiltrosDeLaBandeja,
  contexto: ContextoActual,
): Promise<FiltrosDeTerritorio> {
  const lugares = await listarLugares(contexto);
  const elegido = filtros.lugar
    ? lugares.find((lugar) => String(lugar.id) === filtros.lugar)
    : undefined;

  return {
    opciones: opcionesDeLugares(lugares),
    lugares: lugares.map((lugar) => ({
      id: String(lugar.id),
      nombre: lugar.nombre,
    })),
    ...(elegido ? { lugarIds: await idsDelSubarbol(elegido, contexto) } : {}),
  };
}

export type LecturaDeLaBandeja = {
  readonly reportes: readonly ReporteDeBandeja[];
  readonly hayMas: boolean;
  /** Los conteos **sin** el estado: lo que abriria cada pestaña (S2). */
  readonly conteosPorEstado: ConteosDeReportes;
  /** Los conteos **sin** el area: lo que queda detras de cada opcion (S2). */
  readonly conteosPorArea: ConteosDeReportes;
  /** Los reportes atrasados con los otros filtros puestos (S1). */
  readonly totalDeAtrasados: number;
};

/** El corte de atrasados, que ya viene calculado por la pagina. */
const conCorte = (
  filtros: FiltrosDeListado,
  corte: string,
): FiltrosDeListado => ({ ...filtros, atrasadosDesde: corte });

/**
 * Los filtros de una pestaña de estado: el estado se quita y el resto se
 * conserva -el corte de atrasados incluido, cuando el interruptor esta
 * puesto-, porque la pestaña dice cuantos reportes abriria **con lo que ya
 * esta filtrado**. Con el interruptor apagado no lleva corte: un reporte que
 * no esta atrasado tiene que contar en su pestaña.
 */
export function filtrosSinEstado(filtros: FiltrosDeListado): FiltrosDeListado {
  const { estado: _estado, ...resto } = filtros;

  return resto;
}

/**
 * Los filtros de una opcion de area: el area se quita y el estado se
 * conserva, porque el conteo dice cuantos quedarian si se eligiera esa area
 * dentro de la pestaña en la que se esta.
 */
export function filtrosSinArea(filtros: FiltrosDeListado): FiltrosDeListado {
  const { area: _area, ...resto } = filtros;

  return resto;
}

/**
 * El listado y los tres conteos de la banda, juntos y con los mismos
 * filtros: son cuatro lecturas del mismo conjunto, asi que van en un solo
 * `Promise.all` y no pueden divergir -lo que la tabla muestra y lo que los
 * numeros dicen-. `lugarIds` ya viene resuelto por
 * `cargarFiltrosDeTerritorio`.
 *
 * `corte` se usa para el numero del interruptor, que dice cuantos atrasados
 * hay aunque este apagado. Los conteos de las pestañas y de las areas siguen a
 * `datos.filtros`, que ya trae el corte solo cuando la operadora encendio el
 * interruptor (`filtrosDeLaConsulta`).
 */
export async function leerLaBandeja(datos: {
  filtros: FiltrosDeListado;
  cadena: string | undefined;
  contexto: ContextoActual;
  /** La fecha civil de corte del umbral del municipio (`fechaDeCorte`). */
  corte: string;
  limite?: number | undefined;
  orden?: OrdenDeReportes | undefined;
}): Promise<LecturaDeLaBandeja> {
  const opcionesDeListado = {
    ...(datos.limite ? { limite: datos.limite } : {}),
    ...(datos.orden ? { orden: datos.orden } : {}),
  };
  const cadena = datos.cadena ? { cadena: datos.cadena } : {};
  const conFiltros = (filtros: FiltrosDeListado) =>
    contarReportes({ filtros, ...cadena }, datos.contexto);

  const [listado, conteosPorEstado, conteosPorArea, deAtrasados] =
    await Promise.all([
      datos.cadena
        ? buscarReportes(datos.cadena, datos.contexto, {
            filtros: datos.filtros,
            ...opcionesDeListado,
          })
        : listarReportes(datos.filtros, datos.contexto, opcionesDeListado),
      conFiltros(filtrosSinEstado(datos.filtros)),
      conFiltros(filtrosSinArea(datos.filtros)),
      conFiltros(conCorte(datos.filtros, datos.corte)),
    ]);

  return {
    ...listado,
    conteosPorEstado,
    conteosPorArea,
    totalDeAtrasados: deAtrasados.total,
  };
}

/**
 * Los filtros de la URL convertidos a los de la consulta: el `?lugar=` se
 * cambia por los ids de su subarbol y el `?atrasados=1` por la fecha civil de
 * corte que ya se calculo. Es una funcion pura para que la traduccion -y sus
 * omisiones- se pueda probar sin levantar la pantalla.
 */
export function filtrosDeLaConsulta(datos: {
  filtros: FiltrosDeLaBandeja;
  lugarIds?: readonly string[] | undefined;
  atrasadosDesde?: string | undefined;
}): FiltrosDeListado {
  const { estado, tipo, area } = datos.filtros;

  return {
    ...(estado ? { estado } : {}),
    ...(tipo ? { tipo } : {}),
    ...(area ? { area } : {}),
    ...(datos.lugarIds ? { lugarIds: datos.lugarIds } : {}),
    ...(datos.atrasadosDesde ? { atrasadosDesde: datos.atrasadosDesde } : {}),
  };
}
