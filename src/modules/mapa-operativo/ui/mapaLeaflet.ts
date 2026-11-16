import type { Map as LeafletMap } from "leaflet";
import type { CajaDeMapa, MarcadorDeMapa } from "../domain";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
/**
 * Caja de Yucatan, copiada de `territorio/domain/punto.ts` -no importada,
 * antipatron 8-: aca solo encuadra el mapa, no valida coordenadas. Es la
 * vista de respaldo cuando el territorio elegido no tiene calles ubicadas.
 */
/** La caja de respaldo; se exporta porque el test la compara con `maxBounds`. */
export const LIMITES_DE_YUCATAN: Limites = [
  [19.4333, -90.4667],
  [21.6667, -87.4833],
];
const PADDING: [number, number] = [24, 24];
/**
 * Hasta donde acerca la vista inicial. Un territorio con una sola calle
 * ubicada, si no, entra a zoom de edificio y se pierde el contexto.
 */
const ZOOM_MAXIMO_DE_ENTRADA = 15;

type Limites = [[number, number], [number, number]];

export const mensajeDeFalloDeTiles = () =>
  "No se pudieron cargar los mapas. Use la lista de abajo.";

const limitesDe = (caja: CajaDeMapa): Limites => [
  [caja.sur, caja.oeste],
  [caja.norte, caja.este],
];

const colorDe = (recurso: MarcadorDeMapa["recurso"]) =>
  recurso === "REPORTE" ? "#c0392b" : "#2563eb";

const escapar = (texto: string) =>
  texto.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] ?? c,
  );

type Opciones = {
  leaflet: typeof import("leaflet");
  elemento: HTMLDivElement;
  marcadores: readonly MarcadorDeMapa[];
  caja: CajaDeMapa | null;
  onTileError: () => void;
};

type Vista = {
  mapa: LeafletMap;
  elemento: HTMLDivElement;
  limites: Limites;
};

/**
 * Deja la vista acotada en el propio contenedor: `data-limites`, `data-min-zoom`
 * y `data-zoom` son lo que el E2E lee para comprobar que la vista quedo
 * bloqueada, sin exponer el mapa de Leaflet en `window`.
 */
function anotarVista({ mapa, elemento, limites }: Vista): void {
  elemento.dataset.limites = limites.flat().join(",");
  elemento.dataset.minZoom = String(mapa.getMinZoom());
  elemento.dataset.zoom = String(mapa.getZoom());
  mapa.on("zoomend", () => {
    elemento.dataset.zoom = String(mapa.getZoom());
  });
}

function agregarCapaDeTiles({
  leaflet,
  mapa,
  onTileError,
}: {
  leaflet: typeof import("leaflet");
  mapa: LeafletMap;
  onTileError: () => void;
}): void {
  const tiles = leaflet.tileLayer(OSM_TILE_URL, {
    attribution: OSM_ATTRIBUTION,
    maxZoom: 19,
  });
  tiles.on("tileerror", onTileError);
  tiles.addTo(mapa);
}

function agregarMarcadores({
  leaflet,
  mapa,
  marcadores,
}: {
  leaflet: typeof import("leaflet");
  mapa: LeafletMap;
  marcadores: readonly MarcadorDeMapa[];
}): void {
  for (const marcador of marcadores) {
    leaflet
      .circleMarker([marcador.punto.latitud, marcador.punto.longitud], {
        color: colorDe(marcador.recurso),
        fillColor: colorDe(marcador.recurso),
        fillOpacity: 1,
        radius: 8,
        weight: 2,
      })
      .bindPopup(
        `<a href="${escapar(marcador.href)}">${escapar(marcador.etiqueta)}</a>`,
      )
      .addTo(mapa);
  }
}

/**
 * La vista queda bloqueada al territorio elegido: `maxBounds` es la caja de
 * sus calles ubicadas -calculada en el servidor-, `maxBoundsViscosity` 1
 * impide arrastrarla afuera y `minZoom` es el zoom con el que esa caja entra
 * completa, asi que no se puede alejar hasta las comisarias vecinas. Sin
 * caja -territorio sin calles ubicadas- vuelve a Yucatan.
 */
export function prepararMapaOperativo({
  leaflet,
  elemento,
  marcadores,
  caja,
  onTileError,
}: Opciones): LeafletMap {
  const limites = caja ? limitesDe(caja) : LIMITES_DE_YUCATAN;
  const mapa = leaflet.map(elemento, {
    maxBounds: limites,
    maxBoundsViscosity: 1,
  });
  const zoomDeLaCaja = Math.min(
    mapa.getBoundsZoom(limites, false, leaflet.point(PADDING)),
    ZOOM_MAXIMO_DE_ENTRADA,
  );
  mapa.setMinZoom(zoomDeLaCaja);
  mapa.fitBounds(limites, {
    maxZoom: ZOOM_MAXIMO_DE_ENTRADA,
    padding: PADDING,
  });
  anotarVista({ mapa, elemento, limites });
  agregarCapaDeTiles({ leaflet, mapa, onTileError });
  agregarMarcadores({ leaflet, mapa, marcadores });
  return mapa;
}
