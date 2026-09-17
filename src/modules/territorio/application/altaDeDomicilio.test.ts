import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import {
  comoCalleId,
  comoLugarId,
  type LugarId,
  TransversalRepetidaError,
  ZonaIncoherenteError,
} from "../domain";
import type {
  CalleGuardada,
  LugarGuardado,
  RepositorioDeCalles,
  RepositorioDeLugares,
} from "./puertos";
import type { RepositorioDeDomicilios } from "./puertosDeDomicilios";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearAltaDeDomicilio } = await import("./altaDeDomicilio");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const asentamientoId = comoLugarId("11111111-1111-4111-8111-111111111111");
const otroAsentamientoId = comoLugarId("55555555-5555-4555-8555-555555555555");
const lugarId = comoLugarId("66666666-6666-4666-8666-666666666666");
const calleId = comoCalleId("22222222-2222-4222-8222-222222222222");
const entreCalleAId = comoCalleId("33333333-3333-4333-8333-333333333333");
const entreCalleBId = comoCalleId("44444444-4444-4444-8444-444444444444");

const lugarGuardado: LugarGuardado = {
  id: lugarId,
  tipo: "colonia",
  nombre: "Colonia de prueba",
  padreId: asentamientoId,
  bajaEn: null,
};

const asentamientoGuardado: LugarGuardado = {
  id: asentamientoId,
  tipo: "cabecera",
  nombre: "Motul",
  padreId: null,
  bajaEn: null,
};

const calleGuardada: CalleGuardada = {
  id: calleId,
  nombre: "Calle 21",
  lugarId: asentamientoId,
  punto: null,
  bajaEn: null,
};

describe("altaDeDomicilio", () => {
  const repositorio: RepositorioDeDomicilios = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn(),
    actualizar: vi.fn(),
    porLugarYSubarbol: vi.fn(),
    porCalle: vi.fn(),
    listar: vi.fn(),
  };
  const repositorioDeLugares: RepositorioDeLugares = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    actualizar: vi.fn(),
    contarHijosActivos: vi.fn(),
    contarDomiciliosColgados: vi.fn(),
    subarbol: vi.fn(),
    listarRaices: vi.fn(),
    listarLugares: vi.fn(),
  };
  const repositorioDeCalles: RepositorioDeCalles = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn(),
    actualizar: vi.fn(),
    contarDomiciliosQueLaUsan: vi.fn(),
    listarPorLugar: vi.fn(),
    registrarEventoDeAlta: vi.fn(),
    registrarEventoDeRenombre: vi.fn(),
    registrarEventoDeReparenteo: vi.fn(),
    registrarEventoDeUbicacion: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(repositorioDeLugares.buscarPorId).mockImplementation(
      async (_tx, id) =>
        id === lugarId ? lugarGuardado : asentamientoGuardado,
    );
    vi.mocked(repositorioDeCalles.buscarPorId).mockResolvedValue(calleGuardada);
    vi.mocked(repositorioDeCalles.bloquearPorId).mockResolvedValue(
      calleGuardada,
    );
  });

  const datosValidos = {
    lugarId,
    calleId,
    numero: "21",
    entreCalleAId: null,
    entreCalleBId: null,
    referencia: null,
  };

  it("rechaza sin puedeEscribir y no abre transaccion ni escribe", async () => {
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    await expect(
      altaDeDomicilio(datosValidos, contextoCon("CONSULTA")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("rechaza como si no existiera un lugarId de otro tenant o inexistente", async () => {
    vi.mocked(repositorioDeLugares.buscarPorId).mockResolvedValue(null);
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    await expect(
      altaDeDomicilio(datosValidos, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("rechaza como si no existiera un calleId de otro tenant o inexistente", async () => {
    vi.mocked(repositorioDeCalles.bloquearPorId).mockResolvedValue(null);
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    await expect(
      altaDeDomicilio(datosValidos, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("rechaza una calle de otro asentamiento del mismo tenant como zona incoherente", async () => {
    vi.mocked(repositorioDeCalles.bloquearPorId).mockResolvedValue({
      ...calleGuardada,
      lugarId: otroAsentamientoId,
    });
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    await expect(
      altaDeDomicilio(datosValidos, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(ZonaIncoherenteError);

    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("sin nivel declarado, el domicilio cae en el asentamiento de la calle", async () => {
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    await altaDeDomicilio(
      {
        calleId,
        numero: "21",
        entreCalleAId: null,
        entreCalleBId: null,
        referencia: null,
      },
      contextoCon("OPERADOR"),
    );

    expect(repositorio.crear).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lugarId: asentamientoId }),
    );
  });

  it("rechaza una transversal de otro asentamiento aunque la calle principal coincida", async () => {
    vi.mocked(repositorioDeCalles.bloquearPorId).mockImplementation(
      async (_tx, id) =>
        id === entreCalleAId
          ? { ...calleGuardada, id, lugarId: otroAsentamientoId }
          : { ...calleGuardada, id },
    );
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    await expect(
      altaDeDomicilio(
        { ...datosValidos, entreCalleAId },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(ZonaIncoherenteError);

    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  const siguientes = (
    manzanaPadreId: LugarId,
  ): ReadonlyMap<LugarId, LugarGuardado> => {
    const manzanaId = comoLugarId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    const sectorId = comoLugarId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

    return new Map<LugarId, LugarGuardado>([
      [
        manzanaId,
        {
          id: manzanaId,
          tipo: "manzana",
          nombre: "San Pedro",
          padreId: manzanaPadreId,
          bajaEn: null,
        },
      ],
      [
        sectorId,
        {
          id: sectorId,
          tipo: "sector",
          nombre: "2",
          padreId: lugarId,
          bajaEn: null,
        },
      ],
      [lugarId, lugarGuardado],
      [asentamientoId, asentamientoGuardado],
    ]);
  };

  it("acepta una zona declarada que es el lugar mas profundo o un ancestro", async () => {
    const porId = siguientes(
      comoLugarId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
    );
    const manzanaId = comoLugarId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    const sectorId = comoLugarId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    vi.mocked(repositorioDeLugares.buscarPorId).mockImplementation(
      async (_tx, id) => porId.get(id) ?? null,
    );
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    await altaDeDomicilio(
      {
        ...datosValidos,
        lugarId: manzanaId,
        nivelesDeclarados: [lugarId, sectorId, manzanaId],
      },
      contextoCon("OPERADOR"),
    );

    expect(repositorio.crear).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lugarId: manzanaId }),
    );
  });

  it("acepta una manzana colgada directo de la colonia, sin sector", async () => {
    const porId = siguientes(lugarId);
    const manzanaId = comoLugarId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    vi.mocked(repositorioDeLugares.buscarPorId).mockImplementation(
      async (_tx, id) => porId.get(id) ?? null,
    );
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    await altaDeDomicilio(
      {
        ...datosValidos,
        lugarId: manzanaId,
        nivelesDeclarados: [lugarId, manzanaId],
      },
      contextoCon("OPERADOR"),
    );

    expect(repositorio.crear).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lugarId: manzanaId }),
    );
  });

  it("rechaza un nivel declarado que no pertenece a la cadena del lugar", async () => {
    const porId = siguientes(lugarId);
    const manzanaId = comoLugarId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    vi.mocked(repositorioDeLugares.buscarPorId).mockImplementation(
      async (_tx, id) => porId.get(id) ?? null,
    );
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    await expect(
      altaDeDomicilio(
        {
          ...datosValidos,
          lugarId: manzanaId,
          nivelesDeclarados: [lugarId, otroAsentamientoId],
        },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(ZonaIncoherenteError);

    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("rechaza en vez de colgarse cuando la cadena de padres tiene un ciclo", async () => {
    const cicloA = comoLugarId("77777777-7777-4777-8777-777777777777");
    const cicloB = comoLugarId("88888888-8888-4888-8888-888888888888");
    const enCicloA: LugarGuardado = {
      id: cicloA,
      tipo: "colonia",
      nombre: "Ciclo A",
      padreId: cicloB,
      bajaEn: null,
    };
    const enCicloB: LugarGuardado = {
      id: cicloB,
      tipo: "sector",
      nombre: "Ciclo B",
      padreId: cicloA,
      bajaEn: null,
    };
    vi.mocked(repositorioDeLugares.buscarPorId).mockImplementation(
      async (_tx, id) => (id === cicloA ? enCicloA : enCicloB),
    );
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    await expect(
      altaDeDomicilio(
        { ...datosValidos, lugarId: cicloA },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("numero ausente queda null, nunca la cadena S/N", async () => {
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    await altaDeDomicilio(
      { ...datosValidos, numero: "" },
      contextoCon("OPERADOR"),
    );

    expect(repositorio.crear).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ numero: null }),
    );
  });

  it("rechaza transversal repetida antes de escribir", async () => {
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    await expect(
      altaDeDomicilio(
        { ...datosValidos, entreCalleAId: calleId, entreCalleBId },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(TransversalRepetidaError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("da de alta con transversales distintas y registra bitacora", async () => {
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    const { id } = await altaDeDomicilio(
      {
        ...datosValidos,
        entreCalleAId,
        entreCalleBId,
        referencia: "frente al parque",
      },
      contextoCon("OPERADOR"),
    );

    expect(repositorio.crear).toHaveBeenCalledWith(expect.anything(), {
      id,
      ayuntamientoId: "motul",
      lugarId,
      calleId,
      numero: "21",
      entreCalleAId,
      entreCalleBId,
      referencia: "frente al parque",
    });
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ayuntamientoId: "motul",
        actor: "usuario-1",
        origen: "web",
        accion: "ALTA_DOMICILIO",
        entidad: "domicilios",
        entidadId: id,
      }),
    );
    expect(repositorioDeLugares.buscarPorId).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      lugarId,
    );
    expect(repositorioDeLugares.buscarPorId).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      asentamientoId,
    );
  });

  it("bloquea todas las calles referenciadas en orden estable antes de insertar", async () => {
    const eventos: string[] = [];
    vi.mocked(repositorioDeCalles.bloquearPorId).mockImplementation(
      async (_tx, id) => {
        eventos.push(`bloquear:${id}`);
        return { ...calleGuardada, id };
      },
    );
    vi.mocked(repositorio.crear).mockImplementation(async () => {
      eventos.push("crear");
    });
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    await altaDeDomicilio(
      {
        ...datosValidos,
        entreCalleAId: entreCalleBId,
        entreCalleBId: entreCalleAId,
      },
      contextoCon("OPERADOR"),
    );

    expect(eventos).toEqual([
      `bloquear:${calleId}`,
      `bloquear:${entreCalleAId}`,
      `bloquear:${entreCalleBId}`,
      "crear",
    ]);
  });
});
