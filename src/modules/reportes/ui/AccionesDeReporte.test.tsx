import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions/cambiarEstadoAction", () => ({
  cambiarEstadoAction: "estado-action",
}));
vi.mock("./actions/asignarAreaAction", () => ({
  asignarAreaAction: "area-action",
}));

const { AccionesDeReporte } = await import("./AccionesDeReporte");

describe("AccionesDeReporte", () => {
  const pagina = renderToStaticMarkup(
    <AccionesDeReporte
      reporteId="11111111-1111-4111-8111-111111111111"
      estadoActual="RECIBIDO"
    />,
  );

  it("ofrece motivos de rechazo con etiqueta y el codigo como valor", () => {
    expect(pagina).toContain(
      '<option value="FUERA_DE_COMPETENCIA">Fuera de competencia</option>',
    );
    expect(pagina).toContain(
      '<option value="INFORMACION_INSUFICIENTE">Información insuficiente</option>',
    );
  });

  it("ofrece areas con etiqueta y el codigo como valor", () => {
    expect(pagina).toContain(
      '<option value="LIMPIA_Y_RECOLECCION">Limpia y recolección</option>',
    );
  });
});
