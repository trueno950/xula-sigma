import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BuscadorDeLugares } from "./BuscadorDeLugares";

const render = (busqueda?: string) =>
  renderToStaticMarkup(<BuscadorDeLugares busqueda={busqueda} />);

const formulario = (html: string) =>
  html.match(/<form\b[^>]*>[\s\S]*?<\/form>/)?.[0] ?? "";

/**
 * I1 de `odd/tasks/territorio-ux.md` (S1): la busqueda de la entrada solo
 * se enviaba con Enter, y en el celular nadie lo sabe. Los dos buscadores
 * de la entrada reciben el mismo trato: campo, boton y chip.
 */
describe("el buscador de lugares de la entrada", () => {
  it("trae un boton «Buscar» visible al lado del campo", () => {
    const form = formulario(render(undefined));

    expect(form).toMatch(/method="get"/);
    expect(form).toMatch(/<input\b[^>]*name="q"/);
    expect(form).toMatch(/<button\b[^>]*type="submit"[^>]*>[\s\S]*Buscar/);
    expect(form).toMatch(/<label\b[^>]*>Buscar lugar por nombre<\/label>/);
  });

  it("el campo y el boton miden 44px", () => {
    const form = formulario(render(undefined));

    expect(form.match(/<input\b[^>]*>/)?.[0]).toContain("h-11");
    expect(form.match(/<button\b[^>]*>/)?.[0]).toContain("h-11");
  });

  it("sigue siendo un GET del navegador: ningun campo oculto que el cliente escriba", () => {
    const form = formulario(render(undefined));

    expect(form).not.toMatch(/type="hidden"/);
    expect(form).not.toContain("ayuntamiento");
    expect(form).toMatch(/name="q"/);
  });

  it("con una busqueda puesta ofrece el chip que la quita", () => {
    const html = render("Centro");

    expect(html).toContain("Búsqueda: Centro");
    expect(html).toMatch(/<a\b[^>]*href="\/territorio"/);
    expect(html).toContain("Quitar filtro");
  });

  it("sin busqueda no hay chip", () => {
    const html = render(undefined);

    expect(html).not.toContain("Quitar filtro");
  });
});
