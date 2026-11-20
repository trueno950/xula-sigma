import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S16 (P1) de `intervenciones-ux`: la vuelta de «Programar obra» lleva el id
 * de la obra creada en `?obra=`, y ese id sale del caso de uso, nunca del
 * formulario. Va en su archivo porque `programarObraAction.test.ts` cubre la
 * redaccion de errores y ya roza el limite de 200 lineas.
 */
const redirectMock = vi.hoisted(() =>
  vi.fn((_url?: string): never => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const contextoActualMock = vi.hoisted(() => vi.fn());
const programarMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
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

const redireccion = () => redirectMock.mock.calls[0]?.[0] as string;

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
  contextoActualMock.mockResolvedValue(contexto);
  programarMock.mockResolvedValue(OBRA);
});

describe("programarObraAction, la confirmacion de la vuelta", () => {
  it("vuelve con el id de la obra que creo el caso de uso", async () => {
    programarMock.mockResolvedValue("77777777-7777-4777-8777-777777777777");

    await expect(programarObraAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(redirectMock).toHaveBeenLastCalledWith(
      `/reportes/detalle/${REPORTE}?obra=77777777-7777-4777-8777-777777777777`,
    );
  });

  it("un obra enviada por el cliente no reemplaza a la creada", async () => {
    await expect(
      programarObraAction(
        formDataDe({ obra: "99999999-9999-4999-8999-999999999999" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redireccion()).toBe(`/reportes/detalle/${REPORTE}?obra=${OBRA}`);
  });

  it("no confirma nada cuando el alta fallo", async () => {
    programarMock.mockRejectedValue(new Error("detalle interno"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(programarObraAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(redireccion()).not.toContain("obra=");
    consoleError.mockRestore();
  });
});
