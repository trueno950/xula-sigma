import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AyuntamientoInexistenteError } from "@/shared/lib/errores";
import { conAuth } from "./instancia";
import { origenDelRequest } from "./origen";

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

  // Aca no hay `request.url`, solo cabeceras: de ahi el respaldo local.
  const origen = origenDelRequest(cabeceras);

  try {
    return await conAuth(origen, (auth) =>
      auth.api.getSession({ headers: cabeceras }),
    );
  } catch (error) {
    if (error instanceof AyuntamientoInexistenteError) notFound();

    throw error;
  }
}
