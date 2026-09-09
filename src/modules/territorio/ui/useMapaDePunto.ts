"use client";

import type { CircleMarker, Map as LeafletMap } from "leaflet";
import { type RefObject, useEffect, useRef, useState } from "react";
import type { PuntoGeografico } from "../domain";
import { mensajeDeFalloDeTiles, prepararMapa } from "./mapaLeaflet";
import { useSeleccionRef } from "./useSeleccionRef";

export {
  configuracionDeMapa,
  mensajeDeFalloDeTiles,
  prepararMapa,
} from "./mapaLeaflet";

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

type EstadoDeMapa = {
  mapaRef: RefObject<HTMLDivElement | null>;
  mapa: RefObject<LeafletMap | null>;
  puntoInicial: RefObject<PuntoGeografico | null>;
  seleccionRef: RefObject<(punto: PuntoGeografico) => void>;
  setMapaVisible: (visible: boolean) => void;
  setMapaFallido: (fallido: boolean) => void;
  setAviso: (aviso: string | null) => void;
};

type DatosDeMarcador = {
  mapa: RefObject<LeafletMap | null>;
  marcador: RefObject<CircleMarker | null>;
  mapaVisible: boolean;
  punto: PuntoGeografico | null;
};

type DatosDeActualizacionDeMarcador = DatosDeMarcador & {
  estaCancelado: () => boolean;
};

type DatosDeInicializacion = EstadoDeMapa & {
  elemento: HTMLDivElement;
  estaCancelado: () => boolean;
};

const inicializarMapa = async ({
  elemento,
  mapaRef,
  mapa,
  puntoInicial,
  seleccionRef,
  setMapaVisible,
  setMapaFallido,
  setAviso,
  estaCancelado,
}: DatosDeInicializacion): Promise<void> => {
  try {
    const leaflet = await import("leaflet");
    if (estaCancelado() || !mapaRef.current) return;

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

const useInicializacionDeMapa = ({
  mapaRef,
  mapa,
  puntoInicial,
  seleccionRef,
  setMapaVisible,
  setMapaFallido,
  setAviso,
}: EstadoDeMapa): void => {
  useEffect(() => {
    let cancelado = false;
    const elemento = mapaRef.current;
    if (!elemento || mapa.current) return;

    void inicializarMapa({
      mapaRef,
      mapa,
      puntoInicial,
      seleccionRef,
      setMapaVisible,
      setMapaFallido,
      setAviso,
      elemento,
      estaCancelado: () => cancelado,
    });

    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
    };
  }, [
    mapaRef,
    mapa,
    puntoInicial,
    seleccionRef,
    setMapaVisible,
    setMapaFallido,
    setAviso,
  ]);
};

const actualizarMarcador = async ({
  mapa,
  marcador,
  mapaVisible,
  punto,
  estaCancelado,
}: DatosDeActualizacionDeMarcador): Promise<void> => {
  if (!mapa.current || !mapaVisible) return;

  const L = await import("leaflet");
  if (estaCancelado() || !mapa.current) return;

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

const useMarcadorDeMapa = ({
  mapa,
  marcador,
  mapaVisible,
  punto,
}: DatosDeMarcador): void => {
  useEffect(() => {
    let cancelado = false;
    void actualizarMarcador({
      mapa,
      marcador,
      mapaVisible,
      punto,
      estaCancelado: () => cancelado,
    });

    return () => {
      cancelado = true;
    };
  }, [mapaVisible, punto, mapa, marcador]);
};

export function useMapaDePunto({ punto, onSelect }: Props): Resultado {
  const mapaRef = useRef<HTMLDivElement | null>(null);
  const mapa = useRef<LeafletMap | null>(null);
  const marcador = useRef<CircleMarker | null>(null);
  const seleccionRef = useSeleccionRef(onSelect);
  const puntoInicial = useRef(punto);
  const [mapaVisible, setMapaVisible] = useState(false);
  const [mapaFallido, setMapaFallido] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useInicializacionDeMapa({
    mapaRef,
    mapa,
    puntoInicial,
    seleccionRef,
    setMapaVisible,
    setMapaFallido,
    setAviso,
  });
  useMarcadorDeMapa({ mapa, marcador, mapaVisible, punto });

  return { mapaRef, mapaVisible, mapaFallido, aviso };
}
