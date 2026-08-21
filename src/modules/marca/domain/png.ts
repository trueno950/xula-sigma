/**
 * Sniffer de bytes para PNG. Puro: entra un `Uint8Array`, sale un
 * veredicto. Sin IO, sin imports, testeable en milisegundos.
 *
 * Un formato = un sniffer con offsets fijos, sin decodificar la imagen
 * completa. Las dimensiones se leen del chunk `IHDR` para acotar la bomba
 * de descompresion sin abrir el archivo. Ver design.md seccion 4.
 */

export type VeredictoPng =
  | { ok: true; ancho: number; alto: number }
  | { ok: false; motivo: MotivoDeRechazo };

export type MotivoDeRechazo =
  | "VACIO"
  | "DEMASIADO_GRANDE"
  | "NO_ES_PNG"
  | "SIN_IHDR"
  | "DIMENSIONES";

const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const UN_MIB = 1024 * 1024;
const DIMENSION_MINIMA = 80;
const DIMENSION_MAXIMA = 2048;

/**
 * Bytes necesarios para leer ancho y alto completos: firma (8) + longitud
 * del chunk (4) + tipo (4) + ancho (4) + alto (4). Menos que esto no
 * alcanza a declarar un `IHDR` completo, y se trata igual que un chunk
 * ausente.
 */
const LONGITUD_CON_DIMENSIONES = 24;

const tieneFirmaPng = (bytes: Uint8Array): boolean =>
  FIRMA_PNG.every((byte, indice) => bytes[indice] === byte);

/** El primer chunk de un PNG valido siempre declara longitud 13 y tipo IHDR. */
const esChunkIhdr = (bytes: Uint8Array): boolean => {
  const longitud = leerUint32BE(bytes, 8);
  const tipo = String.fromCharCode(
    bytes[12] ?? 0,
    bytes[13] ?? 0,
    bytes[14] ?? 0,
    bytes[15] ?? 0,
  );

  return longitud === 13 && tipo === "IHDR";
};

/**
 * `>>> 0` convierte a entero sin signo: sin el, un byte alto >= 0x80 hace
 * que el `<<` de JS (aritmetica de 32 bits con signo) devuelva un numero
 * negativo, y una dimension declarada como negativa pasaria el chequeo
 * `< DIMENSION_MINIMA` por casualidad y no por la regla.
 */
const leerUint32BE = (bytes: Uint8Array, offset: number): number =>
  (((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)) >>>
  0;

export function validarPng(bytes: Uint8Array): VeredictoPng {
  if (bytes.length === 0) return { ok: false, motivo: "VACIO" };
  if (bytes.length > UN_MIB) return { ok: false, motivo: "DEMASIADO_GRANDE" };

  if (!tieneFirmaPng(bytes)) return { ok: false, motivo: "NO_ES_PNG" };

  if (bytes.length < LONGITUD_CON_DIMENSIONES || !esChunkIhdr(bytes)) {
    return { ok: false, motivo: "SIN_IHDR" };
  }

  const ancho = leerUint32BE(bytes, 16);
  const alto = leerUint32BE(bytes, 20);

  if (
    ancho < DIMENSION_MINIMA ||
    ancho > DIMENSION_MAXIMA ||
    alto < DIMENSION_MINIMA ||
    alto > DIMENSION_MAXIMA
  ) {
    return { ok: false, motivo: "DIMENSIONES" };
  }

  return { ok: true, ancho, alto };
}
