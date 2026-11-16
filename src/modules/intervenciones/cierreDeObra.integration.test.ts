import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";
import { limpiar, owner, ticul } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { registrarIntervencion } from "./composicion";
import {
  adminDe,
  estadoDeReporte,
  lugarDe,
  moverObra,
  movimientosDe,
  prepararFlujoDeObra,
  programar,
  reporteEn,
} from "./flujoDeObraDePrueba";
import { intervenciones } from "./infrastructure/esquema";

/**
 * S3 de `intervenciones-trazabilidad`, contra Postgres real: finalizar una
 * obra cierra su reporte en la misma transaccion, cancelarla no lo toca, y la
 * obra de otro municipio no se puede mover ni arrastra su reporte.
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

const finalizar = async (municipio: "motul" | "ticul", id: string) => {
  await moverObra(municipio, id, "EN_EJECUCION");
  await moverObra(municipio, id, "FINALIZADA");
};

describe("finalizar la obra cierra su reporte", () => {
  it("deja el reporte ligado en resuelto, con su movimiento", async () => {
    const lugarId = await lugarDe("motul", "Comisaria Cierre");
    const reporteId = await reporteEn("motul", lugarId);
    const intervencionId = await programar("motul", reporteId);

    await finalizar("motul", intervencionId);

    await expect(estadoDeReporte("motul", reporteId)).resolves.toBe("RESUELTO");
    await expect(movimientosDe("motul", reporteId)).resolves.toEqual([
      { estadoAnterior: null, estadoNuevo: "RECIBIDO" },
      { estadoAnterior: "RECIBIDO", estadoNuevo: "EN_ATENCION" },
      { estadoAnterior: "EN_ATENCION", estadoNuevo: "RESUELTO" },
    ]);
  });

  it("una obra cancelada deja el reporte como esta", async () => {
    const lugarId = await lugarDe("motul", "Comisaria Cancelada");
    const reporteId = await reporteEn("motul", lugarId);
    const intervencionId = await programar("motul", reporteId);

    await moverObra("motul", intervencionId, "CANCELADA");

    await expect(estadoDeReporte("motul", reporteId)).resolves.toBe(
      "EN_ATENCION",
    );
    await expect(movimientosDe("motul", reporteId)).resolves.toEqual([
      { estadoAnterior: null, estadoNuevo: "RECIBIDO" },
      { estadoAnterior: "RECIBIDO", estadoNuevo: "EN_ATENCION" },
    ]);
  });

  it("una obra sin reporte se finaliza sin tocar ningun reporte", async () => {
    const lugarId = await lugarDe("motul", "Comisaria Suelta");
    const reporteId = await reporteEn("motul", lugarId);
    const intervencionId = await registrarIntervencion(
      {
        tipo: "OBRA",
        fechaDeOcurrencia: "2026-11-16",
        lugarId,
        calleId: null,
        reporteId: null,
        descripcion: "Rehabilitacion del parque municipal",
      },
      adminDe("motul"),
    );

    await finalizar("motul", intervencionId);

    await expect(estadoDeReporte("motul", reporteId)).resolves.toBe("RECIBIDO");
    await expect(movimientosDe("motul", reporteId)).resolves.toEqual([
      { estadoAnterior: null, estadoNuevo: "RECIBIDO" },
    ]);
  });

  it("la obra de otro municipio responde no encontrado y no mueve su reporte", async () => {
    const lugarTicul = await lugarDe("ticul", "Comisaria Cierre Ticul");
    const reporteTicul = await reporteEn("ticul", lugarTicul);
    const intervencionTicul = await programar("ticul", reporteTicul);
    await moverObra("ticul", intervencionTicul, "EN_EJECUCION");

    await expect(
      moverObra("motul", intervencionTicul, "FINALIZADA"),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    const filas = await withTenant(ticul, (tx) =>
      tx.select({ estado: intervenciones.estado }).from(intervenciones),
    );
    expect(filas).toEqual([{ estado: "EN_EJECUCION" }]);
    await expect(estadoDeReporte("ticul", reporteTicul)).resolves.toBe(
      "EN_ATENCION",
    );
  });
});
