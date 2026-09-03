import { headers } from "next/headers";
import { TenantNoResueltoError } from "@/shared/lib/errores";
import { CABECERA_SUBDOMINIO, CABECERA_SUPERFICIE } from "./cabeceras";
import { leerSubdominio, type Subdominio } from "./subdominio";
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
 * escribio sus cabeceras. Primero `host` y despues `x-forwarded-host`.
 *
 * El caso que existe para esto: cuando un Server Action redirige, Next
 * renderiza el destino dentro de la misma respuesta con un request
 * sintetico —`host` propio del servidor, sin las cabeceras que el
 * middleware escribio en el request original— y el host original queda en
 * `x-forwarded-host`. La resolucion es la misma que hace el proxy
 * (`leerSubdominio`), un nivel mas adentro.
 *
 * **`host` va primero, y el orden es la reja.** El proxy solo confia en
 * `host`; `x-forwarded-host` es la unica de las dos que un cliente puede
 * agregar sin tocar la que su navegador ya fija. Consultando `host` antes,
 * un `x-forwarded-host` ajeno no puede ganarle a un `host` que resuelve
 * municipio: solo se llega al segundo cuando el primero no nombra ninguno.
 * Que es exactamente la firma del render sintetico, donde `host` es el del
 * propio servidor y `leerSubdominio` lo descarta.
 *
 * Al reves —que era como estaba— un `x-forwarded-host` falseado ganaba
 * sobre un `host` legitimo en cualquier request que llegara sin la
 * cabecera del proxy.
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
 * la saquen deja de aportar. No queda nada colgando de ella: el orden de
 * arriba ya impide que un `x-forwarded-host` ajeno le gane a un `host`
 * legitimo, y esa reja si es nuestra. Las dos son test y no prosa:
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
  cabeceras.get("host"),
  cabeceras.get("x-forwarded-host"),
];

/**
 * El mejor resultado entre los hosts disponibles, con **un municipio
 * nombrado ganandole a cualquier otra superficie**.
 *
 * No alcanza con quedarse con el primero que no sea invalido. En el render
 * sintetico `host` es el del propio servidor, que con `DOMINIO_BASE`
 * =`localhost` es exactamente el dominio base: `leerSubdominio` lo lee como
 * `raiz`, que no es invalido. Tomandolo, el panel resolvia superficie
 * `raiz` y respondia 404 justo despues de guardar. Lo encontro
 * `e2e/respaldoPorHost.spec.ts` -"tras guardar, el destino del redirect
 * resuelve el municipio"-, no el razonamiento.
 */
function resolverEntreHosts(cabeceras: Headers): Subdominio {
  const base = process.env.DOMINIO_BASE ?? "localhost";
  const resultados = hostsDelRequest(cabeceras).map((host) =>
    leerSubdominio(host, base),
  );

  return (
    resultados.find((r) => r.tipo === "ayuntamiento") ??
    resultados.find((r) => r.tipo !== "invalido") ?? { tipo: "invalido" }
  );
}

/**
 * La superficie escrita por el proxy, salvo el caso medido en que miente.
 *
 * En el render sintetico el request interno **si pasa por el proxy** -el
 * matcher cubre `localhost`- y ahi el proxy lee `host: localhost:3000`,
 * que es el dominio base pelado, y lo resuelve como `raiz`. Escribe
 * entonces `x-xula-superficie: raiz` y ningun subdominio, porque esa rama
 * no lo escribe. Medido:
 *
 *     {"escrita":"raiz","host":"localhost:3100",
 *      "fwd":"motul.localhost:3100","sub":null}
 *
 * Con la escrita cortando siempre, `(panel)/layout.tsx` veia superficie
 * `raiz`, llamaba `notFound()` y la pantalla respondia **404 justo despues
 * de guardar**: el dato quedaba y la vista no. Por eso un municipio
 * nombrado por los hosts le gana a una `raiz` escrita.
 *
 * Solo a `raiz`. `admin` es otra superficie de verdad y no se pisa: el
 * panel de SUPER_ADMIN vive fuera del espacio de tenants a proposito.
 */
function superficieDe(cabeceras: Headers): string | null {
  const escrita = cabeceras.get(CABECERA_SUPERFICIE);

  if (escrita && escrita !== "raiz") return escrita;

  const resultado = resolverEntreHosts(cabeceras);

  if (resultado.tipo === "ayuntamiento") return "ayuntamiento";

  if (escrita) return escrita;

  return resultado.tipo === "invalido" ? null : resultado.tipo;
}

function subdominioDe(cabeceras: Headers): string | null {
  const escrita = cabeceras.get(CABECERA_SUBDOMINIO);
  if (escrita) return escrita;

  const resultado = resolverEntreHosts(cabeceras);

  return resultado.tipo === "ayuntamiento" ? resultado.subdominio : null;
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
