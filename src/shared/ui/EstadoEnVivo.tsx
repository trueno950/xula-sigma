"use client";

import { WifiHigh, WifiSlash } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clasesDeBoton } from "./estilos";

const UMBRAL_DE_LATIDO_MS = 45_000;

function etiquetaDeEstado(conectado: boolean): string {
  return conectado ? "Actualización en vivo" : "Actualización desconectada";
}

export function EstadoEnVivo() {
  const router = useRouter();
  const [conectado, setConectado] = useState(false);

  useEventosEnVivo(router.refresh, setConectado);

  const Icono = conectado ? WifiHigh : WifiSlash;

  return (
    <div
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-caliza-divisor bg-caliza-lienzo p-3 shadow-reposo"
    >
      <span className="flex items-center gap-2 pl-2 text-[15px] text-caliza-tinta">
        <Icono
          size={20}
          aria-hidden="true"
          className={conectado ? "text-senial-exito" : "text-caliza-apagada"}
        />
        {etiquetaDeEstado(conectado)}
      </span>
      <button
        type="button"
        onClick={() => router.refresh()}
        className={clasesDeBoton("secundaria")}
      >
        Actualizar ahora
      </button>
    </div>
  );
}

function useEventosEnVivo(
  refrescar: () => void,
  establecerConectado: (conectado: boolean) => void,
) {
  useEffect(() => {
    const eventos = new EventSource("/eventos");
    let limite = programarDesconexion(establecerConectado);

    const confirmarLatido = () => {
      establecerConectado(true);
      clearTimeout(limite);
      limite = programarDesconexion(establecerConectado);
    };

    eventos.onopen = confirmarLatido;
    eventos.onerror = () => establecerConectado(false);
    eventos.addEventListener("heartbeat", confirmarLatido);
    eventos.addEventListener("actualizacion", refrescar);
    eventos.addEventListener("resync", refrescar);

    return () => {
      clearTimeout(limite);
      eventos.close();
    };
  }, [establecerConectado, refrescar]);
}

function programarDesconexion(
  establecerConectado: (conectado: boolean) => void,
) {
  return window.setTimeout(
    () => establecerConectado(false),
    UMBRAL_DE_LATIDO_MS,
  );
}
