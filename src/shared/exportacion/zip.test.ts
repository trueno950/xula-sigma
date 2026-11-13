import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { armarZip } from "./zip";

/**
 * El ZIP que pide S7 de `exportacion-de-datos`: un escritor propio de solo
 * almacenamiento, sin compresion y sin dependencia nueva. Lo que lo prueba
 * no es la firma `PK` —la pone cualquier cosa— sino que el `unzip` del
 * sistema lo abra y devuelva los mismos bytes, con el nombre UTF-8 incluido.
 */
const texto = (valor: string): Uint8Array => new TextEncoder().encode(valor);

const vistaDe = (zip: Uint8Array): DataView =>
  new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

const inicioDelDirectorio = (zip: Uint8Array): number =>
  vistaDe(zip).getUint32(zip.length - 6, true);

const firmas = (zip: Uint8Array) => {
  const vista = vistaDe(zip);
  const inicio = inicioDelDirectorio(zip);
  return {
    entrada: vista.getUint32(0, true),
    directorio: vista.getUint32(inicio, true),
    banderaLocal: vista.getUint16(6, true),
    banderaCentral: vista.getUint16(inicio + 8, true),
    entradas: vista.getUint16(zip.length - 12, true),
  };
};

describe("armarZip", () => {
  it("un ZIP sin archivos es solo el fin de directorio", () => {
    const zip = armarZip([]);

    expect(zip).toHaveLength(22);
    expect(vistaDe(zip).getUint32(0, true)).toBe(0x06054b50);
    expect(vistaDe(zip).getUint16(10, true)).toBe(0);
  });

  it("escribe la cabecera local, el directorio central y las dos firmas", () => {
    const zip = armarZip([{ nombre: "personas.csv", contenido: texto("a,b") }]);
    const { entrada, directorio, banderaLocal, banderaCentral, entradas } =
      firmas(zip);

    expect(entrada).toBe(0x04034b50);
    expect(directorio).toBe(0x02014b50);
    expect(entradas).toBe(1);
    expect(banderaLocal & 0x0800).toBe(0x0800);
    expect(banderaCentral & 0x0800).toBe(0x0800);
  });

  it("guarda el nombre con sus bytes UTF-8 y enciende la bandera 11", () => {
    const zip = armarZip([{ nombre: "ñandú.csv", contenido: texto("x") }]);
    const vista = vistaDe(zip);
    const inicio = inicioDelDirectorio(zip);
    const largo = vista.getUint16(inicio + 28, true);
    const nombre = zip.slice(inicio + 46, inicio + 46 + largo);

    expect(new TextDecoder().decode(nombre)).toBe("ñandú.csv");
    expect(nombre).toEqual(texto("ñandú.csv"));
  });

  it("dos archivos con el mismo nombre se rechazan", () => {
    const archivo = { nombre: "personas.csv", contenido: texto("a") };

    expect(() => armarZip([archivo, archivo])).toThrow(/dos veces/);
  });

  it("un nombre con .. se rechaza: el ZIP no puede escribir fuera de su carpeta", () => {
    const contenido = texto("a");

    expect(() =>
      armarZip([{ nombre: "carpeta/../secreto.csv", contenido }]),
    ).toThrow(/invalido/);
    expect(() => armarZip([{ nombre: "..", contenido }])).toThrow(/invalido/);
  });

  it("un nombre absoluto se rechaza", () => {
    expect(() =>
      armarZip([{ nombre: "/etc/passwd", contenido: texto("a") }]),
    ).toThrow(/invalido/);
  });

  it("deja pasar un nombre con subcarpeta: solo .. y la barra inicial estan prohibidos", () => {
    const zip = armarZip([
      { nombre: "territorio/personas.csv", contenido: texto("x") },
    ]);

    expect(firmas(zip).entradas).toBe(1);
  });

  it("mas de 65535 archivos se rechaza: no hay ZIP64", () => {
    const archivos = Array.from({ length: 0x10000 }, () => ({
      nombre: "a.csv",
      contenido: new Uint8Array(),
    }));

    expect(() => armarZip(archivos)).toThrow(/65535/);
  });
});

const hayUnzip = spawnSync("unzip", ["-v"], { stdio: "ignore" }).status === 0;

const tituloDeUnzip = hayUnzip
  ? "abierto por el unzip del sistema"
  : "abierto por el unzip del sistema (se salta: 'unzip' no esta en el PATH)";

const contenidoDe = (nombre: string): Uint8Array =>
  nombre === "personas.csv"
    ? texto("\uFEFFid,nombre\r\n1,José\r\n")
    : texto('ñandú,coma\ncomilla " suelta\r\n');

describe.skipIf(!hayUnzip)(tituloDeUnzip, () => {
  let carpeta = "";
  let rutaDelZip = "";

  beforeAll(() => {
    carpeta = mkdtempSync(join(tmpdir(), "xula-exportacion-"));
    rutaDelZip = join(carpeta, "exportacion.zip");
    writeFileSync(
      rutaDelZip,
      armarZip([
        { nombre: "personas.csv", contenido: contenidoDe("personas.csv") },
        { nombre: "ñandú.csv", contenido: contenidoDe("ñandú.csv") },
      ]),
    );
  });

  afterAll(() => {
    rmSync(carpeta, { recursive: true, force: true });
  });

  it("pasa la prueba de integridad de unzip", () => {
    const salida = execFileSync("unzip", ["-t", rutaDelZip], {
      encoding: "utf8",
    });

    expect(salida).toContain("No errors detected");
  });

  it("devuelve byte por byte el contenido de un nombre ASCII", () => {
    const salida = execFileSync("unzip", ["-p", rutaDelZip, "personas.csv"]);

    expect(new Uint8Array(salida)).toEqual(contenidoDe("personas.csv"));
  });

  /**
   * El `unzip` de macOS es Info-ZIP 6.00 compilado sin soporte Unicode —su
   * `unzip -v` no lista `UNICODE_SUPPORT`—: ignora la bandera 11 y reduce el
   * nombre a la pagina de codigos local, asi que pedirle `ñandú.csv` por
   * nombre responde «filename not matched» aunque el archivo este bien
   * escrito. Se lo selecciona excluyendo al hermano ASCII, que no depende de
   * como traduzca el nombre, y el nombre exacto ya lo afirma la prueba de
   * bytes de arriba.
   */
  it("devuelve byte por byte el contenido de un nombre UTF-8", () => {
    const salida = execFileSync("unzip", [
      "-p",
      rutaDelZip,
      "-x",
      "personas.csv",
    ]);

    expect(new Uint8Array(salida)).toEqual(contenidoDe("ñandú.csv"));
  });
});
