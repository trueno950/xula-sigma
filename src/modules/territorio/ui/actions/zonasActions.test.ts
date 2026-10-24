import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth";

const contextoActualMock = vi.hoisted(() => vi.fn());
const altaDeZonaMock = vi.hoisted(() => vi.fn());
const renombrarZonaMock = vi.hoisted(() => vi.fn());
const darDeBajaZonaMock = vi.hoisted(() => vi.fn());
const agregarCalleMock = vi.hoisted(() => vi.fn());
const quitarCalleMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  altaDeZona: altaDeZonaMock,
  renombrarZona: renombrarZonaMock,
  darDeBajaZona: darDeBajaZonaMock,
  agregarCalleAZona: agregarCalleMock,
  quitarCalleDeZona: quitarCalleMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/navigation", () => ({
  redirect: ((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }) as never,
}));

const { altaDeZonaAction } = await import("./altaDeZonaAction");
const { renombrarZonaAction } = await import("./renombrarZonaAction");
const { darDeBajaZonaAction } = await import("./darDeBajaZonaAction");
const { agregarCalleAZonaAction } = await import("./agregarCalleAZonaAction");
const { quitarCalleDeZonaAction } = await import("./quitarCalleDeZonaAction");

const admin: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};
const operador: ContextoActual = {
  ...admin,
  usuario: { id: "usuario-2", rol: "OPERADOR" },
};

const LUGAR = "22222222-2222-4222-8222-222222222222";
const ZONA = "33333333-3333-4333-8333-333333333333";
const CALLE = "11111111-1111-4111-8111-111111111111";

const formulario = (campos: Record<string, string>) => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos))
    formData.set(clave, valor);
  return formData;
};

/** El mensaje que la operadora ve; comparado por contenido, no por URL. */
const mensajeDe = (error: Error): string =>
  decodeURIComponent(
    error.message.split("error=")[1]?.split("&")[0] ?? "",
  ).replace(/\+/g, " ");

describe("acciones de zonas (B3u-RED-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    altaDeZonaMock.mockResolvedValue({ id: ZONA });
    renombrarZonaMock.mockResolvedValue(undefined);
    darDeBajaZonaMock.mockResolvedValue(undefined);
    agregarCalleMock.mockResolvedValue(undefined);
    quitarCalleMock.mockResolvedValue(undefined);
  });

  it("el alta rechaza a OPERADOR con mensaje de operadora", async () => {
    contextoActualMock.mockResolvedValue(operador);
    const { NoAutorizadoError } = await import("@/shared/lib/errores");
    altaDeZonaMock.mockRejectedValue(new NoAutorizadoError());

    let error: Error | undefined;
    try {
      await altaDeZonaAction(formulario({ nombre: "Centro", lugarId: LUGAR }));
    } catch (e) {
      error = e as Error;
    }
    // OPERADOR llega al caso de uso y este lo rechaza: la accion redacta.
    expect(error?.message).toContain("REDIRECT:");
    expect(mensajeDe(error as Error)).toContain("No tiene permiso");
  });

  it("el alta con ADMIN_MUNICIPAL llama al caso de uso y confirma", async () => {
    contextoActualMock.mockResolvedValue(admin);

    await expect(
      altaDeZonaAction(formulario({ nombre: "Centro", lugarId: LUGAR })),
    ).rejects.toThrow("REDIRECT:/territorio/zonas?");

    expect(altaDeZonaMock).toHaveBeenCalledWith(
      { nombre: "Centro", lugarId: LUGAR },
      admin,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/territorio/zonas");
  });

  it("el alta rechaza un formulario sin nombre antes de resolver sesion", async () => {
    await expect(
      altaDeZonaAction(formulario({ lugarId: LUGAR })),
    ).rejects.toThrow("REDIRECT:/territorio/zonas?error=");
    expect(contextoActualMock).not.toHaveBeenCalled();
    expect(altaDeZonaMock).not.toHaveBeenCalled();
  });

  it("el renombre redacta NombreDeZonaDuplicadoError", async () => {
    contextoActualMock.mockResolvedValue(admin);
    const { NombreDeZonaDuplicadoError } = await import("../../domain");
    renombrarZonaMock.mockRejectedValue(new NombreDeZonaDuplicadoError());

    let error: Error | undefined;
    try {
      await renombrarZonaAction(formulario({ zonaId: ZONA, nombre: "Norte" }));
    } catch (e) {
      error = e as Error;
    }
    expect(mensajeDe(error as Error)).toContain("Ya existe una zona activa");
  });

  it("la baja con ADMIN llama al caso de uso y vuelve al listado", async () => {
    contextoActualMock.mockResolvedValue(admin);

    await expect(
      darDeBajaZonaAction(formulario({ zonaId: ZONA })),
    ).rejects.toThrow("REDIRECT:/territorio/zonas?ok=");

    expect(darDeBajaZonaMock).toHaveBeenCalledWith(ZONA, admin);
  });

  it("agregar calle redacta CalleFueraDelAsentamientoError", async () => {
    contextoActualMock.mockResolvedValue(admin);
    const { CalleFueraDelAsentamientoError } = await import("../../domain");
    agregarCalleMock.mockRejectedValue(new CalleFueraDelAsentamientoError());

    let error: Error | undefined;
    try {
      await agregarCalleAZonaAction(
        formulario({ zonaId: ZONA, calleId: CALLE }),
      );
    } catch (e) {
      error = e as Error;
    }
    expect(mensajeDe(error as Error)).toContain("no pertenece al asentamiento");
  });

  it("quitar calle con ADMIN llama al caso de uso y confirma en la zona", async () => {
    contextoActualMock.mockResolvedValue(admin);

    await expect(
      quitarCalleDeZonaAction(formulario({ zonaId: ZONA, calleId: CALLE })),
    ).rejects.toThrow(`REDIRECT:/territorio/zonas?zona=${ZONA}&ok=`);

    expect(quitarCalleMock).toHaveBeenCalledWith(
      { zonaId: ZONA, calleId: CALLE },
      admin,
    );
  });

  it("quitar calle rechaza ids invalidos antes de resolver sesion", async () => {
    await expect(
      quitarCalleDeZonaAction(formulario({ zonaId: "x", calleId: CALLE })),
    ).rejects.toThrow("REDIRECT:/territorio/zonas?error=");
    expect(contextoActualMock).not.toHaveBeenCalled();
  });
});
