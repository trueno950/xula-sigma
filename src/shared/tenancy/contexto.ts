import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  AyuntamientoInexistenteError,
  TenantNoResueltoError,
} from "@/shared/lib/errores";
import { CABECERA_SUBDOMINIO, CABECERA_SUPERFICIE } from "./cabeceras";
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
 * `superficieActual` y `ayuntamientoActual` leen **solo** lo que escribio
 * el proxy. Sin esa cabecera no derivan nada: `ayuntamientoActual` falla y
 * `superficieActual` devuelve `null`.
 *
 * Hubo una version que derivaba el tenant de `host`/`x-forwarded-host`
 * cuando la cabecera faltaba, para sostener el render sintetico del
 * redirect de un Server Action. Se saco: dos puertas de resolucion de
 * tenant es una de mas, y la de aca no tenia como sanear nada -se alcanza
 * justo cuando el proxy no corrio-. Una peticion al dominio raiz pelado
 * con `x-forwarded-host: motul.<base>` se servia como Motul; reproducido
 * con curl antes de sacarla.
 *
 * El caso que la motivaba lo cubre ahora `resolverHost` en `proxy.ts`,
 * que es donde ya se borran las cabeceras del cliente y donde `host`
 * manda sobre `x-forwarded-host`.
 */

function superficieDe(cabeceras: Headers): string | null {
  return cabeceras.get(CABECERA_SUPERFICIE);
}

function subdominioDe(cabeceras: Headers): string | null {
  return cabeceras.get(CABECERA_SUBDOMINIO);
}

/**
 * La superficie del request actual ("ayuntamiento", "admin", "raiz"), tal
 * como la escribio el proxy. Sin caidas ni derivacion: de donde sale ese
 * valor lo decide `resolverHost` en `proxy.ts`, y el bloque de arriba
 * explica por que ahi y no aca.
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
    throw new AyuntamientoInexistenteError(subdominio);
  }

  return ayuntamiento;
}

/**
 * `ayuntamientoActual` para el borde de un request: un subdominio que no
 * tiene municipio responde 404, igual que el dominio base pelado. Un 500
 * ahi delata que la ruta esperaba un tenant, y no distingue lo que el 404
 * de la raiz ya no distingue.
 *
 * Solo ese caso: la falta de cabecera del proxy sigue lanzando.
 */
export async function exigirAyuntamiento(): Promise<AyuntamientoResuelto> {
  try {
    return await ayuntamientoActual();
  } catch (error) {
    if (error instanceof AyuntamientoInexistenteError) notFound();

    throw error;
  }
}
