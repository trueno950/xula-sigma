import type { ClaveDeIcono } from "../domain";

/**
 * Un icono por tipo, dibujado con trazos de 24x24 dentro del propio codigo:
 * ni archivo en disco ni sprite pedido por red (regla 10 de `AGENTS.md`).
 *
 * Son datos y no componentes porque los necesitan los dos caminos: el pin de
 * Leaflet los pide como texto -`divIcon` recibe una cadena- y la leyenda los
 * pinta con `IconoDeMapa`. Una sola lista de trazos para los dos.
 */
export const TRAZOS_DE_ICONO: Readonly<
  Record<ClaveDeIcono, readonly string[]>
> = {
  BACHE: ["M3 18c1.6-6.5 4.6-10 9-10s7.4 3.5 9 10z", "M9 17.4a3 3 0 0 1 6 0z"],
  ALUMBRADO: [
    "M12 3a6 6 0 0 0-3.6 10.8V16h7.2v-2.2A6 6 0 0 0 12 3z",
    "M9.5 18h5v2.6h-5z",
  ],
  FUGA: ["M12 2.5c3.6 4.6 6 7.8 6 10.5a6 6 0 0 1-12 0c0-2.7 2.4-5.9 6-10.5z"],
  BASURA: ["M9.6 3h4.8l.8 2.3H19v2.2H5V5.3h3.8z", "M6.6 9h10.8l-1 12H7.6z"],
  PARQUE: ["M12 2.5 17.5 10H14l4 6H6l4-6H6.5z", "M11 16h2v5.5h-2z"],
  OBRA: ["M4 18a8 8 0 0 1 4.6-7.3V6.5h6.8v4.2A8 8 0 0 1 20 18z"],
  REPAVIMENTACION: [
    "M8 13.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    "M12.5 16.5H21v2h-8.5z",
  ],
  PAVIMENTACION: [
    "M3 20 9 6h2l-6 14z",
    "M11 20l6-14h2l-6 14z",
    "M4 16h16v1.6H4z",
  ],
  MEJORA: ["M12 2.8l2.3 6.9 6.9 2.3-6.9 2.3L12 21.2l-2.3-6.9L2.8 12l6.9-2.3z"],
  MANTENIMIENTO: [
    "M14.2 2.6a5.2 5.2 0 0 0-4.7 7.2L3.4 15.9l4.7 4.7 6.1-6.1a5.2 5.2 0 0 0 7.2-4.7l-3.3 3.3-4.7-4.7z",
  ],
  OTRO: ["M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z"],
};

/**
 * El mismo icono como texto, para `divIcon`. `currentColor` lo hereda del
 * pin, que es quien lleva el color del estado: el icono dice que es y el
 * color dice como esta.
 */
export const svgDeIcono = (clave: ClaveDeIcono): string =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false">${TRAZOS_DE_ICONO[
    clave
  ]
    .map((trazo) => `<path d="${trazo}"/>`)
    .join("")}</svg>`;
