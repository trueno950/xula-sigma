import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { exportarAyuntamiento } from "./exportar";

/**
 * La marca dentro de la exportacion.
 *
 * Archivo aparte de `exportar.isolation.test.ts` y no un par de casos mas
 * ahi adentro: ese archivo existe para provocar la fuga entre municipios y
 * la de credenciales, y sumarle esto lo paso de las 200 lineas por archivo
 * que fija `AGENTS.md`. Son dos preocupaciones distintas.
 */

let gente: GentePorMunicipio;

const actor = (municipio: "motul" | "ticul") =>
  contextoDe(gente, municipio, "ADMIN_MUNICIPAL");

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("exportarAyuntamiento: marca", () => {
  it("trae la marca con el escudo cuando el municipio tiene uno", async () => {
    const escudo = "https://assets.prueba.local/motul/escudo-x.png";

    await withTenant(motul, (tx) =>
      tx
        .update(ayuntamientos)
        .set({ marca: { escudo } })
        .where(eq(ayuntamientos.id, motul)),
    );

    const exportacion = await exportarAyuntamiento(actor("motul"), []);

    expect(exportacion.ayuntamiento.marca).toEqual({ escudo });
  });

  it("exporta marca vacia cuando el municipio no tiene una guardada", async () => {
    const exportacion = await exportarAyuntamiento(actor("ticul"), []);

    expect(exportacion.ayuntamiento.marca).toEqual({});
  });
});
