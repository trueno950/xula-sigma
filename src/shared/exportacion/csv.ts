import { fechaYHoraIsoEnMerida } from "@/shared/lib/fecha";

/**
 * Un CSV que Excel abre con doble clic y sin paso de importacion.
 *
 * Las cuatro decisiones del formato tienen la misma razon y no son
 * intercambiables:
 *
 * - **BOM UTF-8.** Sin el, Excel lee el archivo como Latin-1 y `Jose`
 *   acentuado sale `JosÃ©`. Es el unico byte que el estandar no pide y el
 *   unico que hace que el doble clic funcione.
 * - **CRLF.** Es lo que RFC 4180 define como fin de registro, y ademas lo
 *   que un editor de Windows espera.
 * - **Comillas dobles y duplicadas.** RFC 4180, seccion 2.6: el campo que
 *   lleva separador, comilla o salto va entre comillas y cada comilla
 *   interna se escribe dos veces.
 * - **Fechas sin ISO `T`/`Z`.** `2026-11-13 18:05` se ordena como fecha en
 *   Excel; `2026-11-13T18:05:00.000Z` cae como texto. La hora es la civil de
 *   `America/Merida`, no la del proceso (UTC en el servidor).
 */

export type FilaDeCsv = Record<string, unknown>;

const BOM = "\uFEFF";
const SEPARADOR = ",";
const FIN_DE_LINEA = "\r\n";

/**
 * El valor de una celda como texto, antes de escaparlo. `null` y
 * `undefined` comparten el campo vacio: en un archivo entregado a un
 * archivo municipal la diferencia entre "no hay dato" y "la columna no
 * aplica" no la puede leer nadie, y un `"null"` escrito en la celda si
 * engania.
 */
const comoTexto = (valor: unknown): string => {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return fechaYHoraIsoEnMerida(valor);
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
};

const necesitaComillas = (texto: string): boolean => /[",\r\n]/.test(texto);

const entrecomillar = (texto: string): string =>
  necesitaComillas(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;

/**
 * La union de las claves de todas las filas, en el orden en que aparecen.
 * Se miran todas y no solo la primera: dos filas del mismo conjunto pueden
 * venir de una consulta con columnas distintas —una fecha nula, un `left
 * join`—, y quedarse con la primera perderia la columna en las demas.
 */
const columnasDe = (filas: readonly FilaDeCsv[]): string[] => {
  const vistas = new Set<string>();
  for (const fila of filas) {
    for (const clave of Object.keys(fila)) vistas.add(clave);
  }
  return [...vistas];
};

const lineaDe = (fila: FilaDeCsv, columnas: readonly string[]): string =>
  columnas
    .map((columna) => entrecomillar(comoTexto(fila[columna])))
    .join(SEPARADOR);

/**
 * @param columnas Encabezado explicito. Sin el, sale la union de las claves
 *   de las filas. Un conjunto vacio sin columnas es solo el BOM: un archivo
 *   de cero bytes no lo abre Excel, y el BOM lo deja reconocible como UTF-8.
 */
export function aCsv(
  filas: readonly FilaDeCsv[],
  columnas?: readonly string[],
): string {
  const encabezado = columnas ?? columnasDe(filas);
  if (encabezado.length === 0) return BOM;

  const lineas = [
    encabezado.map(entrecomillar).join(SEPARADOR),
    ...filas.map((fila) => lineaDe(fila, encabezado)),
  ];
  return `${BOM}${lineas.join(FIN_DE_LINEA)}${FIN_DE_LINEA}`;
}
