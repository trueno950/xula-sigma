import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";

vi.mock("./actions/editarPersona.action", () => ({
  editarPersonaAction: "editar-action",
}));
vi.mock("./actions/darDeBajaPersona.action", () => ({
  darDeBajaPersonaAction: "baja-action",
}));
vi.mock("./actions/fusionarPersonas.action", () => ({
  fusionarPersonasAction: "fusionar-action",
}));

const { AdministrarPersona } = await import("./AdministrarPersona");

const PERSONA = {
  id: "11111111-1111-4111-8111-111111111111",
  nombres: "José Armando",
  primerApellido: "May",
  segundoApellido: "Canul",
  curp: "MACA050312HYNSLL09",
};

const contextoDe = (rol: "ADMIN_MUNICIPAL" | "OPERADOR" | "CONSULTA") =>
  ({
    ayuntamientoId: comoAyuntamientoId("11111111-1111-4111-8111-111111111111"),
    usuario: { id: "22222222-2222-4222-8222-222222222222", rol },
    origen: "prueba",
  }) as ContextoActual;

const CANDIDATOS = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    etiqueta: "José Armando May Canul · Sin CURP",
  },
];

const pintar = (rol: "ADMIN_MUNICIPAL" | "OPERADOR" = "ADMIN_MUNICIPAL") =>
  renderToStaticMarkup(
    <AdministrarPersona
      persona={PERSONA}
      contexto={contextoDe(rol)}
      candidatos={CANDIDATOS}
    />,
  );

describe("AdministrarPersona", () => {
  it("los pliegues comparten un solo `name`: abrir uno cierra el otro", () => {
    const html = pintar();
    const pliegues = html.match(/<details[^>]*>/g) ?? [];

    expect(pliegues).toHaveLength(3);
    for (const pliegue of pliegues) {
      expect(pliegue).toContain('name="acciones-de-la-ficha"');
    }
  });

  it("dar de baja va al final, tras el divisor y como acción de peligro", () => {
    const html = pintar();
    const indiceDelDivisor = html.indexOf("border-t border-caliza-divisor");
    const indiceDeLaBaja = html.indexOf("Dar de baja…");

    expect(indiceDelDivisor).toBeGreaterThan(-1);
    expect(indiceDeLaBaja).toBeGreaterThan(indiceDelDivisor);
  });

  it("corregir datos llega con los datos actuales puestos y el botón de guardar", () => {
    const html = pintar();

    expect(html).toContain("Corregir datos…");
    expect(html).toContain('name="nombres"');
    expect(html).toContain('value="José Armando"');
    expect(html).toContain('value="May"');
    expect(html).toContain('value="Canul"');
    expect(html).toContain('value="MACA050312HYNSLL09"');
    expect(html).toContain("Guardar cambios");
    expect(html).toContain(
      'name="personaId" value="11111111-1111-4111-8111-111111111111"',
    );
  });

  it("la baja nombra a la persona en su confirmación y no se envía sola", () => {
    const html = pintar();

    expect(html).toContain("Se da de baja a José Armando May Canul del padrón");
    expect(html).toContain("Dar de baja</button>");
    expect(html).toContain("border-senial-error");
  });

  it("la fusión conserva esta ficha y elige la duplicada por nombre", () => {
    const html = pintar();

    expect(html).toContain("Fusionar con otra persona…");
    expect(html).toContain(
      'name="ganadoraId" value="11111111-1111-4111-8111-111111111111"',
    );
    expect(html).toContain('name="perdedoraId"');
    expect(html).toContain("José Armando May Canul · Sin CURP");
  });

  it("un operador de mostrador no ve la fusión, que pide otro permiso", () => {
    const html = pintar("OPERADOR");

    expect(html).toContain("Corregir datos…");
    expect(html).toContain("Dar de baja…");
    expect(html).not.toContain("Fusionar con otra persona…");
    expect(html.match(/<details[^>]*>/g) ?? []).toHaveLength(2);
  });
});
