import { sql } from "drizzle-orm";
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
  crearEditarPersona,
  crearFusionarPersonas,
  crearListarPersonas,
} from "./application";
import type { PersonaId } from "./domain";
import {
  catalogoDeAbreviaturasSql,
  repositorioDePersonasSql,
} from "./infrastructure";

/**
 * Contra Postgres real: las tres garantias de design.md decision 3 que un
 * test de puertos mockeados no puede sostener por si solo — el invariante
 * de aciclicidad, el salto unico sobre una cadena, y que la lectura tras
 * fusion trae datos frescos, no una foto.
 */

const contextoDe = (ayuntamientoId: ContextoActual["ayuntamientoId"]) => ({
  ayuntamientoId,
  usuario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rol: "ADMIN_MUNICIPAL" as const,
  },
  origen: "web" as const,
});

const altaDePersona = crearAltaDePersona(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);
const editarPersona = crearEditarPersona(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);
const fusionarPersonas = crearFusionarPersonas(repositorioDePersonasSql);
const listarPersonas = crearListarPersonas(repositorioDePersonasSql);

const personaDe = async (
  contexto: ContextoActual,
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

describe("fusionarPersonas", () => {
  it("consultar por el id perdedor sigue resolviendo tras editar al ganador", async () => {
    const contexto = contextoDe(motul);
    const a = await personaDe(contexto, "Ana", "Poot");
    const b = await personaDe(contexto, "Beto", "Chan");

    await fusionarPersonas(a, b, contexto);
    await editarPersona(
      b,
      {
        nombres: "Beto",
        primerApellido: "Uc",
        segundoApellido: null,
        curp: null,
      },
      contexto,
    );

    const resuelta = await withTenant(motul, (tx) =>
      repositorioDePersonasSql.buscarPorId(tx, a),
    );

    expect(resuelta?.primerApellido).toBe("Uc");
  });

  it("editar por el id perdedor edita al ganador resuelto, no crea una fila fantasma", async () => {
    const contexto = contextoDe(motul);
    const a = await personaDe(contexto, "Ana5", "Poot");
    const b = await personaDe(contexto, "Beto5", "Chan");

    await fusionarPersonas(a, b, contexto);
    await editarPersona(
      a,
      {
        nombres: "Beto5",
        primerApellido: "Editado",
        segundoApellido: null,
        curp: null,
      },
      contexto,
    );

    const resuelta = await withTenant(motul, (tx) =>
      repositorioDePersonasSql.buscarPorId(tx, a),
    );

    // Si `editarPersona` hubiera escrito sobre el `id` crudo (el perdedor),
    // la fila oculta cambiaria pero `buscarPorId(a)` -que resuelve al
    // ganador- seguiria mostrando el apellido viejo.
    expect(resuelta?.primerApellido).toBe("Editado");
  });

  it("cadena de fusiones resuelve en un salto", async () => {
    const contexto = contextoDe(motul);
    const a = await personaDe(contexto, "Ana2", "Poot");
    const b = await personaDe(contexto, "Beto2", "Chan");
    const c = await personaDe(contexto, "Carlos2", "Dzul");

    await fusionarPersonas(a, b, contexto);
    await fusionarPersonas(b, c, contexto);

    const resuelta = await withTenant(motul, (tx) =>
      repositorioDePersonasSql.buscarPorId(tx, a),
    );

    expect(resuelta?.id).toBe(c);
  });

  it("invariante: ninguna fila con fusionadaEn apunta a otra que tambien tenga fusionadaEn", async () => {
    const contexto = contextoDe(motul);
    const a = await personaDe(contexto, "Ana3", "Poot");
    const b = await personaDe(contexto, "Beto3", "Chan");
    const c = await personaDe(contexto, "Carlos3", "Dzul");

    await fusionarPersonas(a, b, contexto);
    await fusionarPersonas(b, c, contexto);

    const filas = await withTenant(motul, (tx) =>
      tx.execute(sql`
        SELECT count(*)::int AS cuenta FROM personas p
        JOIN personas g ON g.id = p.fusionada_en
        WHERE g.fusionada_en IS NOT NULL
      `),
    );

    expect(Number(filas[0]?.cuenta)).toBe(0);
  });

  it("una persona fusionada no aparece en el listado general del padron", async () => {
    const contexto = contextoDe(motul);
    const perdedora = await personaDe(contexto, "Ana4", "Poot");
    const ganadora = await personaDe(contexto, "Beto4", "Chan");

    await fusionarPersonas(perdedora, ganadora, contexto);

    const listado = await listarPersonas(contexto);

    expect(listado.personas.some((persona) => persona.id === perdedora)).toBe(
      false,
    );
    expect(listado.personas.some((persona) => persona.id === ganadora)).toBe(
      true,
    );
  });

  it("fusion entre dos municipios distintos no encuentra a la de otro tenant", async () => {
    const perdedora = await personaDe(contextoDe(motul), "AnaM", "Poot");
    const ganadoraDeOtroTenant = await personaDe(
      contextoDe(ticul),
      "BetoT",
      "Chan",
    );

    await expect(
      fusionarPersonas(perdedora, ganadoraDeOtroTenant, contextoDe(motul)),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});
