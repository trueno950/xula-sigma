import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearCambiarEstadoDeReporte } from "./application/cambiarEstadoDeReporte";
import { crearRegistrarReporte } from "./application/registrarReporte";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { crearLectorDeReportantesPorPadron } from "./infrastructure/lectorDeReportantesPorPadron";
import { crearLectorDeUbicacionesPorTerritorio } from "./infrastructure/lectorDeUbicacionesPorTerritorio";
import { registroDeMovimientosSql } from "./infrastructure/registroDeMovimientosSql";
import { repositorioDeReportesSql } from "./infrastructure/repositorioDeReportesSql";

/**
 * `reportes/asignarArea.concurrencia.integration.test.ts`: el `UPDATE` de
 * `asignarArea` gana su propia carrera, no solo el `esTerminal` que
 * `asignarAreaDeReporte` ya evaluo antes de llamarlo (design.md seccion 12,
 * mismo mecanismo que `aplicarTransicion`). Sin el `WHERE estado IN (...)`,
 * una transicion a terminal que confirma entre esa lectura y este `UPDATE`
 * deja pasar la asignacion sobre un reporte ya cerrado -el hallazgo de
 * `verify-report.md` sobre esta rebanada.
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

describe("asignarArea contra un reporte ya cerrado", () => {
  it("repositorioDeReportesSql.asignarArea no mueve filas: el WHERE excluye el estado terminal", async () => {
    const admin = actor("motul", "ADMIN_MUNICIPAL");
    const lugarId = await lugarDe("motul", "Comisaria Concurrencia Area");
    const id = await registrarReporte(entrada(lugarId), admin);

    await cambiarEstadoDeReporte(
      {
        id,
        estadoNuevo: "RESUELTO",
        motivoDeRechazo: null,
        folioDelOriginal: null,
      },
      admin,
    );

    const asignado = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.asignarArea(tx, {
        id,
        areaResponsable: "OBRAS_PUBLICAS",
      }),
    );
    expect(asignado).toBe(false);

    const guardada = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.buscarPorId(tx, id),
    );
    expect(guardada?.areaResponsable).toBeNull();
  });
});
