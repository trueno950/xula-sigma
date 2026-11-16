import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { RepositorioDeReportes } from "./puertos";

/**
 * Los conteos de la bandeja (S2). Se leen bajo `withTenant` como cualquier
 * otra lectura del modulo -la garantia es RLS, no un `WHERE` a mano- y sin
 * guarda de rol: contar lo que ya se puede listar no es administrar. La
 * integracion con Postgres esta en `filtrosYConteos.integration.test.ts`.
 */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearContarReportes } = await import("./contarReportes");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

describe("contarReportes", () => {
  const repositorio = { contar: vi.fn() } as unknown as RepositorioDeReportes;

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(repositorio.contar).mockResolvedValue({
      porEstado: [{ estado: "RECIBIDO", conteo: 2 }],
      porArea: [{ area: null, conteo: 2 }],
    });
  });

  it("compone los ceros del catalogo y suma el total", async () => {
    const contarReportes = crearContarReportes(repositorio);

    await expect(contarReportes({}, contextoCon("OPERADOR"))).resolves.toEqual({
      porEstado: {
        RECIBIDO: 2,
        EN_ATENCION: 0,
        RESUELTO: 0,
        RECHAZADO: 0,
      },
      porArea: [{ area: null, conteo: 2 }],
      total: 2,
    });
  });

  it("pasa los filtros y la busqueda al repositorio dentro del tenant del contexto", async () => {
    const contarReportes = crearContarReportes(repositorio);
    const filtros = { area: "OBRAS_PUBLICAS" as const };

    await contarReportes({ filtros, cadena: "bache" }, contextoCon("CONSULTA"));

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(repositorio.contar).toHaveBeenCalledWith(
      {},
      { filtros, cadena: "bache" },
    );
  });

  it("leer los conteos no exige permiso de administracion", async () => {
    const contarReportes = crearContarReportes(repositorio);

    await expect(
      contarReportes({}, contextoCon("CONSULTA")),
    ).resolves.toMatchObject({ total: 2 });
  });
});
