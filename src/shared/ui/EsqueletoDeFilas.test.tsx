import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EsqueletoDeFilas } from "./EsqueletoDeFilas";

describe("EsqueletoDeFilas", () => {
  it("dibuja filas de 48px, la altura exacta de las filas reales", () => {
    const html = renderToStaticMarkup(<EsqueletoDeFilas filas={3} />);

    expect(html.match(/<li /g)).toHaveLength(3);
    expect(html).toContain("h-12");
    expect(html).not.toContain("h-11");
  });

  it("se apoya como la tabla: tarjeta con borde y sombra de reposo", () => {
    const html = renderToStaticMarkup(<EsqueletoDeFilas />);

    expect(html).toContain("rounded-lg");
    expect(html).toContain("shadow-reposo");
  });

  it("pulsa con la animacion lenta del sistema y se oculta al lector", () => {
    const html = renderToStaticMarkup(<EsqueletoDeFilas />);

    expect(html).toContain("animate-pulso-lento");
    expect(html).toContain('aria-hidden="true"');
  });
});
