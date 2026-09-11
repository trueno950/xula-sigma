import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { anioEnMerida } from "@/shared/lib/fecha";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearRegistrarReporte } from "./application/registrarReporte";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { foliosDeReportes } from "./infrastructure/esquema";
import { crearLectorDeReportantesPorPadron } from "./infrastructure/lectorDeReportantesPorPadron";
import { crearLectorDeUbicacionesPorTerritorio } from "./infrastructure/lectorDeUbicacionesPorTerritorio";
import { registroDeMovimientosSql } from "./infrastructure/registroDeMovimientosSql";
import { repositorioDeReportesSql } from "./infrastructure/repositorioDeReportesSql";

/**
 * `reportes/folioParticion.integration.test.ts` (tasks.md 4.22-4.23): la
 * particion del contador por `(ayuntamiento, anio)`. Dos municipios
 * arrancan su serie en el mismo consecutivo sin colisionar, y una serie
 * sembrada del anio anterior no corre hacia el anio actual. El lock bajo
 * concurrencia vive en `folio.integration.test.ts`.
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

describe("la particion del contador por ayuntamiento y anio", () => {
  it("Motul y Ticul registran su primer reporte del anio sin colisionar", async () => {
    const anio = anioEnMerida();
    const lugarMotul = await lugarDe("motul", "Comisaria Folio DosMotul");
    const lugarTicul = await lugarDe("ticul", "Comisaria Folio DosTicul");

    const idMotul = await registrarReporte(
      entrada(lugarMotul),
      actor("motul", "ADMIN_MUNICIPAL"),
    );
    const idTicul = await registrarReporte(
      entrada(lugarTicul),
      actor("ticul", "ADMIN_MUNICIPAL"),
    );

    const guardadaMotul = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.buscarPorId(tx, idMotul),
    );
    const guardadaTicul = await withTenant(ticul, (tx) =>
      repositorioDeReportesSql.buscarPorId(tx, idTicul),
    );

    expect(guardadaMotul?.folio).toBe(`REP-${anio}-000001`);
    expect(guardadaTicul?.folio).toBe(`REP-${anio}-000001`);
  });

  it("una serie sembrada del anio anterior no corre hacia el anio actual", async () => {
    const anio = anioEnMerida();

    await withTenant(motul, (tx) =>
      tx.insert(foliosDeReportes).values({
        ayuntamientoId: motul,
        anio: anio - 1,
        ultimoConsecutivo: 42,
      }),
    );

    const lugarId = await lugarDe("motul", "Comisaria Folio AnioNuevo");
    const id = await registrarReporte(
      entrada(lugarId),
      actor("motul", "ADMIN_MUNICIPAL"),
    );
    const guardada = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.buscarPorId(tx, id),
    );

    expect(guardada?.folio).toBe(`REP-${anio}-000001`);
  });
});
