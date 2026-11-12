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
const COLONIA = "22222222-2222-4222-8222-222222222222";
const CALLE = "33333333-3333-4333-8333-333333333333";
const DOMICILIO = "44444444-4444-4444-8444-444444444444";
const PERSONA = "88888888-8888-4888-8888-888888888888";
const REGRESO = `/padron/${PERSONA}`;

/** El formulario tal como lo manda `FormularioDeCorreccionDeDomicilio`. */
const formulario = (regreso?: string) => {
  const datos = new FormData();
  const campos = {
    raiz: RAIZ,
    nodo: COLONIA,
    vista: "domicilios",
    accion: "corregirDomicilio",
    domicilioId: DOMICILIO,
    calleId: CALLE,
    zonaId: COLONIA,
    numero: "17-A",
  };
  for (const [clave, valor] of Object.entries(campos)) datos.set(clave, valor);
  if (regreso) datos.set("regreso", regreso);
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

describe("corregirDomicilioAction: regreso a la ficha", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.contextoActual.mockResolvedValue(contexto);
    mocks.has.mockReturnValue(false);
    mocks.corregirDomicilio.mockResolvedValue({
      lugarId: comoLugarId(COLONIA),
    });
  });

  it("con un regreso valido, se queda en el arbol y lo conserva para el enlace", async () => {
    const destino = await destinoDe(
      corregirDomicilioAction(formulario(REGRESO)),
    );

    expect(destino.pathname).toBe("/territorio");
    expect(destino.searchParams.get("ok")).toBe("domicilio-corregido");
    expect(destino.searchParams.get("regreso")).toBe(REGRESO);
  });

  it.each([
    "https://evil.example/",
    "//evil.example",
    "/padron/../territorio",
    "/territorio",
    `/padron/${PERSONA}?ok=x`,
  ])("descarta el regreso %s y confirma en territorio", async (regreso) => {
    const destino = await destinoDe(
      corregirDomicilioAction(formulario(regreso)),
    );

    expect(destino.searchParams.get("ok")).toBe("domicilio-corregido");
    expect(destino.searchParams.has("regreso")).toBe(false);
  });

  it("sin regreso, el destino es el mismo de siempre", async () => {
    const destino = await destinoDe(corregirDomicilioAction(formulario()));

    expect(destino.searchParams.toString()).toBe(
      `raiz=${RAIZ}&nodo=${COLONIA}&vista=domicilios&domicilio=${DOMICILIO}&ok=domicilio-corregido`,
    );
  });

  it("un rechazo tambien lo conserva, para que el segundo intento vuelva a la ficha", async () => {
    mocks.corregirDomicilio.mockRejectedValue(new UbicacionIncoherenteError());

    const destino = await destinoDe(
      corregirDomicilioAction(formulario(REGRESO)),
    );

    expect(destino.searchParams.get("error")).toBe(
      new UbicacionIncoherenteError().message,
    );
    expect(destino.searchParams.get("regreso")).toBe(REGRESO);
  });
});
