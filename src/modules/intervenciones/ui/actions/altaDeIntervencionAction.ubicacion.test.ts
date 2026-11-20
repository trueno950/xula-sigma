import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalleFueraDelLugarError } from "../../domain";

/**
 * S6 de `intervenciones-ux`: una calle del asentamiento de otro lugar no se
 * puede guardar, y la operadora lee en el formulario que lo que fallo es la
 * calle, no el lugar ni el municipio.
 */
const redirectMock = vi.hoisted(() =>
  vi.fn((_url?: string): never => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const revalidatePathMock = vi.hoisted(() => vi.fn());
const contextoActualMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());
const guardarBorradorMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  registrarIntervencion: registrarMock,
}));
vi.mock("../borradorEnCookie", () => ({
  guardarBorrador: guardarBorradorMock,
  descartarBorrador: vi.fn(),
}));

const { altaDeIntervencionAction } = await import("./altaDeIntervencionAction");

const LUGAR = "22222222-2222-4222-8222-222222222222";
const CALLE = "44444444-4444-4444-8444-444444444444";

const formDataDe = () => {
  const formData = new FormData();
  formData.set("tipo", "PAVIMENTACION");
  formData.set("fechaDeOcurrencia", "2026-11-16");
  formData.set("lugarId", LUGAR);
  formData.set("calleId", CALLE);
  formData.set("descripcion", "Pavimentacion de la calle 20 entre 15 y 17");
  return formData;
};

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "11111111-1111-4111-8111-111111111111",
    usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
    origen: "web",
  });
  registrarMock.mockRejectedValue(new CalleFueraDelLugarError());
});

describe("altaDeIntervencionAction: calle de otro asentamiento", () => {
  it("vuelve al alta con el mensaje del dominio, no con el de la excepcion", async () => {
    await expect(altaDeIntervencionAction(formDataDe())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    // El rechazo vuelve con lo capturado, asi que la URL lleva el token del
    // borrador delante del mensaje (S8 de `intervenciones-ux`).
    const [borrador] = guardarBorradorMock.mock.calls[0] ?? [];
    expect(decodeURIComponent(redirectMock.mock.calls[0]?.[0] as string)).toBe(
      `/intervenciones/alta?borrador=${borrador?.token}&error=La calle elegida no es de ese lugar. Elija una calle del lugar, o registre la intervención sin calle.`,
    );
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
