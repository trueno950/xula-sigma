import type { ClaveDeIcono } from "./iconos";
import type { LeyendaDelMapa } from "./leyenda";

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

type DatosDeHechoEnMarcador = {
  /** El folio del reporte, o el tipo legible de la intervencion. */
  etiqueta: string;
  href: string;
  tipo: string;
  etiquetaDeTipo: string;
  etiquetaDeEstado: string;
  icono: ClaveDeIcono;
  /** El color lo decidio el servidor; ver `coloresDeEstado.ts`. */
  color: string;
};

/**
 * Discriminado por `recurso`, con un tipo de id distinto por variante
 * (marca local, no importada de `reportes`/`intervenciones` -antipatron
 * 8-): armar un hecho o una entrada de cobertura con el `recurso` equivocado
 * para su `id` es un error de tipos, no algo que solo un test detecte.
 *
 * No lleva fecha: ni `listarReportesParaMapa` ni `listarIntervencionesParaMapa`
 * la exponen, y el mapa no la pide por otra puerta.
 */
export type HechoEnMarcador =
  | ({ recurso: "REPORTE"; id: IdDeReporteEnMapa } & DatosDeHechoEnMarcador)
  | ({
      recurso: "INTERVENCION";
      id: IdDeIntervencionEnMapa;
    } & DatosDeHechoEnMarcador);

/**
 * Un pin del mapa. Los hechos que comparten calle comparten punto, asi que
 * van juntos en `hechos` y el pin los cuenta en vez de taparse entre si. El
 * `icono` y el `color` del pin son los del hecho predominante; cada hecho
 * conserva los suyos adentro.
 */
export type MarcadorDeMapa = {
  /** La calle que agrupa el pin. */
  clave: string;
  punto: PuntoDeMapa;
  hechos: readonly HechoEnMarcador[];
  icono: ClaveDeIcono;
  color: string;
  historiaHref?: string;
};

/**
 * Los limites de la vista: la caja de las calles ubicadas del territorio
 * elegido, calculada en el servidor. `null` es "ese territorio no tiene
 * calles ubicadas", y entonces el mapa vuelve a la caja de Yucatan y lo
 * avisa; nunca se inventa un centro.
 */
export type CajaDeMapa = {
  readonly sur: number;
  readonly oeste: number;
  readonly norte: number;
  readonly este: number;
};

/** Una opcion del selector `?lugar=`: una raiz del arbol territorial. */
export type TerritorioDeMapa = {
  readonly id: string;
  readonly nombre: string;
};

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
  /** La cabecera y cada comisaria del municipio, para el selector. */
  territorios: readonly TerritorioDeMapa[];
  /** La raiz elegida, ya resuelta; `null` es «todo el municipio». */
  territorioElegido: TerritorioDeMapa | null;
  caja: CajaDeMapa | null;
  marcadores: readonly MarcadorDeMapa[];
  cobertura: readonly CoberturaFaltante[];
  conteos: { reportes: number; intervenciones: number; total: number };
  leyenda: LeyendaDelMapa;
};
