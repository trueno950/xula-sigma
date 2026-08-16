import { headers } from "next/headers";
import { TenantNoResueltoError } from "@/shared/lib/errores";
import { CABECERA_SUBDOMINIO } from "./cabeceras";
import {
  type AyuntamientoResuelto,
  resolverAyuntamientoPorSubdominio,
} from "./withTenant";

/**
 * El ayuntamiento del request actual.
 *
 * Vive aparte de `withTenant.ts` porque importa `next/headers` y eso ata
 * el archivo al framework. `withTenant` se mantiene libre de Next para
 * poder testearse contra Postgres sin levantar un request.
 *
 * De aca —y solo de aca— sale el `ayuntamientoId` que se le pasa a
 * `withTenant`. Nunca del body, del query string, ni de un parametro de
 * ruta. Es el invariante 1: el tenant efectivo siempre viene del contexto
 * resuelto en servidor.
 */
export async function ayuntamientoActual(): Promise<AyuntamientoResuelto> {
  const cabeceras = await headers();

  // La escribio `proxy.ts`, que antes borra cualquier valor entrante. Si
  // no esta, el proxy no corrio para esta ruta: es un error de
  // configuracion del matcher, no un caso de negocio.
  const subdominio = cabeceras.get(CABECERA_SUBDOMINIO);

  if (!subdominio) {
    throw new TenantNoResueltoError(
      "La peticion no trae subdominio de ayuntamiento. Revisar que " +
        "`proxy.ts` cubra esta ruta en su matcher.",
    );
  }

  const ayuntamiento = await resolverAyuntamientoPorSubdominio(subdominio);

  if (!ayuntamiento) {
    // El subdominio tiene forma valida pero no corresponde a ningun
    // municipio dado de alta. Es un 404, no un 403: confirmar que existe
    // ya seria informacion.
    throw new TenantNoResueltoError(
      `No hay ningun ayuntamiento con el subdominio "${subdominio}".`,
    );
  }

  return ayuntamiento;
}
