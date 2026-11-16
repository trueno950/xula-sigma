import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, ValidacionError } from "@/shared/lib/errores";
import type { RepositorioDeConfiguracionDeReportes } from "./puertosDeConfiguracion";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearCambiarUmbralDeAtraso } = await import("./cambiarUmbralDeAtraso");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

describe("cambiarUmbralDeAtraso", () => {
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

  it.each(["OPERADOR", "CONSULTA", "SUPER_ADMIN"] as const)(
    "un %s no cambia el umbral: rechaza y no abre transaccion",
    async (rol) => {
      const cambiarUmbralDeAtraso = crearCambiarUmbralDeAtraso(repositorio);

      await expect(
        cambiarUmbralDeAtraso(30, contextoCon(rol)),
      ).rejects.toBeInstanceOf(NoAutorizadoError);

      expect(withTenantMock).not.toHaveBeenCalled();
      expect(repositorio.escribir).not.toHaveBeenCalled();
    },
  );

  it.each([0, 91, 7.5, Number.NaN])(
    "un umbral fuera de 1..90 (%s) es un error de validacion, no de permiso",
    async (dias) => {
      const cambiarUmbralDeAtraso = crearCambiarUmbralDeAtraso(repositorio);

      await expect(
        cambiarUmbralDeAtraso(dias, contextoCon("ADMIN_MUNICIPAL")),
      ).rejects.toBeInstanceOf(ValidacionError);

      expect(repositorio.escribir).not.toHaveBeenCalled();
    },
  );

  it("guarda con el ayuntamiento del contexto del servidor, nunca con uno del cliente", async () => {
    const cambiarUmbralDeAtraso = crearCambiarUmbralDeAtraso(repositorio);

    await cambiarUmbralDeAtraso(30, contextoCon("ADMIN_MUNICIPAL"));

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.anything());
    expect(repositorio.escribir).toHaveBeenCalledWith({}, "motul", 30);
  });
});
