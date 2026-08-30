import { eq } from "drizzle-orm";
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
import { constancias } from "./infrastructure/esquema";

/**
 * Tres invariantes de una sola tabla: aislamiento por tenant (T1), el FK
 * compuesto a mano contra `personas` (mismo mecanismo que
 * `residencias.isolation.test.ts` de `territorio`), y el CHECK que exige
 * que la cancelacion viaje completa o no viaje.
 */

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

const constanciaDe = (opciones: {
  ayuntamientoId: typeof motul;
  personaId: string;
  emitidaPorUsuarioId: string;
  folio: string;
  consecutivo: number;
}) => ({
  ayuntamientoId: opciones.ayuntamientoId,
  tipo: "VECINDAD" as const,
  folio: opciones.folio,
  anio: 2026,
  consecutivo: opciones.consecutivo,
  codigoVerificacion: "a1b2c3d4e5f60718",
  personaId: opciones.personaId,
  datos: {},
  plantillaVersion: "vecindad-v1",
  emitidaPorUsuarioId: opciones.emitidaPorUsuarioId,
});

describe("aislamiento de constancias", () => {
  it("una consulta sin filtro solo devuelve las constancias del tenant activo", async () => {
    const { id: personaMotul } = await altaDePersona(
      {
        nombres: "Luis",
        primerApellido: "Canul",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
    );
    const { id: personaTicul } = await altaDePersona(
      {
        nombres: "Ana",
        primerApellido: "Dzul",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(gente, "ticul", "ADMIN_MUNICIPAL"),
    );

    const [enMotul] = await withTenant(motul, (tx) =>
      tx
        .insert(constancias)
        .values(
          constanciaDe({
            ayuntamientoId: motul,
            personaId: personaMotul,
            emitidaPorUsuarioId: gente.motul.OPERADOR,
            folio: "VEC-2026-000001",
            consecutivo: 1,
          }),
        )
        .returning({ id: constancias.id }),
    );
    await withTenant(ticul, (tx) =>
      tx.insert(constancias).values(
        constanciaDe({
          ayuntamientoId: ticul,
          personaId: personaTicul,
          emitidaPorUsuarioId: gente.ticul.OPERADOR,
          folio: "VEC-2026-000001",
          consecutivo: 1,
        }),
      ),
    );

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(constancias),
    );

    expect(filas.every((fila) => fila.ayuntamientoId === motul)).toBe(true);
    expect(filas.map((fila) => fila.id)).toContain(enMotul?.id);
  });

  it("una constancia con personaId de otro municipio insertada desde este es rechazada por Postgres", async () => {
    const { id: personaTicul } = await altaDePersona(
      {
        nombres: "Rosa",
        primerApellido: "Uc",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(gente, "ticul", "ADMIN_MUNICIPAL"),
    );

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(constancias).values(
          constanciaDe({
            ayuntamientoId: motul,
            personaId: personaTicul,
            emitidaPorUsuarioId: gente.motul.OPERADOR,
            folio: "VEC-2026-000002",
            consecutivo: 2,
          }),
        ),
      ),
    );

    expect(motivo).toMatch(/constancias_persona_tenant_fk/i);
  });

  it("una cancelacion a medias es rechazada por constancias_cancelacion_completa", async () => {
    const { id: personaMotul } = await altaDePersona(
      {
        nombres: "Pedro",
        primerApellido: "Chan",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
    );

    const [fila] = await withTenant(motul, (tx) =>
      tx
        .insert(constancias)
        .values(
          constanciaDe({
            ayuntamientoId: motul,
            personaId: personaMotul,
            emitidaPorUsuarioId: gente.motul.OPERADOR,
            folio: "VEC-2026-000003",
            consecutivo: 3,
          }),
        )
        .returning({ id: constancias.id }),
    );

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx
          .update(constancias)
          .set({ canceladaEn: new Date() })
          .where(eq(constancias.id, fila!.id)),
      ),
    );

    expect(motivo).toMatch(/constancias_cancelacion_completa/i);
  });
});
