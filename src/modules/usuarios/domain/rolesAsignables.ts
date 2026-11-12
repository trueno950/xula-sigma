/**
 * Los unicos roles que el panel da de alta (S3).
 *
 * Decision del usuario en `odd/tasks/administracion-de-usuarios.md`: «El
 * municipio tiene un solo administrador. Si se traba, lo destraba el
 * SUPER_ADMIN, como ya preve la spec.» Crear un segundo `ADMIN_MUNICIPAL`
 * —o un `SUPER_ADMIN`, que es peor— desde una pantalla de municipio es una
 * escalada, y por eso la lista es cerrada.
 *
 * **Vive en el dominio del modulo y no en `shared/auth/roles.ts`.** No es
 * una regla de la plataforma sino de esta pantalla: el `SUPER_ADMIN`
 * provisiona municipios y el `ADMIN_MUNICIPAL` los administra, y ninguno de
 * los dos se crea desde aca. Un rol que solo esta pantalla asigna no tiene
 * por que estar disponible para todo el sistema.
 *
 * `domain` no importa `shared`, asi que el conjunto declara sus dos valores
 * en vez de derivarlos de `ROLES`; el test afirma que los dos son roles del
 * sistema, que es lo unico que hace falta sostener.
 */
export const ROLES_ASIGNABLES = ["OPERADOR", "CONSULTA"] as const;

export type RolAsignable = (typeof ROLES_ASIGNABLES)[number];

/**
 * La frontera del alta: convierte el texto del formulario en un rol, o
 * devuelve `false`. El valor llega sin tipo desde una Server Action, igual
 * que en `esRol` de `shared/auth`.
 */
export const esRolAsignable = (valor: unknown): valor is RolAsignable =>
  typeof valor === "string" &&
  (ROLES_ASIGNABLES as readonly string[]).includes(valor);
