import { headers } from "next/headers";
import { conAuth } from "./instancia";

/**
 * La sesion del request actual, o `null`.
 *
 * Vive aparte de `instancia.ts` porque importa `next/headers` y eso ata el
 * archivo al framework; `instancia.ts` se mantiene libre de Next para
 * poder ejercitarse contra Postgres sin levantar un request. Es el mismo
 * corte que separa `contexto.ts` de `withTenant.ts` en tenancy.
 */
export async function sesionActual() {
  const cabeceras = await headers();

  /**
   * El origen se arma con el Host de la peticion, que es el subdominio del
   * municipio. `x-forwarded-proto` lo pone el proxy de Railway; en local
   * no viene y entonces es http.
   */
  const host = cabeceras.get("host") ?? "localhost:3000";
  const protocolo = cabeceras.get("x-forwarded-proto") ?? "http";
  const origen = `${protocolo}://${host}`;

  return conAuth(origen, (auth) => auth.api.getSession({ headers: cabeceras }));
}
