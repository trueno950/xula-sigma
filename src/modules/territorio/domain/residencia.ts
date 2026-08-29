/**
 * Espejo en TypeScript del CHECK `residencias_vigencia` (design.md seccion
 * 8, `esquema.ts`): la comparacion es sobre fechas civiles `YYYY-MM-DD`, que
 * ordenan igual como texto que como fecha por el formato ISO — no hace
 * falta parsear a `Date`. Ningun caso de uso la invoca todavia:
 * `registrarMudanza` siempre computa `desdeEn`/`hastaEn` con
 * `hoyEnMerida()` y nunca los recibe del cliente, asi que la unica
 * proteccion real hoy es el CHECK de Postgres. Se testea igual porque
 * describe la regla de negocio sin necesitar base de datos (hallazgo de
 * GGA en la revision de esta rebanada: el comentario anterior afirmaba un
 * uso que no existia).
 */
export const vigenciaValida = (
  desdeEn: string,
  hastaEn: string | null,
): boolean => hastaEn === null || hastaEn >= desdeEn;
