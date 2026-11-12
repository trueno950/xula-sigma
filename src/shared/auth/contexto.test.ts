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

const { contextoActual } = await import("./contexto");

/**
 * La consulta de `sigueActiva`: `withTenant` se mockea —la base no existe en
 * `unit`— y lo que se afirma es la decision, no el SQL. El camino real lo
 * cubre `contexto.integration.test.ts`.
 */
type FilaDeCuenta = { bajaEn: Date | null };

const txQueDevuelve = (filas: readonly FilaDeCuenta[]) => ({
  select: () => ({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(filas),
      }),
    }),
  }),
});

let filasDeCuenta: FilaDeCuenta[] = [{ bajaEn: null }];

describe("contextoActual", () => {
  beforeEach(() => {
    mocks.headers.mockReset();
    mocks.sesionActual.mockReset();
    mocks.exigirAyuntamiento.mockReset();
    mocks.ayuntamientoActual.mockReset();
    mocks.headers.mockResolvedValue(
      new Headers({ host: "motul.localhost:3000" }),
    );
    mocks.sesionActual.mockResolvedValue({
      user: { id: "usuario-1", rol: "CONSULTA" },
    });
    const ayuntamiento = { id: "ayuntamiento-1", subdominio: "motul" };
    mocks.exigirAyuntamiento.mockResolvedValue(ayuntamiento);
    mocks.ayuntamientoActual.mockResolvedValue(ayuntamiento);
    filasDeCuenta = [{ bajaEn: null }];
    mocks.withTenant.mockReset();
    mocks.withTenant.mockImplementation(
      (
        _ayuntamientoId: string,
        trabajo: (tx: ReturnType<typeof txQueDevuelve>) => unknown,
      ) => trabajo(txQueDevuelve(filasDeCuenta)),
    );
  });

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
    filasDeCuenta = [{ bajaEn: new Date() }];

    await expect(contextoActual()).resolves.toBeNull();
    expect(mocks.withTenant).toHaveBeenCalledOnce();
  });

  it("una sesion cuyo usuario ya no esta en el ayuntamiento tampoco", async () => {
    // Borrar la fila no es un camino de la aplicacion, pero el contexto no
    // puede inventar un actor que no existe.
    filasDeCuenta = [];

    await expect(contextoActual()).resolves.toBeNull();
  });
});
