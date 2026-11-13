import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { descargaDeDatos } from "@/app/exportacion/descargaDeDatos";
import { contextoActual } from "@/shared/auth";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  NoAutorizadoError,
  NoEncontradoError,
  TenantNoResueltoError,
} from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { CABECERA_SUPERFICIE } from "@/shared/tenancy/cabeceras";
import { exigirAyuntamiento } from "@/shared/tenancy/contexto";

/**
 * La descarga de S1 y S6: `GET /exportacion/descarga`.
 *
 * **Las guardas se repiten porque los layouts no envuelven Route
 * Handlers** —`(panel)/layout.tsx` no corre aca—: superficie, ayuntamiento
 * y sesion, en ese orden y por el mismo motivo que
 * `constancias/[id]/pdf/route.ts`. El `ayuntamientoId` sale del contexto del
 * servidor y no de la URL: no hay ningun parametro que el cliente pueda
 * mandar.
 *
 * El ZIP se arma entero antes de responder, en memoria. Un ZIP en streaming
 * que fallara a la mitad le dejaria a la operadora un archivo que abre y
 * esta incompleto —exactamente lo que S4 prohibe—, mientras que un 500 no
 * deja archivo.
 */

export const runtime = "nodejs";

const TEXTO_PLANO = { "Content-Type": "text/plain; charset=utf-8" };

/** Mensajes para la operadora: en espanol, sin el texto de la excepcion. */
const SIN_PERMISO =
  "Su rol no tiene permiso para descargar los datos del ayuntamiento.";
const FALLA =
  "No se pudo preparar la descarga. Vuelva a intentarlo en un momento.";

const respuestaDeTexto = (estado: number, mensaje: string) =>
  new Response(mensaje, { status: estado, headers: TEXTO_PLANO });

async function conBorde(contexto: ContextoActual): Promise<Response> {
  try {
    const { bytes, nombre } = await descargaDeDatos(contexto);

    // `as BodyInit`: misma discrepancia de tipos que el PDF de constancias
    // —`Uint8Array<ArrayBufferLike>` contra el `BodyInit` de `lib.dom`—. En
    // ejecucion un `Uint8Array` siempre fue un cuerpo valido.
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${nombre}"`,
        // Lleva padron, domicilios y bitacora: una copia en el cache de un
        // navegador compartido del palacio es la fuga.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof NoAutorizadoError) {
      return respuestaDeTexto(403, SIN_PERMISO);
    }

    if (
      error instanceof NoEncontradoError ||
      error instanceof TenantNoResueltoError
    ) {
      return new Response(null, { status: 404 });
    }

    // El motivo crudo nunca sale al cliente ni al log: puede nombrar tabla,
    // columna o el valor de una fila (`datosSegurosDeError`).
    console.error(
      "[exportacion] fallo no manejado al preparar la descarga",
      datosSegurosDeError(error),
    );

    return respuestaDeTexto(500, FALLA);
  }
}

export async function GET(): Promise<Response> {
  if ((await headers()).get(CABECERA_SUPERFICIE) !== "ayuntamiento") {
    return notFound();
  }

  await exigirAyuntamiento();

  const contexto = await contextoActual();
  if (!contexto) return new Response(null, { status: 401 });

  return conBorde(contexto);
}
