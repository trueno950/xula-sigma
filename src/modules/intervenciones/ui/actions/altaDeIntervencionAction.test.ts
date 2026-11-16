import { beforeEach, describe, expect, it, vi } from "vitest";
import {
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
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  registrarIntervencion: registrarMock,
}));

const { altaDeIntervencionAction } = await import("./altaDeIntervencionAction");

const ID = "33333333-3333-4333-8333-333333333333";
const LUGAR = "22222222-2222-4222-8222-222222222222";
const CALLE = "44444444-4444-4444-8444-444444444444";

const contexto = (rol: "ADMIN_MUNICIPAL" | "OPERADOR" | "CONSULTA") => ({
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const formDataDe = (campos: Record<string, string> = {}) => {
  const formData = new FormData();
  const base: Record<string, string> = {
    tipo: "PAVIMENTACION",
    fechaDeOcurrencia: "2026-11-16",
    lugarId: LUGAR,
    calleId: CALLE,
    descripcion: "Pavimentacion de la calle 20 entre 15 y 17",
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
  contextoActualMock.mockResolvedValue(contexto("ADMIN_MUNICIPAL"));
  registrarMock.mockResolvedValue(ID);
});

describe("altaDeIntervencionAction", () => {
  it("registra con los campos del formulario y vuelve al detalle", async () => {
    await expect(altaDeIntervencionAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(registrarMock).toHaveBeenCalledWith(
      {
        tipo: "PAVIMENTACION",
        fechaDeOcurrencia: "2026-11-16",
        lugarId: LUGAR,
        calleId: CALLE,
        reporteId: null,
        descripcion: "Pavimentacion de la calle 20 entre 15 y 17",
      },
      contexto("ADMIN_MUNICIPAL"),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/intervenciones");
    expect(redirectMock).toHaveBeenLastCalledWith(`/intervenciones/${ID}`);
  });

  it("acepta la calle vacia como intervencion solo en el lugar", async () => {
    await expect(
      altaDeIntervencionAction(formDataDe({ calleId: "" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(registrarMock).toHaveBeenCalledWith(
      expect.objectContaining({ calleId: null }),
      contexto("ADMIN_MUNICIPAL"),
    );
  });

  it("ignora un ayuntamiento enviado por el cliente y usa el del contexto", async () => {
    await expect(
      altaDeIntervencionAction(
        formDataDe({ ayuntamientoId: "99999999-9999-4999-8999-999999999999" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    const [entrada, contextoUsado] = registrarMock.mock.calls[0] ?? [];
    expect(entrada).not.toHaveProperty("ayuntamientoId");
    expect(contextoUsado).toEqual(contexto("ADMIN_MUNICIPAL"));
    expect(JSON.stringify(entrada)).not.toContain("99999999");
  });

  it.each([
    ["un tipo fuera del catalogo", { tipo: "PAVIMENTO" }],
    ["una fecha que no es civil", { fechaDeOcurrencia: "16/11/2026" }],
    ["una ubicacion que no es uuid", { lugarId: "centro" }],
    ["una descripcion corta", { descripcion: "bache" }],
  ])("rechaza %s sin invocar el caso de uso", async (_caso, campos) => {
    await expect(altaDeIntervencionAction(formDataDe(campos))).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(registrarMock).not.toHaveBeenCalled();
    expect(redireccion()).toBe(
      "/intervenciones/alta?error=Revise los datos de la intervención.",
    );
  });

  it("niega a un rol que no administra intervenciones", async () => {
    contextoActualMock.mockResolvedValue(contexto("OPERADOR"));

    await expect(altaDeIntervencionAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(registrarMock).not.toHaveBeenCalled();
    expect(redireccion()).toBe(
      "/intervenciones/alta?error=No tiene permiso para esta operación.",
    );
  });

  it.each([
    ["un lugar de otro municipio", new NoEncontradoError("interno")],
    ["una validacion del caso de uso", new ValidacionError({}, "Datos mal.")],
  ])("redacta %s para la operadora", async (_caso, error) => {
    registrarMock.mockRejectedValue(error);

    await expect(altaDeIntervencionAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(redireccion()).toContain("/intervenciones/alta?error=");
  });

  it("no filtra el texto de un fallo desconocido", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    registrarMock.mockRejectedValue(new Error("detalle interno de la fila"));

    await expect(altaDeIntervencionAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(redireccion()).toBe(
      "/intervenciones/alta?error=No se pudo registrar la intervención. Intente de nuevo.",
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "detalle interno",
    );
    consoleError.mockRestore();
  });

  it("redacta un fallo al resolver el tenant", async () => {
    contextoActualMock.mockRejectedValue(new TenantNoResueltoError("secreto"));

    await expect(altaDeIntervencionAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(redireccion()).toBe(
      "/intervenciones/alta?error=No se pudo determinar el ayuntamiento del acceso.",
    );
  });

  it("manda al acceso sin sesion, sin escribir", async () => {
    contextoActualMock.mockResolvedValue(null);

    await expect(altaDeIntervencionAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(registrarMock).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenLastCalledWith("/acceso");
  });
});
