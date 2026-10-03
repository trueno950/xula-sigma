import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Migaja } from "./Migaja";

describe("Migaja", () => {
  const html = renderToStaticMarkup(
    <Migaja
      etiqueta="Ruta"
      pasos={[
        { etiqueta: "Inicio", href: "/" },
        { etiqueta: "Territorio", href: "/territorio" },
        { etiqueta: "Calle Real" },
      ]}
    />,
  );

  it("los pasos previos son enlaces", () => {
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/territorio"');
  });

  it("el ultimo paso es texto con aria-current y no un enlace", () => {
    expect(html).toMatch(/<span[^>]*aria-current="page"[^>]*>Calle Real/);
    expect(html.match(/<a /g)).toHaveLength(2);
  });

  it("no usa la marca como color de texto", () => {
    expect(html).not.toMatch(/text-marca(?!-)/);
  });
});
