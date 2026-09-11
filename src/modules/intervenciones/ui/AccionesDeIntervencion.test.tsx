import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { IntervencionGuardada } from "../application/puertos";
import { comoIntervencionId } from "../domain";

vi.mock("./actions/cambiarEstadoAction", () => ({
  cambiarEstadoAction: "estado-action",
}));

const { AccionesDeIntervencion } = await import("./AccionesDeIntervencion");

const base: IntervencionGuardada = {
  id: comoIntervencionId("33333333-3333-4333-8333-333333333333"),
  tipo: "MEJORA",
  estado: "PLANIFICADA",
  fechaDeOcurrencia: "2026-02-20",
  lugarId: "22222222-2222-4222-8222-222222222222",
  calleId: null,
  reporteId: null,
  descripcion: "Descripcion de intervencion municipal",
  registradoPorUsuarioId: "usuario-1",
  capturadoEn: new Date("2026-03-01T12:00:00Z"),
  actualizadoEn: new Date("2026-03-01T12:00:00Z"),
};

describe("AccionesDeIntervencion", () => {
  it("muestra solo los destinos validos", () => {
    const html = renderToStaticMarkup(
      <AccionesDeIntervencion intervencion={base} />,
    );

    expect(html).toContain('name="estadoNuevo" value="EN_EJECUCION"');
    expect(html).toContain('name="estadoNuevo" value="CANCELADA"');
  });

  it("explica que un estado terminal no puede reabrirse", () => {
    const html = renderToStaticMarkup(
      <AccionesDeIntervencion
        intervencion={{ ...base, estado: "FINALIZADA" }}
      />,
    );

    expect(html).not.toContain('name="estadoNuevo"');
    expect(html).toContain("El estado es terminal");
  });
});
