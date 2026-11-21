"use client";

import { Copy } from "@phosphor-icons/react/ssr";
import { useEffect, useState } from "react";
import { Boton } from "@/shared/ui";

const COPIADA = "Contraseña copiada al portapapeles.";
const SIN_COPIAR =
  "No se pudo copiar. Seleccione la contraseña y cópiela a mano.";

/**
 * «Copiar» la contrasenia temporal (S10 de `usuarios-ux`).
 *
 * **Es una mejora progresiva, y esta isla es todo su costo.** El boton no
 * existe en el HTML del servidor: aparece cuando el efecto del montaje
 * confirma que hay JavaScript, asi que sin script no se pinta —lo que no
 * existe no se pulsa— y la clave queda seleccionable con el dedo o el raton,
 * que es lo que la tarjeta explica. Un `<button hidden>` habria sido menos
 * codigo y un boton muerto en la pantalla de la operadora.
 *
 * Lee la clave **del DOM**, por el id que la tarjeta ya pinta, y no por una
 * prop: lo que se copia es exactamente el texto que ella esta viendo, la
 * contrasenia no viaja una segunda vez en el payload de la isla y no se
 * guarda en ningun lado. El fallo del portapapeles se le dice a ella en la
 * region viva —su unico destino util— y no queda en el log.
 */
export function BotonDeCopiar({ objetivo }: { objetivo: string }) {
  const [isMontado, setIsMontado] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => setIsMontado(true), []);

  const copiar = async () => {
    const clave = document.getElementById(objetivo)?.textContent?.trim();
    if (!clave) return;

    try {
      await navigator.clipboard.writeText(clave);
      setMensaje(COPIADA);
    } catch {
      setMensaje(SIN_COPIAR);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isMontado ? (
        <Boton
          type="button"
          variante="secundaria"
          onClick={() => void copiar()}
        >
          <Copy size={18} weight="bold" aria-hidden="true" />
          Copiar
        </Boton>
      ) : null}
      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-[13px] text-caliza-apagada"
      >
        {mensaje}
      </p>
    </div>
  );
}
