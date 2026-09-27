import { beforeEach, describe, expect, it, vi } from "vitest";
import { RitmoExcedidoError } from "@/shared/auth/ritmo";

/**
 * Borde de ritmo de `/reportes/[folio]`, calco de
 * `src/app/validar/[folio]/ritmo.test.ts`: el limitador corre ANTES que
 * `consultarFolioDeReporte`, con `invocationCallOrder`, y un
 * `RitmoExcedidoError` corta sin haber llamado al caso de uso. Razon del
 * nombre de archivo: tasks.md 6.3.
 */
const leerCabeceras = vi.hoisted(() => vi.fn());
const limitarRitmoMock = vi.hoisted(() => vi.fn());
const exigirAyuntamientoMock = vi.hoisted(() => vi.fn());
const consultarFolioDeReporteMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({ headers: leerCabeceras }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/shared/auth/limitarRitmo", () => ({
  limitarRitmo: limitarRitmoMock,
}));
vi.mock("@/shared/tenancy/contexto", () => ({
  exigirAyuntamiento: exigirAyuntamientoMock,
  superficieActual: vi.fn().mockResolvedValue("ayuntamiento"),
}));
vi.mock("@/modules/reportes", () => ({
  consultarFolioDeReporte: consultarFolioDeReporteMock,
}));

const { default: PaginaDeConsultaDeReporte } = await import("./page");

const TENANT = "11111111-1111-1111-1111-111111111111";
const IP = "189.203.10.7";

const propsDe = (folio: string) => ({ params: Promise.resolve({ folio }) });

describe("limitacion de ritmo en /reportes/[folio]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leerCabeceras.mockResolvedValue({ get: () => IP });
    exigirAyuntamientoMock.mockResolvedValue({ id: TENANT });
    limitarRitmoMock.mockResolvedValue(undefined);
    consultarFolioDeReporteMock.mockResolvedValue({
      resultado: "SIN_REGISTRO",
    });
  });

  it("el limitador corre antes que consultarFolioDeReporte", async () => {
    await PaginaDeConsultaDeReporte(propsDe("REP-2026-000001"));

    expect(limitarRitmoMock).toHaveBeenCalledTimes(1);
    expect(consultarFolioDeReporteMock).toHaveBeenCalledTimes(1);
    expect(limitarRitmoMock.mock.invocationCallOrder[0]).toBeLessThan(
      consultarFolioDeReporteMock.mock.invocationCallOrder[0] as number,
    );
  });

  it("RitmoExcedidoError corta antes de llamar a consultarFolioDeReporte", async () => {
    limitarRitmoMock.mockRejectedValue(new RitmoExcedidoError("folio"));

    await expect(
      PaginaDeConsultaDeReporte(propsDe("REP-2026-000001")),
    ).rejects.toThrow(RitmoExcedidoError);

    expect(consultarFolioDeReporteMock).not.toHaveBeenCalled();
  });

  it("la clave de la ventana es la IP, nunca el folio", async () => {
    // Dos folios distintos, misma IP: la misma clave de ventana las dos
    // veces -si la clave fuera el folio, cada numero de la serie
    // estrenaria su propia ventana y recorrerla saldria gratis.
    await PaginaDeConsultaDeReporte(propsDe("REP-2026-000001"));
    await PaginaDeConsultaDeReporte(propsDe("REP-2026-000002"));

    expect(limitarRitmoMock).toHaveBeenNthCalledWith(1, TENANT, [
      { tipo: "folio", valor: IP },
    ]);
    expect(limitarRitmoMock).toHaveBeenNthCalledWith(2, TENANT, [
      { tipo: "folio", valor: IP },
    ]);
  });
});
