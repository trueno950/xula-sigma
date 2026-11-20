import { describe, expect, it, vi } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { obrasDeReporteSql } from "./obrasDeReporteSql";

/**
 * `tx` fabricado a mano, mismo patron que `lectorDeUbicacionesSql.test.ts`:
 * el adaptador no abre conexion -la abre `withTenant` en el caso de uso-, asi
 * que alcanza con un builder de Drizzle encadenable para mirar que consulta
 * arma.
 */
const txDeLectura = (filas: readonly Record<string, unknown>[]) => {
  const orderBy = vi.fn().mockResolvedValue(filas);
  const where = vi.fn().mockReturnValue({ orderBy });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return {
    tx: { select } as unknown as TransaccionTenant,
    select,
    from,
    where,
    orderBy,
  };
};

const REPORTE = "55555555-5555-4555-8555-555555555555";

describe("obrasDeReporteSql", () => {
  it("filtra por el reporte de origen y trae primero la obra mas reciente", async () => {
    const { tx, select, from, where, orderBy } = txDeLectura([]);

    await obrasDeReporteSql.listar(tx, REPORTE);

    expect(select).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
    expect(where.mock.calls[0]?.[0]).toBeDefined();
    expect(orderBy).toHaveBeenCalledTimes(1);
  });

  it("columnas explicitas: solo lo que la pantalla muestra, sin ayuntamientoId", async () => {
    const { tx, select } = txDeLectura([]);

    await obrasDeReporteSql.listar(tx, REPORTE);

    const columnas = select.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(columnas)).toEqual([
      "id",
      "tipo",
      "estado",
      "fechaDeOcurrencia",
    ]);
  });

  it("devuelve las filas tal como las trajo la consulta", async () => {
    const filas = [
      {
        id: "33333333-3333-4333-8333-333333333333",
        tipo: "BACHE",
        estado: "PLANIFICADA",
        fechaDeOcurrencia: "2026-11-20",
      },
    ];
    const { tx } = txDeLectura(filas);

    await expect(obrasDeReporteSql.listar(tx, REPORTE)).resolves.toBe(filas);
  });
});
