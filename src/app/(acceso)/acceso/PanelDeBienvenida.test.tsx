import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PanelDeBienvenida } from "./PanelDeBienvenida";

describe("PanelDeBienvenida", () => {
  it("dice el nombre del municipio como titulo unico de la pantalla", () => {
    const html = renderToStaticMarkup(<PanelDeBienvenida nombre="Motul" />);

    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain(">Motul</h1>");
    expect(html).toContain("XULA SIGMA");
  });

  it("pinta el escudo con su texto alternativo cuando el municipio lo tiene", () => {
    const html = renderToStaticMarkup(
      <PanelDeBienvenida nombre="Motul" escudo="https://r2.example/e.png" />,
    );

    expect(html).toContain('src="https://r2.example/e.png"');
    expect(html).toContain('alt="Escudo de Motul"');
  });

  it("sin escudo no pinta imagen", () => {
    expect(
      renderToStaticMarkup(<PanelDeBienvenida nombre="Motul" />),
    ).not.toContain("<img");
  });

  it("usa la superficie de marca tenue, no un gris crudo", () => {
    const html = renderToStaticMarkup(<PanelDeBienvenida nombre="Motul" />);

    expect(html).toContain("bg-marca-tenue");
    expect(html).not.toContain("neutral-");
  });
});
