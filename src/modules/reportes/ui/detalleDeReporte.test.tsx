import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MovimientoGuardado } from "../application/puertosDeMovimientos";
import { comoMovimientoId, comoReporteId } from "../domain";
import { DetalleDeReporte } from "./DetalleDeReporte";

const movimiento = (
  parcial: Partial<MovimientoGuardado>,
): MovimientoGuardado => ({
  id: comoMovimientoId("33333333-3333-4333-8333-333333333333"),
  ayuntamientoId: "motul" as MovimientoGuardado["ayuntamientoId"],
  reporteId: comoReporteId("11111111-1111-4111-8111-111111111111"),
  usuarioId: "usuario-1",
  estadoAnterior: null,
  estadoNuevo: "RECIBIDO",
  areaAsignada: null,
  motivo: null,
  ocurridoEn: new Date("2026-03-01T18:00:00Z"),
  ...parcial,
});

const html = (movimientos: readonly MovimientoGuardado[]) =>
  renderToStaticMarkup(<DetalleDeReporte historial={movimientos} />);

describe("DetalleDeReporte", () => {
  it("la transicion con motivo se lee con etiquetas, no con codigos", () => {
    const pagina = html([
      movimiento({
        estadoAnterior: "RECIBIDO",
        estadoNuevo: "RECHAZADO",
        motivo: "DUPLICADO",
      }),
    ]);

    expect(pagina).toContain("Recibido → Rechazado (Duplicado)");
    expect(pagina).not.toContain("RECHAZADO");
  });

  it("una transicion a en atencion se lee con su acento", () => {
    const pagina = html([
      movimiento({ estadoAnterior: "RECIBIDO", estadoNuevo: "EN_ATENCION" }),
    ]);

    expect(pagina).toContain("Recibido → En atención");
  });

  it("el area asignada se lee con su etiqueta", () => {
    const pagina = html([
      movimiento({
        estadoAnterior: "RECIBIDO",
        estadoNuevo: null,
        areaAsignada: "AGUA_POTABLE_Y_DRENAJE",
      }),
    ]);

    expect(pagina).toContain("Agua potable y drenaje");
    expect(pagina).not.toContain("AGUA_POTABLE_Y_DRENAJE");
  });
});
