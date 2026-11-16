import type { Map as LeafletMap } from "leaflet";
import type { CajaDeMapa, MarcadorDeMapa } from "../domain";
import { htmlDeLaVentana, htmlDeMarcador } from "./htmlDeMarcador";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
/**
 * Caja de Yucatan, copiada de `territorio/domain/punto.ts` -no importada,
 * antipatron 8-: aca solo encuadra el mapa, no valida coordenadas. Es la
 * vista de respaldo cuando el territorio elegido no tiene calles ubicadas, y
 * se exporta porque el test la compara con `maxBounds`.
 */
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

/**
 * El pin no es un circulo igual a todos: `divIcon` deja meter el SVG del tipo
 * y el contador del grupo. `className` propio para no arrastrar la caja
 * blanca que Leaflet le pone a un `divIcon` sin clase.
 */
const iconoDe = (
  leaflet: typeof import("leaflet"),
  marcador: MarcadorDeMapa,
): ReturnType<typeof leaflet.divIcon> =>
  leaflet.divIcon({
    className: "mapa-operativo-pin",
    html: htmlDeMarcador(marcador),
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });

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
      .marker([marcador.punto.latitud, marcador.punto.longitud], {
        icon: iconoDe(leaflet, marcador),
        title: marcador.hechos.map((hecho) => hecho.etiqueta).join(", "),
      })
      .bindPopup(htmlDeLaVentana(marcador))
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
