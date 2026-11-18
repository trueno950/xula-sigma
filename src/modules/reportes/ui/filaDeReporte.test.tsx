import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReporteDeBandeja } from "../application/puertosDeUbicacionesDeReporte";
import { comoReporteId } from "../domain";
import { FilaDeReporte } from "./FilaDeReporte";

const textoPlano = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const reporte = (
  parcial: Partial<ReporteDeBandeja> = {},
): ReporteDeBandeja => ({
  id: comoReporteId("11111111-1111-4111-8111-111111111111"),
  folio: "REP-2026-000152",
  tipo: "BACHE",
  estado: "RECIBIDO",
  areaResponsable: "OBRAS_PUBLICAS",
  lugarId: "22222222-2222-4222-8222-222222222222",
  calleId: "33333333-3333-4333-8333-333333333333",
  referencia: null,
  descripcion: "Bache frente al parque",
  personaId: null,
  motivoDeRechazo: null,
  duplicadoDeReporteId: null,
  registradoPorUsuarioId: "usuario-1",
  // 18:00 UTC son las 12:00 en Merida del mismo dia civil.
  registradoEn: new Date("2026-11-12T18:00:00Z"),
  actualizadoEn: new Date("2026-11-12T18:00:00Z"),
  ubicacion: {
    modo: "CALLE",
    lugar: "Motul",
    calleId: "33333333-3333-4333-8333-333333333333",
    calle: "Calle 26 x 31 y 33",
    domicilio: null,
    raizId: "44444444-4444-4444-8444-444444444444",
  },
  ...parcial,
});

const html = (
  parcial: Partial<ReporteDeBandeja> = {},
  atraso: number | null = null,
) =>
  renderToStaticMarkup(
    <FilaDeReporte reporte={reporte(parcial)} atraso={atraso} />,
  );

describe("FilaDeReporte, dónde ocurrió (S4)", () => {
  it("un reporte capturado por calle dice el lugar y la calle", () => {
    const texto = textoPlano(html());

    expect(texto).toContain("Motul · Calle 26 x 31 y 33");
  });

  it("un reporte capturado por domicilio lo dice, y no inventa una calle", () => {
    const texto = textoPlano(
      html({
        ubicacion: {
          modo: "DOMICILIO",
          lugar: "Motul",
          calleId: null,
          calle: null,
          domicilio: "Calle 14 #203",
          raizId: "44444444-4444-4444-8444-444444444444",
        },
      }),
    );

    expect(texto).toContain("Motul · Domicilio registrado: Calle 14 #203");
  });

  it("sin nombre de lugar la fila se queda con lo que sí tiene", () => {
    const texto = textoPlano(
      html({
        ubicacion: {
          modo: "CALLE",
          lugar: null,
          calleId: "33333333-3333-4333-8333-333333333333",
          calle: "Calle 8 x 10",
          domicilio: null,
          raizId: null,
        },
      }),
    );

    expect(texto).toContain("Calle 8 x 10");
    expect(texto).not.toContain("Sin ubicación");
  });
});

describe("FilaDeReporte, estado con su atraso en el mismo renglón (S6)", () => {
  it("el atraso acompaña a la insignia del estado y no agrega un renglón aparte", () => {
    const pagina = html({}, 15);

    expect(pagina).toContain("Recibido");
    expect(pagina).toContain("Atrasado · 15 días");
    // La celda de estado es una sola: insignia y atraso adentro del mismo span.
    expect(pagina).toMatch(
      /Recibido<\/span><\/span><span class="flex"><span class="inline-flex[^"]*bg-senial-error-suave[^"]*"/,
    );
  });

  it("un reporte sin atraso no lleva la insignia", () => {
    const pagina = html({}, null);

    expect(pagina).not.toContain("Atrasado");
  });
});

describe("FilaDeReporte, la fila del teléfono (S1, S6)", () => {
  it("la fila entera enlaza al detalle y se anuncia con todos sus datos", () => {
    const pagina = html({}, 15);

    expect(pagina).toContain(
      'href="/reportes/detalle/11111111-1111-4111-8111-111111111111"',
    );
    expect(pagina).toMatch(
      /aria-label="[^"]*REP-2026-000152[^"]*Bache[^"]*Motul, Calle 26 x 31 y 33/,
    );
  });

  it("el nombre accesible de la fila dice el estado del reporte", () => {
    const pagina = html({}, 15);

    expect(pagina).toMatch(/aria-label="[^"]*REP-2026-000152 · Recibido ·/);
  });

  it("la versión compacta lleva folio y estado, tipo y ubicación, y fecha con atraso", () => {
    const texto = textoPlano(html({}, 15));

    expect(texto).toContain("REP-2026-000152");
    expect(texto).toContain("Bache ·");
    expect(texto).toContain("12 nov 2026");
    expect(texto).toContain("Atrasado · 15 días");
  });
});
