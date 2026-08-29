/**
 * Espejo en TypeScript del CHECK `residencias_vigencia` (design.md seccion
 * 8, `esquema.ts`): la comparacion es sobre fechas civiles `YYYY-MM-DD`, que
 * ordenan igual como texto que como fecha por el formato ISO — no hace
 * falta parsear a `Date`. `registrarMudanza` la usa para rechazar antes de
 * escribir, en vez de dejar que el CHECK lo haga en Postgres.
 */
export const vigenciaValida = (
  desdeEn: string,
  hastaEn: string | null,
): boolean => hastaEn === null || hastaEn >= desdeEn;
