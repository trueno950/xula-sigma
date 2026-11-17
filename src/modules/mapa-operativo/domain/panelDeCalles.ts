/**
 * Las dos vistas del panel de calles (S4). Viven en la URL (`?panel=`) y no
 * en estado de cliente: cada una tiene su direccion, y sin JavaScript las dos
 * listas siguen en el HTML del servidor y se alcanzan por su enlace.
 */
export const PANELES_DEL_MAPA = ["en-el-mapa", "sin-ubicar"] as const;

export type PanelDeCalles = (typeof PANELES_DEL_MAPA)[number];

export const PANEL_POR_DEFECTO: PanelDeCalles = "en-el-mapa";
