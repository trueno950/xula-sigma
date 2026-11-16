import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { RepositorioDeConfiguracionDeReportes } from "./puertosDeConfiguracion";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearLeerUmbralDeAtraso } = await import("./leerUmbralDeAtraso");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

describe("leerUmbralDeAtraso", () => {
  const repositorio: RepositorioDeConfiguracionDeReportes = {
    leer: vi.fn(),
    escribir: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("un municipio sin fila usa el valor por defecto de 7 dias", async () => {
    vi.mocked(repositorio.leer).mockResolvedValue(null);
    const leerUmbralDeAtraso = crearLeerUmbralDeAtraso(repositorio);

    await expect(leerUmbralDeAtraso(contextoCon("OPERADOR"))).resolves.toBe(7);
  });

  it("un municipio que ya lo configuro lee lo suyo", async () => {
    vi.mocked(repositorio.leer).mockResolvedValue(30);
    const leerUmbralDeAtraso = crearLeerUmbralDeAtraso(repositorio);

    await expect(
      leerUmbralDeAtraso(contextoCon("ADMIN_MUNICIPAL")),
    ).resolves.toBe(30);
  });

  it("leer no exige permiso de administracion: la bandeja la ve cualquier rol", async () => {
    vi.mocked(repositorio.leer).mockResolvedValue(3);
    const leerUmbralDeAtraso = crearLeerUmbralDeAtraso(repositorio);

    await expect(leerUmbralDeAtraso(contextoCon("CONSULTA"))).resolves.toBe(3);
    expect(repositorio.leer).toHaveBeenCalledWith({}, "motul");
  });
});
