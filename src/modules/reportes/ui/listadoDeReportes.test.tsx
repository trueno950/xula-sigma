import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { estadoDeLista } from "@/shared/ui";
import type { ReporteDeBandeja } from "../application/puertosDeUbicacionesDeReporte";
import { comoReporteId, componerConteos } from "../domain";
import { ListadoDeReportes } from "./ListadoDeReportes";

const textoPlano = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const reporte = (parcial: Partial<ReporteDeBandeja>): ReporteDeBandeja => ({
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
  ubicacion: {
    modo: "CALLE",
    lugar: "Motul",
    calleId: "33333333-3333-4333-8333-333333333333",
    calle: "Calle 26 x 31 y 33",
    domicilio: null,
    raizId: null,
  },
  ...parcial,
});

const LUGAR = "22222222-2222-4222-8222-222222222222";

const LUGARES = [{ valor: LUGAR, etiqueta: "Comisaría de Kinchil" }];

const conteos = (total: number) =>
  componerConteos({
    porEstado: [{ estado: "EN_ATENCION", conteo: total }],
    porArea: [{ area: "OBRAS_PUBLICAS", conteo: total }],
  });

type Props = Parameters<typeof ListadoDeReportes>[0];
/** `total` es el del listado con sus filtros puestos: el de la pestaña. */
type Extras = Partial<Props> & { total?: number };

const html = (reportes: readonly ReporteDeBandeja[], extras: Extras = {}) =>
  renderToStaticMarkup(
    <ListadoDeReportes
      reportes={reportes}
      hayMas={false}
      estadoDeLista={estadoDeLista({ total: reportes.length })}
      filtros={extras.filtros ?? {}}
      umbral={7}
      hoy="2026-03-11"
      lugares={LUGARES}
      conteosPorEstado={conteos(extras.total ?? reportes.length)}
      conteosPorArea={conteos(reportes.length)}
      totalDeAtrasados={3}
      q={extras.q}
      soloAtrasados={extras.soloAtrasados ?? false}
    />,
  );

describe("ListadoDeReportes", () => {
  it("muestra tipo, estado y area como texto legible, con su ubicación", () => {
    const pagina = html([reporte({})]);
    const texto = textoPlano(pagina);

    expect(pagina).toContain(">Alumbrado<");
    expect(pagina).toContain(">En atención<");
    expect(pagina).toContain(">Obras públicas<");
    expect(pagina).not.toContain(">OBRAS_PUBLICAS<");
    expect(pagina).not.toContain(">EN_ATENCION<");
    expect(texto).toContain("Ubicación");
    expect(texto).toContain("Motul · Calle 26 x 31 y 33");
    expect(pagina).toContain('<option value="ALUMBRADO">Alumbrado</option>');
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

  it("«solo atrasados» se enciende en la banda y se puede quitar como chip", () => {
    const conFiltro = html([recibidoHace(10)], { soloAtrasados: true });

    expect(conFiltro).toContain('aria-pressed="true"');
    expect(conFiltro).toContain("Solo atrasados");
    expect(conFiltro).toContain("Quitar filtro: Solo atrasados");
  });
});

describe("ListadoDeReportes, filtros por lugar y área (S2)", () => {
  it("ofrece el catalogo de lugares del municipio como opciones del select", () => {
    const pagina = html([reporte({})]);

    expect(pagina).toContain('name="lugar"');
    expect(pagina).toContain(`<option value="${LUGAR}">`);
    expect(pagina).toContain("Comisaría de Kinchil");
  });

  it("cada opción de área lleva el conteo de los otros filtros puestos", () => {
    const pagina = html([reporte({})]);

    expect(pagina).toContain('name="area"');
    expect(pagina).toContain(
      '<option value="OBRAS_PUBLICAS">Obras públicas (1)',
    );
  });

  it("cada filtro puesto se lee en su chip, y quitar uno conserva el otro", () => {
    const pagina = html([reporte({})], {
      filtros: { lugar: LUGAR, area: "OBRAS_PUBLICAS" },
    });

    expect(pagina).toContain("Lugar: Comisaría de Kinchil");
    expect(pagina).toContain("Área: Obras públicas");
    expect(pagina).toContain(`href="/reportes?area=OBRAS_PUBLICAS"`);
    expect(pagina).toContain(`href="/reportes?lugar=${LUGAR}"`);
  });
});

describe("ListadoDeReportes, la banda de conteos sustituye la tarjeta (S2, S3)", () => {
  it("los números viven en las pestañas y en Área, y el pie dice cuántos son", () => {
    const pagina = html([reporte({}), reporte({})], { total: 5 });
    const texto = textoPlano(pagina);

    expect(pagina).not.toContain("Conteos de reportes");
    expect(pagina).toContain('aria-label="Estado del reporte"');
    expect(texto).toContain("Solo atrasados 3");
    expect(texto).toContain("Mostrando 1–2 de 5 reportes");
  });

  it("el estado no se repite como chip: vive en las pestañas, y los filtros se pliegan", () => {
    const pagina = html([reporte({})], {
      filtros: {
        estado: "EN_ATENCION",
        tipo: "ALUMBRADO",
        area: "OBRAS_PUBLICAS",
      },
      q: "calle",
      soloAtrasados: true,
    });

    expect(textoPlano(pagina)).toContain("Filtros (4)");
    expect(pagina).not.toContain("Quitar filtro: Estado:");
    expect(pagina).toContain("Quitar filtro: Tipo: Alumbrado");
    expect(pagina).toMatch(
      /<a(?=[^>]*href="\/reportes\?[^"]*estado=EN_ATENCION)(?=[^>]*aria-current="page")[^>]*>/,
    );
  });
});
