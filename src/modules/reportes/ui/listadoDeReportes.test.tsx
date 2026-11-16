import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { estadoDeLista } from "@/shared/ui";
import type { ReporteGuardado } from "../application/puertos";
import { comoReporteId, componerConteos } from "../domain";
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

const LUGAR = "22222222-2222-4222-8222-222222222222";

const LUGARES = [
  { valor: LUGAR, etiqueta: "Comisaría de Kinchil (comisaría)" },
] as const;

const conteos = (total: number) =>
  componerConteos({
    porEstado: total === 0 ? [] : [{ estado: "EN_ATENCION", conteo: total }],
    porArea: total === 0 ? [] : [{ area: "OBRAS_PUBLICAS", conteo: total }],
  });

const html = (
  reportes: readonly ReporteGuardado[],
  extras: {
    soloAtrasados?: boolean;
    filtros?: Parameters<typeof ListadoDeReportes>[0]["filtros"];
  } = {},
) =>
  renderToStaticMarkup(
    <ListadoDeReportes
      reportes={reportes}
      hayMas={false}
      estadoDeLista={estadoDeLista({ total: reportes.length })}
      filtros={extras.filtros ?? {}}
      umbral={7}
      hoy="2026-03-11"
      lugares={LUGARES}
      conteos={conteos(reportes.length)}
      {...(extras.soloAtrasados === undefined
        ? {}
        : { soloAtrasados: extras.soloAtrasados })}
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

describe("ListadoDeReportes, atraso configurable (S1)", () => {
  const recibidoHace = (dias: number) =>
    reporte({
      estado: "RECIBIDO",
      // 18:00 UTC son las 12:00 en Merida del mismo dia civil.
      registradoEn: new Date(
        Date.parse("2026-03-11T18:00:00Z") - dias * 86_400_000,
      ),
    });

  it("un reporte RECIBIDO que cumplio el umbral lleva la insignia con sus dias", () => {
    expect(html([recibidoHace(10)])).toContain("Atrasado · 10 días");
  });

  it("exactamente 7 dias ya es atraso; 6 todavia no", () => {
    expect(html([recibidoHace(7)])).toContain("Atrasado · 7 días");
    expect(html([recibidoHace(6)])).not.toContain("Atrasado");
  });

  it("un reporte ya atendido no lleva insignia aunque tenga meses", () => {
    const pagina = html([
      reporte({
        estado: "EN_ATENCION",
        registradoEn: new Date("2025-01-01T18:00:00Z"),
      }),
    ]);

    expect(pagina).not.toContain("Atrasado");
  });

  it("el formulario de filtros ofrece «solo atrasados» y lo deja marcado", () => {
    expect(html([recibidoHace(10)])).toContain('name="atrasados"');

    const conFiltro = html([recibidoHace(10)], { soloAtrasados: true });
    expect(conFiltro).toContain("Solo atrasados");
    expect(conFiltro).toMatch(
      /<input(?=[^>]*name="atrasados")(?=[^>]*checked)[^>]*>/,
    );
  });
});

describe("ListadoDeReportes, filtros por lugar y área (S2)", () => {
  it("ofrece el catalogo de lugares del municipio como opciones del select", () => {
    const pagina = html([reporte({})]);

    expect(pagina).toContain('name="lugar"');
    expect(pagina).toContain(`<option value="${LUGAR}">`);
    expect(pagina).toContain("Comisaría de Kinchil (comisaría)");
  });

  it("ofrece las áreas responsables con su etiqueta y el código como valor", () => {
    const pagina = html([reporte({})]);

    expect(pagina).toContain('name="area"');
    expect(pagina).toContain('<option value="OBRAS_PUBLICAS">Obras públicas');
  });

  it("cada filtro puesto se lee en su chip, y quitar uno conserva el otro", () => {
    const pagina = html([reporte({})], {
      filtros: { lugar: LUGAR, area: "OBRAS_PUBLICAS" },
    });

    expect(pagina).toContain("Lugar: Comisaría de Kinchil (comisaría)");
    expect(pagina).toContain("Área: Obras públicas");
    expect(pagina).toContain(`href="/reportes?area=OBRAS_PUBLICAS"`);
    expect(pagina).toContain(`href="/reportes?lugar=${LUGAR}"`);
  });

  it("los conteos de los filtros elegidos van arriba de la tabla", () => {
    const pagina = html([reporte({}), reporte({})]);

    expect(pagina).toContain('aria-label="Conteos de reportes"');
    expect(pagina).toContain('aria-label="Conteo por estado"');
  });
});
