import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { CodigoDeDescarga } from "@/app/exportacion/codigosDeDescarga";
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
 * El ZIP se arma entero antes de responder, en memoria: en streaming, un
 * fallo a la mitad deja un archivo que abre incompleto, mientras que un 500
 * no deja archivo. Por que eso importa, en `shared/exportacion/exportar.ts`.
 *
 * **Un fallo no puede reemplazar la pantalla (S13).** El enlace del panel es
 * una navegacion del navegador —asi funciona sin JavaScript—, y a una
 * navegacion no se le contesta `text/plain`: volveria una pagina blanca con el
 * mensaje suelto. Por eso, cuando la peticion acepta HTML, el fallo vuelve a
 * `/exportacion?error=<codigo>` y el texto lo pone la pantalla. La isla pide
 * el ZIP con `accept: application/zip`, que no es una navegacion, y recibe el
 * estado para pintar el mismo mensaje.
 */

export const runtime = "nodejs";

const TEXTO_PLANO = { "Content-Type": "text/plain; charset=utf-8" };

/** Mensajes para quien pide sin navegar: en espanol, sin el texto de la excepcion. */
const SIN_PERMISO =
  "Su rol no tiene permiso para descargar los datos del ayuntamiento.";
const FALLA =
  "No se pudo preparar la descarga. Vuelva a intentarlo en un momento.";

const respuestaDeTexto = (estado: number, mensaje: string) =>
  new Response(mensaje, { status: estado, headers: TEXTO_PLANO });

const esNavegacion = (peticion: Request): boolean =>
  (peticion.headers.get("accept") ?? "").includes("text/html");

/**
 * Un fallo, contado como lo pueda leer quien lo pidio: al navegador, con un
 * codigo en la URL de la pantalla; al resto, con el estado y su mensaje.
 */
const respuestaDeFallo = (
  peticion: Request,
  fallo: { estado: number; codigo: CodigoDeDescarga; mensaje: string },
): Response => {
  if (!esNavegacion(peticion)) {
    return respuestaDeTexto(fallo.estado, fallo.mensaje);
  }

  return Response.redirect(
    new URL(`/exportacion?error=${fallo.codigo}`, peticion.url),
    303,
  );
};

async function conBorde(
  peticion: Request,
  contexto: ContextoActual,
): Promise<Response> {
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
      return respuestaDeFallo(peticion, {
        estado: 403,
        codigo: "sin-permiso",
        mensaje: SIN_PERMISO,
      });
    }

    if (
      error instanceof NoEncontradoError ||
      error instanceof TenantNoResueltoError
    ) {
      return respuestaDeFallo(peticion, {
        estado: 404,
        codigo: "no-encontrado",
        mensaje: "",
      });
    }

    // El motivo crudo nunca sale al cliente ni al log: puede nombrar tabla,
    // columna o el valor de una fila (`datosSegurosDeError`).
    console.error(
      "[exportacion] fallo no manejado al preparar la descarga",
      datosSegurosDeError(error),
    );

    return respuestaDeFallo(peticion, {
      estado: 500,
      codigo: "fallo",
      mensaje: FALLA,
    });
  }
}

export async function GET(peticion: Request): Promise<Response> {
  if ((await headers()).get(CABECERA_SUPERFICIE) !== "ayuntamiento") {
    return notFound();
  }

  await exigirAyuntamiento();

  const contexto = await contextoActual();
  if (!contexto) return new Response(null, { status: 401 });

  return conBorde(peticion, contexto);
}
