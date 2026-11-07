import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comoLugarId } from "../domain";
import { FormularioDeDomicilio } from "./FormularioDeDomicilio";
import { cabeceraId, calles, nodos } from "./fixturasDeFormularioDeDomicilio";
import { opcionesDeCalles } from "./opciones";
import { lugaresDeNodos } from "./vistaDeDomicilios";
import { zonaDelFormulario } from "./zonaDelFormulario";

/**
 * La colonia del alta segun el asentamiento: los grupos de la entrada del
 * municipio y la linea de un asentamiento sin colonias. El acortado por la
 * calle elegida vive en `coloniasDelAlta.test.ts`, sobre la funcion pura.
 */
describe("FormularioDeDomicilio: colonias de la entrada del municipio", () => {
  const motulId = comoLugarId("77777777-7777-4777-8777-777777777777");
  const centroId = comoLugarId("88888888-8888-4888-8888-888888888888");
  const html = renderToStaticMarkup(
    <FormularioDeDomicilio
      calles={opcionesDeCalles(calles)}
      declaracionDeDestino="Se guarda en la colonia que elija."
      zona={zonaDelFormulario(
        [
          ...lugaresDeNodos(nodos),
          {
            id: cabeceraId,
            tipo: "comisaria",
            nombre: "Tepakan",
            padreId: null,
          },
          { id: motulId, tipo: "cabecera", nombre: "Motul", padreId: null },
          { id: centroId, tipo: "colonia", nombre: "Centro", padreId: motulId },
        ],
        undefined,
        undefined,
      )}
    />,
  );

  /**
   * Sin JavaScript la lista no se puede acortar por la calle elegida: los
   * grupos son lo que deja elegir una colonia del mismo asentamiento.
   */
  it("sin calle elegida agrupa las colonias por asentamiento", () => {
    expect(html).toContain('<optgroup label="Motul">');
    expect(html).toContain('<optgroup label="Tepakan">');
    expect(html.indexOf('<optgroup label="Motul">')).toBeLessThan(
      html.indexOf(`value="${centroId}"`),
    );
  });

  it("ofrece una sola opcion de «Sin colonia», fuera de los grupos", () => {
    expect(html.match(/<option[^>]*>Sin colonia/g)).toHaveLength(1);
    expect(html.lastIndexOf("</optgroup>")).toBeLessThan(
      html.indexOf('value="sin-colonia"'),
    );
  });
});

describe("FormularioDeDomicilio: asentamiento sin colonias", () => {
  const kiniId = comoLugarId("99999999-9999-4999-8999-999999999999");
  const html = renderToStaticMarkup(
    <FormularioDeDomicilio
      calles={opcionesDeCalles(calles)}
      declaracionDeDestino="Se guarda en el asentamiento."
      zona={zonaDelFormulario(
        [{ id: kiniId, tipo: "comisaria", nombre: "Kiní", padreId: null }],
        { id: kiniId, nombre: "Kiní" },
        { id: kiniId, tipo: "comisaria" },
      )}
    />,
  );

  it("dice que el asentamiento no tiene colonias, no el municipio", () => {
    expect(html).toContain(
      "Kiní no tiene colonias; el domicilio queda en Kiní.",
    );
    expect(html).not.toContain("Todavía no hay colonias en el municipio");
    expect(html).not.toMatch(/<select[^>]*name="lugarId"/);
    expect(html).toContain('type="hidden" name="lugarId" value=""');
  });
});
