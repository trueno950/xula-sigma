import { fechaYHoraIsoEnMerida } from "@/shared/lib/fecha";

/**
 * La fecha civil (`YYYY-MM-DD` en `America/Merida`) de un instante ya
 * guardado, como `reportes.registrado_en`.
 *
 * Sale de `shared/lib/fecha` y no de `getDate()`/`getMonth()`: el servidor
 * corre en UTC, y un reporte de las 19:00 del 31 de diciembre en Merida es
 * del dia siguiente para el proceso. `shared/lib/fecha` ya resuelve esa
 * conversion en `fechaYHoraIsoEnMerida`, cuya forma empieza con el dia civil
 * -la hora se usa en la exportacion, no aca-, asi que no hace falta una
 * segunda funcion de formato alla para leer solo la fecha.
 */
export const fechaCivilDeInstante = (instante: Date): string =>
  fechaYHoraIsoEnMerida(instante).slice(0, 10);
