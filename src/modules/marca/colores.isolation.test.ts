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
import { crearCambiarColores } from "./application/cambiarColores";
import { crearRestablecerColores } from "./application/restablecerColores";
import { repositorioDeMarcaSql } from "./infrastructure/repositorioDeMarcaSql";

/**
 * El color de un municipio no lo ve ni lo escribe otro. El invariante es el
 * de `escudo.isolation.test.ts` —el tenant sale del contexto, y la barrera
 * real es `ayuntamientos_escritura_propia`— aplicado a la marca completa:
 * los colores viven en la misma columna `jsonb` que el escudo.
 */

const GUINDA = "oklch(0.42 0.12 25)";
const ORO = "#ffd700";

let gente: GentePorMunicipio;

const marcaDe = async (ayuntamientoId: typeof motul) => {
  const [fila] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .select({ marca: ayuntamientos.marca })
      .from(ayuntamientos)
      .where(eq(ayuntamientos.id, ayuntamientoId)),
  );

  return fila?.marca;
};

const cambiarColores = crearCambiarColores(repositorioDeMarcaSql);
const restablecerColores = crearRestablecerColores(repositorioDeMarcaSql);

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

describe("colores.isolation", () => {
  it("el ADMIN_MUNICIPAL de Motul elige sus colores y Ticul no cambia", async () => {
    await cambiarColores(
      { primario: GUINDA, secundario: ORO },
      contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
    );

    expect(await marcaDe(motul)).toEqual({
      primario: GUINDA,
      primarioTexto: "#ffffff",
      secundario: ORO,
    });
    expect(await marcaDe(ticul)).toEqual({});
  });

  it("el restablecimiento de un municipio no toca los colores del otro", async () => {
    const deTicul = contextoDe(gente, "ticul", "ADMIN_MUNICIPAL");

    await cambiarColores({ primario: GUINDA, secundario: ORO }, deTicul);
    await restablecerColores(contextoDe(gente, "motul", "ADMIN_MUNICIPAL"));

    expect(await marcaDe(ticul)).toEqual({
      primario: GUINDA,
      primarioTexto: "#ffffff",
      secundario: ORO,
    });
    expect(await marcaDe(motul)).toEqual({});
  });

  it("RLS corta un UPDATE de la marca contra otro ayuntamiento", async () => {
    /**
     * Los dos casos de uso nunca dejan pasar un `ayuntamientoId` por
     * parametro. Este test prueba la otra mitad: que la barrera es la
     * politica y no la buena conducta del llamador. Se simula el bug que la
     * regla existe para evitar, un UPDATE armado con el id de Ticul mientras
     * el tenant fijado es Motul.
     */
    await withTenant(motul, (tx) =>
      tx
        .update(ayuntamientos)
        .set({ marca: { primario: GUINDA, primarioTexto: "#ffffff" } })
        .where(eq(ayuntamientos.id, ticul)),
    );

    expect(await marcaDe(ticul)).toEqual({});
  });
});
