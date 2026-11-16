import {
  buscarReportes,
  type ConteosDeReportes,
  contarReportes,
  type FiltrosDeLaBandeja,
  type FiltrosDeListado,
  listarReportes,
  type OrdenDeReportes,
  type ReporteGuardado,
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
  readonly reportes: readonly ReporteGuardado[];
  readonly hayMas: boolean;
  readonly conteos: ConteosDeReportes;
};

/**
 * El listado y los conteos, juntos y con los mismos filtros: son dos
 * lecturas del mismo conjunto, asi que van en un solo `Promise.all` y no
 * pueden divergir -lo que la tabla muestra y lo que los numeros dicen-.
 * `lugarIds` ya viene resuelto por `cargarFiltrosDeTerritorio`.
 */
export async function leerLaBandeja(datos: {
  filtros: FiltrosDeListado;
  cadena: string | undefined;
  contexto: ContextoActual;
  limite?: number | undefined;
  orden?: OrdenDeReportes | undefined;
}): Promise<LecturaDeLaBandeja> {
  const opcionesDeListado = {
    ...(datos.limite ? { limite: datos.limite } : {}),
    ...(datos.orden ? { orden: datos.orden } : {}),
  };
  const opcionesDeConteo = {
    filtros: datos.filtros,
    ...(datos.cadena ? { cadena: datos.cadena } : {}),
  };

  const [listado, conteos] = await Promise.all([
    datos.cadena
      ? buscarReportes(datos.cadena, datos.contexto, {
          filtros: datos.filtros,
          ...opcionesDeListado,
        })
      : listarReportes(datos.filtros, datos.contexto, opcionesDeListado),
    contarReportes(opcionesDeConteo, datos.contexto),
  ]);

  return { ...listado, conteos };
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
