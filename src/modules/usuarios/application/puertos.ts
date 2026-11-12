import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { RolAsignable, UsuarioDelPanel } from "../domain";

/**
 * Lo que el modulo necesita de la tabla `usuarios`, sin saber que detras hay
 * Postgres.
 *
 * **Recibe la transaccion y no la abre**, mismo criterio que
 * `RepositorioDePersonas` de `padron`: el caso de uso es quien fija el
 * tenant —con `withTenant(contexto.ayuntamientoId)`— y el adaptador no tiene
 * forma de equivocarse de municipio. `ayuntamientoId` viaja aparte porque la
 * fila nueva lo necesita explicito y el contexto es del caso de uso.
 *
 * `darDeAlta` entrega solo el `id`: lo que la pantalla muestra despues de un
 * alta es la clave temporal, que genera el caso de uso y nunca el
 * adaptador.
 */
export type DirectorioDeUsuarios = {
  listar(tx: TransaccionTenant): Promise<readonly UsuarioDelPanel[]>;
  darDeAlta(
    tx: TransaccionTenant,
    ayuntamientoId: AyuntamientoId,
    datos: {
      nombre: string;
      email: string;
      clave: string;
      rol: RolAsignable;
    },
  ): Promise<{ id: string }>;
};
