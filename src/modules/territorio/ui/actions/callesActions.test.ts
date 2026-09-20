import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { CatalogoDeCallesSoloEnAsentamientosError } from "../../domain";

const contextoActualMock = vi.hoisted(() => vi.fn());
const altaDeCalleMock = vi.hoisted(() => vi.fn());
const ubicarCalleMock = vi.hoisted(() => vi.fn());
const darDeBajaCalleMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  altaDeCalle: altaDeCalleMock,
  ubicarCalle: ubicarCalleMock,
  darDeBajaCalle: darDeBajaCalleMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/navigation", () => ({
  redirect: redirectMock.mockImplementation((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));

const { ubicarCalleAction } = await import("./ubicarCalleAction");
const { altaDeCalleAction } = await import("./altaDeCalleAction");
const { darDeBajaCalleAction } = await import("./darDeBajaCalleAction");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const CALLE = "11111111-1111-4111-8111-111111111111";
const LUGAR = "22222222-2222-4222-8222-222222222222";

const formulario = (campos: Record<string, string>) => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos))
    formData.set(clave, valor);
  return formData;
};

describe("acciones publicas de calles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextoActualMock.mockResolvedValue(contexto);
    altaDeCalleMock.mockResolvedValue(undefined);
    ubicarCalleMock.mockResolvedValue(undefined);
    darDeBajaCalleMock.mockResolvedValue(undefined);
  });

  it("rechaza un formulario de ubicacion malformado antes de resolver sesion", async () => {
    await expect(ubicarCalleAction(formulario({}))).rejects.toThrow(
      "REDIRECT:/territorio?error=Coordenada+invalida.",
    );

    expect(contextoActualMock).not.toHaveBeenCalled();
    expect(ubicarCalleMock).not.toHaveBeenCalled();
  });

  it("preserves the operator message for a street catalog on a lower-level place", async () => {
    altaDeCalleMock.mockRejectedValue(
      new CatalogoDeCallesSoloEnAsentamientosError(),
    );

    await expect(
      altaDeCalleAction(
        formulario({
          nombre: "Calle 21",
          lugarId: LUGAR,
        }),
      ),
    ).rejects.toThrow(
      "REDIRECT:/territorio?error=Las+calles+solo+se+pueden+administrar+en+una+cabecera+o+una+comisaria.",
    );
  });

  it("explica cuando el punto esta fuera de Yucatan", async () => {
    await expect(
      ubicarCalleAction(
        formulario({
          calleId: CALLE,
          latitud: "20",
          longitud: "-100",
        }),
      ),
    ).rejects.toThrow(
      "REDIRECT:/territorio?error=El+punto+debe+estar+dentro+de+Yucatan.",
    );

    expect(contextoActualMock).not.toHaveBeenCalled();
    expect(ubicarCalleMock).not.toHaveBeenCalled();
  });

  it("ignora un ayuntamiento enviado por el formulario y usa el contexto del servidor", async () => {
    await ubicarCalleAction(
      formulario({
        calleId: CALLE,
        latitud: "20.937000",
        longitud: "-89.623700",
        ayuntamientoId: "ticul",
      }),
    );

    expect(ubicarCalleMock).toHaveBeenCalledWith(
      CALLE,
      { latitud: 20.937, longitud: -89.6237 },
      contexto,
    );
    expect(ubicarCalleMock.mock.calls[0]?.[2]).not.toEqual(
      expect.objectContaining({ ayuntamientoId: "ticul" }),
    );
  });

  it("convierte un error inesperado en un mensaje generico", async () => {
    ubicarCalleMock.mockRejectedValue(new Error("secret SQL detail"));

    await expect(
      ubicarCalleAction(
        formulario({ calleId: CALLE, latitud: "20.937", longitud: "-89.6237" }),
      ),
    ).rejects.toThrow(
      "REDIRECT:/territorio?error=No+se+pudo+guardar+la+ubicacion.",
    );
  });

  it("redirige la baja a un destino fijo y no acepta una ruta forjada", async () => {
    await expect(
      darDeBajaCalleAction(
        formulario({ calleId: CALLE, raiz: LUGAR, nodo: LUGAR }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(redirectMock).toHaveBeenCalledWith("/territorio");
  });
});
