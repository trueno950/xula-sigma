import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, ValidacionError } from "@/shared/lib/errores";
import type { RepositorioDeDocumentos } from "./puertosDeLectura";

/**
 * Puertos mockeados (tasks.md 3.8): `withTenant` se fabrica a mano, mismo
 * patron que `editarLugar.test.ts`. `RepositorioDeDocumentos` es el unico
 * puerto de infraestructura que este caso de uso conoce.
 */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearConfigurarDocumentos } = await import("./configurarDocumentos");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

describe("configurarDocumentos", () => {
  const repositorio: RepositorioDeDocumentos = {
    leer: vi.fn(),
    escribir: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("rechaza sin puedeAdministrarDocumentos y no abre transaccion ni escribe", async () => {
    const configurarDocumentos = crearConfigurarDocumentos(repositorio);

    await expect(
      configurarDocumentos(
        { firmanteNombre: "Juan Poot", firmanteCargo: "Secretario" },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.escribir).not.toHaveBeenCalled();
  });

  it("compone el campo nuevo con lo existente y escribe el crudo, nunca la salida de Zod", async () => {
    // Una clave desconocida en el valor actual -por ejemplo un campo futuro
    // que este validador todavia no conoce- tiene que sobrevivir a la
    // escritura (design.md decision 8, mismo mecanismo que `marcaConEscudo`).
    vi.mocked(repositorio.leer).mockResolvedValue({
      firmanteNombre: "Juan Poot",
      firmanteCargo: "Secretario Municipal",
      campoFuturo: "no lo conoce el validador",
    });
    const configurarDocumentos = crearConfigurarDocumentos(repositorio);

    await configurarDocumentos(
      { leyendaDePie: "Documento sin validez fiscal." },
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.escribir).toHaveBeenCalledWith(
      expect.anything(),
      "motul",
      {
        firmanteNombre: "Juan Poot",
        firmanteCargo: "Secretario Municipal",
        campoFuturo: "no lo conoce el validador",
        leyendaDePie: "Documento sin validez fiscal.",
      },
    );
  });

  it("valida el resultado completo y rechaza sin escribir si no pasa", async () => {
    vi.mocked(repositorio.leer).mockResolvedValue(null);
    const configurarDocumentos = crearConfigurarDocumentos(repositorio);

    await expect(
      configurarDocumentos(
        { firmanteNombre: "Jo" },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(ValidacionError);

    expect(repositorio.escribir).not.toHaveBeenCalled();
  });

  it("una fila sin configurar previa se trata como objeto vacio", async () => {
    vi.mocked(repositorio.leer).mockResolvedValue(null);
    const configurarDocumentos = crearConfigurarDocumentos(repositorio);

    await configurarDocumentos(
      { firmanteNombre: "Juan Poot", firmanteCargo: "Secretario Municipal" },
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.escribir).toHaveBeenCalledWith(
      expect.anything(),
      "motul",
      { firmanteNombre: "Juan Poot", firmanteCargo: "Secretario Municipal" },
    );
  });
});
