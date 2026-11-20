import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ObraDeReporte } from "../application/obrasDeReporte";
import { comoIntervencionId } from "../domain";
import { ProgramarObra } from "./ProgramarObra";

const REPORTE = "55555555-5555-4555-8555-555555555555";
const tipos = [
  { valor: "BACHE", etiqueta: "Bache" },
  { valor: "PAVIMENTACION", etiqueta: "Pavimentación" },
];

const OBRA: ObraDeReporte = {
  id: comoIntervencionId("33333333-3333-4333-8333-333333333333"),
  tipo: "BACHE",
  estado: "PLANIFICADA",
  fechaDeOcurrencia: "2026-11-20",
};
const OTRA_OBRA: ObraDeReporte = {
  ...OBRA,
  id: comoIntervencionId("44444444-4444-4444-8444-444444444444"),
  tipo: "PAVIMENTACION",
};

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

  it("suelto conserva su tarjeta y su titulo, como en Intervenciones", () => {
    const html = renderToStaticMarkup(
      <ProgramarObra reporteId={REPORTE} tipos={tipos} />,
    );

    expect(html).toContain("Obra a programar");
    expect(html).toContain("shadow-reposo");
  });

  /**
   * S14 de `reportes-ux`: dentro del panel de acciones el desplegable ya dice
   * «Programar obra», asi que la tarjeta y el titulo se repetian dos veces.
   */
  it("embebido no repite la tarjeta ni el titulo del panel que lo contiene", () => {
    const html = renderToStaticMarkup(
      <ProgramarObra reporteId={REPORTE} tipos={tipos} embebido />,
    );

    expect(html).not.toContain("Obra a programar");
    expect(html).not.toContain("shadow-reposo");
    expect(html).toContain("Tipo de obra");
    expect(html).toContain("Descripción del trabajo");
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

  /**
   * S17 (P2): el formulario dice que la fecha sera hoy y que el lugar se
   * copia del reporte, antes de escribir, no despues de guardar.
   */
  it.each([
    ["suelto", false],
    ["embebido", true],
  ])("%s explica la fecha de hoy y el lugar copiado", (_caso, embebido) => {
    const html = renderToStaticMarkup(
      <ProgramarObra reporteId={REPORTE} tipos={tipos} embebido={embebido} />,
    );

    expect(html).toContain(
      "La fecha de la obra será hoy y el lugar se copia del reporte.",
    );
  });

  /**
   * S16 (P1): con obra programada, el panel muestra la que existe -enlaces
   * arriba- y deja el formulario disponible abajo: S16 pide mostrarla, no
   * prohibir una segunda obra sobre el mismo reporte.
   */
  it("con una obra programada la enlaza arriba y deja el formulario abajo", () => {
    const html = renderToStaticMarkup(
      <ProgramarObra
        reporteId={REPORTE}
        tipos={tipos}
        obras={[OBRA]}
        embebido
      />,
    );

    expect(html).toContain("Este reporte ya tiene una obra programada.");
    expect(html).toContain(`href="/intervenciones/${OBRA.id}"`);
    expect(html).toContain("Ver la obra");
    expect(html).toContain("<form");
    expect(html).toContain("Descripción del trabajo");
    expect(html).toContain("Tipo de obra");
    expect(html.indexOf("Ver la obra")).toBeLessThan(
      html.indexOf("Tipo de obra"),
    );
  });

  it("con dos obras las distingue por tipo y enlaza a cada una", () => {
    const html = renderToStaticMarkup(
      <ProgramarObra
        reporteId={REPORTE}
        tipos={tipos}
        obras={[OBRA, OTRA_OBRA]}
        embebido
      />,
    );

    expect(html).toContain("Este reporte ya tiene obras programadas.");
    expect(html).toContain(`href="/intervenciones/${OBRA.id}"`);
    expect(html).toContain(`href="/intervenciones/${OTRA_OBRA.id}"`);
    expect(html).toContain("Ver la obra (Bache)");
    expect(html).toContain("Ver la obra (Pavimentación)");
    expect(html).toContain("<form");
  });

  it("sin obras programadas el formulario sigue ahi", () => {
    const html = renderToStaticMarkup(
      <ProgramarObra reporteId={REPORTE} tipos={tipos} obras={[]} embebido />,
    );

    expect(html).toContain("<form");
    expect(html).toContain("Descripción del trabajo");
    expect(html).not.toContain("Ver la obra");
  });
});
