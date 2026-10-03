import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BarraDeAcciones } from "./BarraDeAcciones";
import { FichaDeDatos, FilaDeFicha } from "./FichaDeDatos";
import { GrupoDeCampos } from "./GrupoDeCampos";

describe("piezas de formulario y ficha", () => {
  it("la ficha pinta etiqueta y valor como definicion, con el dato monoespaciado", () => {
    const html = renderToStaticMarkup(
      <FichaDeDatos>
        <FilaDeFicha etiqueta="Tipo">Fuga</FilaDeFicha>
        <FilaDeFicha etiqueta="Folio" dato>
          REP-1
        </FilaDeFicha>
      </FichaDeDatos>,
    );

    expect(html).toContain("<dt");
    expect(html).toMatch(/font-mono[^>]*>REP-1</);
    expect(html).not.toMatch(/font-mono[^>]*>Fuga</);
  });

  it("el grupo es un fieldset con su legend", () => {
    const html = renderToStaticMarkup(
      <GrupoDeCampos titulo="Datos de la persona">
        <input />
      </GrupoDeCampos>,
    );

    expect(html).toContain("<fieldset");
    expect(html).toMatch(/<legend[^>]*>Datos de la persona<\/legend>/);
  });

  it("la barra de acciones no estira la primaria en escritorio", () => {
    const html = renderToStaticMarkup(
      <BarraDeAcciones>
        <button type="submit">Guardar</button>
      </BarraDeAcciones>,
    );

    expect(html).toContain("sm:[&amp;&gt;*]:w-auto");
  });
});
