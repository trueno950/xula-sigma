import { describe, expect, it, vi } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { comoIntervencionId } from "../domain";
import { lectorDeHistorialDeIntervencionesSql } from "./lectorDeHistorialDeIntervencionesSql";

/**
 * `tx` fabricado a mano, mismo patron que `obrasDeReporteSql.test.ts`: el
 * adaptador no abre conexion -la abre `withTenant` en el caso de uso-, asi
 * que alcanza con builders encadenables para mirar que consulta arma y como
 * traduce las filas.
 */
const txDeLectura = (
  revisiones: readonly Record<string, unknown>[],
  registros: readonly Record<string, unknown>[],
) => {
  const orderBy = vi.fn().mockResolvedValue(revisiones);
  const whereDeRevisiones = vi.fn().mockReturnValue({ orderBy });
  const innerJoin = vi.fn().mockReturnValue({ where: whereDeRevisiones });
  const whereDeUsuarios = vi.fn().mockResolvedValue(registros);
  const from = vi.fn().mockReturnValue({
    innerJoin,
    where: whereDeUsuarios,
  });
  const select = vi.fn().mockReturnValue({ from });

  return {
    tx: { select } as unknown as TransaccionTenant,
    select,
    innerJoin,
    whereDeRevisiones,
    whereDeUsuarios,
    orderBy,
  };
};

const INTERVENCION = "33333333-3333-4333-8333-333333333333";
const REGISTRADA_POR = "66666666-6666-4666-8666-666666666666";
const AUTOR = "77777777-7777-4777-8777-777777777777";

const valores = {
  tipo: "BACHE",
  estado: "PLANIFICADA",
  fechaDeOcurrencia: "2026-11-12",
  lugarId: "22222222-2222-4222-8222-222222222222",
  calleId: null,
  reporteId: null,
  descripcion: "Bacheo de la calle 20",
};

describe("lector de historial de intervenciones", () => {
  it("filtra por la intervencion y ordena de la mas vieja a la mas nueva", async () => {
    const { tx, whereDeRevisiones, orderBy } = txDeLectura([], []);

    await lectorDeHistorialDeIntervencionesSql.leer(tx, {
      intervencionId: comoIntervencionId(INTERVENCION),
      registradoPorUsuarioId: REGISTRADA_POR,
    });

    expect(whereDeRevisiones).toHaveBeenCalledTimes(1);
    expect(orderBy).toHaveBeenCalledTimes(1);
    expect(orderBy.mock.calls[0]).toHaveLength(2);
  });

  it("trae solo las columnas de la pantalla, sin ayuntamientoId", async () => {
    const { tx, select } = txDeLectura([], []);

    await lectorDeHistorialDeIntervencionesSql.leer(tx, {
      intervencionId: comoIntervencionId(INTERVENCION),
      registradoPorUsuarioId: REGISTRADA_POR,
    });

    const columnas = select.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(columnas)).toEqual([
      "id",
      "valoresAnteriores",
      "ocurridoEn",
      "autorNombre",
      "autorRol",
    ]);
  });

  it("junta la revision con el nombre y el rol de quien la hizo", async () => {
    const ocurridoEn = new Date("2026-11-13T16:05:00Z");
    const { tx } = txDeLectura(
      [
        {
          id: "revision-1",
          valoresAnteriores: valores,
          ocurridoEn,
          autorNombre: "Ana Canché",
          autorRol: "ADMIN_MUNICIPAL",
        },
      ],
      [{ nombre: "Rosa Poot", rol: "OPERADOR" }],
    );

    const lectura = await lectorDeHistorialDeIntervencionesSql.leer(tx, {
      intervencionId: comoIntervencionId(INTERVENCION),
      registradoPorUsuarioId: REGISTRADA_POR,
    });

    expect(lectura.revisiones).toEqual([
      {
        id: "revision-1",
        valoresAnteriores: valores,
        ocurridoEn,
        autor: { nombre: "Ana Canché", rol: "ADMIN_MUNICIPAL" },
      },
    ]);
    expect(lectura.registradaPor).toEqual({
      nombre: "Rosa Poot",
      rol: "OPERADOR",
    });
  });

  it("deja `registradaPor` en null cuando el usuario ya no se puede leer", async () => {
    const { tx } = txDeLectura([], []);

    const lectura = await lectorDeHistorialDeIntervencionesSql.leer(tx, {
      intervencionId: comoIntervencionId(INTERVENCION),
      registradoPorUsuarioId: AUTOR,
    });

    expect(lectura.registradaPor).toBeNull();
  });
});
