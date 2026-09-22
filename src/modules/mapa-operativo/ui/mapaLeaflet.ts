import type { Map as LeafletMap } from "leaflet";
import type { MarcadorDeMapa } from "../domain";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
/**
 * Caja de Yucatan, copiada de `territorio/domain/punto.ts` -no importada,
 * antipatron 8-: aca solo encuadra el mapa, no valida coordenadas.
 */
const LIMITES_DE_YUCATAN: [[number, number], [number, number]] = [
  [19.4333, -90.4667],
  [21.6667, -87.4833],
];

export const mensajeDeFalloDeTiles = () =>
  "No se pudieron cargar los mapas. Use la lista de abajo.";

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
  onTileError: () => void;
};

export function prepararMapaOperativo({
  leaflet,
  elemento,
  marcadores,
  onTileError,
}: Opciones): LeafletMap {
  const mapa = leaflet.map(elemento, {
    maxBounds: LIMITES_DE_YUCATAN,
    maxBoundsViscosity: 1,
  });
  mapa.fitBounds(
    marcadores.length > 0
      ? marcadores.map((m): [number, number] => [
          m.punto.latitud,
          m.punto.longitud,
        ])
      : LIMITES_DE_YUCATAN,
    { maxZoom: 15, padding: [24, 24] },
  );
  const tiles = leaflet.tileLayer(OSM_TILE_URL, {
    attribution: OSM_ATTRIBUTION,
    maxZoom: 19,
  });
  tiles.on("tileerror", onTileError);
  tiles.addTo(mapa);
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
  return mapa;
}
