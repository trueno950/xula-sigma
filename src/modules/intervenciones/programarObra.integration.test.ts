import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";
import { bitacora } from "@/shared/tenancy/esquema";
import { limpiar, motul, owner } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { intervencionPorId } from "./composicion";
import { ReporteNoProgramableError } from "./domain";
import {
  adminDe,
  cambiarReporte,
  estadoDeReporte,
  lugarDe,
  movimientosDe,
  obrasDe,
  prepararFlujoDeObra,
  programar,
  reporteEn,
} from "./flujoDeObraDePrueba";

beforeAll(prepararFlujoDeObra);

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, intervenciones, reportes, movimientos_de_reportes, folios_de_reportes`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("programar obra desde un reporte, contra Postgres real", () => {
  it("crea la obra con la ubicacion del reporte y lo pasa a en atencion", async () => {
    const lugarId = await lugarDe("motul", "Comisaria Obra");
    const reporteId = await reporteEn("motul", lugarId);

    const intervencionId = await programar("motul", reporteId);

    const guardada = await intervencionPorId(intervencionId, adminDe("motul"));
    expect(guardada).toMatchObject({
      tipo: "BACHE",
      estado: "PLANIFICADA",
      lugarId,
      calleId: null,
      reporteId,
    });
    await expect(estadoDeReporte("motul", reporteId)).resolves.toBe(
      "EN_ATENCION",
    );
    await expect(movimientosDe("motul", reporteId)).resolves.toEqual([
      { estadoAnterior: null, estadoNuevo: "RECIBIDO" },
      { estadoAnterior: "RECIBIDO", estadoNuevo: "EN_ATENCION" },
    ]);
  });

  it("audita la programacion como hecho propio, sin texto libre", async () => {
    const lugarId = await lugarDe("motul", "Comisaria Audita");
    const reporteId = await reporteEn("motul", lugarId);

    const intervencionId = await programar("motul", reporteId);

    const trazas = await withTenant(motul, (tx) =>
      tx
        .select({ accion: bitacora.accion, entidadId: bitacora.entidadId })
        .from(bitacora)
        .where(eq(bitacora.entidadId, intervencionId)),
    );
    expect(trazas).toEqual([
      { accion: "PROGRAMAR_OBRA", entidadId: intervencionId },
    ]);
  });

  it("programar sobre un reporte ya en atencion no repite el movimiento", async () => {
    const lugarId = await lugarDe("motul", "Comisaria Obra Dos");
    const reporteId = await reporteEn("motul", lugarId);
    await cambiarReporte("motul", reporteId, "EN_ATENCION");

    await programar("motul", reporteId);

    await expect(movimientosDe("motul", reporteId)).resolves.toEqual([
      { estadoAnterior: null, estadoNuevo: "RECIBIDO" },
      { estadoAnterior: "RECIBIDO", estadoNuevo: "EN_ATENCION" },
    ]);
  });

  it("rechaza programar sobre un reporte resuelto sin escribir la obra", async () => {
    const lugarId = await lugarDe("motul", "Comisaria Obra Cerrada");
    const reporteId = await reporteEn("motul", lugarId);
    await cambiarReporte("motul", reporteId, "RESUELTO");

    await expect(programar("motul", reporteId)).rejects.toBeInstanceOf(
      ReporteNoProgramableError,
    );

    await expect(obrasDe("motul", reporteId)).resolves.toEqual([]);
    await expect(estadoDeReporte("motul", reporteId)).resolves.toBe("RESUELTO");
  });

  it("un reporte de otro municipio responde no encontrado y no escribe nada", async () => {
    const lugarTicul = await lugarDe("ticul", "Comisaria Obra Ticul");
    const reporteTicul = await reporteEn("ticul", lugarTicul);

    await expect(programar("motul", reporteTicul)).rejects.toBeInstanceOf(
      NoEncontradoError,
    );

    await expect(obrasDe("motul", reporteTicul)).resolves.toEqual([]);
    await expect(obrasDe("ticul", reporteTicul)).resolves.toEqual([]);
    await expect(estadoDeReporte("ticul", reporteTicul)).resolves.toBe(
      "RECIBIDO",
    );
  });

  it("la obra queda visible en el municipio que la programo, no en el otro", async () => {
    const lugarId = await lugarDe("motul", "Comisaria Bandeja");
    const reporteId = await reporteEn("motul", lugarId);
    await programar("motul", reporteId);

    await expect(obrasDe("motul", reporteId)).resolves.toEqual([
      { estado: "PLANIFICADA", tipo: "BACHE" },
    ]);
    await expect(obrasDe("ticul", reporteId)).resolves.toEqual([]);
  });
});
