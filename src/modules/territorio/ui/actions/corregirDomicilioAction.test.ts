import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoLugarId, UbicacionIncoherenteError } from "../../domain";

const mocks = vi.hoisted(() => ({
  contextoActual: vi.fn(),
  corregirDomicilio: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  has: vi.fn(),
}));

vi.mock("@/shared/auth", () => ({ contextoActual: mocks.contextoActual }));
vi.mock("../../composicion", () => ({
  corregirDomicilio: mocks.corregirDomicilio,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: mocks.set,
    delete: mocks.delete,
    has: mocks.has,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  },
}));

const { corregirDomicilioAction } = await import("./corregirDomicilioAction");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const RAIZ = "11111111-1111-4111-8111-111111111111";
const COLONIA_A = "22222222-2222-4222-8222-222222222222";
const COLONIA_B = "55555555-5555-4555-8555-555555555555";
const CALLE = "33333333-3333-4333-8333-333333333333";
const DOMICILIO = "44444444-4444-4444-8444-444444444444";

/** El formulario tal como lo manda `FormularioDeCorreccionDeDomicilio`. */
const formulario = (nodo: string, zonaId: string) => {
  const datos = new FormData();
  const campos = {
    raiz: RAIZ,
    nodo,
    vista: "domicilios",
    accion: "corregirDomicilio",
    domicilioId: DOMICILIO,
    calleId: CALLE,
    zonaId,
    numero: "17-A",
  };
  for (const [clave, valor] of Object.entries(campos)) datos.set(clave, valor);
  return datos;
};

/** El destino del redirect, ya parseado. */
const destinoDe = async (envio: Promise<void>): Promise<URL> => {
  const error = await envio.then(
    () => new Error("no redirigio"),
    (rechazo: unknown) => rechazo,
  );
  const mensaje = error instanceof Error ? error.message : "";
  return new URL(mensaje.replace("REDIRECT:", ""), "http://local");
};

describe("corregirDomicilioAction vuelve al lugar donde quedo la direccion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.contextoActual.mockResolvedValue(contexto);
    mocks.has.mockReturnValue(false);
  });

  // `cargaDeTerritorio` responde 404 si `?nodo=` no es el lugar del que
  // cuelga `?domicilio=`: volver al nodo anterior era el "No encontramos
  // eso" de S1.
  it.each([
    {
      caso: "agregar la colonia",
      nodo: RAIZ,
      zona: COLONIA_A,
      resultante: COLONIA_A,
    },
    { caso: "quitar la colonia", nodo: COLONIA_A, zona: "", resultante: RAIZ },
    {
      caso: "cambiar la colonia",
      nodo: COLONIA_A,
      zona: COLONIA_B,
      resultante: COLONIA_B,
    },
    {
      caso: "dejar la colonia igual",
      nodo: COLONIA_A,
      zona: COLONIA_A,
      resultante: COLONIA_A,
    },
  ])(
    "al $caso redirige al lugar resultante",
    async ({ nodo, zona, resultante }) => {
      mocks.corregirDomicilio.mockResolvedValue({
        lugarId: comoLugarId(resultante),
      });

      const destino = await destinoDe(
        corregirDomicilioAction(formulario(nodo, zona)),
      );

      expect(destino.pathname).toBe("/territorio");
      expect(destino.searchParams.get("nodo")).toBe(resultante);
      expect(destino.searchParams.get("raiz")).toBe(RAIZ);
      expect(destino.searchParams.get("domicilio")).toBe(DOMICILIO);
      expect(destino.searchParams.get("ok")).toBe("domicilio-corregido");
      expect(destino.searchParams.has("error")).toBe(false);
      // La correccion es su propia vista: guardada, se vuelve al panel.
      expect(destino.searchParams.has("accion")).toBe(false);
    },
  );

  it("un rechazo vuelve al nodo del formulario con el error y el borrador", async () => {
    mocks.corregirDomicilio.mockRejectedValue(new UbicacionIncoherenteError());

    const destino = await destinoDe(
      corregirDomicilioAction(formulario(COLONIA_A, COLONIA_B)),
    );

    expect(destino.searchParams.get("nodo")).toBe(COLONIA_A);
    expect(destino.searchParams.get("domicilio")).toBe(DOMICILIO);
    expect(destino.searchParams.get("error")).toBe(
      new UbicacionIncoherenteError().message,
    );
    expect(destino.searchParams.get("borrador")).toBeTruthy();
    // El rechazo reabre la vista de correccion, no el panel.
    expect(destino.searchParams.get("accion")).toBe("corregirDomicilio");
    expect(destino.searchParams.has("ok")).toBe(false);
    expect(mocks.set).toHaveBeenCalledOnce();
  });
});
