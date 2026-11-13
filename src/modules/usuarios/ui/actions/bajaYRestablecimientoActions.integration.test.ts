import { eq } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { verificarClave } from "@/shared/auth/contrasenia";
import { cuentas, usuarios } from "@/shared/auth/esquema";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { altaDeUsuario } from "../../composicion";
import { decodificarClaveMostrada } from "../claveMostrada";

/**
 * Restablecimiento y baja por la accion, contra Postgres (S5, S6, S7). Lo
 * que se afirma: la clave que la pantalla muestra verifica contra el hash,
 * la baja no borra la fila, y un `usuarioId` de otro municipio responde «no
 * encontrado» sin mover una sola fila — ni la del otro municipio ni la
 * propia.
 */

const contextoActualMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((destino: string): never => {
    throw new Error(`REDIRECT:${destino}`);
  }),
);
const cookies = vi.hoisted(() => {
  const guardadas = new Map<string, string>();

  return {
    guardadas,
    almacen: {
      set: (nombre: string, valor: string) => guardadas.set(nombre, valor),
      get: (nombre: string) => {
        const valor = guardadas.get(nombre);
        return valor === undefined ? undefined : { value: valor };
      },
      has: (nombre: string) => guardadas.has(nombre),
      delete: (nombre: string) => guardadas.delete(nombre),
    },
  };
});

vi.mock("@/shared/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/auth")>()),
  contextoActual: contextoActualMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => cookies.almacen }));

const { restablecerContraseniaAction } = await import(
  "./restablecerContraseniaAction"
);
const { darDeBajaUsuarioAction } = await import("./darDeBajaUsuarioAction");

let gente: GentePorMunicipio;

const formulario = (campos: Record<string, string>) => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }
  return formData;
};

const destino = () => String(redirectMock.mock.calls.at(-1)?.[0] ?? "");

const errorDelDestino = () => {
  const url = destino();
  return new URLSearchParams(url.slice(url.indexOf("?") + 1)).get("error");
};

const mostrada = () =>
  decodificarClaveMostrada(cookies.guardadas.get("clave-temporal-de-usuario"));

const filaDe = async (ayuntamientoId: typeof motul, usuarioId: string) =>
  withTenant(ayuntamientoId, (tx) =>
    tx.select().from(usuarios).where(eq(usuarios.id, usuarioId)),
  ).then(([fila]) => fila);

const credencialDe = async (ayuntamientoId: typeof motul, usuarioId: string) =>
  withTenant(ayuntamientoId, (tx) =>
    tx.select().from(cuentas).where(eq(cuentas.userId, usuarioId)),
  ).then(([credencial]) => credencial);

const contexto: () => ContextoActual = () =>
  contextoDe(gente, "motul", "ADMIN_MUNICIPAL");

let siguiente = 0;

const unaPersona: () => Promise<string> = async () => {
  siguiente += 1;
  const { usuarioId } = await altaDeUsuario(contexto(), {
    nombre: `Persona ${siguiente}`,
    email: `persona-${siguiente}@motul.example.com`,
    rol: "OPERADOR",
  });

  return usuarioId;
};

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

beforeEach(() => {
  vi.clearAllMocks();
  cookies.guardadas.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  contextoActualMock.mockResolvedValue(contexto());
});

describe("restablecimiento por la accion", () => {
  it("deja en la credencial la clave que la pantalla muestra", async () => {
    const usuarioId = await unaPersona();

    await expect(
      restablecerContraseniaAction(formulario({ usuarioId })),
    ).rejects.toThrow("REDIRECT:");

    const nueva = mostrada();
    const credencial = await credencialDe(motul, usuarioId);

    expect(nueva?.motivo).toBe("restablecimiento");
    expect(
      await verificarClave(credencial?.password ?? "", nueva?.clave ?? ""),
    ).toBe(true);
    expect(destino()).toBe(
      `/usuarios?clave=${nueva?.token}&ok=restablecimiento`,
    );
    expect(destino()).not.toContain(nueva?.clave);
  });

  it("la cuenta de otro municipio no se toca y se responde no encontrado", async () => {
    const antes = await credencialDe(ticul, gente.ticul.OPERADOR);

    await expect(
      restablecerContraseniaAction(
        formulario({ usuarioId: gente.ticul.OPERADOR }),
      ),
    ).rejects.toThrow("REDIRECT:");

    const despues = await credencialDe(ticul, gente.ticul.OPERADOR);

    expect(errorDelDestino()).toBe("no-encontrado");
    expect(despues?.password).toBe(antes?.password);
    expect(cookies.guardadas.size).toBe(0);
  });
});

describe("baja por la accion", () => {
  it("marca la baja sin borrar la fila", async () => {
    const usuarioId = await unaPersona();

    await expect(
      darDeBajaUsuarioAction(formulario({ usuarioId })),
    ).rejects.toThrow("REDIRECT:");

    const fila = await filaDe(motul, usuarioId);

    expect(fila?.id).toBe(usuarioId);
    expect(fila?.bajaEn).toBeInstanceOf(Date);
    expect(destino()).toBe("/usuarios?ok=baja");
  });

  it("la cuenta de otro municipio no se da de baja y se responde no encontrado", async () => {
    await expect(
      darDeBajaUsuarioAction(formulario({ usuarioId: gente.ticul.CONSULTA })),
    ).rejects.toThrow("REDIRECT:");

    expect(errorDelDestino()).toBe("no-encontrado");
    expect((await filaDe(ticul, gente.ticul.CONSULTA))?.bajaEn).toBeNull();
  });
});
