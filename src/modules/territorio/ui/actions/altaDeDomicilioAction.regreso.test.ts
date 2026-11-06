import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { ColoniaRequeridaError } from "../../domain";

const contextoActualMock = vi.hoisted(() => vi.fn());
const altaDeDomicilioMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  altaDeDomicilio: altaDeDomicilioMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
// Las acciones de domicilio guardan o borran el borrador; ver `borradorEnAcciones.test.ts`.
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: vi.fn(), delete: vi.fn(), has: () => false }),
}));
vi.mock("next/navigation", () => ({
  redirect: redirectMock.mockImplementation((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));

const { altaDeDomicilioAction } = await import("./altaDeDomicilioAction");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

const RAIZ = "11111111-1111-4111-8111-111111111111";
const NODO = "22222222-2222-4222-8222-222222222222";
const CALLE = "33333333-3333-4333-8333-333333333333";

const formulario = (campos: Record<string, string>) => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos))
    formData.set(clave, valor);
  return formData;
};

const navegacion = {
  raiz: RAIZ,
  nodo: NODO,
  vista: "domicilios",
  accion: "domicilio",
};

describe("altaDeDomicilioAction: regreso a la ficha", () => {
  const PERSONA = "88888888-8888-4888-8888-888888888888";

  beforeEach(() => {
    vi.clearAllMocks();
    contextoActualMock.mockResolvedValue(contexto);
    altaDeDomicilioMock.mockResolvedValue({
      id: "77777777-7777-4777-8777-777777777777",
    });
  });

  it("con un regreso valido, el alta exitosa vuelve a la ficha con su aviso", async () => {
    await expect(
      altaDeDomicilioAction(
        formulario({
          vista: "domicilios",
          accion: "domicilio",
          calleId: CALLE,
          lugarId: "",
          regreso: `/padron/${PERSONA}`,
        }),
      ),
    ).rejects.toThrow(`REDIRECT:/padron/${PERSONA}?ok=domicilio-creado`);
  });

  it.each([
    "https://evil.example/",
    "//evil.example",
    "/padron/../territorio",
    "/territorio",
  ])(
    "ignora el regreso %s y confirma en territorio como siempre",
    async (regreso) => {
      await expect(
        altaDeDomicilioAction(
          formulario({
            vista: "domicilios",
            accion: "domicilio",
            calleId: CALLE,
            lugarId: "",
            regreso,
          }),
        ),
      ).rejects.toThrow(
        "REDIRECT:/territorio?vista=domicilios&accion=domicilio&ok=domicilio-creado",
      );
    },
  );

  it("sin regreso, el alta desde territorio confirma en territorio como antes", async () => {
    await expect(
      altaDeDomicilioAction(
        formulario({ ...navegacion, calleId: CALLE, lugarId: "" }),
      ),
    ).rejects.toThrow(
      `REDIRECT:/territorio?raiz=${RAIZ}&nodo=${NODO}&vista=domicilios&accion=domicilio&ok=domicilio-creado`,
    );
  });

  it("un error del alta conserva el regreso para que el siguiente intento vuelva a la ficha", async () => {
    altaDeDomicilioMock.mockRejectedValue(new ColoniaRequeridaError());

    await expect(
      altaDeDomicilioAction(
        formulario({
          vista: "domicilios",
          accion: "domicilio",
          calleId: CALLE,
          lugarId: "",
          regreso: `/padron/${PERSONA}`,
        }),
      ),
    ).rejects.toThrow(`regreso=${encodeURIComponent(`/padron/${PERSONA}`)}`);
  });
});
