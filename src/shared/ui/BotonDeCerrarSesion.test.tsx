import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BotonDeCerrarSesion } from "./BotonDeCerrarSesion";

describe("BotonDeCerrarSesion", () => {
  const html = renderToStaticMarkup(<BotonDeCerrarSesion />);

  it("es un boton con texto visible, no solo un icono", () => {
    expect(html).toMatch(/<button[^>]*type="button"/);
    expect(html).toContain("Cerrar sesión");
  });

  it("no anuncia ningun error mientras nadie lo ha usado", () => {
    expect(html).not.toContain('role="alert"');
  });
});
