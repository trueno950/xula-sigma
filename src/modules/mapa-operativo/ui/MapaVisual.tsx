"use client";

import { Aviso } from "@/shared/ui";
import type { MarcadorDeMapa } from "../domain";
import { useMapaOperativo } from "./useMapaOperativo";

type Props = { marcadores: readonly MarcadorDeMapa[] };

/**
 * Progresiva: si Leaflet no carga, `mapaFallido` oculta el contenedor y la
 * lista de `MapaOperativo` sigue siendo el camino sin JavaScript -mismo
 * criterio que `SelectorDePunto` de `territorio`-.
 */
export function MapaVisual({ marcadores }: Props) {
  const { mapaRef, mapaVisible, mapaFallido, aviso } =
    useMapaOperativo(marcadores);

  if (marcadores.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {aviso ? <Aviso tono="aviso">{aviso}</Aviso> : null}
      <section
        ref={mapaRef}
        hidden={mapaFallido}
        aria-label="Mapa con los marcadores del municipio, ubicación aproximada"
        className="h-96 w-full rounded-lg border border-caliza-divisor shadow-reposo"
        style={{ visibility: mapaVisible ? "visible" : "hidden" }}
      />
    </div>
  );
}
