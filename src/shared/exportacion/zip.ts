import { crc32 } from "./crc32";

/**
 * El escritor ZIP de S7: solo almacenamiento, sin compresion, sin ZIP64 y
 * sin dependencia nueva. Lo que ya viene comprimido —un CSV de texto, el
 * escudo del municipio— no gana nada con DEFLATE, y comprimir obligaria a
 * implementar el algoritmo o a importar uno.
 *
 * El formato sale de APPNOTE 6.3.7, seccion 4.3: cabecera local, datos,
 * directorio central y fin de directorio central. Todo little-endian.
 */

export type ArchivoDelZip = { nombre: string; contenido: Uint8Array };

type Entrada = {
  nombre: Uint8Array;
  contenido: Uint8Array;
  crc: number;
  desplazamiento: number;
};

const CODIFICADOR = new TextEncoder();

const FIRMA_LOCAL = 0x04034b50;
const FIRMA_CENTRAL = 0x02014b50;
const FIRMA_FIN = 0x06054b50;
const VERSION = 20;
const BANDERA_UTF8 = 0x0800;
const SIN_COMPRESION = 0;
const TAMANIO_LOCAL = 30;
const TAMANIO_CENTRAL = 46;
const TAMANIO_FIN = 22;
const MAXIMO_DE_ENTRADAS = 0xffff;
const MAXIMO_DE_BYTES = 0xffffffff;

/**
 * Marca de tiempo DOS fija, 1980-01-01 00:00: el minimo del formato.
 *
 * No lleva la hora de generacion a proposito. El campo DOS no tiene zona
 * horaria y solo resuelve dos segundos; sin el campo extra `UT` —que este
 * escritor no emite— cada programa lo lee en su hora local, asi que un
 * "ahora" escrito desde el servidor en UTC se ve corrido en una maquina de
 * Merida. El momento real de la generacion ya viaja en el `manifiesto.json`
 * que pide S4, con zona y sin ambiguedad. De paso, los mismos datos dan
 * siempre los mismos bytes.
 */
const HORA_DOS = 0;
const FECHA_DOS = 0x0021;

const codificar = (texto: string): Uint8Array => CODIFICADOR.encode(texto);

const esNombreSeguro = (nombre: string): boolean =>
  !nombre.startsWith("/") && !nombre.split("/").includes("..");

const verificarNombres = (archivos: readonly ArchivoDelZip[]): void => {
  const vistos = new Set<string>();
  for (const { nombre } of archivos) {
    if (!esNombreSeguro(nombre)) {
      throw new Error(
        `Nombre de archivo invalido dentro del ZIP: "${nombre}".`,
      );
    }
    if (vistos.has(nombre)) {
      throw new Error(`El ZIP lleva dos veces el mismo archivo: "${nombre}".`);
    }
    vistos.add(nombre);
  }
};

const entradaDe = (
  archivo: ArchivoDelZip,
  desplazamiento: number,
): Entrada => ({
  nombre: codificar(archivo.nombre),
  contenido: archivo.contenido,
  crc: crc32(archivo.contenido),
  desplazamiento,
});

const cabeceraLocalDe = (entrada: Entrada): Uint8Array => {
  const cabecera = new Uint8Array(TAMANIO_LOCAL + entrada.nombre.length);
  const vista = new DataView(cabecera.buffer);
  vista.setUint32(0, FIRMA_LOCAL, true);
  vista.setUint16(4, VERSION, true);
  vista.setUint16(6, BANDERA_UTF8, true);
  vista.setUint16(8, SIN_COMPRESION, true);
  vista.setUint16(10, HORA_DOS, true);
  vista.setUint16(12, FECHA_DOS, true);
  vista.setUint32(14, entrada.crc, true);
  vista.setUint32(18, entrada.contenido.length, true);
  vista.setUint32(22, entrada.contenido.length, true);
  vista.setUint16(26, entrada.nombre.length, true);
  vista.setUint16(28, 0, true);
  cabecera.set(entrada.nombre, TAMANIO_LOCAL);
  return cabecera;
};

const entradaCentralDe = (entrada: Entrada): Uint8Array => {
  const registro = new Uint8Array(TAMANIO_CENTRAL + entrada.nombre.length);
  const vista = new DataView(registro.buffer);
  vista.setUint32(0, FIRMA_CENTRAL, true);
  vista.setUint16(4, VERSION, true);
  vista.setUint16(6, VERSION, true);
  vista.setUint16(8, BANDERA_UTF8, true);
  vista.setUint16(10, SIN_COMPRESION, true);
  vista.setUint16(12, HORA_DOS, true);
  vista.setUint16(14, FECHA_DOS, true);
  vista.setUint32(16, entrada.crc, true);
  vista.setUint32(20, entrada.contenido.length, true);
  vista.setUint32(24, entrada.contenido.length, true);
  vista.setUint16(28, entrada.nombre.length, true);
  vista.setUint32(42, entrada.desplazamiento, true);
  registro.set(entrada.nombre, TAMANIO_CENTRAL);
  return registro;
};

const tamanioDelDirectorio = (entradas: readonly Entrada[]): number =>
  entradas.reduce(
    (total, entrada) => total + TAMANIO_CENTRAL + entrada.nombre.length,
    0,
  );

const finDeDirectorio = (
  entradas: readonly Entrada[],
  inicioDelDirectorio: number,
): Uint8Array => {
  const registro = new Uint8Array(TAMANIO_FIN);
  const vista = new DataView(registro.buffer);
  vista.setUint32(0, FIRMA_FIN, true);
  vista.setUint16(8, entradas.length, true);
  vista.setUint16(10, entradas.length, true);
  vista.setUint32(12, tamanioDelDirectorio(entradas), true);
  vista.setUint32(16, inicioDelDirectorio, true);
  return registro;
};

/**
 * Los tramos ya escritos y el punto donde empieza el directorio central,
 * que es la posicion que cada entrada central guarda.
 */
const localesDe = (archivos: readonly ArchivoDelZip[]) => {
  const partes: Uint8Array[] = [];
  const entradas: Entrada[] = [];
  let finDeLocales = 0;

  for (const archivo of archivos) {
    const entrada = entradaDe(archivo, finDeLocales);
    const cabecera = cabeceraLocalDe(entrada);
    partes.push(cabecera, entrada.contenido);
    finDeLocales += cabecera.length + entrada.contenido.length;
    entradas.push(entrada);
  }

  return { partes, entradas, finDeLocales };
};

const concatenar = (partes: readonly Uint8Array[]): Uint8Array => {
  const salida = new Uint8Array(
    partes.reduce((total, parte) => total + parte.length, 0),
  );
  let desplazamiento = 0;
  for (const parte of partes) {
    salida.set(parte, desplazamiento);
    desplazamiento += parte.length;
  }
  return salida;
};

/**
 * @throws Si dos archivos comparten nombre, si un nombre sale de la carpeta
 *   del ZIP o si el resultado no entra en los 32 bits de un ZIP sin ZIP64.
 *   El limite se declara en vez de escribirse mal: un ZIP con offsets
 *   truncados lo abre `unzip` a medias y parece completo, que es el modo de
 *   falla que S4 prohibe.
 */
export function armarZip(archivos: readonly ArchivoDelZip[]): Uint8Array {
  if (archivos.length > MAXIMO_DE_ENTRADAS) {
    throw new Error("El ZIP no admite mas de 65535 archivos: no hay ZIP64.");
  }

  verificarNombres(archivos);
  const { partes, entradas, finDeLocales } = localesDe(archivos);
  if (finDeLocales > MAXIMO_DE_BYTES) {
    throw new Error("El ZIP pasa de 4 GiB: no hay ZIP64.");
  }

  const fin = finDeDirectorio(entradas, finDeLocales);
  const directorio = entradas.map(entradaCentralDe);
  return concatenar([...partes, ...directorio, fin]);
}
