export type RazonDeCoberturaFaltante = "SIN_CALLE" | "CALLE_SIN_PUNTO";

export type PuntoDeMapa = { latitud: number; longitud: number };

declare const marcaDeReporte: unique symbol;
export type IdDeReporteEnMapa = string & {
  readonly [marcaDeReporte]: "ReporteEnMapa";
};
declare const marcaDeIntervencion: unique symbol;
export type IdDeIntervencionEnMapa = string & {
  readonly [marcaDeIntervencion]: "IntervencionEnMapa";
};

export const comoIdDeReporteEnMapa = (id: string): IdDeReporteEnMapa =>
  id as IdDeReporteEnMapa;
export const comoIdDeIntervencionEnMapa = (
  id: string,
): IdDeIntervencionEnMapa => id as IdDeIntervencionEnMapa;

/**
 * Discriminado por `recurso`, con un tipo de id distinto por variante
 * (marca local, no importada de `reportes`/`intervenciones` -antipatron
 * 8-): construir un marcador o una entrada de cobertura con el `recurso`
 * equivocado para su `id` es un error de tipos, no algo que solo un test
 * detecte.
 */
export type MarcadorDeMapa =
  | {
      recurso: "REPORTE";
      id: IdDeReporteEnMapa;
      etiqueta: string;
      href: string;
      punto: PuntoDeMapa;
      historiaHref?: string;
    }
  | {
      recurso: "INTERVENCION";
      id: IdDeIntervencionEnMapa;
      etiqueta: string;
      href: string;
      punto: PuntoDeMapa;
      historiaHref?: string;
    };

export type RecursoDeMapa = MarcadorDeMapa["recurso"];

export type CoberturaFaltante =
  | {
      recurso: "REPORTE";
      id: IdDeReporteEnMapa;
      etiqueta: string;
      href: string;
      razon: RazonDeCoberturaFaltante;
      calle: string | null;
    }
  | {
      recurso: "INTERVENCION";
      id: IdDeIntervencionEnMapa;
      etiqueta: string;
      href: string;
      razon: RazonDeCoberturaFaltante;
      calle: string | null;
    };

export type MapaOperativoAgregado = {
  estado: "VACIO" | "CON_DATOS";
  marcadores: readonly MarcadorDeMapa[];
  cobertura: readonly CoberturaFaltante[];
  conteos: { reportes: number; intervenciones: number; total: number };
};
