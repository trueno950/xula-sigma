/**
 * CRC-32/ISO-HDLC, el que exige el formato ZIP (APPNOTE 6.3.7, seccion
 * 4.4.7). Es el mismo polinomio reflejado que usa zlib y el checksum que
 * `unzip -t` verifica antes de dar un archivo por bueno.
 *
 * Se implementa en vez de importarse porque S7 de `exportacion-de-datos`
 * prohibe una dependencia nueva sin justificacion, y esto son veinte lineas
 * contra un paquete entero para un solo checksum.
 */

/**
 * La tabla de 256 entradas que el algoritmo por byte necesita. Se arma una
 * vez al importar el modulo: es aritmetica pura sobre una constante, no
 * estado que pueda cambiar entre llamadas.
 */
const construirTabla = (): Uint32Array => {
  const tabla = new Uint32Array(256);
  for (let indice = 0; indice < 256; indice += 1) {
    let valor = indice;
    for (let bit = 0; bit < 8; bit += 1) {
      valor = valor & 1 ? 0xedb88320 ^ (valor >>> 1) : valor >>> 1;
    }
    tabla[indice] = valor >>> 0;
  }
  return tabla;
};

const TABLA = construirTabla();

/**
 * El CRC de un bloque, como entero sin signo de 32 bits. `>>> 0` deshace el
 * complemento final sin devolver un negativo, que es como JavaScript
 * representa los enteros de 32 bits con el bit alto encendido.
 */
export const crc32 = (datos: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of datos) {
    crc = (TABLA[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
