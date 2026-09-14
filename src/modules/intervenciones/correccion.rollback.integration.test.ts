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
import { crearCorregirIntervencion } from "./application/corregirIntervencion";
import { crearRegistrarIntervencion } from "./application/registrarIntervencion";
import {
  crearLectorDeReportesPorReportes,
  repositorioDeIntervencionesSql,
} from "./infrastructure";
import { revisionesDeIntervenciones } from "./infrastructure/esquema";
import { crearLectorDeUbicacionesPorTerritorio } from "./infrastructure/lectorDeUbicacionesPorTerritorio";

let gente: GentePorMunicipio;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, intervenciones`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const registrar = crearRegistrarIntervencion({
  repositorio: repositorioDeIntervencionesSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
  crearLecturaDeReportes: crearLectorDeReportesPorReportes,
});
const lugarDe = async (nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
  );
  return id;
};

describe("rollback de correccion de intervenciones", () => {
  it("revierte correccion y revision si falla la insercion de bitacora", async () => {
    const lugarId = await lugarDe("Comisaria Rollback Bitacora Correccion");
    const admin = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
    const original = {
      tipo: "OBRA" as const,
      fechaDeOcurrencia: "2026-01-15",
      lugarId,
      calleId: null,
      reporteId: null,
      descripcion: "Descripcion original para rollback",
    };
    const id = await registrar(original, admin);
    const corregirConAuditoriaFallida = crearCorregirIntervencion({
      repositorio: repositorioDeIntervencionesSql,
      crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
      crearLecturaDeReportes: crearLectorDeReportesPorReportes,
      registrarBitacora: async () => {
        throw new Error("fallo de bitacora");
      },
    });

    await expect(
      corregirConAuditoriaFallida(
        { ...original, id, descripcion: "Descripcion corregida para rollback" },
        admin,
      ),
    ).rejects.toThrow("fallo de bitacora");

    await expect(
      withTenant(motul, (tx) =>
        repositorioDeIntervencionesSql.buscarPorId(tx, id),
      ),
    ).resolves.toMatchObject(original);
    await expect(
      withTenant(motul, (tx) =>
        tx
          .select({ id: revisionesDeIntervenciones.id })
          .from(revisionesDeIntervenciones),
      ),
    ).resolves.toEqual([]);
  });
});
