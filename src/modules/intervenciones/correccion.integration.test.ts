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
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearCorregirIntervencion } from "./application/corregirIntervencion";
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
const corregir = crearCorregirIntervencion({
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

describe("correccion real de intervenciones", () => {
  it("corrige y deja bitacora atomica referenciada solo por id", async () => {
    const lugarId = await lugarDe("Comisaria Correccion Aplicacion");
    const admin = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
    const original = {
      tipo: "OBRA" as const,
      fechaDeOcurrencia: "2026-01-15",
      lugarId,
      calleId: null,
      reporteId: null,
      descripcion: "Descripcion original de intervencion",
    };
    const id = await registrar(original, admin);

    await corregir(
      {
        ...original,
        id,
        tipo: "MEJORA",
        fechaDeOcurrencia: "2026-02-20",
      },
      admin,
    );

    const trazas = await withTenant(motul, (tx) =>
      tx
        .select({
          accion: bitacora.accion,
          entidadId: bitacora.entidadId,
          actor: bitacora.actor,
        })
        .from(bitacora)
        .where(eq(bitacora.entidadId, id)),
    );

    expect(trazas).toContainEqual({
      accion: "CORREGIR_INTERVENCION",
      entidadId: id,
      actor: admin.usuario.id,
    });
  });

  it("rechaza una ubicacion de otro municipio sin modificar la intervencion", async () => {
    const lugarMotul = await lugarDe("Comisaria Correccion Ubicacion Propia");
    const { id: lugarTicul } = await altaDeLugar(
      {
        tipo: "comisaria",
        nombre: "Comisaria Correccion Ubicacion Ajena",
        padreId: null,
      },
      contextoDe(gente, "ticul", "ADMIN_MUNICIPAL"),
    );
    const admin = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
    const original = {
      tipo: "OBRA" as const,
      fechaDeOcurrencia: "2026-01-15",
      lugarId: lugarMotul,
      calleId: null,
      reporteId: null,
      descripcion: "Descripcion original de ubicacion",
    };
    const id = await registrar(original, admin);

    await expect(
      corregir({ ...original, id, lugarId: lugarTicul }, admin),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    await expect(
      withTenant(motul, (tx) =>
        repositorioDeIntervencionesSql.buscarPorId(tx, id),
      ),
    ).resolves.toMatchObject(original);
  });

  it("trata una intervencion de otro municipio como no encontrada", async () => {
    const { id: lugarTicul } = await altaDeLugar(
      {
        tipo: "comisaria",
        nombre: "Comisaria Correccion Intervencion Ajena",
        padreId: null,
      },
      contextoDe(gente, "ticul", "ADMIN_MUNICIPAL"),
    );
    const contextoTicul = contextoDe(gente, "ticul", "ADMIN_MUNICIPAL");
    const ajena = {
      tipo: "MEJORA" as const,
      fechaDeOcurrencia: "2026-02-20",
      lugarId: lugarTicul,
      calleId: null,
      reporteId: null,
      descripcion: "Descripcion de intervencion de Ticul",
    };
    const id = await registrar(ajena, contextoTicul);
    const adminMotul = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
    const lugarMotul = await lugarDe(
      "Comisaria Correccion Intervencion Propia",
    );

    await expect(
      corregir({ ...ajena, id, lugarId: lugarMotul }, adminMotul),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    await expect(
      withTenant(ticul, (tx) =>
        repositorioDeIntervencionesSql.buscarPorId(tx, id),
      ),
    ).resolves.toMatchObject(ajena);
  });
});
