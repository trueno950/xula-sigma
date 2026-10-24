import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions/emitirConstanciaAction", () => ({
  emitirConstanciaAction: "emitir-action",
}));

const { FormularioDeEmision } = await import("./FormularioDeEmision");

describe("FormularioDeEmision", () => {
  it("muestra la fecha civil de residencia en formato corto", () => {
    const formulario = renderToStaticMarkup(
      <FormularioDeEmision
        personaId="persona-1"
        nombreCompleto="Juan Poot"
        direccion={{ texto: "Calle 21 123", desdeEn: "2026-10-24" }}
      />,
    );

    expect(formulario).toContain("24 oct 2026");
    expect(formulario).not.toContain("2026-10-24");
  });
});
