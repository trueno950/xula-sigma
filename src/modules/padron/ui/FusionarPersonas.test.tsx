import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { ANILLO_DE_FOCO } from "@/shared/ui/estilos";

vi.mock("./actions/fusionarPersonas.action", () => ({
  fusionarPersonasAction: "fusionar-action",
}));

const { FusionarPersonas } = await import("./FusionarPersonas");

const contextoDe = (rol: "ADMIN_MUNICIPAL" | "OPERADOR"): ContextoActual => ({
  ayuntamientoId: comoAyuntamientoId("11111111-1111-4111-8111-111111111111"),
  usuario: {
    id: "22222222-2222-4222-8222-222222222222",
    rol,
  },
  origen: "prueba",
});

const GANADORA = "11111111-1111-4111-8111-111111111111";
const CANDIDATOS = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    etiqueta: "José Armando May Canul · Sin CURP",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    etiqueta: "Jose A May Canul · MACA050312HYNSLL09",
  },
];

const pintar = (candidatos = CANDIDATOS) =>
  renderToStaticMarkup(
    <FusionarPersonas
      contexto={contextoDe("ADMIN_MUNICIPAL")}
      ganadoraId={GANADORA}
      candidatos={candidatos}
    />,
  );

describe("FusionarPersonas", () => {
  it("la ficha abierta es la que se conserva: su id viaja oculto", () => {
    const html = pintar();

    expect(html).toContain(`name="ganadoraId" value="${GANADORA}"`);
  });

  it("la duplicada se elige por nombre entre las personas parecidas", () => {
    const html = pintar();
    const opciones = html.match(/<option[^>]*>[^<]*<\/option>/g) ?? [];

    expect(html).toContain('name="perdedoraId"');
    expect(opciones).toHaveLength(CANDIDATOS.length + 1);
    for (const candidato of CANDIDATOS) {
      expect(html).toContain(`value="${candidato.id}"`);
      expect(html).toContain(candidato.etiqueta);
    }
  });

  it("el select lleva el anillo de foco compartido, sin `outline-none`", () => {
    const selects = pintar().match(/<select[^>]*>/g) ?? [];

    expect(selects).toHaveLength(1);
    for (const select of selects) {
      expect(select).toContain(ANILLO_DE_FOCO);
      expect(select).not.toContain("outline-none");
    }
  });

  it("sin personas parecidas lo dice y no ofrece un formulario que no puede funcionar", () => {
    const html = pintar([]);

    expect(html).toContain("No se encontraron personas parecidas");
    expect(html).not.toContain('name="perdedoraId"');
  });

  it("un rol sin permiso de fusión no pinta nada", () => {
    const html = renderToStaticMarkup(
      <FusionarPersonas
        contexto={contextoDe("OPERADOR")}
        ganadoraId={GANADORA}
        candidatos={CANDIDATOS}
      />,
    );

    expect(html).toBe("");
  });
});
