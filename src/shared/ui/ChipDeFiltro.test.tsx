import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChipDeFiltro } from "./ChipDeFiltro";

const chip = () =>
  renderToStaticMarkup(
    <ChipDeFiltro etiqueta="Estado: Recibido" hrefQuitar="/reportes" />,
  );

describe("ChipDeFiltro", () => {
  it("es una pastilla de 32px en marca suave con texto de tinta", () => {
    const html = chip();

    expect(html).toContain("rounded-pill");
    expect(html).toContain("h-8");
    expect(html).toContain("bg-marca-suave");
    expect(html).toContain("text-caliza-tinta");
    expect(html).not.toMatch(/text-marca(?!-)/);
  });

  it("quitar es un enlace con la x dentro y nombre accesible", () => {
    const html = chip();

    expect(html).toContain('href="/reportes"');
    expect(html).toContain("<svg");
    expect(html).toContain("Quitar filtro: Estado: Recibido");
  });

  it("no lleva sombra", () => {
    expect(chip()).not.toContain("shadow");
  });
});
