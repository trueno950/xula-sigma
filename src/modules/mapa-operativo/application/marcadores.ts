import {
  agruparEnCalles,
  COLOR_DE_ESTADO_DESCONOCIDO,
  type CoberturaFaltante,
  colorDeEstado,
  etiquetaDeFiltro,
  type GrupoDeHechos,
  type HechoEnMarcador,
  iconoDe,
  type MarcadorDeMapa,
  predominante,
  type RazonDeCoberturaFaltante,
} from "../domain";
import type { Hecho } from "./filtrarHechos";
import type { CalleParaMapaOperativo } from "./puertos";
import type { PuntosPorCalle } from "./territorioElegido";

const hrefDe = (recurso: Hecho["recurso"], id: string) =>
  recurso === "REPORTE" ? `/reportes/detalle/${id}` : `/intervenciones/${id}`;

const historiaHrefDe = (calleId: string) => `/calles/${calleId}/historial`;

function hechoEnMarcador(hecho: Hecho): HechoEnMarcador {
  const comunes = {
    etiqueta: hecho.etiqueta,
    href: hrefDe(hecho.recurso, hecho.id),
    tipo: hecho.tipo,
    etiquetaDeTipo: etiquetaDeFiltro(hecho.tipo),
    etiquetaDeEstado: etiquetaDeFiltro(hecho.estado),
    icono: iconoDe(hecho.tipo),
    color: colorDeEstado(hecho.estado),
    diasDeAtraso: hecho.diasDeAtraso,
    fechaCivil: hecho.fechaCivil,
  };
  return hecho.recurso === "REPORTE"
    ? { ...comunes, recurso: "REPORTE", id: hecho.id }
    : { ...comunes, recurso: "INTERVENCION", id: hecho.id };
}

function coberturaDe(
  hecho: Hecho,
  calle: CalleParaMapaOperativo | undefined,
): CoberturaFaltante {
  const razon: RazonDeCoberturaFaltante = hecho.calleId
    ? "CALLE_SIN_PUNTO"
    : "SIN_CALLE";
  const comunes = {
    etiqueta: hecho.etiqueta,
    href: hrefDe(hecho.recurso, hecho.id),
    razon,
    calle: calle?.nombre ?? null,
  };
  return hecho.recurso === "REPORTE"
    ? { ...comunes, recurso: "REPORTE", id: hecho.id }
    : { ...comunes, recurso: "INTERVENCION", id: hecho.id };
}

function marcadorDe({ calleId, punto, hechos }: GrupoDeHechos<Hecho>) {
  const visibles = hechos.map(hechoEnMarcador);
  return {
    clave: calleId,
    punto,
    hechos: visibles,
    icono: predominante(visibles.map((hecho) => hecho.icono)) ?? "OTRO",
    color:
      predominante(visibles.map((hecho) => hecho.color)) ??
      COLOR_DE_ESTADO_DESCONOCIDO,
    historiaHref: historiaHrefDe(calleId),
  } satisfies MarcadorDeMapa;
}

/**
 * Reparte los hechos en los dos sitios donde la pantalla puede mostrarlos:
 * los que tienen el punto de su calle -agrupados por calle, para no dibujar
 * dos pines en el mismo metro cuadrado- y los que no, que se declaran como
 * cobertura faltante en vez de inventarles una coordenada.
 */
export function clasificar(
  hechos: readonly Hecho[],
  puntos: PuntosPorCalle,
): { marcadores: MarcadorDeMapa[]; cobertura: CoberturaFaltante[] } {
  const { grupos, sinPunto } = agruparEnCalles(
    hechos,
    (calleId) => puntos.get(calleId)?.punto ?? null,
  );
  return {
    marcadores: grupos.map(marcadorDe),
    cobertura: sinPunto.map((hecho) =>
      coberturaDe(hecho, hecho.calleId ? puntos.get(hecho.calleId) : undefined),
    ),
  };
}
