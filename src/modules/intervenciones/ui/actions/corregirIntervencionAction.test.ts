import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NoAutorizadoError,
  NoEncontradoError,
  TenantNoResueltoError,
  ValidacionError,
} from "@/shared/lib/errores";

const redirectMock = vi.hoisted(() =>
  vi.fn((_url?: string): never => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const revalidatePathMock = vi.hoisted(() => vi.fn());
const contextoActualMock = vi.hoisted(() => vi.fn());
const corregirMock = vi.hoisted(() => vi.fn());
const intervencionPorIdMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  corregirIntervencion: corregirMock,
  intervencionPorId: intervencionPorIdMock,
}));

const { corregirIntervencionAction } = await import(
  "./corregirIntervencionAction"
);

const ID = "33333333-3333-4333-8333-333333333333";
const contexto = {
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" as const },
  origen: "web",
};

const intervencionActual = {
  id: ID,
  tipo: "OBRA" as const,
  estado: "PLANIFICADA" as const,
  fechaDeOcurrencia: "2026-01-15",
  lugarId: "44444444-4444-4444-8444-444444444444",
  calleId: "55555555-5555-4555-8555-555555555555",
  reporteId: "66666666-6666-4666-8666-666666666666",
  descripcion: "Descripcion original de la obra",
  registradoPorUsuarioId: "usuario-1",
  capturadoEn: new Date("2026-03-01T12:00:00Z"),
  actualizadoEn: new Date("2026-03-01T12:00:00Z"),
};

const formDataDe = (descripcion = "Descripcion corregida de la obra") => {
  const formData = new FormData();
  formData.set("id", ID);
  formData.set("descripcion", descripcion);
  return formData;
};

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
  contextoActualMock.mockResolvedValue(contexto);
  intervencionPorIdMock.mockResolvedValue(intervencionActual);
});

describe("corregirIntervencionAction", () => {
  it("rechaza datos invalidos sin invocar el caso de uso", async () => {
    await expect(
      corregirIntervencionAction(formDataDe("corta")),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(corregirMock).not.toHaveBeenCalled();
    expect(redirectMock.mock.calls[0]?.[0]).toContain("error=");
  });

  it("ignora metadata manipulada y corrige con la version del servidor", async () => {
    corregirMock.mockResolvedValue(undefined);
    const formData = formDataDe();
    formData.set("tipo", "FUGA");
    formData.set("fechaDeOcurrencia", "2027-12-31");
    formData.set("lugarId", "88888888-8888-4888-8888-888888888888");
    formData.set("calleId", "66666666-6666-4666-8666-666666666666");
    formData.set("reporteId", "77777777-7777-4777-8777-777777777777");

    await expect(corregirIntervencionAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(intervencionPorIdMock).toHaveBeenCalledWith(ID, contexto);
    expect(corregirMock).toHaveBeenCalledWith(
      {
        id: ID,
        tipo: "OBRA",
        fechaDeOcurrencia: "2026-01-15",
        lugarId: "44444444-4444-4444-8444-444444444444",
        calleId: "55555555-5555-4555-8555-555555555555",
        reporteId: "66666666-6666-4666-8666-666666666666",
        descripcion: "Descripcion corregida de la obra",
      },
      contexto,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(`/intervenciones/${ID}`);
    expect(redirectMock).toHaveBeenLastCalledWith(`/intervenciones/${ID}`);
  });

  it("traduce una intervencion invisible a un mensaje de no encontrado", async () => {
    corregirMock.mockRejectedValue(new NoEncontradoError("detalle interno"));

    await expect(corregirIntervencionAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(decodeURIComponent(redirectMock.mock.calls[0]?.[0] as string)).toBe(
      `/intervenciones/${ID}?error=Esa intervención no existe.`,
    );
  });

  it.each([
    [
      "autorizacion",
      new NoAutorizadoError(),
      "No tiene permiso para esta operación.",
    ],
    [
      "validacion",
      new ValidacionError({}, "La correccion no contiene datos validos."),
      "La correccion no contiene datos validos.",
    ],
  ])(
    "mapea el error de %s al mensaje del operador",
    async (_caso, error, mensaje) => {
      corregirMock.mockRejectedValue(error);

      await expect(corregirIntervencionAction(formDataDe())).rejects.toThrow(
        "NEXT_REDIRECT",
      );

      expect(
        decodeURIComponent(redirectMock.mock.calls[0]?.[0] as string),
      ).toBe(`/intervenciones/${ID}?error=${mensaje}`);
    },
  );

  it("redacta un fallo al resolver el tenant", async () => {
    contextoActualMock.mockRejectedValue(new TenantNoResueltoError("secreto"));

    await expect(corregirIntervencionAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(decodeURIComponent(redirectMock.mock.calls[0]?.[0] as string)).toBe(
      `/intervenciones/${ID}?error=No se pudo determinar el ayuntamiento del acceso.`,
    );
  });

  it("usa un mensaje generico y conserva un log seguro ante un error desconocido", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const secreto = "detalle interno de la fila";
    corregirMock.mockRejectedValue(new Error(secreto));

    await expect(corregirIntervencionAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(decodeURIComponent(redirectMock.mock.calls[0]?.[0] as string)).toBe(
      `/intervenciones/${ID}?error=No se pudo corregir la intervención. Intente de nuevo.`,
    );
    expect(consoleError).toHaveBeenCalledWith(
      "[intervenciones] correccion fallo",
      expect.objectContaining({ campos: { name: "Error" } }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(secreto);
    consoleError.mockRestore();
  });
});
