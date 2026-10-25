import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { ColoniaRequeridaError, UbicacionIncoherenteError } from "../../domain";

const contextoActualMock = vi.hoisted(() => vi.fn());
const altaDeDomicilioMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  altaDeDomicilio: altaDeDomicilioMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
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
const COLONIA = "66666666-6666-4666-8666-666666666666";

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

describe("altaDeDomicilioAction: zona opcional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextoActualMock.mockResolvedValue(contexto);
    altaDeDomicilioMock.mockResolvedValue({
      id: "77777777-7777-4777-8777-777777777777",
    });
  });

  it("guarda en la zona elegida y la declara", async () => {
    await expect(
      altaDeDomicilioAction(
        formulario({ ...navegacion, calleId: CALLE, lugarId: COLONIA }),
      ),
    ).rejects.toThrow("ok=domicilio-creado");

    expect(altaDeDomicilioMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lugarId: COLONIA,
        nivelesDeclarados: [COLONIA],
        calleId: CALLE,
      }),
      contexto,
    );
  });

  it("sin zona, deja que el caso de uso derive el asentamiento de la calle", async () => {
    await expect(
      altaDeDomicilioAction(
        formulario({ ...navegacion, calleId: CALLE, lugarId: "" }),
      ),
    ).rejects.toThrow("ok=domicilio-creado");

    const [datos] = altaDeDomicilioMock.mock.calls[0] ?? [];

    expect(datos).not.toHaveProperty("lugarId");
    expect(datos).not.toHaveProperty("sinColonia");
    expect(datos).toEqual(
      expect.objectContaining({ calleId: CALLE, nivelesDeclarados: [] }),
    );
  });

  it("maps the explicit sin-colonia option to an explicit application declaration", async () => {
    await expect(
      altaDeDomicilioAction(
        formulario({
          ...navegacion,
          calleId: CALLE,
          lugarId: "sin-colonia",
        }),
      ),
    ).rejects.toThrow("ok=domicilio-creado");

    const [datos] = altaDeDomicilioMock.mock.calls[0] ?? [];

    expect(datos).not.toHaveProperty("lugarId");
    expect(datos).toEqual(
      expect.objectContaining({
        calleId: CALLE,
        nivelesDeclarados: [],
        sinColonia: true,
      }),
    );
  });

  it("redacta la decision de colonia para el operador y no el mensaje generico", async () => {
    altaDeDomicilioMock.mockRejectedValue(new ColoniaRequeridaError());

    await expect(
      altaDeDomicilioAction(
        formulario({ ...navegacion, calleId: CALLE, lugarId: "" }),
      ),
    ).rejects.toThrow(/error=Elija\+una\+colonia/);
  });

  it("redacta la ubicacion incoherente para el operador y no el mensaje generico", async () => {
    altaDeDomicilioMock.mockRejectedValue(new UbicacionIncoherenteError());

    await expect(
      altaDeDomicilioAction(
        formulario({
          ...navegacion,
          calleId: CALLE,
          lugarId: COLONIA,
        }),
      ),
    ).rejects.toThrow(/error=La\+ubicaci%C3%B3n\+elegida\+no\+coincide/);
  });

  it("rechaza un formulario sin calle antes de resolver sesion", async () => {
    await expect(
      altaDeDomicilioAction(formulario({ raiz: RAIZ })),
    ).rejects.toThrow("REDIRECT:");

    expect(contextoActualMock).not.toHaveBeenCalled();
    expect(altaDeDomicilioMock).not.toHaveBeenCalled();
  });
});
