import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { CabeceraDuplicadaError } from "../../domain";

const contextoActualMock = vi.hoisted(() => vi.fn());
const altaDeLugarMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({ altaDeLugar: altaDeLugarMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: redirectMock.mockImplementation((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));

const { altaDeLugarAction } = await import("./altaDeLugarAction");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const formulario = (campos: Record<string, string>) => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }
  return formData;
};

describe("altaDeLugarAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextoActualMock.mockResolvedValue(contexto);
  });

  it("le dice a la operadora que la cabecera ya existe, en vez del mensaje generico", async () => {
    altaDeLugarMock.mockRejectedValue(new CabeceraDuplicadaError());

    await expect(
      altaDeLugarAction(formulario({ tipo: "cabecera", nombre: "Otra" })),
    ).rejects.toThrow(
      "REDIRECT:/territorio?error=Ya+existe+una+cabecera+municipal.+Solo+puede+haber+una.",
    );
  });

  it("un error inesperado sigue saliendo como el mensaje generico", async () => {
    altaDeLugarMock.mockRejectedValue(new Error("secret SQL detail"));

    await expect(
      altaDeLugarAction(formulario({ tipo: "comisaria", nombre: "X" })),
    ).rejects.toThrow("No+se+pudo+completar+el+alta.+Intente+de+nuevo.");
  });

  it("el exito lleva al lugar recien creado en `nuevo`, solo su id", async () => {
    const NUEVO = "55555555-5555-4555-8555-555555555555";
    const RAIZ = "11111111-1111-4111-8111-111111111111";
    altaDeLugarMock.mockResolvedValue({ id: NUEVO });

    await expect(
      altaDeLugarAction(
        formulario({
          tipo: "colonia",
          nombre: "Colonia Prueba",
          padreId: RAIZ,
          raiz: RAIZ,
          vista: "lugares",
          accion: "lugar",
        }),
      ),
    ).rejects.toThrow(
      `REDIRECT:/territorio?raiz=${RAIZ}&vista=lugares&accion=lugar&ok=lugar-creado&nuevo=${NUEVO}`,
    );
  });
});
