/**
 * Punto unico de import para las tres tablas: quien necesita mas de una
 * (los tests de aislamiento, por ejemplo) no arma tres imports distintos.
 * Cada tabla vive en su propio archivo por la metrica de lineas por
 * archivo (`AGENTS.md`).
 */
export { foliosDeReportes } from "./foliosDeReportes";
export { movimientosDeReportes } from "./movimientosDeReportes";
export { reportes } from "./reportes";
