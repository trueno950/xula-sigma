import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regla 8 de `AGENTS.md`: un recurso de otro tenant devuelve **404**, nunca
 * 403 y nunca una pantalla con 200.
 *
 * RLS ya hace que la busqueda de otro municipio vuelva `null`, asi que no
 * habia fuga: un id ajeno se veia igual que uno inexistente. Lo que faltaba
 * era el estado HTTP. Respondian 200 con "Esa persona no existe.", y un 200
 * dice "esta ruta es tuya y no hay nada"; el 404 dice "aca no hay nada que
 * ver", que es la unica respuesta que se puede dar sin contar de mas.
 *
 * `notFound` se moquea lanzando, como hace Next: la pagina tiene que
 * abortar ahi, no seguir armando pantalla.
 */
const notFoundMock = vi.hoisted(() =>
  vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
const contextoActualMock = vi.hoisted(() => vi.fn());
const personaPorIdMock = vi.hoisted(() => vi.fn());
const constanciaPorIdMock = vi.hoisted(() => vi.fn());
const lugarPorIdMock = vi.hoisted(() => vi.fn());
const subarbolMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));

vi.mock("@/modules/padron", () => ({
  comoPersonaId: (id: string) => id,
  personaPorId: personaPorIdMock,
}));

vi.mock("@/modules/constancias", () => ({
  BotonDeCancelacion: () => null,
  BotonDeImprimir: () => null,
  BotonDeReimpresion: () => null,
  comoConstanciaId: (id: string) => id,
  constanciaPorId: constanciaPorIdMock,
  documentosDelAyuntamiento: vi.fn().mockResolvedValue(null),
  esquemaDeSnapshot: { parse: (d: unknown) => d },
  FormularioDeEmision: () => null,
}));

vi.mock("@/modules/territorio", () => ({
  comoLugarId: (id: string) => id,
  FormularioDeMudanza: () => null,
  HistorialDeResidencias: () => null,
  historialDeResidencias: vi.fn().mockResolvedValue([]),
  listarCalles: vi.fn().mockResolvedValue([]),
  listarDomicilios: vi.fn().mockResolvedValue([]),
  listarLugares: vi.fn().mockResolvedValue([]),
  direccionVigenteDePersona: vi.fn().mockResolvedValue(null),
  listarRaices: vi.fn().mockResolvedValue([]),
  lugarPorId: lugarPorIdMock,
  subarbol: subarbolMock,
  VistaDeRaices: () => null,
}));

const { default: PaginaDePersona } = await import("./padron/[id]/page");
const { default: PaginaDeConstancia } = await import("./constancias/[id]/page");
const { default: PaginaDeTerritorio } = await import("./territorio/page");
const { default: PaginaDeEmision } = await import("./constancias/emitir/page");

const UUID_AJENO = "11111111-1111-4111-8111-111111111111";
const UUID_OTRO = "22222222-2222-4222-8222-222222222222";

const conId = (id: string) => ({
  params: Promise.resolve({ id }),
  searchParams: Promise.resolve({}),
});

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "u1", rol: "ADMIN_MUNICIPAL" },
    origen: "web",
  });
  subarbolMock.mockResolvedValue([]);
});

describe("un recurso que no es de este municipio", () => {
  it("en la ficha de una persona da 404", async () => {
    personaPorIdMock.mockResolvedValue(null);

    await expect(PaginaDePersona(conId(UUID_AJENO))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("en la ficha de una constancia da 404", async () => {
    constanciaPorIdMock.mockResolvedValue(null);

    await expect(PaginaDeConstancia(conId(UUID_AJENO))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFoundMock).toHaveBeenCalled();
  });

  /**
   * `/constancias/emitir?personaId=` toma el id de la barra igual que una
   * ficha, asi que es la misma superficie con otra forma de URL.
   */
  it("al emitir para una persona ajena da 404", async () => {
    personaPorIdMock.mockResolvedValue(null);

    await expect(
      PaginaDeEmision({
        searchParams: Promise.resolve({ personaId: UUID_AJENO }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  /**
   * El caso que no se veia: una raiz ajena volvia `null` y la pantalla
   * caia al listado de raices **del municipio propio**. Respondia 200 y
   * ademas mostraba otra cosa que la pedida, sin decirlo.
   */
  it("con una raiz ajena en la URL da 404, no el listado propio", async () => {
    lugarPorIdMock.mockResolvedValue(null);

    await expect(
      PaginaDeTerritorio({
        searchParams: Promise.resolve({ raiz: UUID_AJENO }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  /**
   * Con la raiz propia pero un `?nodo=` que no esta en su subarbol -de
   * otro municipio, o dado de baja-: antes renderizaba el panel vacio.
   */
  it("con un nodo que no cuelga de esa raiz da 404", async () => {
    lugarPorIdMock.mockResolvedValue({
      id: UUID_AJENO,
      tipo: "cabecera",
      nombre: "Motul",
    });

    await expect(
      PaginaDeTerritorio({
        searchParams: Promise.resolve({ raiz: UUID_AJENO, nodo: UUID_OTRO }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  /**
   * Regla 8 otra vez, con un segundo parametro roto en la URL: una raiz
   * ajena junto a un `vista` que no es ninguna de las cuatro validas.
   * `leerParametros` fallaba el objeto entero y `raizId` volvia
   * `undefined`, asi que la pagina nunca llegaba a preguntar si la raiz
   * es ajena.
   */
  it("con una raiz ajena y un vista invalido tambien da 404", async () => {
    lugarPorIdMock.mockResolvedValue(null);

    await expect(
      PaginaDeTerritorio({
        searchParams: Promise.resolve({
          raiz: UUID_AJENO,
          vista: "no-es-una-vista",
        }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  /**
   * Control positivo: sin el, los cuatro de arriba pasarian aunque la
   * pagina llamara a `notFound()` siempre.
   */
  it("sin raiz en la URL no da 404: es el listado del municipio", async () => {
    await expect(
      PaginaDeTerritorio({ searchParams: Promise.resolve({}) }),
    ).resolves.toBeTruthy();
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});
