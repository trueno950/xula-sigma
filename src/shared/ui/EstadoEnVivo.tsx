"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const UMBRAL_DE_LATIDO_MS = 45_000;

function etiquetaDeEstado(conectado: boolean): string {
  return conectado ? "Actualización en vivo" : "Actualización desconectada";
}

export function EstadoEnVivo() {
  const router = useRouter();
  const [conectado, setConectado] = useState(false);

  useEventosEnVivo(router.refresh, setConectado);

  return (
    <div
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-caliza-divisor bg-caliza-superficie px-4 py-3"
    >
      <span className="text-[15px] text-caliza-tinta">
        {etiquetaDeEstado(conectado)}
      </span>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="h-11 rounded-sm border border-caliza-divisor px-3 text-[15px] font-medium text-caliza-tinta transition-colors hover:bg-caliza-relleno focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
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
