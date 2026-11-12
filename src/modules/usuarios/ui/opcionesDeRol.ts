import type { OpcionDeLista } from "@/shared/ui";
import { etiquetaDeRol } from "@/shared/ui/etiquetaDeRol";
import { ROLES_ASIGNABLES, type RolAsignable } from "../domain";

/**
 * Las opciones del `<select>` del alta (S3): solo operador y consulta.
 *
 * La lista sale de `ROLES_ASIGNABLES` y no se escribe aca. Si se escribiera,
 * la pantalla ofreceria un rol que el servidor rechaza —o al reves, el
 * servidor aceptaria uno que la pantalla nunca muestra— y ninguna de las dos
 * mitades fallaria.
 */
export const opcionesDeRol: readonly OpcionDeLista[] = ROLES_ASIGNABLES.map(
  (rol: RolAsignable) => ({
    valor: rol,
    etiqueta: etiquetaDeRol(rol),
  }),
);
