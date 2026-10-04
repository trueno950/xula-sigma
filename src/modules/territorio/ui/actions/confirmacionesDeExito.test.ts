import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";

const UUID = "11111111-1111-4111-8111-111111111111";
const OTRO = "22222222-2222-4222-8222-222222222222";

const contextoActualMock = vi.hoisted(() => vi.fn());
const composicion = vi.hoisted(() => ({
  altaDeCalle: vi.fn(),
  altaDeDomicilio: vi.fn(),
  altaDeLugar: vi.fn(),
  corregirDomicilio: vi.fn(),
  darDeBajaCalle: vi.fn(),
  darDeBajaDomicilio: vi.fn(),
  darDeBajaLugar: vi.fn(),
  editarLugar: vi.fn(),
  renombrarCalle: vi.fn(),
  reparentearCalle: vi.fn(),
  reparentearLugar: vi.fn(),
  ubicarCalle: vi.fn(),
}));

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => composicion);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  },
}));

const { altaDeCalleAction } = await import("./altaDeCalleAction");
const { altaDeDomicilioAction } = await import("./altaDeDomicilioAction");
const { altaDeLugarAction } = await import("./altaDeLugarAction");
const { corregirDomicilioAction } = await import("./corregirDomicilioAction");
const { darDeBajaCalleAction } = await import("./darDeBajaCalleAction");
const { darDeBajaDomicilioAction } = await import("./darDeBajaDomicilioAction");
const { darDeBajaLugarAction } = await import("./darDeBajaLugarAction");
const { editarLugarAction } = await import("./editarLugarAction");
const { renombrarCalleAction } = await import("./renombrarCalleAction");
const { reparentearCalleAction } = await import("./reparentearCalleAction");
const { reparentearLugarAction } = await import("./reparentearLugarAction");
const { ubicarCalleAction } = await import("./ubicarCalleAction");

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

const contextoDeUrl = { raiz: UUID, nodo: OTRO, vista: "lugares" };

/**
 * Cada accion que termina bien dice con que clave. Las que dejan la
 * pantalla donde estaba -las altas y las ediciones- conservan la accion
 * abierta para seguir capturando; las bajas y los movimientos suben, porque
 * el nodo de la URL ya no es el mismo.
 */
const CASOS = [
  [
    "altaDeLugar",
    altaDeLugarAction,
    { tipo: "colonia", nombre: "X", padreId: "", ...contextoDeUrl },
    "lugar-creado",
  ],
  [
    "altaDeCalle",
    altaDeCalleAction,
    { nombre: "Calle 1", lugarId: UUID, ...contextoDeUrl },
    "calle-creada",
  ],
  [
    "altaDeDomicilio",
    altaDeDomicilioAction,
    { calleId: UUID, numero: "1", ...contextoDeUrl },
    "domicilio-creado",
  ],
  [
    "corregirDomicilio",
    corregirDomicilioAction,
    { domicilioId: UUID, calleId: OTRO, ...contextoDeUrl },
    "domicilio-corregido",
  ],
  [
    "editarLugar",
    editarLugarAction,
    { id: UUID, nombre: "Nuevo", ...contextoDeUrl },
    "lugar-editado",
  ],
  [
    "renombrarCalle",
    renombrarCalleAction,
    { id: UUID, nombre: "Nueva", ...contextoDeUrl },
    "calle-renombrada",
  ],
  [
    "ubicarCalle",
    ubicarCalleAction,
    { calleId: UUID, latitud: "", longitud: "", ...contextoDeUrl },
    "calle-ubicada",
  ],
  [
    "reparentearLugar",
    reparentearLugarAction,
    { lugarId: UUID, nuevoPadreId: OTRO },
    "lugar-movido",
  ],
  [
    "reparentearCalle",
    reparentearCalleAction,
    { calleId: UUID, nuevoLugarId: OTRO },
    "calle-movida",
  ],
  [
    "darDeBajaLugar",
    darDeBajaLugarAction,
    { id: UUID, ...contextoDeUrl },
    "lugar-baja",
  ],
  [
    "darDeBajaCalle",
    darDeBajaCalleAction,
    { calleId: UUID, ...contextoDeUrl },
    "calle-baja",
  ],
  [
    "darDeBajaDomicilio",
    darDeBajaDomicilioAction,
    { domicilioId: UUID, ...contextoDeUrl },
    "domicilio-baja",
  ],
] as const;

const destinoDe = async (
  accion: (formData: FormData) => Promise<void>,
  campos: Record<string, string>,
) => {
  const error = await accion(formulario(campos)).then(
    () => null,
    (e: Error) => e,
  );
  const [, destino] = error?.message.match(/^REDIRECT:(.*)$/) ?? [];

  return destino ? new URL(destino, "http://x") : null;
};

describe("confirmaciones de exito de territorio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextoActualMock.mockResolvedValue(contexto);
    for (const caso of Object.values(composicion)) {
      caso.mockResolvedValue(undefined);
    }
  });

  it.each(CASOS)(
    "%s redirige con su clave y sin error",
    async (...[, accion, campos, clave]) => {
      const destino = await destinoDe(accion, campos);

      expect(destino?.pathname).toBe("/territorio");
      expect(destino?.searchParams.get("ok")).toBe(clave);
      expect(destino?.searchParams.has("error")).toBe(false);
    },
  );

  it("un alta conserva el lugar abierto para seguir capturando", async () => {
    const destino = await destinoDe(altaDeCalleAction, {
      nombre: "Calle 1",
      lugarId: UUID,
      ...contextoDeUrl,
      accion: "calle",
    });

    expect(destino?.searchParams.get("raiz")).toBe(UUID);
    expect(destino?.searchParams.get("nodo")).toBe(OTRO);
    expect(destino?.searchParams.get("accion")).toBe("calle");
  });

  it("una falla no lleva clave de exito", async () => {
    composicion.altaDeLugar.mockRejectedValue(new Error("boom"));

    const destino = await destinoDe(altaDeLugarAction, {
      tipo: "colonia",
      nombre: "X",
      padreId: "",
    });

    expect(destino?.searchParams.has("error")).toBe(true);
    expect(destino?.searchParams.has("ok")).toBe(false);
  });
});
