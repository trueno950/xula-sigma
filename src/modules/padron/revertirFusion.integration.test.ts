import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import {
  crearAltaDePersona,
  crearFusionarPersonas,
  crearRevertirFusion,
} from "./application";
import type { PersonaId } from "./domain";
import {
  catalogoDeAbreviaturasSql,
  repositorioDePersonasSql,
} from "./infrastructure";

/**
 * Contra Postgres real: los dos escenarios del spec para "Revertir la
 * fusion" (rebanada 4) — el caso simple y el encadenado, donde revertir el
 * salto de en medio tiene que devolver a A a su destino directo, no al
 * terminal que tenia antes de revertir.
 */

const contextoDe = (ayuntamientoId: ContextoActual["ayuntamientoId"]) => ({
  ayuntamientoId,
  usuario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rol: "ADMIN_MUNICIPAL" as const,
  },
  origen: "web" as const,
});

const contexto = contextoDe(motul);

const altaDePersona = crearAltaDePersona(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);
const fusionarPersonas = crearFusionarPersonas(repositorioDePersonasSql);
const revertirFusion = crearRevertirFusion(repositorioDePersonasSql);

const personaDe = async (
  nombres: string,
  primerApellido: string,
): Promise<PersonaId> =>
  (
    await altaDePersona(
      { nombres, primerApellido, segundoApellido: null, curp: null },
      contexto,
    )
  ).id;

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("revertirFusion", () => {
  it("revertir A->B devuelve ambas personas a existir por separado", async () => {
    const a = await personaDe("Ana", "Poot");
    const b = await personaDe("Beto", "Chan");

    await fusionarPersonas(a, b, contexto);
    await revertirFusion(a, contexto);

    const resueltaA = await withTenant(motul, (tx) =>
      repositorioDePersonasSql.buscarPorId(tx, a),
    );

    expect(resueltaA?.id).toBe(a);
  });

  it("revertir una fusion encadenada devuelve al destino directo, no al final de la cadena", async () => {
    const a = await personaDe("Ana2", "Poot");
    const b = await personaDe("Beto2", "Chan");
    const c = await personaDe("Carlos2", "Dzul");

    await fusionarPersonas(a, b, contexto);
    await fusionarPersonas(b, c, contexto);

    await revertirFusion(b, contexto);

    const resueltaA = await withTenant(motul, (tx) =>
      repositorioDePersonasSql.buscarPorId(tx, a),
    );

    expect(resueltaA?.id).toBe(b);
  });

  it("revertir un salto de en medio recolapsa a TODO su subarbol, no solo a los hijos directos", async () => {
    const a = await personaDe("Ana3", "Poot");
    const b = await personaDe("Beto3", "Chan");
    const c = await personaDe("Carlos3", "Dzul");
    const d = await personaDe("Diana3", "Uc");

    // A->B, B->C, C->D: A llega a D a traves de B y C, no directo.
    await fusionarPersonas(a, b, contexto);
    await fusionarPersonas(b, c, contexto);
    await fusionarPersonas(c, d, contexto);

    await revertirFusion(c, contexto);

    const resueltaA = await withTenant(motul, (tx) =>
      repositorioDePersonasSql.buscarPorId(tx, a),
    );

    // A no es hijo directo de C (su fusionadaDirectoEn es B), pero su
    // fusionadaEn colapsado pasaba por C hacia D. Sin recolapsar el
    // subarbol entero, A quedaba apuntando a D, un terminal que dejo de
    // serlo en el momento en que C volvio a existir por separado.
    expect(resueltaA?.id).toBe(c);
  });

  it("revertir un id de otro tenant da 404, sin dejar entrada de bitacora", async () => {
    const deOtroTenant = (
      await altaDePersona(
        {
          nombres: "AnaT",
          primerApellido: "Poot",
          segundoApellido: null,
          curp: null,
        },
        contextoDe(ticul),
      )
    ).id;

    await expect(
      revertirFusion(deOtroTenant, contextoDe(motul)),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("revertir una persona que nunca fue fusionada da 404, sin dejar entrada de bitacora falsa", async () => {
    const nuncaFusionada = await personaDe("AnaN", "Poot");

    await expect(
      revertirFusion(nuncaFusionada, contexto),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});
