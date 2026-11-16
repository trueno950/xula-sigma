import { describe, expect, it } from "vitest";
import { htmlDeLaVentana } from "./htmlDeMarcador";
import {
  HECHO_DE_INTERVENCION,
  HECHO_DE_REPORTE,
  marcadorDe,
} from "./mapaDePrueba";

/**
 * S4 de `gestion-municipal`: la ventana de cada marcador muestra la fecha del
 * hecho en fecha civil -el registro de un reporte o la ocurrencia de una
 * obra-. Vive aparte de `htmlDeMarcador.test.ts` por la metrica de lineas por
 * archivo.
 */
describe("htmlDeLaVentana, la fecha civil de cada hecho (S4)", () => {
  it("muestra la fecha del reporte y la de la intervencion, en fecha civil", () => {
    const marcador = marcadorDe([], {
      hechos: [
        { ...HECHO_DE_REPORTE, fechaCivil: "2026-11-16" },
        { ...HECHO_DE_INTERVENCION, fechaCivil: "2026-01-15" },
      ],
    });

    const html = htmlDeLaVentana(marcador);

    expect(html).toContain("16 nov 2026");
    expect(html).toContain("15 ene 2026");
  });

  it("la fecha va en su propio elemento, para no confundirse con el estado", () => {
    const marcador = marcadorDe([], {
      hechos: [{ ...HECHO_DE_REPORTE, fechaCivil: "2026-11-16" }],
    });

    expect(htmlDeLaVentana(marcador)).toContain("<time");
  });

  it("una fecha vacia no inventa un texto", () => {
    const marcador = marcadorDe([], {
      hechos: [{ ...HECHO_DE_REPORTE, fechaCivil: "" }],
    });

    expect(htmlDeLaVentana(marcador)).not.toContain("<time");
  });
});
