import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona } from "@/modules/padron";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import {
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import {
  calles,
  domicilios,
  lugares,
  residencias,
} from "./infrastructure/esquema";

/**
 * La prueba mas critica del cambio (tasks.md 2.19): el FK compuesto a mano
 * de design.md decision 4 es lo unico que impide que una residencia
 * apunte a una persona de otro municipio. `personas` no es alcanzable
 * fuera de `padron` (su design.md, capa A), asi que la persona de prueba
 * se crea por la superficie publica real -`altaDePersona`-, no por SQL
 * directo contra su tabla.
 */

const contextoDe = (ayuntamientoId: AyuntamientoId): ContextoActual => ({
  ayuntamientoId,
  usuario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rol: "ADMIN_MUNICIPAL",
  },
  origen: "web",
});

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const domicilioDe = async (ayuntamientoId: typeof motul, nombre: string) => {
  const [lugar] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(lugares)
      .values({ ayuntamientoId, tipo: "comisaria", nombre })
      .returning({ id: lugares.id }),
  );
  const [calle] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(calles)
      .values({ ayuntamientoId, nombre: `Calle ${nombre}`, lugarId: lugar!.id })
      .returning({ id: calles.id }),
  );
  const [domicilio] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(domicilios)
      .values({ ayuntamientoId, lugarId: lugar!.id, calleId: calle!.id })
      .returning({ id: domicilios.id }),
  );
  return domicilio!.id;
};

describe("aislamiento de residencias", () => {
  it("una consulta sin filtro solo devuelve las residencias del tenant activo", async () => {
    const { id: personaMotul } = await altaDePersona(
      {
        nombres: "Juan",
        primerApellido: "Poot",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(motul),
    );
    const { id: personaTicul } = await altaDePersona(
      {
        nombres: "Maria",
        primerApellido: "Chi",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(ticul),
    );
    const domicilioMotul = await domicilioDe(motul, "ResidenciasMotul");
    const domicilioTicul = await domicilioDe(ticul, "ResidenciasTicul");

    const [enMotul] = await withTenant(motul, (tx) =>
      tx
        .insert(residencias)
        .values({
          ayuntamientoId: motul,
          personaId: personaMotul,
          domicilioId: domicilioMotul,
          desdeEn: "2020-01-01",
        })
        .returning({ id: residencias.id }),
    );
    await withTenant(ticul, (tx) =>
      tx.insert(residencias).values({
        ayuntamientoId: ticul,
        personaId: personaTicul,
        domicilioId: domicilioTicul,
        desdeEn: "2020-01-01",
      }),
    );

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(residencias),
    );

    expect(filas.every((fila) => fila.ayuntamientoId === motul)).toBe(true);
    expect(filas.map((fila) => fila.id)).toContain(enMotul?.id);
  });

  it("una residencia con personaId de otro municipio insertada desde este es rechazada por Postgres", async () => {
    const { id: personaTicul } = await altaDePersona(
      {
        nombres: "Rosa",
        primerApellido: "Uc",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(ticul),
    );
    const domicilioMotul = await domicilioDe(motul, "ResidenciasMotulDos");

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(residencias).values({
          ayuntamientoId: motul,
          personaId: personaTicul,
          domicilioId: domicilioMotul,
          desdeEn: "2020-01-01",
        }),
      ),
    );

    expect(motivo).toMatch(/residencias_persona_tenant_fk/i);
  });
});
