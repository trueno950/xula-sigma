"use client";

import { useState } from "react";
import { Aviso, Campo } from "@/shared/ui";
import type { PuntoGeografico } from "../domain";
import { useMapaDePunto } from "./useMapaDePunto";

type Props = {
  punto: PuntoGeografico | null;
};

const valorDe = (valor: number | undefined) =>
  valor === undefined ? "" : String(valor);

export function SelectorDePunto({ punto: puntoInicial }: Props) {
  const [latitud, setLatitud] = useState(valorDe(puntoInicial?.latitud));
  const [longitud, setLongitud] = useState(valorDe(puntoInicial?.longitud));
  const [punto, setPunto] = useState<PuntoGeografico | null>(puntoInicial);
  const { mapaRef, mapaVisible, mapaFallido, aviso } = useMapaDePunto({
    punto,
    onSelect: (seleccion) => {
      setPunto(seleccion);
      setLatitud(String(seleccion.latitud.toFixed(6)));
      setLongitud(String(seleccion.longitud.toFixed(6)));
    },
  });

  const cambiaCoordenada = (campo: "latitud" | "longitud", valor: string) => {
    const siguienteLatitud = campo === "latitud" ? valor : latitud;
    const siguienteLongitud = campo === "longitud" ? valor : longitud;
    if (campo === "latitud") setLatitud(valor);
    else setLongitud(valor);

    const latitudNumerica = Number(siguienteLatitud);
    const longitudNumerica = Number(siguienteLongitud);
    setPunto(
      siguienteLatitud !== "" &&
        siguienteLongitud !== "" &&
        Number.isFinite(latitudNumerica) &&
        Number.isFinite(longitudNumerica)
        ? { latitud: latitudNumerica, longitud: longitudNumerica }
        : null,
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo
          id="calle-latitud"
          name="latitud"
          etiqueta="Latitud"
          type="number"
          inputMode="decimal"
          step="0.000001"
          value={latitud}
          onChange={(evento) =>
            cambiaCoordenada("latitud", evento.target.value)
          }
          ayuda="Entre 19.4333 y 21.6667."
          tipografia="dato"
        />
        <Campo
          id="calle-longitud"
          name="longitud"
          etiqueta="Longitud"
          type="number"
          inputMode="decimal"
          step="0.000001"
          value={longitud}
          onChange={(evento) =>
            cambiaCoordenada("longitud", evento.target.value)
          }
          ayuda="Entre -90.4667 y -87.4833."
          tipografia="dato"
        />
      </div>
      {aviso ? <Aviso tono="aviso">{aviso}</Aviso> : null}
      <div
        ref={mapaRef}
        hidden={mapaFallido}
        role="application"
        aria-label="Mapa para elegir la ubicación de la calle"
        aria-hidden={!mapaVisible}
        className="h-72 w-full rounded-md border border-caliza-divisor"
        style={{ visibility: mapaVisible ? "visible" : "hidden" }}
      />
      <p className="text-[13px] text-caliza-apagada">
        Mapa de OpenStreetMap. Haga clic para fijar el punto; los campos siguen
        disponibles si el mapa no carga.
      </p>
    </div>
  );
}
