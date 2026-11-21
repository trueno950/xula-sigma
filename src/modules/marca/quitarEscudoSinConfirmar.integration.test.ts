import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { leerMarca } from "@/shared/marca";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { escribirMarca, marcaDe } from "./escudoDePrueba";

/**
 * S7 en el borde: la casilla de «Quitar escudo» se exige en la accion y **sin
 * ella no cambia nada** —la referencia sigue en la fila, el objeto sigue en el
 * almacen y la pantalla vuelve con su codigo—. Con la casilla, el escudo se va
 * y los colores quedan.
 *
 * Mismo molde que `restablecerSinConfirmar.integration.test.ts`: importa la
 * accion y el esquema reales a la vez, por eso vive en la raiz del modulo.
 */

const contextoActualMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((destino: string): never => {
    throw new Error(`REDIRECT:${destino}`);
  }),
);

vi.mock("@/shared/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/auth")>()),
  contextoActual: contextoActualMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { quitarEscudoAction } = await import("./ui/actions/quitarEscudoAction");

const ESCUDO = "https://assets.prueba.local/motul/escudo-previo.png";

const CON_ESCUDO = {
  escudo: ESCUDO,
  primario: "oklch(0.42 0.12 25)",
  primarioTexto: "#ffffff",
  secundario: "#ffd700",
};

const SIN_ESCUDO = {
  primario: CON_ESCUDO.primario,
  primarioTexto: CON_ESCUDO.primarioTexto,
  secundario: CON_ESCUDO.secundario,
};

let gente: GentePorMunicipio;

const formulario = (campos: Record<string, string>): FormData => {
  const formData = new FormData();

  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }

  return formData;
};

const destino = (): URL => {
  const [ruta] = redirectMock.mock.calls.at(-1) ?? [""];

  return new URL(ruta, "http://motul.xula.localhost");
};

const ejecutar = (campos: Record<string, string>) =>
  expect(quitarEscudoAction(formulario(campos))).rejects.toThrow("REDIRECT");

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  redirectMock.mockClear();
  contextoActualMock.mockReset();
  contextoActualMock.mockResolvedValue(
    contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
  );
  await escribirMarca(CON_ESCUDO);
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("quitarEscudoAction y la casilla de confirmacion", () => {
  it("sin la casilla el escudo sigue siendo el que estaba", async () => {
    await ejecutar({ ambito: "escudo" });

    expect(destino().searchParams.get("error")).toBe("quitar-sin-confirmar");
    expect(await marcaDe()).toEqual(CON_ESCUDO);
    expect(leerMarca(await marcaDe()).escudo).toBe(ESCUDO);
  });

  it("con la casilla el escudo se va y los colores quedan", async () => {
    await ejecutar({ ambito: "escudo", confirmar: "si" });

    expect(destino().searchParams.get("ok")).toBe("escudo-quitado");
    expect(await marcaDe()).toEqual(SIN_ESCUDO);
    expect(leerMarca(await marcaDe()).escudo).toBeUndefined();
  });
});
