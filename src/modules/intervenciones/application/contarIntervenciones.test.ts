import { describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));

const { crearContarIntervenciones } = await import("./contarIntervenciones");

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

describe("contarIntervenciones", () => {
  it("cuenta bajo el tenant del contexto con los filtros recibidos", async () => {
    const contar = vi.fn().mockResolvedValue([]);
    const contarIntervenciones = crearContarIntervenciones({ contar });
    const filtros = {
      tipo: "FUGA" as const,
      lugarId: "22222222-2222-4222-8222-222222222222",
    };

    await contarIntervenciones(filtros, contexto);

    expect(withTenantMock).toHaveBeenCalledWith(
      contexto.ayuntamientoId,
      expect.any(Function),
    );
    expect(contar).toHaveBeenCalledWith(tx, filtros);
  });

  it("completa los estados sin filas en cero y suma el total", async () => {
    const contarIntervenciones = crearContarIntervenciones({
      contar: vi.fn().mockResolvedValue([{ estado: "PLANIFICADA", conteo: 4 }]),
    });

    await expect(contarIntervenciones({}, contexto)).resolves.toEqual({
      porEstado: {
        PLANIFICADA: 4,
        EN_EJECUCION: 0,
        FINALIZADA: 0,
        CANCELADA: 0,
      },
      total: 4,
    });
  });
});
