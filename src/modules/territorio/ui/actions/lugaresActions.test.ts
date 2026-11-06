import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  LugarConCallesError,
  LugarConDomiciliosError,
  LugarConZonasError,
} from "../../domain";

const contextoActualMock = vi.hoisted(() => vi.fn());
const reparentearLugarMock = vi.hoisted(() => vi.fn());
const darDeBajaLugarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  reparentearLugar: reparentearLugarMock,
  darDeBajaLugar: darDeBajaLugarMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));

const { reparentearLugarAction } = await import("./reparentearLugarAction");
const { darDeBajaLugarAction } = await import("./darDeBajaLugarAction");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const LUGAR = "11111111-1111-4111-8111-111111111111";
const PADRE = "22222222-2222-4222-8222-222222222222";

const formulario = (campos: Record<string, string>) => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos))
    formData.set(clave, valor);
  return formData;
};

const comoQuery = (mensaje: string) =>
  new URLSearchParams({ error: mensaje }).toString();

describe("acciones de lugares", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextoActualMock.mockResolvedValue(contexto);
  });

  it("el reparenteo muestra a la operadora por que no se mueve un lugar con domicilios", async () => {
    const error = new LugarConDomiciliosError();
    reparentearLugarMock.mockRejectedValue(error);

    await expect(
      reparentearLugarAction(
        formulario({ lugarId: LUGAR, nuevoPadreId: PADRE }),
      ),
    ).rejects.toThrow(`REDIRECT:/territorio?${comoQuery(error.message)}`);
  });

  it.each([
    ["calles activas", new LugarConCallesError()],
    ["zonas activas", new LugarConZonasError()],
  ])("la baja muestra el mensaje propio de %s", async (_caso, error) => {
    darDeBajaLugarMock.mockRejectedValue(error);

    await expect(
      darDeBajaLugarAction(formulario({ id: LUGAR })),
    ).rejects.toThrow(`REDIRECT:/territorio?${comoQuery(error.message)}`);
  });
});
