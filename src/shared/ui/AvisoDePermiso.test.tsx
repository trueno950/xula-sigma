import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AvisoDePermiso } from "./AvisoDePermiso";

describe("AvisoDePermiso", () => {
  it("explica la capacidad faltante sin ofrecer una accion interactiva", () => {
    const html = renderToStaticMarkup(
      <AvisoDePermiso
        capacidad="administrar la estructura territorial"
        requisito="el rol de administrador municipal"
      />,
    );

    expect(html).toContain(
      "Su rol no permite administrar la estructura territorial.",
    );
    expect(html).toContain("Se requiere el rol de administrador municipal.");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("<button");
  });
});
