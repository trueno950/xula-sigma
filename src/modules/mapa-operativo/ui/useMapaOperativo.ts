"use client";

import type { Map as LeafletMap } from "leaflet";
import { type RefObject, useEffect, useRef, useState } from "react";
import type { CajaDeMapa, MarcadorDeMapa } from "../domain";
import { mensajeDeFalloDeTiles, prepararMapaOperativo } from "./mapaLeaflet";

type Resultado = {
  mapaRef: RefObject<HTMLDivElement | null>;
  mapaVisible: boolean;
  mapaFallido: boolean;
  aviso: string | null;
};

export function useMapaOperativo(
  marcadores: readonly MarcadorDeMapa[],
  caja: CajaDeMapa | null,
): Resultado {
  const mapaRef = useRef<HTMLDivElement | null>(null);
  const [mapaVisible, setMapaVisible] = useState(false);
  const [mapaFallido, setMapaFallido] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    let mapaInstancia: LeafletMap | null = null;
    const elemento = mapaRef.current;
    if (!elemento) return;

    (async () => {
      try {
        const leaflet = await import("leaflet");
        if (cancelado || !mapaRef.current) return;
        mapaInstancia = prepararMapaOperativo({
          leaflet,
          elemento: mapaRef.current,
          marcadores,
          caja,
          onTileError: () => setAviso(mensajeDeFalloDeTiles()),
        });
        setMapaVisible(true);
      } catch {
        setMapaFallido(true);
        setAviso("No se pudo cargar el mapa. Use la lista de abajo.");
      }
    })();

    return () => {
      cancelado = true;
      mapaInstancia?.remove();
    };
  }, [marcadores, caja]);

  return { mapaRef, mapaVisible, mapaFallido, aviso };
}
