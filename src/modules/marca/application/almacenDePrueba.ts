import { claveTenantDesdeUrl } from "../domain/claveDesdeUrl";
import type { AlmacenDeAssets } from "./puertos";

/**
 * El doble de `AlmacenDeAssets` para tests: `Map<clave, bytes>` en memoria,
 * sin R2. Vive en `application/` y no en `infrastructure/` por una razon
 * mecanica: un `application/cambiarEscudo.test.ts` matchea
 * `^src/modules/[^/]+/application/`, asi que importar el fake desde
 * `infrastructure/` haria fallar `application-no-importa-infra-ni-ui` en
 * el test mismo.
 */

/** Dominio publico de mentira: simula `R2_PUBLIC_URL` sin credenciales. */
const BASE_DE_PRUEBA = "https://assets.prueba.local";

export type AlmacenDePrueba = AlmacenDeAssets & {
  /** Lo que sigue guardado, para afirmar contra el estado del fake. */
  guardados: Map<string, Uint8Array>;
  /** Las URL que de verdad se borraron, en el orden en que se borraron. */
  borrados: string[];
  /** Hace que la proxima llamada a `guardar` lance. */
  fallarEnGuardar(): void;
  /** Hace que la proxima llamada a `borrar` sobre una URL propia lance. */
  fallarEnBorrar(): void;
};

export function crearAlmacenDePrueba(): AlmacenDePrueba {
  const guardados = new Map<string, Uint8Array>();
  const borrados: string[] = [];
  let debeFallarGuardar = false;
  let debeFallarBorrar = false;

  return {
    guardados,
    borrados,
    fallarEnGuardar: () => {
      debeFallarGuardar = true;
    },
    fallarEnBorrar: () => {
      debeFallarBorrar = true;
    },
    async guardar(clave, bytes) {
      if (debeFallarGuardar) {
        throw new Error("fallo forzado de guardar, para pruebas");
      }

      guardados.set(clave, bytes);

      return `${BASE_DE_PRUEBA}/${clave}`;
    },
    async borrar(ayuntamientoId, url) {
      const clave = claveTenantDesdeUrl(BASE_DE_PRUEBA, ayuntamientoId, url);

      if (!clave) return;
      if (debeFallarBorrar) {
        throw new Error("fallo forzado de borrar, para pruebas");
      }

      guardados.delete(clave);
      borrados.push(url);
    },
  };
}
