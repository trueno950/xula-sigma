import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions/altaDePersona.action", () => ({
  altaDePersonaAction: "alta-action",
}));
vi.mock("./actions/sugerirDuplicados.action", () => ({
  sugerirDuplicadosAction: vi.fn(),
}));

const { ListadoDePersonas } = await import("./ListadoDePersonas");
const { FormularioDeAltaDePersona } = await import(
  "./FormularioDeAltaDePersona"
);

describe("copia del padrón", () => {
  it("el listado vacío dice padrón con su acento", () => {
    const html = renderToStaticMarkup(<ListadoDePersonas personas={[]} />);

    expect(html).toContain("Todavía no hay personas en el padrón.");
  });

  it("el formulario de alta acentúa vacío y después", () => {
    const html = renderToStaticMarkup(<FormularioDeAltaDePersona />);

    expect(html).toContain("Dejar vacío si la persona no lo usa.");
    expect(html).toContain("Se puede completar después.");
  });
});
