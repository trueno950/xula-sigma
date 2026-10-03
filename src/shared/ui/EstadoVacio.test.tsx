import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EstadoVacio } from "./EstadoVacio";

describe("EstadoVacio", () => {
  it("el vacio inicial lleva un icono de linea, la frase y la accion", () => {
    const html = renderToStaticMarkup(
      <EstadoVacio
        estado={{ clase: "vacio-inicial" }}
        mensajeInicial="Aun no hay personas."
        accion={<a href="/nueva">Nueva persona</a>}
        hrefSinFiltro="/padron"
      />,
    );

    expect(html).toContain("<svg");
    expect(html).toContain("Aun no hay personas.");
    expect(html).toContain("Nueva persona");
  });

  it("el vacio por filtro nombra el filtro y ofrece quitarlo", () => {
    const html = renderToStaticMarkup(
      <EstadoVacio
        estado={{ clase: "vacio-por-filtro", filtro: "Lupita" }}
        mensajeInicial="Aun no hay personas."
        hrefSinFiltro="/padron"
      />,
    );

    expect(html).toContain("Lupita");
    expect(html).toContain('href="/padron"');
    expect(html).not.toContain("Aun no hay personas.");
  });
});
