import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NoAutorizadoError,
  NoEncontradoError,
  TenantNoResueltoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { ReporteNoProgramableError } from "../../domain";

const redirectMock = vi.hoisted(() =>
  vi.fn((_url?: string): never => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const revalidatePathMock = vi.hoisted(() => vi.fn());
const contextoActualMock = vi.hoisted(() => vi.fn());
const programarMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  programarObraDeReporte: programarMock,
}));

const { programarObraAction } = await import("./programarObraAction");

const REPORTE = "55555555-5555-4555-8555-555555555555";
const OBRA = "33333333-3333-4333-8333-333333333333";

const contexto = {
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" as const },
  origen: "web",
};

const formDataDe = (campos: Record<string, string> = {}) => {
  const formData = new FormData();
  const base: Record<string, string> = {
    reporteId: REPORTE,
    tipo: "BACHE",
    descripcion: "Bacheo de la calle frente al parque",
    ...campos,
  };
  for (const [clave, valor] of Object.entries(base)) {
    formData.set(clave, valor);
  }
  return formData;
};

const redireccion = () =>
  decodeURIComponent(redirectMock.mock.calls[0]?.[0] as string);

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
  contextoActualMock.mockResolvedValue(contexto);
  programarMock.mockResolvedValue(OBRA);
});

describe("programarObraAction", () => {
  it("programa la obra y vuelve al reporte, ya en atencion", async () => {
    await expect(programarObraAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(programarMock).toHaveBeenCalledWith(
      {
        reporteId: REPORTE,
        tipo: "BACHE",
        descripcion: "Bacheo de la calle frente al parque",
      },
      contexto,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/reportes/detalle/${REPORTE}`,
    );
    expect(redirectMock).toHaveBeenLastCalledWith(
      `/reportes/detalle/${REPORTE}?obra=${OBRA}`,
    );
  });

  it.each([
    ["un tipo fuera del catalogo", { tipo: "BACHES" }],
    ["una descripcion corta", { descripcion: "bacheo" }],
  ])("rechaza %s sin programar y vuelve al reporte", async (_caso, campos) => {
    await expect(programarObraAction(formDataDe(campos))).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(programarMock).not.toHaveBeenCalled();
    expect(redireccion()).toBe(
      `/reportes/detalle/${REPORTE}?error=Revise los datos de la obra.`,
    );
  });

  it("un reporte que no es uuid no tiene detalle al que volver", async () => {
    await expect(
      programarObraAction(formDataDe({ reporteId: "reporte-1" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(programarMock).not.toHaveBeenCalled();
    expect(redireccion()).toBe("/reportes?error=Revise los datos de la obra.");
  });

  it("ignora un ayuntamiento enviado por el cliente y usa el del contexto", async () => {
    await expect(
      programarObraAction(
        formDataDe({ ayuntamientoId: "99999999-9999-4999-8999-999999999999" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    const [entrada, contextoUsado] = programarMock.mock.calls[0] ?? [];
    expect(entrada).not.toHaveProperty("ayuntamientoId");
    expect(contextoUsado).toEqual(contexto);
    expect(JSON.stringify(entrada)).not.toContain("99999999");
  });

  it.each([
    [
      "un reporte cerrado",
      new ReporteNoProgramableError(),
      "El reporte ya está cerrado; no se puede programar obra sobre él.",
    ],
    [
      "un reporte de otro municipio",
      new NoEncontradoError("interno"),
      "Ese reporte no existe.",
    ],
    [
      "un rol sin permiso",
      new NoAutorizadoError(),
      "No tiene permiso para esta operación.",
    ],
    [
      "una validacion del caso de uso",
      new ValidacionError({}, "Datos de la obra invalidos."),
      "Datos de la obra invalidos.",
    ],
  ])("redacta %s para la operadora", async (_caso, error, mensaje) => {
    programarMock.mockRejectedValue(error);

    await expect(programarObraAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(redireccion()).toBe(`/reportes/detalle/${REPORTE}?error=${mensaje}`);
  });

  it("no filtra el texto de un fallo desconocido", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    programarMock.mockRejectedValue(new Error("detalle interno del reporte"));

    await expect(programarObraAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(redireccion()).toBe(
      `/reportes/detalle/${REPORTE}?error=No se pudo programar la obra. Intente de nuevo.`,
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "detalle interno",
    );
    consoleError.mockRestore();
  });

  it("redacta un fallo al resolver el tenant", async () => {
    contextoActualMock.mockRejectedValue(new TenantNoResueltoError("secreto"));

    await expect(programarObraAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(redireccion()).toBe(
      `/reportes/detalle/${REPORTE}?error=No se pudo determinar el ayuntamiento del acceso.`,
    );
  });

  it("manda al acceso sin sesion, sin programar", async () => {
    contextoActualMock.mockResolvedValue(null);

    await expect(programarObraAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(programarMock).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenLastCalledWith("/acceso");
  });
});
