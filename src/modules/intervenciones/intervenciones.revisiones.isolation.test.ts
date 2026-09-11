import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  appSinTenant,
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { repositorioDeIntervencionesSql } from "./infrastructure";
import {
  intervenciones,
  revisionesDeIntervenciones,
} from "./infrastructure/esquema";
import { intervencionDe } from "./intervencionDePrueba";

type Municipio = "motul" | "ticul";

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
  await appSinTenant.end();
  await cerrarConexion();
});

const lugarDe = async (municipio: Municipio, nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  );
  return id;
};

const insertar = async (municipio: Municipio, lugarId: string) => {
  const ayuntamientoId = municipio === "motul" ? motul : ticul;
  const [fila] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(intervenciones)
      .values(
        intervencionDe({
          ayuntamientoId,
          lugarId,
          registradoPorUsuarioId: gente[municipio].OPERADOR,
        }),
      )
      .returning({ id: intervenciones.id }),
  );

  if (!fila) throw new Error("No se pudo sembrar la intervencion de prueba.");

  return fila.id;
};

describe("aislamiento de revisiones de intervenciones", () => {
  it("sin tenant fijado no devuelve filas", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Motul Sin Tenant");
    await insertar("motul", lugarMotul);

    const filas = await appSinTenant`SELECT id FROM intervenciones`;

    expect(filas).toHaveLength(0);
  });

  it("la aplicacion no puede borrar intervenciones", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Motul No Delete");
    const id = await insertar("motul", lugarMotul);

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.delete(intervenciones).where(eq(intervenciones.id, id)),
      ),
    );

    expect(motivo).toMatch(/permission denied/i);
  });

  it("aísla revisiones y las deja solo para agregar", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Motul Revision");
    const id = await insertar("motul", lugarMotul);
    await withTenant(motul, (tx) =>
      repositorioDeIntervencionesSql.corregir(tx, {
        id,
        ayuntamientoId: motul,
        usuarioId: gente.motul.ADMIN_MUNICIPAL,
        cambios: {
          tipo: "MEJORA",
          fechaDeOcurrencia: "2026-01-15",
          lugarId: lugarMotul,
          calleId: null,
          reporteId: null,
          descripcion: "Rehabilitacion del parque municipal",
        },
      }),
    );

    const [actual] = await withTenant(motul, (tx) =>
      tx
        .select({ tipo: intervenciones.tipo })
        .from(intervenciones)
        .where(eq(intervenciones.id, id)),
    );
    const propias = await withTenant(motul, (tx) =>
      tx.select().from(revisionesDeIntervenciones),
    );
    const ajenas = await withTenant(ticul, (tx) =>
      tx.select().from(revisionesDeIntervenciones),
    );
    expect(actual?.tipo).toBe("MEJORA");
    expect(propias).toHaveLength(1);
    expect(ajenas).toHaveLength(0);
    expect(propias[0]?.valoresAnteriores).toEqual({
      tipo: "OBRA",
      estado: "PLANIFICADA",
      fechaDeOcurrencia: "2026-01-15",
      lugarId: lugarMotul,
      calleId: null,
      reporteId: null,
      descripcion: "Rehabilitacion del parque municipal",
    });

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx
          .update(revisionesDeIntervenciones)
          .set({ usuarioId: gente.motul.OPERADOR }),
      ),
    );
    expect(motivo).toMatch(/permission denied/i);

    const motivoDeBaja = await motivoDeFalla(() =>
      withTenant(motul, (tx) => tx.delete(revisionesDeIntervenciones)),
    );
    expect(motivoDeBaja).toMatch(/permission denied/i);
  });
});
