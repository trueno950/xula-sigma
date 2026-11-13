import { fechaYHoraIsoEnMerida } from "@/shared/lib/fecha";
import { aCsv, type FilaDeCsv } from "./csv";
import type { Exportacion } from "./exportar";
import type { ArchivoDelZip } from "./zip";

/**
 * El contenido del ZIP de S1: los CSV, el manifiesto y el escudo. La
 * codificacion de cada formato ya vive en `csv.ts` y `zip.ts`; aca solo se
 * decide que lleva el archivo y con que nombre, que es lo que S2, S3 y S4
 * fijan.
 */

const CODIFICADOR = new TextEncoder();

const NOMBRE_DEL_MANIFIESTO = "manifiesto.json";

/**
 * El escudo va siempre como `.png`, no con la extension que traiga su URL.
 * El dominio solo acepta PNG —decision 3 de `proposal.md` de
 * `assets-de-marca-en-r2`—, y una URL pegada a mano en el `jsonb` no puede
 * decidir el nombre de un archivo que se entrega a un archivo municipal.
 */
const NOMBRE_DEL_ESCUDO = "escudo.png";

/**
 * Una fila de un conjunto como fila de CSV. Los conjuntos llegan como
 * `readonly unknown[]` porque los arma cada modulo; cada fila es el registro
 * de una consulta, y un valor suelto se guarda bajo `valor` en vez de
 * perderse en silencio.
 */
const comoFila = (fila: unknown): FilaDeCsv =>
  typeof fila === "object" && fila !== null
    ? (fila as FilaDeCsv)
    : { valor: fila };

const archivoDeConjunto = (
  nombre: string,
  filas: readonly unknown[],
): ArchivoDelZip => ({
  nombre: `${nombre}.csv`,
  contenido: CODIFICADOR.encode(aCsv(filas.map(comoFila))),
});

/**
 * El manifiesto: lo que deja legible el ZIP sin abrir veinte hojas de
 * calculo. `conjuntos` es una lista de conteos y no el volcado, para que
 * quien reciba el archivo sepa que esperar de cada CSV.
 *
 * **No lleva `ayuntamientoId`** (S2). El `subdominio` ya identifica al
 * municipio, y el id es una clave interna de la plataforma que deja de
 * significar algo fuera de ella.
 *
 * El momento va dos veces y las dos hacen falta: `generadaEn` en ISO con
 * zona —el unico valor que se puede volver a procesar— y
 * `generadaEnMerida` en la forma civil que S3 pide para Excel, porque el
 * servidor corre en UTC y quien abre el ZIP esta en Merida.
 */
const manifiestoDe = (exportacion: Exportacion): string =>
  JSON.stringify(
    {
      subdominio: exportacion.ayuntamiento.subdominio,
      nombre: exportacion.ayuntamiento.nombre,
      marca: exportacion.ayuntamiento.marca,
      generadaEn: exportacion.generadaEn.toISOString(),
      generadaEnMerida: fechaYHoraIsoEnMerida(exportacion.generadaEn),
      conjuntos: Object.entries(exportacion.conjuntos).map(
        ([nombre, filas]) => ({ nombre, filas: filas.length }),
      ),
    },
    null,
    2,
  );

/**
 * @param escudo Los bytes del escudo ya leidos del almacenamiento. Ausente
 *   cuando el municipio no tiene uno: el ZIP sale sin el archivo, no con un
 *   `escudo.png` vacio, que se veria como un escudo roto.
 */
export function archivosDeExportacion(
  exportacion: Exportacion,
  escudo?: Uint8Array,
): ArchivoDelZip[] {
  const conjuntos = Object.entries(exportacion.conjuntos).map(
    ([nombre, filas]) => archivoDeConjunto(nombre, filas),
  );

  return [
    ...conjuntos,
    {
      nombre: NOMBRE_DEL_MANIFIESTO,
      contenido: CODIFICADOR.encode(manifiestoDe(exportacion)),
    },
    ...(escudo ? [{ nombre: NOMBRE_DEL_ESCUDO, contenido: escudo }] : []),
  ];
}

/**
 * La fecha civil de Merida de un instante, `YYYY-MM-DD`.
 * `shared/lib/fecha` expone `hoyEnMerida()` —solo el ahora— y
 * `fechaYHoraIsoEnMerida`, cuyo formato ya es `YYYY-MM-DD HH:MM`: los
 * primeros diez caracteres son esa fecha sin volver a formatear en otro
 * lado.
 */
const fechaCivilEnMerida = (instante: Date): string =>
  fechaYHoraIsoEnMerida(instante).slice(0, 10);

/**
 * El nombre del archivo que recibe la operadora. Lleva el subdominio y el
 * dia en que se genero: en el escritorio de una oficina municipal hay mas
 * de un `datos.zip`, y el dia es lo unico que distingue una entrega de la
 * anterior.
 */
export const nombreDelArchivo = (
  subdominio: string,
  generadaEn: Date,
): string => `${subdominio}-${fechaCivilEnMerida(generadaEn)}.zip`;
