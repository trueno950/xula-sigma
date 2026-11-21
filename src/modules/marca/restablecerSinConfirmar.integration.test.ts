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
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { marcaDe } from "./escudoDePrueba";

/**
 * S2 contra Postgres: la casilla de confirmacion se exige en el borde y
 * **sin ella no cambia nada** —los colores del municipio quedan como estaban
 * hasta que la operadora confirma—. Con la casilla, el restablecimiento es el
 * de siempre.
 *
 * Vive en la raiz del modulo y no bajo `ui/` porque importa la accion y el
 * esquema reales a la vez; mismo molde que `usuarios/bajaSinConfirmar`.
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

const { escribirMarca } = await import("./escudoDePrueba");
const { restablecerColoresAction } = await import(
  "./ui/actions/restablecerColoresAction"
);

const GUINDA = "oklch(0.42 0.12 25)";
const ORO = "#ffd700";
const ESCUDO = "https://assets.prueba.local/motul/escudo-previo.png";

const COLORES_ELEGIDOS = {
  escudo: ESCUDO,
  primario: GUINDA,
  primarioTexto: "#ffffff",
  secundario: ORO,
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
  expect(restablecerColoresAction(formulario(campos))).rejects.toThrow(
    "REDIRECT",
  );

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
  await escribirMarca(COLORES_ELEGIDOS);
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("restablecerColoresAction y la casilla de confirmacion", () => {
  it("sin la casilla los colores siguen siendo los elegidos", async () => {
    await ejecutar({ ambito: "colores" });

    expect(destino().searchParams.get("error")).toBe(
      "restablecimiento-sin-confirmar",
    );
    expect(await marcaDe()).toEqual(COLORES_ELEGIDOS);
  });

  it("con la casilla el municipio vuelve a los colores por defecto y conserva el escudo", async () => {
    await ejecutar({ ambito: "colores", confirmar: "si" });

    expect(destino().searchParams.get("ok")).toBe("colores-restablecidos");
    expect(await marcaDe()).toEqual({ escudo: ESCUDO });
  });
});
