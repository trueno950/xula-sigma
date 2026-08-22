import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { personas } from "./infrastructure/esquema";
import { personaDePrueba } from "./personaDePrueba";

/**
 * Forma canonica del test de aislamiento (`invariantes-criticos.md`, Capa
 * 2): inserta directo con `withTenant`, sin pasar por `altaDePersona`.
 *
 * El aislamiento a traves de los casos de uso reales (`altaDePersona`,
 * `editarPersona`, `darDeBajaPersona`) vive en
 * `altaEdicionBaja.isolation.test.ts`, aparte por la metrica de lineas
 * por archivo de `AGENTS.md`.
 */

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("aislamiento de personas", () => {
  it("una consulta sin filtro solo devuelve las personas del tenant activo", async () => {
    const [enMotul] = await withTenant(motul, (tx) =>
      tx
        .insert(personas)
        .values(
          personaDePrueba({
            ayuntamientoId: motul,
            nombres: "Juan",
            primerApellido: "Poot",
          }),
        )
        .returning({ id: personas.id }),
    );
    await withTenant(ticul, (tx) =>
      tx.insert(personas).values(
        personaDePrueba({
          ayuntamientoId: ticul,
          nombres: "Maria",
          primerApellido: "Chi",
        }),
      ),
    );

    const filas = await withTenant(motul, (tx) => tx.select().from(personas));

    // Sin `toHaveLength`: los tests de abajo tambien insertan en Motul y no
    // hay limpieza entre uno y otro, asi que un conteo fijo afirmaria el
    // orden de ejecucion y no el aislamiento. Con RLS apagado, la fila de
    // Ticul entraria igual y `every` la delata.
    expect(filas.every((fila) => fila.ayuntamientoId === motul)).toBe(true);
    expect(filas.map((fila) => fila.id)).toContain(enMotul?.id);
  });

  it("el id de una persona de Ticul no resuelve bajo Motul", async () => {
    const [enTicul] = await withTenant(ticul, (tx) =>
      tx
        .insert(personas)
        .values(
          personaDePrueba({
            ayuntamientoId: ticul,
            nombres: "Rosa",
            primerApellido: "Uc",
          }),
        )
        .returning({ id: personas.id }),
    );

    const filas = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(personas)
        .where(eq(personas.id, enTicul?.id ?? "")),
    );

    expect(filas).toHaveLength(0);
  });

  it("dos personas sin CURP en el mismo municipio conviven", async () => {
    await withTenant(motul, (tx) =>
      tx.insert(personas).values(
        personaDePrueba({
          ayuntamientoId: motul,
          nombres: "Primera",
          primerApellido: "SinCurp",
        }),
      ),
    );
    const segunda = await withTenant(motul, (tx) =>
      tx
        .insert(personas)
        .values(
          personaDePrueba({
            ayuntamientoId: motul,
            nombres: "Segunda",
            primerApellido: "SinCurp",
          }),
        )
        .returning({ id: personas.id }),
    );

    expect(segunda).toHaveLength(1);
  });

  it("la misma CURP en el mismo municipio se rechaza", async () => {
    const curp = "VECJ880326HDFLRR05";
    await withTenant(motul, (tx) =>
      tx.insert(personas).values(
        personaDePrueba({
          ayuntamientoId: motul,
          nombres: "Primera",
          primerApellido: "ConCurp",
          curp: curp,
        }),
      ),
    );

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(personas).values(
          personaDePrueba({
            ayuntamientoId: motul,
            nombres: "Segunda",
            primerApellido: "ConCurp",
            curp: curp,
          }),
        ),
      ),
    );

    expect(motivo).toMatch(/personas_tenant_curp_idx/i);
  });

  it("la misma CURP en dos municipios distintos convive", async () => {
    const curp = "GOMJ600101HYNRRS02";

    await withTenant(motul, (tx) =>
      tx.insert(personas).values(
        personaDePrueba({
          ayuntamientoId: motul,
          nombres: "EnMotul",
          primerApellido: "MismaCurp",
          curp: curp,
        }),
      ),
    );
    const enTicul = await withTenant(ticul, (tx) =>
      tx
        .insert(personas)
        .values(
          personaDePrueba({
            ayuntamientoId: ticul,
            nombres: "EnTicul",
            primerApellido: "MismaCurp",
            curp: curp,
          }),
        )
        .returning({ id: personas.id }),
    );

    expect(enTicul).toHaveLength(1);
  });
});
