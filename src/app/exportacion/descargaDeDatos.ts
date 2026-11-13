import { lectorDeEscudo } from "@/modules/marca/composicion";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  archivosDeExportacion,
  nombreDelArchivo,
} from "@/shared/exportacion/archivoDeExportacion";
import {
  type Exportacion,
  exportarAyuntamiento,
} from "@/shared/exportacion/exportar";
import { armarZip } from "@/shared/exportacion/zip";
import { porciones } from "./porciones";

/**
 * La descarga completa de S1, armada del lado del servidor: exportar, bajar
 * el escudo y comprimir. El borde HTTP vive en
 * `src/app/(panel)/exportacion/descarga/route.ts`; aca esta lo que existe
 * sin una peticion de por medio.
 */

export type Descarga = { bytes: Uint8Array; nombre: string };

/**
 * El escudo del municipio, o `undefined` si no tiene uno (S4).
 *
 * Se lee **despues** de que `exportarAyuntamiento` devuelve, o sea con la
 * transaccion ya cerrada: hablar con el almacenamiento de objetos dentro de
 * `withTenant` ataria una conexion del pool —que en produccion es de una
 * sola por proceso— a un servicio externo durante todo el viaje de red.
 *
 * El fallo del almacenamiento se propaga y no se traga: un ZIP que sale sin
 * el escudo porque R2 no respondio se ve igual que uno de un municipio sin
 * escudo, y el archivo de un municipio que se va no admite esa ambiguedad.
 */
const escudoDe = async (
  ayuntamiento: Exportacion["ayuntamiento"],
): Promise<Uint8Array | undefined> => {
  const url = ayuntamiento.marca.escudo;

  return url ? lectorDeEscudo.leer(ayuntamiento.id, url) : undefined;
};

/**
 * @param contexto El de `contextoActual()`: el tenant sale de ahi y nunca
 *   de la URL (S6). La guarda de rol la vuelve a correr
 *   `exportarAyuntamiento`, que es quien lee los datos.
 */
export async function descargaDeDatos(
  contexto: ContextoActual,
): Promise<Descarga> {
  const exportacion = await exportarAyuntamiento(contexto, porciones);
  const escudo = await escudoDe(exportacion.ayuntamiento);

  return {
    nombre: nombreDelArchivo(
      exportacion.ayuntamiento.subdominio,
      exportacion.generadaEn,
    ),
    bytes: armarZip(archivosDeExportacion(exportacion, escudo)),
  };
}
