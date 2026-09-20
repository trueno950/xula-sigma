import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  CalleConDomiciliosError,
  CalleEnZonaError,
  CatalogoDeCallesSoloEnAsentamientosError,
} from "../../domain";

const contextoActualMock = vi.hoisted(() => vi.fn());
const reparentearCalleMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  reparentearCalle: reparentearCalleMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/navigation", () => ({
  redirect: redirectMock.mockImplementation((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));

const { reparentearCalleAction } = await import("./reparentearCalleAction");

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

const reparentearCalleYLugar = () =>
  reparentearCalleAction(formulario({ calleId: CALLE, nuevoLugarId: LUGAR }));

describe("reparentearCalleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextoActualMock.mockResolvedValue(contexto);
    reparentearCalleMock.mockResolvedValue(undefined);
  });

  it("redacta un recurso ajeno como 404 y no filtra el error crudo", async () => {
    reparentearCalleMock.mockRejectedValue(new NoEncontradoError());

    await expect(reparentearCalleYLugar()).rejects.toThrow(
      "REDIRECT:/territorio?error=El+recurso+no+existe.",
    );
  });

  it.each([
    [
      "moving a street below a settlement",
      new CatalogoDeCallesSoloEnAsentamientosError(),
      "Las+calles+solo+se+pueden+administrar+en+una+cabecera+o+una+comisaria.",
    ],
    [
      "a street with domicilios on move",
      new CalleConDomiciliosError(
        "La calle tiene domicilios y no se puede mover a otro asentamiento.",
      ),
      "La+calle+tiene+domicilios+y+no+se+puede+mover+a+otro+asentamiento.",
    ],
    [
      "a street that belongs to a zone",
      new CalleEnZonaError(),
      "La+calle+pertenece+a+una+zona+y+no+se+puede+cambiar+de+asentamiento.",
    ],
  ])(
    "preserves the operator message for %s",
    async (_caso, error, esperado) => {
      reparentearCalleMock.mockRejectedValue(error);

      await expect(reparentearCalleYLugar()).rejects.toThrow(
        `REDIRECT:/territorio?error=${esperado}`,
      );
    },
  );

  it("preserves the active street context when a street operation fails", async () => {
    reparentearCalleMock.mockRejectedValue(new NoEncontradoError());

    await expect(
      reparentearCalleAction(
        formulario({
          calleId: CALLE,
          nuevoLugarId: LUGAR,
          raiz: LUGAR,
          nodo: LUGAR,
          vista: "calles",
          accion: "reparentearCalle",
          calle: CALLE,
        }),
      ),
    ).rejects.toThrow(
      "REDIRECT:/territorio?raiz=22222222-2222-4222-8222-222222222222&nodo=22222222-2222-4222-8222-222222222222&vista=calles&accion=reparentearCalle&calle=11111111-1111-4111-8111-111111111111&error=El+recurso+no+existe.",
    );
  });
});
