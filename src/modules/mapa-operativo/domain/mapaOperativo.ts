export type RecursoDeMapa = "REPORTE" | "INTERVENCION";
export type RazonDeCoberturaFaltante = "SIN_CALLE" | "CALLE_SIN_PUNTO";

export type PuntoDeMapa = { latitud: number; longitud: number };
export type MarcadorDeMapa = {
  id: string;
  recurso: RecursoDeMapa;
  etiqueta: string;
  href: string;
  punto: PuntoDeMapa;
};
export type CoberturaFaltante = {
  id: string;
  recurso: RecursoDeMapa;
  etiqueta: string;
  href: string;
  razon: RazonDeCoberturaFaltante;
};
export type MapaOperativoAgregado = {
  estado: "VACIO" | "CON_DATOS";
  marcadores: readonly MarcadorDeMapa[];
  cobertura: readonly CoberturaFaltante[];
  conteos: { reportes: number; intervenciones: number; total: number };
};
