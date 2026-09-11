import { eq } from "drizzle-orm";
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
import { repositorioDeIntervencionesSql } from "./infrastructure";
import {
  intervenciones,
  revisionesDeIntervenciones,
} from "./infrastructure/esquema";
import { intervencionDe } from "./intervencionDePrueba";

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

const lugarDe = async (nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
  );
  return id;
};

const insertar = async (lugarId: string) => {
  const [fila] = await withTenant(motul, (tx) =>
    tx
      .insert(intervenciones)
      .values(
        intervencionDe({
          ayuntamientoId: motul,
          lugarId,
          registradoPorUsuarioId: gente.motul.OPERADOR,
        }),
      )
      .returning({ id: intervenciones.id }),
  );

  if (!fila) throw new Error("No se pudo sembrar la intervencion de prueba.");

  return fila.id;
};

describe("rollback de revisiones de intervenciones", () => {
  it("revierte la intervencion si falla la insercion de la revision", async () => {
    const lugarMotul = await lugarDe("Comisaria Motul Revision Fallida");
    const id = await insertar(lugarMotul);

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        repositorioDeIntervencionesSql.corregir(tx, {
          id,
          ayuntamientoId: motul,
          usuarioId: "99999999-9999-4999-8999-999999999999",
          cambios: {
            tipo: "MEJORA",
            fechaDeOcurrencia: "2026-02-20",
            lugarId: lugarMotul,
            calleId: null,
            reporteId: null,
            descripcion: "Descripcion que no debe quedar",
          },
        }),
      ),
    );

    expect(motivo).toMatch(/foreign key|violates/i);
    await expect(
      withTenant(motul, (tx) =>
        tx
          .select({
            tipo: intervenciones.tipo,
            estado: intervenciones.estado,
            fechaDeOcurrencia: intervenciones.fechaDeOcurrencia,
            lugarId: intervenciones.lugarId,
            calleId: intervenciones.calleId,
            reporteId: intervenciones.reporteId,
            descripcion: intervenciones.descripcion,
          })
          .from(intervenciones)
          .where(eq(intervenciones.id, id)),
      ),
    ).resolves.toEqual([
      {
        tipo: "OBRA",
        estado: "PLANIFICADA",
        fechaDeOcurrencia: "2026-01-15",
        lugarId: lugarMotul,
        calleId: null,
        reporteId: null,
        descripcion: "Rehabilitacion del parque municipal",
      },
    ]);
    await expect(
      withTenant(motul, (tx) => tx.select().from(revisionesDeIntervenciones)),
    ).resolves.toEqual([]);
  });
});
