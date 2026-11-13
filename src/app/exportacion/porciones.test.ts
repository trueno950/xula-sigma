import { describe, expect, it } from "vitest";
import { porciones } from "./porciones";

/**
 * La composicion de `src/app` es el unico punto donde dos modulos pueden
 * reclamar el mismo nombre de conjunto. `agregarPorciones` ya lo detecta en
 * tiempo de ejecucion -aborta el ZIP entero en vez de entregar uno
 * incompleto-, pero el momento de enterarse no deberia ser la descarga de un
 * municipio que se va: este test lo corre en el guardado.
 */
describe("porciones de la exportacion", () => {
  it("no hay dos porciones reclamando el mismo nombre de conjunto", () => {
    const nombres = porciones.map((porcion) => porcion.nombre);

    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it("compone los conjuntos que los modulos agregaron con el exportador", () => {
    const nombres = porciones.map((porcion) => porcion.nombre);

    expect(nombres).toEqual(
      expect.arrayContaining([
        "zonas",
        "calles_de_zonas",
        "eventos_de_calles",
        "intervenciones",
        "revisiones_de_intervenciones",
        "reimpresiones",
        "configuracion_de_documentos",
        "folios_de_documentos",
        "folios_de_reportes",
      ]),
    );
  });
});
