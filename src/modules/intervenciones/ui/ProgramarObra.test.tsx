import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgramarObra } from "./ProgramarObra";

const REPORTE = "55555555-5555-4555-8555-555555555555";
const tipos = [
  { valor: "BACHE", etiqueta: "Bache" },
  { valor: "PAVIMENTACION", etiqueta: "Pavimentación" },
];

describe("ProgramarObra", () => {
  it("es un formulario nativo sin isla cliente, con el tipo y la descripcion", () => {
    const html = renderToStaticMarkup(
      <ProgramarObra reporteId={REPORTE} tipos={tipos} />,
    );

    expect(html).toContain("<form");
    expect(html).toContain('type="submit"');
    expect(html).toContain(`value="${REPORTE}"`);
    expect(html).toContain("Tipo de obra");
    expect(html).toContain(">Pavimentación</option>");
    expect(html).toContain("Descripción del trabajo");
    expect(html).toContain("No anote nombres, teléfonos ni datos de vecinos.");
    expect(html).toContain("Programar obra");
  });

  it("no pide la ubicacion: se copia del reporte", () => {
    const html = renderToStaticMarkup(
      <ProgramarObra reporteId={REPORTE} tipos={tipos} />,
    );

    expect(html).not.toContain('name="lugarId"');
    expect(html).not.toContain('name="calleId"');
    expect(html).not.toContain('name="ayuntamientoId"');
  });
});
