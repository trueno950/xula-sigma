import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
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
import { crearRenombrarCalle } from "./application/renombrarCalle";
import type { CalleId, NaturalezaDeEvento } from "./domain";
import { calles, eventosDeCalles } from "./infrastructure/esquema";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { crearCalleEn, crearLugarEn } from "./lugarDePrueba";

/**
 * Forma canonica del test de aislamiento (`invariantes-criticos.md`, Capa
 * 2): inserta directo con `withTenant`, sin pasar por caso de uso.
 */

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const registrarEventoEn = (
  ayuntamientoId: AyuntamientoId,
  calleId: CalleId,
  naturaleza: NaturalezaDeEvento,
) =>
  withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(eventosDeCalles)
      .values({ ayuntamientoId, calleId, naturaleza })
      .returning({ id: eventosDeCalles.id }),
  );

const sembrarEvento = async (
  ayuntamientoId: AyuntamientoId,
  etiqueta: string,
) => {
  const lugarId = await crearLugarEn(ayuntamientoId, "comisaria", etiqueta);
  const calleId = await crearCalleEn(ayuntamientoId, lugarId, etiqueta);

  return calleId;
};

describe("aislamiento de eventos de calles", () => {
  it("un municipio solo ve sus eventos sin filtro explicito de tenant", async () => {
    const calleMotul = await sembrarEvento(motul, "Calle eventos M");
    const calleTicul = await sembrarEvento(ticul, "Calle eventos T");

    await registrarEventoEn(motul, calleMotul, "ALTA");
    await registrarEventoEn(ticul, calleTicul, "RENOMBRE");

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(eventosDeCalles),
    );

    expect(filas.every((fila) => fila.ayuntamientoId === motul)).toBe(true);
    expect(filas.map((fila) => fila.calleId)).toContain(calleMotul);
    expect(filas.map((fila) => fila.calleId)).not.toContain(calleTicul);
  });

  it("sin tenant fijado, RLS no devuelve filas", async () => {
    await sembrarEvento(motul, "Calle eventos sin tenant");

    const filas = await appSinTenant`SELECT id FROM eventos_de_calles`;

    expect(filas).toHaveLength(0);
  });

  it("una calle de otro municipio no puede recibir un evento", async () => {
    const calleTicul = await sembrarEvento(ticul, "Calle FK ajena");

    const motivo = await motivoDeFalla(() =>
      registrarEventoEn(motul, calleTicul, "ALTA"),
    );

    expect(motivo).toMatch(/eventos_de_calles_calle_tenant_fk/i);
  });

  it("un evento confirmado no se puede editar ni borrar y la fila sobrevive", async () => {
    const calleId = await sembrarEvento(motul, "Calle append-only");
    const [evento] = await registrarEventoEn(motul, calleId, "ALTA");

    const motivoUpdate = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx
          .update(eventosDeCalles)
          .set({ naturaleza: "RENOMBRE" })
          .where(eq(eventosDeCalles.id, evento!.id)),
      ),
    );
    expect(motivoUpdate).toMatch(/permission denied/i);

    const motivoDelete = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.delete(eventosDeCalles).where(eq(eventosDeCalles.id, evento!.id)),
      ),
    );
    expect(motivoDelete).toMatch(/permission denied/i);

    const [sobreviviente] = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(eventosDeCalles)
        .where(eq(eventosDeCalles.id, evento!.id)),
    );
    expect(sobreviviente?.naturaleza).toBe("ALTA");
  });

  it("una mutacion revertida no deja evento ni cambio en la calle", async () => {
    const lugarId = await crearLugarEn(motul, "comisaria", "Calle rollback");
    const calleId = await crearCalleEn(motul, lugarId, "Nombre original");
    const contextoConActorInvalido: ContextoActual = {
      ayuntamientoId: motul,
      usuario: { id: "no-es-un-uuid", rol: "ADMIN_MUNICIPAL" },
      origen: "web",
    };

    await expect(
      crearRenombrarCalle(repositorioDeCallesSql)(
        calleId,
        "Nombre nuevo",
        contextoConActorInvalido,
      ),
    ).rejects.toThrow(/Failed query/i);

    const [fila] = await withTenant(motul, (tx) =>
      tx
        .select({ nombre: calles.nombre })
        .from(calles)
        .where(eq(calles.id, calleId)),
    );
    const eventos = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(eventosDeCalles)
        .where(eq(eventosDeCalles.calleId, calleId)),
    );

    expect(fila?.nombre).toBe("Nombre original");
    expect(eventos).toHaveLength(0);
  });
});
