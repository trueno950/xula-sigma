import {
  cajaDePuntos,
  colorDeEstado,
  comoIdDeIntervencionEnMapa,
  comoIdDeReporteEnMapa,
  type HechoEnMarcador,
  iconoDe,
  type MapaOperativoAgregado,
  type MarcadorDeMapa,
} from "../domain";

/** Fixtures compartidas por los tests de la UI del mapa. */
export const CAJA = cajaDePuntos([{ latitud: 20.9, longitud: -89.6 }]);

const comun = (tipo: string, estado: string) => ({
  tipo,
  etiquetaDeTipo: tipo === "OBRA" ? "Obra" : "Bache",
  etiquetaDeEstado: estado === "RECIBIDO" ? "Recibido" : "Planificada",
  icono: iconoDe(tipo),
  color: colorDeEstado(estado),
});

export const HECHO_DE_REPORTE: HechoEnMarcador = {
  ...comun("BACHE", "RECIBIDO"),
  recurso: "REPORTE",
  id: comoIdDeReporteEnMapa("reporte-1"),
  etiqueta: "REP-1",
  href: "/reportes/detalle/reporte-1",
};

export const HECHO_DE_INTERVENCION: HechoEnMarcador = {
  ...comun("OBRA", "PLANIFICADA"),
  recurso: "INTERVENCION",
  id: comoIdDeIntervencionEnMapa("intervencion-1"),
  etiqueta: "Obra",
  href: "/intervenciones/intervencion-1",
};

export const marcadorDe = (
  hechos: readonly HechoEnMarcador[],
  extra: Partial<MarcadorDeMapa> = {},
): MarcadorDeMapa => ({
  clave: "calle-1",
  punto: { latitud: 20.9, longitud: -89.6 },
  hechos,
  icono: hechos[0]?.icono ?? "OTRO",
  color: hechos[0]?.color ?? colorDeEstado("INVENTADO"),
  ...extra,
});

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
  leyenda: { tipos: [], estados: [] },
  ...parcial,
});
