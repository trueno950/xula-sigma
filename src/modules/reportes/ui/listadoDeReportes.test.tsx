import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { estadoDeLista } from "@/shared/ui";
import type { ReporteGuardado } from "../application/puertos";
import { comoReporteId } from "../domain";
import { ListadoDeReportes } from "./ListadoDeReportes";

const reporte = (parcial: Partial<ReporteGuardado>): ReporteGuardado => ({
  id: comoReporteId("11111111-1111-4111-8111-111111111111"),
  folio: "REP-2026-000001",
  tipo: "ALUMBRADO",
  estado: "EN_ATENCION",
  areaResponsable: "OBRAS_PUBLICAS",
  lugarId: "22222222-2222-4222-8222-222222222222",
  calleId: null,
  referencia: null,
  descripcion: "Luminaria apagada frente al parque",
  personaId: null,
  motivoDeRechazo: null,
  duplicadoDeReporteId: null,
  registradoPorUsuarioId: "usuario-1",
  registradoEn: new Date("2026-03-01T18:00:00Z"),
  actualizadoEn: new Date("2026-03-01T18:00:00Z"),
  ...parcial,
});

const html = (reportes: readonly ReporteGuardado[]) =>
  renderToStaticMarkup(
    <ListadoDeReportes
      reportes={reportes}
      hayMas={false}
      estadoDeLista={estadoDeLista({ total: reportes.length })}
      filtros={{}}
    />,
  );

describe("ListadoDeReportes", () => {
  it("muestra tipo, estado y area como texto legible, no como codigo", () => {
    const pagina = html([reporte({})]);

    expect(pagina).toContain(">Alumbrado<");
    expect(pagina).toContain(">En atención<");
    expect(pagina).toContain(">Obras públicas<");
    expect(pagina).not.toContain(">OBRAS_PUBLICAS<");
    expect(pagina).not.toContain(">EN_ATENCION<");
  });

  it("el estado sale en una insignia con icono y la palabra", () => {
    const pagina = html([reporte({ estado: "RESUELTO" })]);

    expect(pagina).toMatch(
      /bg-senial-exito-suave[^>]*><svg[^>]*>.*<\/svg>Resuelto</,
    );
  });

  it("un reporte sin area se lee igual para cualquier rol", () => {
    const pagina = html([reporte({ areaResponsable: null })]);

    expect(pagina).toContain(">Sin asignar<");
    expect(pagina).not.toContain(">—<");
  });

  it("los filtros ofrecen etiquetas y conservan el codigo como valor", () => {
    const pagina = html([reporte({})]);

    expect(pagina).toContain(
      '<option value="EN_ATENCION">En atención</option>',
    );
    expect(pagina).toContain('<option value="ALUMBRADO">Alumbrado</option>');
  });
});
