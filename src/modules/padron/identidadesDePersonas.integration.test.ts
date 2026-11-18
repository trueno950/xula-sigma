import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import {
  altaDePersona,
  fusionarPersonas,
  identidadesDePersonas,
} from "./composicion";
import type { PersonaId } from "./domain";

/**
 * Contra Postgres real: la lectura en lote de `personas` agrupa la clase de
 * equivalencia de una fusion con la terminal primero, y RLS le esconde los
 * ids del otro municipio. Lo segundo no se puede afirmar con mocks.
 */

const contextoEn = (ayuntamientoId: typeof motul): ContextoActual => ({
  ayuntamientoId,
  usuario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rol: "ADMIN_MUNICIPAL",
  },
  origen: "web",
});

const contexto = contextoEn(motul);

const personaDePrueba = async (
  nombres: string,
  ctx: ContextoActual,
): Promise<PersonaId> =>
  (
    await altaDePersona(
      { nombres, primerApellido: "Poot", segundoApellido: null, curp: null },
      ctx,
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

describe("identidadesDePersonas", () => {
  it("agrupa la fusion bajo su terminal, con la terminal primera", async () => {
    const ganadora = await personaDePrueba("Aurelia", contexto);
    const perdedora = await personaDePrueba("Aurelia Maria", contexto);
    await fusionarPersonas(perdedora, ganadora, contexto);

    const grupos = await identidadesDePersonas([ganadora], contexto);

    expect(grupos.get(ganadora)).toEqual([ganadora, perdedora]);
  });

  it("el id de una persona de otro municipio no arma grupo", async () => {
    const ajena = await personaDePrueba("Berenice", contextoEn(ticul));

    const grupos = await identidadesDePersonas([ajena], contexto);

    expect(grupos.size).toBe(0);
  });
});
