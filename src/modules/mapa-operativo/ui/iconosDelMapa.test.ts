import { describe, expect, it } from "vitest";
import { CLAVES_DE_ICONO } from "../domain";
import { svgDeIcono, TRAZOS_DE_ICONO } from "./iconosDelMapa";

describe("iconos del mapa", () => {
  it("cada clave del catalogo se dibuja con al menos un trazo", () => {
    for (const clave of CLAVES_DE_ICONO) {
      expect(TRAZOS_DE_ICONO[clave].length).toBeGreaterThan(0);
    }
  });

  it("el svg viaja adentro del codigo, sin archivos ni pedidos", () => {
    const svg = svgDeIcono("BACHE");

    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain("<path");
    expect(svg).not.toContain("http");
  });

  it("el trazo del icono se hereda del contenedor para que mande el color del estado", () => {
    expect(svgDeIcono("FUGA")).toContain('fill="currentColor"');
    expect(svgDeIcono("FUGA")).toContain('aria-hidden="true"');
  });
});
