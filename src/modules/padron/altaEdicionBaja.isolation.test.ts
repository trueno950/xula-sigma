import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
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
  crearDarDeBajaPersona,
  crearEditarPersona,
} from "./application";
import {
  catalogoDeAbreviaturasSql,
  repositorioDePersonasSql,
} from "./infrastructure";
import { personas } from "./infrastructure/esquema";

/**
 * Prueba lo que `personas.isolation.test.ts` no puede: que los casos de
 * uso de la rebanada 2 -no el SQL crudo- tambien respetan el limite de
 * tenant. `escudo.isolation.test.ts` es el precedente de construir el
 * caso de uso real contra Postgres en vez de pasar por `composicion.ts`.
 */

const contextoDe = (ayuntamientoId: AyuntamientoId): ContextoActual => ({
  ayuntamientoId,
  usuario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rol: "ADMIN_MUNICIPAL",
  },
  origen: "web",
});

const altaDePersona = crearAltaDePersona(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);
const editarPersona = crearEditarPersona(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);
const darDeBajaPersona = crearDarDeBajaPersona(repositorioDePersonasSql);

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("aislamiento a traves de los casos de uso", () => {
  it("editar el id de una persona de Motul desde Ticul no encuentra nada", async () => {
    const { id } = await altaDePersona(
      {
        nombres: "Juan",
        primerApellido: "Poot",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(motul),
    );

    await expect(
      editarPersona(
        id,
        {
          nombres: "Juan",
          primerApellido: "Otro",
          segundoApellido: null,
          curp: null,
        },
        contextoDe(ticul),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("dar de baja el id de una persona de Motul desde Ticul no encuentra nada", async () => {
    const { id } = await altaDePersona(
      {
        nombres: "Rosa",
        primerApellido: "Uc",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(motul),
    );

    await expect(
      darDeBajaPersona(id, contextoDe(ticul)),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    // La fila sigue activa: la baja de Ticul no tuvo efecto sobre ella.
    const [fila] = await withTenant(motul, (tx) =>
      tx
        .select({ bajaEn: personas.bajaEn })
        .from(personas)
        .where(eq(personas.id, id)),
    );
    expect(fila?.bajaEn).toBeNull();
  });
});
