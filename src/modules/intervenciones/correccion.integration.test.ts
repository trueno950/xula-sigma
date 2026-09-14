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
import {
  intervencionDe,
  intervencionPorId,
  trazasDeCorreccion,
} from "./correccionDePrueba";
import {
  crearLectorDeReportesPorReportes,
  repositorioDeIntervencionesSql,
} from "./infrastructure";
import { revisionesDeIntervenciones } from "./infrastructure/esquema";
import { crearLectorDeUbicacionesPorTerritorio } from "./infrastructure/lectorDeUbicacionesPorTerritorio";
import { registrarReporteDePrueba } from "./reporteVinculadoDePrueba";

let gente: GentePorMunicipio;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, intervenciones, reportes, movimientos_de_reportes, folios_de_reportes`;
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
const corregir = crearCorregirIntervencion({
  repositorio: repositorioDeIntervencionesSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
  crearLecturaDeReportes: crearLectorDeReportesPorReportes,
});
const lugarDe = async (
  nombre: string,
  municipio: "motul" | "ticul" = "motul",
) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  );
  return id;
};
describe("correccion real de intervenciones", () => {
  it("corrige y deja bitacora atomica referenciada solo por id", async () => {
    const lugarId = await lugarDe("Comisaria Correccion Aplicacion");
    const admin = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
    const original = intervencionDe(
      lugarId,
      "Descripcion original de intervencion",
    );
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
    const lugarTicul = await lugarDe(
      "Comisaria Correccion Ubicacion Ajena",
      "ticul",
    );
    const admin = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
    const original = intervencionDe(
      lugarMotul,
      "Descripcion original de ubicacion",
    );
    const id = await registrar(original, admin);

    await expect(
      corregir({ ...original, id, lugarId: lugarTicul }, admin),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    await expect(intervencionPorId(motul, id)).resolves.toMatchObject(original);
  });

  it("trata una intervencion de otro municipio como no encontrada", async () => {
    const lugarTicul = await lugarDe(
      "Comisaria Correccion Intervencion Ajena",
      "ticul",
    );
    const ajena = {
      ...intervencionDe(lugarTicul, "Descripcion de intervencion de Ticul"),
      tipo: "MEJORA" as const,
      fechaDeOcurrencia: "2026-02-20",
    };
    const id = await registrar(
      ajena,
      contextoDe(gente, "ticul", "ADMIN_MUNICIPAL"),
    );
    const adminMotul = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
    const lugarMotul = await lugarDe(
      "Comisaria Correccion Intervencion Propia",
    );

    await expect(
      corregir({ ...ajena, id, lugarId: lugarMotul }, adminMotul),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    await expect(intervencionPorId(ticul, id)).resolves.toMatchObject(ajena);
  });

  it.each([
    [
      "un reporte de otro municipio",
      async () => {
        const lugarTicul = await lugarDe("Comisaria Reporte Ajeno", "ticul");
        return registrarReporteDePrueba(
          lugarTicul,
          contextoDe(gente, "ticul", "OPERADOR"),
        );
      },
    ],
    [
      "un reporte inexistente",
      async () => "55555555-5555-4555-8555-555555555555",
    ],
  ])(
    "rechaza corregir con %s sin actualizar, revisar o auditar",
    async (_caso, crearReporteId) => {
      const lugarId = await lugarDe("Comisaria Correccion Reporte");
      const admin = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
      const original = intervencionDe(
        lugarId,
        "Descripcion original de intervencion",
      );
      const id = await registrar(original, admin);
      const reporteId = await crearReporteId();
      const trazasAntes = await trazasDeCorreccion();

      await expect(
        corregir({ ...original, id, reporteId }, admin),
      ).rejects.toBeInstanceOf(NoEncontradoError);

      await expect(intervencionPorId(motul, id)).resolves.toMatchObject(
        original,
      );
      const revisiones = await withTenant(motul, (tx) =>
        tx.select().from(revisionesDeIntervenciones),
      );
      const trazas = await trazasDeCorreccion();
      expect(revisiones).toHaveLength(0);
      expect(trazas).toHaveLength(trazasAntes.length);
    },
  );
});
