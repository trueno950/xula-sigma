import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bitacora } from "@/shared/tenancy/esquema";
import { limpiar, motul, owner } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearProgramarObraDeReporte } from "./application/programarObraDeReporte";
import {
  adminDe,
  estadoDeReporte,
  lugarDe,
  moverObra,
  movimientosDe,
  obrasDe,
  prepararFlujoDeObra,
  programar,
  reporteEn,
} from "./flujoDeObraDePrueba";
import { crearReportesParaObraPorReportes } from "./infrastructure/reportesParaObraPorReportes";

/**
 * Atomicidad de la trazabilidad (B1 y S2/S3 de `intervenciones-trazabilidad`),
 * contra Postgres real: la obra y el movimiento del reporte confirman o fallan
 * juntos. Lo prueba un repositorio cuyo `guardar` revienta despues de que el
 * reporte ya se movio: si las dos escrituras no compartieran transaccion, el
 * reporte quedaria en `EN_ATENCION` con una obra que no existe.
 */
beforeAll(prepararFlujoDeObra);

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, intervenciones, reportes, movimientos_de_reportes, folios_de_reportes`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const trazasDe = (entidadId: string) =>
  withTenant(motul, (tx) =>
    tx
      .select({ accion: bitacora.accion })
      .from(bitacora)
      .where(eq(bitacora.entidadId, entidadId)),
  );

const programarQueFalla = () =>
  crearProgramarObraDeReporte({
    repositorio: {
      guardar: () => Promise.reject(new Error("fallo el alta de la obra")),
    },
    reportes: crearReportesParaObraPorReportes(),
    hoy: () => "2026-11-16",
  });

describe("programar obra es atomico", () => {
  it("si el alta de la obra falla, el reporte no se mueve", async () => {
    const lugarId = await lugarDe("motul", "Comisaria atomica");
    const reporteId = await reporteEn("motul", lugarId);

    await expect(
      programarQueFalla()(
        {
          reporteId,
          tipo: "BACHE",
          descripcion: "Bacheo que no llega a guardarse",
        },
        adminDe("motul"),
      ),
    ).rejects.toThrow("fallo el alta de la obra");

    await expect(estadoDeReporte("motul", reporteId)).resolves.toBe("RECIBIDO");
    await expect(movimientosDe("motul", reporteId)).resolves.toEqual([
      { estadoAnterior: null, estadoNuevo: "RECIBIDO" },
    ]);
    await expect(obrasDe("motul", reporteId)).resolves.toEqual([]);
    await expect(trazasDe(reporteId)).resolves.toEqual([
      { accion: "REGISTRAR_REPORTE" },
    ]);
  });

  it("el cierre automatico deja la traza del alta y las dos transiciones", async () => {
    const lugarId = await lugarDe("motul", "Comisaria atomica dos");
    const reporteId = await reporteEn("motul", lugarId);

    const intervencionId = await programar("motul", reporteId);
    await moverObra("motul", intervencionId, "EN_EJECUCION");
    await moverObra("motul", intervencionId, "FINALIZADA");

    await expect(trazasDe(reporteId)).resolves.toEqual([
      { accion: "REGISTRAR_REPORTE" },
      { accion: "CAMBIAR_ESTADO_REPORTE" },
      { accion: "CAMBIAR_ESTADO_REPORTE" },
    ]);
    await expect(estadoDeReporte("motul", reporteId)).resolves.toBe("RESUELTO");
  });

  it("la obra cancelada no deja transicion en la traza del reporte", async () => {
    const lugarId = await lugarDe("motul", "Comisaria atomica tres");
    const reporteId = await reporteEn("motul", lugarId);

    const intervencionId = await programar("motul", reporteId);
    await moverObra("motul", intervencionId, "CANCELADA");

    await expect(trazasDe(reporteId)).resolves.toEqual([
      { accion: "REGISTRAR_REPORTE" },
      { accion: "CAMBIAR_ESTADO_REPORTE" },
    ]);
  });
});
