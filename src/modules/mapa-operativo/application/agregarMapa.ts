import {
  ESTADOS_DE_INTERVENCION,
  TIPOS_DE_INTERVENCION,
} from "@/modules/intervenciones";
import { ESTADOS_DE_REPORTE, TIPOS_DE_INCIDENCIA } from "@/modules/reportes";
import type { ContextoActual } from "@/shared/auth/contexto";
import type {
  CoberturaFaltante,
  MapaOperativoAgregado,
  MarcadorDeMapa,
  RecursoDeMapa,
} from "../domain";
import type { FiltrosDeMapa, FuentesDeMapa } from "./puertos";

const coincide = (valor: string, filtro: string | undefined) =>
  !filtro || valor === filtro;
/**
 * `tipo` y `estado` son un solo filtro sobre dos vocabularios cerrados y
 * disjuntos (reportes vs. intervenciones). Si el valor elegido no
 * pertenece al vocabulario de este recurso, el filtro no le aplica -no lo
 * excluye-: evita que elegir p.ej. un estado de intervencion vacie los
 * reportes en silencio.
 */
const coincideSiAplica = (
  valor: string,
  filtro: string | undefined,
  vocabulario: readonly string[],
) => !filtro || !vocabulario.includes(filtro) || valor === filtro;
const hrefDe = (recurso: RecursoDeMapa, id: string) =>
  recurso === "REPORTE" ? `/reportes/detalle/${id}` : `/intervenciones/${id}`;

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
      ...reportes
        .filter(
          (reporte) =>
            coincideSiAplica(reporte.tipo, filtros.tipo, TIPOS_DE_INCIDENCIA) &&
            coincideSiAplica(
              reporte.estado,
              filtros.estado,
              ESTADOS_DE_REPORTE,
            ) &&
            coincide(reporte.areaResponsable ?? "", filtros.area),
        )
        .map((reporte) => ({
          ...reporte,
          recurso: "REPORTE" as const,
          etiqueta: reporte.folio,
        })),
      ...intervenciones
        .filter(
          (intervencion) =>
            !filtros.area &&
            coincideSiAplica(
              intervencion.tipo,
              filtros.tipo,
              TIPOS_DE_INTERVENCION,
            ) &&
            coincideSiAplica(
              intervencion.estado,
              filtros.estado,
              ESTADOS_DE_INTERVENCION,
            ),
        )
        .map((intervencion) => ({
          ...intervencion,
          recurso: "INTERVENCION" as const,
          etiqueta: intervencion.tipo,
        })),
    ];
    const marcadores: MarcadorDeMapa[] = [];
    const cobertura: CoberturaFaltante[] = [];
    for (const hecho of hechos) {
      const calle = hecho.calleId ? puntos.get(hecho.calleId) : undefined;
      const href = hrefDe(hecho.recurso, hecho.id);
      if (calle?.punto) {
        marcadores.push({
          id: hecho.id,
          recurso: hecho.recurso,
          etiqueta: hecho.etiqueta,
          href,
          punto: calle.punto,
        });
      } else {
        cobertura.push({
          id: hecho.id,
          recurso: hecho.recurso,
          etiqueta: hecho.etiqueta,
          href,
          razon: hecho.calleId ? "CALLE_SIN_PUNTO" : "SIN_CALLE",
        });
      }
    }
    const conteos = {
      reportes: hechos.filter((hecho) => hecho.recurso === "REPORTE").length,
      intervenciones: hechos.filter((hecho) => hecho.recurso === "INTERVENCION")
        .length,
      total: hechos.length,
    };
    return {
      estado: conteos.total === 0 ? "VACIO" : "CON_DATOS",
      marcadores,
      cobertura,
      conteos,
    };
  };
}
