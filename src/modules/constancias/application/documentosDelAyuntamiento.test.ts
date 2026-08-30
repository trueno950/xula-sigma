import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { RepositorioDeDocumentos } from "./puertosDeLectura";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearDocumentosDelAyuntamiento } = await import(
  "./documentosDelAyuntamiento"
);

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

describe("documentosDelAyuntamiento", () => {
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

  it("lee sin guarda de rol propia: cualquier rol de sesion puede leer", async () => {
    // Solo la escritura exige `puedeAdministrarDocumentos`
    // (`configurarDocumentos.test.ts`). La lectura la necesita cualquier
    // pantalla que muestre el estado de configuracion, sin distincion de
    // rol.
    vi.mocked(repositorio.leer).mockResolvedValue({
      firmanteNombre: "Juan Poot",
      firmanteCargo: "Secretario Municipal",
    });
    const documentosDelAyuntamiento =
      crearDocumentosDelAyuntamiento(repositorio);

    for (const rol of [
      "SUPER_ADMIN",
      "ADMIN_MUNICIPAL",
      "OPERADOR",
      "CONSULTA",
    ] as const) {
      const resultado = await documentosDelAyuntamiento(contextoCon(rol));

      expect(resultado).toEqual({
        firmanteNombre: "Juan Poot",
        firmanteCargo: "Secretario Municipal",
      });
    }
  });

  it("devuelve null cuando el bloque de firma no valida o no existe", async () => {
    vi.mocked(repositorio.leer).mockResolvedValue(null);
    const documentosDelAyuntamiento =
      crearDocumentosDelAyuntamiento(repositorio);

    expect(await documentosDelAyuntamiento(contextoCon("OPERADOR"))).toBeNull();
  });
});
