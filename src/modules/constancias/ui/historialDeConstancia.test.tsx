import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HistorialDeConstancia } from "./HistorialDeConstancia";

/**
 * El historial del detalle se arma solo con el modelo de lectura que ya
 * existe (emision y cancelacion): no hay tabla de reimpresiones que leer, y
 * `constancias-ux` no la agrega.
 */
describe("HistorialDeConstancia", () => {
  it("una constancia vigente tiene un solo movimiento: la emision", () => {
    const html = renderToStaticMarkup(
      <HistorialDeConstancia
        folio="VEC-2026-000003"
        emitidaEn={new Date("2026-10-15T23:27:00Z")}
        canceladaEn={null}
        motivoCancelacion={null}
      />,
    );

    expect(html).toContain("Historial del documento");
    expect(html).toContain("Constancia emitida");
    expect(html).toContain("15 oct 2026");
    expect(html).toContain("VEC-2026-000003");
    expect(html).not.toContain("Constancia cancelada");
  });

  it("una constancia cancelada suma el movimiento de cancelacion con su motivo", () => {
    const html = renderToStaticMarkup(
      <HistorialDeConstancia
        folio="VEC-2026-000003"
        emitidaEn={new Date("2026-10-15T23:27:00Z")}
        canceladaEn={new Date("2026-10-16T15:12:00Z")}
        motivoCancelacion="ERROR_DE_CAPTURA"
      />,
    );

    expect(html).toContain("Constancia emitida");
    expect(html).toContain("Constancia cancelada");
    expect(html).toContain("16 oct 2026");
    expect(html).toContain("Motivo: Error de captura");
    expect(html).not.toContain("ERROR_DE_CAPTURA");
  });
});
