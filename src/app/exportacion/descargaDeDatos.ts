import { lectorDeEscudo } from "@/modules/marca/composicion";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  archivosDeExportacion,
  nombreDelArchivo,
} from "@/shared/exportacion/archivoDeExportacion";
import { exportarAyuntamiento } from "@/shared/exportacion/exportar";
import { armarZip } from "@/shared/exportacion/zip";
import { porciones } from "./porciones";

/**
 * La descarga completa de S1, armada del lado del servidor: exportar —con el
 * escudo ya leido— y comprimir. El borde HTTP vive en
 * `src/app/(panel)/exportacion/descarga/route.ts`; aca esta lo que existe
 * sin una peticion de por medio.
 *
 * El escudo no se lee aca: se le pasa el lector a `exportarAyuntamiento`,
 * que lo lee adentro de la transaccion y antes de registrar la traza (S1).
 * Por que ese orden, en `exportar.ts`.
 */

export type Descarga = { bytes: Uint8Array; nombre: string };

/**
 * @param contexto El de `contextoActual()`: el tenant sale de ahi y nunca
 *   de la URL (S6). La guarda de rol la vuelve a correr
 *   `exportarAyuntamiento`, que es quien lee los datos.
 */
export async function descargaDeDatos(
  contexto: ContextoActual,
): Promise<Descarga> {
  const exportacion = await exportarAyuntamiento(
    contexto,
    porciones,
    lectorDeEscudo,
  );

  return {
    nombre: nombreDelArchivo(
      exportacion.ayuntamiento.subdominio,
      exportacion.generadaEn,
    ),
    bytes: armarZip(archivosDeExportacion(exportacion, exportacion.escudo)),
  };
}
