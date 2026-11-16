import {
  cajaDePuntos,
  comoIdDeIntervencionEnMapa,
  comoIdDeReporteEnMapa,
  type MapaOperativoAgregado,
} from "../domain";

/** Fixture compartida por los dos tests de `MapaOperativo`. */
export const CAJA = cajaDePuntos([{ latitud: 20.9, longitud: -89.6 }]);

export const mapaDe = (
  parcial: Partial<MapaOperativoAgregado>,
): MapaOperativoAgregado => ({
  estado: "CON_DATOS",
  territorios: [],
  territorioElegido: null,
  caja: CAJA,
  marcadores: [],
  cobertura: [],
  conteos: { reportes: 0, intervenciones: 0, total: 0 },
  ...parcial,
});

export const REPORTE = {
  id: comoIdDeReporteEnMapa("reporte-1"),
  recurso: "REPORTE",
  etiqueta: "REP-1",
  href: "/reportes/detalle/reporte-1",
  punto: { latitud: 20.9, longitud: -89.6 },
} as const;

export const INTERVENCION = {
  id: comoIdDeIntervencionEnMapa("intervencion-1"),
  recurso: "INTERVENCION",
  etiqueta: "OBRA",
  href: "/intervenciones/intervencion-1",
  punto: { latitud: 20.9, longitud: -89.6 },
} as const;
