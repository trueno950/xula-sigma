import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Marca } from "@/shared/marca";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import {
  archivosDeExportacion,
  nombreDelArchivo,
} from "./archivoDeExportacion";
import type { Exportacion } from "./exportar";
import { type ArchivoDelZip, armarZip } from "./zip";

/**
 * El contenido del ZIP que un municipio se lleva cuando no renueva (S1, S3,
 * S4): un CSV por conjunto, el manifiesto y el escudo. Lo que se prueba aca
 * es lo que el archivo entregado *dice*, no como se arma el ZIP —eso es de
 * `zip.test.ts`—.
 */

const ESCUDO = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

const marca: Marca = {
  primario: "oklch(0.42 0.12 25)",
  escudo: "https://assets.example.com/motul/escudo-x.png",
};

const exportacionDe = (
  conjuntos: Exportacion["conjuntos"],
  generadaEn = new Date("2026-11-13T23:05:00.000Z"),
): Exportacion => ({
  generadaEn,
  ayuntamiento: {
    id: comoAyuntamientoId(randomUUID()),
    subdominio: "motul",
    nombre: "Motul",
    marca,
  },
  conjuntos,
});

const archivo = (
  archivos: readonly ArchivoDelZip[],
  nombre: string,
): ArchivoDelZip => {
  const encontrado = archivos.find((candidato) => candidato.nombre === nombre);

  if (!encontrado) throw new Error(`El ZIP no lleva "${nombre}".`);

  return encontrado;
};

/**
 * `ignoreBOM: true` para que el BOM escrito por `aCsv` se lea como el
 * caracter que es: el `TextDecoder` de Node lo descarta cuando esa opcion
 * queda apagada, y entonces esta prueba no podria afirmar que va escrito.
 */
const texto = (archivoDelZip: ArchivoDelZip): string =>
  new TextDecoder("utf-8", { ignoreBOM: true }).decode(archivoDelZip.contenido);

const manifiestoDe = (archivos: readonly ArchivoDelZip[]) =>
  JSON.parse(texto(archivo(archivos, "manifiesto.json"))) as Record<
    string,
    unknown
  >;

describe("archivosDeExportacion", () => {
  it("un CSV por conjunto, con el nombre del conjunto", () => {
    const archivos = archivosDeExportacion(
      exportacionDe({
        personas: [{ id: "1", nombre: "Jose" }],
        usuarios: [],
      }),
    );

    expect(archivos.map((candidato) => candidato.nombre)).toEqual([
      "personas.csv",
      "usuarios.csv",
      "manifiesto.json",
    ]);
  });

  it("todo conjunto sale, aunque venga vacio", () => {
    const archivos = archivosDeExportacion(
      exportacionDe({ personas: [], constancias: [], reportes: [] }),
    );

    // El BOM solo: un archivo de cero bytes no lo abre Excel.
    expect(texto(archivo(archivos, "personas.csv"))).toBe("\uFEFF");
    expect(texto(archivo(archivos, "constancias.csv"))).toBe("\uFEFF");
    expect(texto(archivo(archivos, "reportes.csv"))).toBe("\uFEFF");
  });

  it("el CSV va en UTF-8 con BOM y lleva las filas de su conjunto", () => {
    const archivos = archivosDeExportacion(
      exportacionDe({ personas: [{ id: "1", nombre: "José" }] }),
    );

    expect(texto(archivo(archivos, "personas.csv"))).toBe(
      "\uFEFFid,nombre\r\n1,José\r\n",
    );
    expect(archivo(archivos, "personas.csv").contenido).toEqual(
      new TextEncoder().encode("\uFEFFid,nombre\r\n1,José\r\n"),
    );
  });

  it("el manifiesto lleva el municipio, su marca y los dos momentos", () => {
    const archivos = archivosDeExportacion(exportacionDe({ personas: [] }));

    expect(manifiestoDe(archivos)).toEqual({
      subdominio: "motul",
      nombre: "Motul",
      marca,
      generadaEn: "2026-11-13T23:05:00.000Z",
      // 23:05 UTC son las 17:05 en Merida: la hora civil de quien recibe
      // el archivo, no la del servidor.
      generadaEnMerida: "2026-11-13 17:05",
      conjuntos: [{ nombre: "personas", filas: 0 }],
    });
  });

  it("el manifiesto cuenta las filas de cada conjunto", () => {
    const manifiesto = manifiestoDe(
      archivosDeExportacion(
        exportacionDe({ personas: [{ id: "1" }, { id: "2" }], reportes: [] }),
      ),
    );

    expect(manifiesto.conjuntos).toEqual([
      { nombre: "personas", filas: 2 },
      { nombre: "reportes", filas: 0 },
    ]);
  });

  it("el manifiesto no lleva el id del ayuntamiento", () => {
    const exportacion = exportacionDe({ personas: [] });
    const manifiesto = texto(
      archivo(archivosDeExportacion(exportacion), "manifiesto.json"),
    );

    expect(manifiesto).not.toContain("ayuntamientoId");
    expect(manifiesto).not.toContain(exportacion.ayuntamiento.id);
  });

  it("ningun archivo lleva hashes, contrasenas ni tokens", () => {
    const archivos = archivosDeExportacion(
      exportacionDe({
        usuarios: [{ id: "1", email: "admin@motul.example.com" }],
      }),
      ESCUDO,
    );

    for (const candidato of archivos) {
      expect(texto(candidato)).not.toMatch(/\$argon2|password|token/i);
    }
  });

  it("el escudo va aparte, como escudo.png", () => {
    const archivos = archivosDeExportacion(
      exportacionDe({ personas: [] }),
      ESCUDO,
    );

    expect(archivo(archivos, "escudo.png").contenido).toEqual(ESCUDO);
  });

  it("sin escudo, el ZIP sale sin escudo.png", () => {
    const nombres = archivosDeExportacion(exportacionDe({ personas: [] })).map(
      (candidato) => candidato.nombre,
    );

    expect(nombres).not.toContain("escudo.png");
    expect(nombres).toEqual(["personas.csv", "manifiesto.json"]);
  });

  it("el ZIP se arma con todos los archivos y sin nombres repetidos", () => {
    const archivos = archivosDeExportacion(
      exportacionDe({ personas: [], usuarios: [] }),
      ESCUDO,
    );

    const zip = armarZip(archivos);

    expect(new TextDecoder().decode(zip)).toContain("escudo.png");
    expect(() => armarZip(archivos)).not.toThrow();
  });
});

describe("nombreDelArchivo", () => {
  it("lleva el subdominio y la fecha civil de Merida", () => {
    // 02:00 UTC del 14 son las 20:00 del 13 en Merida: el nombre no puede
    // decir 14, porque quien lo recibe abre el archivo del dia que fue.
    expect(
      nombreDelArchivo("motul", new Date("2026-11-14T02:00:00.000Z")),
    ).toBe("motul-2026-11-13.zip");
    expect(
      nombreDelArchivo("ticul", new Date("2026-11-13T23:05:00.000Z")),
    ).toBe("ticul-2026-11-13.zip");
  });
});
