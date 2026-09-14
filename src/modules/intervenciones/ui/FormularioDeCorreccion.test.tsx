import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { IntervencionGuardada } from "../application/puertos";
import { comoIntervencionId } from "../domain";

vi.mock("./actions/corregirIntervencionAction", () => ({
  corregirIntervencionAction: "corregir-action",
}));

const { FormularioDeCorreccion } = await import("./FormularioDeCorreccion");

const intervencion: IntervencionGuardada = {
  id: comoIntervencionId("33333333-3333-4333-8333-333333333333"),
  tipo: "OBRA",
  estado: "PLANIFICADA",
  fechaDeOcurrencia: "2026-01-15",
  lugarId: "22222222-2222-4222-8222-222222222222",
  calleId: null,
  reporteId: null,
  descripcion: "Descripcion original de la obra",
  registradoPorUsuarioId: "usuario-1",
  capturadoEn: new Date("2026-03-01T12:00:00Z"),
  actualizadoEn: new Date("2026-03-01T12:00:00Z"),
};

describe("FormularioDeCorreccion", () => {
  it("envia solamente el id y la descripcion corregida", () => {
    const html = renderToStaticMarkup(
      <FormularioDeCorreccion intervencion={intervencion} />,
    );

    expect(html).toContain('action="corregir-action"');
    expect(html).toContain(`name="id" value="${intervencion.id}"`);
    expect(html).toContain('name="descripcion"');
    expect(html).toContain("Descripcion original de la obra");
    expect(html).not.toContain('name="tipo"');
    expect(html).not.toContain('name="fechaDeOcurrencia"');
    expect(html).not.toContain('name="lugarId"');
    expect(html).not.toContain('name="calleId"');
    expect(html).not.toContain('name="reporteId"');
    expect(html).toContain("Guardar correccion");
  });
});
