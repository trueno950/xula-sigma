import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PaginaDePanel } from "./PaginaDePanel";

describe("PaginaDePanel", () => {
  it("pinta titulo, descripcion y accion", () => {
    const html = renderToStaticMarkup(
      <PaginaDePanel
        titulo="Padrón"
        descripcion="Personas del municipio."
        accion={<a href="/padron/alta">Alta</a>}
      >
        <p>contenido</p>
      </PaginaDePanel>,
    );

    expect(html).toMatch(/<h1[^>]*>Padrón<\/h1>/);
    expect(html).toContain("Personas del municipio.");
    expect(html).toContain("Alta");
  });

  it("la etiqueta va junto al titulo como pastilla, no como dato monoespaciado", () => {
    const html = renderToStaticMarkup(
      <PaginaDePanel titulo="Colonia Centro" etiqueta="Colonia">
        <p>contenido</p>
      </PaginaDePanel>,
    );

    expect(html).toMatch(/<h1[^>]*>Colonia Centro<\/h1>/);
    expect(html).toMatch(
      /<span[^>]*rounded-pill[^>]*bg-caliza-relleno[^>]*>Colonia/,
    );
    expect(html).not.toContain("font-mono");
    expect(html.indexOf("Colonia</span>")).toBeGreaterThan(
      html.indexOf("</h1>"),
    );
  });

  it("sin etiqueta no pinta pastilla", () => {
    const html = renderToStaticMarkup(
      <PaginaDePanel titulo="a">x</PaginaDePanel>,
    );

    expect(html).not.toContain("rounded-pill");
  });

  it("la migaja va antes del titulo", () => {
    const html = renderToStaticMarkup(
      <PaginaDePanel titulo="Detalle" migaja={<nav>ruta</nav>}>
        <p>contenido</p>
      </PaginaDePanel>,
    );

    expect(html.indexOf("ruta")).toBeLessThan(html.indexOf("<h1"));
  });

  it("limita el ancho a 1200px en listas y 720px en formularios", () => {
    const lista = renderToStaticMarkup(
      <PaginaDePanel titulo="a">x</PaginaDePanel>,
    );
    const formulario = renderToStaticMarkup(
      <PaginaDePanel titulo="a" ancho="formulario">
        x
      </PaginaDePanel>,
    );

    expect(lista).toContain("max-w-[1200px]");
    expect(formulario).toContain("max-w-[720px]");
  });
});
