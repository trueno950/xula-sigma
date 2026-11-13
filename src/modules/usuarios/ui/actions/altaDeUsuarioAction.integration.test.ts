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
import { LARGO_MINIMO, verificarClave } from "@/shared/auth/contrasenia";
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
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { decodificarClaveMostrada } from "../claveMostrada";

/**
 * El alta del panel contra Postgres (S3 y S4): formulario -> accion -> caso
 * de uso -> RLS. Lo que se afirma aca es que **la clave que la pantalla
 * muestra es la que quedo en la base**, y que un rol enviado a mano no crea
 * a nadie.
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

const { altaDeUsuarioAction } = await import("./altaDeUsuarioAction");

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

const personas = () =>
  withTenant(motul, (tx) => tx.select({ id: usuarios.id }).from(usuarios));

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
  contextoActualMock.mockResolvedValue(
    contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
  );
});

describe("alta por la accion", () => {
  it("crea la cuenta con la clave que la pantalla muestra una sola vez", async () => {
    await expect(
      altaDeUsuarioAction(
        formulario({
          nombre: "Persona Nueva",
          email: "mostrada@motul.example.com",
          rol: "OPERADOR",
        }),
      ),
    ).rejects.toThrow("REDIRECT:");

    const clave = mostrada();
    const usuarioId = clave?.usuarioId ?? "";
    const [fila] = await withTenant(motul, (tx) =>
      tx.select().from(usuarios).where(eq(usuarios.id, usuarioId)),
    );
    const [credencial] = await withTenant(motul, (tx) =>
      tx.select().from(cuentas).where(eq(cuentas.userId, usuarioId)),
    );

    expect(fila?.email).toBe("mostrada@motul.example.com");
    expect(fila?.rol).toBe("OPERADOR");
    expect(fila?.ayuntamientoId).toBe(motul);
    expect((clave?.clave ?? "").length).toBeGreaterThanOrEqual(LARGO_MINIMO);
    expect(
      await verificarClave(credencial?.password ?? "", clave?.clave ?? ""),
    ).toBe(true);
    expect(destino()).toBe(`/usuarios?clave=${clave?.token}&ok=alta`);
    expect(destino()).not.toContain(clave?.clave);
  });

  it("un rol ADMIN_MUNICIPAL enviado a mano no crea a nadie", async () => {
    const antes = await personas();

    await expect(
      altaDeUsuarioAction(
        formulario({
          nombre: "Quien Sea",
          email: "administrador-nuevo@motul.example.com",
          rol: "ADMIN_MUNICIPAL",
        }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(errorDelDestino()).toBe("rol-no-asignable");
    expect(cookies.guardadas.size).toBe(0);
    expect(await personas()).toHaveLength(antes.length);
  });

  it("un correo repetido se le explica a la operadora", async () => {
    await expect(
      altaDeUsuarioAction(
        formulario({
          nombre: "Otra Persona",
          email: "operador@motul.example.com",
          rol: "CONSULTA",
        }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(errorDelDestino()).toBe("correo-ya-registrado");
  });
});
