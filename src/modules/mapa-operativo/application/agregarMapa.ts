import type { ContextoActual } from "@/shared/auth/contexto";
import type {
  CoberturaFaltante,
  MapaOperativoAgregado,
  MarcadorDeMapa,
  RazonDeCoberturaFaltante,
} from "../domain";
import { cajaDePuntos } from "../domain";
import {
  filtrarIntervenciones,
  filtrarReportes,
  type Hecho,
} from "./filtrarHechos";
import type {
  CalleParaMapaOperativo,
  FiltrosDeMapa,
  FuentesDeMapa,
} from "./puertos";
import { callesDelTerritorio, filtrarPorTerritorio } from "./territorioElegido";

const hrefDe = (recurso: Hecho["recurso"], id: string) =>
  recurso === "REPORTE" ? `/reportes/detalle/${id}` : `/intervenciones/${id}`;
const historiaHrefDe = (calleId: string) => `/calles/${calleId}/historial`;

function entradaDe(
  hecho: Hecho,
  calle: CalleParaMapaOperativo | undefined,
): { marcador: MarcadorDeMapa } | { cobertura: CoberturaFaltante } {
  const href = hrefDe(hecho.recurso, hecho.id);
  if (calle?.punto) {
    const punto = calle.punto;
    const historiaHref = historiaHrefDe(calle.id);
    return hecho.recurso === "REPORTE"
      ? {
          marcador: {
            recurso: "REPORTE",
            id: hecho.id,
            etiqueta: hecho.etiqueta,
            href,
            punto,
            historiaHref,
          },
        }
      : {
          marcador: {
            recurso: "INTERVENCION",
            id: hecho.id,
            etiqueta: hecho.etiqueta,
            href,
            punto,
            historiaHref,
          },
        };
  }
  const razon: RazonDeCoberturaFaltante = hecho.calleId
    ? "CALLE_SIN_PUNTO"
    : "SIN_CALLE";
  const calleNombre = calle?.nombre ?? null;
  return hecho.recurso === "REPORTE"
    ? {
        cobertura: {
          recurso: "REPORTE",
          id: hecho.id,
          etiqueta: hecho.etiqueta,
          href,
          razon,
          calle: calleNombre,
        },
      }
    : {
        cobertura: {
          recurso: "INTERVENCION",
          id: hecho.id,
          etiqueta: hecho.etiqueta,
          href,
          razon,
          calle: calleNombre,
        },
      };
}

function clasificar(
  hechos: readonly Hecho[],
  puntos: ReadonlyMap<string, CalleParaMapaOperativo>,
): { marcadores: MarcadorDeMapa[]; cobertura: CoberturaFaltante[] } {
  const marcadores: MarcadorDeMapa[] = [];
  const cobertura: CoberturaFaltante[] = [];
  for (const hecho of hechos) {
    const calle = hecho.calleId ? puntos.get(hecho.calleId) : undefined;
    const entrada = entradaDe(hecho, calle);
    if ("marcador" in entrada) marcadores.push(entrada.marcador);
    else cobertura.push(entrada.cobertura);
  }
  return { marcadores, cobertura };
}

const contar = (hechos: readonly Hecho[]) => ({
  reportes: hechos.filter((h) => h.recurso === "REPORTE").length,
  intervenciones: hechos.filter((h) => h.recurso === "INTERVENCION").length,
  total: hechos.length,
});

const puntosUbicados = (calles: readonly CalleParaMapaOperativo[]) =>
  calles.flatMap((calle) => (calle.punto ? [calle.punto] : []));

/**
 * `null` es «todo el municipio», que no consulta el subarbol ni filtra.
 * El conjunto lleva la raiz ademas de sus descendientes porque `subarbol`
 * no devuelve la raiz misma.
 */
async function lugaresPermitidos(
  fuentes: FuentesDeMapa,
  contexto: ContextoActual,
  lugar: string | undefined,
): Promise<ReadonlySet<string> | null> {
  if (!lugar) return null;
  const descendientes = await fuentes.lugaresDelSubarbol(contexto, lugar);
  return new Set([lugar, ...descendientes]);
}

export function crearAgregarMapa(fuentes: FuentesDeMapa) {
  return async function agregarMapa(
    contexto: ContextoActual,
    filtros: FiltrosDeMapa,
  ): Promise<MapaOperativoAgregado> {
    const [calles, reportes, intervenciones, territorios, permitidos] =
      await Promise.all([
        fuentes.callesParaMapa(contexto),
        fuentes.reportesParaMapa(contexto),
        fuentes.intervencionesParaMapa(contexto),
        fuentes.territoriosParaMapa(contexto),
        lugaresPermitidos(fuentes, contexto, filtros.lugar),
      ]);
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
      territorioElegido:
        territorios.find((territorio) => territorio.id === filtros.lugar) ??
        null,
      caja: cajaDePuntos(
        puntosUbicados(callesDelTerritorio(calles, permitidos)),
      ),
      marcadores,
      cobertura,
      conteos,
    };
  };
}
