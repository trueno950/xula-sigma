import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  sesionActual: vi.fn(),
  exigirAyuntamiento: vi.fn(),
  ayuntamientoActual: vi.fn(),
  withTenant: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("./sesion", () => ({ sesionActual: mocks.sesionActual }));
vi.mock("@/shared/tenancy/contexto", () => ({
  exigirAyuntamiento: mocks.exigirAyuntamiento,
  ayuntamientoActual: mocks.ayuntamientoActual,
}));
vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: mocks.withTenant,
}));

const { contextoActual, contextoDeCambioDeClave } = await import("./contexto");

/**
 * La consulta de `sigueActiva` y de la marca temporal: `withTenant` se
 * mockea —la base no existe en `unit`— y lo que se afirma es la decision, no
 * el SQL. El camino real lo cubre `contexto.integration.test.ts`.
 */
type FilaDeCuenta = { bajaEn: Date | null; claveTemporalEn: Date | null };

const txQueDevuelve = (filas: readonly FilaDeCuenta[]) => ({
  select: () => ({
    from: () => ({
      leftJoin: () => ({
        where: () => ({
          limit: () => Promise.resolve(filas),
        }),
      }),
    }),
  }),
});

let filasDeCuenta: FilaDeCuenta[] = [{ bajaEn: null, claveTemporalEn: null }];

/**
 * El instante en que se abrio la sesion del request, y una marca anterior:
 * el caso normal es que la temporal se haya emitido antes de entrar con ella.
 */
const SESION_CREADA_EN = new Date("2026-03-10T12:00:00.000Z");
const MARCA_ANTERIOR = new Date("2026-03-10T11:00:00.000Z");

/** El request de un municipio con sesion, que es el caso comun. */
const prepararElRequest = () => {
  mocks.headers.mockReset();
  mocks.sesionActual.mockReset();
  mocks.exigirAyuntamiento.mockReset();
  mocks.ayuntamientoActual.mockReset();
  mocks.headers.mockResolvedValue(
    new Headers({ host: "motul.localhost:3000" }),
  );
  mocks.sesionActual.mockResolvedValue({
    session: { id: "sesion-1", createdAt: SESION_CREADA_EN },
    user: { id: "usuario-1", rol: "CONSULTA" },
  });
  const ayuntamiento = { id: "ayuntamiento-1", subdominio: "motul" };
  mocks.exigirAyuntamiento.mockResolvedValue(ayuntamiento);
  mocks.ayuntamientoActual.mockResolvedValue(ayuntamiento);
  filasDeCuenta = [{ bajaEn: null, claveTemporalEn: null }];
  mocks.withTenant.mockReset();
  mocks.withTenant.mockImplementation(
    (
      _ayuntamientoId: string,
      trabajo: (tx: ReturnType<typeof txQueDevuelve>) => unknown,
    ) => trabajo(txQueDevuelve(filasDeCuenta)),
  );
};

describe("contextoActual", () => {
  beforeEach(prepararElRequest);

  it("usa exigirAyuntamiento cuando hay sesion", async () => {
    const contexto = await contextoActual();

    expect(contexto?.ayuntamientoId).toBe("ayuntamiento-1");
    expect(mocks.exigirAyuntamiento).toHaveBeenCalledOnce();
    expect(mocks.ayuntamientoActual).not.toHaveBeenCalled();
  });

  it("devuelve null sin consultar tenancy cuando no hay sesion", async () => {
    mocks.sesionActual.mockResolvedValue(null);

    await expect(contextoActual()).resolves.toBeNull();
    expect(mocks.exigirAyuntamiento).not.toHaveBeenCalled();
    expect(mocks.ayuntamientoActual).not.toHaveBeenCalled();
  });

  it("propaga el corte cuando el municipio del subdominio no existe", async () => {
    mocks.exigirAyuntamiento.mockImplementation(() => {
      throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
    });

    await expect(contextoActual()).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });

  it("una cuenta dada de baja no resuelve contexto aunque la sesion siga firmada", async () => {
    filasDeCuenta = [{ bajaEn: new Date(), claveTemporalEn: null }];

    await expect(contextoActual()).resolves.toBeNull();
    expect(mocks.withTenant).toHaveBeenCalledOnce();
  });

  it("una sesion abierta con clave temporal no autoriza nada", async () => {
    filasDeCuenta = [{ bajaEn: null, claveTemporalEn: new Date() }];

    await expect(contextoActual()).resolves.toBeNull();
  });

  it("una sesion cuyo usuario ya no esta en el ayuntamiento tampoco", async () => {
    // Borrar la fila no es un camino de la aplicacion, pero el contexto no
    // puede inventar un actor que no existe.
    filasDeCuenta = [];

    await expect(contextoActual()).resolves.toBeNull();
  });
});

describe("contextoDeCambioDeClave", () => {
  beforeEach(prepararElRequest);

  it("devuelve la sesion y el tenant mientras la temporal siga puesta", async () => {
    filasDeCuenta = [{ bajaEn: null, claveTemporalEn: MARCA_ANTERIOR }];

    await expect(contextoDeCambioDeClave()).resolves.toEqual({
      ayuntamientoId: "ayuntamiento-1",
      usuarioId: "usuario-1",
      sesionId: "sesion-1",
      claveTemporalEn: MARCA_ANTERIOR,
      origen: expect.any(String),
    });
  });

  /**
   * Una sesion abierta antes de que se emitiera la temporal actual no la
   * conoce: la abrio una clave anterior. Admitirla dejaria que una cookie
   * vieja —la que el restablecimiento borro de la base pero que puede haber
   * sobrevivido en otro lado— pusiera la clave propia.
   */
  it("una sesion abierta antes de la marca no abre el cambio obligatorio", async () => {
    const marca = new Date(SESION_CREADA_EN.getTime() + 1_000);
    filasDeCuenta = [{ bajaEn: null, claveTemporalEn: marca }];

    await expect(contextoDeCambioDeClave()).resolves.toBeNull();
  });

  it("una sesion abierta en el mismo instante que la marca si", async () => {
    filasDeCuenta = [{ bajaEn: null, claveTemporalEn: SESION_CREADA_EN }];

    await expect(contextoDeCambioDeClave()).resolves.not.toBeNull();
  });

  it("es null cuando la credencial ya es la clave propia", async () => {
    filasDeCuenta = [{ bajaEn: null, claveTemporalEn: null }];

    await expect(contextoDeCambioDeClave()).resolves.toBeNull();
  });

  it("es null sin sesion y no consulta tenancy", async () => {
    mocks.sesionActual.mockResolvedValue(null);

    await expect(contextoDeCambioDeClave()).resolves.toBeNull();
    expect(mocks.exigirAyuntamiento).not.toHaveBeenCalled();
  });

  it("es null para una cuenta dada de baja", async () => {
    filasDeCuenta = [{ bajaEn: new Date(), claveTemporalEn: MARCA_ANTERIOR }];

    await expect(contextoDeCambioDeClave()).resolves.toBeNull();
  });
});
