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
 * `reportes/duplicados.atomicidad.integration.test.ts` (tasks.md 5.11,
 * 5.13-5.14): el rollback completo de la transaccion cuando el registro de
 * movimientos lanza (design.md seccion 12), y `contarDuplicadosDe` como
 * consulta indexada, sin recorrer la tabla (design.md seccion 13).
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

describe("atomicidad de la transicion", () => {
  it("un registroDeMovimientos.agregar que lanza deja el estado sin cambiar", async () => {
    const admin = actor("motul", "ADMIN_MUNICIPAL");
    const lugarId = await lugarDe("motul", "Comisaria Atomicidad");
    const id = await registrarReporte(entrada(lugarId), admin);

    const cambiarEstadoConMovimientosRotos = crearCambiarEstadoDeReporte({
      repositorio: repositorioDeReportesSql,
      movimientos: {
        agregar: async () => {
          throw new Error("boom");
        },
      },
    });

    await expect(
      cambiarEstadoConMovimientosRotos(
        {
          id,
          estadoNuevo: "EN_ATENCION",
          motivoDeRechazo: null,
          folioDelOriginal: null,
        },
        admin,
      ),
    ).rejects.toThrow("boom");

    const guardada = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.buscarPorId(tx, id),
    );
    // Rollback de la transaccion completa: el UPDATE de aplicarTransicion
    // tambien se deshizo, aunque haya corrido antes de que agregar lanzara.
    expect(guardada?.estado).toBe("RECIBIDO");
  });
});

describe("contarDuplicadosDe", () => {
  it("es una consulta directa sobre reportes_duplicado_idx, sin recorrer la tabla", async () => {
    const admin = actor("motul", "ADMIN_MUNICIPAL");
    const lugarId = await lugarDe("motul", "Comisaria Conteo De Duplicados");

    const idA = await registrarReporte(entrada(lugarId), admin);
    const idB = await registrarReporte(entrada(lugarId), admin);
    await cambiarEstadoDeReporte(
      {
        id: idB,
        estadoNuevo: "RECHAZADO",
        motivoDeRechazo: "DUPLICADO",
        folioDelOriginal: await folioDe(motul, idA),
      },
      admin,
    );

    const cuenta = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.contarDuplicadosDe(tx, idA),
    );
    expect(cuenta).toBe(1);

    // Con la tabla casi vacia, el planificador puede preferir
    // `reportes_duplicado_idx` o cualquier otro indice que tambien arranque
    // en `ayuntamiento_id` -`reportes_similares_idx`, por ejemplo-: los dos
    // son igual de baratos cuando hay pocas filas, y el nombre exacto deja
    // de ser una senal confiable. Lo que si es estable, con
    // `enable_seqscan = off` para que la eleccion no dependa del volumen del
    // dia: que la lectura no es `Seq Scan`, criterio de exito de
    // `proposal.md` ("sin recorrer la tabla").
    const textoDelPlan = await withTenant(motul, async (tx) => {
      await tx.execute(sql`SET LOCAL enable_seqscan = off`);
      const plan = await tx.execute(sql`
        EXPLAIN SELECT count(*) FROM reportes
         WHERE duplicado_de_reporte_id = ${idA}
      `);
      return plan.map((fila) => Object.values(fila)[0]).join("\n");
    });

    expect(textoDelPlan).not.toContain("Seq Scan");
    expect(textoDelPlan).toMatch(/Index( Only)? Scan|Bitmap/);
  });
});
