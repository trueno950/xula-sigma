"use client";

import { useEffect } from "react";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { urlSinElAviso } from "./urlSinElAviso";

/**
 * Deja la URL sin el token del aviso y borra su cookie, sin redibujar la
 * ruta, para que el aviso de la baja no vuelva al recargar (S14 de
 * `usuarios-ux`). Con JavaScript el proxy no alcanza: el `Set-Cookie` de su
 * borrado viaja en el render sintetico del `redirect` y el navegador no lo
 * guarda. La explicacion completa, una sola vez, en `AGENTS.md`, nota de
 * `usuarios`.
 *
 * Si el `POST` no llega, la cookie vence sola a los 120 segundos y la URL ya
 * esta limpia: recargar no vuelve a pedir el token.
 */
const RUTA_DE_DESCARTE = "/usuarios/aviso";

export function DescartarAvisoAlMostrar({ token }: { token: string }) {
  useEffect(() => {
    const limpia = urlSinElAviso(new URL(window.location.href), token);
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
          "[descartarAviso] no se pudo borrar la cookie",
          datosSegurosDeError(error),
        );
      }
    };

    void descartar();
  }, [token]);

  return null;
}
