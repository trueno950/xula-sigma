import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EnlacesDeLaEntrada } from "./EnlacesDeLaEntrada";

const formulario = (html: string) =>
  html.match(/<form\b[^>]*>[\s\S]*?<\/form>/)?.[0] ?? "";

/**
 * Hallazgo 11: la entrada solo buscaba lugares por nombre. La busqueda de
 * domicilio es un GET nativo hacia el registro, sin JavaScript: el `?q=`
 * es lo unico que viaja en la URL, y lo escribio la operadora.
 */
describe("la busqueda de domicilio de la entrada", () => {
  it("es un formulario GET hacia /territorio/domicilios con el campo q", () => {
    const html = formulario(renderToStaticMarkup(<EnlacesDeLaEntrada />));

    expect(html).toMatch(/<form\b[^>]*method="get"/);
    expect(html).toMatch(/<form\b[^>]*action="\/territorio\/domicilios"/);
    expect(html).toMatch(/<input\b[^>]*name="q"/);
    expect(html).toMatch(/<button\b[^>]*type="submit"[^>]*>[\s\S]*Buscar/);
  });

  it("lleva la etiqueta visible «Buscar domicilio» atada al campo", () => {
    const html = formulario(renderToStaticMarkup(<EnlacesDeLaEntrada />));
    const id = html.match(/<input\b[^>]*id="([^"]+)"/)?.[1];
    const etiqueta = html.match(/<label\b[^>]*>/)?.[0] ?? "";

    expect(id).toBeDefined();
    expect(etiqueta).toContain(`for="${id}"`);
    expect(etiqueta).not.toContain("sr-only");
    expect(html).toMatch(/<label\b[^>]*>Buscar domicilio<\/label>/);
  });

  it("el campo y el boton miden 44px", () => {
    const html = formulario(renderToStaticMarkup(<EnlacesDeLaEntrada />));

    expect(html.match(/<input\b[^>]*>/)?.[0]).toContain("h-11");
    expect(html.match(/<button\b[^>]*>/)?.[0]).toContain("h-11");
  });
});
