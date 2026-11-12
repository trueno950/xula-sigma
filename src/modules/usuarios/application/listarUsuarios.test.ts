import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { Rol } from "@/shared/auth/roles";
import type { UsuarioDelPanel } from "../domain";
import { crearDirectorioDePrueba } from "./directorioDePrueba";

/** Por que se mockea `withTenant`: `listarUsuarios.ts`. */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearListarUsuarios } = await import("./listarUsuarios");

const TX = { transaccion: "de prueba" };

const contexto = (rol: Rol): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const fila: UsuarioDelPanel = {
  id: "usuario-2",
  nombre: "Operadora de Mostrador",
  email: "operadora@motul.example.com",
  rol: "OPERADOR",
  dadoDeBaja: false,
};

beforeEach(() => {
  withTenantMock
    .mockReset()
    .mockImplementation((_tenant: string, trabajo: (tx: unknown) => unknown) =>
      trabajo(TX),
    );
});

describe("listarUsuarios", () => {
  it("devuelve lo que el directorio trae del tenant del contexto", async () => {
    const directorio = crearDirectorioDePrueba([fila]);
    const listarUsuarios = crearListarUsuarios(directorio);

    await expect(listarUsuarios(contexto("ADMIN_MUNICIPAL"))).resolves.toEqual([
      fila,
    ]);
    expect(withTenantMock).toHaveBeenCalledWith(
      contexto("ADMIN_MUNICIPAL").ayuntamientoId,
      expect.any(Function),
    );
  });

  it.each(["OPERADOR", "CONSULTA", "SUPER_ADMIN"] as const)(
    "%s no puede listar y no se abre transaccion",
    async (rol) => {
      const directorio = crearDirectorioDePrueba([fila]);
      const listarUsuarios = crearListarUsuarios(directorio);

      await expect(listarUsuarios(contexto(rol))).rejects.toMatchObject({
        codigo: "NO_AUTORIZADO",
      });
      expect(withTenantMock).not.toHaveBeenCalled();
    },
  );
});
