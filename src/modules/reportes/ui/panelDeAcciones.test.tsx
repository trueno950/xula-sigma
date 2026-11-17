import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PanelDeAcciones } from "./PanelDeAcciones";

const pagina = renderToStaticMarkup(
  <PanelDeAcciones>
    <p>las acciones</p>
  </PanelDeAcciones>,
);

describe("PanelDeAcciones", () => {
  it("es una region llamada Acciones con lo que la pantalla le pasa", () => {
    expect(pagina).toMatch(/<aside[^>]*aria-labelledby="acciones-del-reporte"/);
    expect(pagina).toMatch(
      /<h2[^>]*id="acciones-del-reporte"[^>]*>Acciones<\/h2>/,
    );
    expect(pagina).toContain("las acciones");
  });

  it("se pega al borde superior solo donde hay dos columnas", () => {
    expect(pagina).toContain("lg:sticky");
    expect(pagina).toContain("lg:top-6");
  });
});
