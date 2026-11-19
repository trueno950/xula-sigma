import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResumenDeTerritorio } from "./ResumenDeTerritorio";

const texto = (props: Parameters<typeof ResumenDeTerritorio>[0]) =>
  renderToStaticMarkup(<ResumenDeTerritorio {...props} />).replace(
    /<[^>]*>/g,
    "",
  );

/**
 * I2 de `odd/tasks/territorio-ux.md` (S2): la entrada no decia cuantos
 * asentamientos hay ni cuantos quedaron al buscar. Es la linea de
 * `padron/ui/ResumenDeListado.tsx`, con las palabras de Territorio.
 */
describe("el resumen de la entrada", () => {
  it("sin busqueda dice cuantos asentamientos y cuantos domicilios hay", () => {
    expect(texto({ asentamientos: 5, domicilios: 14 })).toContain(
      "5 asentamientos · 14 domicilios",
    );
  });

  it("concuerda en singular", () => {
    expect(texto({ asentamientos: 1, domicilios: 1 })).toContain(
      "1 asentamiento · 1 domicilio",
    );
  });

  it("con busqueda dice cuantos lugares coincidieron y repite la consulta", () => {
    expect(
      texto({
        asentamientos: 5,
        domicilios: 14,
        busqueda: "centro",
        encontrados: 3,
      }),
    ).toContain("3 lugares para «centro»");
  });

  it("una sola coincidencia se dice en singular", () => {
    expect(
      texto({
        asentamientos: 5,
        domicilios: 14,
        busqueda: "centro",
        encontrados: 1,
      }),
    ).toContain("1 lugar para «centro»");
  });

  it("sin coincidencias lo dice, en vez de callarse el cero", () => {
    expect(
      texto({
        asentamientos: 5,
        domicilios: 14,
        busqueda: "x",
        encontrados: 0,
      }),
    ).toContain("0 lugares para «x»");
  });
});
