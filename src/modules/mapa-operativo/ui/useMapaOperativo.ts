"use client";

import type { Map as LeafletMap } from "leaflet";
import { type RefObject, useEffect, useRef, useState } from "react";
import type { CajaDeMapa, MarcadorDeMapa } from "../domain";
import {
  type MapaPreparado,
  mensajeDeFalloDeTiles,
  prepararMapaOperativo,
  seleccionarPin,
} from "./mapaLeaflet";

type Args = {
  marcadores: readonly MarcadorDeMapa[];
  caja: CajaDeMapa | null;
  /** La calle elegida en el panel; `null` si no hay ninguna. */
  elegida: string | null;
  onSeleccion: (clave: string | null) => void;
};

type Resultado = {
  mapaRef: RefObject<HTMLDivElement | null>;
  mapaVisible: boolean;
  mapaFallido: boolean;
  aviso: string | null;
};

export function useMapaOperativo({
  marcadores,
  caja,
  elegida,
  onSeleccion,
}: Args): Resultado {
  const mapaRef = useRef<HTMLDivElement | null>(null);
  const preparadoRef = useRef<MapaPreparado | null>(null);
  const elegidaRef = useRef<string | null>(elegida);
  const avisarRef = useRef(onSeleccion);
  const [mapaVisible, setMapaVisible] = useState(false);
  const [mapaFallido, setMapaFallido] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Las dos referencias se actualizan antes de crear el mapa, y el efecto de
  // la seleccion va declarado antes que el de creacion: en el primer render el
  // mapa todavia no existe y quien aplica la seleccion es la creacion, con el
  // valor que ya quedo en la referencia.
  useEffect(() => {
    avisarRef.current = onSeleccion;
  }, [onSeleccion]);

  useEffect(() => {
    elegidaRef.current = elegida;
    if (preparadoRef.current)
      seleccionarPin(preparadoRef.current.pines, elegida);
  }, [elegida]);

  useEffect(() => {
    let cancelado = false;
    let mapaInstancia: LeafletMap | null = null;
    const elemento = mapaRef.current;
    if (!elemento) return;

    (async () => {
      try {
        const leaflet = await import("leaflet");
        if (cancelado || !mapaRef.current) return;
        const preparado = prepararMapaOperativo({
          leaflet,
          elemento: mapaRef.current,
          marcadores,
          caja,
          onTileError: () => setAviso(mensajeDeFalloDeTiles()),
          onSeleccion: (clave) => avisarRef.current(clave),
        });
        mapaInstancia = preparado.mapa;
        preparadoRef.current = preparado;
        seleccionarPin(preparado.pines, elegidaRef.current);
        setMapaVisible(true);
      } catch {
        setMapaFallido(true);
        setAviso("No se pudo cargar el mapa. Use la lista de abajo.");
      }
    })();

    return () => {
      cancelado = true;
      mapaInstancia?.remove();
      preparadoRef.current = null;
    };
  }, [marcadores, caja]);

  return { mapaRef, mapaVisible, mapaFallido, aviso };
}
