import { renderToBuffer } from "@react-pdf/renderer";
import { toDataURL } from "qrcode";
import type { RenderizadorDeConstancias } from "../application/puertosDeRender";
import { PlantillaDesconocidaError } from "../domain";
import { PLANTILLAS } from "./plantillas/registro";

/**
 * Unico archivo del modulo que importa `renderToBuffer` de
 * `@react-pdf/renderer` y el paquete `qrcode` (design.md de
 * `constancias-oficios`, seccion 11). Las plantillas de
 * `infrastructure/plantillas/` tambien importan `@react-pdf/renderer`
 * -`Document`, `Page`, `View`, `Text`, `Image`, `StyleSheet`: el JSX del
 * documento, inevitable ahi-, pero **este** es el unico que invoca el
 * render y el generador de QR. Y es `.tsx` -no `.ts`- porque construye la
 * plantilla como JSX (`<Plantilla {...props} />`), no llamandola como
 * funcion: react-pdf resuelve el componente en su propio reconciliador, y
 * llamarla directo perderia esa indireccion.
 *
 * `renderToBuffer`, no `renderToStream`: correccion sobre la decision 11 de
 * `proposal.md`. Un Route Handler devuelve un `ReadableStream` **web**, asi
 * que el stream de Node de `renderToStream` exigiria `Readable.toWeb(...)` y
 * un cast que el tipo no garantiza. `Buffer` ya es `Uint8Array` -`BodyInit`
 * valido- y el documento pesa cientos de KB, no los cientos de MB que
 * justificarian el streaming (design.md seccion 11, "no medido: el tamano
 * del PDF").
 */

/** Tope de la descarga del escudo. La emision ya ocurrio en otro request: nada de esto arriesga un folio. */
const TOPE_DE_DESCARGA_ESCUDO_MS = 5000;

/**
 * Bytes del escudo, o `undefined` si no hay URL o la descarga falla.
 * `@react-pdf/renderer` bajando la URL por su cuenta convertiria un
 * tropiezo de R2 en una excepcion de render; descargar aca y degradar a
 * "sin escudo" evita eso (design.md de `constancias-oficios`, seccion 11).
 */
async function descargarEscudo(
  url: string | undefined,
): Promise<Buffer | undefined> {
  if (!url) return undefined;

  try {
    const respuesta = await fetch(url, {
      signal: AbortSignal.timeout(TOPE_DE_DESCARGA_ESCUDO_MS),
    });

    if (!respuesta.ok) return undefined;

    return Buffer.from(await respuesta.arrayBuffer());
  } catch {
    return undefined;
  }
}

const esVersionConocida = (
  version: string,
): version is keyof typeof PLANTILLAS => version in PLANTILLAS;

export const renderizadorReactPdf: RenderizadorDeConstancias = {
  async aPdf(entrada) {
    // Antes de intentar renderizar nada: ni QR ni descarga de escudo si la
    // version no existe (design.md seccion 11, decision 12).
    if (!esVersionConocida(entrada.plantillaVersion)) {
      throw new PlantillaDesconocidaError();
    }

    const Plantilla = PLANTILLAS[entrada.plantillaVersion];

    const [qrDataUrl, escudo] = await Promise.all([
      toDataURL(entrada.urlDeValidacion),
      descargarEscudo(entrada.municipio.escudo),
    ]);

    const municipio = escudo
      ? { nombre: entrada.municipio.nombre, escudo }
      : { nombre: entrada.municipio.nombre };

    return renderToBuffer(
      <Plantilla
        folio={entrada.folio}
        datos={entrada.datos}
        municipio={municipio}
        qrDataUrl={qrDataUrl}
        urlDeValidacion={entrada.urlDeValidacion}
        reimpresion={entrada.reimpresion}
        cancelada={entrada.cancelada}
      />,
    );
  },
};
