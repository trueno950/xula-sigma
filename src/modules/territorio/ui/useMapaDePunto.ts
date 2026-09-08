"use client";

import type {
  CircleMarker,
  LatLngBoundsExpression,
  Map as LeafletMap,
} from "leaflet";
import { type RefObject, useEffect, useRef, useState } from "react";
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

type Props = {
  punto: PuntoGeografico | null;
  onSelect: (punto: PuntoGeografico) => void;
};

type Resultado = {
  mapaRef: RefObject<HTMLDivElement | null>;
  mapaVisible: boolean;
  mapaFallido: boolean;
  aviso: string | null;
};

type OpcionesDeInicializacion = {
  leaflet: typeof import("leaflet");
  elemento: HTMLDivElement;
  punto: PuntoGeografico | null;
  onSelect: (punto: PuntoGeografico) => void;
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

const prepararMapa = ({
  leaflet,
  elemento,
  punto,
  onSelect,
  onTileError,
}: OpcionesDeInicializacion): LeafletMap => {
  const configuracion = configuracionDeMapa();
  const instancia = leaflet
    .map(elemento, {
      maxBounds: configuracion.maxBounds,
      maxBoundsViscosity: 1,
      attributionControl: true,
    })
    .setView(
      punto
        ? [punto.latitud, punto.longitud]
        : centroDe(configuracion.maxBounds),
      punto ? 15 : 8,
    );

  const tiles = leaflet.tileLayer(configuracion.tileUrl, {
    attribution: configuracion.attribution,
    maxZoom: 19,
  });
  tiles.on("tileerror", onTileError);
  tiles.addTo(instancia);
  instancia.on("click", (evento) =>
    onSelect({
      latitud: evento.latlng.lat,
      longitud: evento.latlng.lng,
    }),
  );

  return instancia;
};

export function useMapaDePunto({ punto, onSelect }: Props): Resultado {
  const mapaRef = useRef<HTMLDivElement | null>(null);
  const mapa = useRef<LeafletMap | null>(null);
  const marcador = useRef<CircleMarker | null>(null);
  const seleccionRef = useRef(onSelect);
  const puntoInicial = useRef(punto);
  const [mapaVisible, setMapaVisible] = useState(false);
  const [mapaFallido, setMapaFallido] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    seleccionRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelado = false;

    const iniciar = async () => {
      const elemento = mapaRef.current;
      if (!elemento || mapa.current) return;

      try {
        const leaflet = await import("leaflet");
        if (cancelado || !mapaRef.current) return;

        mapa.current = prepararMapa({
          leaflet,
          elemento,
          punto: puntoInicial.current,
          onSelect: (seleccion) => seleccionRef.current(seleccion),
          onTileError: () => setAviso(mensajeDeFalloDeTiles()),
        });
        setMapaVisible(true);
      } catch {
        setMapaFallido(true);
        setAviso("No se pudo cargar el mapa. Puede usar los campos.");
      }
    };

    void iniciar();

    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    const actualizarMarcador = async () => {
      if (!mapa.current || !mapaVisible) return;

      const L = await import("leaflet");
      if (cancelado || !mapa.current) return;

      marcador.current?.remove();
      marcador.current = punto
        ? L.circleMarker([punto.latitud, punto.longitud], {
            color: "var(--color-caliza-lienzo)",
            fillColor: "var(--color-caliza-tinta)",
            fillOpacity: 1,
            radius: 8,
            weight: 3,
          }).addTo(mapa.current)
        : null;
    };

    void actualizarMarcador();

    return () => {
      cancelado = true;
    };
  }, [mapaVisible, punto]);

  return { mapaRef, mapaVisible, mapaFallido, aviso };
}
