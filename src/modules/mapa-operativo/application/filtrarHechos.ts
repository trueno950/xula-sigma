import {
  comoIdDeIntervencionEnMapa,
  comoIdDeReporteEnMapa,
  ESTADOS_DE_INTERVENCION_PARA_FILTRO,
  ESTADOS_DE_REPORTE_PARA_FILTRO,
  etiquetaDeFiltro,
  type IdDeIntervencionEnMapa,
  type IdDeReporteEnMapa,
  TIPOS_DE_INTERVENCION_PARA_FILTRO,
  TIPOS_DE_REPORTE_PARA_FILTRO,
} from "../domain";
import { diasDeAtrasoEnElMapa } from "../domain/atraso";
import type {
  FiltrosDeMapa,
  IntervencionParaMapaOperativo,
  ReporteParaMapaOperativo,
} from "./puertos";

/** El umbral del municipio y el dia civil de hoy, para la senal de atraso. */
export type AtrasoDelMapa = { umbral: number; hoy: string };

export type Hecho =
  | {
      recurso: "REPORTE";
      id: IdDeReporteEnMapa;
      calleId: string | null;
      /** El lugar propio del hecho; ver `territorioElegido.ts`, `lugarDelHecho`. */
      lugarId: string;
      etiqueta: string;
      tipo: string;
      estado: string;
      /** Dias sin atender, o `null`: ver `domain/atraso.ts`. */
      diasDeAtraso: number | null;
    }
  | {
      recurso: "INTERVENCION";
      id: IdDeIntervencionEnMapa;
      calleId: string | null;
      lugarId: string;
      etiqueta: string;
      tipo: string;
      estado: string;
      diasDeAtraso: number | null;
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

export function filtrarReportes(
  reportes: readonly ReporteParaMapaOperativo[],
  filtros: FiltrosDeMapa,
  atraso: AtrasoDelMapa,
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
      recurso: "REPORTE" as const,
      id: comoIdDeReporteEnMapa(r.id),
      calleId: r.calleId,
      lugarId: r.lugarId,
      etiqueta: r.folio,
      tipo: r.tipo,
      estado: r.estado,
      diasDeAtraso: diasDeAtrasoEnElMapa({
        estado: r.estado,
        fechaDeRegistro: r.fechaDeRegistro,
        hoy: atraso.hoy,
        umbral: atraso.umbral,
      }),
    }));
}

export function filtrarIntervenciones(
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
      recurso: "INTERVENCION" as const,
      id: comoIdDeIntervencionEnMapa(i.id),
      calleId: i.calleId,
      lugarId: i.lugarId,
      etiqueta: etiquetaDeFiltro(i.tipo),
      tipo: i.tipo,
      estado: i.estado,
      // Una obra no esta "sin atender": no hay nada que la marque con el
      // umbral de los reportes ciudadanos.
      diasDeAtraso: null,
    }));
}
