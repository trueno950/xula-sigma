/**
 * Los cuatro roles de la plataforma.
 *
 * Aca vive solo el conjunto; las reglas puras que lo consumen
 * (`puedeRestablecerContrasenia`, etc.) llegan con PR 3.
 *
 * **Un modulo de negocio NO importa esto.** Cuando `padron` necesite
 * "¿este rol puede exportar el padron?", declara su propia union en su
 * `domain/` y la duplica: `domain` no importa nada, ni siquiera `shared`.
 * Cuatro lineas duplicadas cuestan menos que perder la pureza de la capa.
 */
export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN_MUNICIPAL",
  "OPERADOR",
  "CONSULTA",
] as const;

export type Rol = (typeof ROLES)[number];
