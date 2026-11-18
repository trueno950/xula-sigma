import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FiltrosDeConstancias } from "./FiltrosDeConstancias";

const textoPlano = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const html = (props: Parameters<typeof FiltrosDeConstancias>[0] = {}) =>
  renderToStaticMarkup(<FiltrosDeConstancias {...props} />);

describe("FiltrosDeConstancias, qué busca el buscador (S2)", () => {
  it("la etiqueta dice que busca una constancia", () => {
    expect(textoPlano(html())).toContain("Buscar constancia");
  });

  it("la ayuda dice folio y nombre del titular, y que no distingue acentos", () => {
    expect(textoPlano(html())).toContain(
      "Por folio (VEC-2026-000018) o por el nombre del titular. No distingue acentos ni mayúsculas.",
    );
  });

  it("la ayuda va asociada al campo, no solo debajo", () => {
    const filtros = html();

    expect(filtros).toContain('aria-describedby="q-ayuda"');
    expect(filtros).toContain('id="q-ayuda"');
  });

  it("el campo conserva lo escrito y el estado elegido", () => {
    const filtros = html({ q: "canul", estado: "CANCELADA" });

    expect(filtros).toContain('value="canul"');
    expect(filtros).toMatch(/<option value="CANCELADA"[^>]*selected/);
  });
});

describe("FiltrosDeConstancias, el formulario nativo", () => {
  it("busqueda y estado viajan en un solo GET, sin JavaScript", () => {
    const filtros = html();

    expect(filtros).toMatch(/<form[^>]*method="get"/);
    expect(filtros).toContain('action="/constancias"');
    expect(filtros).toContain('name="q"');
    expect(filtros).toContain('name="estado"');
    expect(filtros).toContain(">Buscar<");
  });

  it("es una busqueda con nombre para el lector de pantalla", () => {
    expect(html()).toContain('aria-label="Buscar constancias emitidas"');
  });
});
