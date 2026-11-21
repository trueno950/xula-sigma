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
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  CABECERA_SUBDOMINIO,
  CABECERA_SUPERFICIE,
} from "@/shared/tenancy/cabeceras";
import { ayuntamientos, bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  subdominioMotul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";

/**
 * El escudo que falla, contra la base real (S1): la respuesta es 500 y la
 * bitacora queda como estaba. Lo que solo la base prueba es lo segundo —el
 * ROLLBACK de la transaccion que ya escribio la traza—; el 500 lo cubre
 * `route.test.ts`.
 *
 * Archivo aparte de `route.integration.test.ts` y no un caso mas ahi
 * adentro: ese archivo ya roza las 200 lineas por archivo de `AGENTS.md` y
 * esto es otra preocupacion —la transaccion, no el contenido del ZIP—.
 */

const cabecerasMock = vi.hoisted(() => vi.fn());
const contextoActualMock = vi.hoisted(() => vi.fn());
const leerEscudoMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({ headers: cabecerasMock }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/marca/composicion", () => ({
  lectorDeEscudo: { leer: leerEscudoMock },
}));

const { GET } = await import("./route");
const { peticionDeDescarga } = await import("./peticionDePrueba");

let gente: GentePorMunicipio;

const trazasDeExportacion = () =>
  withTenant(motul, (tx) =>
    tx
      .select()
      .from(bitacora)
      .where(eq(bitacora.accion, "EXPORTAR_AYUNTAMIENTO")),
  );

const marcaDeMotul = (marca: Record<string, unknown>) =>
  withTenant(motul, (tx) =>
    tx.update(ayuntamientos).set({ marca }).where(eq(ayuntamientos.id, motul)),
  );

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  vi.clearAllMocks();
  await marcaDeMotul({});
  cabecerasMock.mockResolvedValue({
    get: (nombre: string) => {
      if (nombre === CABECERA_SUPERFICIE) return "ayuntamiento";
      return nombre === CABECERA_SUBDOMINIO ? subdominioMotul : null;
    },
  });
  contextoActualMock.mockResolvedValue(
    contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
  );
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("GET /exportacion/descarga: escudo que falla", () => {
  it("deja 500 y ninguna traza nueva", async () => {
    const escudo = "https://assets.prueba.local/motul/escudo-x.png";
    await marcaDeMotul({ escudo });
    leerEscudoMock.mockRejectedValue(new Error("R2 no respondio"));
    const antes = await trazasDeExportacion();
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});

    const respuesta = await GET(peticionDeDescarga());

    expect(respuesta.status).toBe(500);
    // Sin ZIP no hay traza: la lectura del escudo va adentro de la misma
    // transaccion que la escribe (`exportar.ts`).
    expect(await trazasDeExportacion()).toHaveLength(antes.length);
    expect(leerEscudoMock).toHaveBeenCalledWith(motul, escudo);
    registro.mockRestore();
  });
});
