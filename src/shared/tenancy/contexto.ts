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
 * (`leerSubdominio`), un nivel mas adentro.
 *
 * **Estas dos cabeceras las controla quien hace la peticion**, asi que la
 * pregunta obligada es si cambiarlas mueve el tenant. Se midio, no se
 * dedujo, y son dos rejas distintas segun por donde entre:
 *
 * 1. **Navegacion normal**: el respaldo no se alcanza. El matcher del
 *    proxy cubre todo salvo assets, y `proxy.ts` borra las `x-xula-*` que
 *    vengan del cliente y escribe la suya desde `host`. Un
 *    `x-forwarded-host` ajeno queda ignorado.
 * 2. **El POST de un Server Action**, que es el unico camino hasta el
 *    render sintetico: Next compara `x-forwarded-host` contra `Origin` y
 *    aborta con "Invalid Server Actions request" si no coinciden. La
 *    cabecera falseada nunca llega a este archivo.
 *
 * La 2 es de Next y no nuestra -verificado en 16.3.1-, asi que el dia que
 * la saquen esto se queda sin piso. Por eso las dos son test y no prosa:
 * `e2e/respaldoPorHost.spec.ts`. Hacen falta las dos: la 1 cubre las
 * superficies que resuelven municipio **sin sesion**
 * -`(acceso)/layout.tsx`, `(acceso)/page.tsx`, `(acceso)/acceso/page.tsx`
 * y `validar/[folio]/page.tsx`-, donde no hay sesion que perder.
 *
 * Donde si hay sesion, hay una tercera reja que no depende de ninguna
 * cabecera: `conAuth` (`shared/auth/instancia.ts`) abre `withTenant` con
 * el ayuntamiento que sale de aca y Better Auth busca la sesion adentro de
 * esa transaccion, bajo RLS. Nombrar otro municipio mueve tambien esa
 * busqueda y la fila propia de `sesiones` deja de verse: elegir un tenant
 * ajeno cuesta la sesion propia. Ejercitado en
 * `shared/auth/sesionCruzada.integration.test.ts`.
 *
 * La derivacion en si -orden y forma- esta en `contexto.test.ts`.
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
