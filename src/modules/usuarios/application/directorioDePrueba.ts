import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { RolAsignable, UsuarioDelPanel } from "../domain";
import type { DirectorioDeUsuarios } from "./puertos";

/**
 * El doble de `DirectorioDeUsuarios` para los tests de los casos de uso:
 * un arreglo en memoria, sin Postgres.
 *
 * Vive en `application/` y no en `infrastructure/` por una razon mecanica,
 * la misma que documenta `marca/application/almacenDePrueba.ts`: un
 * `application/*.test.ts` matchea `^src/modules/[^/]+/application/`, asi que
 * importar el fake desde `infrastructure/` haria fallar
 * `application-no-importa-infra-ni-ui` en el test mismo.
 */
export type DirectorioDePrueba = DirectorioDeUsuarios & {
  /** Lo que el listado devuelve, para afirmar contra el estado del fake. */
  readonly filas: UsuarioDelPanel[];
  /** Cada alta que llego, en orden, con lo que se le paso al adaptador. */
  readonly altas: readonly {
    ayuntamientoId: AyuntamientoId;
    datos: {
      nombre: string;
      email: string;
      clave: string;
      rol: RolAsignable;
    };
  }[];
  /** El id que devuelve la proxima alta. */
  idDeAlta: string;
  /** Hace que la proxima alta lance el error recibido. */
  fallarEnAlta(error: unknown): void;
};

export function crearDirectorioDePrueba(
  filas: readonly UsuarioDelPanel[] = [],
): DirectorioDePrueba {
  const altas: DirectorioDePrueba["altas"][number][] = [];
  let errorDeAlta: unknown = null;

  return {
    filas: [...filas],
    altas,
    idDeAlta: "usuario-nuevo",
    fallarEnAlta(error) {
      errorDeAlta = error;
    },
    async listar(_tx: TransaccionTenant) {
      return [...filas];
    },
    async darDeAlta(tx, ayuntamientoId, datos) {
      if (tx === undefined) throw new Error("El caso de uso abrio la tx.");
      if (errorDeAlta) {
        const error = errorDeAlta;
        errorDeAlta = null;
        throw error;
      }

      altas.push({ ayuntamientoId, datos });

      return { id: "usuario-nuevo" };
    },
  };
}
