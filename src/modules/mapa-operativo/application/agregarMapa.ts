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
            coincide(reporte.tipo, filtros.tipo) &&
            coincide(reporte.estado, filtros.estado) &&
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
            coincide(intervencion.tipo, filtros.tipo) &&
            coincide(intervencion.estado, filtros.estado),
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
