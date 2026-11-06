import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { TransversalRepetidaError } from "../../domain";
import { decodificarBorrador } from "../borradorDeDomicilio";

const mocks = vi.hoisted(() => ({
  contextoActual: vi.fn(),
  altaDeDomicilio: vi.fn(),
  corregirDomicilio: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  has: vi.fn(),
}));

vi.mock("@/shared/auth", () => ({ contextoActual: mocks.contextoActual }));
vi.mock("../../composicion", () => ({
  altaDeDomicilio: mocks.altaDeDomicilio,
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

const { altaDeDomicilioAction } = await import("./altaDeDomicilioAction");
const { corregirDomicilioAction } = await import("./corregirDomicilioAction");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const RAIZ = "11111111-1111-4111-8111-111111111111";
const CALLE = "33333333-3333-4333-8333-333333333333";
const DOMICILIO = "44444444-4444-4444-8444-444444444444";

const formulario = (campos: Record<string, string>) => {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(campos)) datos.set(clave, valor);
  return datos;
};

const capturado = {
  raiz: RAIZ,
  calleId: CALLE,
  numero: "17-A",
  entreCalleAId: CALLE,
  referencia: "Portón azul",
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

const cookieGuardada = () => {
  const [nombre, valor, opciones] = mocks.set.mock.calls[0] ?? [];
  return { nombre, borrador: decodificarBorrador(valor), opciones };
};

const tokenGuardado = () => cookieGuardada().borrador?.token;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.contextoActual.mockResolvedValue(contexto);
  mocks.has.mockReturnValue(true);
});

describe("borrador: un rechazo del alta guarda lo capturado", () => {
  it("guarda la cookie y redirige solo con su token, sin la direccion", async () => {
    mocks.altaDeDomicilio.mockRejectedValue(new TransversalRepetidaError());

    const destino = await destinoDe(
      altaDeDomicilioAction(formulario({ ...capturado, lugarId: "" })),
    );
    const { nombre, borrador, opciones } = cookieGuardada();

    expect(destino.searchParams.get("error")).toContain("distintas");
    expect(destino.searchParams.get("borrador")).toBe(borrador?.token);
    expect(destino.search).not.toMatch(/17-A|Port/);
    expect(nombre).toBe("borrador-de-domicilio");
    expect(borrador?.destino).toEqual({ formulario: "alta" });
    expect(borrador?.campos).toMatchObject({
      numero: "17-A",
      referencia: "Portón azul",
    });
    expect(opciones).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/territorio",
      maxAge: 120,
    });
  });

  it("un formulario invalido tambien guarda lo capturado", async () => {
    const destino = await destinoDe(
      altaDeDomicilioAction(formulario({ raiz: RAIZ, numero: "9" })),
    );

    expect(cookieGuardada().borrador?.campos.numero).toBe("9");
    expect(destino.searchParams.get("borrador")).toBe(tokenGuardado());
    expect(mocks.altaDeDomicilio).not.toHaveBeenCalled();
  });

  it("el alta exitosa borra el borrador y no lo nombra en la URL", async () => {
    mocks.altaDeDomicilio.mockResolvedValue({ id: DOMICILIO });

    const destino = await destinoDe(
      altaDeDomicilioAction(formulario({ ...capturado, entreCalleAId: "" })),
    );

    expect(destino.pathname).toBe("/territorio");
    expect(destino.searchParams.get("ok")).toBe("domicilio-creado");
    expect(destino.searchParams.has("error")).toBe(false);
    expect(destino.searchParams.has("borrador")).toBe(false);
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.delete).toHaveBeenCalledWith({
      name: "borrador-de-domicilio",
      path: "/territorio",
    });
  });
});

describe("borrador: un rechazo de la correccion guarda lo capturado", () => {
  const correccion = {
    ...capturado,
    domicilioId: DOMICILIO,
    zonaId: "",
    accion: "corregirDomicilio",
  };

  it("el borrador nombra al domicilio corregido", async () => {
    mocks.corregirDomicilio.mockRejectedValue(new TransversalRepetidaError());

    const destino = await destinoDe(
      corregirDomicilioAction(formulario(correccion)),
    );
    const { borrador } = cookieGuardada();

    expect(destino.searchParams.get("borrador")).toBe(borrador?.token);
    expect(destino.searchParams.get("domicilio")).toBe(DOMICILIO);
    expect(borrador?.destino).toEqual({
      formulario: "correccion",
      domicilioId: DOMICILIO,
    });
    expect(borrador?.campos.referencia).toBe("Portón azul");
  });

  it("una correccion sin calle tambien guarda lo capturado", async () => {
    const destino = await destinoDe(
      corregirDomicilioAction(formulario({ ...correccion, calleId: "" })),
    );

    expect(cookieGuardada().borrador?.campos.numero).toBe("17-A");
    expect(destino.searchParams.get("borrador")).toBe(tokenGuardado());
    expect(mocks.corregirDomicilio).not.toHaveBeenCalled();
  });

  it("sin un domicilio valido no hay borrador", async () => {
    const destino = await destinoDe(
      corregirDomicilioAction(
        formulario({ ...correccion, domicilioId: "otro" }),
      ),
    );

    expect(destino.searchParams.has("borrador")).toBe(false);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("la correccion exitosa borra el borrador", async () => {
    mocks.corregirDomicilio.mockResolvedValue(undefined);

    const destino = await destinoDe(
      corregirDomicilioAction(formulario({ ...correccion, entreCalleAId: "" })),
    );

    expect(destino.pathname).toBe("/territorio");
    expect(destino.searchParams.get("ok")).toBe("domicilio-corregido");
    expect(destino.searchParams.has("error")).toBe(false);
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.delete).toHaveBeenCalledOnce();
  });
});
