"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const UMBRAL_DE_LATIDO_MS = 45_000;

function etiquetaDeEstado(conectado: boolean): string {
  return conectado ? "Actualizacion en vivo" : "Actualizacion desconectada";
}

export function EstadoEnVivo() {
  const router = useRouter();
  const [conectado, setConectado] = useState(false);

  useEventosEnVivo(router.refresh, setConectado);

  return (
    <div aria-live="polite">
      <span>{etiquetaDeEstado(conectado)}</span>
      <button type="button" onClick={() => router.refresh()}>
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

    eventos.onopen = () => {
      confirmarLatido();
      refrescar();
    };
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
