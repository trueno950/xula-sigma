import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Borde de `buscarSimilaresAction` (tasks.md 7.13): el criterio que le
 * llega a `buscarReportesSimilares` nunca lleva `descripcion` ni
 * `referencia`, aunque el cliente -o un request a mano contra la Server
 * Action, que es superficie publica- intente colarlas. Zod `safeParse` con
 * un objeto sin `.passthrough()` es la reja: cualquier propiedad fuera de
 * `{ lugarId, tipo }` se descarta antes de llegar al caso de uso.
 */
const contextoActualMock = vi.hoisted(() => vi.fn());
const buscarReportesSimilaresMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  buscarReportesSimilares: buscarReportesSimilaresMock,
}));

const { buscarSimilaresAction } = await import("./buscarSimilaresAction");

const LUGAR_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "usuario-1", rol: "OPERADOR" },
    origen: "web",
  });
  buscarReportesSimilaresMock.mockResolvedValue([]);
});

describe("buscarSimilaresAction: la isla nunca envia las cajas de texto libre", () => {
  it("descripcion y referencia coladas en el criterio no llegan al caso de uso", async () => {
    await buscarSimilaresAction({
      lugarId: LUGAR_ID,
      tipo: "BACHE",
      descripcion: "esto no deberia viajar",
      referencia: "ni esto",
    });

    expect(buscarReportesSimilaresMock).toHaveBeenCalledWith(
      { lugarId: LUGAR_ID, tipo: "BACHE" },
      expect.anything(),
    );
  });

  it("criterio invalido devuelve ActionResult de error, sin invocar el caso de uso", async () => {
    const resultado = await buscarSimilaresAction({ lugarId: "no-es-uuid" });

    expect(resultado.ok).toBe(false);
    expect(buscarReportesSimilaresMock).not.toHaveBeenCalled();
  });
});
