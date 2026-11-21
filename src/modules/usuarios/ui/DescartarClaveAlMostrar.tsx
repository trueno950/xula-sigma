"use client";

import { useEffect } from "react";
import { urlSinLaClaveMostrada } from "./urlSinLaClaveMostrada";

/**
 * Deja la URL sin el token de la clave ni la confirmacion que lo acompanaba,
 * al pintar la tarjeta (S9 de `usuarios-ux`), para que recargar o volver atras
 * no lleve el token. Por que `replaceState` y por que al pintar:
 * `AGENTS.md`, seccion Server Actions, nota de `usuarios`.
 *
 * **No toca cookies.** En la navegacion de documento las borra el proxy en la
 * misma respuesta; con JavaScript las borra el `POST` de
 * `ClaveTemporalAlMostrar`, que es el que recibe la clave (S4 de
 * `usuarios-seguridad`).
 */
export function DescartarClaveAlMostrar() {
  useEffect(() => {
    const limpia = urlSinLaClaveMostrada(new URL(window.location.href));
    if (limpia) window.history.replaceState(null, "", limpia);
  }, []);

  return null;
}
