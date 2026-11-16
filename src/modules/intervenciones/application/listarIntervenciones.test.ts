import { describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));

const { crearListarIntervenciones } = await import("./listarIntervenciones");

const tx = { marca: "tx-de-la-bandeja" };
const contexto: ContextoActual = {
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

withTenantMock.mockImplementation(
  (_id: unknown, trabajo: (actual: unknown) => unknown) => trabajo(tx),
);

describe("listarIntervenciones", () => {
  it("lista bajo el tenant del contexto y pasa los tres filtros", async () => {
    const listar = vi.fn().mockResolvedValue([]);
    const leer = crearListarIntervenciones({ listar });
    const filtros = {
      estado: "PLANIFICADA" as const,
      tipo: "PAVIMENTACION" as const,
      lugarId: "22222222-2222-4222-8222-222222222222",
    };

    await leer(filtros, contexto);

    expect(withTenantMock).toHaveBeenCalledWith(
      contexto.ayuntamientoId,
      expect.any(Function),
    );
    expect(listar).toHaveBeenCalledWith(tx, filtros);
  });

  it("sin filtros lista la bandeja completa, tambien para solo lectura", async () => {
    const listar = vi.fn().mockResolvedValue([]);
    const leer = crearListarIntervenciones({ listar });

    await leer({}, contexto);

    expect(listar).toHaveBeenCalledWith(tx, {});
    expect(contexto.usuario.rol).toBe("CONSULTA");
  });

  it("devuelve lo que el lector trajo, sin reordenar ni recortar", async () => {
    const filas = [{ id: "una" }, { id: "otra" }];
    const leer = crearListarIntervenciones({
      listar: vi.fn().mockResolvedValue(filas),
    });

    await expect(leer({}, contexto)).resolves.toBe(filas);
  });
});
