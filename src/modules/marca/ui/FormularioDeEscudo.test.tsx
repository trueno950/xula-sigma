import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ANILLO_DE_FOCO } from "@/shared/ui/estilos";

vi.mock("./actions/cambiarEscudo.action", () => ({
  cambiarEscudoAction: "escudo-action",
}));

const { FormularioDeEscudo } = await import("./FormularioDeEscudo");

describe("FormularioDeEscudo", () => {
  it("el campo de archivo lleva el anillo de foco compartido, sin `outline-none`", () => {
    const html = renderToStaticMarkup(<FormularioDeEscudo />);

    const campos = html.match(/<input[^>]*>/g) ?? [];

    expect(campos).toHaveLength(1);
    for (const campo of campos) {
      expect(campo).toContain(ANILLO_DE_FOCO);
      expect(campo).not.toContain("outline-none");
    }
  });
});
