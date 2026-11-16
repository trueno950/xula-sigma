import type { ContextoActual } from "@/shared/auth/contexto";
import type { MapaOperativoAgregado } from "../domain";
import { cajaDePuntos, construirLeyenda } from "../domain";
import {
  filtrarIntervenciones,
  filtrarReportes,
  type Hecho,
} from "./filtrarHechos";
import { clasificar } from "./marcadores";
import type {
  CalleParaMapaOperativo,
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
  reportes: readonly ReporteParaMapaOperativo[];
  intervenciones: readonly IntervencionParaMapaOperativo[];
  territorios: readonly TerritorioParaMapaOperativo[];
  raiz: TerritorioParaMapaOperativo | null;
  permitidos: ReadonlySet<string> | null;
};

const contar = (hechos: readonly Hecho[]) => ({
  reportes: hechos.filter((h) => h.recurso === "REPORTE").length,
  intervenciones: hechos.filter((h) => h.recurso === "INTERVENCION").length,
  total: hechos.length,
});

const puntosUbicados = (calles: readonly CalleParaMapaOperativo[]) =>
  calles.flatMap((calle) => (calle.punto ? [calle.punto] : []));

/**
 * `null` es «todo el municipio», y tambien lo es cualquier lugar que no sea
 * una raiz (`raizElegida`): no se consulta el subarbol ni se filtra. El
 * conjunto lleva la raiz ademas de sus descendientes porque `subarbol` no
 * devuelve la raiz misma.
 */
async function lugaresPermitidos(
  fuentes: FuentesDeMapa,
  contexto: ContextoActual,
  raiz: TerritorioParaMapaOperativo | null,
): Promise<ReadonlySet<string> | null> {
  if (!raiz) return null;
  const descendientes = await fuentes.lugaresDelSubarbol(contexto, raiz.id);
  return new Set([raiz.id, ...descendientes]);
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
  const [calles, reportes, intervenciones, territorios] = await Promise.all([
    fuentes.callesParaMapa(contexto),
    fuentes.reportesParaMapa(contexto),
    fuentes.intervencionesParaMapa(contexto),
    fuentes.territoriosParaMapa(contexto),
  ]);
  const raiz = raizElegida(territorios, lugar);
  const permitidos = await lugaresPermitidos(fuentes, contexto, raiz);
  return { calles, reportes, intervenciones, territorios, raiz, permitidos };
}

function componerMapa(
  {
    calles,
    reportes,
    intervenciones,
    territorios,
    raiz,
    permitidos,
  }: LecturasDelMapa,
  filtros: FiltrosDeMapa,
): MapaOperativoAgregado {
  const puntos = new Map(calles.map((calle) => [calle.id, calle]));
  const hechos = filtrarPorTerritorio(
    [
      ...filtrarReportes(reportes, filtros),
      ...filtrarIntervenciones(intervenciones, filtros),
    ],
    puntos,
    permitidos,
  );
  const { marcadores, cobertura } = clasificar(hechos, puntos);
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
