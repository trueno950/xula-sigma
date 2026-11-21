import {
  type CodigoDeDescarga,
  codigoDeEstado,
} from "@/app/exportacion/codigosDeDescarga";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";

/**
 * La descarga con JavaScript (S12, S13): la isla pide el ZIP, lo guarda y
 * deja en pantalla el nombre, el tamano o el codigo del fallo. Sin JavaScript
 * el enlace es el del HTML y lo hace el navegador; el borde sigue siendo el
 * mismo.
 *
 * Se pide con `accept: application/zip` y no con el acepto de una navegacion:
 * el borde decide con esa cabecera si el fallo tiene que volver al panel con
 * un codigo (navegacion) o contestar con su estado (esta isla, que pinta el
 * mensaje). Por eso el ZIP se pide una sola vez y no hay que adivinar que
 * paso.
 */
export const RUTA_DE_LA_DESCARGA = "/exportacion/descarga";

/**
 * El id del enlace que pinta el servidor. La isla no dibuja el boton —el
 * enlace nativo tiene que estar en el HTML para funcionar sin JavaScript—,
 * solo escucha su clic.
 */
export const ID_DEL_ENLACE_DE_DESCARGA = "descarga-de-datos";

export type ResultadoDeLaDescarga =
  | { tipo: "descargado"; nombre: string; bytes: number; blob: Blob }
  | { tipo: "error"; codigo: CodigoDeDescarga };

/**
 * El nombre que el borde puso en `Content-Disposition`, o el que la pantalla
 * ya mostro. Solo pasa un `.zip` con caracteres de nombre: un valor con
 * barras o con cualquier otra cosa es un archivo que no se escribe.
 */
const NOMBRE_DEL_ZIP = /^[\w.-]+\.zip$/;

export const nombreDeLaRespuesta = (
  cabecera: string | null,
  porDefecto: string,
): string => {
  const nombre = /filename="?([^";]+)"?/.exec(cabecera ?? "")?.[1]?.trim();

  return nombre && NOMBRE_DEL_ZIP.test(nombre) ? nombre : porDefecto;
};

export const descargarLosDatos = async (
  nombrePorDefecto: string,
): Promise<ResultadoDeLaDescarga> => {
  try {
    const respuesta = await fetch(RUTA_DE_LA_DESCARGA, {
      headers: { accept: "application/zip" },
      cache: "no-store",
    });

    if (!respuesta.ok) {
      return { tipo: "error", codigo: codigoDeEstado(respuesta.status) };
    }

    const blob = await respuesta.blob();

    return {
      tipo: "descargado",
      nombre: nombreDeLaRespuesta(
        respuesta.headers.get("content-disposition"),
        nombrePorDefecto,
      ),
      bytes: blob.size,
      blob,
    };
  } catch (error) {
    // El motivo crudo no sale a la pantalla ni al log: puede nombrar el
    // almacenamiento o una fila (`datosSegurosDeError`).
    console.error(
      "[exportacion] descargar los datos",
      datosSegurosDeError(error),
    );

    return { tipo: "error", codigo: "fallo" };
  }
};

/**
 * Entrega el archivo al navegador. El `download` del enlace temporal es lo que
 * evita que el ZIP se abra en una pestana, y el `revokeObjectURL` diferido
 * espera a que el navegador se haya quedado con los bytes.
 */
export const guardarArchivo = (blob: Blob, nombre: string): void => {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
