import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { ayuntamientos } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAlmacenDePrueba } from "./application/almacenDePrueba";
import { crearCambiarEscudo } from "./application/cambiarEscudo";
import { repositorioDeMarcaSql } from "./infrastructure/repositorioDeMarcaSql";

/**
 * El escenario T10 de `invariantes-criticos.md`: el escudo sobrevive fuera
 * del filesystem efimero, y la politica `ayuntamientos_escritura_propia`
 * —vigente desde Fase 0 y nunca probada hasta este cambio— es lo que
 * garantiza que un admin no toque la marca de otro municipio.
 */

let gente: GentePorMunicipio;

/** 80x80, la firma y el IHDR minimos para que `validarPng` lo acepte. */
function pngValido(): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0, 0, 0, 13], 8);
  bytes.set(new TextEncoder().encode("IHDR"), 12);
  bytes.set([0, 0, 0, 80], 16);
  bytes.set([0, 0, 0, 80], 20);
  return bytes;
}

const marcaDe = async (ayuntamientoId: typeof motul) => {
  const [fila] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .select({ marca: ayuntamientos.marca })
      .from(ayuntamientos)
      .where(eq(ayuntamientos.id, ayuntamientoId)),
  );

  return fila?.marca;
};

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  for (const ayuntamiento of [motul, ticul]) {
    await withTenant(ayuntamiento, (tx) =>
      tx
        .update(ayuntamientos)
        .set({ marca: {} })
        .where(eq(ayuntamientos.id, ayuntamiento)),
    );
  }
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("escudo.isolation", () => {
  it("el ADMIN_MUNICIPAL de Motul sube su escudo y Ticul no cambia", async () => {
    const almacen = crearAlmacenDePrueba();
    const cambiarEscudo = crearCambiarEscudo(almacen, repositorioDeMarcaSql);
    const contexto = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");

    const resultado = await cambiarEscudo({ bytes: pngValido() }, contexto);

    expect(await marcaDe(motul)).toEqual({ escudo: resultado.escudo });
    expect(await marcaDe(ticul)).toEqual({});
  });

  it("RLS corta un UPDATE contra otro ayuntamiento aunque el WHERE lo nombre", async () => {
    /**
     * `cambiarEscudo` nunca deja pasar un `ayuntamientoId` por parametro
     * — sale del contexto, siempre (decision 1). Este test prueba la otra
     * mitad del invariante: que la barrera real es
     * `ayuntamientos_escritura_propia`, no que el caso de uso se porte
     * bien. Se simula el bug que esa regla existe para evitar: un UPDATE
     * armado con el id de Ticul mientras el tenant fijado es Motul.
     */
    await withTenant(motul, (tx) =>
      tx
        .update(ayuntamientos)
        .set({ marca: { escudo: "https://intento-cruzado.example/x.png" } })
        .where(eq(ayuntamientos.id, ticul)),
    );

    expect(await marcaDe(ticul)).toEqual({});
  });
});
