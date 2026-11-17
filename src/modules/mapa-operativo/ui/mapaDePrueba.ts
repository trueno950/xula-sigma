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
  estado,
  etiquetaDeTipo: tipo === "OBRA" ? "Obra" : "Bache",
  etiquetaDeEstado: estado === "RECIBIDO" ? "Recibido" : "Planificada",
  icono: iconoDe(tipo),
  color: colorDeEstado(estado),
});

/**
 * Los dos dobles llevan su variante concreta y no la union: un `{...hecho}`
 * sobre la union produce una union de objetos donde el `id` de una variante
 * puede caer en la otra, y eso no compila.
 */
export const HECHO_DE_REPORTE: Extract<
  HechoEnMarcador,
  { recurso: "REPORTE" }
> = {
  ...comun("BACHE", "RECIBIDO"),
  diasDeAtraso: null,
  fechaCivil: "2026-11-16",
  recurso: "REPORTE",
  id: comoIdDeReporteEnMapa("reporte-1"),
  etiqueta: "REP-1",
  href: "/reportes/detalle/reporte-1",
};

export const HECHO_DE_INTERVENCION: Extract<
  HechoEnMarcador,
  { recurso: "INTERVENCION" }
> = {
  ...comun("OBRA", "PLANIFICADA"),
  diasDeAtraso: null,
  fechaCivil: "2026-01-15",
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
  orden: 1,
  calleNombre: "Calle 26 x 31 y 33",
  territorioNombre: "Motul",
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
  leyenda: { tipos: [], estados: [], atrasados: 0, total: 0 },
  sinUbicar: [],
  ...parcial,
});

/** El texto que ve la operadora: lo mismo que `textContent` en el navegador. */
export const textoPlano = (html: string): string =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
