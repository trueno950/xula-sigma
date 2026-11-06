import type { LatLngBoundsExpression, Map as LeafletMap } from "leaflet";
import { CAJA_DE_YUCATAN, type PuntoGeografico } from "../domain";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type ConfiguracionDeMapa = {
  tileUrl: string;
  attribution: string;
  maxBounds: LatLngBoundsExpression;
};

export const configuracionDeMapa = (): ConfiguracionDeMapa => ({
  tileUrl: OSM_TILE_URL,
  attribution: OSM_ATTRIBUTION,
  maxBounds: [
    [CAJA_DE_YUCATAN.latitudMinima, CAJA_DE_YUCATAN.longitudMinima],
    [CAJA_DE_YUCATAN.latitudMaxima, CAJA_DE_YUCATAN.longitudMaxima],
  ],
});

export const mensajeDeFalloDeTiles = () =>
  "No se pudieron cargar los mapas. Puede guardar las coordenadas con los campos.";

type OpcionesDeInicializacion = {
  leaflet: typeof import("leaflet");
  elemento: HTMLDivElement;
  punto: PuntoGeografico | null;
  /** Donde abrir sin punto; ver `centroDeCalles`. */
  centro?: PuntoGeografico | null | undefined;
  onSelect: (punto: PuntoGeografico) => void;
  onTileError: () => void;
};

type DatosDeMapa = {
  leaflet: typeof import("leaflet");
  elemento: HTMLDivElement;
  vista: VistaInicial;
  configuracion: ConfiguracionDeMapa;
};

type VistaInicial = [[number, number], number];

type DatosDeTiles = {
  leaflet: typeof import("leaflet");
  mapa: LeafletMap;
  configuracion: ConfiguracionDeMapa;
  onTileError: () => void;
};

const centroDe = (limites: LatLngBoundsExpression): [number, number] => {
  const [[latitudMinima, longitudMinima], [latitudMaxima, longitudMaxima]] =
    limites as [[number, number], [number, number]];

  return [
    (latitudMinima + latitudMaxima) / 2,
    (longitudMinima + longitudMaxima) / 2,
  ];
};

/** El punto de la calle; si no tiene, su lugar; si no, todo Yucatan. */
export const vistaInicialDelMapa = ({
  punto,
  centro,
}: {
  punto: PuntoGeografico | null;
  centro: PuntoGeografico | null;
}): VistaInicial => {
  if (punto) return [[punto.latitud, punto.longitud], 15];
  if (centro) return [[centro.latitud, centro.longitud], 14];
  return [centroDe(configuracionDeMapa().maxBounds), 8];
};

const crearInstanciaDeMapa = ({
  leaflet,
  elemento,
  vista,
  configuracion,
}: DatosDeMapa): LeafletMap =>
  leaflet
    .map(elemento, {
      maxBounds: configuracion.maxBounds,
      maxBoundsViscosity: 1,
      attributionControl: true,
    })
    .setView(...vista);

const agregarCapaDeTiles = ({
  leaflet,
  mapa,
  configuracion,
  onTileError,
}: DatosDeTiles): void => {
  const tiles = leaflet.tileLayer(configuracion.tileUrl, {
    attribution: configuracion.attribution,
    maxZoom: 19,
  });
  tiles.on("tileerror", onTileError);
  tiles.addTo(mapa);
};

const registrarSeleccion = (
  mapa: LeafletMap,
  onSelect: (punto: PuntoGeografico) => void,
): void => {
  mapa.on("click", (evento) =>
    onSelect({
      latitud: evento.latlng.lat,
      longitud: evento.latlng.lng,
    }),
  );
};

export const prepararMapa = ({
  leaflet,
  elemento,
  punto,
  centro = null,
  onSelect,
  onTileError,
}: OpcionesDeInicializacion): LeafletMap => {
  const configuracion = configuracionDeMapa();
  const mapa = crearInstanciaDeMapa({
    leaflet,
    elemento,
    vista: vistaInicialDelMapa({ punto, centro }),
    configuracion,
  });
  agregarCapaDeTiles({ leaflet, mapa, configuracion, onTileError });
  registrarSeleccion(mapa, onSelect);
  return mapa;
};
