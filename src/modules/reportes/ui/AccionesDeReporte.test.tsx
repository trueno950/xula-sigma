import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions/cambiarEstadoAction", () => ({
  cambiarEstadoAction: vi.fn(),
}));
vi.mock("./actions/asignarAreaAction", () => ({
  asignarAreaAction: vi.fn(),
}));

const { AccionesDeReporte } = await import("./AccionesDeReporte");

const RECIBIDO = "11111111-1111-4111-8111-111111111111";

describe("acciones de un reporte", () => {
  it("el ejemplo de folio no fija un anio", () => {
    const html = renderToStaticMarkup(
      <AccionesDeReporte reporteId={RECIBIDO} estadoActual="RECIBIDO" />,
    );

    expect(html).toContain('placeholder="REP-AAAA-000123"');
    expect(html).not.toContain("REP-2026-000123");
  });
});
