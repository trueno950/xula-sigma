"use client";

import { Aviso } from "@/shared/ui";
import type { CajaDeMapa, MarcadorDeMapa } from "../domain";
import { useMapaOperativo } from "./useMapaOperativo";

type Props = {
  marcadores: readonly MarcadorDeMapa[];
  caja: CajaDeMapa | null;
  elegida: string | null;
  onSeleccion: (clave: string | null) => void;
};

/**
 * Progresiva: si Leaflet no carga, `mapaFallido` oculta el contenedor y la
 * lista del panel sigue siendo el camino sin JavaScript -mismo criterio que
 * `SelectorDePunto` de `territorio`-. Region y no imagen: una `<section>` con
 * nombre accesible ya expone `role="region"`, y sus marcadores y controles de
 * zoom son enfocables, asi que `role="img"` los esconderia al lector de
 * pantalla.
 *
 * El alto lo pone la caja del mapa, no este componente: `flex-1` y `min-h-0`
 * para que Leaflet mida el espacio que le queda entre la cabecera y el borde.
 * Con `h-full` y no `flex-1` la cadena se resolvia a cero en el telefono,
 * donde la figura mide por `min-height` y no por el alto estirado de la
 * grilla de escritorio.
 */
export function MapaVisual({ marcadores, caja, elegida, onSeleccion }: Props) {
  const { mapaRef, mapaVisible, mapaFallido, aviso } = useMapaOperativo({
    marcadores,
    caja,
    elegida,
    onSeleccion,
  });

  if (marcadores.length === 0) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {aviso ? <Aviso tono="aviso">{aviso}</Aviso> : null}
      <section
        ref={mapaRef}
        hidden={mapaFallido}
        aria-label="Mapa con los marcadores del municipio, ubicación aproximada"
        className="min-h-0 w-full flex-1"
        style={{ visibility: mapaVisible ? "visible" : "hidden" }}
      />
    </div>
  );
}
