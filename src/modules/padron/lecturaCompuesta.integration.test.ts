import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import {
  crearAltaDePersona,
  crearFusionarPersonas,
  crearIdentidadesDePersona,
  crearPersonaPorId,
} from "./application";
import type { PersonaId } from "./domain";
import {
  catalogoDeAbreviaturasSql,
  repositorioDePersonasSql,
} from "./infrastructure";

/**
 * Contra Postgres real: las dos lecturas compuestas que capa-territorial
 * agrega a `padron` (design.md decision 5) — que `identidadesDe` resuelve
 * la clase de equivalencia completa en un salto, y que llamar al puerto
 * desde ADENTRO de una transaccion ya abierta se traba bajo el pool de una
 * sola conexion que fija `vitest.config.ts` para este proyecto. Lo segundo
 * es la razon por la que el puerto se llama fuera de `withTenant` — sin
 * esta prueba, esa razon era una deduccion, no un hecho verificado.
 */

const contexto: ContextoActual = {
  ayuntamientoId: motul,
  usuario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rol: "ADMIN_MUNICIPAL",
  },
  origen: "web",
};

const altaDePersona = crearAltaDePersona(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);
const fusionarPersonas = crearFusionarPersonas(repositorioDePersonasSql);
const personaPorId = crearPersonaPorId(repositorioDePersonasSql);
const identidadesDePersona = crearIdentidadesDePersona(
  repositorioDePersonasSql,
);

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

describe("lectura compuesta de padron", () => {
  it("identidadesDePersona resuelve la fusion en un salto, desde cualquiera de los dos ids", async () => {
    const a = await personaDe("Ana", "Poot");
    const b = await personaDe("Beto", "Chan");

    await fusionarPersonas(a, b, contexto);

    const desdeA = await identidadesDePersona(a, contexto);
    const desdeB = await identidadesDePersona(b, contexto);

    expect(desdeA.slice().sort()).toEqual([a, b].sort());
    expect(desdeB.slice().sort()).toEqual([a, b].sort());
  });

  it("sin fusion devuelve un arreglo de un solo elemento", async () => {
    const sola = await personaDe("Carla", "Uc");

    const identidades = await identidadesDePersona(sola, contexto);

    expect(identidades).toEqual([sola]);
  });

  it("llamar al puerto desde adentro de un withTenant ya abierto nunca resuelve bajo pool de una conexion (design.md decision 5, no medido hasta esta prueba)", async () => {
    const id = await personaDe("Diana", "Kumul");
    const NUNCA_RESUELVE = Symbol("timeout");

    const resultado = await withTenant(motul, async () => {
      const interna = personaPorId(id, contexto);
      const limite = new Promise((resolver) =>
        setTimeout(() => resolver(NUNCA_RESUELVE), 500),
      );

      const carrera = await Promise.race([interna, limite]);
      // La llamada interna se destraba recien cuando esta transaccion
      // externa libere la unica conexion del pool -al terminar este
      // callback-, y para entonces ya nadie la espera: sin este `catch`
      // quedaria como un rechazo no manejado si algo falla en el camino.
      interna.catch(() => undefined);

      return carrera;
    });

    expect(resultado).toBe(NUNCA_RESUELVE);
  }, 10_000);
});
