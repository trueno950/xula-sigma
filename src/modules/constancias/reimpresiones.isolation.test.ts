import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona } from "@/modules/padron";
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
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { constancias, reimpresiones } from "./infrastructure/esquema";

let gente: GentePorMunicipio;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const constanciaDe = async (
  ayuntamientoId: typeof motul,
  personaId: string,
  emitidaPorUsuarioId: string,
  folio: string,
  consecutivo: number,
) => {
  const [fila] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(constancias)
      .values({
        ayuntamientoId,
        tipo: "VECINDAD",
        folio,
        anio: 2026,
        consecutivo,
        codigoVerificacion: "a1b2c3d4e5f60718",
        personaId,
        datos: {},
        plantillaVersion: "vecindad-v1",
        emitidaPorUsuarioId,
      })
      .returning({ id: constancias.id }),
  );
  return fila!.id;
};

describe("aislamiento de reimpresiones", () => {
  it("una consulta sin filtro solo devuelve las reimpresiones del tenant activo", async () => {
    const { id: personaMotul } = await altaDePersona(
      {
        nombres: "Elena",
        primerApellido: "Cauich",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
    );
    const { id: personaTicul } = await altaDePersona(
      {
        nombres: "Manuel",
        primerApellido: "Balam",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(gente, "ticul", "ADMIN_MUNICIPAL"),
    );
    const constanciaMotul = await constanciaDe(
      motul,
      personaMotul,
      gente.motul.OPERADOR,
      "VEC-2026-000010",
      10,
    );
    const constanciaTicul = await constanciaDe(
      ticul,
      personaTicul,
      gente.ticul.OPERADOR,
      "VEC-2026-000010",
      10,
    );

    const [enMotul] = await withTenant(motul, (tx) =>
      tx
        .insert(reimpresiones)
        .values({
          ayuntamientoId: motul,
          constanciaId: constanciaMotul,
          usuarioId: gente.motul.OPERADOR,
          motivo: "EXTRAVIO",
        })
        .returning({ id: reimpresiones.id }),
    );
    await withTenant(ticul, (tx) =>
      tx.insert(reimpresiones).values({
        ayuntamientoId: ticul,
        constanciaId: constanciaTicul,
        usuarioId: gente.ticul.OPERADOR,
        motivo: "EXTRAVIO",
      }),
    );

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(reimpresiones),
    );

    expect(filas.every((fila) => fila.ayuntamientoId === motul)).toBe(true);
    expect(filas.map((fila) => fila.id)).toContain(enMotul?.id);
  });

  it("una reimpresion con constanciaId de otro municipio insertada desde este es rechazada por Postgres", async () => {
    const { id: personaTicul } = await altaDePersona(
      {
        nombres: "Rosa",
        primerApellido: "Cetz",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(gente, "ticul", "ADMIN_MUNICIPAL"),
    );
    const constanciaTicul = await constanciaDe(
      ticul,
      personaTicul,
      gente.ticul.OPERADOR,
      "VEC-2026-000011",
      11,
    );

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(reimpresiones).values({
          ayuntamientoId: motul,
          constanciaId: constanciaTicul,
          usuarioId: gente.motul.OPERADOR,
          motivo: "EXTRAVIO",
        }),
      ),
    );

    expect(motivo).toMatch(/reimpresiones_constancia_tenant_fk/i);
  });
});
