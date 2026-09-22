import type { ContextoActual } from "@/shared/auth/contexto";
import {
  type CoberturaFaltante,
  ESTADOS_DE_INTERVENCION_PARA_FILTRO,
  ESTADOS_DE_REPORTE_PARA_FILTRO,
  type MapaOperativoAgregado,
  type MarcadorDeMapa,
  type PuntoDeMapa,
  type RecursoDeMapa,
  TIPOS_DE_INTERVENCION_PARA_FILTRO,
  TIPOS_DE_REPORTE_PARA_FILTRO,
} from "../domain";
import type {
  CalleParaMapaOperativo,
  FiltrosDeMapa,
  FuentesDeMapa,
  IntervencionParaMapaOperativo,
  ReporteParaMapaOperativo,
} from "./puertos";

type Hecho = {
  id: string;
  calleId: string | null;
  recurso: RecursoDeMapa;
  etiqueta: string;
};

const coincide = (valor: string, filtro: string | undefined) =>
  !filtro || valor === filtro;
/**
 * Si el valor de filtro no pertenece al vocabulario de este recurso, el
 * filtro no le aplica -no lo excluye-: evita que elegir p.ej. un estado de
 * intervencion vacie los reportes en silencio.
 */
const coincideSiAplica = (
  valor: string,
  filtro: string | undefined,
  vocabulario: readonly string[],
) => !filtro || !vocabulario.includes(filtro) || valor === filtro;
const hrefDe = (recurso: RecursoDeMapa, id: string) =>
  recurso === "REPORTE" ? `/reportes/detalle/${id}` : `/intervenciones/${id}`;

function filtrarReportes(
  reportes: readonly ReporteParaMapaOperativo[],
  filtros: FiltrosDeMapa,
): readonly Hecho[] {
  return reportes
    .filter(
      (r) =>
        coincideSiAplica(r.tipo, filtros.tipo, TIPOS_DE_REPORTE_PARA_FILTRO) &&
        coincideSiAplica(
          r.estado,
          filtros.estado,
          ESTADOS_DE_REPORTE_PARA_FILTRO,
        ) &&
        coincide(r.areaResponsable ?? "", filtros.area),
    )
    .map((r) => ({
      id: r.id,
      calleId: r.calleId,
      recurso: "REPORTE" as const,
      etiqueta: r.folio,
    }));
}

function filtrarIntervenciones(
  intervenciones: readonly IntervencionParaMapaOperativo[],
  filtros: FiltrosDeMapa,
): readonly Hecho[] {
  return intervenciones
    .filter(
      (i) =>
        !filtros.area &&
        coincideSiAplica(
          i.tipo,
          filtros.tipo,
          TIPOS_DE_INTERVENCION_PARA_FILTRO,
        ) &&
        coincideSiAplica(
          i.estado,
          filtros.estado,
          ESTADOS_DE_INTERVENCION_PARA_FILTRO,
        ),
    )
    .map((i) => ({
      id: i.id,
      calleId: i.calleId,
      recurso: "INTERVENCION" as const,
      etiqueta: i.tipo,
    }));
}

function clasificar(
  hechos: readonly Hecho[],
  puntos: ReadonlyMap<string, CalleParaMapaOperativo>,
): { marcadores: MarcadorDeMapa[]; cobertura: CoberturaFaltante[] } {
  const marcadores: MarcadorDeMapa[] = [];
  const cobertura: CoberturaFaltante[] = [];
  for (const hecho of hechos) {
    const calle = hecho.calleId ? puntos.get(hecho.calleId) : undefined;
    const base = {
      id: hecho.id,
      recurso: hecho.recurso,
      etiqueta: hecho.etiqueta,
      href: hrefDe(hecho.recurso, hecho.id),
    };
    const punto: PuntoDeMapa | null | undefined = calle?.punto;
    if (punto) {
      marcadores.push({ ...base, punto });
    } else {
      cobertura.push({
        ...base,
        razon: hecho.calleId ? "CALLE_SIN_PUNTO" : "SIN_CALLE",
      });
    }
  }
  return { marcadores, cobertura };
}

const contar = (hechos: readonly Hecho[]) => ({
  reportes: hechos.filter((h) => h.recurso === "REPORTE").length,
  intervenciones: hechos.filter((h) => h.recurso === "INTERVENCION").length,
  total: hechos.length,
});

export function crearAgregarMapa(fuentes: FuentesDeMapa) {
  return async function agregarMapa(
    contexto: ContextoActual,
    filtros: FiltrosDeMapa,
  ): Promise<MapaOperativoAgregado> {
    const [calles, reportes, intervenciones] = await Promise.all([
      fuentes.callesParaMapa(contexto),
      fuentes.reportesParaMapa(contexto),
      fuentes.intervencionesParaMapa(contexto),
    ]);
    const puntos = new Map(calles.map((calle) => [calle.id, calle]));
    const hechos = [
      ...filtrarReportes(reportes, filtros),
      ...filtrarIntervenciones(intervenciones, filtros),
    ];
    const { marcadores, cobertura } = clasificar(hechos, puntos);
    const conteos = contar(hechos);
    return {
      estado: conteos.total === 0 ? "VACIO" : "CON_DATOS",
      marcadores,
      cobertura,
      conteos,
    };
  };
}
