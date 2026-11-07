import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LIMITE_MAXIMO,
  TAMANO_DE_PAGINA,
} from "@/modules/territorio/application/registroDeDomicilios";
import type { ContextoActual } from "@/shared/auth/contexto";

const mocks = vi.hoisted(() => ({
  registroDeDomicilios: vi.fn(),
  subarbol: vi.fn(),
  listarCalles: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/modules/territorio", async () => ({
  ...(await vi.importActual<typeof import("@/modules/territorio/ui/acciones")>(
    "@/modules/territorio/ui/acciones",
  )),
  ...mocks,
}));

const { cargarDomiciliosDeLaVista } = await import("./cargaDeDomicilios");
const { resolverSeleccionDeTerritorio } = await import("./cargaDeTerritorio");

const contexto = {
  ayuntamientoId: "motul",
  usuario: { id: "u1", rol: "CONSULTA" },
  origen: "web",
} as unknown as ContextoActual;
const RAIZ = "11111111-1111-4111-8111-111111111111";
const COLONIA = "22222222-2222-4222-8222-222222222222";
const CALLE = "33333333-3333-4333-8333-333333333333";
const raiz = { id: RAIZ, tipo: "cabecera", nombre: "Tepakan" };
const colonia = { id: COLONIA, tipo: "colonia", nombre: "Centro" };
const pagina = { domicilios: [{ id: "d1" }], hayMas: true };

type Entrada = Parameters<typeof cargarDomiciliosDeLaVista>[0];

const cargar = ({
  vista = "lugares",
  nodo = raiz,
  domicilio = null,
  busqueda,
  limite,
}: {
  vista?: string;
  nodo?: typeof raiz;
  domicilio?: { calleId: string; numero: string | null } | null;
  busqueda?: string;
  limite?: number;
}) =>
  cargarDomiciliosDeLaVista({
    contexto,
    parametros: { vista, busqueda, limite },
    raiz,
    seleccion: { nodo, domicilio },
  } as unknown as Entrada);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.registroDeDomicilios.mockResolvedValue(pagina);
  mocks.subarbol.mockResolvedValue([]);
  mocks.listarCalles.mockResolvedValue([]);
});

describe("cargarDomiciliosDeLaVista", () => {
  it("con la pestana Lugares no lee ningun domicilio", async () => {
    const carga = await cargar({ vista: "lugares" });

    expect(mocks.registroDeDomicilios).not.toHaveBeenCalled();
    expect(carga).toEqual({ domicilios: undefined, mismaDireccion: [] });
  });

  it("con la pestana Calles tampoco", async () => {
    await cargar({ vista: "calles" });

    expect(mocks.registroDeDomicilios).not.toHaveBeenCalled();
  });

  it("con Domicilios lee la pagina del subarbol del nodo con la busqueda y el limite", async () => {
    const carga = await cargar({
      vista: "domicilios",
      nodo: colonia,
      busqueda: "20",
      limite: 100,
    });

    expect(mocks.registroDeDomicilios).toHaveBeenCalledWith(
      { raizId: COLONIA, busqueda: "20" },
      contexto,
      100,
    );
    expect(carga.domicilios).toEqual({
      filas: pagina.domicilios,
      hayMas: true,
    });
  });

  it("sin limite pide la primera pagina", async () => {
    await cargar({ vista: "domicilios" });

    expect(mocks.registroDeDomicilios).toHaveBeenCalledWith(
      { raizId: RAIZ },
      contexto,
      TAMANO_DE_PAGINA,
    );
  });

  it("una colonia sin pestana Lugares cae en Domicilios y la lee", async () => {
    await cargar({ vista: "lugares", nodo: colonia });

    expect(mocks.registroDeDomicilios).toHaveBeenCalledTimes(1);
  });

  it("con un domicilio abierto lee los de su calle y numero en el asentamiento", async () => {
    const carga = await cargar({
      vista: "lugares",
      domicilio: { calleId: CALLE, numero: "21" },
    });

    expect(mocks.registroDeDomicilios).toHaveBeenCalledWith(
      { raizId: RAIZ, calleId: CALLE, numero: "21" },
      contexto,
      LIMITE_MAXIMO,
    );
    expect(carga.mismaDireccion).toEqual(pagina.domicilios);
  });

  it("un domicilio sin numero no tiene direccion que comparar", async () => {
    await cargar({ domicilio: { calleId: CALLE, numero: null } });

    expect(mocks.registroDeDomicilios).not.toHaveBeenCalled();
  });
});

describe("resolverSeleccionDeTerritorio", () => {
  it("lee el subarbol sin domicilios", async () => {
    await resolverSeleccionDeTerritorio(
      contexto,
      { vista: "lugares" } as Parameters<
        typeof resolverSeleccionDeTerritorio
      >[1],
      raiz as Parameters<typeof resolverSeleccionDeTerritorio>[2],
    );

    expect(mocks.subarbol).toHaveBeenCalledWith(RAIZ, contexto, {
      soloLugares: true,
    });
  });
});
