import { sql } from "drizzle-orm";
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
import { folioDe } from "./folioDePrueba";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { crearLectorDeReportantesPorPadron } from "./infrastructure/lectorDeReportantesPorPadron";
import { crearLectorDeUbicacionesPorTerritorio } from "./infrastructure/lectorDeUbicacionesPorTerritorio";
import { registroDeMovimientosSql } from "./infrastructure/registroDeMovimientosSql";
import { repositorioDeReportesSql } from "./infrastructure/repositorioDeReportesSql";

/**
 * `reportes/duplicados.ciclo.integration.test.ts` (tasks.md 5.10): un ciclo
 * metido por `SQL` crudo -la aplicacion nunca lo escribe- degrada a un
 * estado equivocado, visible y acotado, y nunca a un bucle (design.md
 * seccion 8, tabla de comportamiento).
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

describe("un ciclo metido por SQL crudo degrada, nunca cuelga", () => {
  it("A -> B y B -> A: marcar C duplicado de A resuelve en un salto, sin bucle", async () => {
    const admin = actor("motul", "ADMIN_MUNICIPAL");
    const lugarId = await lugarDe("motul", "Comisaria Ciclo De Duplicados");

    const idA = await registrarReporte(entrada(lugarId), admin);
    const idB = await registrarReporte(entrada(lugarId), admin);
    const idC = await registrarReporte(entrada(lugarId), admin);

    // El ciclo solo se puede meter por SQL directo: la aplicacion nunca lo
    // escribe (design.md seccion 8). Va por `withTenant`, no por `owner`
    // suelto: el `UPDATE` tiene que caer bajo la politica de `motul` -sin
    // `app.tenant` fijado, `FORCE ROW LEVEL SECURITY` lo deja en cero filas
    // en silencio, sin avisar-.
    await withTenant(motul, (tx) =>
      tx.execute(sql`
        UPDATE reportes
           SET estado = 'RECHAZADO', motivo_de_rechazo = 'DUPLICADO',
               duplicado_de_reporte_id = ${idA}
         WHERE id = ${idB}
      `),
    );
    await withTenant(motul, (tx) =>
      tx.execute(sql`
        UPDATE reportes
           SET estado = 'RECHAZADO', motivo_de_rechazo = 'DUPLICADO',
               duplicado_de_reporte_id = ${idB}
         WHERE id = ${idA}
      `),
    );

    // `candidatoAOriginal(A)` devuelve `{ id: A, duplicadoDeReporteId: B }`
    // -no null-, asi que `vincularDuplicado` resuelve en UN salto a B, sin
    // recursion. Es el estado equivocado, visible y acotado que design.md
    // seccion 8 admite: nunca un bucle.
    await cambiarEstadoDeReporte(
      {
        id: idC,
        estadoNuevo: "RECHAZADO",
        motivoDeRechazo: "DUPLICADO",
        folioDelOriginal: await folioDe(motul, idA),
      },
      admin,
    );

    const guardadaC = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.buscarPorId(tx, idC),
    );
    expect(guardadaC?.duplicadoDeReporteId).toBe(idB);
  });
});
