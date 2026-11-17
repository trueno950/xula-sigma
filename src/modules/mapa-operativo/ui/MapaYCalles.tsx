"use client";

import { type ReactNode, useState } from "react";
import { type Pestana, Pestanas } from "@/shared/ui";
import type { CajaDeMapa, MarcadorDeMapa, PanelDeCalles } from "../domain";
import { ListaDeMarcadores } from "./ListaDeMarcadores";
import { MapaVisual } from "./MapaVisual";
import { callesConHechos } from "./resumenDelMapa";

type Props = {
  marcadores: readonly MarcadorDeMapa[];
  caja: CajaDeMapa | null;
  panel: PanelDeCalles;
  /** Las dos pestanas, con su cuenta y su direccion ya armadas en el servidor. */
  pestanas: readonly Pestana[];
  /** La leyenda, ya renderizada: es HTML del servidor y no depende del clic. */
  leyenda: ReactNode;
  /** El contenido de la pestana «Sin ubicar», tambien del servidor. */
  sinUbicar: ReactNode;
};

/**
 * El mapa y su panel, lado a lado desde 1024px y apilados -mapa primero- por
 * debajo (S2). Es el unico componente cliente de la pantalla: la fila y el
 * pin se eligen entre si (S5), y eso es estado de la vista, no del servidor.
 *
 * Las dos pestanas se pintan siempre y la inactiva queda `hidden`: sin
 * JavaScript las dos listas siguen en el HTML y se cambia de una a otra por su
 * enlace, que es lo que fija S4.
 */
export function MapaYCalles({
  marcadores,
  caja,
  panel,
  pestanas,
  leyenda,
  sinUbicar,
}: Props) {
  const [elegida, setElegida] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-stretch">
      <figure
        aria-label="Mapa de hechos por calle"
        className="relative flex min-h-[60dvh] flex-col overflow-hidden rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo lg:min-h-[560px]"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-caliza-divisor px-4 py-2.5">
          <span className="text-[13px] font-medium text-caliza-apagada">
            Ubicación aproximada de la calle
          </span>
          <span className="font-mono text-[14px] tabular-nums text-caliza-apagada">
            {callesConHechos(marcadores.length)}
          </span>
        </div>
        <div className="relative isolate flex min-h-0 flex-1 flex-col">
          <MapaVisual
            marcadores={marcadores}
            caja={caja}
            elegida={elegida}
            onSeleccion={setElegida}
          />
          {leyenda}
        </div>
      </figure>
      <section
        aria-label="Calles del mapa"
        className="flex min-h-0 flex-col overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo"
      >
        <Pestanas pestanas={pestanas} etiqueta="Vistas del panel de calles" />
        <div
          data-panel="en-el-mapa"
          hidden={panel !== "en-el-mapa"}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <ListaDeMarcadores
            marcadores={marcadores}
            elegida={elegida}
            onSeleccion={setElegida}
          />
        </div>
        <div
          data-panel="sin-ubicar"
          hidden={panel !== "sin-ubicar"}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {sinUbicar}
        </div>
      </section>
    </div>
  );
}
