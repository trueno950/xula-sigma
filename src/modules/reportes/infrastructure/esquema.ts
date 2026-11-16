/**
 * Punto unico de import para las tablas del modulo: quien necesita mas de
 * una (los tests de aislamiento, por ejemplo) no arma un import por tabla.
 * Cada tabla vive en su propio archivo por la metrica de lineas por
 * archivo (`AGENTS.md`).
 */
export { configuracionDeReportes } from "./configuracionDeReportes";
export { foliosDeReportes } from "./foliosDeReportes";
export { movimientosDeReportes } from "./movimientosDeReportes";
export { reportes } from "./reportes";
