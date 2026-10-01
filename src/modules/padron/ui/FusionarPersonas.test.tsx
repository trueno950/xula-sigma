import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { ANILLO_DE_FOCO } from "@/shared/ui/estilos";

vi.mock("./actions/fusionarPersonas.action", () => ({
  fusionarPersonasAction: "fusionar-action",
}));

const { FusionarPersonas } = await import("./FusionarPersonas");

const contexto: ContextoActual = {
  ayuntamientoId: comoAyuntamientoId("11111111-1111-4111-8111-111111111111"),
  usuario: {
    id: "22222222-2222-4222-8222-222222222222",
    rol: "ADMIN_MUNICIPAL",
  },
  origen: "prueba",
};

describe("FusionarPersonas", () => {
  it("los dos campos llevan el anillo de foco compartido, sin `outline-none`", () => {
    const html = renderToStaticMarkup(<FusionarPersonas contexto={contexto} />);

    const campos = html.match(/<input[^>]*>/g) ?? [];

    expect(campos).toHaveLength(2);
    for (const campo of campos) {
      expect(campo).toContain(ANILLO_DE_FOCO);
      expect(campo).not.toContain("outline-none");
    }
  });
});
