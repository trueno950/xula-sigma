import type { ContextoActual } from "@/shared/auth/contexto";
import { hoyEnMerida } from "@/shared/lib/fecha";
import type { MapaOperativoAgregado } from "../domain";
import {
  agruparCallesSinUbicar,
  cajaDePuntos,
  construirLeyenda,
} from "../domain";
import {
  type AtrasoDelMapa,
  filtrarIntervenciones,
  filtrarReportes,
  type Hecho,
} from "./filtrarHechos";
import { clasificar } from "./marcadores";
import type {
  CalleParaMapaOperativo,
  CalleSinPuntoParaMapaOperativo,
  FiltrosDeMapa,
  FuentesDeMapa,
  IntervencionParaMapaOperativo,
  ReporteParaMapaOperativo,
  TerritorioParaMapaOperativo,
} from "./puertos";
import {
  callesDelTerritorio,
  filtrarPorTerritorio,
  raizElegida,
} from "./territorioElegido";

type LecturasDelMapa = {
  calles: readonly CalleParaMapaOperativo[];
  callesSinUbicar: readonly CalleSinPuntoParaMapaOperativo[];
  reportes: readonly ReporteParaMapaOperativo[];
  intervenciones: readonly IntervencionParaMapaOperativo[];
  territorios: readonly TerritorioParaMapaOperativo[];
  raiz: TerritorioParaMapaOperativo | null;
  permitidos: ReadonlySet<string> | null;
  territorioDeLugar: ReadonlyMap<string, string>;
  atraso: AtrasoDelMapa;
};

/** Los descendientes de cada raiz consultada, por id de raiz. */
type Subarboles = ReadonlyMap<string, readonly string[]>;

const contar = (hechos: readonly Hecho[]) => ({
  reportes: hechos.filter((h) => h.recurso === "REPORTE").length,
  intervenciones: hechos.filter((h) => h.recurso === "INTERVENCION").length,
  total: hechos.length,
});

const puntosUbicados = (calles: readonly CalleParaMapaOperativo[]) =>
  calles.flatMap((calle) => (calle.punto ? [calle.punto] : []));

/**
 * `null` es «todo el municipio», y tambien lo es cualquier lugar que no sea
 * una raiz (`raizElegida`): no se filtra. El conjunto lleva la raiz ademas de
 * sus descendientes porque `subarbol` no devuelve la raiz misma.
 */
const permitidosDe = (
  raiz: TerritorioParaMapaOperativo | null,
  subarboles: Subarboles,
): ReadonlySet<string> | null =>
  raiz === null ? null : new Set([raiz.id, ...(subarboles.get(raiz.id) ?? [])]);

/**
 * Una lectura del subarbol por raiz consultada: con `?lugar=` alcanza una, y
 * sin el son las raices del municipio -la cabecera y sus comisarias-, porque
 * cada pin declara a que territorio pertenece su calle.
 */
async function subarbolesDe(
  fuentes: FuentesDeMapa,
  contexto: ContextoActual,
  raices: readonly TerritorioParaMapaOperativo[],
): Promise<Subarboles> {
  const entradas = await Promise.all(
    raices.map(
      async (raiz) =>
        [raiz.id, await fuentes.lugaresDelSubarbol(contexto, raiz.id)] as const,
    ),
  );
  return new Map(entradas);
}

/**
 * El nombre de la raiz de cada lugar, para que la fila de una calle diga a que
 * territorio pertenece. Un lugar que no cuelga de ninguna raiz consultada no
 * aparece: la fila omite el territorio antes que inventarlo.
 */
function territorioDeLugar(
  raices: readonly TerritorioParaMapaOperativo[],
  subarboles: Subarboles,
): ReadonlyMap<string, string> {
  const porLugar = new Map<string, string>();
  for (const raiz of raices) {
    porLugar.set(raiz.id, raiz.nombre);
    for (const lugarId of subarboles.get(raiz.id) ?? []) {
      if (!porLugar.has(lugarId)) porLugar.set(lugarId, raiz.nombre);
    }
  }
  return porLugar;
}

/**
 * Las cuatro lecturas del mapa se piden juntas; el subarbol espera a las
 * raices, porque es una raiz -y no un id cualquiera de la URL- la que decide
 * que se consulta.
 */
async function leerMapa(
  fuentes: FuentesDeMapa,
  contexto: ContextoActual,
  lugar: string | undefined,
): Promise<LecturasDelMapa> {
  const [
    calles,
    callesSinUbicar,
    reportes,
    intervenciones,
    territorios,
    umbral,
  ] = await Promise.all([
    fuentes.callesParaMapa(contexto),
    fuentes.callesSinUbicar(contexto),
    fuentes.reportesParaMapa(contexto),
    fuentes.intervencionesParaMapa(contexto),
    fuentes.territoriosParaMapa(contexto),
    fuentes.umbralDeAtraso(contexto),
  ]);
  const raiz = raizElegida(territorios, lugar);
  const raices = raiz ? [raiz] : territorios;
  const subarboles = await subarbolesDe(fuentes, contexto, raices);
  return {
    calles,
    callesSinUbicar,
    reportes,
    intervenciones,
    territorios,
    raiz,
    permitidos: permitidosDe(raiz, subarboles),
    territorioDeLugar: territorioDeLugar(raices, subarboles),
    atraso: { umbral, hoy: hoyEnMerida() },
  };
}

function componerMapa(
  {
    calles,
    callesSinUbicar,
    reportes,
    intervenciones,
    territorios,
    raiz,
    permitidos,
    territorioDeLugar,
    atraso,
  }: LecturasDelMapa,
  filtros: FiltrosDeMapa,
): MapaOperativoAgregado {
  const puntos = new Map(calles.map((calle) => [calle.id, calle]));
  const hechos = filtrarPorTerritorio(
    [
      ...filtrarReportes(reportes, filtros, atraso),
      ...filtrarIntervenciones(intervenciones, filtros),
    ],
    puntos,
    permitidos,
  );
  const { marcadores, cobertura } = clasificar(
    hechos,
    puntos,
    territorioDeLugar,
  );
  const conteos = contar(hechos);
  return {
    estado: conteos.total === 0 ? "VACIO" : "CON_DATOS",
    territorios,
    territorioElegido: raiz,
    caja: cajaDePuntos(puntosUbicados(callesDelTerritorio(calles, permitidos))),
    marcadores,
    cobertura,
    conteos,
    leyenda: construirLeyenda(hechos),
    sinUbicar: agruparCallesSinUbicar({ calles: callesSinUbicar, permitidos }),
  };
}

export function crearAgregarMapa(fuentes: FuentesDeMapa) {
  return async function agregarMapa(
    contexto: ContextoActual,
    filtros: FiltrosDeMapa,
  ): Promise<MapaOperativoAgregado> {
    const lecturas = await leerMapa(fuentes, contexto, filtros.lugar);
    return componerMapa(lecturas, filtros);
  };
}
