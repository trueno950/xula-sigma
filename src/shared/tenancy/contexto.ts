import { headers } from "next/headers";
import { TenantNoResueltoError } from "@/shared/lib/errores";
import { CABECERA_SUBDOMINIO, CABECERA_SUPERFICIE } from "./cabeceras";
import { leerSubdominio } from "./subdominio";
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
 * `withTenant`. Es el invariante 1; la regla completa esta en
 * `ayuntamientoId.ts`.
 */

/**
 * Los hosts de los que se puede derivar el tenant cuando el proxy no
 * escribio sus cabeceras. Primero `x-forwarded-host` y despues `host`.
 *
 * El caso que existe para esto: cuando un Server Action redirige, Next
 * renderiza el destino dentro de la misma respuesta con un request
 * sintetico —`host` propio del servidor, sin las cabeceras que el
 * middleware escribio en el request original— y el host original queda en
 * `x-forwarded-host`. La resolucion es la misma que hace el proxy
 * (`leerSubdominio`), un nivel mas adentro, y la sesion sigue acotada por
 * cookie de subdominio, asi que un valor ajeno no alcanza a leer datos de
 * otro municipio.
 */
const hostsDelRequest = (cabeceras: Headers): Array<string | null> => [
  cabeceras.get("x-forwarded-host"),
  cabeceras.get("host"),
];

function superficieDe(cabeceras: Headers): string | null {
  const escrita = cabeceras.get(CABECERA_SUPERFICIE);
  if (escrita) return escrita;

  for (const host of hostsDelRequest(cabeceras)) {
    const resultado = leerSubdominio(
      host,
      process.env.DOMINIO_BASE ?? "localhost",
    );
    if (resultado.tipo !== "invalido") return resultado.tipo;
  }

  return null;
}

function subdominioDe(cabeceras: Headers): string | null {
  const escrita = cabeceras.get(CABECERA_SUBDOMINIO);
  if (escrita) return escrita;

  for (const host of hostsDelRequest(cabeceras)) {
    const resultado = leerSubdominio(
      host,
      process.env.DOMINIO_BASE ?? "localhost",
    );
    if (resultado.tipo === "ayuntamiento") return resultado.subdominio;
  }

  return null;
}

/**
 * La superficie del request actual ("ayuntamiento", "admin", "raiz").
 * La misma resolucion que los layouts usaban sobre la cabecera pelada,
 * con la caida al host para el render sintetico de los redirects.
 */
export async function superficieActual(): Promise<string | null> {
  return superficieDe(await headers());
}

export async function ayuntamientoActual(): Promise<AyuntamientoResuelto> {
  const cabeceras = await headers();

  const subdominio = subdominioDe(cabeceras);

  if (!subdominio) {
    throw new TenantNoResueltoError(
      "La peticion no trae subdominio de ayuntamiento. Revisar que " +
        "`proxy.ts` cubra esta ruta en su matcher.",
    );
  }

  const ayuntamiento = await resolverAyuntamientoPorSubdominio(subdominio);

  if (!ayuntamiento) {
    throw new TenantNoResueltoError(
      `No hay ningun ayuntamiento con el subdominio "${subdominio}".`,
    );
  }

  return ayuntamiento;
}
