import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";
import { comoConstanciaId, pdfDeConstancia } from "@/modules/constancias";
import { contextoActual } from "@/shared/auth";
import { NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { CABECERA_SUPERFICIE } from "@/shared/tenancy/cabeceras";

type Props = {
  params: Promise<{ id: string }>;
};

const esquemaDeId = z.string().uuid();

/**
 * El borde de error de esta ruta, calcando `conBorde` de
 * `api/auth/[...all]/route.ts:96-117` (design.md de `constancias-oficios`,
 * seccion 11): `NoEncontradoError` -id ajeno, id con forma invalida, o
 * reimpresion sin acreditar- se traduce a 404; todo lo demas es 500
 * generico. El motivo crudo nunca sale: puede nombrar tabla o columna
 * (`datosSegurosDeError`).
 */
async function conBorde(trabajo: () => Promise<Response>): Promise<Response> {
  try {
    return await trabajo();
  } catch (error) {
    if (error instanceof NoEncontradoError) {
      return new Response(null, { status: 404 });
    }

    console.error(
      "[constancias] fallo no manejado al generar el PDF",
      datosSegurosDeError(error),
    );

    return new Response(null, { status: 500 });
  }
}

/**
 * `GET` **no consulta la base**: pasa por `pdfDeConstancia`, que es quien
 * abre `withTenant` (design.md de `constancias-oficios`, seccion 11,
 * decisiva contra `app-no-importa-infrastructure` — la plantilla vive en
 * `infrastructure` y este archivo no puede tocarla ni por accidente).
 *
 * Los layouts NO envuelven Route Handlers: `(panel)/layout.tsx` no corre
 * aca, asi que la guarda de superficie y la de sesion se repiten -mismo
 * argumento que ese layout, lineas 18-22-. Sin la primera, un request al
 * dominio pelado haria que `contextoActual()` intentara resolver un
 * ayuntamiento inexistente, y el 500 resultante delataria que aca adentro
 * hay algo que espera un tenant.
 */
export async function GET(request: Request, { params }: Props) {
  if ((await headers()).get(CABECERA_SUPERFICIE) !== "ayuntamiento") {
    return notFound();
  }

  const contexto = await contextoActual();
  if (!contexto) return new Response(null, { status: 401 });

  return conBorde(async () => {
    const { id } = await params;
    const analisisDeId = esquemaDeId.safeParse(id);
    if (!analisisDeId.success) throw new NoEncontradoError();

    // `?reimpresion=` acredita la marca de agua, nunca la elige quien pide
    // (design.md seccion 11): la clave solo se manda si el query string la
    // trae, para que `EntradaDePdf.reimpresionId` -opcional bajo
    // `exactOptionalPropertyTypes`- no reciba `null`.
    const reimpresionId = new URL(request.url).searchParams.get("reimpresion");

    const { bytes, folio } = await pdfDeConstancia(
      {
        id: comoConstanciaId(analisisDeId.data),
        ...(reimpresionId !== null ? { reimpresionId } : {}),
      },
      contexto,
    );

    // `as BodyInit`: friccion conocida entre `@types/node` -que hace
    // `Uint8Array` generico sobre `ArrayBufferLike`- y `lib.dom.d.ts` -cuyo
    // `BodyInit` espera el `Uint8Array<ArrayBuffer>` no generico-. En
    // tiempo de ejecucion un `Uint8Array` (`Buffer` incluido) siempre fue
    // `BodyInit` valido; esto es una discrepancia de tipos, no de bytes.
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        // `inline`, no `attachment`: el operador ve la hoja y la manda a
        // imprimir sin que quede un archivo suelto en el disco de la PC
        // del palacio.
        "Content-Disposition": `inline; filename="${folio}.pdf"`,
        // El PDF lleva nombre y domicilio; una copia en el cache de un
        // navegador compartido es la fuga.
        "Cache-Control": "no-store",
      },
    });
  });
}
