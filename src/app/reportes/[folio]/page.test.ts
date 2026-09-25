import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Borde de `/reportes/[folio]`, calco de
 * `src/app/validar/[folio]/page.test.ts`: la fuga de datos ajenos a
 * `ConsultaDeReporte` se prueba sobre el markup renderizado, no sobre el
 * objeto que devuelve el mock -un mock que colara `descripcion` no se
 * detectaria de otra forma, porque nunca llegaria a comparar HTML contra
 * HTML.
 */
const leerCabeceras = vi.hoisted(() => vi.fn());
const limitarRitmoMock = vi.hoisted(() => vi.fn());
const exigirAyuntamientoMock = vi.hoisted(() => vi.fn());
const superficieActualMock = vi.hoisted(() => vi.fn());
const consultarFolioDeReporteMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({ headers: leerCabeceras }));
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/shared/auth/limitarRitmo", () => ({
  limitarRitmo: limitarRitmoMock,
}));
vi.mock("@/shared/tenancy/contexto", () => ({
  exigirAyuntamiento: exigirAyuntamientoMock,
  superficieActual: superficieActualMock,
}));
vi.mock("@/modules/reportes", () => ({
  consultarFolioDeReporte: consultarFolioDeReporteMock,
}));

const { default: PaginaDeConsultaDeReporte } = await import("./page");

const TENANT = "11111111-1111-1111-1111-111111111111";

const propsDe = (folio: string) => ({
  params: Promise.resolve({ folio }),
});

const htmlDe = async (folio: string) =>
  renderToStaticMarkup(await PaginaDeConsultaDeReporte(propsDe(folio)));

beforeEach(() => {
  vi.clearAllMocks();
  leerCabeceras.mockResolvedValue({
    get: () => "189.203.10.7",
  });
  superficieActualMock.mockResolvedValue("ayuntamiento");
  exigirAyuntamientoMock.mockResolvedValue({ id: TENANT });
  limitarRitmoMock.mockResolvedValue(undefined);
});

describe("guarda de superficie en /reportes/[folio]", () => {
  it("superficie distinta de ayuntamiento: notFound() sin invocar el caso de uso", async () => {
    superficieActualMock.mockResolvedValue("raiz");
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(
      PaginaDeConsultaDeReporte(propsDe("REP-2026-000001")),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(consultarFolioDeReporteMock).not.toHaveBeenCalled();
  });
});

describe("200 siempre en /reportes/[folio], nunca notFound() por folio", () => {
  it.each([
    ["folio inexistente", "REP-2026-999999"],
    ["folio de otro municipio", "REP-2026-000001"],
    ["folio mal escrito", "no-es-un-folio"],
  ])("%s: renderiza sin notFound()", async (_caso, folio) => {
    consultarFolioDeReporteMock.mockResolvedValue({
      resultado: "SIN_REGISTRO",
    });

    const html = await htmlDe(folio);

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(html).toContain(folio);
  });
});

describe("fuga de datos en el HTML de /reportes/[folio]", () => {
  it("ningun folio ajeno, descripcion, ubicacion ni area en el markup", async () => {
    // El mock cuela campos que `ConsultaDeReporte` no declara -simula una
    // implementacion que hiciera `{...resultado}` a ciegas- para que la
    // assertion sea sobre lo que efectivamente se renderiza, no sobre el
    // tipo del objeto (que ya cierra esto en tiempo de compilacion).
    consultarFolioDeReporteMock.mockResolvedValue({
      resultado: "REGISTRADO",
      tipo: "BACHE",
      estado: "EN_ATENCION",
      registradoEn: "2026-08-28T10:00:00.000Z",
      actualizadoEn: "2026-08-28T11:00:00.000Z",
      folioOriginal: "REP-2026-000001",
      descripcion: "Bache enorme junto al mercado",
      ubicacion: "Calle 20 x 15, Motul",
      areaResponsable: "OBRAS_PUBLICAS",
    });

    const html = await htmlDe("REP-2026-000002");

    expect(html).not.toContain("REP-2026-000001");
    expect(html).not.toContain("Bache enorme junto al mercado");
    expect(html).not.toContain("Calle 20 x 15, Motul");
    expect(html).not.toContain("OBRAS_PUBLICAS");
  });
});
