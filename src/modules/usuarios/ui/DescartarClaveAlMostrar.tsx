"use client";

import { useEffect } from "react";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { urlSinLaClaveMostrada } from "./urlSinLaClaveMostrada";

/**
 * Saca la clave de la URL y borra su cookie, sin redibujar la ruta, para que
 * la contrasenia temporal se quede en pantalla (S9 de `usuarios-ux`). Por que
 * la URL se limpia al pintar y por que el descarte es un `POST` a un Route
 * Handler y no una Server Action: `AGENTS.md`, seccion Server Actions, nota
 * de `usuarios`.
 *
 * Si el `POST` no llega, la clave se sigue viendo y la cookie vence sola a los
 * 120 segundos; el boton «Ya la anoté» de la tarjeta la borra por la otra via.
 */
const RUTA_DE_DESCARTE = "/usuarios/clave-temporal";

export function DescartarClaveAlMostrar({ token }: { token: string }) {
  useEffect(() => {
    const limpia = urlSinLaClaveMostrada(new URL(window.location.href));
    if (limpia) window.history.replaceState(null, "", limpia);

    const descartar = async () => {
      try {
        await fetch(RUTA_DE_DESCARTE, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
          keepalive: true,
        });
      } catch (error) {
        console.error(
          "[descartarClave] no se pudo borrar la cookie",
          datosSegurosDeError(error),
        );
      }
    };

    void descartar();
  }, [token]);

  return null;
}
