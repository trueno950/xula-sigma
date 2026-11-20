import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { IntervencionGuardada } from "../application/puertos";

vi.mock("./actions/cambiarEstadoAction", () => ({
  cambiarEstadoAction: "estado-action",
}));
vi.mock("./actions/corregirIntervencionAction", () => ({
  corregirIntervencionAction: "corregir-action",
}));

const { AccionesDeIntervencion } = await import("./AccionesDeIntervencion");

const base = {
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
  id: "33333333-3333-4333-8333-333333333333",
} as unknown as IntervencionGuardada;

const html = (intervencion: IntervencionGuardada) =>
  renderToStaticMarkup(<AccionesDeIntervencion intervencion={intervencion} />);

describe("AccionesDeIntervencion", () => {
  it("deja el siguiente paso como la unica accion primaria", () => {
    const pagina = html(base);

    expect(pagina).toContain("Siguiente paso");
    expect(pagina).toContain(">Marcar en ejecución<");
    expect(pagina).not.toContain(">Marcar planificada<");
    expect(pagina.match(/bg-marca /g) ?? []).toHaveLength(1);
  });

  it("nombra el estado al que lleva, no el de origen (S12)", () => {
    expect(html(base)).toContain(">Marcar en ejecución<");
    expect(
      html({ ...base, estado: "EN_EJECUCION" } as IntervencionGuardada),
    ).toContain(">Marcar finalizada<");
  });

  it("pliega la correccion para que no compita con el paso siguiente (S13)", () => {
    const pagina = html(base);

    expect(pagina).toContain("<details");
    expect(pagina).toContain("Corregir intervención…");
    expect(pagina.indexOf("Corregir intervención…")).toBeGreaterThan(
      pagina.indexOf("Siguiente paso"),
    );
    expect(pagina).toContain('action="corregir-action"');
  });

  it("deja «Cancelar» al final, como peligro y plegado, con confirmacion (S12)", () => {
    const pagina = html(base);

    expect(pagina).toContain("Cancelar intervención…");
    expect(pagina.indexOf("Cancelar intervención…")).toBeGreaterThan(
      pagina.indexOf("Corregir intervención…"),
    );
    expect(pagina).toContain("Una intervención cancelada no se puede reabrir.");
    expect(pagina).toContain('type="checkbox"');
    expect(pagina).toContain('name="confirmar"');
    expect(pagina).toContain("required");
    expect(pagina).toContain("Confirmo cancelar la intervención INT-3333.");
    expect(pagina).toContain(">Cancelar la intervención<");
    expect(pagina).not.toContain(">Cancelar<");
  });

  it("en un estado terminal no ofrece paso siguiente ni cancelacion", () => {
    const pagina = html({
      ...base,
      estado: "FINALIZADA",
    } as IntervencionGuardada);

    expect(pagina).not.toContain('name="estadoNuevo"');
    expect(pagina).toContain("El estado es terminal");
    expect(pagina).toContain("Corregir intervención…");
  });
});
