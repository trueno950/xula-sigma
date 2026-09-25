import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearCambiarEstadoDeReporte } from "./application/cambiarEstadoDeReporte";
import { crearRegistrarReporte } from "./application/registrarReporte";
import { DuplicadoSinOriginalError } from "./domain";
import { folioDe } from "./folioDePrueba";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { reportes } from "./infrastructure/esquema";
import { crearLectorDeReportantesPorPadron } from "./infrastructure/lectorDeReportantesPorPadron";
import { crearLectorDeUbicacionesPorTerritorio } from "./infrastructure/lectorDeUbicacionesPorTerritorio";
import { registroDeMovimientosSql } from "./infrastructure/registroDeMovimientosSql";
import { repositorioDeReportesSql } from "./infrastructure/repositorioDeReportesSql";
import { reporteDe } from "./reporteDePrueba";

/**
 * `reportes/duplicados.cadena.integration.test.ts` (tasks.md 5.9): el
 * vinculo de duplicado bajo Postgres real -cadena resuelta antes de
 * guardar, atomicidad del rechazo sin original, y el `FK` compuesto que
 * rechaza un original de otro municipio (design.md seccion 8)-.
 */

type Municipio = "motul" | "ticul";

let gente: GentePorMunicipio;

const actor = (municipio: Municipio, rol: Parameters<typeof contextoDe>[2]) =>
  contextoDe(gente, municipio, rol);

const registrarReporte = crearRegistrarReporte({
  repositorio: repositorioDeReportesSql,
  contador: contadorDeFoliosSql,
  movimientos: registroDeMovimientosSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
  crearLecturaDeReportantes: crearLectorDeReportantesPorPadron,
});

const cambiarEstadoDeReporte = crearCambiarEstadoDeReporte({
  repositorio: repositorioDeReportesSql,
  movimientos: registroDeMovimientosSql,
});

const entrada = (lugarId: string) => ({
  tipo: "BACHE" as const,
  lugarId,
  calleId: null,
  referencia: null,
  descripcion: "Bache grande frente al parque principal",
  personaId: null,
});

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, folios_de_reportes, reportes, movimientos_de_reportes, intervenciones`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const lugarDe = async (municipio: Municipio, nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    actor(municipio, "ADMIN_MUNICIPAL"),
  );
  return id;
};

describe("el vinculo de duplicado resuelve la cadena antes de guardar", () => {
  it("marcar C duplicado de B (que ya es duplicado de A) guarda C -> A", async () => {
    const admin = actor("motul", "ADMIN_MUNICIPAL");
    const lugarId = await lugarDe("motul", "Comisaria Cadena De Duplicados");

    const idA = await registrarReporte(entrada(lugarId), admin);
    const idB = await registrarReporte(entrada(lugarId), admin);
    const idC = await registrarReporte(entrada(lugarId), admin);

    await cambiarEstadoDeReporte(
      {
        id: idB,
        estadoNuevo: "RECHAZADO",
        motivoDeRechazo: "DUPLICADO",
        folioDelOriginal: await folioDe(motul, idA),
      },
      admin,
    );
    await cambiarEstadoDeReporte(
      {
        id: idC,
        estadoNuevo: "RECHAZADO",
        motivoDeRechazo: "DUPLICADO",
        folioDelOriginal: await folioDe(motul, idB),
      },
      admin,
    );

    const guardadaC = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.buscarPorId(tx, idC),
    );

    expect(guardadaC?.duplicadoDeReporteId).toBe(idA);
  });

  it("rechazar con motivo DUPLICADO sin id del original falla y no escribe estado, vinculo ni movimiento", async () => {
    const admin = actor("motul", "ADMIN_MUNICIPAL");
    const lugarId = await lugarDe("motul", "Comisaria Rechazo Sin Original");
    const id = await registrarReporte(entrada(lugarId), admin);

    await expect(
      cambiarEstadoDeReporte(
        {
          id,
          estadoNuevo: "RECHAZADO",
          motivoDeRechazo: "DUPLICADO",
          folioDelOriginal: null,
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(DuplicadoSinOriginalError);

    const guardada = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.buscarPorId(tx, id),
    );
    expect(guardada?.estado).toBe("RECIBIDO");
    expect(guardada?.duplicadoDeReporteId).toBeNull();

    const historial = await withTenant(motul, (tx) =>
      registroDeMovimientosSql.historialDe(tx, id),
    );
    // Solo la fila del alta: el intento de rechazo fallido no agrego una
    // segunda fila (design.md seccion 12, atomicidad del paso 2c).
    expect(historial).toHaveLength(1);
  });

  it("un duplicadoDeReporteId de otro municipio es rechazado por reportes_duplicado_tenant_fk", async () => {
    const admin = actor("ticul", "ADMIN_MUNICIPAL");
    const lugarTicul = await lugarDe("ticul", "Comisaria Duplicado Ajeno");
    const idTicul = await registrarReporte(entrada(lugarTicul), admin);

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(reportes).values(
          reporteDe({
            ayuntamientoId: motul,
            lugarId: lugarTicul,
            registradoPorUsuarioId: gente.motul.OPERADOR,
            folio: "REP-2026-000001",
            consecutivo: 1,
            estado: "RECHAZADO",
            motivoDeRechazo: "DUPLICADO",
            duplicadoDeReporteId: idTicul,
          }),
        ),
      ),
    );

    expect(motivo).toMatch(/reportes_duplicado_tenant_fk/i);
  });
});
