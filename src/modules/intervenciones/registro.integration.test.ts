import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { NoEncontradoError } from "@/shared/lib/errores";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearRegistrarIntervencion } from "./application/registrarIntervencion";
import { repositorioDeIntervencionesSql } from "./infrastructure";
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
});
const lugarDe = async (nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
  );
  return id;
};

describe("registro real de intervenciones", () => {
  it("persiste fecha de ocurrencia, captura del servidor y bitacora por id", async () => {
    const contexto = contextoDe(gente, "motul", "OPERADOR");
    const lugarId = await lugarDe("Comisaria Registro Intervencion");

    const id = await registrar(
      {
        tipo: "OBRA",
        fechaDeOcurrencia: "2026-01-15",
        lugarId,
        calleId: null,
        reporteId: null,
        descripcion: "Rehabilitacion del parque municipal",
      },
      contexto,
    );

    const guardada = await withTenant(motul, (tx) =>
      repositorioDeIntervencionesSql.buscarPorId(tx, id),
    );
    const trazas = await withTenant(motul, (tx) =>
      tx
        .select({ accion: bitacora.accion, entidadId: bitacora.entidadId })
        .from(bitacora)
        .where(eq(bitacora.entidadId, id)),
    );

    expect(guardada).toMatchObject({
      tipo: "OBRA",
      estado: "PLANIFICADA",
      fechaDeOcurrencia: "2026-01-15",
      lugarId,
      calleId: null,
      reporteId: null,
    });
    expect(guardada?.capturadoEn).toBeInstanceOf(Date);
    expect(trazas).toEqual([
      { accion: "REGISTRAR_INTERVENCION", entidadId: id },
    ]);
  });

  it("rechaza una ubicacion inexistente antes de insertar", async () => {
    await expect(
      registrar(
        {
          tipo: "BACHE",
          fechaDeOcurrencia: "2026-01-15",
          lugarId: "99999999-9999-4999-8999-999999999999",
          calleId: null,
          reporteId: null,
          descripcion: "Bache grande frente al parque principal",
        },
        contextoDe(gente, "motul", "OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});
